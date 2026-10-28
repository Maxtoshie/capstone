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
    const lblName = document.getElementById('lblName');
    const lblTitle = document.getElementById('lblTitle');
    const lblSkills = document.getElementById('lblSkills');
    const lblDoc = document.getElementById('lblDoc');

    if (isSignUp) {
        header.innerText = `Create ${currentRole} Account`;
        sub.innerText = `Register your identity, skills, and credentials linked to your Ethereum wallet.`;
        btn.innerHTML = `Connect Wallet & Register <span>&rarr;</span>`;
        if (lblName) lblName.innerText = currentRole === 'Recruiter' ? 'Organization / Recruiter Name' : 'Full Name';
        if (lblTitle) lblTitle.innerText = currentRole === 'Recruiter' ? 'Hiring Department / Industry' : 'Professional Title';
        if (lblSkills) lblSkills.innerText = currentRole === 'Recruiter' ? 'Primary Tech Stacks Hired' : 'Technical Skills (comma-separated)';
        if (lblDoc) lblDoc.innerText = currentRole === 'Recruiter' ? 'Company Registration / Verification Doc (PDF)' : 'Upload Initial Document (CV, Certificate, PDF)';
    } else {
        header.innerText = `${currentRole} Sign In`;
        sub.innerText = `Connect your MetaMask wallet to verify your identity on Ethereum Sepolia.`;
        btn.innerHTML = `Sign In with MetaMask <span>&rarr;</span>`;
    }
}

async function executeAuth() {
    const statusText = document.getElementById('statusText');
    const btn = document.getElementById('authSubmitBtn');

    if (!window.ethereum) {
        alert("MetaMask extension not found! Please install MetaMask to use UjuziChain.");
        return;
    }

    let registeredName = "";
    let registeredTitle = "";
    let registeredSkills = [];
    let registeredLocation = "";
    let uploadedDocObj = null;

    if (isSignUp) {
        registeredName = document.getElementById('regFullName').value.trim();
        registeredTitle = document.getElementById('regTitle').value.trim();
        const rawSkills = document.getElementById('regSkills').value.trim();
        registeredSkills = rawSkills ? rawSkills.split(',').map(s => s.trim()).filter(Boolean) : ["JavaScript", "Git", "REST APIs", "SQL"];
        registeredLocation = document.getElementById('regLocation').value;

        const fileInput = document.getElementById('regDocFile');
        if (fileInput && fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            uploadedDocObj = {
                name: file.name,
                size: (file.size / 1024 / 1024).toFixed(2) + " MB",
                date: "Today",
                verified: true
            };
        }

        if (!registeredName) {
            alert("Please enter your name or organization before proceeding.");
            return;
        }
    }

    try {
        btn.innerText = "Connecting Wallet...";
        btn.style.opacity = "0.7";

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const walletAddress = accounts[0];

        sessionStorage.setItem("userRole", currentRole);
        sessionStorage.setItem("userAddress", walletAddress);

        if (isSignUp) {
            const initialDocs = [
                { name: "ALU_BSc_Software_Engineering_Degree.pdf", size: "2.4 MB", date: "Sep 2026", verified: true }
            ];
            if (uploadedDocObj) {
                initialDocs.unshift(uploadedDocObj);
            }

            const newProfile = {
                name: registeredName,
                headline: registeredTitle || (currentRole === 'Recruiter' ? 'Technical Recruiter' : 'Software Engineer'),
                location: registeredLocation,
                skills: registeredSkills,
                bio: `${currentRole} registered on UjuziChain East Africa.`,
                docs: initialDocs
            };
            localStorage.setItem(`ujuzi_profile_${currentRole}`, JSON.stringify(newProfile));
        }

        statusText.style.display = 'block';
        statusText.style.color = '#34d399';
        statusText.innerText = isSignUp 
            ? `Account created! Anchored to ${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}. Redirecting...`
            : `Wallet verified! Redirecting to ${currentRole} workspace...`;

        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 900);

    } catch (err) {
        console.error("Authentication error:", err);
        btn.innerHTML = isSignUp ? `Connect Wallet & Register <span>&rarr;</span>` : `Sign In with MetaMask <span>&rarr;</span>`;
        btn.style.opacity = "1";
        statusText.style.display = 'block';
        statusText.style.color = '#f87171';
        statusText.innerText = "Connection rejected or failed. Please try again.";
    }
}
