/* UjuziChain on-chain helpers (classic script; needs the global `ethers` v6 UMD build). */
const UC = (() => {
  const CFG = window.UJUZI_CONFIG || {};
  const CHAIN = { id: 11155111, hex: "0xaa36a7", name: "Sepolia", explorer: "https://sepolia.etherscan.io", rpc: "https://ethereum-sepolia-rpc.publicnode.com" };
  const ADDRESS = CFG.address || "0xA40d77d6e31F5044C7151dAd78C8bA6C3313132F";
  const ABI = [
    "function admin() view returns (address)",
    "function approvedInstitutions(address) view returns (bool)",
    "function credentials(bytes32) view returns (string studentId, string degree, bool isValid)",
    "function registerInstitution(address institution)",
    "function removeInstitution(address institution)",
    "function issueCredential(bytes32 credentialId, string studentId, string degree)",
    "function revokeCredential(bytes32 credentialId)",
    "function verifyCredential(bytes32 credentialId) view returns (bool, string, string)",
    "function verificationFee() view returns (uint256)",
    "function MAX_FEE() view returns (uint256)",
    "function certifyVerification(bytes32 credentialId, uint256 maxFee) payable",
    "function setVerificationFee(uint256 newFee)",
    "event InstitutionRegistered(address indexed institution)",
    "event InstitutionRemoved(address indexed institution)",
    "event CredentialIssued(bytes32 indexed credentialId, string studentId)",
    "event CredentialRevoked(bytes32 indexed credentialId)",
    "event VerificationCertified(bytes32 indexed credentialId, address indexed verifier, bool isValid, uint256 feePaid)"
  ];
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const short = (s, a = 8, b = 6) => !s ? "" : (s.length > a + b + 3 ? s.slice(0, a) + "…" + s.slice(-b) : s);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const errMsg = e => (e && (e.reason || e.shortMessage || (e.info && e.info.error && e.info.error.message) || e.message)) || String(e);
  const rejected = e => e && (e.code === "ACTION_REJECTED" || e.code === 4001);
  const sess = () => sessionStorage.getItem("userAddress");
  const txLink = h => `<a class="ext" target="_blank" rel="noopener" href="${CHAIN.explorer}/tx/${esc(h)}">${esc(short(h, 10, 8))} ↗</a>`;
  const addrLink = a => `<a class="ext" target="_blank" rel="noopener" href="${CHAIN.explorer}/address/${esc(a)}">${esc(short(a, 8, 6))} ↗</a>`;
  const chip = t => `<span class="hash-chip"><span>${esc(short(t, 14, 10))}</span><button type="button" title="Copy" onclick="UC.copy('${esc(t)}', this)">⧉</button></span>`;
  const eth = wei => { const n = Number(ethers.formatEther(wei)); return n === 0 ? "0" : n < 0.0001 ? n.toPrecision(2) : String(+n.toFixed(6)); };

  function copy(text, btn) {
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).catch(() => {}).finally(() => {
      if (btn) { const o = btn.textContent; btn.textContent = "✓"; setTimeout(() => btn.textContent = o, 1200); }
    });
  }

  /* ---------- ids ---------- */
  function bytes32(raw) {
    raw = String(raw).trim();
    if (/^0x[0-9a-fA-F]{64}$/.test(raw)) return raw;
    if (new TextEncoder().encode(raw).length <= 31) return ethers.encodeBytes32String(raw);
    return ethers.keccak256(ethers.toUtf8Bytes(raw));
  }
  const derivedId = (wallet, docHash) => ethers.keccak256(ethers.toUtf8Bytes(`${String(wallet).toLowerCase()}:${docHash}`));

  /* ---------- providers ---------- */
  let _read = null;
  async function readProvider() {
    if (_read) return _read;
    const tryP = async p => { await Promise.race([p.getBlockNumber(), sleep(5000).then(() => { throw new Error("timeout"); })]); return p; };
    try { _read = await tryP(new ethers.JsonRpcProvider(CHAIN.rpc, CHAIN.id)); }
    catch (e) { _read = await tryP(ethers.getDefaultProvider("sepolia")); }
    return _read;
  }
  async function ensureSepolia() {
    if (!window.ethereum) throw new Error("MetaMask not found. Install it to sign transactions.");
    const cid = await window.ethereum.request({ method: "eth_chainId" });
    if (cid !== CHAIN.hex) {
      try { await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN.hex }] }); }
      catch (e) {
        if (e.code === 4902) await window.ethereum.request({ method: "wallet_addEthereumChain", params: [{ chainId: CHAIN.hex, chainName: "Sepolia", nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 }, rpcUrls: [CHAIN.rpc], blockExplorerUrls: [CHAIN.explorer] }] });
        else throw e;
      }
    }
  }
  async function signer() { await ensureSepolia(); return new ethers.BrowserProvider(window.ethereum).getSigner(); }
  const readContract = async () => new ethers.Contract(ADDRESS, ABI, await readProvider());

  /* ---------- connect button (top right) ---------- */
  const MM_URL = "https://metamask.io/download/";
  async function walletInfo() {
    if (!window.ethereum) return { state: "none" };
    let accts = [], cid = null;
    try { accts = await window.ethereum.request({ method: "eth_accounts" }); cid = await window.ethereum.request({ method: "eth_chainId" }); } catch (e) {}
    if (!accts.length) return { state: "off", cid };
    const a = accts[0], s = sess();
    if (cid !== CHAIN.hex) return { state: "network", a, cid };
    if (s && s.toLowerCase() !== a.toLowerCase()) return { state: "mismatch", a, cid, s };
    return { state: "ok", a, cid };
  }
  async function renderWallet() {
    const btn = $("connectBtn"); if (!btn) return;
    const w = await walletInfo(); btn.dataset.state = w.state;
    const dot = '<span class="pulse-dot"></span>';
    const map = {
      none: ["Install MetaMask", "off"], off: ["Connect wallet", "off"], network: ["Switch to Sepolia", "warn"],
      mismatch: ["Wrong account", "warn"], ok: [`${dot}Connected · ${esc(short(w.a || "", 6, 4))}`, "on"]
    };
    const [label, cls] = map[w.state]; btn.className = `connect-btn ${cls}`; btn.innerHTML = label;
    btn.title = w.state === "ok" ? "Wallet connected on Sepolia. Click for details." : "";
    const warn = $("walletBanner");
    if (warn) {
      if (w.state === "mismatch") warn.innerHTML = `<div class="demo-banner">MetaMask is on ${esc(short(w.a, 6, 4))} but you signed in as ${esc(short(w.s, 6, 4))}. Switch account in MetaMask, or <a href="#" class="ext" onclick="UC.signOut();return false">sign out</a> and sign in again.</div>`;
      else if (w.state === "network") warn.innerHTML = `<div class="demo-banner">Your wallet is on the wrong network. <a href="#" class="ext" onclick="UC.connectClick();return false">Switch to Sepolia</a>.</div>`;
      else warn.innerHTML = "";
    }
  }
  async function connectClick(ev) {
    const w = await walletInfo();
    if (w.state === "none") { window.open(MM_URL, "_blank", "noopener"); return; }
    if (w.state === "off") { try { await window.ethereum.request({ method: "eth_requestAccounts" }); } catch (e) {} return renderWallet(); }
    if (w.state === "network") { try { await ensureSepolia(); } catch (e) {} return renderWallet(); }
    toggleWalletMenu(w, ev);
  }
  function toggleWalletMenu(w, ev) {
    const m = $("walletMenu"); if (!m) return;
    if (m.style.display === "block") { m.style.display = "none"; return; }
    const sw = sess();
    m.innerHTML = `
      <div class="wm-row"><span>Wallet</span><strong>${addrLink(w.a)}</strong></div>
      <div class="wm-row"><span>Network</span><strong>${w.cid === CHAIN.hex ? "Sepolia (test network)" : "Wrong network"}</strong></div>
      <div class="wm-row"><span>Signed in as</span><strong>${sw ? esc(short(sw, 6, 4)) : "Demo (not signed in)"}</strong></div>
      <div class="wm-actions">
        <button class="btn-secondary" onclick="UC.copy('${esc(w.a)}', this)">Copy address</button>
        <button class="btn-secondary" onclick="UC.switchAccount()">Switch account</button>
        <button class="btn-secondary" onclick="UC.signOut()">Sign out</button>
      </div>`;
    m.style.display = "block";
  }
  async function switchAccount() {
    try { await window.ethereum.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] }); } catch (e) {}
    const m = $("walletMenu"); if (m) m.style.display = "none"; renderWallet();
  }
  function signOut() {
    sessionStorage.clear(); window.location.href = "login.html";
  }
  function initWallet() {
    const btn = $("connectBtn"); if (!btn) return;
    btn.addEventListener("click", connectClick);
    document.addEventListener("click", e => { const m = $("walletMenu"); if (m && !e.target.closest("#walletMenu") && !e.target.closest("#connectBtn")) m.style.display = "none"; });
    if (window.ethereum && window.ethereum.on) { window.ethereum.on("accountsChanged", renderWallet); window.ethereum.on("chainChanged", renderWallet); }
    renderWallet();
  }

  /* ---------- live chain status pill ---------- */
  async function tickStatus() {
    const pill = $("chainPill"), txt = $("chainPillText");
    if (!pill) return;
    try {
      const p = await readProvider();
      const [n, fee] = await Promise.all([p.getBlockNumber(), p.getFeeData().catch(() => null)]);
      const gwei = fee && fee.gasPrice ? Number(ethers.formatUnits(fee.gasPrice, "gwei")).toFixed(2) : null;
      pill.classList.remove("offline");
      txt.innerHTML = `Sepolia · #${n.toLocaleString()}${gwei ? ` <span class="gas">· ${gwei} gwei</span>` : ""}`;
      pill.title = `Latest Sepolia block ${n}. Reads are free; writes cost gas.`;
    } catch (e) { pill.classList.add("offline"); txt.textContent = "Sepolia · offline"; }
  }

  /* ---------- progress list ---------- */
  function steps(container, labels) {
    container.innerHTML = labels.map((l, i) => `<li class="wait" id="${container.id}-s${i}"><span class="ico"></span><span>${esc(l)}<span class="detail" id="${container.id}-d${i}"></span></span></li>`).join("");
    return (i, state, detail) => { const li = $(`${container.id}-s${i}`); if (!li) return; li.className = state; if (detail !== undefined) $(`${container.id}-d${i}`).innerHTML = detail; };
  }

  /* ---------- read-only verification (free) ---------- */
  async function lookup(rawId, set) {
    const t0 = performance.now();
    const id = bytes32(rawId);
    set && set(0, "active"); await sleep(150);
    const iface = new ethers.Interface(ABI);
    const calldata = iface.encodeFunctionData("verifyCredential", [id]);
    set && set(0, "done", `selector ${calldata.slice(0, 10)} · arg ${short(id, 10, 6)}`);
    set && set(1, "active");
    const p = await readProvider();
    const block = await p.getBlockNumber();
    set && set(1, "done", `Sepolia (${CHAIN.id}) · head block #${block}`);
    set && set(2, "active");
    const c = new ethers.Contract(ADDRESS, ABI, p);
    const [isValid, studentId, degree] = await c.verifyCredential(id);
    set && set(2, "done", "eth_call · gas used by caller: 0");
    set && set(3, "active"); await sleep(120);
    const state = isValid ? "VALID" : (studentId ? "REVOKED" : "NOT_FOUND");
    set && set(3, state === "NOT_FOUND" ? "fail" : "done", `isValid=${isValid} · state=${state}`);
    return { id, calldata, block, isValid, studentId, degree, state, ms: Math.round(performance.now() - t0) };
  }
  function receiptHTML(r) {
    const head = { VALID: "✓ VALID · anchored on Sepolia", REVOKED: "⚠ REVOKED by an approved institution", NOT_FOUND: "✗ NOT FOUND · no record at this ID" }[r.state];
    const rows = [
      ["Method", "<code>eth_call</code> → <code>verifyCredential(bytes32)</code> (view)"],
      ["Gas paid by verifier", "0 (read-only call, no transaction)"],
      ["Contract", addrLink(ADDRESS)],
      ["Credential ID (bytes32)", chip(r.id)],
      ["Calldata", chip(r.calldata)],
      ["Read at block", `#${r.block.toLocaleString()}`],
      ["Latency", `${r.ms} ms`],
    ];
    if (r.state !== "NOT_FOUND") rows.push(["Student reference", esc(r.studentId)], ["Credential", esc(r.degree)]);
    return `<div class="receipt ${r.state}"><div class="receipt-head">${head}</div>` +
      rows.map(([k, v]) => `<div class="receipt-row"><div class="k">${k}</div><div class="v">${v}</div></div>`).join("") +
      `<div class="receipt-foot">Anyone can reproduce this result: open the contract on Etherscan → Read Contract → verifyCredential. <a class="ext" target="_blank" rel="noopener" href="${CHAIN.explorer}/address/${ADDRESS}#readContract">Open ↗</a></div></div>`;
  }
  async function verifyUI(rawId, hostId = "verifyOut") {
    const out = $(hostId); out.style.display = "block";
    out.innerHTML = `<ul class="proof-steps" id="${hostId}-steps"></ul><div id="${hostId}-rcpt"></div><div id="${hostId}-certify"></div>`;
    const set = steps($(`${hostId}-steps`), ["Encode calldata (ABI)", "Connect to Sepolia RPC", "Call the registry contract", "Decode and classify the result"]);
    try {
      const r = await lookup(rawId, set);
      $(`${hostId}-rcpt`).innerHTML = receiptHTML(r);
      if (r.state !== "NOT_FOUND" && typeof currentRole !== "undefined" && currentRole === "Recruiter") offerCertify(r.id, `${hostId}-certify`);
      return r;
    } catch (e) {
      ["0", "1", "2", "3"].forEach(i => { const li = $(`${hostId}-steps-s${i}`); if (li && li.className === "active") set(+i, "fail", esc(errMsg(e))); });
      $(`${hostId}-rcpt`).innerHTML = `<div class="receipt ERROR"><div class="receipt-head">✗ Could not complete the on-chain read</div><div class="receipt-row"><div class="k">Reason</div><div class="v">${esc(errMsg(e))}</div></div><div class="receipt-foot">This is a network or contract error, not proof that the credential is invalid. Try again in a moment.</div></div>`;
    }
  }

  /* ---------- optional paid certificate (capped fee, goes to the platform owner) ---------- */
  let _fee; // undefined = unknown, null = contract has no fee feature
  async function feeInfo() {
    if (_fee !== undefined) return _fee;
    try { const c = await readContract(); const [fee, cap] = await Promise.all([c.verificationFee(), c.MAX_FEE()]); _fee = { fee, cap }; }
    catch (e) { _fee = null; }
    return _fee;
  }
  async function renderFeeInfo(hostId) {
    const host = $(hostId); if (!host) return;
    host.innerHTML = `<p class="card-sub">Reading fee settings…</p>`;
    const f = await feeInfo();
    host.innerHTML = f
      ? `<p><strong>Checking a credential is free.</strong> If you also want a permanent on-chain proof that you checked it, you can pay a small fee of <strong>${eth(f.fee)} ETH</strong> plus network gas. The fee goes to the platform owner to keep UjuziChain running.</p>
         <p class="card-sub" style="margin-top:8px">You cannot be overcharged. The contract caps the fee at ${eth(f.cap)} ETH, even for the owner. Your wallet sends the exact fee and a maximum, so if the fee is raised after you look, the transaction fails instead of charging you more. The contract keeps no balance: the fee is forwarded to the owner in the same transaction.</p>`
      : `<p><strong>Checking a credential is free.</strong> Paid on-chain certificates switch on after the fee contract (UjuziChainV2) is deployed and its address is set in <code>js/config.js</code>.</p>`;
  }
  function offerCertify(id, hostId) {
    const host = $(hostId); if (!host) return;
    feeInfo().then(f => {
      if (!f) { host.innerHTML = `<p class="card-sub" style="margin-top:12px">On-chain certificates are not enabled on this contract yet.</p>`; return; }
      host.innerHTML = `<div class="glass-card" style="margin-top:14px;max-width:680px"><h4>Certify this check on-chain (optional)</h4>
        <p class="card-sub" style="margin:6px 0 12px">Records that your wallet checked this credential, permanently. Costs ${eth(f.fee)} ETH plus gas. Capped at ${eth(f.cap)} ETH.</p>
        <button class="btn-btrust-action" onclick="UC.certify('${esc(id)}')">Pay ${eth(f.fee)} ETH and certify</button><div id="txCertify"></div></div>`;
    });
  }
  async function certify(id) {
    const out = $("txCertify");
    try {
      const f = await feeInfo(); if (!f) throw new Error("This contract has no fee feature.");
      const s = await signer(); const w = new ethers.Contract(ADDRESS, ABI, s);
      const live = await w.verificationFee(); // read again so the fee shown is the fee charged
      let gasWei = null;
      try { const g = await w.certifyVerification.estimateGas(id, live, { value: live }); const fd = await (await readProvider()).getFeeData(); gasWei = g * (fd.maxFeePerGas || fd.gasPrice || 0n); }
      catch (e) { out.innerHTML = `<div class="chain-note">The network rejected this transaction before sending: ${esc(errMsg(e))}</div>`; return; }
      const msg = `Platform fee: ${eth(live)} ETH (goes to the platform owner)\nEstimated network gas: about ${gasWei ? eth(gasWei) : "?"} ETH\nMost the contract can ever charge you: ${eth(f.cap)} ETH\n\nContinue?`;
      if (!confirm(msg)) return;
      const rc = await runTx("txCertify", `certifyVerification(${short(id, 10, 6)})`, () => w.certifyVerification(id, live, { value: live }));
      if (rc && rc.status === 1) {
        const all = JSON.parse(localStorage.getItem("ujuzi_certifications") || "[]");
        all.unshift({ id, tx: rc.hash, block: rc.blockNumber, fee: live.toString(), verifier: sess(), at: new Date().toISOString() });
        localStorage.setItem("ujuzi_certifications", JSON.stringify(all));
      }
    } catch (e) { out.innerHTML = `<div class="chain-note">${esc(rejected(e) ? "You rejected the request in your wallet." : errMsg(e))}</div>`; }
  }

  /* ---------- document viewer proof ---------- */
  async function viewerProof(regId, docHash, wallet) {
    const host = $("ivProof"); if (!host) return;
    host.innerHTML = `<ul class="proof-steps" id="ivProofList"></ul><div id="ivSeal" style="margin-top:8px"></div>`;
    const set = steps($("ivProofList"), ["Document digest (SHA-256)", "Derive registry key", "Query registry (eth_call)", "Compare with issuer record"]);
    const seal = (cls, t) => { $("ivSeal").innerHTML = `<span class="seal ${cls}">${t}</span>`; };
    try {
      set(0, "active"); await sleep(250); set(0, "done", esc(short(docHash, 18, 8)));
      set(1, "active");
      const ids = []; const w = wallet || (typeof currentWallet !== "undefined" ? currentWallet : null);
      if (w && /^0x[0-9a-fA-F]{40,}$/.test(docHash || "")) ids.push(derivedId(w, docHash));
      if (regId) ids.push(regId);
      if (!ids.length) { set(1, "fail", "no registry key can be derived for this document"); seal("warn", "[ Not anchored on-chain ]"); return; }
      await sleep(200); set(1, "done", ids.map(i => esc(short(bytes32(i), 10, 6))).join(" · "));
      set(2, "active"); let hit = null, last = null;
      for (const i of ids) { last = await lookup(i); if (last.state !== "NOT_FOUND") { hit = last; break; } }
      set(2, "done", `head block #${(hit || last).block.toLocaleString()}`);
      set(3, "active"); await sleep(200);
      if (hit && hit.state === "VALID") { set(3, "done", `issuer record: ${esc(hit.degree)}`); seal("", "[ Seal verified on-chain ]"); }
      else if (hit) { set(3, "fail", "record exists but is revoked"); seal("warn", "[ Revoked ]"); }
      else { set(3, "fail", "no record at these IDs on Sepolia"); seal("bad", "[ Not anchored on-chain ]"); }
    } catch (e) { set(2, "fail", esc(errMsg(e))); seal("warn", "[ Could not reach chain ]"); }
  }

  /* ---------- write transactions ---------- */
  async function runTx(trackerId, title, send) {
    const host = $(trackerId); host.innerHTML = `<div style="font-size:13px;font-weight:600;margin-top:10px">${esc(title)}</div><ul class="proof-steps" id="${trackerId}-l"></ul>`;
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

  /* ---------- institution and admin ---------- */
  async function institutionStatus(wallet) {
    try {
      const c = await readContract();
      const [adm, ok] = await Promise.all([c.admin(), c.approvedInstitutions(wallet)]);
      return { isAdmin: adm.toLowerCase() === wallet.toLowerCase(), approved: ok, admin: adm };
    } catch (e) { return null; }
  }
  async function renderInstitutionStatus(hostId, wallet) {
    const host = $(hostId); if (!host) return null;
    host.innerHTML = `<span class="rb">Checking registry…</span>`;
    const s = await institutionStatus(wallet);
    if (!s) { host.innerHTML = `<span class="rb">Could not read the registry</span>`; return null; }
    host.innerHTML = `<span class="rb ${s.approved ? "on" : ""}">${s.approved ? "✓" : "✗"} Approved institution</span><span class="rb ${s.isAdmin ? "on" : ""}">${s.isAdmin ? "✓" : "✗"} Platform owner (admin)</span>`;
    return s;
  }
  async function issuerInit() {
    const w = sess() || (typeof currentWallet !== "undefined" ? currentWallet : null);
    const s = await renderInstitutionStatus("issuerRoles", w);
    const can = !s || s.approved;
    ["btnIssue", "btnRevoke"].forEach(i => { const b = $(i); if (b) b.disabled = !can; });
    const h = $("roleHint"); if (h) h.textContent = s && !s.approved ? "This wallet is not an approved institution yet. The platform owner must approve it before it can issue or revoke." : "";
    loadLedger();
  }
  async function adminInit() {
    const w = sess() || (typeof currentWallet !== "undefined" ? currentWallet : null);
    const s = await institutionStatus(w); const host = $("adminStatus"); if (!host) return;
    if (!s) { host.innerHTML = `<p class="card-sub">Could not read the registry.</p>`; return; }
    host.innerHTML = s.isAdmin ? `<span class="rb on">✓ You are the platform owner</span>` : `<span class="rb">✗ Not the platform owner. Owner: ${esc(short(s.admin, 8, 6))}</span>`;
    ["btnRegInst", "btnRemInst", "btnSetFee"].forEach(i => { const b = $(i); if (b) b.disabled = !s.isAdmin; });
    const f = await feeInfo(); const fh = $("feeState");
    if (fh) fh.innerHTML = f ? `Current fee: <strong>${eth(f.fee)} ETH</strong> · hard cap: <strong>${eth(f.cap)} ETH</strong> · paid to ${addrLink(s.admin)}` : `Fee feature not available on the current contract. Deploy UjuziChainV2 and set its address in js/config.js.`;
    try {
      const c = await readContract(); const p = await readProvider(); const head = await p.getBlockNumber();
      const logs = await c.queryFilter(c.filters.VerificationCertified(), Math.max(0, head - 9000), head);
      const total = logs.reduce((a, l) => a + l.args[3], 0n);
      const ch = $("feesCollected"); if (ch) ch.textContent = `${logs.length} certified check(s), ${eth(total)} ETH collected in the last ~9,000 blocks`;
    } catch (e) { const ch = $("feesCollected"); if (ch) ch.textContent = "Fee history unavailable on this node."; }
  }
  async function registerInstitution() {
    const a = $("instAddr").value.trim();
    if (!ethers.isAddress(a)) return ($("txReg").innerHTML = `<div class="chain-note">Enter a valid 0x… address.</div>`);
    await runTx("txReg", "registerInstitution(" + short(a, 8, 6) + ")", async () => new ethers.Contract(ADDRESS, ABI, await signer()).registerInstitution(a));
    loadLedger();
  }
  async function removeInstitution() {
    const a = $("instAddr").value.trim();
    if (!ethers.isAddress(a)) return ($("txReg").innerHTML = `<div class="chain-note">Enter a valid 0x… address.</div>`);
    await runTx("txReg", "removeInstitution(" + short(a, 8, 6) + ")", async () => new ethers.Contract(ADDRESS, ABI, await signer()).removeInstitution(a));
    loadLedger();
  }
  async function setFee() {
    const v = $("feeInput").value.trim();
    let wei; try { wei = ethers.parseEther(v || "0"); } catch (e) { return ($("txFee").innerHTML = `<div class="chain-note">Enter a number such as 0.00005.</div>`); }
    const f = await feeInfo(); if (!f) return ($("txFee").innerHTML = `<div class="chain-note">The current contract has no fee feature.</div>`);
    if (wei > f.cap) return ($("txFee").innerHTML = `<div class="chain-note">The contract will not accept more than ${eth(f.cap)} ETH.</div>`);
    const rc = await runTx("txFee", `setVerificationFee(${eth(wei)} ETH)`, async () => new ethers.Contract(ADDRESS, ABI, await signer()).setVerificationFee(wei));
    if (rc) { _fee = undefined; adminInit(); }
  }
  async function issue() {
    const ref = $("issRef").value.trim(), sid = $("issStudent").value.trim(), deg = $("issDegree").value.trim();
    if (!ref || !sid || !deg) return ($("txIssue").innerHTML = `<div class="chain-note">Fill in all three fields.</div>`);
    const id = bytes32(ref);
    const existing = await (await readContract()).credentials(id).catch(() => null);
    if (existing && existing.studentId) return ($("txIssue").innerHTML = `<div class="chain-note">A record already exists at this ID. Use a different reference. (The original contract would overwrite it; the new one rejects it.)</div>`);
    await runTx("txIssue", `issueCredential(${short(id, 10, 6)})`, async () => new ethers.Contract(ADDRESS, ABI, await signer()).issueCredential(id, sid, deg));
    loadLedger();
  }
  async function revoke() {
    const ref = $("revRef").value.trim(); if (!ref) return;
    const id = bytes32(ref);
    const ex = await (await readContract()).credentials(id).catch(() => null);
    if (ex && !ex.studentId) return ($("txRevoke").innerHTML = `<div class="chain-note">No credential exists at this ID, so there is nothing to revoke.</div>`);
    await runTx("txRevoke", `revokeCredential(${short(id, 10, 6)})`, async () => new ethers.Contract(ADDRESS, ABI, await signer()).revokeCredential(id));
    loadLedger();
  }
  function fillDemo() { $("issRef").value = "UC-2026-001"; $("issStudent").value = "STU-0001"; $("issDegree").value = "BSc Software Engineering"; }
  async function loadLedger() {
    const body = $("ledgerBody"); if (!body) return;
    body.innerHTML = `<tr><td colspan="4" style="color:var(--text-muted)">Reading events from Sepolia…</td></tr>`;
    try {
      const p = await readProvider(); const c = new ethers.Contract(ADDRESS, ABI, p);
      const head = await p.getBlockNumber(); let logs = null;
      for (const span of [50000, 9000, 2000]) {
        try {
          const from = Math.max(0, head - span);
          const parts = await Promise.all([c.queryFilter(c.filters.CredentialIssued(), from, head), c.queryFilter(c.filters.CredentialRevoked(), from, head), c.queryFilter(c.filters.InstitutionRegistered(), from, head), c.queryFilter(c.filters.VerificationCertified(), from, head)]);
          logs = parts.flat(); break;
        } catch (e) { /* RPC range limit: try a smaller window */ }
      }
      if (!logs) throw new Error("RPC rejected the log query");
      logs.sort((x, y) => y.blockNumber - x.blockNumber || y.index - x.index);
      body.innerHTML = logs.length ? logs.slice(0, 25).map(l => {
        const n = l.fragment.name;
        const cls = n === "CredentialIssued" ? "tag-issued" : n === "CredentialRevoked" ? "tag-revoked" : "tag-inst";
        const subj = n === "InstitutionRegistered" ? addrLink(l.args[0]) : `<span class="mono">${esc(short(l.args[0], 10, 6))}</span>`;
        return `<tr><td class="${cls}">${esc(n.replace("Credential", "").replace("Institution", "Inst. ").replace("VerificationCertified", "Certified"))}</td><td>${subj}</td><td>#${l.blockNumber.toLocaleString()}</td><td>${txLink(l.transactionHash)}</td></tr>`;
      }).join("") : `<tr><td colspan="4" style="color:var(--text-muted)">No registry events in the recent block window.</td></tr>`;
    } catch (e) { body.innerHTML = `<tr><td colspan="4" style="color:var(--accent-red)">${esc(errMsg(e))}. <a class="ext" target="_blank" rel="noopener" href="${CHAIN.explorer}/address/${ADDRESS}#events">View events on Etherscan ↗</a></td></tr>`; }
  }

  /* ---------- signed applications ---------- */
  async function signApplication(job, subType, wallet) {
    const msg = ["UjuziChain application", `Job: ${job.title} @ ${job.company}`, `Match: ${job.match}%`, `Route: ${subType}`, `Applicant: ${wallet}`, `Issued: ${new Date().toISOString()}`, `Nonce: ${crypto.getRandomValues(new Uint32Array(2)).join("")}`].join("\n");
    const bp = new ethers.BrowserProvider(window.ethereum); const s = await bp.getSigner();
    if ((await s.getAddress()).toLowerCase() !== wallet.toLowerCase()) throw new Error("The active MetaMask account differs from the signed-in wallet.");
    return { message: msg, signature: await s.signMessage(msg) };
  }
  function checkSignature(appId) {
    const a = applicationsList.find(x => x.id === appId); const out = $("sig-" + appId); if (!a || !out) return;
    try { const rec = ethers.verifyMessage(a.message, a.signature); const ok = rec.toLowerCase() === a.applicantAddress.toLowerCase();
      out.innerHTML = ok ? `<span style="color:var(--accent-green)">✓ ecrecover → ${esc(short(rec, 8, 6))} matches the applicant wallet</span>` : `<span style="color:var(--accent-red)">✗ signer ${esc(short(rec, 8, 6))} does NOT match the applicant wallet</span>`;
    } catch (e) { out.innerHTML = `<span style="color:var(--accent-red)">✗ invalid signature</span>`; }
  }
  function sigRow(app, canCheck) {
    if (!app.signature) return `<div class="sig-row">No wallet signature attached (unsigned application).</div>`;
    return `<div class="sig-row">✍ Signed with wallet · ${chip(app.signature)} ${canCheck ? `<button class="btn-secondary" style="padding:3px 9px;font-size:12px;min-height:30px" onclick="UC.checkSignature('${esc(app.id)}')">Verify signature</button> <span id="sig-${esc(app.id)}"></span>` : ""}</div>`;
  }

  /* ---------- institution attestation (verify-request.html) ---------- */
  async function attestOnChain(entry, hostId) {
    const id = derivedId(entry.candidateWallet, entry.docHash);
    const pseudo = "WALLET-" + ethers.keccak256(ethers.toUtf8Bytes(entry.candidateWallet.toLowerCase())).slice(2, 10);
    const rc = await runTx(hostId, "issueCredential(" + short(id, 10, 6) + ")", async () => new ethers.Contract(ADDRESS, ABI, await signer()).issueCredential(id, pseudo, "Attested document " + short(entry.docHash, 12, 4)));
    if (rc && rc.status === 1) {
      const all = JSON.parse(localStorage.getItem("ujuzi_onchain_attestations") || "[]");
      all.unshift({ id, tx: rc.hash, block: rc.blockNumber, org: entry.orgName, wallet: entry.candidateWallet, requestId: entry.id, at: new Date().toISOString() });
      localStorage.setItem("ujuzi_onchain_attestations", JSON.stringify(all));
    }
    return rc ? { id, rc } : null;
  }
  const myAttestations = () => { const w = (sess() || "").toLowerCase(); return JSON.parse(localStorage.getItem("ujuzi_onchain_attestations") || "[]").filter(a => !w || (a.wallet || "").toLowerCase() === w); };
  function renderAttestations() {
    const host = $("attestList"); if (!host) return;
    const all = myAttestations();
    host.innerHTML = all.length ? all.map(a => `<div class="list-row"><div><div style="font-size:14px;font-weight:600">${esc(a.org)}</div><div style="margin-top:6px">${chip(a.id)}</div><div style="font-size:12px;color:var(--text-muted);margin-top:6px">block #${a.block} · ${txLink(a.tx)}</div></div><button class="btn-secondary" onclick="UC.verifyAttestation('${esc(a.id)}')">Verify live</button></div>`).join("")
      : `<p class="card-sub">No institution has anchored an attestation for your wallet yet.</p>`;
  }
  function verifyAttestation(id) { switchNav("verify"); $("verifyIdField").value = id; verifyUI(id); }

  function banner() {
    const host = $("walletBanner"); if (!host || sess()) return;
    host.insertAdjacentHTML("beforebegin", `<div class="demo-banner">Demo mode: you are not signed in, so you are viewing an empty sample workspace. <a class="ext" href="login.html">Sign in with MetaMask</a> to act on-chain.</div>`);
  }
  function init() { tickStatus(); setInterval(tickStatus, 12000); banner(); initWallet(); renderAttestations(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  return { CHAIN, ADDRESS, short, esc, chip, copy, bytes32, derivedId, lookup, verifyUI, viewerProof, runTx, issuerInit, adminInit, institutionStatus, renderInstitutionStatus, registerInstitution, removeInstitution, setFee, issue, revoke, fillDemo, loadLedger, signApplication, checkSignature, sigRow, attestOnChain, renderAttestations, myAttestations, verifyAttestation, tickStatus, certify, renderFeeInfo, feeInfo, connectClick, switchAccount, signOut, eth };
})();
