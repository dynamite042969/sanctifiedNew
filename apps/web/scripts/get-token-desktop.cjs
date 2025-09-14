// get-token-desktop.cjs
const { google } = require("googleapis");
const readline = require("readline");

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = "urn:ietf:wg:oauth:2.0:oob"; // out-of-band flow for desktop

const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: SCOPES,
});

console.log("Authorize this app by visiting:", authUrl);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question("Enter the code from that page: ", async (code) => {
  const { tokens } = await oAuth2Client.getToken(code);
  console.log("Your refresh token:", tokens.refresh_token);
  rl.close();
});
