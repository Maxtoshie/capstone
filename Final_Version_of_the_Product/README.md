# UjuziChain - Web3 Credential Platform

## 🎨 New Dark Theme UI Included
This repository includes a sleek, modern, dark-themed UI matching your design requirements (frosted glass navbar, applicant/recruiter login flows).

## 🚀 How to Host the Frontend for Free (Netlify / GitHub Pages)
Because the frontend is built with standard HTML/CSS/JS, it is incredibly easy to host and make accessible from anywhere:

### Option 1: Netlify (Recommended)
1. Go to [Netlify.com](https://www.netlify.com/) and sign up.
2. Drag and drop the `frontend/` folder directly into the Netlify deployment area.
3. Your site is instantly live!

### Option 2: GitHub Pages
1. Push this entire repository to GitHub.
2. Go to your repository **Settings** -> **Pages**.
3. Select the branch (e.g., `main`) and set the folder to `/frontend` (if building via action) or just deploy the frontend folder to the root.

## 🔐 Backend Architecture
- **Authentication**: The frontend is prepared to integrate with **Firebase Auth**. You can easily add your Firebase config inside `frontend/js/auth.js` to handle real user sign-ups for Applicants and Recruiters.
- **Smart Contracts**: Hardhat/Solidity contracts are located in `contracts/`.

## Repository Structure
- `frontend/`: The production-ready UI (Host this folder!).
- `contracts/`: Modular Solidity smart contracts.
- `test/`: Hardhat test scripts.
- `scripts/`: Deployment scripts.
