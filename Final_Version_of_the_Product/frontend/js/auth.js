const contractAddress = "0xA40d77d6e31F5044C7151dAd78C8bA6C3313132F";
const contractABI = [
  "function registerInstitution(address institution) external",
  "function issueCredential(bytes32 credentialId, string studentId, string degree) external",
  "function verifyCredential(bytes32 credentialId) external view returns (bool, string, string)"
];

let provider, signer, ujuziContract;
let currentRole = 'Applicant';
let isLogin = true;

// Web3 Wallet Connection
document.addEventListener('DOMContentLoaded', () => {
    const connectBtn = document.getElementById('connectWalletBtn');
    if(connectBtn) {
        connectBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (window.ethereum) {
                try {
                    await window.ethereum.request({ method: 'eth_requestAccounts' });
                    provider = new ethers.BrowserProvider(window.ethereum);
                    signer = await provider.getSigner();
                    ujuziContract = new ethers.Contract(contractAddress, contractABI, signer);
                    
                    const address = await signer.getAddress();
                    connectBtn.innerText = `${address.substring(0, 6)}...${address.substring(38)}`;
                    connectBtn.style.background = "rgba(255,255,255,0.1)";
                } catch (error) {
                    console.error("Connection failed", error);
                }
            } else {
                alert("Please install MetaMask!");
            }
        });
    }
});

// UI Auth Logic
window.onload = () => {
    const params = new URLSearchParams(window.location.search);
    if(params.get('role') === 'recruiter') setRole('Recruiter');
};

function setRole(role) {
    currentRole = role;
    document.getElementById('btn-applicant').classList.remove('active');
    document.getElementById('btn-recruiter').classList.remove('active');
    document.getElementById(`btn-${role.toLowerCase()}`).classList.add('active');
    updateTitle();
}

function toggleMode() {
    isLogin = !isLogin;
    updateTitle();
    const toggleText = document.querySelector('.toggle-auth');
    if (isLogin) {
        toggleText.innerHTML = `Don't have an account? <a href="#" onclick="toggleMode()">Create one</a>`;
        document.querySelector('.btn-primary').innerText = "Sign In";
    } else {
        toggleText.innerHTML = `Already have an account? <a href="#" onclick="toggleMode()">Sign in</a>`;
        document.querySelector('.btn-primary').innerText = "Sign Up";
    }
}

function updateTitle() {
    document.getElementById('form-title').innerText = `${currentRole} ${isLogin ? 'Login' : 'Sign Up'}`;
}

function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const walletStatus = signer ? "Wallet is connected!" : "Wallet is NOT connected.";
    alert(`Mock Backend: ${isLogin ? 'Logged in' : 'Signed up'} as ${currentRole} with email ${email}.\n${walletStatus}`);
}
