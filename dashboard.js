import { auth, db } from "../firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection, doc, setDoc, getDocs, query, onSnapshot, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Redirect if not logged in
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    // Track online status
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, { email: user.email, username: user.displayName || "Admin", online: true }, { merge: true });

    window.addEventListener("beforeunload", async () => {
      await updateDoc(userRef, { online: false });
    });

    loadUsers();
    setupChat();
  }
});

// Logout
document.getElementById("logoutBtn").addEventListener("click", async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (user) {
    await updateDoc(doc(db, "users", user.uid), { online: false });
    await signOut(auth);
    window.location.href = "login.html";
  }
});

// Load Users List
async function loadUsers() {
  const usersCol = collection(db, "users");
  onSnapshot(usersCol, (snapshot) => {
    const usersList = document.getElementById("usersList");
    usersList.innerHTML = "";
    let onlineCount = 0;
    snapshot.forEach((doc) => {
      const data = doc.data();
      const li = document.createElement("li");
      li.textContent = `${data.username || data.email} - ${data.online ? "Online" : "Offline"}`;
      usersList.appendChild(li);
      if (data.online) onlineCount++;
    });
    document.getElementById("totalUsers").textContent = snapshot.size;
    document.getElementById("onlineUsers").textContent = onlineCount;
  });
}

// Chat setup
function setupChat() {
  const chatBox = document.getElementById("chatBox");
  const chatForm = document.getElementById("chatForm");
  const chatRef = collection(db, "chat");

  // Listen for new messages
  onSnapshot(chatRef, (snapshot) => {
    chatBox.innerHTML = "";
    snapshot.forEach((doc) => {
      const msg = doc.data();
      const div = document.createElement("div");
      div.className = msg.sender === "admin" ? "admin-msg" : "user-msg";
      div.textContent = `${msg.sender}: ${msg.message}`;
      chatBox.appendChild(div);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
  });

  // Send message
  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = document.getElementById("chatMessage").value;
    if (message.trim() === "") return;

    await setDoc(doc(chatRef, Date.now().toString()), {
      sender: "admin",
      message,
      timestamp: serverTimestamp()
    });
    chatForm.reset();
  });
}


import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from
"https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { trackPresence } from "./presence.js";
import "./services.js";
import "./chat.js";
import "./social.js";

onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    document.getElementById("userEmail").textContent = user.email;
    trackPresence();
  }
});

document.getElementById("logoutBtn").onclick = () => {
  signOut(auth).then(() => location.href = "login.html");
};

document.querySelectorAll("[data-tab]").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.getElementById(btn.dataset.tab).classList.add("active");
  };
});

