import "dotenv/config";

const apiKey = process.env.EMAIL_API_KEY;
if (!apiKey) {
  console.error("EMAIL_API_KEY is not set in .env");
  process.exit(1);
}

const from = "onboarding@resend.dev";
const to = "pix.tech@hotmail.com";

const response = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    from,
    to,
    subject: "Hello World",
    html: "<p>Congrats on sending your <strong>first email</strong>!</p>",
  }),
});

const text = await response.text();
console.log("Status:", response.status);
console.log("Response:", text);
process.exit(response.ok ? 0 : 1);
