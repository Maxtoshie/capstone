/**
 * UjuziChain · Sepolia on-chain provider & UI helper
 * Contract: 0xA40d77d6e31F5044C7151dAd78C8bA6C3313132F (Sepolia)
 */
const UC = (function () {
  const CHAIN = { id: 11155111n, hex: "0xaa36a7", name: "Sepolia" };
  const ADDRESS = "0xA40d77d6e31F5044C7151dAd78C8bA6C3313132F";
  const EXPLORER = "https://sepolia.etherscan.io";
  const RPC_FALLBACK = "https://rpc.sepolia.org";

  const ABI = [
    "function verifyCredential(bytes32 credentialId) external view returns (bool isValid, string degree, string institutionName)",
    "function getCredentialDetails(bytes32 credentialId) external view returns (string studentName, string degree, string institutionName, uint256 issueDate, bool isValid, address institutionAddress)",
    "function issueCredential(bytes32 credentialId, string studentName, string degree, string institutionName, address recipient) external",
    "function revokeCredential(bytes32 credentialId) external",
    "function registerInstitution(address institutionAddress, string institutionName) external",
    "function isAuthorizedInstitution(address institutionAddress) external view returns (bool)",
    "function getOwner() external view returns (address)",
    "event CredentialIssued(bytes32 indexed credentialId, address indexed recipient, string studentName, string degree, string institutionName, uint256 issueDate)",
    "event CredentialRevoked(bytes32 indexed credentialId, uint256 revocationDate)",
    "event InstitutionRegistered(address indexed institutionAddress, string institutionName)"
  ];

  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const short = (s, l = 6, r = 4) => { if (!s) return ""; s = String(s); return s.length <= l + r + 3 ? s : `${s.slice(0, l)}…${s.slice(-r)}`; };

  function bytes32(raw) {
    if (!raw) return "0x" + "0".repeat(64);
    raw = String(raw).trim();
    if (/^0x[0-9a-fA-F]{64}$/.test(raw)) return raw;
    try {
      const b = new TextEncoder().encode(raw);
      if (b.length <= 31) return ethers.encodeBytes32String(raw);
    } catch (_) {}
    return ethers.keccak256(ethers.toUtf8Bytes(raw));
  }

  function derivedId(wallet, docHash) {
    if (!wallet || !docHash) return bytes32("DEMO");
    return ethers.keccak256(ethers.solidityPacked(["address", "bytes32"], [wallet, bytes32(docHash)]));
  }

  function getProvider() {
    if (typeof window !== "undefined" && window.ethereum) {
      return new ethers.BrowserProvider(window.ethereum);
    }
    return new ethers.JsonRpcProvider(RPC_FALLBACK);
  }

  async function getContract(needSigner = false) {
    const p = getProvider();
    if (!needSigner) return new ethers.Contract(ADDRESS, ABI, p);
    if (!window.ethereum) throw new Error("MetaMask is required to sign this transaction.");
    const signer = await p.getSigner();
    const net = await p.getNetwork();
    if (net.chainId !== CHAIN.id) {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN.hex }] });
    }
    return new ethers.Contract(ADDRESS, ABI, signer);
  }

  function chip(text, title = "") {
    const t = esc(text);
    return `<span class="hash-chip" title="${esc(title || text)}"><span>${t}</span><button type="button" onclick="UC.copy('${t}', this)" title="Copy">⎘</button></span>`;
  }

  function copy(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
      if (btn) { const o = btn.textContent; btn.textContent = "✓"; setTimeout(() => { btn.textContent = o; }, 1200); }
    });
  }

  function steps(el, list) {
    el.innerHTML = list.map((t, i) => `<li id="${el.id}-s${i}"><span class="ico"></span><span class="txt">${esc(t)}</span><span class="detail"></span></li>`).join("");
    return (i, state, detail) => {
      const li = $(`${el.id}-s${i}`); if (!li) return;
      li.className = state;
      const d = li.querySelector(".detail"); if (d) d.innerHTML = detail ?? "";
    };
  }

  async function lookup(rawId) {
    const bId = bytes32(rawId);
    const c = await getContract(false);
    const p = c.runner.provider || c.runner;
    const t0 = performance.now();
    const [block, [valid, deg, inst]] = await Promise.all([p.getBlockNumber(), c.verifyCredential(bId)]);
    const ms = Math.round(performance.now() - t0);
    let details = null;
    if (valid || deg || inst) {
      try { details = await c.getCredentialDetails(bId); } catch (_) {}
    }
    const state = valid ? "VALID" : (deg || inst ? "REVOKED" : "NOT_FOUND");
    return { rawId, bId, valid, degree: deg, institution: inst, details, block, ms, state };
  }

  async function verifyUI(rawId, hostId = "verifyResultPane") {
    const host = $(hostId); if (!host) return;
    if (!rawId) { host.innerHTML = `<div class="receipt NOT_FOUND"><div class="receipt-head">Please enter a Credential ID or SHA-256 hash.</div></div>`; return; }
    host.innerHTML = `<div class="receipt"><div class="receipt-head"><span class="pulse-dot"></span> Querying Ethereum Sepolia (eth_call)…</div></div>`;
    try {
      const r = await lookup(rawId);
      const isOk = r.state === "VALID", isRev = r.state === "REVOKED";
      const icon = isOk ? "✓" : (isRev ? "⚠" : "✗");
      const title = isOk ? "Credential is VERIFIED on Ethereum Sepolia" : (isRev ? "Credential is REVOKED by issuer" : "Credential NOT FOUND in Sepolia registry");
      const rows = [
        ["Registry key (bytes32)", chip(r.bId)],
        ["Status", `<strong style="color:${isOk ? '#34d399' : (isRev ? '#fbbf24' : '#f87171')}">${r.state}</strong>`],
        ["Degree / Qualification", esc(r.degree || "—")],
        ["Issuing Authority", esc(r.institution || "—")],
        ["Student Name", esc(r.details ? r.details[0] : "—")],
        ["Issue Date", r.details && Number(r.details[3]) ? new Date(Number(r.details[3]) * 1000).toUTCString() : "—"],
        ["Issuer Address", r.details && r.details[5] ? chip(r.details[5]) : "—"],
        ["Head Block read at", `#${r.block.toLocaleString()}`],
        ["Contract", `<a class="ext" href="${EXPLORER}/address/${ADDRESS}" target="_blank" rel="noopener">${short(ADDRESS, 10, 6)}</a>`],
        ["Latency", `${r.ms} ms (eth_call · Gas paid: 0)`]
      ];
      host.innerHTML = `<div class="receipt ${r.state}"><div class="receipt-head">${icon} ${title}</div>${rows.map(([k, v]) => `<div class="receipt-row"><div class="k">${k}</div><div class="v">${v}</div></div>`).join("")}<div class="receipt-foot">Read-only cryptographic check. Any client querying Sepolia at block #${r.block.toLocaleString()} will receive the same result.</div></div>`;
    } catch (e) {
      host.innerHTML = `<div class="receipt ERROR"><div class="receipt-head">✗ Could not complete the on-chain read</div><div class="receipt-row"><div class="k">Reason</div><div class="v">${esc(e.message || e)}</div></div></div>`;
    }
  }

  async function viewerProof(regId, docHash) {
    const host = $("ivProof"); if (!host) return;
    host.innerHTML = `<ul class="proof-steps" id="ivProofList"></ul><div id="ivSeal" style="margin-top:8px"></div>`;
    const set = steps($("ivProofList"), ["Document digest (SHA-256, computed in browser)", "Derive registry key", "Query registry (eth_call)", "Compare with issuer record"]);
    const seal = (cls, t) => { $("ivSeal").innerHTML = `<span class="seal ${cls}">${t}</span>`; };
    try {
      set(0, "active"); await sleep(250); set(0, "done", esc(short(docHash, 18, 8)));
      set(1, "active");
      let ids = [regId]; const w = (typeof currentWallet !== "undefined") ? currentWallet : null;
      if (w && /^0x[0-9a-fA-F]{20,}/.test(docHash || "")) ids.push(derivedId(w, docHash));
      await sleep(200); set(1, "done", ids.map(i => esc(short(bytes32(i), 10, 6))).join(" · "));
      set(2, "active"); let hit = null, last = null;
      for (const i of ids) { last = await lookup(i); if (last.state !== "NOT_FOUND") { hit = last; break; } }
      set(2, "done", `head block #${(hit || last).block.toLocaleString()}`);
      set(3, "active"); await sleep(200);
      if (hit && hit.state === "VALID") { set(3, "done", `issuer record: ${esc(hit.degree)}`); seal("", "[ Seal verified on-chain ]"); }
      else if (hit) { set(3, "fail", "record exists but is revoked"); seal("warn", "[ Revoked ]"); }
      else { set(3, "fail", "no record at these IDs on Sepolia"); seal("bad", "[ Not anchored on-chain ]"); }
    } catch (e) {
      set(2, "fail", esc(e.message || e)); seal("warn", "[ Could not reach chain ]");
    }
  }

  async function tickStatus() {
    const p = $("chainPillText"); if (!p) return;
    try {
      const prov = getProvider();
      const b = await prov.getBlockNumber();
      p.textContent = `Sepolia · #${b.toLocaleString()}`;
      $("chainPill")?.classList.remove("offline");
    } catch (_) {
      p.textContent = "Sepolia · RPC retry";
      $("chainPill")?.classList.add("offline");
    }
  }

  /* ---------- Global Btrust Drawer Setup ---------- */
  function mountBtrustDrawer() {
    const navbar = document.querySelector(".btrust-navbar");
    if (!navbar) return;

    // 1. Ensure Burger button exists in navbar
    let burger = navbar.querySelector(".btrust-burger");
    if (!burger) {
      burger = document.createElement("button");
      burger.className = "btrust-burger";
      burger.type = "button";
      burger.setAttribute("aria-label", "Open Navigation");
      burger.innerHTML = "<span></span><span></span>";
      navbar.appendChild(burger);
    }

    // 2. Build and mount drawer overlay if missing
    let overlay = document.getElementById("mobileDrawerOverlay");
    const isDashboard = !!document.getElementById("pane-overview");

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "btrust-drawer-overlay";
      overlay.id = "mobileDrawerOverlay";

      if (isDashboard) {
        overlay.innerHTML = `
          <div class="btrust-drawer">
            <div class="btrust-drawer-header">
              <div class="nav-brand">
                <div class="logo-box">UC</div>
                <div class="logo-text">UjuziChain</div>
              </div>
              <button class="btrust-drawer-close" aria-label="Close menu">&times;</button>
            </div>
            <div class="btrust-drawer-menu">
              <button class="btrust-drawer-link" data-tab="overview">Overview</button>
              <button class="btrust-drawer-link" data-tab="jobs">Jobs</button>
              <button class="btrust-drawer-link" data-tab="applications">Applications</button>
              <button class="btrust-drawer-link" data-tab="simulations">Simulations</button>
              <button class="btrust-drawer-link" data-tab="credentials">Credentials</button>
              <button class="btrust-drawer-link" data-tab="verify">Verify Credential</button>
              <button class="btrust-drawer-link" data-tab="issuer">Issuer Console</button>
            </div>
            <div class="btrust-drawer-footer">
              <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
                <div class="profile-avatar" id="mobAvatarInitials" style="width:34px; height:34px; font-size:13px; border-radius:50%; background:#2563eb; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700;">MO</div>
                <div style="min-width:0;">
                  <div id="mobDisplayName" style="font-size:13px; font-weight:600; color:#fff;">Demo User</div>
                  <div id="mobWalletAddress" style="font-size:11px; color:var(--text-muted,#6b7280); font-family:monospace;">0x...</div>
                </div>
              </div>
              <button class="btn-logout" id="mobLogoutBtn" style="width:100%; min-height:40px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.25); color:#f87171; border-radius:6px; cursor:pointer; font-weight:600;">Logout</button>
            </div>
          </div>
        `;
      } else {
        overlay.innerHTML = `
          <div class="btrust-drawer">
            <div class="btrust-drawer-header">
              <div class="nav-brand">
                <div class="logo-box">UC</div>
                <div class="logo-text">UjuziChain</div>
              </div>
              <button class="btrust-drawer-close" aria-label="Close menu">&times;</button>
            </div>
            <div class="btrust-drawer-menu">
              <a href="#home" class="btrust-drawer-link">Home</a>
              <button class="btrust-drawer-link" id="mobSubBuildersBtn"><span>Builders</span><span>&#x2304;</span></button>
              <div class="btrust-drawer-submenu" id="mobSubBuilders">
                <a href="login.html" class="btrust-drawer-sublink">Applicant Portal</a>
                <a href="#journeys" class="btrust-drawer-sublink">Take Simulation</a>
                <a href="#verification-flow" class="btrust-drawer-sublink">Verified Credentials</a>
              </div>
              <button class="btrust-drawer-link" id="mobSubRecruitersBtn"><span>Recruiters</span><span>&#x2304;</span></button>
              <div class="btrust-drawer-submenu" id="mobSubRecruiters">
                <a href="login.html?role=recruiter" class="btrust-drawer-sublink">Applications Inbox</a>
                <a href="login.html?role=recruiter" class="btrust-drawer-sublink">Post East Africa Job</a>
                <a href="#verification-flow" class="btrust-drawer-sublink">Verify Credential</a>
              </div>
              <a href="#target-users" class="btrust-drawer-link">About Us</a>
              <button class="btrust-drawer-link" id="mobSetupGuideBtn">Setup Guide</button>
            </div>
            <div class="btrust-drawer-footer">
              <a href="login.html" class="btn-btrust-hero" style="justify-content:center; width:100%; text-decoration:none;">Launch Portal &rarr;</a>
            </div>
          </div>
        `;
      }
      document.body.appendChild(overlay);
    }

    // 3. Attach click listeners
    const toggle = open => {
      overlay.classList.toggle("active", open);
      document.body.style.overflow = open ? "hidden" : "";
      if (open && isDashboard) {
        const u = sessionStorage.getItem("userAddress") || "0xE174F...5d51";
        const n = sessionStorage.getItem("userName") || "Demo User";
        const dN = $("mobDisplayName"), dW = $("mobWalletAddress"), dA = $("mobAvatarInitials");
        if (dN) dN.innerText = n;
        if (dW) dW.innerText = short(u, 6, 4);
        if (dA) dA.innerText = n.split(" ").map(p => p[0]).join("").toUpperCase();
      }
    };

    burger.onclick = e => { e.preventDefault(); e.stopPropagation(); toggle(true); };
    overlay.querySelector(".btrust-drawer-close")?.addEventListener("click", () => toggle(false));
    overlay.onclick = e => { if (e.target === overlay) toggle(false); };

    if (isDashboard) {
      overlay.querySelectorAll("[data-tab]").forEach(btn => {
        btn.addEventListener("click", () => {
          const tab = btn.getAttribute("data-tab");
          toggle(false);
          if (typeof window.switchNav === "function") window.switchNav(tab);
        });
      });
      overlay.querySelector("#mobLogoutBtn")?.addEventListener("click", () => {
        sessionStorage.clear();
        window.location.href = "login.html";
      });
    } else {
      overlay.querySelector("#mobSubBuildersBtn")?.addEventListener("click", () => $("mobSubBuilders")?.classList.toggle("open"));
      overlay.querySelector("#mobSubRecruitersBtn")?.addEventListener("click", () => $("mobSubRecruiters")?.classList.toggle("open"));
      overlay.querySelector("#mobSetupGuideBtn")?.addEventListener("click", () => {
        toggle(false);
        if (typeof window.openSetupModal === "function") window.openSetupModal();
      });
      overlay.querySelectorAll("a").forEach(a => a.addEventListener("click", () => toggle(false)));
    }
  }

  function init() {
    tickStatus();
    setInterval(tickStatus, 12000);
    mountBtrustDrawer();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  return { CHAIN, ADDRESS, short, esc, chip, copy, bytes32, derivedId, lookup, verifyUI, viewerProof, tickStatus };
})();
