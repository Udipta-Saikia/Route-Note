import {initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import {getAuth,onAuthStateChanged,} from "https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js";
import {getFirestore, collection, getDocs, deleteDoc,updateDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

// 🔥 Firebase Config 
const firebaseConfig = {
  apiKey: "AIzaSyDOURdB1SE018tDRe9RxVp7PIV8oDnLbzs",
  authDomain: "map-journal-5738f.firebaseapp.com",
  projectId: "map-journal-5738f",
  storageBucket: "map-journal-5738f.appspot.com",
  messagingSenderId: "754274852438",
  appId: "1:754274852438:web:3a1d490a8b95a55544e5f7",
  measurementId: "G-VXDJVT0ZG3",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const journalEntriesDiv = document.getElementById("journalEntries");

// 🔐 Modal Setup
const modal = document.getElementById("journalModal");
const modalContent = document.getElementById("modalContent");
const closeModal = document.getElementById("closeModalBtn"); // ✅ fixed id

closeModal.onclick = () => {
  modal.style.display = "none";
  modalContent.innerHTML = "";
};

window.onclick = (event) => {
  if (event.target === modal) {
    modal.style.display = "none";
    modalContent.innerHTML = "";
  }
};

// 🔐 Load entries for current user only
onAuthStateChanged(auth, async (user) => {
  if (!user) return (window.location.href = "index.html");

  const userId = user.uid;
  const q = query(collection(db, "users", userId, "locations"));

  try {
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      journalEntriesDiv.innerHTML =
        "<p style='text-align:center;'>No entries found.</p>";
      return;
    }

    querySnapshot.forEach((doc) => {
      const card = createEntryCard(doc, userId);
      journalEntriesDiv.appendChild(card);
    });
  } catch (err) {
    console.error("Error fetching entries:", err);
  }
});

// 📦 Create a journal card
function createEntryCard(docSnap, userId) {
  const data = docSnap.data();
  const docId = docSnap.id;

  const card = document.createElement("div");
  card.className = "journal-entry";

  // 📍 Header
  const header = document.createElement("div");
  header.className = "entry-header";

  const place = document.createElement("h3");
  place.textContent =
    data.placeName || ` (${data.lat?.toFixed(3)}, ${data.lon?.toFixed(3)})`;

  const date = document.createElement("p");
  const time =
    data.timestamp?.toDate?.() ?? new Date(data.timestamp || Date.now());
  date.className = "entry-date";
  date.textContent = time.toLocaleString();

  header.append(place, date);
  card.appendChild(header);

  // 📝 Description
  const desc = document.createElement("p");
  desc.className = "entry-description";
  desc.textContent = data.description || "No description provided.";
  card.appendChild(desc);

  // 📸 Unified Image Handling
  const urls = [];

  if (Array.isArray(data.imageUrls)) urls.push(...data.imageUrls);
  if (typeof data.imageUrl === "string") urls.push(data.imageUrl);
  if (Array.isArray(data.images)) urls.push(...data.images);
  else if (typeof data.images === "string") urls.push(data.images);

  if (urls.length > 1) {
    const slider = document.createElement("div");
    slider.className = "image-slider";

    const track = document.createElement("div");
    track.className = "image-slider-track";

    [...urls, ...urls].forEach((url) => {
      const img = document.createElement("img");
      img.src = url;
      img.alt = "Travel photo";
      img.className = "entry-image";
      img.onerror = () => {
        console.error("Image failed to load:", url);
        img.style.display = "none";
      };
      track.appendChild(img);
    });

    slider.appendChild(track);
    card.appendChild(slider);
  } else if (urls.length === 1) {
    const img = document.createElement("img");
    img.src = urls[0];
    img.alt = "Travel photo";
    img.className = "entry-image";
    img.onerror = () => {
      console.error("Failed to load image:", urls[0]);
      img.style.display = "none";
    };
    card.appendChild(img);
  }

  // ✨ Click to view full modal
  card.addEventListener("click", () => {
    const fullView = document.createElement("div");
    fullView.className = "modal-inner";

    const header = `<h2>${data.placeName || "Unknown Location"}</h2>
      <p>${new Date(
        data.timestamp?.toDate?.() || Date.now()
      ).toLocaleString()}</p>`;

    const description = `<p style="margin: 20px 0; line-height: 1.6;">${
      data.description || "No description"
    }</p>`;

    let images = "";
    if (urls.length > 0) {
      images = urls
        .map(
          (url) =>
            `<img src="${url}" alt="Photo" style="max-width: 100%; border-radius: 10px; margin: 10px 0;" />`
        )
        .join("");
    }

    const map =
      data.lat && data.lon
        ? `<iframe class="map-frame" src="https://www.google.com/maps?q=${data.lat},${data.lon}&z=14&output=embed" loading="lazy"></iframe>`
        : "";

    fullView.innerHTML = `${header}${description}${images}${map}`;

    modalContent.innerHTML = ""; // clear previous
    modalContent.appendChild(fullView);
    modal.style.display = "block";
  });

  // ✏️ Edit Description
  const editBtn = document.createElement("button");
  editBtn.innerText = "Edit";
  editBtn.setAttribute("aria-label", "Edit description");

 editBtn.onclick = (e) => {
  e.stopPropagation(); // prevent modal trigger

  const textarea = document.createElement("textarea");
  textarea.value = data.description;
  textarea.rows = 4;
  textarea.style.width = "100%";

  // 🛑 STOP MODAL WHEN CLICKING ON TEXTAREA
  textarea.onclick = (e) => {
    e.stopPropagation();
  };

  const saveBtn = document.createElement("button");
  saveBtn.innerText = "Save";
  saveBtn.setAttribute("aria-label", "Save description");

  saveBtn.onclick = async () => {
  const newDesc = textarea.value.trim();
  if (!newDesc) return alert("Description cannot be empty.");
  try {
    await updateDoc(doc(db, "users", userId, "locations", docId), {
      description: newDesc,
    });

    desc.textContent = newDesc;
    textarea.replaceWith(desc);
    saveBtn.replaceWith(editBtn);
    alert("Description updated.");

    // 🧠 If modal is open, update modalContent too
    if (modal.style.display === "block") {
      const modalDesc = modalContent.querySelector("p:nth-of-type(2)");
      if (modalDesc) {
        modalDesc.textContent = newDesc;
      }
    }

  } catch (err) {
    console.error("Error updating:", err);
    alert("Failed to update.");
  }
};


  desc.replaceWith(textarea);
  editBtn.replaceWith(saveBtn);
};


  // 🗑️ Delete Entry
  const deleteBtn = document.createElement("button");
  deleteBtn.innerText = "Delete";
  deleteBtn.setAttribute("aria-label", "Delete entry");

  deleteBtn.onclick = async (e) => {
    e.stopPropagation(); // prevent modal trigger

    const confirmed = confirm("Are you sure you want to delete this entry?");
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, "users", userId, "locations", docId));
      card.remove();
      alert("Entry deleted.");
    } catch (err) {
      console.error("Error deleting:", err);
      alert("Failed to delete.");
    }
  };

  card.append(editBtn, deleteBtn);
  return card;
}

//Scroll Shrink Navbar Script
window.onscroll = function () {
  const navbar = document.getElementById("navbar");
  if (window.scrollY > 50) {
    navbar.classList.add("shrink");
  } else {
    navbar.classList.remove("shrink");
  }
};


let currentUserId = null;

const nameEl = document.getElementById("profile-name");
const emailEl = document.getElementById("profile-email");
const logoutBtn = document.getElementById("logoutBtn");

import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUserId = user.uid;
    console.log("User photo URL:", user.photoURL); // Add this line
    if (user.photoURL) {
      document.getElementById("profileAvatar").src = user.photoURL;
    } else {
      document.getElementById("profileAvatar").src = "default-avatar.png"; // fallback
    }
  }
    else {
    window.location.href = "index.html";
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User photo URL:", user.photoURL); // Add this line
    if (user.photoURL) {
      document.getElementById("miniPhotoAvtar").src = user.photoURL;
    } else {
      document.getElementById("miniPhotoAvtar").src = "default-avatar.png"; // fallback
    }
  }
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        nameEl.innerText = `${data.firstName} ${data.lastName}`;
        emailEl.innerText = data.email;
      } else {
        nameEl.innerText = "Unknown User";
        emailEl.innerText = "";
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
      nameEl.innerText = "Error";
      emailEl.innerText = "";
    }
  } else {
    window.location.href = "index.html"; // Redirect if not logged in
  }
});

logoutBtn.addEventListener("click", (e) => {
  e.preventDefault();
  signOut(auth).then(() => {
    window.location.href = "index.html";
  });
});

document.getElementById("profileMenu").addEventListener("click", () => {
  document.getElementById("dropdownMenu").classList.toggle("active");
});

