# PeerMeet — WebRTC Video Conferencing

## ✅ What was fixed (multi-device support)

| Problem | Fix Applied |
|---|---|
| Socket connected to `localhost` only | Auto-detects `window.location.origin` — works on any host |
| Only STUN servers (P2P blocked on different networks) | Added free TURN servers (openrelay.metered.ca) |
| Server only bound to `127.0.0.1` | Now binds to `0.0.0.0` — accessible from all network interfaces |
| `express.static("public")` broken in server/ subfolder | Fixed path using `path.join(__dirname, "../public")` |
| No health check for cloud platforms | Added `/health` endpoint |

---

## 🗂️ Project Structure

```
peermeet/
├── public/
│   ├── index.html
│   ├── app.js          ← FIXED (socket URL + TURN servers)
│   ├── style.css
│   └── img/
│       └── logo-removebg.png
├── server/
│   └── server.js       ← FIXED (CORS, trust proxy, 0.0.0.0 binding)
├── package.json        ← FIXED (engines field for Node 18+)
├── render.yaml         ← NEW (one-click Render.com deploy)
└── README.md
```

---

## 🚀 Deploy to Render.com (FREE — Recommended)

Render gives you a public HTTPS URL — required for WebRTC on mobile devices.

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/peermeet.git
git push -u origin main
```

### Step 2 — Deploy on Render
1. Go to **https://render.com** → Sign up free
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo
4. Render auto-detects `render.yaml` — click **Deploy**
5. Your app will be live at: `https://peermeet.onrender.com`

> ⚠️ Free tier spins down after 15 min of inactivity. First load takes ~30s.

---

## 🚀 Deploy to Railway.app (Alternative — Also Free)

1. Go to **https://railway.app** → Sign up with GitHub
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your repo → Railway auto-detects Node.js
4. Add environment variable: `PORT = 3000`
5. Done — get your live URL from the dashboard

---

## 💻 Run Locally

```bash
npm install
npm run dev
```
Open: `http://localhost:5173`

To test multi-device on your local network:
- Find your local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
- Other devices on same WiFi open: `http://YOUR_LOCAL_IP:5173`

---

## 🔧 How Multi-Device Now Works

```
Device A (Phone)          Render Server           Device B (Laptop)
     |                         |                        |
     |──── socket connect ────►|◄─── socket connect ────|
     |                         |                        |
     |──── join-room ─────────►|◄─── join-room ─────────|
     |                         |                        |
     |◄─── user-connected ─────|                        |
     |                         |                        |
     |──── WebRTC offer ──────►|──── WebRTC offer ─────►|
     |◄─── WebRTC answer ──────|◄─── WebRTC answer ──── |
     |                         |                        |
     |◄════════ TURN relay (if direct P2P blocked) ═════|
     |                                                   |
     |◄══════════ Direct P2P video/audio stream ════════►|
```