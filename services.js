import { auth, db } from "./firebase.js";
import { addDoc, collection, query, where, getDocs, serverTimestamp }
from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

document.getElementById("requestServiceBtn")?.addEventListener("click", async () => {
  const type = serviceType.value;
  const desc = serviceDesc.value;
  const user = auth.currentUser;

  if (!type || !desc) return;

  await addDoc(collection(db, "serviceRequests"), {
    userId: user.uid,
    serviceType: type,
    description: desc,
    status: "pending",
    createdAt: serverTimestamp()
  });

  alert("Service request submitted (Pending)");
});
