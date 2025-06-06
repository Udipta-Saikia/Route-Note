import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyDOURdB1SE018tDRe9RxVp7PIV8oDnLbzs",
  authDomain: "map-journal-5738f.firebaseapp.com",
  projectId: "map-journal-5738f",
  storageBucket: "map-journal-5738f.appspot.com",
  messagingSenderId: "754274852438",
  appId: "1:754274852438:web:3a1d490a8b95a55544e5f7",
  measurementId: "G-VXDJVT0ZG3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUserId = null;
let map, marker, selectedPlaceName = "";
let uploadedImageUrls = [];

const nameEl = document.getElementById("profile-name");
const emailEl = document.getElementById("profile-email");
const logoutBtn = document.getElementById("logoutBtn");
const accountBtn = document.getElementById("accountBtn");

// --- Auth State ---
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUserId = user.uid;
    console.log("User photo URL:", user.photoURL);

    if (user.photoURL) {
      document.getElementById("profileAvatar").src = user.photoURL;
      document.getElementById("miniPhotoAvtar").src = user.photoURL;
    } else {
      document.getElementById("profileAvatar").src = "default-avatar.png";
      document.getElementById("miniPhotoAvtar").src = "default-avatar.png";
    }

    displayUserInfo(user);
    await fetchUserDetails(user);
    initMap();
  } else {
    window.location.href = "index.html";
  }
});

function displayUserInfo(user) {
  const { displayName } = user;
  if (accountBtn) accountBtn.textContent = `Welcome, ${displayName || "User"}`;
}

async function fetchUserDetails(user) {
  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      if (nameEl) nameEl.innerText = `${data.firstName} ${data.lastName}`;
      if (emailEl) emailEl.innerText = data.email;
    } else {
      if (nameEl) nameEl.innerText = "Unknown User";
      if (emailEl) emailEl.innerText = "";
    }
  } catch (err) {
    console.error("Error fetching user data:", err);
    if (nameEl) nameEl.innerText = "Error";
    if (emailEl) emailEl.innerText = "";
  }
}

// --- Logout ---
logoutBtn.addEventListener("click", (e) => {
  e.preventDefault();
  signOut(auth).then(() => {
    window.location.href = "index.html";
  });
});

// --- Dropdown Menu ---
document.getElementById("profileMenu").addEventListener("click", () => {
  document.getElementById("dropdownMenu").classList.toggle("active");
});

// --- Map ---
function initMap() {
  map = L.map("map").setView([20, 0], 2);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  L.Control.geocoder({ defaultMarkGeocode: false })
    .on("markgeocode", function (e) {
      const center = e.geocode.center;
      selectedPlaceName = e.geocode.name;
      map.setView(center, 10);
      if (marker) marker.remove();
      marker = L.marker(center).addTo(map);
      document.getElementById("placeInput").value = selectedPlaceName;
      document.getElementById("saveBtn").disabled = false;
    })
    .addTo(map);

  map.on("click", async function (e) {
    const { lat, lng } = e.latlng;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const data = await response.json();
      selectedPlaceName = data.display_name || `Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    } catch {
      selectedPlaceName = `Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    }

    document.getElementById("placeInput").value = selectedPlaceName;
    document.getElementById("saveBtn").disabled = false;

    if (marker) marker.remove();
    marker = L.marker([lat, lng]).addTo(map);
  });

  setTimeout(() => map.invalidateSize(), 300);
}

// --- Search Place ---
window.searchPlace = function () {
  const place = document.getElementById("placeInput").value.trim();
  if (!place) return alert("Please enter a place name");

  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`)
    .then(res => res.json())
    .then(data => {
      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        selectedPlaceName = data[0].display_name;
        map.setView([lat, lon], 10);
        if (marker) marker.remove();
        marker = L.marker([lat, lon]).addTo(map);
        document.getElementById("saveBtn").disabled = false;
      } else {
        alert("Place not found");
      }
    })
    .catch(() => alert("Error fetching location"));
};

// --- Upload Image to Cloudinary ---
async function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "journal_upload");

  try {
    const res = await fetch("https://api.cloudinary.com/v1_1/dnwb7aqh4/image/upload", {
      method: "POST",
      body: formData
    });
    const data = await res.json();
    uploadedImageUrls.push(data.secure_url);
    addPreviewImage(data.secure_url);
  } catch (err) {
    console.error("Image upload failed", err);
  }
}

// --- Show Image Preview ---
function addPreviewImage(url) {
  const container = document.getElementById("imagePreviewContainer");
  container.style.display = "flex";

  const wrapper = document.createElement("div");
  wrapper.className = "preview-wrapper";

  const img = document.createElement("img");
  img.src = url;
  img.className = "preview-img";

  const delBtn = document.createElement("button");
  delBtn.className = "delete-btn";
  delBtn.innerHTML = "&times;";
  delBtn.onclick = () => {
    wrapper.remove();
    uploadedImageUrls = uploadedImageUrls.filter((u) => u !== url);
    if (container.children.length === 0) {
      container.style.display = "none";
    }
  };

  wrapper.appendChild(img);
  wrapper.appendChild(delBtn);
  container.appendChild(wrapper);
}

// --- File Upload Input ---
document.getElementById("fileInput").addEventListener("change", async function (e) {
  const files = Array.from(e.target.files);
  if (files.length > 0) {
    await Promise.all(files.map(file => uploadImage(file)));
  }
});

// --- Drag and Drop ---
const dropZone = document.getElementById("dropZone");
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.style.backgroundColor = "#f0f0f0";
});
dropZone.addEventListener("dragleave", () => {
  dropZone.style.backgroundColor = "transparent";
});
dropZone.addEventListener("drop", async (e) => {
  e.preventDefault();
  dropZone.style.backgroundColor = "transparent";
  const files = Array.from(e.dataTransfer.files);
  if (files.length > 0) {
    await Promise.all(files.map(file => uploadImage(file)));
  }
});

// --- Save to Firestore ---
window.saveToFirebase = async function () {
  if (!marker) return alert("📍 Please mark a location on the map first.");

  const descriptionInput = document.getElementById("description");
  const imageUrlInput = document.getElementById("imageUrlInput");
  const description = descriptionInput.value.trim();
  const manualUrl = imageUrlInput.value.trim();

  if (manualUrl) {
    uploadedImageUrls.push(manualUrl);
    addPreviewImage(manualUrl);
  }

  if (!description && uploadedImageUrls.length === 0) {
    return alert("Please add either a description or image.");
  }

  try {
    await addDoc(collection(db, "users", currentUserId, "locations"), {
      placeName: selectedPlaceName || "Unknown Location",
      lat: marker.getLatLng().lat,
      lon: marker.getLatLng().lng,
      description,
      images: uploadedImageUrls,
      createdAt: new Date(),
    });

    alert("✅ Location saved successfully!");
    window.location.href = "journal.html"; // Or refresh: location.reload();
  } catch (error) {
    console.error("❌ Firestore save failed:", error);
    alert("❌ Error saving location.");
  }
};
