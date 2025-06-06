
    import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
    import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js";
    import {
      getFirestore,
      collection,
      getDocs,
      updateDoc,
      deleteDoc,
      doc
    } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

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
    const auth = getAuth();
    const db = getFirestore();

    const journalEntriesDiv = document.getElementById("journalEntries");
    const imgModal = document.getElementById("imgModal");
    const modalImg = imgModal.querySelector("img");
    const searchInput = document.getElementById("searchInput");

    let allUsersData = [];

    document.getElementById("signOutBtn").addEventListener("click", async () => {
      try {
        await signOut(auth);
        window.location.href = "index.html";
      } catch (e) {
        alert("Failed to sign out.");
        console.error(e);
      }
    });

    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "index.html";
        return;
      }

      try {
        const usersSnapshot = await getDocs(collection(db, "users"));

        if (usersSnapshot.empty) {
          journalEntriesDiv.innerHTML = "<p>No users found.</p>";
          return;
        }

        allUsersData = [];

        for (const userDoc of usersSnapshot.docs) {
          const userId = userDoc.id;
          const userData = userDoc.data();

          const locationsRef = collection(db, "users", userId, "locations");
          const locationsSnap = await getDocs(locationsRef);

          let locationsArr = [];
          locationsSnap.forEach((docSnap) => {
            locationsArr.push({ id: docSnap.id, data: docSnap.data() });
          });

          allUsersData.push({
            userId,
            username: userData.username || "",
            email: userData.email || "",
            locations: locationsArr
          });
        }

        renderEntries(allUsersData);
      } catch (err) {
        console.error("Error loading users:", err);
        journalEntriesDiv.innerHTML = `<p style="color:red;">Error loading users: ${err.message}</p>`;
      }
    });

    function renderEntries(usersData) {
      journalEntriesDiv.innerHTML = "";
      if (usersData.length === 0) {
        journalEntriesDiv.innerHTML = "<p>No users found matching your search.</p>";
        return;
      }

      usersData.forEach(user => {
        const userContainer = document.createElement("section");
        userContainer.className = "user-container collapsed";

        const userHeader = document.createElement("h2");

        // Create user identifier text
        const userText = document.createElement("span");
        userText.textContent = user.username || user.email || user.userId;

        // Create header right container for count
        const headerRight = document.createElement("div");
        headerRight.className = "header-right";

        // Create entry count
        const entryCount = document.createElement("span");
        entryCount.className = "entry-count";
        entryCount.textContent = `(${user.locations.length} entries)`;

        // Create delete button if no entries
        let deleteUserBtn = null;
        if (user.locations.length === 0) {
          deleteUserBtn = document.createElement("button");
          deleteUserBtn.textContent = "Delete User";
          deleteUserBtn.className = "delete-btn";
          deleteUserBtn.style.display = "none"; // Initially hidden

          deleteUserBtn.onclick = async (e) => {
            e.stopPropagation(); // Prevent header click
            const userIdentifier = user.email || user.username || user.userId;
            const confirmDelete = confirm(`Are you sure you want to delete user "${userIdentifier}"? This action cannot be undone.`);
            if (!confirmDelete) return;

            try {
              await deleteDoc(doc(db, "users", user.userId));
              userContainer.remove();
              const userIndex = allUsersData.findIndex(u => u.userId === user.userId);
              if (userIndex > -1) {
                allUsersData.splice(userIndex, 1);
              }
              alert("User deleted successfully.");
            } catch (err) {
              alert("Failed to delete user: " + err.message);
              console.error(err);
            }
          };
        }

        headerRight.appendChild(entryCount);
        userHeader.appendChild(userText);
        userHeader.appendChild(headerRight);

        userContainer.appendChild(userHeader);

        // Create entries container
        const entriesContainer = document.createElement("div");
        entriesContainer.className = "user-entries";

        if (user.locations.length === 0) {
          const noEntry = document.createElement("p");
          noEntry.textContent = "No locations added by this user.";
          noEntry.className = "no-entries";

          if (deleteUserBtn) {
            noEntry.appendChild(deleteUserBtn);
          }

          entriesContainer.appendChild(noEntry);
        } else {
          user.locations.forEach(location => {
            const data = location.data;
            const docId = location.id;
            const userId = user.userId;

            const card = document.createElement("div");
            card.className = "journal-entry";

            const buttonsDiv = document.createElement("div");
            buttonsDiv.className = "entry-buttons";

            const desc = document.createElement("p");
            desc.className = "entry-description";
            desc.textContent = data.description || "No description.";

            const editBtn = document.createElement("button");
            editBtn.innerText = "Edit";
            editBtn.onclick = () => {
              const textarea = document.createElement("textarea");
              textarea.value = data.description || "";
              textarea.rows = 3;
              textarea.style.width = "100%";

              const saveBtn = document.createElement("button");
              saveBtn.innerText = "Save";
              saveBtn.onclick = async () => {
                const newDesc = textarea.value.trim();
                try {
                  await updateDoc(doc(db, "users", userId, "locations", docId), {
                    description: newDesc
                  });
                  data.description = newDesc;
                  desc.textContent = newDesc;
                  card.replaceChild(desc, textarea);
                  buttonsDiv.replaceChild(editBtn, saveBtn);
                  alert("✅ Description updated.");
                } catch (err) {
                  alert("Failed to update.");
                  console.error(err);
                }
              };

              card.replaceChild(textarea, desc);
              buttonsDiv.replaceChild(saveBtn, editBtn);
            };
            buttonsDiv.appendChild(editBtn);

            const deleteBtn = document.createElement("button");
            deleteBtn.innerText = "Delete";
            deleteBtn.className = "delete-btn";
            deleteBtn.onclick = async () => {
              const confirmDelete = confirm("Are you sure you want to delete this entry?");
              if (!confirmDelete) return;

              try {
                await deleteDoc(doc(db, "users", userId, "locations", docId));
                card.remove();
                // Update entry count
                user.locations = user.locations.filter(loc => loc.id !== docId);
                entryCount.textContent = `(${user.locations.length} entries)`;
                alert("Entry deleted.");
              } catch (err) {
                alert("Failed to delete.");
                console.error(err);
              }
            };
            buttonsDiv.appendChild(deleteBtn);

            card.appendChild(buttonsDiv);

            const header = document.createElement("div");
            header.className = "entry-header";

            const place = document.createElement("h3");
            place.textContent = data.placeName || "📍 Unknown Place";

            const date = document.createElement("p");
            let timestamp;
            if (data.timestamp?.toDate) {
              timestamp = data.timestamp.toDate();
            } else if (typeof data.timestamp === 'number') {
              timestamp = new Date(data.timestamp);
            } else {
              timestamp = new Date();
            }
            date.className = "entry-date";
            date.textContent = timestamp.toLocaleString();

            header.append(place, date);
            card.appendChild(header);

            card.appendChild(desc);

            const imageUrls = [];
            if (Array.isArray(data.imageUrls)) imageUrls.push(...data.imageUrls);
            if (typeof data.imageUrl === "string") imageUrls.push(data.imageUrl);
            if (Array.isArray(data.images)) imageUrls.push(...data.images);
            else if (typeof data.images === "string") imageUrls.push(data.images);

            if (imageUrls.length > 0) {
              const photosDiv = document.createElement("div");
              photosDiv.className = "photos";

              imageUrls.forEach((url) => {
                const img = document.createElement("img");
                img.src = url;
                img.alt = "Photo thumbnail";
                photosDiv.appendChild(img);

                img.addEventListener("click", () => {
                  modalImg.src = url;
                  imgModal.style.display = "flex";
                  imgModal.setAttribute("aria-hidden", "false");
                  imgModal.focus();
                });
              });

              card.appendChild(photosDiv);
            }

            if (data.lat && data.lon) {
              const map = document.createElement("iframe");
              map.className = "map-frame";
              map.src = `https://www.google.com/maps?q=${data.lat},${data.lon}&z=14&output=embed`;
              map.loading = "lazy";
              card.appendChild(map);
            }

            entriesContainer.appendChild(card);
          });
        }

        userContainer.appendChild(entriesContainer);

        // Add click handler to toggle entries
        userHeader.addEventListener("click", (e) => {
          // Don't toggle if clicking on buttons
          if (e.target.tagName === 'BUTTON') return;

          userContainer.classList.toggle("collapsed");

          // Show delete button for empty entries when expanded
          if (deleteUserBtn && user.locations.length === 0) {
            deleteUserBtn.style.display = userContainer.classList.contains("collapsed") ? "none" : "block";
          }
        });

        journalEntriesDiv.appendChild(userContainer);
      });
    }

    searchInput.addEventListener("input", () => {
      const val = searchInput.value.trim().toLowerCase();

      if (!val) {
        renderEntries(allUsersData);
        return;
      }

      const filtered = allUsersData.filter(user => {
        const emailMatch = user.email?.toLowerCase().includes(val);
        const usernameMatch = user.username?.toLowerCase().includes(val);
        return emailMatch || usernameMatch;
      });

      renderEntries(filtered);
    });

    imgModal.addEventListener("click", (e) => {
      if (e.target === imgModal) {
        imgModal.style.display = "none";
        imgModal.setAttribute("aria-hidden", "true");
        modalImg.src = "";
      }
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && imgModal.style.display === "flex") {
        imgModal.style.display = "none";
        imgModal.setAttribute("aria-hidden", "true");
        modalImg.src = "";
      }
    });
