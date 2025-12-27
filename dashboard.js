// dashboard.js
import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// --- AUTH CHECK ---
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  loadProfile(user);
  loadFeed(user);
  loadServices(user);
  loadChat(user);
  setupTabs();
});

// --- PROFILE ---
const avatarInput = document.getElementById("updateAvatar");
const avatarPreview = document.getElementById("avatarPreview");

avatarInput.addEventListener("input", () => {
  const url = avatarInput.value.trim();
  avatarPreview.style.backgroundImage = url ? `url(${url})` : "none";
});

async function loadProfile(user) {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const data = snap.data();
    document.getElementById("updateName").value = data.name || "";
    document.getElementById("updatePhone").value = data.phone || "";
    document.getElementById("updateEmail").value = data.email || user.email;
    document.getElementById("updateAvatar").value = data.avatar || "";

    if (data.avatar) avatarPreview.style.backgroundImage = `url(${data.avatar})`;
    document.getElementById("userEmail").innerText = data.email || user.email;
  } else {
    await setDoc(userRef, {
      name: "",
      phone: "",
      email: user.email,
      avatar: ""
    });
  }
}

// SAVE PROFILE
document.getElementById("updateProfileBtn").onclick = async () => {
  const user = auth.currentUser;
  if (!user) return alert("Not logged in");

  const name = document.getElementById("updateName").value.trim();
  const phone = document.getElementById("updatePhone").value.trim();
  const email = document.getElementById("updateEmail").value.trim();
  const avatar = document.getElementById("updateAvatar").value.trim();

  await updateDoc(doc(db, "users", user.uid), { name, phone, email, avatar });
  document.getElementById("userEmail").innerText = email;
  if (avatar) document.getElementById("userAvatar").style.backgroundImage = `url(${avatar})`;
  alert("Profile updated successfully!");
};

// TOGGLE PROFILE EDIT
document.getElementById("toggleUpdateBtn").onclick = () => {
  const area = document.getElementById("profileUpdateArea");
  area.hidden = !area.hidden;
  document.getElementById("toggleUpdateBtn").innerText = area.hidden ? "Edit Profile" : "Cancel";
};

// LOGOUT
document.getElementById("logoutBtn").onclick = async () => {
  await signOut(auth);
  window.location.href = "login.html";
};

// --- TABS ---
function setupTabs() {
  const tabs = document.querySelectorAll(".menu .tab");
  const tabSections = document.querySelectorAll("main .tab");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      tabSections.forEach(sec => {
        sec.classList.remove("active");
        sec.hidden = true;
      });

      const section = document.getElementById(target);
      if (section) {
        section.classList.add("active");
        section.hidden = false;
      }
    });
  });

  const feedTabs = document.querySelectorAll(".feed-tab");
  const publicFeedDiv = document.getElementById("publicFeed");
  const myPostsDiv = document.getElementById("myPostsFeed");

  feedTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      feedTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const target = tab.dataset.feed;
      publicFeedDiv.hidden = target !== "public";
      myPostsDiv.hidden = target === "public";
    });
  });
}

// --- FEED ---
async function loadFeed(user) {
  const postsCol = collection(db, "posts");
  const snap = await getDocs(postsCol);
  const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const publicFeedDiv = document.getElementById("publicFeed");
  const myPostsDiv = document.getElementById("myPostsFeed");

  function renderFeed() {
    publicFeedDiv.innerHTML = "";
    myPostsDiv.innerHTML = "";
    posts.forEach(post => {
      const div = document.createElement("div");
      div.className = `feed-post glass-card ${post.uid === user.uid ? "my-post" : ""}`;
      div.innerHTML = `
        <strong>${post.email}</strong>
        <p>${post.content}</p>
        <small>${new Date(post.timestamp).toLocaleString()}</small>
      `;
      if (post.uid === user.uid) myPostsDiv.appendChild(div);
      else publicFeedDiv.appendChild(div);
    });
  }

  renderFeed();

  document.getElementById("postBtn").onclick = async () => {
    const content = document.getElementById("postContent").value.trim();
    if (!content) return;
    const newPost = {
      uid: user.uid,
      email: user.email,
      content,
      timestamp: Date.now()
    };
    await addDoc(postsCol, newPost);
    posts.push(newPost);
    document.getElementById("postContent").value = "";
    renderFeed();
  };
}

// --- SERVICES ---
async function loadServices(user) {
  const requestsCol = collection(db, "serviceRequests");

  document.getElementById("requestServiceBtn").onclick = async () => {
    const type = document.getElementById("serviceType").value.trim();
    const desc = document.getElementById("serviceDesc").value.trim();
    const price = document.getElementById("servicePrice").value;
    if (!type || !desc || !price) return alert("Fill all service fields");

    const newReq = {
      uid: user.uid,
      email: user.email,
      type,
      desc,
      price,
      status: "pending",
      timestamp: Date.now()
    };

    await addDoc(requestsCol, newReq);
    alert("Service request submitted!");
    document.getElementById("serviceType").value = "";
    document.getElementById("serviceDesc").value = "";
    document.getElementById("servicePrice").value = "";
    loadServiceList(user);
  };

  loadServiceList(user);
}

async function loadServiceList(user) {
  const requestsCol = collection(db, "serviceRequests");
  const snap = await getDocs(requestsCol);
  const requests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const listDiv = document.getElementById("serviceList");
  listDiv.innerHTML = "";

  requests.filter(r => r.uid === user.uid).forEach(req => {
    const div = document.createElement("div");
    div.className = "glass-card";
    div.innerHTML = `
      <strong>${req.type}</strong> - ${req.price} Ksh
      <p>${req.desc}</p>
      <small>${new Date(req.timestamp).toLocaleDateString()}</small>
    `;
    listDiv.appendChild(div);
  });
}

// --- CHAT ---
async function loadChat(user) {
  const chatCol = collection(db, "chatMessages");
  const snap = await getDocs(chatCol);
  const chat = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const chatBox = document.getElementById("chatBox");

  function renderChat() {
    chatBox.innerHTML = "";
    chat.forEach(msg => {
      const div = document.createElement("div");
      div.className = `chat-message ${msg.uid === user.uid ? "self" : ""}`;
      div.innerHTML = `<strong>${msg.email}:</strong> ${msg.msg}`;
      chatBox.appendChild(div);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  renderChat();

  document.getElementById("sendMessageBtn").onclick = async () => {
    const msg = document.getElementById("chatMessage").value.trim();
    if (!msg) return;
    const newMsg = { uid: user.uid, email: user.email, msg, timestamp: Date.now() };
    await addDoc(chatCol, newMsg);
    chat.push(newMsg);
    document.getElementById("chatMessage").value = "";
    renderChat();
  };
}
