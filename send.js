require("dotenv").config();
const nodemailer = require("nodemailer");
const fs = require("fs");

// === Load Emails & Subjects ===
const emails = fs.readFileSync("emails.csv", "utf8").trim().split("\n").slice(1); 
const subjects = fs.readFileSync("subjects.txt", "utf8").trim().split("\n");

// === Extract all SMTP accounts from .env ===
function loadSmtpAccounts() {
  const accounts = [];
  for (const key in process.env) {
    if (key.startsWith("SMTP_USER_")) {
      const prefix = key.replace("SMTP_USER_", "");
      accounts.push({
        prefix,
        user: process.env[key],
        pass: process.env["SMTP_PASS_" + prefix],
      });
    }
  }
  return accounts;
}

const smtpAccounts = loadSmtpAccounts();
if (smtpAccounts.length === 0) {
  console.error("❌ No SMTP accounts found in .env!");
  process.exit(1);
}

console.log(`✅ Loaded ${smtpAccounts.length} SMTP accounts`);

// === Email Body Template ===
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

// === Function to send mail ===
async function sendMail(account, recipientEmail, subject, body) {
  const transporter = nodemailer.createTransport({
    host: "mail.inbox.lv",
    port: 587,
    secure: false,
    auth: { user: account.user, pass: account.pass },
  });

  await transporter.sendMail({
    from: account.user,
    to: recipientEmail,
    subject,
    html: body,
  });
}

// === Main Function ===
async function processEmails() {
  let sentCount = 0;
  for (let i = 0; i < emails.length; i++) {
    const [recipientEmail, recipientName] = emails[i].split(",").map(v => v.trim());
    if (!recipientEmail) continue;

    const subject = subjects[i % subjects.length] || `Hey ${recipientName || "Carrier"}, ready for better freight?`;
    const body = baseBody(recipientName || "Carrier");

    // Pick SMTP account in rotation
    const account = smtpAccounts[sentCount % smtpAccounts.length];

    try {
      await sendMail(account, recipientEmail, subject, body);
      console.log(`✅ Sent to ${recipientEmail} via ${account.user}`);
      fs.appendFileSync("sent_log.csv", `${recipientEmail},${account.user},${new Date().toISOString()}\n`);
      sentCount++;
    } catch (err) {
      console.error(`❌ Failed to send to ${recipientEmail}: ${err.message}`);
    }
  }
  console.log(`📨 Done. Sent ${sentCount} emails.`);
}

processEmails();
