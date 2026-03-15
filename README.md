<<<<<<< HEAD
# PeerMeet — WebRTC Video Conferencing
=======
<div align="center">
  <img src="public/img/logo-removebg.png" width="400" alt="Project Logo">
  <h1 style="font-size: 2.5em; margin-top: 20px;">
    📡 WebRTC Online Meeting Platform
  </h1>
</div>
>>>>>>> 486fb0a9f0afef97f81dbf33e0e4dcb429317d75

## ✅ What was fixed (multi-device support)

| Problem | Fix Applied |
|---|---|
| Socket connected to `localhost` only | Auto-detects `window.location.origin` — works on any host |
| Only STUN servers (P2P blocked on different networks) | Added free TURN servers (openrelay.metered.ca) |
| Server only bound to `127.0.0.1` | Now binds to `0.0.0.0` — accessible from all network interfaces |
| `express.static("public")` broken in server/ subfolder | Fixed path using `path.join(__dirname, "../public")` |
| No health check for cloud platforms | Added `/health` endpoint |

---

<<<<<<< HEAD
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
=======
## 🌟 Features

- 🎥 Real-time video and audio communication
- 🤝 Peer-to-peer connection using WebRTC
- 🔗 Signaling server using Socket.io
- 📱 Responsive design for all devices
- 🔒 Secure connections (when deployed with HTTPS)
- 📦 Simple setup and configuration

---

## 🖥️ Screenshots
<img src="https://github.com/GimhaniDilmika/PeerMeet-WebRTC/blob/e2432f8cf81215845cb03e04aef89340df047112/photo.png"> 

---

## 🛠️ Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js (v14 or higher)
- npm (usually comes with Node.js)
- Modern web browser (Chrome, Firefox, Edge, Safari)
- (Optional) SSL certificate for HTTPS (required for production)
  
---

## 🚀 Installation

Follow these steps to install and set up the project:

1. **Clone the repository**
   ```bash
   git clone https://github.com/GimhaniDilmika/PeerMeet-WebRTC.git
   cd PeerMeet-WebRTC-online-meeting-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the root directory:
   ```env
   PORT=5173
   NODE_ENV=development
   # For production, you'll need to add SSL certificate paths
   # SSL_CERT_PATH=/path/to/cert.pem
   # SSL_KEY_PATH=/path/to/key.pem
   ```

---

## � Running the Application

### Development Mode

1. **Start the server**
   ```bash
   npm run dev
   ```

2. **Open in browser**
   - Open two browser tabs/windows at `http://localhost:5173`
   - Allow camera and microphone permissions when prompted
   - Start video chatting between the two tabs

### Production Mode

For production, you'll need HTTPS (WebRTC requires secure contexts):

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start the production server**
   ```bash
   npm start
   ```

3. **Access via HTTPS**
   - Open your browser at `http://localhost:5173`
     
---

## 🧩 Project Structure

```
PeerMeet-WebRTC/
├── node_modules/ # All npm dependencies
├── public/ # Static assets
│ ├── img/ # Image resources
│ │ └── logo.png # Application logo
│ ├── index.html # Main HTML entry point
│ └── style.css # Global styles
│ └── app.js # Main frontend logic
├── server/ # Backend server
│ └── server.js # Express/Socket.io server
├── package.json # Project metadata and dependencies
├── package-lock.json # Exact dependency tree
└── README.md # Project documentation
>>>>>>> 486fb0a9f0afef97f81dbf33e0e4dcb429317d75
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

<<<<<<< HEAD
> ⚠️ Free tier spins down after 15 min of inactivity. First load takes ~30s.
=======
📬 Contact
<p align="center"> <a href="mailto:gimhanidilmika1@gmail.com"> <img src="https://img.shields.io/badge/Email-D14836?style=for-the-badge&logo=gmail&logoColor=white"/> </a> <a href="https://github.com/GimhaniDilmika"> <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white"/> </a> </p>

📫 Email: gimhanidilmika1@gmail.com


>>>>>>> 486fb0a9f0afef97f81dbf33e0e4dcb429317d75

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