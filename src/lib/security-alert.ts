import nodemailer from "nodemailer";

type SecurityAlertPayload = {
  timestamp: string;
  ip: string;
  userAgent: string;
  country?: string;
  city?: string;
  region?: string;
  referer?: string;
  origin?: string;
  host?: string;
  page?: string;
  userName?: string;
  userEmail?: string;
  plan?: string;
  adminMode?: boolean;
  message: string;
  flags: string[];
  riskLevel?: "low" | "medium" | "high";
  reason?: string;
  fingerprint: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildHtml(payload: SecurityAlertPayload) {
  const rows = [
    ["Timestamp", payload.timestamp],
    ["IP", payload.ip],
    ["User Agent", payload.userAgent],
    ["Country", payload.country || "-"],
    ["Region", payload.region || "-"],
    ["City", payload.city || "-"],
    ["Referer", payload.referer || "-"],
    ["Origin", payload.origin || "-"],
    ["Host", payload.host || "-"],
    ["Page", payload.page || "-"],
    ["User Name", payload.userName || "-"],
    ["User Email", payload.userEmail || "-"],
    ["Plan", payload.plan || "-"],
    ["Admin Mode", String(Boolean(payload.adminMode))],
    ["Risk Level", payload.riskLevel || "-"],
    ["Reason", payload.reason || "-"],
    ["Flags", payload.flags.length ? payload.flags.join(", ") : "-"],
    ["Fingerprint", payload.fingerprint],
    ["Message", payload.message],
  ];

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
      <h2>DublesMotion Security Alert</h2>
      <table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;width:100%;max-width:900px;">
        <tbody>
          ${rows
            .map(
              ([label, value]) => `
                <tr>
                  <td style="font-weight:700;background:#f5f5f5;width:220px;">${escapeHtml(
                    label
                  )}</td>
                  <td>${escapeHtml(String(value ?? "-"))}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

export async function sendSecurityAlertEmail(payload: SecurityAlertPayload) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.ALERT_FROM_EMAIL;
  const to = process.env.ADMIN_ALERT_EMAIL;

  if (!host || !user || !pass || !from || !to) {
    console.warn("Security alert email skipped: SMTP env vars are missing.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  await transporter.sendMail({
    from,
    to,
    subject: `[SECURITY ALERT] ${payload.riskLevel?.toUpperCase() || "UNKNOWN"} risk from ${payload.ip}`,
    text: `
DublesMotion Security Alert

Timestamp: ${payload.timestamp}
IP: ${payload.ip}
User Agent: ${payload.userAgent}
Country: ${payload.country || "-"}
Region: ${payload.region || "-"}
City: ${payload.city || "-"}
Referer: ${payload.referer || "-"}
Origin: ${payload.origin || "-"}
Host: ${payload.host || "-"}
Page: ${payload.page || "-"}
User Name: ${payload.userName || "-"}
User Email: ${payload.userEmail || "-"}
Plan: ${payload.plan || "-"}
Admin Mode: ${String(Boolean(payload.adminMode))}
Risk Level: ${payload.riskLevel || "-"}
Reason: ${payload.reason || "-"}
Flags: ${payload.flags.join(", ") || "-"}
Fingerprint: ${payload.fingerprint}
Message: ${payload.message}
    `.trim(),
    html: buildHtml(payload),
  });
}