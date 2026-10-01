/**
 * ==========================================================================
 * CivicConnect - Vanilla JavaScript Logic
 * ==========================================================================
 * Handles:
 * - Registration
 * - Login
 * - Complaint submission
 * - Mandatory photo evidence
 * - Photo preview
 * - Complaint storage
 * - Authority complaint display
 * - Status workflow
 * - Presentation animations
 *
 * IMPORTANT:
 * - No device location is used.
 * - No navigator.geolocation is used.
 * - No EXIF metadata is read.
 * - No GPS metadata is extracted.
 * - Uploaded photo is treated only as visual evidence.
 * ==========================================================================
 */


/* ==========================================================================
   1. DATA STORE HELPERS
   ========================================================================== */


/**
 * Retrieve registered citizen data
 */
function getUser() {
  try {
    const raw = localStorage.getItem("civicUser");
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error("Error reading civicUser:", err);
    return null;
  }
}


/**
 * Save citizen data
 */
function saveUser(user) {
  try {
    localStorage.setItem("civicUser", JSON.stringify(user));
  } catch (err) {
    console.error("Error saving civicUser:", err);
  }
}


/**
 * Retrieve active complaint.
 *
 * Complaint information is stored in:
 * civicComplaint
 *
 * Photo is stored separately in:
 * civicComplaintPhoto
 *
 * This avoids losing the complete complaint if the image is large.
 */
function getComplaint() {
  try {
    const raw = localStorage.getItem("civicComplaint");

    if (!raw) {
      return null;
    }

    const complaint = JSON.parse(raw);

    /*
     * Restore photo from separate storage.
     */
    const savedPhoto = localStorage.getItem("civicComplaintPhoto");
    const savedPhotoName = localStorage.getItem("civicComplaintPhotoName");

    if (!complaint.photo && savedPhoto) {
      complaint.photo = savedPhoto;
    }

    if (!complaint.photoName && savedPhotoName) {
      complaint.photoName = savedPhotoName;
    }

    return complaint;

  } catch (err) {
    console.error("Error reading civicComplaint:", err);
    return null;
  }
}


/**
 * Save complaint.
 *
 * Complaint data and photo are stored separately.
 */
function saveComplaint(complaint) {

  try {

    const photo = complaint.photo || null;

    const photoName =
      complaint.photoName ||
      "geotagged_evidence.jpg";


    /*
     * Create a clean complaint object without image data.
     */
    const complaintRecord = {
      ...complaint
    };

    delete complaintRecord.photo;
    delete complaintRecord.photoName;


    /*
     * Save complaint details.
     */
    localStorage.setItem(
      "civicComplaint",
      JSON.stringify(complaintRecord)
    );


    /*
     * Save actual image separately.
     */
    if (photo) {

      localStorage.setItem(
        "civicComplaintPhoto",
        photo
      );

      localStorage.setItem(
        "civicComplaintPhotoName",
        photoName
      );

    } else {

      localStorage.removeItem(
        "civicComplaintPhoto"
      );

      localStorage.removeItem(
        "civicComplaintPhotoName"
      );
    }


    return true;

  } catch (err) {

    console.error(
      "Error saving CivicConnect complaint/photo:",
      err
    );

    return false;
  }
}


/**
 * Check login state
 */
function isLoggedIn() {

  return (
    localStorage.getItem(
      "civicLoggedIn"
    ) === "true"
  );

}


/* ==========================================================================
   2. LOADER / UI HELPERS
   ========================================================================== */


/**
 * Show full-screen loader
 */
function showPageLoader(
  title = "Loading CivicConnect...",
  subtitle = "Secure Public Grievance Portal"
) {

  const loader =
    document.getElementById(
      "page-loader"
    );

  const titleEl =
    document.getElementById(
      "loader-title"
    );

  const subtitleEl =
    document.getElementById(
      "loader-subtitle"
    );


  if (titleEl && title) {
    titleEl.textContent = title;
  }


  if (subtitleEl && subtitle) {
    subtitleEl.textContent = subtitle;
  }


  if (loader) {
    loader.classList.remove(
      "loader-hidden"
    );
  }

}


/**
 * Hide loader
 */
function hidePageLoader() {

  const loader =
    document.getElementById(
      "page-loader"
    );

  if (loader) {

    loader.classList.add(
      "loader-hidden"
    );

  }

}


/**
 * Show alert message
 */
function showMessage(
  elementId,
  message,
  type = "error"
) {

  const el =
    document.getElementById(
      elementId
    );

  if (!el) return;


  el.className =
    "alert-box";


  if (type === "error") {

    el.classList.add(
      "alert-error"
    );

  }

  else if (type === "success") {

    el.classList.add(
      "alert-success"
    );

  }

  else if (type === "warning") {

    el.classList.add(
      "alert-warning"
    );

  }


  let icon = "●";


  if (type === "error") {
    icon = "⚠";
  }

  if (type === "success") {
    icon = "✓";
  }

  if (type === "warning") {
    icon = "ℹ";
  }


  el.innerHTML =
    `<span>
      <strong>${icon}</strong>
      ${message}
    </span>`;


  el.classList.remove(
    "hidden"
  );

}


/**
 * Safely update text
 */
function setText(
  id,
  text
) {

  const el =
    document.getElementById(
      id
    );

  if (el) {

    el.textContent =
      text || "—";

  }

}


/**
 * Authority toast
 */
function showAuthorityToast(message) {

  let toast =
    document.getElementById(
      "authority-toast"
    );


  if (!toast) {

    toast =
      document.createElement(
        "div"
      );

    toast.id =
      "authority-toast";

    toast.className =
      "toast-notice";

    document.body.appendChild(
      toast
    );

  }


  toast.innerHTML =
    `<span class="toast-icon">✓</span>
     <span>${message}</span>`;


  toast.classList.add(
    "toast-show"
  );


  if (window.toastTimeout) {

    clearTimeout(
      window.toastTimeout
    );

  }


  window.toastTimeout =
    setTimeout(() => {

      toast.classList.remove(
        "toast-show"
      );

    }, 3500);

}


/* ==========================================================================
   3. REGISTRATION
   ========================================================================== */


/**
 * Register citizen
 */
function registerUser(e) {

  if (e) {
    e.preventDefault();
  }


  const fullNameInput =
    document.getElementById(
      "fullName"
    );

  const mobileInput =
    document.getElementById(
      "mobile"
    );

  const aadhaarInput =
    document.getElementById(
      "aadhaar"
    );

  const emailInput =
    document.getElementById(
      "email"
    );

  const passwordInput =
    document.getElementById(
      "password"
    );

  const confirmPasswordInput =
    document.getElementById(
      "confirmPassword"
    );


  const fullName =
    fullNameInput
      ? fullNameInput.value.trim()
      : "";


  const mobile =
    mobileInput
      ? mobileInput.value.trim()
      : "";


  const aadhaar =
    aadhaarInput
      ? aadhaarInput.value
          .trim()
          .replace(/\s+/g, "")
      : "";


  const email =
    emailInput
      ? emailInput.value.trim()
      : "";


  const password =
    passwordInput
      ? passwordInput.value
      : "";


  const confirmPassword =
    confirmPasswordInput
      ? confirmPasswordInput.value
      : "";


  if (
    !fullName ||
    fullName.length < 3
  ) {

    showMessage(
      "register-alert",
      "Full Name must be at least 3 characters.",
      "error"
    );

    if (fullNameInput) {
      fullNameInput.focus();
    }

    return;
  }


  const mobileRegex =
    /^[0-9]{10}$/;


  if (!mobileRegex.test(mobile)) {

    showMessage(
      "register-alert",
      "Mobile Number must be exactly 10 digits.",
      "error"
    );

    if (mobileInput) {
      mobileInput.focus();
    }

    return;
  }


  const aadhaarRegex =
    /^[0-9]{12}$/;


  if (!aadhaarRegex.test(aadhaar)) {

    showMessage(
      "register-alert",
      "Aadhaar Number must be exactly 12 digits.",
      "error"
    );

    if (aadhaarInput) {
      aadhaarInput.focus();
    }

    return;
  }


  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


  if (!emailRegex.test(email)) {

    showMessage(
      "register-alert",
      "Please enter a valid email address.",
      "error"
    );

    if (emailInput) {
      emailInput.focus();
    }

    return;
  }


  if (
    !password ||
    password.length < 8
  ) {

    showMessage(
      "register-alert",
      "Password must be at least 8 characters.",
      "error"
    );

    if (passwordInput) {
      passwordInput.focus();
    }

    return;
  }


  if (
    password !==
    confirmPassword
  ) {

    showMessage(
      "register-alert",
      "Password and Confirm Password do not match.",
      "error"
    );

    if (confirmPasswordInput) {
      confirmPasswordInput.focus();
    }

    return;
  }


  const userData = {

    fullName,
    mobile,
    aadhaar,
    email,
    password

  };


  saveUser(
    userData
  );


  showMessage(
    "register-alert",
    "Registration successful! Preparing your portal access...",
    "success"
  );


  showPageLoader(
    "Registering Citizen...",
    "Provisioning citizen access..."
  );


  setTimeout(() => {

    window.location.href =
      "login.html";

  }, 1300);

}


/* ==========================================================================
   4. LOGIN
   ========================================================================== */


/**
 * Login citizen
 */
function loginUser(e) {

  if (e) {
    e.preventDefault();
  }


  const emailInput =
    document.getElementById(
      "login-email"
    );

  const passwordInput =
    document.getElementById(
      "login-password"
    );


  const email =
    emailInput
      ? emailInput.value.trim()
      : "";


  const password =
    passwordInput
      ? passwordInput.value
      : "";


  const registeredUser =
    getUser();


  if (!registeredUser) {

    showMessage(
      "login-alert",
      "No account found. Please register first.",
      "error"
    );

    return;
  }


  if (
    registeredUser.email.toLowerCase() !==
    email.toLowerCase()
  ) {

    showMessage(
      "login-alert",
      "Email address is not registered.",
      "error"
    );

    if (emailInput) {
      emailInput.focus();
    }

    return;
  }


  if (
    registeredUser.password !==
    password
  ) {

    showMessage(
      "login-alert",
      "Incorrect password.",
      "error"
    );

    if (passwordInput) {
      passwordInput.focus();
    }

    return;
  }


  localStorage.setItem(
    "civicLoggedIn",
    "true"
  );


  showMessage(
    "login-alert",
    "Authentication verified. Welcome to CivicConnect.",
    "success"
  );


  showPageLoader(
    "Authenticating...",
    "Verifying citizen credentials..."
  );


  setTimeout(() => {

    window.location.href =
      "complaint.html";

  }, 1000);

}


/* ==========================================================================
   5. COMPLAINT + PHOTO
   ========================================================================== */


function generateComplaintId() {

  const year =
    new Date().getFullYear();

  const randomNum =
    Math.floor(
      10000 +
      Math.random() *
      90000
    );


  return (
    `CC-${year}-${randomNum}`
  );

}


/*
 * Current uploaded photo
 */
let uploadedPhoto = null;


/*
 * Uploaded photo filename
 */
let uploadedPhotoName = null;


/**
 * Compress image.
 *
 * IMPORTANT:
 * This does NOT read EXIF metadata.
 * This does NOT read GPS.
 * This does NOT request location.
 */
function compressImage(
  file,
  callback
) {

  const reader =
    new FileReader();


  reader.onload =
    (e) => {

      const img =
        new Image();


      img.onload =
        () => {

          const maxDim =
            1000;


          let width =
            img.width;

          let height =
            img.height;


          if (
            width > maxDim ||
            height > maxDim
          ) {

            if (
              width > height
            ) {

              height =
                Math.round(
                  (
                    height *
                    maxDim
                  ) / width
                );

              width =
                maxDim;

            } else {

              width =
                Math.round(
                  (
                    width *
                    maxDim
                  ) / height
                );

              height =
                maxDim;

            }

          }


          const canvas =
            document.createElement(
              "canvas"
            );


          canvas.width =
            width;

          canvas.height =
            height;


          const ctx =
            canvas.getContext(
              "2d"
            );


          ctx.drawImage(
            img,
            0,
            0,
            width,
            height
          );


          const compressedDataUrl =
            canvas.toDataURL(
              "image/jpeg",
              0.78
            );


          callback(
            compressedDataUrl
          );

        };


      img.onerror =
        () => {

          callback(
            e.target.result
          );

        };


      img.src =
        e.target.result;

    };


  reader.readAsDataURL(
    file
  );

}


/**
 * Demo field image
 */
function createDemoCivicImage() {

  const svg = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="600"
    height="340"
    viewBox="0 0 600 340"
  >

    <defs>

      <linearGradient
        id="roadGrad"
        x1="0%"
        y1="0%"
        x2="0%"
        y2="100%"
      >

        <stop
          offset="0%"
          stop-color="#334155"
        />

        <stop
          offset="100%"
          stop-color="#1E293B"
        />

      </linearGradient>


      <radialGradient
        id="craterGrad"
        cx="50%"
        cy="50%"
        r="50%"
      >

        <stop
          offset="0%"
          stop-color="#0F172A"
        />

        <stop
          offset="70%"
          stop-color="#1E293B"
        />

        <stop
          offset="100%"
          stop-color="#475569"
        />

      </radialGradient>

    </defs>


    <rect
      width="600"
      height="340"
      fill="url(#roadGrad)"
    />


    <line
      x1="0"
      y1="170"
      x2="600"
      y2="170"
      stroke="#F8FAFC"
      stroke-width="6"
      stroke-dasharray="35 30"
      opacity="0.6"
    />


    <ellipse
      cx="290"
      cy="195"
      rx="140"
      ry="70"
      fill="url(#craterGrad)"
    />


    <ellipse
      cx="280"
      cy="200"
      rx="90"
      ry="42"
      fill="#090D16"
    />


    <path
      d="M 180 180
         Q 240 170 290 175
         Q 350 180 410 190
         Q 370 230 320 235
         Q 220 240 180 180"
      fill="#111827"
      opacity="0.8"
    />


    <path
      d="M 150 175
         L 180 190
         L 195 210

         M 410 185
         L 440 170
         L 460 180

         M 310 235
         L 325 260
         L 315 275"
      stroke="#64748B"
      stroke-width="2.5"
      fill="none"
    />


    <polygon
      points="460,250 490,250 475,175"
      fill="#EA580C"
    />


    <polygon
      points="467,215 483,215 479,195 471,195"
      fill="#FFFFFF"
    />


    <rect
      x="455"
      y="250"
      width="40"
      height="6"
      rx="2"
      fill="#C2410C"
    />


    <rect
      x="15"
      y="15"
      width="220"
      height="34"
      rx="6"
      fill="rgba(7,18,38,0.85)"
    />


    <text
      x="25"
      y="37"
      fill="#60A5FA"
      font-family="sans-serif"
      font-size="12"
      font-weight="bold"
    >
      CIVIC DEFECT FIELD PHOTO
    </text>

  </svg>
  `;


  return (
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(svg)
  );

}


/**
 * Display selected photo
 */
function displayUploadedPhoto(
  photoUrl,
  fileName = "geotagged_evidence.jpg"
) {

  const dropzone =
    document.getElementById(
      "geotag-dropzone"
    );

  const previewCard =
    document.getElementById(
      "geotag-preview-card"
    );

  const previewImg =
    document.getElementById(
      "geotag-image-preview"
    );

  const nameLabel =
    document.getElementById(
      "photo-filename-label"
    );


  if (previewImg) {

    previewImg.src =
      photoUrl;

  }


  if (nameLabel) {

    nameLabel.textContent =
      fileName;

  }


  uploadedPhoto =
    photoUrl;


  uploadedPhotoName =
    fileName;


  if (dropzone) {

    dropzone.style.display =
      "none";

  }


  if (previewCard) {

    previewCard.classList.remove(
      "hidden"
    );

  }

}


/**
 * Clear selected photo
 */
function clearUploadedPhoto() {

  uploadedPhoto =
    null;

  uploadedPhotoName =
    null;


  const dropzone =
    document.getElementById(
      "geotag-dropzone"
    );

  const previewCard =
    document.getElementById(
      "geotag-preview-card"
    );

  const previewImg =
    document.getElementById(
      "geotag-image-preview"
    );

  const fileInput =
    document.getElementById(
      "complaint-photo-input"
    );


  if (previewImg) {

    previewImg.src =
      "";

  }


  if (fileInput) {

    fileInput.value =
      "";

  }


  if (dropzone) {

    dropzone.style.display =
      "flex";

  }


  if (previewCard) {

    previewCard.classList.add(
      "hidden"
    );

  }

}


/**
 * Initialize photo upload
 */
function initGeotagPhotoSection() {

  const browseBtn =
    document.getElementById(
      "btn-browse-photo"
    );

  const replaceBtn =
    document.getElementById(
      "btn-replace-photo"
    );

  const sampleBtn =
    document.getElementById(
      "btn-sample-photo"
    );

  const removeBtn =
    document.getElementById(
      "btn-remove-photo"
    );

  const fileInput =
    document.getElementById(
      "complaint-photo-input"
    );

  const dropzone =
    document.getElementById(
      "geotag-dropzone"
    );


  if (
    browseBtn &&
    fileInput
  ) {

    browseBtn.addEventListener(
      "click",
      (e) => {

        e.stopPropagation();

        fileInput.click();

      }
    );

  }


  if (
    replaceBtn &&
    fileInput
  ) {

    replaceBtn.addEventListener(
      "click",
      (e) => {

        e.stopPropagation();

        fileInput.click();

      }
    );

  }


  /*
   * Demo image button
   */
  if (sampleBtn) {

    sampleBtn.addEventListener(
      "click",
      (e) => {

        e.stopPropagation();

        displayUploadedPhoto(
          createDemoCivicImage(),
          "field_defect_geotagged.jpg"
        );

      }
    );

  }


  /*
   * Remove photo
   */
  if (removeBtn) {

    removeBtn.addEventListener(
      "click",
      (e) => {

        e.preventDefault();

        clearUploadedPhoto();

      }
    );

  }


  /*
   * Normal file selection
   */
  if (fileInput) {

    fileInput.addEventListener(
      "change",
      () => {

        if (
          fileInput.files &&
          fileInput.files[0]
        ) {

          const file =
            fileInput.files[0];


          if (
            !file.type.startsWith(
              "image/"
            )
          ) {

            showMessage(
              "complaint-alert",
              "Please select an image file.",
              "error"
            );

            fileInput.value =
              "";

            return;
          }


          compressImage(
            file,
            (compressedDataUrl) => {

              displayUploadedPhoto(
                compressedDataUrl,
                file.name
              );

            }
          );

        }

      }
    );

  }


  /*
   * Drag & Drop
   */
  if (
    dropzone &&
    fileInput
  ) {

    dropzone.addEventListener(
      "click",
      () => {

        fileInput.click();

      }
    );


    [
      "dragenter",
      "dragover"
    ].forEach(
      (eventName) => {

        dropzone.addEventListener(
          eventName,
          (e) => {

            e.preventDefault();

            dropzone.classList.add(
              "dragover"
            );

          }
        );

      }
    );


    [
      "dragleave",
      "drop"
    ].forEach(
      (eventName) => {

        dropzone.addEventListener(
          eventName,
          (e) => {

            e.preventDefault();

            dropzone.classList.remove(
              "dragover"
            );

          }
        );

      }
    );


    dropzone.addEventListener(
      "drop",
      (e) => {

        const files =
          e.dataTransfer.files;


        if (
          files &&
          files[0]
        ) {

          const file =
            files[0];


          if (
            !file.type.startsWith(
              "image/"
            )
          ) {

            showMessage(
              "complaint-alert",
              "Please drop an image file.",
              "error"
            );

            return;
          }


          compressImage(
            file,
            (compressedDataUrl) => {

              displayUploadedPhoto(
                compressedDataUrl,
                file.name
              );

            }
          );

        }

      }
    );

  }

}


/**
 * Format date/time
 */
function formatCurrentDateTime() {

  const now =
    new Date();


  const options = {

    day: "2-digit",

    month: "short",

    year: "numeric",

    hour: "2-digit",

    minute: "2-digit",

    hour12: true

  };


  return now.toLocaleString(
    "en-IN",
    options
  );

}


/* ==========================================================================
   6. SUBMIT COMPLAINT
   ========================================================================== */


function submitComplaint(e) {

  if (e) {
    e.preventDefault();
  }


  const categoryInput =
    document.getElementById(
      "complaint-category"
    );

  const priorityInput =
    document.getElementById(
      "complaint-priority"
    );

  const titleInput =
    document.getElementById(
      "complaint-title"
    );

  const descInput =
    document.getElementById(
      "complaint-description"
    );

  const locationInput =
    document.getElementById(
      "complaint-location"
    );


  const category =
    categoryInput
      ? categoryInput.value.trim()
      : "";


  const priority =
    priorityInput
      ? priorityInput.value.trim()
      : "Medium";


  const title =
    titleInput
      ? titleInput.value.trim()
      : "";


  const description =
    descInput
      ? descInput.value.trim()
      : "";


  const location =
    locationInput
      ? locationInput.value.trim()
      : "";


  /*
   * Category
   */
  if (!category) {

    showMessage(
      "complaint-alert",
      "Please select a complaint category.",
      "error"
    );

    if (categoryInput) {
      categoryInput.focus();
    }

    return;
  }


  /*
   * Title
   */
  if (
    !title ||
    title.length < 5
  ) {

    showMessage(
      "complaint-alert",
      "Complaint Title must be at least 5 characters.",
      "error"
    );

    if (titleInput) {
      titleInput.focus();
    }

    return;
  }


  /*
   * Description
   */
  if (
    !description ||
    description.length < 10
  ) {

    showMessage(
      "complaint-alert",
      "Complaint Description must be at least 10 characters.",
      "error"
    );

    if (descInput) {
      descInput.focus();
    }

    return;
  }


  /*
   * Location
   */
  if (!location) {

    showMessage(
      "complaint-alert",
      "Please provide a valid location or landmark.",
      "error"
    );

    if (locationInput) {
      locationInput.focus();
    }

    return;
  }


  /*
   * MANDATORY PHOTO
   */
  if (!uploadedPhoto) {

    showMessage(
      "complaint-alert",
      "Geotagged photo evidence is required to submit this complaint.",
      "error"
    );


    const dropzone =
      document.getElementById(
        "geotag-dropzone"
      );


    if (dropzone) {

      dropzone.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

    }

    return;
  }


  /*
   * Generate complaint ID
   */
  const complaintId =
    generateComplaintId();


  const submittedAt =
    formatCurrentDateTime();


  /*
   * Complaint object
   */
  const newComplaint = {

    id:
      complaintId,

    category:
      category,

    priority:
      priority,

    title:
      title,

    description:
      description,

    location:
      location,

    submittedAt:
      submittedAt,

    status:
      "Assigned",

    photo:
      uploadedPhoto,

    photoName:
      uploadedPhotoName ||
      "geotagged_evidence.jpg"

  };


  /*
   * SAVE
   */
  const savedSuccessfully =
    saveComplaint(
      newComplaint
    );


  /*
   * Storage failed
   */
  if (!savedSuccessfully) {

    showMessage(
      "complaint-alert",
      "Unable to save the complaint evidence. Please try a smaller image or clear browser storage and try again.",
      "error"
    );

    return;
  }


  /*
   * Success
   */
  showMessage(
    "complaint-alert",
    "Complaint submitted successfully!",
    "success"
  );


  /*
   * Loading
   */
  setTimeout(
    () => {

      showPageLoader(
        "Sending complaint to authority...",
        "Municipal dispatch in progress • Routing to Ward Nodal Officer"
      );


      setTimeout(
        () => {

          window.location.href =
            "authority.html";

        },
        1200
      );

    },
    400
  );

}


/* ==========================================================================
   7. AUTHORITY ACCESS
   ========================================================================== */


/**
 * Protect authority page
 */
function protectAuthorityPage() {

  const loggedIn =
    isLoggedIn();


  const complaint =
    getComplaint();


  if (
    !loggedIn ||
    !complaint
  ) {

    showPageLoader(
      "Checking secure access...",
      "Verifying session and grievance record..."
    );


    setTimeout(
      () => {

        window.location.href =
          "login.html";

      },
      900
    );


    return false;
  }


  return true;

}


/**
 * Load authority complaint
 */
function loadAuthorityComplaint() {

  if (
    !protectAuthorityPage()
  ) {

    return;

  }


  const complaint =
    getComplaint();


  if (!complaint) {
    return;
  }


  /*
   * Basic complaint data
   */
  setText(
    "authority-complaint-id",
    complaint.id
  );


  setText(
    "authority-category",
    complaint.category
  );


  setText(
    "authority-priority",
    complaint.priority
  );


  setText(
    "authority-title",
    complaint.title
  );


  setText(
    "authority-description",
    complaint.description
  );


  setText(
    "authority-location",
    complaint.location
  );


  setText(
    "authority-submitted-at",
    complaint.submittedAt
  );


  setText(
    "authority-status",
    complaint.status
  );


  /*
   * Priority badge
   */
  const priorityEl =
    document.getElementById(
      "authority-priority"
    );


  if (priorityEl) {

    priorityEl.className =
      "badge";


    const prioLower =
      (
        complaint.priority ||
        ""
      ).toLowerCase();


    if (
      prioLower ===
      "critical"
    ) {

      priorityEl.classList.add(
        "badge-red"
      );

    }

    else if (
      prioLower ===
      "high"
    ) {

      priorityEl.classList.add(
        "badge-orange"
      );

    }

    else if (
      prioLower ===
      "medium"
    ) {

      priorityEl.classList.add(
        "badge-blue"
      );

    }

    else {

      priorityEl.classList.add(
        "badge-gray"
      );

    }

  }


  /*
   * Status
   */
  updateStatusBadge(
    complaint.status
  );


  /*
   * Workflow
   */
  updateWorkflow(
    complaint.status
  );


  /*
   * Active action button
   */
  highlightActionButton(
    complaint.status
  );


  /* ==========================================================
     PHOTO EVIDENCE FIX
     ========================================================== */


  const photoWrapper =
    document.getElementById(
      "authority-photo-wrapper"
    );


  const photoEmpty =
    document.getElementById(
      "authority-photo-empty"
    );


  const geotagImg =
    document.getElementById(
      "authority-geotag-image"
    );


  /*
   * Try both:
   *
   * 1. complaint.photo
   * 2. civicComplaintPhoto
   */
  const photoData =
    complaint.photo ||
    localStorage.getItem(
      "civicComplaintPhoto"
    );


  /*
   * PHOTO EXISTS
   */
  if (
    photoData &&
    photoWrapper &&
    photoEmpty
  ) {

    if (geotagImg) {

      geotagImg.src =
        photoData;


      geotagImg.alt =
        complaint.photoName
          ? `Complaint evidence: ${complaint.photoName}`
          : "Geotagged Photo Evidence";


      /*
       * If image fails to load,
       * show empty state.
       */
      geotagImg.onerror =
        () => {

          photoWrapper.classList.add(
            "hidden"
          );

          photoEmpty.classList.remove(
            "hidden"
          );

        };

    }


    photoWrapper.classList.remove(
      "hidden"
    );


    photoEmpty.classList.add(
      "hidden"
    );

  }


  /*
   * NO PHOTO
   */
  else if (
    photoWrapper &&
    photoEmpty
  ) {

    photoWrapper.classList.add(
      "hidden"
    );

    photoEmpty.classList.remove(
      "hidden"
    );

  }

}


/* ==========================================================================
   8. STATUS BADGE
   ========================================================================== */


function updateStatusBadge(
  status
) {

  const statusEl =
    document.getElementById(
      "authority-status"
    );


  if (!statusEl) {
    return;
  }


  statusEl.className =
    "badge";


  statusEl.textContent =
    status;


  if (
    status ===
    "Assigned"
  ) {

    statusEl.classList.add(
      "badge-blue"
    );

  }

  else if (
    status ===
    "In Progress"
  ) {

    statusEl.classList.add(
      "badge-orange"
    );

  }

  else if (
    status ===
    "Resolved"
  ) {

    statusEl.classList.add(
      "badge-green"
    );

  }

}


/* ==========================================================================
   9. WORKFLOW
   ========================================================================== */


function updateWorkflow(
  status
) {

  const stepAssigned =
    document.getElementById(
      "step-assigned"
    );


  const stepInProgress =
    document.getElementById(
      "step-in-progress"
    );


  const stepResolved =
    document.getElementById(
      "step-resolved"
    );


  const progressBar =
    document.getElementById(
      "workflow-progress-line"
    );


  [
    stepAssigned,
    stepInProgress,
    stepResolved
  ].forEach(
    (node) => {

      if (node) {

        node.className =
          "workflow-node";

      }

    }
  );


  if (
    status ===
    "Assigned"
  ) {

    if (stepAssigned) {

      stepAssigned.classList.add(
        "active"
      );

    }


    if (progressBar) {

      progressBar.style.width =
        "0%";

      progressBar.style.height =
        "0%";

    }

  }


  else if (
    status ===
    "In Progress"
  ) {

    if (stepAssigned) {

      stepAssigned.classList.add(
        "completed"
      );

    }


    if (stepInProgress) {

      stepInProgress.classList.add(
        "in-progress-state",
        "active"
      );

    }


    if (progressBar) {

      progressBar.style.width =
        "50%";

      progressBar.style.height =
        "50%";

    }

  }


  else if (
    status ===
    "Resolved"
  ) {

    if (stepAssigned) {

      stepAssigned.classList.add(
        "completed"
      );

    }


    if (stepInProgress) {

      stepInProgress.classList.add(
        "completed"
      );

    }


    if (stepResolved) {

      stepResolved.classList.add(
        "resolved-state",
        "active"
      );

    }


    if (progressBar) {

      progressBar.style.width =
        "100%";

      progressBar.style.height =
        "100%";

    }

  }

}


/* ==========================================================================
   10. AUTHORITY ACTION BUTTON
   ========================================================================== */


function highlightActionButton(
  status
) {

  const buttons =
    document.querySelectorAll(
      ".btn-status-action"
    );


  buttons.forEach(
    (btn) => {

      if (
        btn.getAttribute(
          "data-status"
        ) === status
      ) {

        btn.classList.add(
          "btn-active"
        );

      }

      else {

        btn.classList.remove(
          "btn-active"
        );

      }

    }
  );

}


/**
 * Update complaint status
 */
function updateComplaintStatus(
  newStatus
) {

  const complaint =
    getComplaint();


  if (!complaint) {
    return;
  }


  complaint.status =
    newStatus;


  /*
   * IMPORTANT:
   * saveComplaint() automatically
   * preserves the existing photo.
   */
  const saved =
    saveComplaint(
      complaint
    );


  if (!saved) {

    showAuthorityToast(
      "Unable to update complaint."
    );

    return;
  }


  setText(
    "authority-status",
    newStatus
  );


  updateStatusBadge(
    newStatus
  );


  updateWorkflow(
    newStatus
  );


  highlightActionButton(
    newStatus
  );


  showAuthorityToast(
    `Complaint status updated to ${newStatus}.`
  );

}


/* ==========================================================================
   11. RESET / LOGOUT
   ========================================================================== */


function resetDemoSession() {

  localStorage.removeItem(
    "civicLoggedIn"
  );


  localStorage.removeItem(
    "civicComplaint"
  );


  localStorage.removeItem(
    "civicComplaintPhoto"
  );


  localStorage.removeItem(
    "civicComplaintPhotoName"
  );


  showPageLoader(
    "Ending Session...",
    "Returning to registration portal..."
  );


  setTimeout(
    () => {

      window.location.href =
        "register.html";

    },
    600
  );

}


/* ==========================================================================
   12. PAGE INITIALIZATION
   ========================================================================== */


document.addEventListener(
  "DOMContentLoaded",
  () => {


    /*
     * Detect authority page
     */
    const isAuthorityPage =
      window.location.pathname.includes(
        "authority.html"
      ) ||
      document.body.classList.contains(
        "authority-page"
      );


    /*
     * Authority page
     */
    if (isAuthorityPage) {

      const hasAccess =
        protectAuthorityPage();


      if (hasAccess) {

        loadAuthorityComplaint();


        setTimeout(
          hidePageLoader,
          400
        );

      }

    }


    /*
     * Normal pages
     */
    else {

      setTimeout(
        hidePageLoader,
        400
      );

    }


    /*
     * Register form
     */
    const registerForm =
      document.getElementById(
        "register-form"
      );


    if (registerForm) {

      registerForm.addEventListener(
        "submit",
        registerUser
      );

    }


    /*
     * Login form
     */
    const loginForm =
      document.getElementById(
        "login-form"
      );


    if (loginForm) {

      loginForm.addEventListener(
        "submit",
        loginUser
      );


      const currentUser =
        getUser();


      const loginEmailInput =
        document.getElementById(
          "login-email"
        );


      if (
        currentUser &&
        loginEmailInput &&
        !loginEmailInput.value
      ) {

        loginEmailInput.value =
          currentUser.email;

      }

    }


    /*
     * Complaint form
     */
    const complaintForm =
      document.getElementById(
        "complaint-form"
      );


    if (complaintForm) {

      if (!isLoggedIn()) {

        showPageLoader(
          "Citizen Access Required",
          "Redirecting to login portal..."
        );


        setTimeout(
          () => {

            window.location.href =
              "login.html";

          },
          700
        );


        return;

      }


      complaintForm.addEventListener(
        "submit",
        submitComplaint
      );


      initGeotagPhotoSection();

    }


    /*
     * Authority status buttons
     */
    const actionButtons =
      document.querySelectorAll(
        ".btn-status-action"
      );


    actionButtons.forEach(
      (btn) => {

        btn.addEventListener(
          "click",
          () => {

            const status =
              btn.getAttribute(
                "data-status"
              );


            if (status) {

              updateComplaintStatus(
                status
              );

            }

          }
        );

      }
    );


    /*
     * Logout buttons
     */
    const logoutButtons =
      document.querySelectorAll(
        ".btn-logout-demo"
      );


    logoutButtons.forEach(
      (btn) => {

        btn.addEventListener(
          "click",
          (e) => {

            e.preventDefault();

            resetDemoSession();

          }
        );

      }
    );

  }
);