// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import {
  getFirestore,
  setDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDOURdB1SE018tDRe9RxVp7PIV8oDnLbzs",
  authDomain: "map-journal-5738f.firebaseapp.com",
  projectId: "map-journal-5738f",
  storageBucket: "map-journal-5738f.appspot.com",
  messagingSenderId: "754274852438",
  appId: "1:754274852438:web:3a1d490a8b95a55544e5f7",
  measurementId: "G-VXDJVT0ZG3",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Optional: Persist session in local storage
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Persistence error:", err);
});

// Utility: Inline Message
function showMessage(message, divId) {
  const messageDiv = document.getElementById(divId);
  if (!messageDiv) return;
  messageDiv.style.display = "block";
  messageDiv.innerHTML = message;
  messageDiv.style.opacity = 1;
  setTimeout(() => {
    messageDiv.style.opacity = 0;
  }, 5000);
}

// Toasts + Spinners
function showCustomToast(message, redirectTo = null) {
  const toast = document.getElementById("globalMessage");
  if (!toast) return;
  toast.innerHTML = message;
  toast.className = "message-box success";
  toast.style.display = "block";
  toast.style.opacity = 1;

  setTimeout(() => {
    toast.style.opacity = 0;
    setTimeout(() => {
      toast.style.display = "none";
      if (redirectTo) {
        window.location.href = redirectTo;
      }
    }, 300);
  }, 2500);
}

function showLoadingToast(message = "Loading...") {
  const toast = document.getElementById("globalMessage");
  if (!toast) return;
  toast.innerHTML = message;
  toast.className = "message-box loading";
  toast.style.display = "block";
  toast.style.opacity = 1;
}

function hideLoadingToast() {
  const toast = document.getElementById("globalMessage");
  if (!toast) return;
  toast.style.opacity = 0;
  setTimeout(() => {
    toast.style.display = "none";
  }, 300);
}

// Admin Redirect Logic
function redirectAfterLogin(email) {
  if (email === "ssuwebapp@gmail.com") {
    showCustomToast("🎉 Welcome Admin!", "admin.html");
  } else {
    showCustomToast("✅ Login successful!", "track.html");
  }
}

// Main App Logic - wrapped inside DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  // Sign-Up Logic
  document.getElementById("submitSignUp")?.addEventListener("click", async (e) => {
    e.preventDefault();

    const email = document.getElementById("rEmail")?.value.trim();
    const password = document.getElementById("rPassword")?.value.trim();
    const fullName = document.getElementById("fName")?.value.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !password || !fullName) {
      showMessage("⚠️ Please fill all fields", "signUpMessage");
      return;
    }

    if (!emailRegex.test(email)) {
      showMessage("⚠️ Please enter a valid email address", "signUpMessage");
      return;
    }

    if (password.length < 6) {
      showMessage("⚠️ Password must be at least 6 characters", "signUpMessage");
      return;
    }

    showLoadingToast("Creating your account...");

    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      const userData = { email, fullName };
      await setDoc(doc(db, "users", user.uid), userData);

      localStorage.setItem("loggedInUserId", user.uid);

      hideLoadingToast();
      redirectAfterLogin(user.email);
    } catch (error) {
      hideLoadingToast();
      const errorMsg =
        error.code === "auth/email-already-in-use"
          ? "⚠️ Email Address Already Exists"
          : "❌ Unable to create user. Please try again.";
      showMessage(errorMsg, "signUpMessage");
      console.error("SignUp Error:", error);
    }
  });

  // Sign-In Logic
  document.getElementById("submitSignIn")?.addEventListener("click", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value.trim();

    if (!email || !password) {
      showMessage("⚠️ Email and password are required", "signInMessage");
      return;
    }

    showLoadingToast("Signing you in...");

    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      localStorage.setItem("loggedInUserId", user.uid);

      hideLoadingToast();
      redirectAfterLogin(user.email);
    } catch (error) {
      hideLoadingToast();
      let message = "❌ Login failed. Please try again.";
      if (error.code === "auth/invalid-credential") {
        message = "⚠️ Incorrect Email or Password";
      } else if (error.code === "auth/user-not-found") {
        message = "❌ Account does not exist";
      }
      showMessage(message, "signInMessage");
      console.error("SignIn Error:", error);
    }
  });

  // Google Sign-In Logic for BOTH Signup and Login Buttons
  ["googleSignUp", "googleSignIn"].forEach((id) => {
    document.getElementById(id)?.addEventListener("click", async () => {
      const provider = new GoogleAuthProvider();
      showLoadingToast("Signing in with Google...");

      try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        const userData = {
          email: user.email,
          displayName: user.displayName,
        };

        await setDoc(doc(db, "users", user.uid), userData, { merge: true });
        localStorage.setItem("loggedInUserId", user.uid);

        hideLoadingToast();
        redirectAfterLogin(user.email);
      } catch (error) {
        hideLoadingToast();
        console.error("Google sign-in error:", error);
        showCustomToast("❌ Google sign-in failed. Try again.");
      }
    });
  });
});
