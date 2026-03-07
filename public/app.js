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

// Recording state
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;

// Raise hand state
let handRaised = false;

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

  // emoji picker for typing message only
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

    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

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

  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", event.candidate, userId);
    }
  };

  pc.ontrack = (event) => {
    document.getElementById(`container-${userId}`)?.remove();

    const videoContainer = document.createElement("div");
    videoContainer.id = `container-${userId}`;
    videoContainer.className = "video-container";

    const video = document.createElement("video");
    video.autoplay = true;
    video.playsInline = true;

    const name = document.createElement("div");
    name.className = "username-label";
    name.textContent = peerUsernames[userId] || "User";

    videoContainer.appendChild(video);
    videoContainer.appendChild(name);
    document.getElementById("videos").appendChild(videoContainer);

    video.srcObject = event.streams[0];
  };

  peerConnections[userId] = pc;
  updateParticipantsList();
  return pc;
}

/* Controls */
function toggleMic() {
  const track = localStream.getAudioTracks()[0];
  if (!track) return;

  track.enabled = !track.enabled;

  const icon = micButton.querySelector("i");
  icon.className = track.enabled
    ? "fas fa-microphone"
    : "fas fa-microphone-slash";

  micButton.classList.toggle("muted", !track.enabled);
}

function toggleCamera() {
  const track = localStream.getVideoTracks()[0];
  if (!track) return;

  track.enabled = !track.enabled;

  const icon = cameraButton.querySelector("i");
  icon.className = track.enabled
    ? "fas fa-video"
    : "fas fa-video-slash";

  cameraButton.classList.toggle("muted", !track.enabled);
}

async function toggleScreenShare() {
  try {
    if (!isScreenSharing) {
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

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
  } catch (error) {
    alert("Screen share failed: " + error.message);
  }
}

function stopScreenSharing() {
  if (screenStream) {
    screenStream.getTracks().forEach((track) => track.stop());
  }

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
  if (isRecording) stopRecording();
  Object.values(peerConnections).forEach((pc) => pc.close());
  peerConnections = {};

  localStream?.getTracks().forEach((track) => track.stop());
  screenStream?.getTracks().forEach((track) => track.stop());

  socket.emit("leave-room");
  window.location.reload();
}

/* Chat + emoji picker only */
const EMOJIS = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😎",
  "🙂", "😉", "😅", "😆", "😭", "😡", "😮", "😴",
  "👍", "👎", "👏", "🙏", "🔥", "💯", "❤️", "🎵",
  "🎸", "🎤", "🥁", "🎧", "🎶", "✨", "⭐", "✅"
];

function buildEmojiPicker() {
  emojiGrid.innerHTML = "";

  EMOJIS.forEach((emoji) => {
    const item = document.createElement("div");
    item.className = "emoji-item";
    item.textContent = emoji;

    item.onclick = () => {
      messageInput.value += emoji;
      messageInput.focus();
    };

    emojiGrid.appendChild(item);
  });
}

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  const id = crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random();

  socket.emit("send-message", { id, text });

  displayMessage({
    id,
    user: username + (isHost ? " (Host)" : ""),
    text,
    senderId: socket.id,
  });

  messageInput.value = "";
}

function displayMessage(data) {
  const msg = document.createElement("div");
  msg.className = "message";
  msg.dataset.msgid = data.id;

  msg.classList.add(
    data.senderId === socket.id ? "my-message" : "receiver-message"
  );

  const sender = document.createElement("div");
  sender.className = "sender-name";
  sender.textContent = data.user;

  const body = document.createElement("div");
  body.className = "message-text";
  body.textContent = data.text;

  const time = document.createElement("div");
  time.className = "message-time";
  time.textContent = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  msg.appendChild(sender);
  msg.appendChild(body);
  msg.appendChild(time);

  chatbox.appendChild(msg);
  chatbox.scrollTop = chatbox.scrollHeight;
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
    const peerName = peerUsernames[id] || "User";

    const item = document.createElement("div");
    item.className = "participant-item";
    item.id = `participant-${id}`;
    item.innerHTML = `
      <div class="participant-avatar"><i class="fas fa-user"></i></div>
      <div class="participant-info">
        <div class="participant-name">${peerName}</div>
        <div class="participant-role">Participant</div>
      </div>
      ${isHost ? `<button class="kick-btn" onclick="kickUser('${id}', '${peerName}')" title="Kick"><i class="fas fa-user-slash"></i></button>` : ""}
    `;
    list.appendChild(item);
  });

  document.getElementById("participant-count").textContent =
    Object.keys(peerConnections).length + 1;
}

/* ====== RECORDING ====== */
function toggleRecording() {
  if (!isRecording) {
    startRecording();
  } else {
    stopRecording();
  }
}

function startRecording() {
  try {
    // Capture the entire video grid area if possible, otherwise just local stream
    const streamToRecord = screenStream || localStream;
    const options = { mimeType: "video/webm;codecs=vp9,opus" };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options.mimeType = "video/webm";
    }

    recordedChunks = [];
    mediaRecorder = new MediaRecorder(streamToRecord, options);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PeerMeet-${roomId}-${new Date().toISOString().slice(0,19).replace(/:/g,"-")}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      recordedChunks = [];
    };

    mediaRecorder.start(1000);
    isRecording = true;

    const btn = document.getElementById("recordButton");
    btn.classList.add("recording");
    btn.querySelector("i").className = "fas fa-stop-circle";
    btn.querySelector(".tooltip").textContent = "Stop Recording";
    document.getElementById("recording-indicator").style.display = "flex";

    displaySystemMessage("Recording started.");
  } catch (err) {
    alert("Recording failed: " + err.message);
  }
}

function stopRecording() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    isRecording = false;

    const btn = document.getElementById("recordButton");
    btn.classList.remove("recording");
    btn.querySelector("i").className = "fas fa-circle";
    btn.querySelector(".tooltip").textContent = "Record";
    document.getElementById("recording-indicator").style.display = "none";

    displaySystemMessage("Recording saved to your downloads.");
  }
}

/* ====== RAISE HAND ====== */
function raiseHand() {
  if (!roomId) return;
  handRaised = !handRaised;

  const btn = document.getElementById("raiseHandButton");
  btn.classList.toggle("hand-raised", handRaised);
  btn.querySelector(".tooltip").textContent = handRaised ? "Lower Hand" : "Raise Hand";

  if (handRaised) {
    socket.emit("raise-hand");
    displaySystemMessage("You raised your hand ✋");
  } else {
    displaySystemMessage("You lowered your hand.");
  }
}

/* ====== HOST CONTROLS ====== */
function muteAll() {
  if (!isHost) return;
  socket.emit("mute-all");
  displaySystemMessage("You muted all participants.");
}

function kickUser(userId, userName) {
  if (!isHost) return;
  if (confirm(`Kick ${userName} from the meeting?`)) {
    socket.emit("kick-user", userId);
  }
}

function endMeetingForAll() {
  if (!isHost) return;
  if (confirm("End the meeting for everyone?")) {
    socket.emit("end-meeting");
  }
}

/* ====== FILE SHARING ====== */
function sendFile(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    alert("File too large. Max size is 5MB.");
    input.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    const payload = {
      id,
      fileName: file.name,
      fileType: file.type,
      fileData: e.target.result,
    };

    socket.emit("send-file", payload);

    displayFileMessage({
      id,
      user: username + (isHost ? " (Host)" : ""),
      senderId: socket.id,
      fileName: file.name,
      fileType: file.type,
      fileData: e.target.result,
    });
  };
  reader.readAsDataURL(file);
  input.value = "";
}

function displayFileMessage(data) {
  const msg = document.createElement("div");
  msg.className = "message " + (data.senderId === socket.id ? "my-message" : "receiver-message");
  msg.dataset.msgid = data.id;

  const sender = document.createElement("div");
  sender.className = "sender-name";
  sender.textContent = data.user;

  const isImage = data.fileType && data.fileType.startsWith("image/");

  let body;
  if (isImage) {
    body = document.createElement("div");
    const img = document.createElement("img");
    img.src = data.fileData;
    img.className = "chat-image";
    img.alt = data.fileName;
    body.appendChild(img);
  } else {
    body = document.createElement("a");
    body.className = "file-attachment";
    body.href = data.fileData;
    body.download = data.fileName;
    body.innerHTML = `<i class="fas fa-file-download"></i> ${data.fileName}`;
  }

  const time = document.createElement("div");
  time.className = "message-time";
  time.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  msg.appendChild(sender);
  msg.appendChild(body);
  msg.appendChild(time);
  chatbox.appendChild(msg);
  chatbox.scrollTop = chatbox.scrollHeight;
}

/* ====== SYSTEM MESSAGE ====== */
function displaySystemMessage(text) {
  const el = document.createElement("div");
  el.className = "system-message";
  el.textContent = text;
  chatbox.appendChild(el);
  chatbox.scrollTop = chatbox.scrollHeight;
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
  document.getElementById("user-role").textContent = isHost
    ? "Host"
    : "Participant";

  // Show/hide host controls panel
  document.getElementById("host-controls").style.display = isHost ? "flex" : "none";

  users.forEach((user) => {
    peerUsernames[user.id] = user.username;
    createPeerConnection(user.id);
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
  if (pc) {
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }
});

socket.on("ice-candidate", async (candidate, senderId) => {
  const pc = peerConnections[senderId];
  if (pc) {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }
});

socket.on("user-disconnected", (userId, userName) => {
  peerConnections[userId]?.close();
  delete peerConnections[userId];
  document.getElementById(`container-${userId}`)?.remove();

  displayMessage({
    id: "sys-" + Date.now(),
    user: "System",
    text: `${userName} has left the room`,
    senderId: "system",
  });

  updateParticipantsList();
});

socket.on("receive-message", (data) => {
  displayMessage(data);

  if (!chatPanel.classList.contains("active")) {
    addUnread();
  }
});

socket.on("typing", (data) => {
  if (data.senderId === socket.id) return;
  typingIndicator.textContent = data.isTyping ? `${data.user} is typing...` : "";
});

// ✅ Raise hand notification
socket.on("user-raised-hand", ({ userId, username: uname }) => {
  displaySystemMessage(`✋ ${uname} raised their hand`);
  const participantEl = document.getElementById(`participant-${userId}`);
  if (participantEl) {
    const nameEl = participantEl.querySelector(".participant-name");
    if (nameEl && !nameEl.textContent.includes("✋")) {
      nameEl.textContent += " ✋";
    }
  }
});

// ✅ Mute requested by host
socket.on("mute-requested", () => {
  const track = localStream?.getAudioTracks()[0];
  if (track && track.enabled) {
    track.enabled = false;
    const icon = document.getElementById("micButton").querySelector("i");
    icon.className = "fas fa-microphone-slash";
    document.getElementById("micButton").classList.add("muted");
    displaySystemMessage("The host muted you.");
  }
});

// ✅ Kicked by host
socket.on("kicked", () => {
  alert("You were removed from the meeting by the host.");
  endCall();
});

// ✅ Meeting ended by host
socket.on("meeting-ended", () => {
  alert("The host ended the meeting.");
  endCall();
});

// ✅ Receive file
socket.on("receive-file", (data) => {
  displayFileMessage(data);
  if (!chatPanel.classList.contains("active")) {
    addUnread();
  }
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