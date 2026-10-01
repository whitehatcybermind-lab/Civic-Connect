/**
 * ================================================================
 * CivicConnect - Presentation Demo JavaScript
 * ================================================================
 *
 * Demo architecture:
 *   Register → Login → Complaint → Submit → Success
 *                                      ↓
 *                              Authority page
 *                              opened manually
 *
 * Storage:
 *   Browser localStorage only
 *
 * Privacy:
 *   Authority view does NOT display citizen personal information.
 *
 * Photo:
 *   Mandatory evidence upload.
 *   No device location is requested.
 *   No EXIF/GPS metadata is read or inspected.
 * ================================================================
 */


/* ================================================================
   1. LOCAL STORAGE HELPERS
   ================================================================ */

/**
 * Retrieve registered citizen.
 */
function getUser() {
  try {
    const raw = localStorage.getItem('civicUser');
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Error reading civicUser:', err);
    return null;
  }
}


/**
 * Save citizen locally.
 */
function saveUser(user) {
  try {
    localStorage.setItem('civicUser', JSON.stringify(user));
    return true;
  } catch (err) {
    console.error('Error saving civicUser:', err);
    return false;
  }
}


/**
 * Retrieve saved complaint.
 *
 * The complaint record is stored separately from the photo
 * to reduce localStorage pressure.
 */
function getComplaint() {
  try {
    const raw = localStorage.getItem('civicComplaint');

    if (!raw) {
      return null;
    }

    const complaint = JSON.parse(raw);

    // Restore photo stored separately.
    const storedPhoto = localStorage.getItem('civicComplaintPhoto');
    const storedPhotoName = localStorage.getItem(
      'civicComplaintPhotoName'
    );

    if (!complaint.photo && storedPhoto) {
      complaint.photo = storedPhoto;
    }

    if (!complaint.photoName && storedPhotoName) {
      complaint.photoName = storedPhotoName;
    }

    return complaint;

  } catch (err) {
    console.error('Error reading civicComplaint:', err);
    return null;
  }
}


/**
 * Save complaint record and photo separately.
 */
function saveComplaint(complaint) {
  try {

    const complaintRecord = {
      ...complaint
    };

    // Remove large photo from main JSON record.
    delete complaintRecord.photo;
    delete complaintRecord.photoName;

    localStorage.setItem(
      'civicComplaint',
      JSON.stringify(complaintRecord)
    );

    // Store photo separately.
    if (complaint.photo) {
      localStorage.setItem(
        'civicComplaintPhoto',
        complaint.photo
      );
    } else {
      localStorage.removeItem('civicComplaintPhoto');
    }

    if (complaint.photoName) {
      localStorage.setItem(
        'civicComplaintPhotoName',
        complaint.photoName
      );
    } else {
      localStorage.removeItem('civicComplaintPhotoName');
    }

    return true;

  } catch (err) {

    console.error('Error saving civicComplaint:', err);

    return false;
  }
}


/**
 * Check login status.
 */
function isLoggedIn() {
  return localStorage.getItem('civicLoggedIn') === 'true';
}


/* ================================================================
   2. PAGE LOADER
   ================================================================ */


/**
 * Show CivicConnect page loader.
 */
function showPageLoader(
  title = 'Loading CivicConnect...',
  subtitle = 'Secure Public Grievance Portal'
) {

  const loader = document.getElementById('page-loader');
  const titleEl = document.getElementById('loader-title');
  const subtitleEl = document.getElementById('loader-subtitle');

  if (titleEl && title) {
    titleEl.textContent = title;
  }

  if (subtitleEl && subtitle) {
    subtitleEl.textContent = subtitle;
  }

  if (loader) {
    loader.classList.remove('loader-hidden');
  }
}


/**
 * Hide CivicConnect loader.
 */
function hidePageLoader() {

  const loader = document.getElementById('page-loader');

  if (loader) {
    loader.classList.add('loader-hidden');
  }
}


/* ================================================================
   3. UI MESSAGE HELPERS
   ================================================================ */


/**
 * Display form message.
 */
function showMessage(
  elementId,
  message,
  type = 'error'
) {

  const el = document.getElementById(elementId);

  if (!el) {
    return;
  }

  el.className = 'alert-box';

  if (type === 'error') {
    el.classList.add('alert-error');
  }

  if (type === 'success') {
    el.classList.add('alert-success');
  }

  if (type === 'warning') {
    el.classList.add('alert-warning');
  }

  let icon = '●';

  if (type === 'error') {
    icon = '⚠';
  }

  if (type === 'success') {
    icon = '✓';
  }

  if (type === 'warning') {
    icon = 'ℹ';
  }

  el.innerHTML = `
    <span>
      <strong>${icon}</strong>
      ${message}
    </span>
  `;

  el.classList.remove('hidden');
}


/**
 * Safely set text.
 */
function setText(id, text) {

  const el = document.getElementById(id);

  if (el) {
    el.textContent = text || '—';
  }
}


/**
 * Authority toast notification.
 */
function showAuthorityToast(message) {

  let toast = document.getElementById(
    'authority-toast'
  );

  if (!toast) {

    toast = document.createElement('div');

    toast.id = 'authority-toast';

    toast.className = 'toast-notice';

    document.body.appendChild(toast);
  }

  toast.innerHTML = `
    <span class="toast-icon">✓</span>
    <span>${message}</span>
  `;

  toast.classList.add('toast-show');

  if (window.toastTimeout) {
    clearTimeout(window.toastTimeout);
  }

  window.toastTimeout = setTimeout(() => {

    toast.classList.remove('toast-show');

  }, 3500);
}


/* ================================================================
   4. REGISTRATION
   ================================================================ */


/**
 * Handle citizen registration.
 */
function registerUser(e) {

  if (e) {
    e.preventDefault();
  }

  const fullNameInput =
    document.getElementById('fullName');

  const mobileInput =
    document.getElementById('mobile');

  const aadhaarInput =
    document.getElementById('aadhaar');

  const emailInput =
    document.getElementById('email');

  const passwordInput =
    document.getElementById('password');

  const confirmPasswordInput =
    document.getElementById('confirmPassword');


  const fullName =
    fullNameInput
      ? fullNameInput.value.trim()
      : '';

  const mobile =
    mobileInput
      ? mobileInput.value.trim()
      : '';

  const aadhaar =
    aadhaarInput
      ? aadhaarInput.value
          .trim()
          .replace(/\s+/g, '')
      : '';

  const email =
    emailInput
      ? emailInput.value.trim()
      : '';

  const password =
    passwordInput
      ? passwordInput.value
      : '';

  const confirmPassword =
    confirmPasswordInput
      ? confirmPasswordInput.value
      : '';


  /* Full name */

  if (!fullName || fullName.length < 3) {

    showMessage(
      'register-alert',
      'Full Name must be at least 3 characters.',
      'error'
    );

    if (fullNameInput) {
      fullNameInput.focus();
    }

    return;
  }


  /* Mobile */

  const mobileRegex = /^[0-9]{10}$/;

  if (!mobileRegex.test(mobile)) {

    showMessage(
      'register-alert',
      'Mobile Number must be exactly 10 digits.',
      'error'
    );

    if (mobileInput) {
      mobileInput.focus();
    }

    return;
  }


  /* Aadhaar */

  const aadhaarRegex = /^[0-9]{12}$/;

  if (!aadhaarRegex.test(aadhaar)) {

    showMessage(
      'register-alert',
      'Aadhaar Number must be exactly 12 digits.',
      'error'
    );

    if (aadhaarInput) {
      aadhaarInput.focus();
    }

    return;
  }


  /* Email */

  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {

    showMessage(
      'register-alert',
      'Please enter a valid email address.',
      'error'
    );

    if (emailInput) {
      emailInput.focus();
    }

    return;
  }


  /* Password */

  if (!password || password.length < 8) {

    showMessage(
      'register-alert',
      'Password must be at least 8 characters.',
      'error'
    );

    if (passwordInput) {
      passwordInput.focus();
    }

    return;
  }


  /* Confirm password */

  if (password !== confirmPassword) {

    showMessage(
      'register-alert',
      'Password and Confirm Password do not match.',
      'error'
    );

    if (confirmPasswordInput) {
      confirmPasswordInput.focus();
    }

    return;
  }


  /* Save user */

  const userData = {

    fullName,
    mobile,
    aadhaar,
    email,
    password

  };


  const saved = saveUser(userData);

  if (!saved) {

    showMessage(
      'register-alert',
      'Unable to save registration data in this browser.',
      'error'
    );

    return;
  }


  showMessage(
    'register-alert',
    'Registration successful! Preparing your portal access...',
    'success'
  );


  showPageLoader(
    'Registering Citizen...',
    'Preparing secure citizen access...'
  );


  setTimeout(() => {

    window.location.href =
      'login.html';

  }, 1300);
}


/* ================================================================
   5. LOGIN
   ================================================================ */


/**
 * Handle citizen login.
 */
function loginUser(e) {

  if (e) {
    e.preventDefault();
  }


  const emailInput =
    document.getElementById('login-email');

  const passwordInput =
    document.getElementById('login-password');


  const email =
    emailInput
      ? emailInput.value.trim()
      : '';

  const password =
    passwordInput
      ? passwordInput.value
      : '';


  const registeredUser =
    getUser();


  /* Account check */

  if (!registeredUser) {

    showMessage(
      'login-alert',
      'No account found. Please register first.',
      'error'
    );

    return;
  }


  /* Email check */

  if (
    registeredUser.email.toLowerCase() !==
    email.toLowerCase()
  ) {

    showMessage(
      'login-alert',
      'Email address is not registered.',
      'error'
    );

    if (emailInput) {
      emailInput.focus();
    }

    return;
  }


  /* Password check */

  if (
    registeredUser.password !==
    password
  ) {

    showMessage(
      'login-alert',
      'Incorrect password.',
      'error'
    );

    if (passwordInput) {
      passwordInput.focus();
    }

    return;
  }


  /* Login success */

  localStorage.setItem(
    'civicLoggedIn',
    'true'
  );


  showMessage(
    'login-alert',
    'Authentication verified. Welcome to CivicConnect.',
    'success'
  );


  showPageLoader(
    'Authenticating...',
    'Loading citizen complaint portal...'
  );


  setTimeout(() => {

    window.location.href =
      'complaint.html';

  }, 1000);
}


/* ================================================================
   6. COMPLAINT ID
   ================================================================ */


/**
 * Generate complaint ID.
 */
function generateComplaintId() {

  const year =
    new Date().getFullYear();

  const randomNum =
    Math.floor(
      10000 +
      Math.random() * 90000
    );

  return `CC-${year}-${randomNum}`;
}


/* ================================================================
   7. PHOTO HANDLING
   ================================================================ */

let uploadedPhoto = null;

let uploadedPhotoName = null;


/**
 * Compress uploaded image.
 *
 * IMPORTANT:
 * - No navigator.geolocation.
 * - No EXIF parsing.
 * - No GPS extraction.
 * - Photo is treated only as evidence.
 */
function compressImage(
  file,
  callback
) {

  if (!file) {
    return;
  }


  const reader =
    new FileReader();


  reader.onload = (e) => {

    const img =
      new Image();


    img.onload = () => {

      const maxDim = 1000;

      let width =
        img.width;

      let height =
        img.height;


      if (
        width > maxDim ||
        height > maxDim
      ) {

        if (width > height) {

          height =
            Math.round(
              (height * maxDim) /
              width
            );

          width = maxDim;

        } else {

          width =
            Math.round(
              (width * maxDim) /
              height
            );

          height = maxDim;
        }
      }


      const canvas =
        document.createElement('canvas');

      canvas.width = width;

      canvas.height = height;


      const ctx =
        canvas.getContext('2d');


      if (!ctx) {

        callback(
          e.target.result
        );

        return;
      }


      ctx.drawImage(
        img,
        0,
        0,
        width,
        height
      );


      const compressedDataUrl =
        canvas.toDataURL(
          'image/jpeg',
          0.78
        );


      callback(
        compressedDataUrl
      );
    };


    img.onerror = () => {

      callback(
        e.target.result
      );
    };


    img.src =
      e.target.result;
  };


  reader.onerror = () => {

    console.error(
      'Unable to read image file.'
    );

  };


  reader.readAsDataURL(file);
}


/* ================================================================
   8. DEMO FIELD PHOTO
   ================================================================ */


/**
 * Generate demo field photo.
 *
 * This is only for presentation/demo use.
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


    <!-- Road marking -->

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


    <!-- Pothole -->

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


    <!-- Cracks -->

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


    <!-- Warning cone -->

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


    <!-- Badge -->

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
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(svg)
  );
}


/* ================================================================
   9. PHOTO PREVIEW
   ================================================================ */


/**
 * Display selected photo.
 */
function displayUploadedPhoto(
  photoUrl,
  fileName = 'geotagged_evidence.jpg'
) {

  const dropzone =
    document.getElementById(
      'geotag-dropzone'
    );

  const previewCard =
    document.getElementById(
      'geotag-preview-card'
    );

  const previewImg =
    document.getElementById(
      'geotag-image-preview'
    );

  const nameLabel =
    document.getElementById(
      'photo-filename-label'
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
      'none';
  }


  if (previewCard) {
    previewCard.classList.remove(
      'hidden'
    );
  }
}


/**
 * Remove selected photo.
 */
function clearUploadedPhoto() {

  uploadedPhoto = null;

  uploadedPhotoName = null;


  const dropzone =
    document.getElementById(
      'geotag-dropzone'
    );

  const previewCard =
    document.getElementById(
      'geotag-preview-card'
    );

  const previewImg =
    document.getElementById(
      'geotag-image-preview'
    );

  const fileInput =
    document.getElementById(
      'complaint-photo-input'
    );


  if (previewImg) {
    previewImg.src = '';
  }


  if (fileInput) {
    fileInput.value = '';
  }


  if (dropzone) {
    dropzone.style.display =
      'flex';
  }


  if (previewCard) {
    previewCard.classList.add(
      'hidden'
    );
  }
}


/* ================================================================
   10. PHOTO SECTION INITIALIZATION
   ================================================================ */


/**
 * Initialize photo upload section.
 */
function initGeotagPhotoSection() {

  const browseBtn =
    document.getElementById(
      'btn-browse-photo'
    );

  const replaceBtn =
    document.getElementById(
      'btn-replace-photo'
    );

  const sampleBtn =
    document.getElementById(
      'btn-sample-photo'
    );

  const removeBtn =
    document.getElementById(
      'btn-remove-photo'
    );

  const fileInput =
    document.getElementById(
      'complaint-photo-input'
    );

  const dropzone =
    document.getElementById(
      'geotag-dropzone'
    );


  /* Browse */

  if (
    browseBtn &&
    fileInput
  ) {

    browseBtn.addEventListener(
      'click',
      (e) => {

        e.stopPropagation();

        fileInput.click();

      }
    );
  }


  /* Replace */

  if (
    replaceBtn &&
    fileInput
  ) {

    replaceBtn.addEventListener(
      'click',
      (e) => {

        e.stopPropagation();

        fileInput.click();

      }
    );
  }


  /* Demo photo */

  if (sampleBtn) {

    sampleBtn.addEventListener(
      'click',
      (e) => {

        e.stopPropagation();

        displayUploadedPhoto(
          createDemoCivicImage(),
          'field_defect_geotagged.jpg'
        );

      }
    );
  }


  /* Remove */

  if (removeBtn) {

    removeBtn.addEventListener(
      'click',
      (e) => {

        e.preventDefault();

        clearUploadedPhoto();

      }
    );
  }


  /* File selection */

  if (fileInput) {

    fileInput.addEventListener(
      'change',
      () => {

        if (
          fileInput.files &&
          fileInput.files[0]
        ) {

          const file =
            fileInput.files[0];

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


  /* Click dropzone */

  if (
    dropzone &&
    fileInput
  ) {

    dropzone.addEventListener(
      'click',
      () => {

        fileInput.click();

      }
    );


    /* Drag enter */

    [
      'dragenter',
      'dragover'
    ].forEach(
      eventName => {

        dropzone.addEventListener(
          eventName,
          (e) => {

            e.preventDefault();

            dropzone.classList.add(
              'dragover'
            );

          },
          false
        );

      }
    );


    /* Drag leave */

    [
      'dragleave',
      'drop'
    ].forEach(
      eventName => {

        dropzone.addEventListener(
          eventName,
          (e) => {

            e.preventDefault();

            dropzone.classList.remove(
              'dragover'
            );

          },
          false
        );

      }
    );


    /* Drop */

    dropzone.addEventListener(
      'drop',
      (e) => {

        const dt =
          e.dataTransfer;

        const files =
          dt.files;

        if (
          files &&
          files[0]
        ) {

          compressImage(
            files[0],
            (compressedDataUrl) => {

              displayUploadedPhoto(
                compressedDataUrl,
                files[0].name
              );

            }
          );
        }
      }
    );
  }
}


/* ================================================================
   11. DATE/TIME
   ================================================================ */


/**
 * Format current date/time.
 */
function formatCurrentDateTime() {

  const now =
    new Date();

  const options = {

    day: '2-digit',

    month: 'short',

    year: 'numeric',

    hour: '2-digit',

    minute: '2-digit',

    hour12: true

  };


  return now.toLocaleString(
    'en-IN',
    options
  );
}


/* ================================================================
   12. SUBMIT COMPLAINT
   ================================================================ */


/**
 * Handle complaint submission.
 *
 * IMPORTANT:
 *
 * After submission:
 *
 *     SUCCESS MESSAGE
 *          ↓
 *        STOP
 *
 * There is NO automatic redirect
 * to authority.html.
 *
 * Authority page is opened manually
 * during the presentation.
 */
function submitComplaint(e) {

  if (e) {
    e.preventDefault();
  }


  const categoryInput =
    document.getElementById(
      'complaint-category'
    );

  const priorityInput =
    document.getElementById(
      'complaint-priority'
    );

  const titleInput =
    document.getElementById(
      'complaint-title'
    );

  const descInput =
    document.getElementById(
      'complaint-description'
    );

  const locationInput =
    document.getElementById(
      'complaint-location'
    );


  const category =
    categoryInput
      ? categoryInput.value.trim()
      : '';

  const priority =
    priorityInput
      ? priorityInput.value.trim()
      : 'Medium';

  const title =
    titleInput
      ? titleInput.value.trim()
      : '';

  const description =
    descInput
      ? descInput.value.trim()
      : '';

  const location =
    locationInput
      ? locationInput.value.trim()
      : '';


  /* Validation 1 */

  if (!category) {

    showMessage(
      'complaint-alert',
      'Please select a complaint category.',
      'error'
    );

    if (categoryInput) {
      categoryInput.focus();
    }

    return;
  }


  /* Validation 2 */

  if (
    !title ||
    title.length < 5
  ) {

    showMessage(
      'complaint-alert',
      'Complaint Title must be at least 5 characters.',
      'error'
    );

    if (titleInput) {
      titleInput.focus();
    }

    return;
  }


  /* Validation 3 */

  if (
    !description ||
    description.length < 10
  ) {

    showMessage(
      'complaint-alert',
      'Complaint Description must be at least 10 characters.',
      'error'
    );

    if (descInput) {
      descInput.focus();
    }

    return;
  }


  /* Validation 4 */

  if (!location) {

    showMessage(
      'complaint-alert',
      'Please provide a valid location or landmark.',
      'error'
    );

    if (locationInput) {
      locationInput.focus();
    }

    return;
  }


  /* Validation 5 */

  if (!uploadedPhoto) {

    showMessage(
      'complaint-alert',
      'Geotagged photo evidence is required to submit this complaint.',
      'error'
    );

    const dropzone =
      document.getElementById(
        'geotag-dropzone'
      );

    if (dropzone) {

      dropzone.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });

    }

    return;
  }


  /* Generate complaint ID */

  const complaintId =
    generateComplaintId();


  /* Submission time */

  const submittedAt =
    formatCurrentDateTime();


  /* Create complaint */

  const newComplaint = {

    id: complaintId,

    category,

    priority,

    title,

    description,

    location,

    submittedAt,

    status: 'Assigned',

    photo: uploadedPhoto,

    photoName:
      uploadedPhotoName ||
      'geotagged_evidence.jpg'

  };


  /* Save */

  const savedSuccessfully =
    saveComplaint(
      newComplaint
    );


  if (!savedSuccessfully) {

    showMessage(
      'complaint-alert',
      'Unable to save complaint. Please try again.',
      'error'
    );

    return;
  }


  /* SUCCESS */

  showMessage(
    'complaint-alert',
    `Complaint submitted successfully! Complaint ID: ${complaintId}`,
    'success'
  );


  /* Lock submit button */

  const submitButton =
    document.getElementById(
      'btn-submit-complaint'
    );


  if (submitButton) {

    submitButton.disabled =
      true;

    submitButton.innerHTML = `
      <span>✓ Complaint Submitted</span>
    `;

  }


  /*
   * IMPORTANT:
   *
   * NO redirect here.
   *
   * The citizen remains on complaint.html.
   *
   * During presentation, authority.html
   * will be opened manually.
   */
}


/* ================================================================
   13. AUTHORITY PAGE PROTECTION
   ================================================================ */


/**
 * Protect authority page.
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
      'Checking secure access...',
      'No active grievance record found.'
    );


    setTimeout(
      () => {

        window.location.href =
          'login.html';

      },
      900
    );


    return false;
  }


  return true;
}


/* ================================================================
   14. LOAD AUTHORITY COMPLAINT
   ================================================================ */


/**
 * Load complaint into authority control room.
 *
 * PRIVACY:
 * Citizen name, mobile, Aadhaar and email
 * are intentionally NOT displayed.
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


  /* Complaint metadata */

  setText(
    'authority-complaint-id',
    complaint.id
  );

  setText(
    'authority-category',
    complaint.category
  );

  setText(
    'authority-priority',
    complaint.priority
  );

  setText(
    'authority-title',
    complaint.title
  );

  setText(
    'authority-description',
    complaint.description
  );

  setText(
    'authority-location',
    complaint.location
  );

  setText(
    'authority-submitted-at',
    complaint.submittedAt
  );

  setText(
    'authority-status',
    complaint.status
  );


  /* Priority badge */

  const priorityEl =
    document.getElementById(
      'authority-priority'
    );


  if (priorityEl) {

    priorityEl.className =
      'badge';


    const prioLower =
      String(
        complaint.priority || ''
      ).toLowerCase();


    if (
      prioLower === 'critical'
    ) {

      priorityEl.classList.add(
        'badge-red'
      );

    } else if (
      prioLower === 'high'
    ) {

      priorityEl.classList.add(
        'badge-orange'
      );

    } else if (
      prioLower === 'medium'
    ) {

      priorityEl.classList.add(
        'badge-blue'
      );

    } else {

      priorityEl.classList.add(
        'badge-gray'
      );

    }
  }


  /* Status */

  updateStatusBadge(
    complaint.status
  );


  /* Workflow */

  updateWorkflow(
    complaint.status
  );


  /* Active button */

  highlightActionButton(
    complaint.status
  );


  /* Photo */

  const photoWrapper =
    document.getElementById(
      'authority-photo-wrapper'
    );

  const photoEmpty =
    document.getElementById(
      'authority-photo-empty'
    );

  const geotagImg =
    document.getElementById(
      'authority-geotag-image'
    );


  const photoData =
    complaint.photo ||
    localStorage.getItem(
      'civicComplaintPhoto'
    );


  if (
    photoData &&
    photoWrapper &&
    photoEmpty
  ) {

    if (geotagImg) {

      geotagImg.src =
        photoData;

    }


    photoWrapper.classList.remove(
      'hidden'
    );


    photoEmpty.classList.add(
      'hidden'
    );


  } else if (
    photoWrapper &&
    photoEmpty
  ) {

    photoWrapper.classList.add(
      'hidden'
    );


    photoEmpty.classList.remove(
      'hidden'
    );
  }
}


/* ================================================================
   15. AUTHORITY STATUS BADGE
   ================================================================ */


/**
 * Update authority status badge.
 */
function updateStatusBadge(status) {

  const statusEl =
    document.getElementById(
      'authority-status'
    );


  if (!statusEl) {
    return;
  }


  statusEl.className =
    'badge';


  statusEl.textContent =
    status;


  if (
    status === 'Assigned'
  ) {

    statusEl.classList.add(
      'badge-blue'
    );

  } else if (
    status === 'In Progress'
  ) {

    statusEl.classList.add(
      'badge-orange'
    );

  } else if (
    status === 'Resolved'
  ) {

    statusEl.classList.add(
      'badge-green'
    );
  }
}


/* ================================================================
   16. WORKFLOW
   ================================================================ */


/**
 * Update authority workflow.
 */
function updateWorkflow(status) {

  const stepAssigned =
    document.getElementById(
      'step-assigned'
    );

  const stepInProgress =
    document.getElementById(
      'step-in-progress'
    );

  const stepResolved =
    document.getElementById(
      'step-resolved'
    );

  const progressBar =
    document.getElementById(
      'workflow-progress-line'
    );


  [
    stepAssigned,
    stepInProgress,
    stepResolved
  ].forEach(
    node => {

      if (node) {

        node.className =
          'workflow-node';

      }

    }
  );


  if (
    status === 'Assigned'
  ) {

    if (stepAssigned) {

      stepAssigned.classList.add(
        'active'
      );

    }


    if (progressBar) {

      progressBar.style.width =
        '0%';

      progressBar.style.height =
        '0%';

    }


  } else if (
    status === 'In Progress'
  ) {

    if (stepAssigned) {

      stepAssigned.classList.add(
        'completed'
      );

    }


    if (stepInProgress) {

      stepInProgress.classList.add(
        'in-progress-state',
        'active'
      );

    }


    if (progressBar) {

      progressBar.style.width =
        '50%';

      progressBar.style.height =
        '50%';

    }


  } else if (
    status === 'Resolved'
  ) {

    if (stepAssigned) {

      stepAssigned.classList.add(
        'completed'
      );

    }


    if (stepInProgress) {

      stepInProgress.classList.add(
        'completed'
      );

    }


    if (stepResolved) {

      stepResolved.classList.add(
        'resolved-state',
        'active'
      );

    }


    if (progressBar) {

      progressBar.style.width =
        '100%';

      progressBar.style.height =
        '100%';

    }
  }
}


/* ================================================================
   17. AUTHORITY BUTTON HIGHLIGHT
   ================================================================ */


/**
 * Highlight selected status button.
 */
function highlightActionButton(
  status
) {

  const buttons =
    document.querySelectorAll(
      '.btn-status-action'
    );


  buttons.forEach(
    btn => {

      if (
        btn.getAttribute(
          'data-status'
        ) === status
      ) {

        btn.classList.add(
          'btn-active'
        );

      } else {

        btn.classList.remove(
          'btn-active'
        );
      }

    }
  );
}


/* ================================================================
   18. AUTHORITY STATUS UPDATE
   ================================================================ */


/**
 * Update complaint status.
 */
function updateComplaintStatus(
  newStatus
) {

  const complaint =
    getComplaint();


  if (!complaint) {

    showAuthorityToast(
      'No complaint record found.'
    );

    return;
  }


  complaint.status =
    newStatus;


  const saved =
    saveComplaint(
      complaint
    );


  if (!saved) {

    showAuthorityToast(
      'Unable to save status update.'
    );

    return;
  }


  /* Update UI */

  setText(
    'authority-status',
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


/* ================================================================
   19. DEMO SESSION RESET
   ================================================================ */


/**
 * Reset demo session.
 *
 * Clears:
 * - Login
 * - User
 * - Complaint
 * - Photo
 */
function resetDemoSession() {

  localStorage.removeItem(
    'civicLoggedIn'
  );

  localStorage.removeItem(
    'civicUser'
  );

  localStorage.removeItem(
    'civicComplaint'
  );

  localStorage.removeItem(
    'civicComplaintPhoto'
  );

  localStorage.removeItem(
    'civicComplaintPhotoName'
  );


  showPageLoader(
    'Ending Session...',
    'Returning to CivicConnect registration...'
  );


  setTimeout(
    () => {

      window.location.href =
        'register.html';

    },
    600
  );
}


/* ================================================================
   20. PAGE INITIALIZATION
   ================================================================ */


document.addEventListener(
  'DOMContentLoaded',
  () => {

    /* ------------------------------------------------------------
       Detect authority page
       ------------------------------------------------------------ */

    const isAuthorityPage =
      window.location.pathname
        .toLowerCase()
        .includes('authority.html') ||
      document.body.classList.contains(
        'authority-page'
      );


    /* ------------------------------------------------------------
       Authority page
       ------------------------------------------------------------ */

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

    } else {

      /* Normal pages */

      setTimeout(
        hidePageLoader,
        400
      );
    }


    /* ------------------------------------------------------------
       Register form
       ------------------------------------------------------------ */

    const registerForm =
      document.getElementById(
        'register-form'
      );


    if (registerForm) {

      registerForm.addEventListener(
        'submit',
        registerUser
      );
    }


    /* ------------------------------------------------------------
       Login form
       ------------------------------------------------------------ */

    const loginForm =
      document.getElementById(
        'login-form'
      );


    if (loginForm) {

      loginForm.addEventListener(
        'submit',
        loginUser
      );


      /* Auto-fill email */

      const currentUser =
        getUser();


      const loginEmailInput =
        document.getElementById(
          'login-email'
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


    /* ------------------------------------------------------------
       Complaint form
       ------------------------------------------------------------ */

    const complaintForm =
      document.getElementById(
        'complaint-form'
      );


    if (complaintForm) {

      /* Require login */

      if (!isLoggedIn()) {

        showPageLoader(
          'Citizen Access Required',
          'Redirecting to login portal...'
        );


        setTimeout(
          () => {

            window.location.href =
              'login.html';

          },
          700
        );


        return;
      }


      /* Attach complaint submit */

      complaintForm.addEventListener(
        'submit',
        submitComplaint
      );


      /* Photo system */

      initGeotagPhotoSection();
    }


    /* ------------------------------------------------------------
       Authority status buttons
       ------------------------------------------------------------ */

    const actionButtons =
      document.querySelectorAll(
        '.btn-status-action'
      );


    actionButtons.forEach(
      btn => {

        btn.addEventListener(
          'click',
          () => {

            const status =
              btn.getAttribute(
                'data-status'
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


    /* ------------------------------------------------------------
       Logout / reset buttons
       ------------------------------------------------------------ */

    const logoutButtons =
      document.querySelectorAll(
        '.btn-logout-demo'
      );


    logoutButtons.forEach(
      btn => {

        btn.addEventListener(
          'click',
          (e) => {

            e.preventDefault();

            resetDemoSession();

          }
        );

      }
    );

  }
);
