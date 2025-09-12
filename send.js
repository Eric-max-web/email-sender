require("dotenv").config();
const fs = require("fs");
const nodemailer = require("nodemailer");
const path = require("path");

function normalizeKey(senderEmail) {
  if (!senderEmail) return null;
  let prefix = senderEmail.split("@")[0];
  prefix = prefix.replace(/\./g, "");
  return prefix.toUpperCase();
}

function getSmtpCredentials(senderEmail) {
  const keyPrefix = normalizeKey(senderEmail);
  const userKey = "SMTP_USER_" + keyPrefix;
  const passKey = "SMTP_PASS_" + keyPrefix;

  const user = process.env[userKey];
  const pass = process.env[passKey];

  if (!user || !pass) {
    throw new Error(
      `❌ Missing SMTP credentials for ${senderEmail} (expected ${userKey}, ${passKey})`
    );
  }

  return { user, pass };
}

async function sendMail(senderEmail, recipientEmail, subject, body) {
  const { user, pass } = getSmtpCredentials(senderEmail);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: senderEmail,
    to: recipientEmail,
    subject: subject,
    html: body,
  });
}

function baseBody(name) {
  return `Hi ${name},<br><br>
Looking to get off load boards and into better-paying freight? At Prism Distributions, we connect serious carriers like you with high-dollar, steady freight that moves fast — no hassle, no stress.<br><br>
&#9989; Dry Vans<br>&#9989; Reefers<br>&#9989; Power Only<br>&#9989; Step Decks<br>&#9989; Flatbeds<br>&#9989; Hotshots<br>&#9989; Box Trucks<br><br>
We provide dispatch that earns more, saves time, and keeps you loaded. Here's what our carriers love:<br><br>
&#128176; $8K–$10K weekly potential — based on actual carriers<br>
&#128200; Transparent low-fee dispatch — no forced loads<br>
&#128221; Full paperwork handling — you drive, we hustle<br>
&#9981; Fast Pay — no hold-ups, no stress<br><br>
If your trailer is ready, so are we. Just send over your ZIP code + equipment and we'll get your week moving now.<br><br>
Let's make this your most profitable week yet — real loads, real fast.<br><br>
&#128205; 1396 Bramlett Forest Ct, Lawrenceville, GA 30045<br>
&#128179; EIN: 93-4662639`;
}

function readCsv(file) {
  return fs
    .readFileSync(file, "utf-8")
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => line.split(","));
}

function logSent(recipient, sender, subject) {
  const logPath = path.join(__dirname, "sent_log.csv");
  const entry = `${new Date().toISOString()},${recipient},${sender},${subject}\n`;
  fs.appendFileSync(logPath, entry);
}

async function processEmails() {
  const rows = readCsv(path.join(__dirname, "emails.csv"));
  let sentCount = 0;

  for (let row of rows) {
    const [recipientEmail, recipientName, subject, assignedSender, status] = row;
    if (status.trim().toLowerCase() !== "pending") continue;

    const emailSubject = subject || `Hey ${recipientName}, ready for better freight?`;
    const emailBody = baseBody(recipientName || "Carrier");

    try {
      await sendMail(assignedSender, recipientEmail, emailSubject, emailBody);
      console.log(`✅ Sent to ${recipientEmail} via ${assignedSender}`);
      logSent(recipientEmail, assignedSender, emailSubject);
      sentCount++;
    } catch (err) {
      console.error(`❌ Failed ${recipientEmail}: ${err.message}`);
    }
  }

  console.log(`📨 Done. Sent ${sentCount} emails this run.`);
}

processEmails().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
