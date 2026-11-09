let currentRole = 'Applicant';
let isSignUp = false;

window.onload = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('role') === 'recruiter') setRole('Recruiter');
    if (params.get('role') === 'institution') setRole('Institution');
    if (params.get('mode') === 'signup') toggleAuthMode();
};

const INTRO = {
    Applicant: "Connect your MetaMask wallet to verify your identity on Ethereum Sepolia.",
    Recruiter: "Connect your wallet to post roles, review applications and verify credentials.",
    Institution: "Connect the wallet your institution uses. The platform owner must approve it before it can issue credentials."
};
function setRole(role) {
    currentRole = role;
    ['Applicant', 'Recruiter', 'Institution'].forEach(r => document.getElementById('tab' + r).classList.toggle('active', role === r));
    const app = role === 'Applicant';
    ['verifierSection', 'groupSkills', 'groupDoc'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = app ? 'block' : 'none'; });
    document.getElementById('lblTitle').parentElement.style.display = role === 'Institution' ? 'none' : 'block';
    document.getElementById('lblName').innerText = app ? 'Full name' : role === 'Recruiter' ? 'Your name or company' : 'Institution name';
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
        sub.innerText = currentRole === 'Applicant' ? `Register your skills and ask your institution to attest your document.` : `Add a display name. It is stored in this browser only.`;
        btn.innerHTML = currentRole === 'Applicant' ? `Register & Send Verification <span>&rarr;</span>` : `Create account <span>&rarr;</span>`;
        return;
    } else {
        header.innerText = `${currentRole} Sign In`;
        sub.innerText = INTRO[currentRole];
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

    let regName = "", regTitle = "", regSkills = [], verifierOrg = "", verifierEmail = "", docObj = null;

    if (isSignUp) {
        regName = document.getElementById('regFullName').value.trim();
        regTitle = document.getElementById('regTitle').value.trim();
        if (!regName) { alert("Please enter a name."); return; }
        if (currentRole === 'Applicant') {
            regSkills = document.getElementById('regSkills').value.split(',').map(x => x.trim()).filter(Boolean);
            verifierOrg = document.getElementById('regVerifierOrg').value.trim();
            verifierEmail = document.getElementById('regVerifierEmail').value.trim();
            const fileInput = document.getElementById('regDocFile');
            if (!regSkills.length) { alert("Add at least one skill so your job scores mean something."); return; }
            if (!verifierOrg || !/^\S+@\S+\.\S+$/.test(verifierEmail)) { alert("Enter your institution's name and a valid official email. Nothing is sent to anyone you do not name."); return; }
            if (!fileInput || !fileInput.files || !fileInput.files[0]) { alert("Select the document you want your institution to attest. It is fingerprinted in your browser and never uploaded."); return; }
            const file = fileInput.files[0];
            docObj = { name: file.name, sha256: await computeSHA256(file), size: (file.size / 1024 / 1024).toFixed(2) + " MB" };
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
        localStorage.setItem("ujuzi_consent", JSON.stringify({ policyVersion: "1.0", acceptedAt: new Date().toISOString(), wallet: walletAddress }));
        sessionStorage.setItem("authSignature", signature);
        sessionStorage.setItem("authChallenge", challenge);
        sessionStorage.setItem("userRole", currentRole);
        sessionStorage.setItem("userAddress", walletAddress);

        if (isSignUp) {
            const profileKey = `ujuzi_profile_${currentRole}_${walletAddress.toLowerCase()}`;
            localStorage.setItem(profileKey, JSON.stringify({
                name: regName,
                headline: regTitle,
                skills: regSkills,
                docs: docObj ? [docObj] : []
            }));

            if (currentRole === 'Applicant') {
                const directory = JSON.parse(localStorage.getItem('ujuzi_institutions_directory')) || [];
                const entry = {
                    id: "vreq_" + Math.random().toString(36).substring(2, 10),
                    orgName: verifierOrg, officialEmail: verifierEmail,
                    candidateName: regName, candidateWallet: walletAddress,
                    documentName: docObj.name, docHash: docObj.sha256,
                    status: "Pending Verification", dateSent: new Date().toLocaleDateString()
                };
                directory.unshift(entry);
                localStorage.setItem('ujuzi_institutions_directory', JSON.stringify(directory));
                fetch('/.netlify/functions/send-verification', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry)
                }).catch(() => console.log("Attestation email function not reachable; the request is recorded locally."));
                statusText.style.display = 'block';
                statusText.style.color = 'var(--accent-green)';
                statusText.textContent = "Account created. Attestation request recorded for " + verifierOrg + ".";
            } else {
                statusText.style.display = 'block';
                statusText.style.color = 'var(--accent-green)';
                statusText.textContent = "Account created. Opening your workspace...";
            }
            setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);
            return;
        }

        statusText.style.display = 'block';
        statusText.style.color = 'var(--accent-green)';
        statusText.innerText = `Wallet verified! Redirecting to ${currentRole} workspace...`;

        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 900);

    } catch (err) {
        console.error("Authentication error:", err);
        btn.innerHTML = isSignUp ? `Register & Send Verification <span>&rarr;</span>` : `Sign In with MetaMask <span>&rarr;</span>`;
        btn.style.opacity = "1";
        statusText.style.display = 'block';
        statusText.style.color = 'var(--accent-red)';
        statusText.innerText = "Connection rejected or failed. Please try again.";
    }
}
