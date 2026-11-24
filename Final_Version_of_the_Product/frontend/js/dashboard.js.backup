/* UjuziChain workspace. One page, three roles (Applicant, Recruiter, Institution), each with its own navigation and screens.
   Data lives in this browser only (localStorage). There is no server, so "shared" data is shared only between users of the same browser. */
const ROLES = ["Applicant", "Recruiter", "Institution"];
const currentRole = ROLES.includes(sessionStorage.getItem("userRole")) ? sessionStorage.getItem("userRole") : "Applicant";
const IN_SESSION = !!sessionStorage.getItem("userAddress");
const currentWallet = sessionStorage.getItem("userAddress") || "0x000000000000000000000000000000000000dEaD";
const W = currentWallet.toLowerCase();
const $ = id => document.getElementById(id);
const E = s => UC.esc(s);
const ls = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
const lsSet = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const shortAddr = a => UC.short(a, 6, 4);

/* ---------- data ---------- */
const PROFILE_KEY = `ujuzi_profile_${currentRole}_${W}`;
let profileData = Object.assign({ name: "", headline: "", skills: [], docs: [] }, ls(PROFILE_KEY, {}));
let applicationsList = ls("ujuzi_applications", []);
const BASE_JOBS = [
  { id: "sample-0", title: "Junior Software Engineer", company: "Nairobi Tech Labs", location: "Nairobi, Kenya · Hybrid", description: "Build and maintain web features with a small product team.", requirements: ["JavaScript", "Git", "REST APIs", "SQL"], owner: "sample" },
  { id: "sample-1", title: "Graduate QA Engineer", company: "Kivu Digital", location: "Kigali, Rwanda · Hybrid", description: "Write automated tests and help the team ship with confidence.", requirements: ["Testing", "Cypress", "REST APIs", "Git"], owner: "sample" },
  { id: "sample-2", title: "Backend Developer Intern", company: "East Africa Systems", location: "Dar es Salaam, Tanzania · Remote", description: "Work on APIs and databases behind a payments product.", requirements: ["Node.js", "PostgreSQL", "Docker", "REST APIs"], owner: "sample" },
  { id: "sample-3", title: "Web3 Smart Contract Trainee", company: "Pearl Blockchain Labs", location: "Kampala, Uganda · On-site", description: "Learn to write and test Solidity contracts.", requirements: ["Solidity", "Hardhat", "Git", "Testing"], owner: "sample" },
];
const allJobs = () => BASE_JOBS.concat(ls("ujuzi_posted_jobs", []));
const sims = () => ls(`ujuzi_sim_${W}`, {});
const simOf = id => sims()[id] || null;
const scoreOf = job => window.CompetencyAlgorithm ? window.CompetencyAlgorithm.calculateScore(profileData.skills || [], job.requirements || []) : null;
const displayName = () => profileData.name || `${currentRole} ${shortAddr(currentWallet)}`;
const myApps = () => applicationsList.filter(a => (a.applicantAddress || "").toLowerCase() === W);
const jobById = id => allJobs().find(j => j.id === id);
const recruiterApps = () => applicationsList.filter(a => { const j = jobById(a.jobId); return j && (j.owner === "sample" || (j.owner || "").toLowerCase() === W); });
let selectedJobId = null, selectedQuiz = null;

/* ---------- navigation ---------- */
const ICONS = {
  overview: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  jobs: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
  applications: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  simulations: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 10l3 2-3 2M13 15h4"/>',
  credentials: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  verify: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5M8.5 11l2 2 3.5-4"/>',
  roles: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M12 11v5M9.5 13.5h5"/>',
  issuer: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
  requests: '<path d="M3 13l3-8h12l3 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M3 13h5l1 3h6l1-3h5"/>',
  admin: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
};
const NAV = {
  Applicant: [["overview", "Dashboard"], ["jobs", "Jobs"], ["applications", "My applications"], ["simulations", "Simulations"], ["credentials", "Credentials"], ["verify", "Verify credential"]],
  Recruiter: [["overview", "Dashboard"], ["roles", "My roles"], ["applications", "Applications inbox"], ["verify", "Verify credential"]],
  Institution: [["overview", "Dashboard"], ["issuer", "Issue and revoke"], ["requests", "Attestation requests"], ["verify", "Verify credential"]],
};
const LABELS = { admin: "Platform admin" };
let allowedTabs = [];
function navItem(k, l) { return `<button class="nav-btn" id="btn-tab-${k}" onclick="switchNav('${k}')"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg><span>${l}</span></button>`; }
function buildNav() {
  allowedTabs = NAV[currentRole].map(x => x[0]);
  $("sideNav").innerHTML = NAV[currentRole].map(([k, l]) => navItem(k, l)).join("");
  $("roleBadge").innerText = `${currentRole} portal`;
}
function addAdminTab() {
  if ($("btn-tab-admin")) return;
  allowedTabs.push("admin"); $("sideNav").insertAdjacentHTML("beforeend", navItem("admin", LABELS.admin));
}
function switchNav(tab) {
  if (!allowedTabs.includes(tab)) tab = "overview";
  document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  $("pane-" + tab).classList.add("active");
  const btn = $("btn-tab-" + tab); if (btn) { btn.classList.add("active"); $("pageTitle").innerText = btn.querySelector("span").innerText; }
  ({
    overview: renderOverview, jobs: renderJobs, applications: renderApplications, simulations: renderSimulation, credentials: renderCredentials,
    verify: renderVerify, roles: renderRoles, issuer: () => UC.issuerInit(), requests: renderRequests, admin: () => UC.adminInit(),
  })[tab]();
  toggleSidebar(false); window.scrollTo({ top: 0 });
}
function toggleSidebar(force) {
  const open = typeof force === "boolean" ? force : !document.body.classList.contains("nav-open");
  document.body.classList.toggle("nav-open", open); $("menuBtn").setAttribute("aria-expanded", open);
}
document.addEventListener("keydown", e => { if (e.key === "Escape") { toggleSidebar(false); closeViewer(); closeProfileModal(); } });
function performLogout() { sessionStorage.clear(); window.location.href = "index.html"; }

/* ---------- small UI helpers ---------- */
const statusPill = s => `<span class="status-pill ${s === "Declined" ? "pill-bad" : s === "Submitted" ? "pill-warn" : ""}">${E(s)}</span>`;
const stat = (label, value, sub) => `<div class="glass-card stat-card"><p class="label">${label}</p><h2>${value}</h2><p class="sub">${sub}</p></div>`;
const hero = (h, p, btn) => `<div class="hero-banner"><div><h1>${h}</h1><p>${p}</p></div>${btn || ""}</div>`;
const go = (tab, text) => `<button class="quick-link" onclick="switchNav('${tab}')">${text} <span class="arrow">&rarr;</span></button>`;
const hasAttestation = () => UC.myAttestations().length > 0;

/* ---------- overview (per role) ---------- */
function renderOverview() {
  const root = $("overviewRoot"); const first = (profileData.name || "").split(" ")[0];
  if (currentRole === "Applicant") {
    const jobs = allJobs().map(j => Object.assign({}, j, { m: scoreOf(j) })).sort((a, b) => (b.m || 0) - (a.m || 0)).slice(0, 3);
    const att = UC.myAttestations();
    const passed = Object.values(sims()).filter(v => v === "passed").length;
    root.innerHTML = hero(first ? `Hello, ${E(first)}` : "Welcome", "Your skill scores, applications and credentials in one place.", `<button class="btn-btrust-action" onclick="switchNav('jobs')">Browse jobs &rarr;</button>`) +
      `<div class="stat-grid">${stat("Open roles", allJobs().length, "Sample and posted")}${stat("My applications", myApps().length, "Signed by your wallet")}${stat("Simulations passed", passed, "Practical checks")}${stat("Anchored credentials", att.length, "Written by institutions")}</div>
       <div class="dashboard-split"><div class="glass-card"><div class="card-header-bar"><h3>Roles that fit you</h3><button class="btn-ghost" onclick="switchNav('jobs')">View all</button></div><p class="card-sub">Scored from the skills in your profile.</p>
         ${(profileData.skills || []).length ? "" : `<div class="chain-note">Add your skills so scores mean something. <a href="#" class="ext" onclick="openProfileModal();return false">Edit profile</a></div>`}
         ${jobs.map(j => `<div class="list-row" style="cursor:pointer" onclick="selectJob('${j.id}');switchNav('jobs')"><div><h4>${E(j.title)}</h4><p class="fine">${E(j.company)} · ${E(j.location)}</p></div><strong style="color:${j.m >= 70 ? "var(--accent-green)" : "var(--text-muted)"}">${j.m == null ? "…" : j.m + "%"}</strong></div>`).join("")}</div>
       <div style="display:grid;gap:20px;min-width:0"><div class="glass-card"><div class="card-header-bar"><h3>Verification status</h3></div>
         ${att.length ? `<span class="status-pill">✓ Anchored on Sepolia by ${att.length} institution(s)</span>` : `<p style="font-size:14px;color:var(--text-secondary)">Nothing is anchored on-chain for your wallet yet. Add a document, then ask your institution to attest it.</p><div style="margin-top:12px"><button class="btn-secondary" onclick="switchNav('credentials')">Go to credentials</button></div>`}</div>
         <div class="glass-card"><div class="card-header-bar"><h3>Quick links</h3></div><div class="quick-links">${go("simulations", "Take a practical simulation")}${go("verify", "Verify a credential")}<a class="quick-link" href="privacy.html" target="_blank" rel="noopener">Privacy Policy and Terms <span class="arrow">&rarr;</span></a></div></div></div></div>`;
  } else if (currentRole === "Recruiter") {
    const mine = ls("ujuzi_posted_jobs", []).filter(j => (j.owner || "").toLowerCase() === W);
    const inbox = recruiterApps(); const certs = ls("ujuzi_certifications", []).filter(c => (c.verifier || "").toLowerCase() === W);
    root.innerHTML = hero(first ? `Hello, ${E(first)}` : "Welcome", "Roles, applicants and credential checks. Checking a credential is free.", `<button class="btn-btrust-action" onclick="switchNav('roles')">Post a role &rarr;</button>`) +
      `<div class="stat-grid">${stat("Roles posted", mine.length, "By this wallet")}${stat("Applications", inbox.length, "Including sample roles")}${stat("Shortlisted", inbox.filter(a => a.status === "Shortlisted").length, "By you")}${stat("Certified checks", certs.length, "Paid on-chain proofs")}</div>
       <div class="dashboard-split"><div class="glass-card"><div class="card-header-bar"><h3>Recent applications</h3><button class="btn-ghost" onclick="switchNav('applications')">Open inbox</button></div>
         ${inbox.length ? inbox.slice(0, 5).map(a => `<div class="list-row"><div><h4>${E(a.applicantName)}</h4><p class="fine">${E(a.jobTitle)} · ${a.match}% match</p></div>${statusPill(a.status || "Submitted")}</div>`).join("") : `<div class="empty">No applications yet. Applicants in this browser can apply to sample roles or to roles you post.</div>`}</div>
       <div class="glass-card"><div class="card-header-bar"><h3>Quick links</h3></div><div class="quick-links">${go("verify", "Verify a credential (free)")}${go("applications", "Review applications")}${go("roles", "Post a role")}</div></div></div>`;
  } else {
    root.innerHTML = hero(first ? `Hello, ${E(first)}` : "Welcome", "Record credentials once. Anyone can then verify them for free.", `<button class="btn-btrust-action" onclick="switchNav('issuer')">Issue a credential &rarr;</button>`) +
      `<div class="glass-card" style="margin-bottom:20px"><div class="card-header-bar"><h3>Registry status for this wallet</h3></div><div class="role-badges" id="instStatus"></div><p class="fine" id="instHint"></p></div>
       <div class="stat-grid">${stat("Pending requests", pendingRequests(), "From applicants in this browser")}${stat("Network", "Sepolia", "Test network")}${stat("Wallet", shortAddr(currentWallet), IN_SESSION ? "Signed in" : "Demo")}${stat("Gas to verify", "0", "Reads are free")}</div>
       <div class="glass-card"><div class="card-header-bar"><h3>Quick links</h3></div><div class="quick-links">${go("issuer", "Issue or revoke a credential")}${go("requests", "Review attestation requests")}${go("verify", "Verify a credential")}</div></div>`;
    UC.renderInstitutionStatus("instStatus", currentWallet).then(s => {
      if (s && s.isAdmin) addAdminTab();
      if ($("instHint")) $("instHint").textContent = s && !s.approved ? "Not approved yet. Ask the platform owner to approve this wallet before you issue credentials." : "";
    });
  }
}

/* ---------- applicant: jobs, simulation, applying ---------- */
function renderJobs() {
  const q = ($("jobSearch").value || "").toLowerCase();
  const jobs = allJobs().filter(j => !q || [j.title, j.company, j.location, ...j.requirements].join(" ").toLowerCase().includes(q));
  if (!selectedJobId || !jobById(selectedJobId)) selectedJobId = (jobs[0] || {}).id || null;
  $("jobsListingCards").innerHTML = jobs.length ? jobs.map(j => { const m = scoreOf(j); return `<div class="job-select-item ${j.id === selectedJobId ? "selected" : ""}" onclick="selectJob('${j.id}')"><div><h4 style="font-size:14px">${E(j.title)}</h4><p class="fine">${E(j.company)} · ${E(j.location)}</p></div><strong style="color:${m >= 70 ? "var(--accent-green)" : "var(--text-muted)"}">${m == null ? "…" : m + "%"}</strong></div>`; }).join("") : `<div class="empty">No roles match your search.</div>`;
  renderJobDetails();
}
function selectJob(id) { selectedJobId = id; if ($("pane-jobs").classList.contains("active")) renderJobs(); }
function renderJobDetails() {
  const job = jobById(selectedJobId); const body = $("detailBody");
  if (!job) { $("detailHeading").innerText = "No role selected"; $("detailSub").innerText = ""; body.style.display = "none"; return; }
  body.style.display = "block";
  const m = scoreOf(job) ?? 30;
  $("detailHeading").innerText = job.title; $("detailSub").innerText = `${job.company} · ${job.location}${job.owner === "sample" ? " · Sample role" : ""}`;
  $("detailScore").innerText = `${m}%`; $("detailBar").style.width = `${m}%`; $("detailDescription").innerText = job.description || "";
  $("detailRequirements").innerHTML = job.requirements.map(r => `<li>${E(r)}</li>`).join("");
  const have = new Set((profileData.skills || []).map(x => String(x).trim().toLowerCase()));
  const matched = job.requirements.filter(r => have.has(r.trim().toLowerCase())), missing = job.requirements.filter(r => !have.has(r.trim().toLowerCase()));
  $("detailExplain").innerHTML = `<strong>Why this score:</strong> you hold ${matched.length} of ${job.requirements.length} required skills` + (matched.length ? ` (${E(matched.join(", "))})` : "") + (missing.length ? `. Missing: ${E(missing.join(", "))}` : "") + `. The score is the share of required skills in your profile, kept between 30 and 95. Institution, name and background are not used.`;
  const area = $("jobActionArea"), g = $("detailMatchGuidance"), st = simOf(job.id);
  const applied = myApps().some(a => a.jobId === job.id);
  if (applied) { g.innerHTML = `<span style="color:var(--accent-green);font-weight:600">✓ You have applied to this role.</span>`; area.innerHTML = `<button class="btn-secondary" onclick="switchNav('applications')">View my applications</button>`; }
  else if (st === "failed") {
    const asked = ls("ujuzi_review_requests", []).includes(`${W}:${job.id}`);
    g.innerHTML = `<span style="color:var(--accent-red);font-weight:600">The simulation was not passed. Applying is locked.</span>`;
    area.innerHTML = asked ? `<span class="fine" style="color:var(--accent-green)">Human review requested. A person will look at your profile.</span>` : `<button class="btn-secondary" onclick="requestHumanReview('${job.id}')">Request human review</button>`;
  } else if (m >= 70) { g.innerHTML = `<span style="color:var(--accent-green);font-weight:600">Your match is 70% or more, so you can apply directly.</span>`; area.innerHTML = `<button class="btn-btrust-action" onclick="handleCandidateApply('Direct apply')">Apply now &rarr;</button>`; }
  else if (st === "passed") { g.innerHTML = `<span style="color:var(--accent-green);font-weight:600">Simulation passed. Applying is unlocked.</span>`; area.innerHTML = `<button class="btn-btrust-action" onclick="handleCandidateApply('Verified via simulation')">Apply now &rarr;</button>`; }
  else { g.innerText = "Your match is below 70%. Pass a short practical simulation to unlock applying."; area.innerHTML = `<button class="btn-btrust-action" onclick="switchNav('simulations')">Take the simulation &rarr;</button>`; }
}
function requestHumanReview(id) { const a = ls("ujuzi_review_requests", []); if (!a.includes(`${W}:${id}`)) a.push(`${W}:${id}`); lsSet("ujuzi_review_requests", a); renderJobDetails(); }
function renderSimulation() {
  const job = jobById(selectedJobId);
  $("simRoleTag").innerText = job ? job.title : "No role selected"; $("simCompanyTag").innerText = job ? `${job.company} · ${job.location}` : "Choose a role in Jobs first.";
  $("simBox").style.display = job ? "block" : "none";
}
function pickQuizOption(o) { selectedQuiz = o; $("optA").classList.toggle("active", o === "A"); $("optB").classList.toggle("active", o === "B"); }
function submitSimulationAnswer() {
  if (!selectedJobId) return; if (!selectedQuiz) { alert("Please choose an answer first."); return; }
  const s = sims(); s[selectedJobId] = selectedQuiz === "A" ? "passed" : "failed"; lsSet(`ujuzi_sim_${W}`, s);
  alert(s[selectedJobId] === "passed" ? "Simulation passed. Applying is unlocked." : "Simulation not passed. You can request a human review on the job page.");
  selectedQuiz = null; $("optA").classList.remove("active"); $("optB").classList.remove("active"); switchNav("jobs");
}
async function handleCandidateApply(route) {
  const job = jobById(selectedJobId); if (!job) return; job.match = scoreOf(job) ?? 30;
  let proof = null;
  if (window.ethereum && IN_SESSION) { try { proof = await UC.signApplication(job, route, currentWallet); } catch (e) { alert("Application not sent: the wallet signature was not completed.\n" + (e.shortMessage || e.message || e)); return; } }
  applicationsList.unshift({ id: `app-${Date.now()}`, jobId: job.id, jobTitle: job.title, company: job.company, applicantName: displayName(), applicantAddress: currentWallet, match: job.match, route,
    credentialIds: UC.myAttestations().map(a => a.id), docHashes: (profileData.docs || []).map(d => ({ name: d.name, sha256: d.sha256 })), status: "Submitted", message: proof ? proof.message : null, signature: proof ? proof.signature : null, date: new Date().toISOString() });
  lsSet("ujuzi_applications", applicationsList); switchNav("applications");
}

/* ---------- applications (applicant list, recruiter inbox) ---------- */
function renderApplications() {
  const root = $("applicationsRoot");
  if (currentRole === "Applicant") {
    const list = myApps();
    root.innerHTML = hero("My applications", "Each application is signed with your wallet, so a recruiter can check it came from you.") + (list.length ? list.map(a => `<div class="app-card"><div class="top"><div><h4>${E(a.jobTitle)}</h4><p class="meta">${E(a.company)} · ${a.match}% match · ${E(a.route)} · ${new Date(a.date).toLocaleDateString()}</p></div>${statusPill(a.status || "Submitted")}</div>${UC.sigRow(a, true)}</div>`).join("") : `<div class="empty">You have not applied to anything yet.<br><button class="btn-btrust-action" style="margin-top:14px" onclick="switchNav('jobs')">Browse jobs</button></div>`);
  } else {
    const list = recruiterApps();
    root.innerHTML = hero("Applications inbox", "Applications to your roles and to the sample roles. Verify the signature and the credentials before you decide.") +
      (list.length ? list.map(a => `<div class="app-card"><div class="top"><div><h4>${E(a.applicantName)} <span class="fine mono">${E(shortAddr(a.applicantAddress))}</span></h4><p class="meta">${E(a.jobTitle)} · ${a.match}% match · ${E(a.route)} · ${new Date(a.date).toLocaleDateString()}</p></div>${statusPill(a.status || "Submitted")}</div>
        ${UC.sigRow(a, true)}
        <div class="sig-row">${(a.credentialIds || []).length ? `Anchored credentials: ${a.credentialIds.map(id => `<button class="btn-secondary" style="padding:3px 9px;font-size:12px;min-height:30px" onclick="UC.verifyAttestation('${E(id)}')">Verify ${E(UC.short(id, 8, 4))}</button>`).join(" ")}` : `No credentials anchored on-chain for this applicant.`}</div>
        <div class="actions"><button class="btn-btrust-action" onclick="setAppStatus('${a.id}','Shortlisted')">Shortlist</button><button class="btn-secondary" onclick="setAppStatus('${a.id}','Declined')">Decline</button></div></div>`).join("") : `<div class="empty">No applications yet.</div>`);
  }
}
function setAppStatus(id, status) { const a = applicationsList.find(x => x.id === id); if (a) { a.status = status; lsSet("ujuzi_applications", applicationsList); renderApplications(); } }

/* ---------- applicant: credentials, requests, viewer, profile ---------- */
function renderCredentials() {
  const docs = profileData.docs || [];
  $("credentialsAttachedList").innerHTML = docs.length ? docs.map((d, i) => `<div class="list-row"><div style="min-width:0"><h4>${E(d.name)}</h4><div style="margin-top:6px">${UC.chip(d.sha256)}</div><p class="fine" style="margin-top:4px">${E(d.size || "")}</p></div><button class="btn-secondary" onclick="openViewer(${i})">View proof</button></div>`).join("") : `<div class="empty">No documents yet. Add one to get its fingerprint.</div>`;
  $("reqDoc").innerHTML = docs.length ? docs.map((d, i) => `<option value="${i}">${E(d.name)}</option>`).join("") : `<option value="">Add a document first</option>`;
  UC.renderAttestations();
  const mine = ls("ujuzi_institutions_directory", []).filter(r => (r.candidateWallet || "").toLowerCase() === W);
  $("myRequests").innerHTML = mine.length ? mine.map(r => { const done = UC.myAttestations().some(a => a.requestId === r.id); return `<div class="list-row"><div><h4>${E(r.orgName)}</h4><p class="fine">${E(r.documentName)} · sent ${E(r.dateSent)}</p></div>${statusPill(done ? "Attested" : "Submitted")}</div>`; }).join("") : `<p class="fine">No requests sent.</p>`;
}
function sendAttestationRequest() {
  const org = $("reqOrg").value.trim(), email = $("reqEmail").value.trim(), di = $("reqDoc").value, st = $("reqStatus");
  const doc = (profileData.docs || [])[di];
  if (!org || !/^\S+@\S+\.\S+$/.test(email) || !doc) { st.style.color = "var(--accent-red)"; st.innerText = "Enter the institution, a valid email and choose a document."; return; }
  const entry = { id: "vreq_" + Math.random().toString(36).slice(2, 10), orgName: org, officialEmail: email, candidateName: displayName(), candidateWallet: currentWallet, documentName: doc.name, docHash: doc.sha256, status: "Pending Verification", dateSent: new Date().toLocaleDateString() };
  const dir = ls("ujuzi_institutions_directory", []); dir.unshift(entry); lsSet("ujuzi_institutions_directory", dir);
  fetch("/.netlify/functions/send-verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(entry) }).catch(() => {});
  st.style.color = "var(--accent-green)"; st.innerText = "Request recorded. If the email service is configured, the institution receives a link."; $("reqOrg").value = ""; $("reqEmail").value = ""; renderCredentials();
}
function openViewer(i) {
  const d = (profileData.docs || [])[i]; if (!d) return;
  $("ivDocTitle").innerText = d.name; $("ivCertCandidate").innerText = displayName(); $("ivCertOrg").innerText = "Registry check"; $("ivMetaOrg").innerText = "Resolved from the on-chain record";
  $("ivCertDegree").innerText = d.name; $("ivMetaHash").innerText = d.sha256; $("ivContract").innerText = UC.ADDRESS;
  let reg = "-"; try { reg = UC.derivedId(currentWallet, d.sha256); } catch (e) {} $("ivCertRegId").innerText = reg;
  $("iremboViewerModal").style.display = "flex"; UC.viewerProof(null, d.sha256, currentWallet);
}
function closeViewer(e) { if (e && e.target && e.target.id !== "iremboViewerModal") return; $("iremboViewerModal").style.display = "none"; }
function openProfileModal() {
  $("inputFullName").value = profileData.name || ""; $("inputHeadline").value = profileData.headline || ""; $("inputSkills").value = (profileData.skills || []).join(", ");
  const app = currentRole === "Applicant";
  $("grpSkills").style.display = app ? "block" : "none"; $("grpDocs").style.display = app ? "block" : "none";
  $("lblName").innerText = app ? "Full name" : currentRole === "Recruiter" ? "Name or company" : "Institution name";
  $("lblHead").innerText = app ? "Professional title" : "Role or short description";
  $("modalProfileTitle").innerText = "Edit profile"; renderUploadedDocs(); $("profileModal").style.display = "flex";
}
function closeProfileModal(e) { if (e && e.target && e.target.id !== "profileModal") return; $("profileModal").style.display = "none"; }
function renderUploadedDocs() {
  $("uploadedDocsList").innerHTML = (profileData.docs || []).map((d, i) => `<div class="list-row" style="padding:10px 12px"><div style="min-width:0"><div style="font-size:13px;font-weight:600">${E(d.name)}</div><div class="fine mono">${E(UC.short(d.sha256, 12, 6))}</div></div><button type="button" class="btn-secondary" onclick="removeDoc(${i})">Remove</button></div>`).join("");
}
async function handleDocUpload(ev) {
  const f = ev.target.files[0]; if (!f) return;
  const buf = await f.arrayBuffer(); const h = await crypto.subtle.digest("SHA-256", buf);
  const sha = "0x" + Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, "0")).join("");
  profileData.docs = profileData.docs || []; profileData.docs.unshift({ name: f.name, sha256: sha, size: (f.size / 1024 / 1024).toFixed(2) + " MB" });
  renderUploadedDocs(); ev.target.value = "";
}
function removeDoc(i) { profileData.docs.splice(i, 1); renderUploadedDocs(); }
function saveProfileDetails(ev) {
  ev.preventDefault();
  profileData.name = $("inputFullName").value.trim(); profileData.headline = $("inputHeadline").value.trim();
  if (currentRole === "Applicant") profileData.skills = $("inputSkills").value.split(",").map(s => s.trim()).filter(Boolean);
  lsSet(PROFILE_KEY, profileData); closeProfileModal(); paintUser(); switchNav(document.querySelector(".nav-btn.active") ? document.querySelector(".nav-btn.active").id.replace("btn-tab-", "") : "overview");
}

/* ---------- verify (all roles) ---------- */
function renderVerify() { if (currentRole === "Recruiter") { $("feeCard").style.display = "block"; UC.renderFeeInfo("feeInfo"); } else { $("feeCard").style.display = "none"; } }
function verifyOnSepolia() { const v = $("verifyIdField").value.trim(); if (v) UC.verifyUI(v); }

/* ---------- recruiter: roles ---------- */
function renderRoles() {
  const mine = ls("ujuzi_posted_jobs", []).filter(j => (j.owner || "").toLowerCase() === W);
  $("myRolesList").innerHTML = mine.length ? mine.map(j => `<div class="list-row"><div><h4>${E(j.title)}</h4><p class="fine">${E(j.company)} · ${E(j.location)}</p><p class="fine">${j.requirements.map(E).join(", ")} · ${applicationsList.filter(a => a.jobId === j.id).length} application(s)</p></div><button class="btn-secondary" onclick="removeRole('${j.id}')">Remove</button></div>`).join("") : `<div class="empty">You have not posted a role yet.</div>`;
  if (!$("roleCompany").value) $("roleCompany").value = profileData.name || "";
}
function postRole() {
  const t = $("roleTitle").value.trim(), c = $("roleCompany").value.trim(), l = $("roleLocation").value.trim(), d = $("roleDesc").value.trim();
  const skills = $("roleSkills").value.split(",").map(s => s.trim()).filter(Boolean), st = $("roleStatus");
  if (!t || !c || !skills.length) { st.style.color = "var(--accent-red)"; st.innerText = "A title, a company and at least one skill are required."; return; }
  const all = ls("ujuzi_posted_jobs", []); all.unshift({ id: "job-" + Date.now(), title: t, company: c, location: l || "Location not set", description: d, requirements: skills, owner: currentWallet });
  lsSet("ujuzi_posted_jobs", all); ["roleTitle", "roleLocation", "roleSkills", "roleDesc"].forEach(i => $(i).value = ""); st.style.color = "var(--accent-green)"; st.innerText = "Role posted. Applicants in this browser can now see it."; renderRoles();
}
function removeRole(id) { lsSet("ujuzi_posted_jobs", ls("ujuzi_posted_jobs", []).filter(j => j.id !== id)); renderRoles(); }

/* ---------- institution: requests ---------- */
function pendingRequests() { const att = ls("ujuzi_onchain_attestations", []); return ls("ujuzi_institutions_directory", []).filter(r => !att.some(a => a.requestId === r.id)).length; }
function renderRequests() {
  const dir = ls("ujuzi_institutions_directory", []);
  const att = ls("ujuzi_onchain_attestations", []);
  $("requestsRoot").innerHTML = hero("Attestation requests", "Applicants ask you to confirm a document. Review the details, then sign a transaction from an approved wallet.") +
    `<p class="fine" style="margin-bottom:14px">In this prototype requests are stored in the browser where the applicant registered. A production version needs a server.</p>` +
    (dir.length ? dir.map(r => { const ok = att.some(a => a.requestId === r.id); return `<div class="app-card"><div class="top"><div><h4>${E(r.orgName)}</h4><p class="meta">${E(r.candidateName)} · ${E(r.documentName)} · sent ${E(r.dateSent)}</p><div style="margin-top:8px">${UC.chip(r.docHash)}</div></div>${statusPill(ok ? "Attested" : "Submitted")}</div>${ok ? "" : `<div class="actions"><a class="btn-btrust-action" target="_blank" rel="noopener" href="verify-request.html?id=${encodeURIComponent(r.id)}">Review and attest</a></div>`}</div>`; }).join("") : `<div class="empty">No requests yet.</div>`);
}

/* ---------- header ---------- */
function paintUser() {
  const n = displayName(); $("userName").innerText = n; $("userRole").innerText = currentRole;
  $("avatar").innerText = n.split(" ").map(x => x[0]).join("").slice(0, 2).toUpperCase() || "U";
}

/* ---------- start ---------- */
(async function init() {
  buildNav(); paintUser();
  try { const m = await import("./services/UjuziEngine.js"); window.CompetencyAlgorithm = m.CompetencyAlgorithm; }
  catch (e) { console.warn("Scoring engine not loaded. Serve the site over http, not file://.", e); $("walletBanner").insertAdjacentHTML("afterbegin", `<div class="demo-banner">The scoring engine could not load. Open the site through a local web server (see README), not by double-clicking the file.</div>`); }
  const first = new URLSearchParams(location.search).get("tab");
  switchNav(allowedTabs.includes(first) ? first : "overview");
  if (currentRole === "Institution" && IN_SESSION) UC.institutionStatus(currentWallet).then(s => { if (s && s.isAdmin) addAdminTab(); });
})();
