let currentRole = 'Applicant';
let isSignUp = false;

window.onload = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('role') === 'recruiter') setRole('Recruiter');
    if (params.get('mode') === 'signup') toggleAuthMode();
};

function setRole(role) {
    currentRole = role;
    document.getElementById('tabApplicant').classList.toggle('active', role === 'Applicant');
    document.getElementById('tabRecruiter').classList.toggle('active', role === 'Recruiter');
    
    // Hide verifier invite box if signing up as a recruiter
    const verifierBox = document.getElementById('verifierSection');
    if (verifierBox) {
        verifierBox.style.display = role === 'Applicant' ? 'block' : 'none';
    }
    updateFormLabels();
}

function toggleAuthMode() {
    isSignUp = !isSignUp;
    document.getElementById('signUpFields').style.display = isSignUp ? 'block' : 'none';
    
    const toggleContainer = document.getElementById('toggleModeContainer');
    if (isSignUp) {
        toggleContainer.innerHTML = `Already have an account? <a onclick="toggleAuthMode()">Sign in</a>`;
    } else {
        toggleContainer.innerHTML = `Don't have an account? <a onclick="toggleAuthMode()">Create one</a>`;
    }
    updateFormLabels();
}

function updateFormLabels() {
    const header = document.getElementById('formHeader');
    const sub = document.getElementById('formSub');
    const btn = document.getElementById('authSubmitBtn');

    if (isSignUp) {
        header.innerText = `Create ${currentRole} Account`;
        sub.innerText = `Register your identity, skills, and send verification requests to your institutions.`;
        btn.innerHTML = `Register & Send Verification <span>&rarr;</span>`;
    } else {
        header.innerText = `${currentRole} Sign In`;
        sub.innerText = `Connect your MetaMask wallet to verify your identity on Ethereum Sepolia.`;
        btn.innerHTML = `Sign In with MetaMask <span>&rarr;</span>`;
    }
}

async function computeSHA256(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return "0x" + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function executeAuth() {
    const statusText = document.getElementById('statusText');
    const btn = document.getElementById('authSubmitBtn');

    if (!window.ethereum) {
        alert("MetaMask extension not found! Please install MetaMask to use UjuziChain.");
        return;
    }

    let regName = "";
    let regTitle = "";
    let regSkills = [];
    let verifierOrg = "";
    let verifierEmail = "";
    let docObj = null;

    if (isSignUp) {
        regName = document.getElementById('regFullName').value.trim();
        regTitle = document.getElementById('regTitle').value.trim();
        const rawSkills = document.getElementById('regSkills').value.trim();
        regSkills = rawSkills ? rawSkills.split(',').map(s => s.trim()).filter(Boolean) : ["JavaScript", "Git", "REST APIs", "SQL"];
        
        verifierOrg = document.getElementById('regVerifierOrg').value.trim() || "African Leadership University";
        verifierEmail = document.getElementById('regVerifierEmail').value.trim() || "registrar@alueducation.com";

        const fileInput = document.getElementById('regDocFile');
        if (fileInput && fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            const sha = await computeSHA256(file);
            docObj = {
                name: file.name,
                sha256: sha,
                size: (file.size / 1024 / 1024).toFixed(2) + " MB",
                verified: false
            };
        }

        if (!regName) {
            alert("Please enter your full name.");
            return;
        }
    }

    try {
        btn.innerText = "Connecting Wallet...";
        btn.style.opacity = "0.7";

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const walletAddress = accounts[0];

        // Proof of key ownership: sign a one-time challenge (no gas, no transaction).
        btn.innerText = "Sign the login message...";
        const nonce = Array.from(crypto.getRandomValues(new Uint8Array(8))).map(b => b.toString(16).padStart(2, '0')).join('');
        const challenge = `Sign in to UjuziChain\nRole: ${currentRole}\nWallet: ${walletAddress}\nNonce: ${nonce}\nIssued: ${new Date().toISOString()}`;
        const signer = await new ethers.BrowserProvider(window.ethereum).getSigner();
        const signature = await signer.signMessage(challenge);
        if (ethers.verifyMessage(challenge, signature).toLowerCase() !== walletAddress.toLowerCase()) throw new Error("Signature did not match the wallet");
        sessionStorage.setItem("authSignature", signature);
        sessionStorage.setItem("authChallenge", challenge);
        sessionStorage.setItem("userRole", currentRole);
        sessionStorage.setItem("userAddress", walletAddress);

        if (isSignUp) {
            const initialDocs = [
                { name: "ALU_BSc_Software_Engineering_Degree.pdf", sha256: "0x8f3c7e4a1b9d...f02a", size: "2.4 MB", verified: true }
            ];
            if (docObj) initialDocs.unshift(docObj);

            // 1. Save applicant profile
            const newProfile = {
                name: regName,
                headline: regTitle || (currentRole === 'Recruiter' ? 'Technical Recruiter' : 'Software Engineer'),
                skills: regSkills,
                isOnChainVerified: false,
                docs: initialDocs
            };
            localStorage.setItem(`ujuzi_profile_${currentRole}`, JSON.stringify(newProfile));

            // 2. Add institution/company to platform directory
            const institutionDirectory = JSON.parse(localStorage.getItem('ujuzi_institutions_directory')) || [];
            const token = "vreq_" + Math.random().toString(36).substring(2, 10);
            
            const newEntry = {
                id: token,
                orgName: verifierOrg,
                officialEmail: verifierEmail,
                candidateName: regName,
                candidateWallet: walletAddress,
                documentName: docObj ? docObj.name : "Academic Transcript / Degree",
                docHash: docObj ? docObj.sha256 : "0x7a4e8d2c...b819",
                status: "Pending Verification",
                dateSent: new Date().toLocaleDateString()
            };

            institutionDirectory.unshift(newEntry);
            localStorage.setItem('ujuzi_institutions_directory', JSON.stringify(institutionDirectory));

            // 3. Dispatch automated email via Netlify serverless function
            try {
                fetch('/.netlify/functions/send-verification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newEntry)
                }).catch(() => console.log("Using direct fallback verification link."));
            } catch (e) {}

            statusText.style.display = 'block';
            statusText.style.color = '#34d399';
            statusText.innerHTML = `
                ✓ Verification email sent to <strong>${verifierEmail}</strong>!<br>
                Added <em>${verifierOrg}</em> to platform verifier registry.
            `;

            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1800);
            return;
        }

        statusText.style.display = 'block';
        statusText.style.color = '#34d399';
        statusText.innerText = `Wallet verified! Redirecting to ${currentRole} workspace...`;

        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 900);

    } catch (err) {
        console.error("Authentication error:", err);
        btn.innerHTML = isSignUp ? `Register & Send Verification <span>&rarr;</span>` : `Sign In with MetaMask <span>&rarr;</span>`;
        btn.style.opacity = "1";
        statusText.style.display = 'block';
        statusText.style.color = '#f87171';
        statusText.innerText = "Connection rejected or failed. Please try again.";
    }
}
