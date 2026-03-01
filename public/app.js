const socket = io({
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

let localStream;
let peerConnections = {};
let roomId;
let username;
let isHost = false;
let peerUsernames = {};
let screenStream = null;
let isScreenSharing = false;

let unreadCount = 0;

// DOM Elements
const localVideo = document.getElementById("localVideo");
const micButton = document.getElementById("micButton");
const cameraButton = document.getElementById("cameraButton");
const chatbox = document.getElementById("chatbox");
const messageInput = document.getElementById("messageInput");
const chatToggle = document.getElementById("chat-toggle");
const participantsToggle = document.getElementById("participants-toggle");
const chatPanel = document.getElementById("chat");
const participantsPanel = document.querySelector(".participants-panel");
const panelCloseButtons = document.querySelectorAll(".panel-close");

const badgeEl = document.getElementById("chat-badge");
const typingIndicator = document.getElementById("typing-indicator");

const emojiButton = document.getElementById("emojiButton");
const emojiPicker = document.getElementById("emojiPicker");
const emojiGrid = document.getElementById("emojiGrid");

const iceServers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

/* Invite link helpers */
function makeInviteLink(rid) {
  const url = new URL(window.location.href);
  url.searchParams.set("room", rid);
  return url.toString();
}

async function copyInviteLink() {
  const rid = document.getElementById("room").value.trim() || roomId;
  if (!rid) return alert("Enter / Create a meeting first!");

  const link = makeInviteLink(rid);
  try {
    await navigator.clipboard.writeText(link);
    alert("Invite link copied!");
  } catch {
    prompt("Copy this link:", link);
  }
}

function createNewMeeting() {
  const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
  document.getElementById("room").value = newId;
  copyInviteLink();
}

/* UI init */
function initUI() {
  chatToggle.addEventListener("click", () => {
    chatPanel.classList.toggle("active");
    participantsPanel.classList.remove("active");
    updateActiveMenu();
    if (chatPanel.classList.contains("active")) resetUnread();
  });

  participantsToggle.addEventListener("click", () => {
    participantsPanel.classList.toggle("active");
    chatPanel.classList.remove("active");
    updateActiveMenu();
  });

  panelCloseButtons.forEach((button) => {
    button.addEventListener("click", () => {
      chatPanel.classList.remove("active");
      participantsPanel.classList.remove("active");
      updateActiveMenu();
    });
  });

  messageInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") sendMessage();
  });

  // typing
  let typingTimeout = null;
  messageInput.addEventListener("input", () => {
    if (!roomId) return;
    socket.emit("typing", true);
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => socket.emit("typing", false), 700);
  });

  // emoji picker
  buildEmojiPicker();
  emojiButton.addEventListener("click", () => emojiPicker.classList.toggle("active"));
  document.addEventListener("click", (e) => {
    if (!emojiPicker.contains(e.target) && !emojiButton.contains(e.target)) {
      emojiPicker.classList.remove("active");
    }
  });
}

function updateActiveMenu() {
  if (chatPanel.classList.contains("active")) {
    chatToggle.classList.add("active");
    participantsToggle.classList.remove("active");
  } else if (participantsPanel.classList.contains("active")) {
    participantsToggle.classList.add("active");
    chatToggle.classList.remove("active");
  } else {
    chatToggle.classList.remove("active");
    participantsToggle.classList.remove("active");
  }
}

/* Unread badge */
function updateBadge() {
  if (unreadCount > 0) {
    badgeEl.textContent = String(unreadCount);
    badgeEl.style.display = "flex";
  } else {
    badgeEl.style.display = "none";
  }
}
function resetUnread() {
  unreadCount = 0;
  updateBadge();
}
function addUnread() {
  unreadCount += 1;
  updateBadge();
}

/* Join room */
async function joinRoom() {
  roomId = document.getElementById("room").value.trim();
  if (!roomId) return alert("Please enter a Room ID!");

  if (!username) username = prompt("Enter your name:") || "Guest";

  try {
    Object.keys(peerConnections).forEach((userId) => {
      peerConnections[userId]?.close();
      delete peerConnections[userId];
      document.getElementById(`container-${userId}`)?.remove();
    });

    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;

    document.getElementById("room-display").textContent = roomId;
    document.getElementById("username-display").textContent = username;
    document.getElementById("controls").style.display = "flex";
    document.getElementById("chat").style.display = "flex";
    document.getElementById("join-section").style.display = "none";

    resetUnread();
    socket.emit("join-room", roomId, username);
  } catch (error) {
    console.error(error);
    alert("Could not access camera/microphone. Check permissions.");
  }
}

function createPeerConnection(userId) {
  const pc = new RTCPeerConnection(iceServers);

  localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

  pc.onicecandidate = (e) => {
    if (e.candidate) socket.emit("ice-candidate", e.candidate, userId);
  };

  pc.ontrack = (event) => {
    document.getElementById(`container-${userId}`)?.remove();

    const videoContainer = document.createElement("div");
    videoContainer.id = `container-${userId}`;
    videoContainer.className = "video-container";

    const v = document.createElement("video");
    v.autoplay = true;
    v.playsInline = true;

    const name = document.createElement("div");
    name.className = "username-label";
    name.textContent = peerUsernames[userId] || "User";

    videoContainer.appendChild(v);
    videoContainer.appendChild(name);
    document.getElementById("videos").appendChild(videoContainer);

    v.srcObject = event.streams[0];
  };

  peerConnections[userId] = pc;
  updateParticipantsList();
  return pc;
}

/* Controls */
function toggleMic() {
  const t = localStream.getAudioTracks()[0];
  if (!t) return;
  t.enabled = !t.enabled;

  const icon = micButton.querySelector("i");
  icon.className = t.enabled ? "fas fa-microphone" : "fas fa-microphone-slash";
  micButton.classList.toggle("muted", !t.enabled);
}

function toggleCamera() {
  const t = localStream.getVideoTracks()[0];
  if (!t) return;
  t.enabled = !t.enabled;

  const icon = cameraButton.querySelector("i");
  icon.className = t.enabled ? "fas fa-video" : "fas fa-video-slash";
  cameraButton.classList.toggle("muted", !t.enabled);
}

async function toggleScreenShare() {
  try {
    if (!isScreenSharing) {
      screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const videoTrack = screenStream.getVideoTracks()[0];

      Object.values(peerConnections).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(videoTrack);
      });

      localVideo.srcObject = screenStream;
      document.getElementById("screenShareButton").classList.add("active");
      isScreenSharing = true;

      videoTrack.onended = () => stopScreenSharing();
    } else {
      stopScreenSharing();
    }
  } catch (e) {
    alert("Screen share failed: " + e.message);
  }
}

function stopScreenSharing() {
  if (screenStream) screenStream.getTracks().forEach((t) => t.stop());
  screenStream = null;

  const videoTrack = localStream.getVideoTracks()[0];
  Object.values(peerConnections).forEach((pc) => {
    const sender = pc.getSenders().find((s) => s.track?.kind === "video");
    if (sender) sender.replaceTrack(videoTrack);
  });

  localVideo.srcObject = localStream;
  document.getElementById("screenShareButton").classList.remove("active");
  isScreenSharing = false;
}

function endCall() {
  Object.values(peerConnections).forEach((pc) => pc.close());
  peerConnections = {};

  localStream?.getTracks().forEach((t) => t.stop());
  screenStream?.getTracks().forEach((t) => t.stop());

  socket.emit("leave-room");
  window.location.reload();
}

/* Chat + emoji + reactions */
const EMOJIS = [
  "😀","😁","😂","🤣","😊","😍","😘","😎",
  "🙂","😉","😅","😆","😭","😡","😮","😴",
  "👍","👎","👏","🙏","🔥","💯","❤️","🎵",
  "🎸","🎤","🥁","🎧","🎶","✨","⭐","✅"
];

function buildEmojiPicker() {
  emojiGrid.innerHTML = "";
  EMOJIS.forEach((e) => {
    const item = document.createElement("div");
    item.className = "emoji-item";
    item.textContent = e;
    item.onclick = () => {
      messageInput.value += e;
      messageInput.focus();
    };
    emojiGrid.appendChild(item);
  });
}

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random();
  socket.emit("send-message", { id, text });

  displayMessage({
    id,
    user: username + (isHost ? " (Host)" : ""),
    text,
    senderId: socket.id
  });

  messageInput.value = "";
}

function displayMessage(data) {
  const msg = document.createElement("div");
  msg.className = "message";
  msg.dataset.msgid = data.id;

  msg.classList.add(data.senderId === socket.id ? "my-message" : "receiver-message");

  const sender = document.createElement("div");
  sender.className = "sender-name";
  sender.textContent = data.user;

  const body = document.createElement("div");
  body.className = "message-text";
  body.textContent = data.text;

  const time = document.createElement("div");
  time.className = "message-time";
  time.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const reactions = document.createElement("div");
  reactions.className = "reactions";

  ["👍","❤️","😂","😮","😢"].forEach((emo) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "react-btn";
    btn.innerHTML = `<span>${emo}</span> <span class="react-count" data-emo="${emo}">0</span>`;
    btn.onclick = () => socket.emit("reaction", { messageId: data.id, emoji: emo });
    reactions.appendChild(btn);
  });

  msg.appendChild(sender);
  msg.appendChild(body);
  msg.appendChild(time);
  msg.appendChild(reactions);

  chatbox.appendChild(msg);
  chatbox.scrollTop = chatbox.scrollHeight;
}

function applyReactionUpdate({ messageId, emoji, count }) {
  const el = document.querySelector(`.message[data-msgid="${messageId}"] .react-count[data-emo="${emoji}"]`);
  if (el) el.textContent = String(count);
}

/* Participants */
function updateParticipantsList() {
  const list = document.getElementById("participants-list");
  list.innerHTML = "";

  const localItem = document.createElement("div");
  localItem.className = "participant-item";
  localItem.innerHTML = `
    <div class="participant-avatar"><i class="fas fa-user"></i></div>
    <div class="participant-info">
      <div class="participant-name">${username || "Guest"} (You)</div>
      <div class="participant-role">${isHost ? "Host" : "Participant"}</div>
    </div>
  `;
  list.appendChild(localItem);

  Object.keys(peerConnections).forEach((id) => {
    if (!peerConnections[id]) return;
    const item = document.createElement("div");
    item.className = "participant-item";
    item.innerHTML = `
      <div class="participant-avatar"><i class="fas fa-user"></i></div>
      <div class="participant-info">
        <div class="participant-name">${peerUsernames[id] || "User"}</div>
        <div class="participant-role">Participant</div>
      </div>
    `;
    list.appendChild(item);
  });

  document.getElementById("participant-count").textContent = Object.keys(peerConnections).length + 1;
}

/* Socket handlers */
socket.on("user-connected", async (userId, userName) => {
  peerUsernames[userId] = userName;
  updateParticipantsList();

  const pc = createPeerConnection(userId);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit("offer", offer, userId);
});

socket.on("room-users", (users) => {
  isHost = users.length === 0;
  document.getElementById("user-role").textContent = isHost ? "Host" : "Participant";

  users.forEach((u) => {
    peerUsernames[u.id] = u.username;
    createPeerConnection(u.id);
  });
  updateParticipantsList();
});

socket.on("offer", async (offer, senderId) => {
  const pc = peerConnections[senderId] || createPeerConnection(senderId);
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit("answer", answer, senderId);
});

socket.on("answer", async (answer, senderId) => {
  const pc = peerConnections[senderId];
  if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on("ice-candidate", async (candidate, senderId) => {
  const pc = peerConnections[senderId];
  if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on("user-disconnected", (userId, userName) => {
  peerConnections[userId]?.close();
  delete peerConnections[userId];
  document.getElementById(`container-${userId}`)?.remove();

  displayMessage({
    id: "sys-" + Date.now(),
    user: "System",
    text: `${userName} has left the room`,
    senderId: "system"
  });

  updateParticipantsList();
});

socket.on("receive-message", (data) => {
  displayMessage(data);
  if (!chatPanel.classList.contains("active")) addUnread();
});

socket.on("typing", (data) => {
  if (data.senderId === socket.id) return;
  typingIndicator.textContent = data.isTyping ? `${data.user} is typing...` : "";
});

socket.on("reaction-update", (payload) => {
  applyReactionUpdate(payload);
});

/* Auto join from invite link */
document.addEventListener("DOMContentLoaded", () => {
  initUI();

  const params = new URLSearchParams(window.location.search);
  const urlRoom = params.get("room");
  if (urlRoom) {
    document.getElementById("room").value = urlRoom;
    joinRoom();
  }
});