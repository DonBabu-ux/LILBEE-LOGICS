/*********************************
 * FIREBASE IMPORTS
 *********************************/
import { auth, db, rtdb } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import {
  doc, getDoc, setDoc, updateDoc,
  collection, addDoc, getDocs, deleteDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

import {
  ref, push, onValue
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

/*********************************
 * TAB NAVIGATION
 *********************************/
const tabs = document.querySelectorAll(".menu .tab");
const sections = document.querySelectorAll("main .tab");

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    sections.forEach(sec => {
      sec.hidden = true;
      sec.classList.remove("active");
    });

    const target = document.getElementById(tab.dataset.tab);
    if (target) {
      target.hidden = false;
      target.classList.add("active");
    }
  });
});

/*********************************
 * AUTH STATE
 *********************************/
let currentUserData = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    currentUserData = {
      uid: user.uid,
      email: user.email,
      role: "user",
      createdAt: Date.now()
    };
    await setDoc(userRef, currentUserData);
  } else {
    currentUserData = snap.data();
  }

  updateUI(currentUserData);
  setupFeed(currentUserData);
  setupServices(currentUserData.uid);
  setupChat(currentUserData);

  if (currentUserData.role === "admin") {
    document.getElementById("adminTabBtn").hidden = false;
    setupAdmin();
  }
});

/*********************************
 * UI UPDATE
 *********************************/
function updateUI(data) {
  document.getElementById("userEmail").innerText = data.email;
  document.getElementById("userRole").innerText = data.role || "user";
  document.getElementById("updateName").value = data.name || "";
  document.getElementById("updateEmail").value = data.email;
  document.getElementById("updateAvatar").value = data.avatar || "";

  if (data.avatar) {
    const avatar = document.getElementById("userAvatar");
    avatar.style.backgroundImage = `url(${data.avatar})`;
    avatar.style.backgroundSize = "cover";
  }
}

/*********************************
 * PROFILE UPDATE TOGGLE
 *********************************/
const toggleBtn = document.getElementById("toggleUpdateBtn");
const updateArea = document.getElementById("profileUpdateArea");

toggleBtn.onclick = () => {
  updateArea.hidden = !updateArea.hidden;
  toggleBtn.innerText = updateArea.hidden ? "Edit Profile" : "Cancel";
};

/*********************************
 * SAVE PROFILE
 *********************************/
document.getElementById("updateProfileBtn").onclick = async () => {
  await updateDoc(doc(db, "users", currentUserData.uid), {
    name: updateName.value,
    avatar: updateAvatar.value
  });
  alert("Profile updated");
  updateArea.hidden = true;
};

/*********************************
 * LOGOUT
 *********************************/
document.getElementById("logoutBtn").onclick = async () => {
  await signOut(auth);
  window.location.href = "login.html";
};

/*********************************
 * FEED (FIRESTORE)
 *********************************/
function setupFeed(user) {
  const publicFeed = document.getElementById("publicFeed");
  const myFeed = document.getElementById("myPostsFeed");

  async function renderFeed() {
    publicFeed.innerHTML = "";
    myFeed.innerHTML = "";

    const snap = await getDocs(collection(db, "posts"));
    snap.forEach(d => {
      const p = d.data();
      const isMine = p.uid === user.uid;

      const div = document.createElement("div");
      div.className = "feed-post glass-card";
      div.innerHTML = `
        <strong>${p.email}</strong>
        <p>${p.content}</p>
        <small>${new Date(p.timestamp).toLocaleString()}</small>
        ${isMine ? `<button onclick="deletePost('${d.id}')">Delete</button>` : ""}
      `;

      (isMine ? myFeed : publicFeed).appendChild(div);
    });
  }

  renderFeed();

  document.getElementById("postBtn").onclick = async () => {
    const content = postContent.value.trim();
    if (!content) return;

    await addDoc(collection(db, "posts"), {
      uid: user.uid,
      email: user.email,
      content,
      timestamp: Date.now()
    });

    postContent.value = "";
    renderFeed();
  };

  window.deletePost = async (id) => {
    await deleteDoc(doc(db, "posts", id));
    renderFeed();
  };
}

/*********************************
 * SERVICES (FIRESTORE)
 *********************************/
function setupServices(uid) {
  const list = document.getElementById("serviceList");

  async function render() {
    list.innerHTML = "";
    const snap = await getDocs(collection(db, "requests"));
    snap.forEach(d => {
      const r = d.data();
      if (r.uid !== uid) return;

      const div = document.createElement("div");
      div.className = "glass-card";
      div.innerHTML = `
        <strong>${r.type}</strong>
        <p>${r.desc}</p>
        <span>${r.status}</span>
      `;
      list.appendChild(div);
    });
  }

  render();

  document.getElementById("requestServiceBtn").onclick = async () => {
    await addDoc(collection(db, "requests"), {
      uid,
      type: serviceType.value,
      desc: serviceDesc.value,
      status: "pending",
      timestamp: Date.now()
    });
    serviceType.value = "";
    serviceDesc.value = "";
    render();
  };
}

/*********************************
 * CHAT (REALTIME DATABASE)
 *********************************/
function setupChat(user) {
  const chatBox = document.getElementById("chatBox");
  const chatRef = ref(rtdb, "chat");

  onValue(chatRef, snap => {
    chatBox.innerHTML = "";
    const data = snap.val() || {};
    Object.values(data).forEach(msg => {
      const div = document.createElement("div");
      div.className = msg.uid === user.uid ? "chat-message self" : "chat-message";
      div.innerHTML = `<strong>${msg.email}:</strong> ${msg.msg}`;
      chatBox.appendChild(div);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
  });

  document.getElementById("sendMessageBtn").onclick = async () => {
    const msg = chatMessage.value.trim();
    if (!msg) return;

    await push(chatRef, {
      uid: user.uid,
      email: user.email,
      msg,
      timestamp: Date.now()
    });

    chatMessage.value = "";
  };
}

/*********************************
 * ADMIN (FIRESTORE)
 *********************************/
function setupAdmin() {
  const table = document.getElementById("userTableBody");

  async function renderUsers() {
    table.innerHTML = "";
    const snap = await getDocs(collection(db, "users"));
    snap.forEach(d => {
      const u = d.data();
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${u.email}</td>
        <td>${u.role}</td>
        <td>
          <button onclick="setRole('${u.uid}','admin')">Admin</button>
          <button onclick="setRole('${u.uid}','user')">User</button>
        </td>
      `;
      table.appendChild(row);
    });
  }

  renderUsers();

  window.setRole = async (uid, role) => {
    await updateDoc(doc(db, "users", uid), { role });
    renderUsers();
  };
}
