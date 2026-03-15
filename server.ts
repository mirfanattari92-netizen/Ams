import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { google } from "googleapis";
import session from "express-session";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import twilio from "twilio";

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || "fees-management-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    sameSite: 'none',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Google OAuth Setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL}/auth/google/callback`
);

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

// API Routes
app.get("/api/auth/google/url", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
  res.json({ url });
});

app.get("/auth/google/callback", async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    (req.session as any).tokens = tokens;
    
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(500).send("Authentication failed");
  }
});

app.get("/api/auth/google/status", (req, res) => {
  res.json({ isAuthenticated: !!(req.session as any).tokens });
});

app.post("/api/backup/google-drive", async (req, res) => {
  const tokens = (req.session as any).tokens;
  if (!tokens) {
    return res.status(401).json({ error: "Not authenticated with Google" });
  }

  const { data, filename } = req.body;
  if (!data) {
    return res.status(400).json({ error: "No data provided" });
  }

  try {
    oauth2Client.setCredentials(tokens);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const fileMetadata = {
      name: filename || `backup_${new Date().toISOString()}.json`,
      parents: [] // Root by default
    };

    const media = {
      mimeType: 'application/json',
      body: JSON.stringify(data, null, 2)
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id'
    });

    res.json({ success: true, fileId: response.data.id });
  } catch (error) {
    console.error("Backup Error:", error);
    res.status(500).json({ error: "Backup failed" });
  }
});

// SMS Route
app.post("/api/send-sms", async (req, res) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ error: "Phone number and message are required" });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    return res.status(500).json({ error: "Twilio credentials not configured" });
  }

  try {
    const client = twilio(accountSid, authToken);
    const result = await client.messages.create({
      body: message,
      from: from,
      to: to
    });
    res.json({ success: true, messageId: result.sid });
  } catch (error: any) {
    console.error("SMS Error:", error);
    res.status(500).json({ error: error.message || "Failed to send SMS" });
  }
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
