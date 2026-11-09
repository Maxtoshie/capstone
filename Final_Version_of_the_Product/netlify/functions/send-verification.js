exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const payload = JSON.parse(event.body);
        const { orgName, officialEmail, candidateName, documentName, docHash, id } = payload;

        // Privacy: personal details (names, emails) are never written to logs.
        console.log(`[UjuziChain] Attestation request queued. id=${String(id).slice(0, 24)}`);
        const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

        // If an API key like RESEND_API_KEY is configured in Netlify environment variables:
        if (process.env.RESEND_API_KEY) {
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'UjuziChain Verification <verify@ujuzichain.tech>',
                    to: officialEmail,
                    subject: `Action Required: Verify Academic/Employment Record for ${String(candidateName).replace(/[\r\n]/g, " ")}`,
                    html: `
                        <h2>UjuziChain Credential Attestation Request</h2>
                        <p><strong>${esc(candidateName)}</strong> has listed <strong>${esc(orgName)}</strong> as an issuing entity.</p>
                        <p><strong>Document:</strong> ${esc(documentName)}</p>
                        <p><strong>Cryptographic SHA-256 Hash:</strong> <code>${esc(docHash)}</code></p>
                        <br/>
                        <a href="https://ujuzichain.netlify.app/verify-request.html?id=${encodeURIComponent(id)}" style="background:#000; color:#fff; padding:10px 18px; text-decoration:none; border-radius:6px; font-weight:bold;">
                            Open Verification Portal & Attest
                        </a>
                    `
                })
            });
            const resData = await response.json();
            return { statusCode: 200, body: JSON.stringify({ success: true, resData }) };
        }

        // Default response for demo environment
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: `Automated email queued for ${officialEmail}`,
                magicLink: `/verify-request.html?id=${id}`
            })
        };
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};
