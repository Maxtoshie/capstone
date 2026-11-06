/* UjuziChain on-chain helpers (classic script; needs the global `ethers` v6 UMD build). */
const UC = (() => {
  const CHAIN = { id: 11155111, hex: "0xaa36a7", name: "Sepolia", explorer: "https://sepolia.etherscan.io", rpc: "https://ethereum-sepolia-rpc.publicnode.com" };
  const ADDRESS = "0xA40d77d6e31F5044C7151dAd78C8bA6C3313132F";
  const ABI = [
    "function admin() view returns (address)",
    "function approvedInstitutions(address) view returns (bool)",
    "function credentials(bytes32) view returns (string studentId, string degree, bool isValid)",
    "function registerInstitution(address institution)",
    "function issueCredential(bytes32 credentialId, string studentId, string degree)",
    "function revokeCredential(bytes32 credentialId)",
    "function verifyCredential(bytes32 credentialId) view returns (bool, string, string)",
    "event InstitutionRegistered(address indexed institution)",
    "event CredentialIssued(bytes32 indexed credentialId, string studentId)",
    "event CredentialRevoked(bytes32 indexed credentialId)"
  ];
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const short = (s, a = 8, b = 6) => !s ? "" : (s.length > a + b + 3 ? s.slice(0, a) + "…" + s.slice(-b) : s);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const errMsg = e => (e && (e.reason || e.shortMessage || (e.info && e.info.error && e.info.error.message) || e.message)) || String(e);
  const rejected = e => e && (e.code === "ACTION_REJECTED" || e.code === 4001);
  const txLink = h => `<a class="ext" target="_blank" rel="noopener" href="${CHAIN.explorer}/tx/${esc(h)}">${esc(short(h, 10, 8))} ↗</a>`;
  const addrLink = a => `<a class="ext" target="_blank" rel="noopener" href="${CHAIN.explorer}/address/${esc(a)}">${esc(short(a, 8, 6))} ↗</a>`;
  const chip = t => `<span class="hash-chip"><span>${esc(short(t, 14, 10))}</span><button type="button" title="Copy" onclick="UC.copy('${esc(t)}', this)">⧉</button></span>`;

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
    return ethers.keccak256(ethers.toUtf8Bytes(raw)); // long references are hashed instead of silently truncated
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
  async function signer() {
    await ensureSepolia();
    const bp = new ethers.BrowserProvider(window.ethereum);
    return bp.getSigner();
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
    const set = (i, state, detail) => { const li = $(`${container.id}-s${i}`); if (!li) return; li.className = state; if (detail !== undefined) $(`${container.id}-d${i}`).innerHTML = detail; };
    return set;
  }

  /* ---------- read-only verification ---------- */
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
    const out = $(hostId); out.style.display = "block"; out.style.cssText += ";background:none;border:0;padding:0;color:inherit;max-width:640px";
    out.innerHTML = `<ul class="proof-steps" id="${hostId}-steps"></ul><div id="${hostId}-rcpt"></div>`;
    const set = steps($(`${hostId}-steps`), ["Encode calldata (ABI)", "Connect to Sepolia RPC", "Call the registry contract", "Decode and classify the result"]);
    try {
      const r = await lookup(rawId, set);
      $(`${hostId}-rcpt`).innerHTML = receiptHTML(r);
      return r;
    } catch (e) {
      ["0", "1", "2", "3"].forEach(i => { const li = $(`${hostId}-steps-s${i}`); if (li && li.className === "active") set(+i, "fail", esc(errMsg(e))); });
      $(`${hostId}-rcpt`).innerHTML = `<div class="receipt ERROR"><div class="receipt-head">✗ Could not complete the on-chain read</div><div class="receipt-row"><div class="k">Reason</div><div class="v">${esc(errMsg(e))}</div></div><div class="receipt-foot">This is a network or contract error, not proof that the credential is invalid. Try again in a moment.</div></div>`;
    }
  }

  /* ---------- document viewer proof ---------- */
  async function viewerProof(regId, docHash) {
    const host = $("ivProof"); if (!host) return;
    host.innerHTML = `<ul class="proof-steps" id="ivProofList"></ul><div id="ivSeal" style="margin-top:8px"></div>`;
    const set = steps($("ivProofList"), ["Document digest (SHA-256, computed in your browser)", "Derive registry key", "Query registry (eth_call)", "Compare with issuer record"]);
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

  /* ---------- write transactions ---------- */
  async function runTx(trackerId, title, send) {
    const host = $(trackerId); host.innerHTML = `<div style="font-size:12px;font-weight:600;margin-top:8px">${esc(title)}</div><ul class="proof-steps" id="${trackerId}-l"></ul>`;
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

  /* ---------- issuer console ---------- */
  let me = null;
  async function issuerInit() {
    const demo = $("issuerDemoNote");
    if (demo) demo.style.display = (typeof currentWallet !== "undefined" && sessionStorage.getItem("userAddress")) ? "none" : "block";
    loadLedger();
  }
  async function connectIssuer() {
    const out = $("issuerRoles");
    try {
      const s = await signer(); me = await s.getAddress();
      const c = new ethers.Contract(ADDRESS, ABI, await readProvider());
      const [adm, ok] = await Promise.all([c.admin(), c.approvedInstitutions(me)]);
      const isAdmin = adm.toLowerCase() === me.toLowerCase();
      $("issuerWallet").innerHTML = `Connected: ${addrLink(me)}`;
      out.innerHTML = `<span class="rb ${isAdmin ? "on" : ""}">${isAdmin ? "✓" : "✗"} Registry admin</span><span class="rb ${ok ? "on" : ""}">${ok ? "✓" : "✗"} Approved institution</span>`;
      $("btnRegInst").disabled = !isAdmin; $("btnIssue").disabled = !ok; $("btnRevoke").disabled = !ok;
      $("roleHint").textContent = isAdmin || ok ? "" : "This wallet has no write role. An admin must call registerInstitution() for it first.";
    } catch (e) { out.innerHTML = `<span class="rb">${esc(rejected(e) ? "Connection rejected" : errMsg(e))}</span>`; }
  }
  async function registerInstitution() {
    const a = $("instAddr").value.trim();
    if (!ethers.isAddress(a)) return ($("txReg").innerHTML = `<div class="chain-note">Enter a valid 0x… address.</div>`);
    await runTx("txReg", "registerInstitution(" + short(a, 8, 6) + ")", async () => new ethers.Contract(ADDRESS, ABI, await signer()).registerInstitution(a));
    loadLedger();
  }
  async function issue() {
    const ref = $("issRef").value.trim(), sid = $("issStudent").value.trim(), deg = $("issDegree").value.trim();
    if (!ref || !sid || !deg) return ($("txIssue").innerHTML = `<div class="chain-note">Fill in all three fields.</div>`);
    const id = bytes32(ref);
    const existing = await new ethers.Contract(ADDRESS, ABI, await readProvider()).credentials(id).catch(() => null);
    if (existing && existing.studentId && !confirm("A record already exists at this ID. The deployed contract has no duplicate check, so this would OVERWRITE it. Continue?")) return;
    await runTx("txIssue", `issueCredential(${short(id, 10, 6)})`, async () => new ethers.Contract(ADDRESS, ABI, await signer()).issueCredential(id, sid, deg));
    loadLedger();
  }
  async function revoke() {
    const ref = $("revRef").value.trim(); if (!ref) return;
    const id = bytes32(ref);
    const ex = await new ethers.Contract(ADDRESS, ABI, await readProvider()).credentials(id).catch(() => null);
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
          const [a, b, d] = await Promise.all([c.queryFilter(c.filters.CredentialIssued(), from, head), c.queryFilter(c.filters.CredentialRevoked(), from, head), c.queryFilter(c.filters.InstitutionRegistered(), from, head)]);
          logs = [...a, ...b, ...d]; break;
        } catch (e) { /* RPC range limit: try a smaller window */ }
      }
      if (!logs) throw new Error("RPC rejected the log query");
      logs.sort((x, y) => y.blockNumber - x.blockNumber || y.index - x.index);
      body.innerHTML = logs.length ? logs.slice(0, 25).map(l => {
        const n = l.fragment.name;
        const cls = n === "CredentialIssued" ? "tag-issued" : n === "CredentialRevoked" ? "tag-revoked" : "tag-inst";
        const subj = n === "InstitutionRegistered" ? addrLink(l.args[0]) : `<span class="mono">${esc(short(l.args[0], 10, 6))}</span>`;
        return `<tr><td class="${cls}">${esc(n.replace("Credential", "").replace("Institution", "Inst. "))}</td><td>${subj}</td><td>#${l.blockNumber.toLocaleString()}</td><td>${txLink(l.transactionHash)}</td></tr>`;
      }).join("") : `<tr><td colspan="4" style="color:var(--text-muted)">No registry events in the recent block window.</td></tr>`;
    } catch (e) { body.innerHTML = `<tr><td colspan="4" style="color:#f87171">${esc(errMsg(e))}. <a class="ext" target="_blank" rel="noopener" href="${CHAIN.explorer}/address/${ADDRESS}#events">View events on Etherscan ↗</a></td></tr>`; }
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
      out.innerHTML = ok ? `<span style="color:#34d399">✓ ecrecover → ${esc(short(rec, 8, 6))} matches the applicant wallet</span>` : `<span style="color:#f87171">✗ signer ${esc(short(rec, 8, 6))} does NOT match the applicant wallet</span>`;
    } catch (e) { out.innerHTML = `<span style="color:#f87171">✗ invalid signature</span>`; }
  }
  function sigRow(app) {
    if (!app.signature) return `<div class="sig-row">No wallet signature attached (unsigned application).</div>`;
    return `<div class="sig-row">✍ Signed with wallet · ${chip(app.signature)} <button class="btn-secondary" style="padding:3px 8px;font-size:11px" onclick="UC.checkSignature('${esc(app.id)}')">Verify signature</button> <span id="sig-${esc(app.id)}"></span></div>`;
  }

  /* ---------- institution attestation (verify-request.html) ---------- */
  async function attestOnChain(entry, hostId) {
    const id = derivedId(entry.candidateWallet, entry.docHash);
    const pseudo = "WALLET-" + ethers.keccak256(ethers.toUtf8Bytes(entry.candidateWallet.toLowerCase())).slice(2, 10);
    const rc = await runTx(hostId, "issueCredential(" + short(id, 10, 6) + ")", async () => new ethers.Contract(ADDRESS, ABI, await signer()).issueCredential(id, pseudo, "Attested document " + short(entry.docHash, 12, 4)));
    if (rc && rc.status === 1) {
      const all = JSON.parse(localStorage.getItem("ujuzi_onchain_attestations") || "[]");
      all.unshift({ id, tx: rc.hash, block: rc.blockNumber, org: entry.orgName, wallet: entry.candidateWallet, at: new Date().toISOString() });
      localStorage.setItem("ujuzi_onchain_attestations", JSON.stringify(all));
    }
    return rc ? { id, rc } : null;
  }
  function renderAttestations() {
    const host = $("attestList"); if (!host) return;
    const all = JSON.parse(localStorage.getItem("ujuzi_onchain_attestations") || "[]");
    host.innerHTML = all.length ? all.map(a => `<div class="list-row"><div><div style="font-size:12.5px;font-weight:600">${esc(a.org)}</div><div style="margin-top:4px">${chip(a.id)}</div><div style="font-size:11px;color:var(--text-muted);margin-top:4px">block #${a.block} · ${txLink(a.tx)}</div></div><button class="btn-secondary" onclick="UC.verifyAttestation('${esc(a.id)}')">Verify live</button></div>`).join("")
      : `<p style="font-size:12px;color:var(--text-muted)">No institution has anchored an attestation from this browser yet.</p>`;
  }
  function verifyAttestation(id) { switchNav("verify"); $("verifyIdField").value = id; verifyUI(id); }

  function banner() {
    const pane = document.getElementById("pane-overview") ? document.querySelector("main") : null; if (!pane || sessionStorage.getItem("userAddress")) return;
    const d = document.createElement("div"); d.className = "demo-banner";
    d.innerHTML = `Demo mode: no wallet session. You are viewing sample data. <a class="ext" href="login.html">Sign in with MetaMask</a> to act on-chain.`; pane.prepend(d);
  }
  function init() { tickStatus(); setInterval(tickStatus, 12000); banner(); renderAttestations(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  return { CHAIN, ADDRESS, short, esc, chip, copy, bytes32, derivedId, lookup, verifyUI, viewerProof, runTx, issuerInit, connectIssuer, registerInstitution, issue, revoke, fillDemo, loadLedger, signApplication, checkSignature, sigRow, attestOnChain, renderAttestations, verifyAttestation, tickStatus };
})();
