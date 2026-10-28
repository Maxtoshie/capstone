const contractAddress = "0xA40d77d6e31F5044C7151dAd78C8bA6C3313132F";
const contractABI = [
  "function registerInstitution(address institution) external",
  "function issueCredential(bytes32 credentialId, string studentId, string degree) external",
  "function verifyCredential(bytes32 credentialId) external view returns (bool, string, string)"
];

let provider, signer, ujuziContract;
let currentRole = 'Applicant';

function setRole(role) {
    currentRole = role;
    document.getElementById('btn-applicant').classList.remove('active');
    document.getElementById('btn-recruiter').classList.remove('active');
    document.getElementById(`btn-${role.toLowerCase()}`).classList.add('active');
    document.getElementById('form-title').innerText = `${currentRole} Login`;
}

document.addEventListener('DOMContentLoaded', () => {
    const connectBtn = document.getElementById('connectWalletBtn');
    const statusText = document.getElementById('wallet-status');

    if(connectBtn) {
        connectBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (window.ethereum) {
                try {
                    connectBtn.innerText = "Connecting...";
                    await window.ethereum.request({ method: 'eth_requestAccounts' });
                    
                    provider = new ethers.BrowserProvider(window.ethereum);
                    signer = await provider.getSigner();
                    ujuziContract = new ethers.Contract(contractAddress, contractABI, signer);
                    
                    const address = await signer.getAddress();
                    connectBtn.innerText = "Wallet Connected";
                    connectBtn.style.background = "#28a745"; 
                    connectBtn.style.borderColor = "#28a745";
                    
                    statusText.innerText = `Logged in as ${currentRole}\nAddress: ${address.substring(0, 6)}...${address.substring(38)}`;
                } catch (error) {
                    console.error("Connection failed", error);
                    connectBtn.innerText = "Connect MetaMask";
                    statusText.innerText = "Connection rejected or failed.";
                    statusText.style.color = "#ff5555";
                }
            } else {
                alert("Please install MetaMask to use this platform!");
            }
        });
    }
});
