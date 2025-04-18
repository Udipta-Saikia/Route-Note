import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { getFirestore, getDoc, doc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDOURdB1SE018tDRe9RxVp7PIV8oDnLbzs",
  authDomain: "map-journal-5738f.firebaseapp.com",
  projectId: "map-journal-5738f",
  storageBucket: "map-journal-5738f.appspot.com", // ✅ Fixed
  messagingSenderId: "754274852438",
  appId: "1:754274852438:web:3a1d490a8b95a55544e5f7",
  measurementId: "G-VXDJVT0ZG3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

const logoutButton = document.getElementById("logout");
const trackJourneyButton = document.getElementById("trackJourney");
const previousJournalButton = document.getElementById("previousJournal");

onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        document.getElementById("loggedUserFName").innerText = data.firstName || "";
        document.getElementById("loggedUserLName").innerText = data.lastName || "";
        document.getElementById("loggedUserEmail").innerText = data.email || "";
      } else {
        console.log("User document not found.");
      }
    } catch (error) {
      console.error("Error retrieving user data:", error);
    }
  } else {
    window.location.href = "index.html";
  }
});

logoutButton?.addEventListener("click", () => {
  signOut(auth)
    .then(() => {
      window.location.href = "index.html";
    })
    .catch((error) => console.error("Error signing out:", error));
});

trackJourneyButton?.addEventListener("click", () => {
  window.location.href = "track.html";
});

previousJournalButton?.addEventListener("click", () => {
  window.location.href = "journal.html";
});
