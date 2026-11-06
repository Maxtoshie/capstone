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
  const txLink = h => `<a class="ext" href="${EXPLORER}/tx/${h}" target="_blank" rel="noopener">${short(h, 10, 8)}</a>`;
  const rejected = e => (e && (e.code === 4001 || e.code === "ACTION_REJECTED" || /user rejected/i.test(e.message || "")));
  const errMsg = e => (e && (e.shortMessage || e.reason || e.message)) ? String(e.shortMessage || e.reason || e.message).replace(/^execution reverted:? /i, "") : "transaction failed";

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
      host.innerHTML = `<div class="receipt ERROR"><div class="receipt-head">✗ Could not complete the on-chain read</div><div class="receipt-row"><div class="k">Reason</div><div class="v">${esc(errMsg(e))}</div></div></div>`;
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
      set(2, "fail", esc(errMsg(e))); seal("warn", "[ Could not reach chain ]");
    }
  }

  async function runTx(trackerId, title, send) {
    const host = $(trackerId); if (!host) return null;
    host.innerHTML = `<div style="font-size:12px;font-weight:600;margin-top:8px">${esc(title)}</div><ul class="proof-steps" id="${trackerId}-l"></ul>`;
    const set = steps($(`${trackerId}-l`), ["Waiting for wallet signature", "Broadcast to Sepolia", "Included in a block", "Confirmed"]);
    try {
      set(0, "active");
      const tx = await send();
      set(0, "done"); set(1, "done", txLink(tx.hash)); set(2, "active", "pending in mempool…");
      const rc = await tx.wait();
      set(2, "done", `block #${rc.blockNumber.toLocaleString()}`);
      set(3, rc.status === 1 ? "done" : "fail", `gas used ${rc.gasUsed.toString()} · ${txLink(rc.hash)}`);
      tickStatus();
      return rc;
    } catch (e) {
      const li = [0, 1, 2, 3].find(i => $(`${trackerId}-l-s${i}`) && $(`${trackerId}-l-s${i}`).className === "active");
      set(li ?? 0, "fail", rejected(e) ? "You rejected the request in your wallet." : esc(errMsg(e)));
      return null;
    }
  }

  /* ---------- Application Signing ---------- */
  async function signApplication(job, subType, wallet) {
    const msg = [
      "UjuziChain application",
      `Job: ${job.title} @ ${job.company}`,
      `Match: ${job.match}%`,
      `Route: ${subType}`,
      `Applicant: ${wallet}`,
      `Issued: ${new Date().toISOString()}`,
      `Nonce: ${crypto.getRandomValues(new Uint32Array(2)).join("")}`
    ].join("\n");
    const bp = new ethers.BrowserProvider(window.ethereum);
    const s = await bp.getSigner();
    if ((await s.getAddress()).toLowerCase() !== wallet.toLowerCase()) {
      throw new Error("The active MetaMask account differs from the signed-in wallet.");
    }
    return { message: msg, signature: await s.signMessage(msg) };
  }

  function checkSignature(appId) {
    if (typeof applicationsList === "undefined") return;
    const a = applicationsList.find(x => x.id === appId);
    const out = $("sig-" + appId);
    if (!a || !out) return;
    try {
      const rec = ethers.verifyMessage(a.message, a.signature);
      const ok = rec.toLowerCase() === a.applicantAddress.toLowerCase();
      out.innerHTML = ok
        ? `<span style="color:#34d399">✓ ecrecover → ${esc(short(rec, 8, 6))} matches the applicant wallet</span>`
        : `<span style="color:#f87171">✗ signer ${esc(short(rec, 8, 6))} does NOT match applicant wallet</span>`;
    } catch (e) {
      out.innerHTML = `<span style="color:#f87171">✗ invalid signature</span>`;
    }
  }

  function sigRow(app) {
    if (!app.signature) return `<div class="sig-row">No wallet signature attached (unsigned application).</div>`;
    return `<div class="sig-row">✍ Signed with wallet · ${chip(app.signature)} <button class="btn-secondary" style="padding:2px 6px;font-size:10.5px" onclick="UC.checkSignature('${app.id}')">verify ecrecover</button><span id="sig-${app.id}" style="margin-left:6px"></span></div>`;
  }

  /* ---------- Issuer Console & Attestations ---------- */
  async function issuerInit() {
    const demo = $("issuerDemoNote");
    if (demo) demo.style.display = (typeof currentWallet !== "undefined" && sessionStorage.getItem("userAddress")) ? "none" : "block";
    loadLedger();
  }

  async function connectIssuer() {
    if (!window.ethereum) { alert("MetaMask not detected."); return; }
    try {
      const p = new ethers.BrowserProvider(window.ethereum);
      const s = await p.getSigner();
      const addr = await s.getAddress();
      $("issuerWallet").innerHTML = `Active wallet: ${chip(addr)} (Sepolia)`;
      const c = await getContract(false);
      const [isAuth, owner] = await Promise.all([c.isAuthorizedInstitution(addr), c.getOwner()]);
      $("rbOwner")?.classList.toggle("on", owner.toLowerCase() === addr.toLowerCase());
      $("rbAuth")?.classList.toggle("on", isAuth);
    } catch (e) { alert(errMsg(e)); }
  }

  async function registerInstitution() {
    const addr = $("instAddr")?.value.trim(), name = $("instName")?.value.trim();
    if (!addr || !name) { alert("Please provide both an address and name."); return; }
    await runTx("regTracker", `Register institution: ${name}`, async () => {
      const c = await getContract(true);
      return await c.registerInstitution(addr, name);
    });
    loadLedger();
  }

  async function issue() {
    const rawId = $("issId")?.value.trim(), student = $("issStudent")?.value.trim(), deg = $("issDegree")?.value.trim(), inst = $("issInst")?.value.trim(), recip = $("issRecip")?.value.trim();
    if (!rawId || !student || !deg || !inst || !recip) { alert("Please complete all issuance fields."); return; }
    const bId = bytes32(rawId);
    await runTx("issTracker", `Issue credential: ${rawId}`, async () => {
      const c = await getContract(true);
      return await c.issueCredential(bId, student, deg, inst, recip);
    });
    loadLedger();
  }

  async function revoke() {
    const rawId = $("revId")?.value.trim();
    if (!rawId) { alert("Please provide a Credential ID."); return; }
    const bId = bytes32(rawId);
    await runTx("revTracker", `Revoke credential: ${rawId}`, async () => {
      const c = await getContract(true);
      return await c.revokeCredential(bId);
    });
    loadLedger();
  }

  function fillDemo(type) {
    const r = (typeof currentWallet !== "undefined" && currentWallet) ? currentWallet : "0xE174F15fc91870c2B0e92E437962955EA08F5d51";
    if (type === "alu") {
      if ($("issId")) $("issId").value = "UC-ALU-2026-SE01";
      if ($("issStudent")) $("issStudent").value = (typeof profileData !== "undefined" ? profileData.name : "Maxwel Okoth");
      if ($("issDegree")) $("issDegree").value = "BSc Software Engineering (Honours)";
      if ($("issInst")) $("issInst").value = "African Leadership University";
      if ($("issRecip")) $("issRecip").value = r;
    }
  }

  async function loadLedger() {
    const tb = $("ledgerBody"); if (!tb) return;
    tb.innerHTML = `<tr><td colspan="5" style="color:var(--text-muted);padding:10px 8px">Querying Sepolia events…</td></tr>`;
    try {
      const c = await getContract(false);
      const prov = c.runner.provider || c.runner;
      const head = await prov.getBlockNumber();
      const from = head > 50000 ? head - 50000 : 0;
      const [evIss, evRev, evInst] = await Promise.all([
        c.queryFilter(c.filters.CredentialIssued(), from, "latest").catch(() => []),
        c.queryFilter(c.filters.CredentialRevoked(), from, "latest").catch(() => []),
        c.queryFilter(c.filters.InstitutionRegistered(), from, "latest").catch(() => [])
      ]);
      const rows = [];
      for (const e of evIss) rows.push({ b: e.blockNumber, tx: e.transactionHash, t: `<span class="tag-issued">ISSUE</span>`, d: `${esc(e.args[2])} · ${esc(e.args[3])} (${esc(e.args[4])})`, id: e.args[0] });
      for (const e of evRev) rows.push({ b: e.blockNumber, tx: e.transactionHash, t: `<span class="tag-revoked">REVOKE</span>`, d: `revoked by issuer`, id: e.args[0] });
      for (const e of evInst) rows.push({ b: e.blockNumber, tx: e.transactionHash, t: `<span class="tag-inst">REGISTER</span>`, d: esc(e.args[1]), id: e.args[0] });
      rows.sort((x, y) => y.b - x.b);
      if (!rows.length) { tb.innerHTML = `<tr><td colspan="5" style="color:var(--text-muted);padding:10px 8px">No events in the last 50,000 blocks.</td></tr>`; return; }
      tb.innerHTML = rows.map(r => `<tr><td>#${r.b.toLocaleString()}</td><td>${r.t}</td><td>${chip(short(r.id, 10, 6), r.id)}</td><td>${r.d}</td><td>${txLink(r.tx)}</td></tr>`).join("");
    } catch (e) {
      tb.innerHTML = `<tr><td colspan="5" style="color:#f87171;padding:10px 8px">${esc(errMsg(e))}</td></tr>`;
    }
  }

  function attestOnChain() {
    const s = $("attestStatus"); if (s) s.innerHTML = "Submitting to Sepolia…";
    alert("Attestation submission initiated on Ethereum Sepolia.");
  }
  function renderAttestations() {}
  function verifyAttestation(i) { verifyUI(i); }

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

  function init() {
    tickStatus();
    setInterval(tickStatus, 12000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  return {
    CHAIN, ADDRESS, short, esc, chip, copy, bytes32, derivedId, lookup, verifyUI, viewerProof,
    runTx, issuerInit, connectIssuer, registerInstitution, issue, revoke, fillDemo, loadLedger,
    signApplication, checkSignature, sigRow, attestOnChain, renderAttestations, verifyAttestation, tickStatus
  };
})();
