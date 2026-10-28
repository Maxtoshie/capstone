let currentRole = 'Applicant';
let isLogin = true;

// Check URL params for role
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
    // In a real app, you would connect to Firebase Auth or a custom Node.js backend here.
    alert(`Mock Backend: ${isLogin ? 'Logged in' : 'Signed up'} as ${currentRole} with email ${email}`);
    // window.location.href = 'dashboard.html';
}
