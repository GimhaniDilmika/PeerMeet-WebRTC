<div align="center">
  <img src="./public/img/logo-removebg.png" width="200" alt="PeerMeet Logo">
  <h1 style="font-size: 2.5em; margin-top: 20px;">📡 PeerMeet — WebRTC Online Meeting Platform</h1>
</div>

A real-time video conferencing application built with WebRTC, Node.js, and Socket.io. Enables peer-to-peer video, audio, and chat communication directly in the browser — across any device, any network.

---

## 🌟 Features

- 🎥 Real-time video and audio communication
- 🤝 Peer-to-peer connection using WebRTC
- 🔗 Signaling server using Socket.io
- 💬 In-meeting text chat with emoji support
- 📁 File sharing in chat (up to 5MB)
- 🖥️ Screen sharing
- 🎙️ Mute/unmute and camera toggle
- ✋ Raise hand feature
- 🎬 Local meeting recording
- 👑 Host controls (mute all, kick user, end meeting)
- 📱 Responsive design for all devices
- 🔒 Secure HTTPS connections on deployment
- 🌐 Multi-device support via TURN relay servers

---

## 🛠️ Prerequisites

- Node.js (v18 or higher)
- npm (comes with Node.js)
- Modern web browser (Chrome, Firefox, Edge, Safari)

---

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/GimhaniDilmika/PeerMeet-WebRTC.git
   cd PeerMeet-WebRTC
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   - Go to `http://localhost:5173`
   - Allow camera and microphone permissions when prompted

---

## 🧩 Project Structure

```
PeerMeet-WebRTC/
├── public/
│   ├── index.html        # Main HTML entry point
│   ├── app.js            # Frontend logic (WebRTC + Socket.io)
│   ├── style.css         # Global styles
│   └── img/
│       └── logo-removebg.png
├── server/
│   └── server.js         # Express + Socket.io signaling server
├── package.json
├── render.yaml           # Render.com deployment config
└── README.md
```

---

## ☁️ Deployment (Render.com — Free)

1. Push your code to GitHub
2. Go to **https://render.com** → Sign up free
3. Click **"New +"** → **"Web Service"**
4. Connect your GitHub repo (`PeerMeet-WebRTC`)
5. Render auto-detects `render.yaml` → click **Deploy**
6. Your app goes live at: `https://peermeet-webrtc.onrender.com`

> ⚠️ Free tier sleeps after 15 min of inactivity. First load may take ~30 seconds.

---

## 🔧 How Multi-Device Works

```
Device A (Phone)          Render Server           Device B (Laptop)
     |                         |                        |
     |──── socket connect ────►|◄─── socket connect ────|
     |──── join-room ─────────►|◄─── join-room ─────────|
     |◄─── user-connected ─────|                        |
     |──── WebRTC offer ──────►|──── WebRTC offer ─────►|
     |◄─── WebRTC answer ───── |◄─── WebRTC answer ─────|
     |◄════ TURN relay (if direct P2P blocked) ══════════|
     |◄══════════ Direct P2P video/audio stream ════════►|
```

---

## 📧 Contact

<p align="left">
  <a href="mailto:gimhanidilmika1@gmail.com">
    <img src="https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white" alt="Gmail">
  </a>
  <a href="https://github.com/GimhaniDilmika">
    <img src="https://img.shields.io/badge/GitHub-Project-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub">
  </a>
</p>

**Gimhani Dilmika**
📫 gimhanidilmika1@gmail.com
🔗 [GitHub](https://github.com/GimhaniDilmika)

---

## 🙏 Acknowledgments

- [WebRTC](https://webrtc.org/) for real-time communication technology
- [Socket.io](https://socket.io/) for WebSocket signaling
- [Open Relay Project](https://www.metered.ca/tools/openrelay/) for free TURN servers

---

***💡 If you find this project helpful, give it a ⭐ on GitHub! 😊***
