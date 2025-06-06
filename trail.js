import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js";
import { getFirestore, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

// Firebase config
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

const nameEl = document.getElementById("profile-name");
const emailEl = document.getElementById("profile-email");
const logoutBtn = document.getElementById("logoutBtn");

import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js";

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUserId = user.uid;

    // Set profile images
    const profileAvatar = document.getElementById("profileAvatar");
    const miniPhotoAvtar = document.getElementById("miniPhotoAvtar");
    const photoURL = user.photoURL || "default-avatar.png";
    if (profileAvatar) profileAvatar.src = photoURL;
    if (miniPhotoAvtar) miniPhotoAvtar.src = photoURL;

    // Fetch user details
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

    // Load and render locations
    try {
      const locations = await loadLocationsForUser(user.uid);
      drawPolylineFromLocations(locations);
    } catch (err) {
      console.error("Failed to load locations:", err);
      alert("Could not load saved locations.");
    }

  } else {
    window.location.href = "index.html";
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

//map
const map = L.map("map").setView([20, 0], 2);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

function drawPolylineFromLocations(locations) {
  if (locations.length === 0) {
    alert("No locations found.");
    return;
  }

  const latlngs = locations.map(loc => [loc.lat, loc.lon]);

  locations.forEach(loc => {
    const marker = L.marker([loc.lat, loc.lon]).addTo(map);

    if (loc.images && loc.images.length > 0) {
      const imageHtml = `<img src="${loc.images[0]}" alt="preview" />`;
      marker.bindTooltip(imageHtml, {
        direction: "top",
        permanent: false,
        className: "custom-tooltip",
        opacity: 1
      });
    } else {
      marker.bindTooltip(loc.placeName || "No Image", {
        direction: "top",
        className: "custom-tooltip",
        opacity: 1
      });
    }
  });

  const polyline = L.polyline(latlngs, { color:"red" }).addTo(map);
  map.fitBounds(polyline.getBounds());
}

async function loadLocationsForUser(userId) {
  const locationsRef = collection(db, "users", userId, "locations");
  const q = query(locationsRef, orderBy("createdAt", "asc"));
  const snapshot = await getDocs(q);
  const locations = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.lat != null && data.lon != null) {
      locations.push({
        lat: data.lat,
        lon: data.lon,
        placeName: data.placeName || null,
        images: data.images || []
      });
    }
  });

  return locations;
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const locations = await loadLocationsForUser(user.uid);
      drawPolylineFromLocations(locations);
    } catch (err) {
      console.error("Failed to load locations:", err);
      alert("Could not load saved locations.");
    }
  } else {
    alert("Please log in to view your saved paths.");
  }
});
