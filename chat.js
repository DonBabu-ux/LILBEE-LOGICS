import { auth } from "./firebase.js";

document.getElementById("sendMessageBtn")?.addEventListener("click", () => {
  const msg = chatMessage.value;
  if (!msg) return;

  const div = document.createElement("div");
  div.textContent = "You: " + msg;
  chatBox.appendChild(div);

  chatMessage.value = "";
});
