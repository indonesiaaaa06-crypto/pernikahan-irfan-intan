import { firebaseConfig } from "./firebase-config.js";

const weddingDate = new Date("2028-12-12T09:00:00+07:00");
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const toast = (message) => {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("is-visible");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => element.classList.remove("is-visible"), 2800);
};

const loveRain = $("#love-rain");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
if (loveRain && !reduceMotion.matches) {
  const createFallingHeart = () => {
    if (document.hidden || loveRain.childElementCount >= 12) return;
    const heart = document.createElement("span");
    const duration = 7 + Math.random() * 5;
    heart.className = "falling-heart";
    heart.textContent = Math.random() > 0.5 ? "♥" : "♡";
    heart.style.left = `${Math.random() * 100}%`;
    heart.style.setProperty("--fall-duration", `${duration}s`);
    heart.style.setProperty("--fall-delay", `${Math.random() * 0.8}s`);
    heart.style.setProperty("--heart-size", `${9 + Math.random() * 8}px`);
    loveRain.append(heart);
    heart.addEventListener("animationend", () => heart.remove(), { once: true });
  };
  for (let index = 0; index < 6; index += 1) createFallingHeart();
  window.setInterval(createFallingHeart, 850);
}

function getInvitationUrl() {
  const url = new URL(window.location.href);
  url.hash = "";
  return url.toString();
}

function updateShareLinks() {
  const invitationUrl = getInvitationUrl();
  const message = `Dengan penuh kebahagiaan, kami mengundang Anda ke pernikahan Intan & Irfan pada 12 Desember 2028. Buka undangan: ${invitationUrl}`;
  $("#share-whatsapp").href = `https://wa.me/60142867211?text=${encodeURIComponent(message)}`;
  $("#share-facebook").href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(invitationUrl)}`;
}
updateShareLinks();

const featuredFrame = $(".featured-photo-frame");
if ("IntersectionObserver" in window) {
  const frameObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.25 });
  frameObserver.observe(featuredFrame);
} else {
  featuredFrame.classList.add("is-visible");
}

$("#copy-invitation-link").addEventListener("click", async () => {
  const url = getInvitationUrl();
  try {
    await navigator.clipboard.writeText(url);
    toast("Tautan undangan berhasil disalin.");
  } catch {
    const input = document.createElement("textarea");
    input.value = url;
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.append(input);
    input.select();
    const copied = document.execCommand("copy");
    input.remove();
    toast(copied ? "Tautan undangan berhasil disalin." : `Salin tautan ini: ${url}`);
  }
});

const params = new URLSearchParams(window.location.search);
const guest = params.get("to");
if (guest) $("#guest-name").textContent = guest.slice(0, 80).replace(/[<>]/g, "");

$("#open-invitation").addEventListener("click", () => {
  $("#cover").classList.add("is-hidden");
  window.setTimeout(() => $("#main").focus({ preventScroll: true }), 100);
});

const menuToggle = $("#menu-toggle");
menuToggle.addEventListener("click", () => {
  const open = menuToggle.getAttribute("aria-expanded") !== "true";
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Tutup navigasi" : "Buka navigasi");
  $("#site-nav").classList.toggle("is-open", open);
});
$$(".site-nav a").forEach((link) => link.addEventListener("click", () => {
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Buka navigasi");
  $("#site-nav").classList.remove("is-open");
}));

function updateCountdown() {
  const remaining = Math.max(0, weddingDate.getTime() - Date.now());
  const parts = [
    ["#days", Math.floor(remaining / 86400000)],
    ["#hours", Math.floor((remaining / 3600000) % 24)],
    ["#minutes", Math.floor((remaining / 60000) % 60)],
    ["#seconds", Math.floor((remaining / 1000) % 60)],
  ];
  parts.forEach(([selector, value]) => { $(selector).textContent = String(value).padStart(2, "0"); });
}
updateCountdown();
window.setInterval(updateCountdown, 1000);

$("#calendar-button").addEventListener("click", () => {
  const calendar = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Intan dan Irfan//Undangan//ID",
    "BEGIN:VEVENT", "UID:intan-irfan-wedding-20281212@example.local",
    "DTSTAMP:20261112T000000Z", "DTSTART:20281212T020000Z", "DTEND:20281212T070000Z",
    "SUMMARY:Pernikahan Intan & Irfan", "LOCATION:Kota Sigli\\, Aceh",
    "DESCRIPTION:Akad nikah pukul 09.00 WIB dan resepsi pukul 11.00 WIB.",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([calendar], { type: "text/calendar;charset=utf-8" }));
  link.download = "pernikahan-intan-irfan.ics";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  toast("Undangan kalender berhasil diunduh.");
});

const liveStatus = $("#live-status");
const liveStatusText = $("#live-status-text");
let firebaseDatabase;
let firebaseReady = false;
let firebaseInitPromise;
let firebaseApi;
let firebaseAuth;
let firebaseAuthApi;
let realtimeStarted = false;
let wishesTotal = 0;
let previousWishKeys = new Set();
let initialWishesLoaded = false;
let adminReplies = {};

function isFirebaseConfigured() {
  return ["apiKey", "authDomain", "databaseURL", "projectId", "appId"]
    .every((key) => typeof firebaseConfig[key] === "string" && firebaseConfig[key].trim() !== "");
}

function setRealtimeStatus(text, offline = false) {
  liveStatus.classList.toggle("is-offline", offline);
  liveStatusText.textContent = text;
}

async function initializeRealtime() {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase belum dikonfigurasi. Isi firebase-config.js untuk mengaktifkan RSVP dan ucapan live.");
  }
  if (firebaseReady) return;
  if (!firebaseInitPromise) {
    firebaseInitPromise = (async () => {
      const [appSdk, authSdk, databaseSdk] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js"),
        import("https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js"),
      ]);
      const app = appSdk.getApps().length ? appSdk.getApps()[0] : appSdk.initializeApp(firebaseConfig);
      firebaseDatabase = databaseSdk.getDatabase(app);
      firebaseApi = databaseSdk;
      firebaseAuthApi = authSdk;
      const auth = authSdk.getAuth(app);
      firebaseAuth = auth;
      if (!auth.currentUser) await authSdk.signInAnonymously(auth);
      firebaseReady = true;
      startWishesListener();
    })().catch((error) => {
      firebaseInitPromise = undefined;
      throw error;
    });
  }
  await firebaseInitPromise;
}

function firebaseErrorMessage(error) {
  if (error?.code === "auth/operation-not-allowed") {
    return "Aktifkan Anonymous sign-in di Firebase Console > Authentication > Sign-in method.";
  }
  if (error?.code === "auth/configuration-not-found") {
    return "Layanan Firebase Authentication proyek ini belum aktif. Di Firebase Console proyek undagan-irfan-intan, pilih Authentication > Get started, lalu Sign-in method > Anonymous > Enable. Pastikan konfigurasi Web App berasal dari proyek yang sama.";
  }
  if (error?.code === "PERMISSION_DENIED" || error?.code === "database/permission-denied" || error?.message === "Permission denied") {
    return "Login Firebase berhasil, tetapi database menolak akses. Di Realtime Database > Rules, terbitkan isi database.rules.json pada database yang URL-nya sesuai firebase-config.js.";
  }
  return error?.message || "Tidak dapat terhubung ke Firebase. Periksa koneksi dan konfigurasi proyek.";
}

async function submitForm(form, feedback, successMessage, collection) {
  const button = $("button[type='submit']", form);
  const status = $(feedback);
  status.textContent = "";
  status.classList.remove("is-error");
  button.disabled = true;
  try {
    await initializeRealtime();
    const values = Object.fromEntries(new FormData(form));
    const record = collection === "wishes"
      ? {
        name: values.name.trim(),
        message: values.message.trim(),
        created_at: firebaseApi.serverTimestamp(),
      }
      : {
        name: values.name.trim(),
        attendance: values.attendance,
        guests: values.attendance === "hadir" ? Number(values.guests) : 0,
        created_at: firebaseApi.serverTimestamp(),
      };
    await firebaseApi.set(firebaseApi.push(firebaseApi.ref(firebaseDatabase, collection)), record);
    status.textContent = successMessage;
    form.reset();
    if (collection === "rsvps") {
      updateGuestCount();
      toast(successMessage);
    }
  } catch (error) {
    console.error(`Firebase ${collection} submission failed:`, error);
    const isPermissionDenied = error?.code === "PERMISSION_DENIED"
      || error?.code === "database/permission-denied"
      || error?.message === "Permission denied";
    status.textContent = collection === "rsvps" && isPermissionDenied
      ? "Konfirmasi gagal disimpan: Realtime Database menolak izin tulis RSVP. Pastikan rules live mengizinkan pengguna terautentikasi menulis ke /rsvps, lalu tekan Publish."
      : firebaseErrorMessage(error);
    status.classList.add("is-error");
  } finally {
    button.disabled = false;
  }
}

$("#rsvp-form").addEventListener("submit", (event) => {
  event.preventDefault();
  submitForm(event.currentTarget, "#rsvp-feedback", "Terima kasih, konfirmasi kehadiran Anda sudah tercatat.", "rsvps");
});
const attendance = $("#rsvp-attendance");
const guestCount = $("#rsvp-guests");
function updateGuestCount() {
  const attending = attendance.value === "hadir";
  guestCount.disabled = !attending;
  if (!attending) guestCount.value = "1";
}
attendance.addEventListener("change", updateGuestCount);
updateGuestCount();
$("#wish-form").addEventListener("submit", (event) => {
  event.preventDefault();
  submitForm(event.currentTarget, "#wish-feedback", "Terima kasih atas doa dan ucapan yang indah.", "wishes");
});

function wishKey(wish) {
  return wish.id || [wish.created_at || "", wish.name, wish.message].join("|");
}

function renderWishes(wishes, newWishKeys = new Set()) {
  const list = $("#wishes-list");
  list.replaceChildren();
  $("#wishes-count").textContent = new Intl.NumberFormat("id-ID").format(wishesTotal);
  if (!wishes.length) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "Jadilah yang pertama mengirimkan doa untuk Intan dan Irfan.";
    list.append(empty);
    return;
  }
  wishes.forEach((wish) => {
    const card = document.createElement("article");
    const key = wishKey(wish);
    card.className = newWishKeys.has(key) ? "wish-card wish-card-new" : "wish-card";
    card.dataset.wishId = key;
    const name = document.createElement("h3");
    name.textContent = wish.name;
    const message = document.createElement("p");
    message.textContent = wish.message;
    card.append(name, message);
    if (wish.created_at) {
      const date = document.createElement("time");
      const parsed = new Date(wish.created_at);
      if (!Number.isNaN(parsed.getTime())) {
        date.dateTime = parsed.toISOString();
        date.textContent = parsed.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
        card.append(date);
      }
    }
    const reply = adminReplies[wish.id];
    if (reply?.message) {
      const replyCard = document.createElement("div");
      replyCard.className = "admin-reply";
      const replyHeading = document.createElement("h4");
      replyHeading.className = "admin-reply-heading";
      const replyName = document.createElement("span");
      replyName.textContent = "Admin Intan & Irfan";
      const verified = document.createElement("span");
      verified.className = "verified-check";
      verified.setAttribute("role", "img");
      verified.setAttribute("aria-label", "Admin terverifikasi");
      verified.title = "Admin terverifikasi";
      verified.textContent = "✓";
      replyHeading.append(replyName, verified);
      const replyMessage = document.createElement("p");
      replyMessage.textContent = reply.message;
      replyCard.append(replyHeading, replyMessage);
      card.append(replyCard);
    }
    list.append(card);
  });
}

function startWishesListener() {
  if (!firebaseReady || realtimeStarted) return;
  realtimeStarted = true;
  const list = $("#wishes-list");
  const wishesQuery = firebaseApi.query(
    firebaseApi.ref(firebaseDatabase, "wishes"),
    firebaseApi.orderByChild("created_at"),
    firebaseApi.limitToLast(50),
  );
  firebaseApi.onValue(wishesQuery, (snapshot) => {
    const wishes = [];
    snapshot.forEach((child) => {
      wishes.push({ id: child.key, ...child.val() });
    });
    wishes.reverse();
    currentWishes = wishes;
    wishesTotal = wishes.length;
    const currentWishKeys = new Set(wishes.map(wishKey));
    const newWishKeys = initialWishesLoaded
      ? new Set([...currentWishKeys].filter((key) => !previousWishKeys.has(key)))
      : new Set();
    renderWishes(wishes, newWishKeys);
    if (newWishKeys.size > 0) toast(`${newWishKeys.size} ucapan baru masuk.`);
    previousWishKeys = currentWishKeys;
    initialWishesLoaded = true;
    setRealtimeStatus("Langsung");
  }, (error) => {
    console.error("Firebase guestbook listener failed:", error);
    setRealtimeStatus("Koneksi bermasalah", true);
    list.replaceChildren();
    const message = document.createElement("p");
    message.className = "empty-note";
    message.textContent = firebaseErrorMessage(error);
    list.append(message);
  });
  firebaseApi.onValue(firebaseApi.ref(firebaseDatabase, "admin_replies"), (snapshot) => {
    adminReplies = snapshot.val() || {};
    renderWishes(currentWishes);
    if (!adminRsvpView.hidden) renderAdminWishes(currentAdminWishes);
  }, (error) => {
    console.error("Firebase admin reply listener failed:", error);
    setRealtimeStatus("Koneksi bermasalah", true);
  });
}

const adminEmail = "indonesiaaaa05@gmail.com";
const adminDialog = $("#admin-dialog");
const adminLoginView = $("#admin-login-view");
const adminRsvpView = $("#admin-rsvp-view");
const adminRsvpList = $("#admin-rsvp-list");
let stopAdminRsvpListener;
let stopAdminWishesListener;
let currentWishes = [];
let currentAdminWishes = [];

function renderRsvps(snapshot) {
  const records = [];
  snapshot.forEach((child) => {
    records.push({ id: child.key, ...child.val() });
  });
  records.sort((first, second) => (second.created_at || 0) - (first.created_at || 0));
  const attending = records.filter((record) => record.attendance === "hadir");
  const guestTotal = attending.reduce((total, record) => {
    const guests = Number(record.guests);
    return total + (Number.isFinite(guests) && guests > 0 ? guests : 1);
  }, 0);
  const formatCount = new Intl.NumberFormat("id-ID");
  $("#admin-rsvp-count").textContent = `${formatCount.format(records.length)} konfirmasi · ${formatCount.format(attending.length)} hadir · ${formatCount.format(guestTotal)} tamu hadir`;
  adminRsvpList.replaceChildren();
  if (!records.length) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "Belum ada konfirmasi kehadiran.";
    adminRsvpList.append(empty);
    return;
  }
  records.forEach((record) => {
    const card = document.createElement("article");
    card.className = "admin-rsvp-card";
    const name = document.createElement("h3");
    name.textContent = record.name || "Tanpa nama";
    const attendanceLabel = record.attendance === "hadir" ? "Hadir" : "Tidak dapat hadir";
    const details = document.createElement("p");
    details.textContent = `${attendanceLabel} · ${record.attendance === "hadir" ? `${record.guests || 1} tamu` : "0 tamu"}`;
    card.append(name, details);
    if (Number.isFinite(record.created_at)) {
      const time = document.createElement("time");
      const date = new Date(record.created_at);
      time.dateTime = date.toISOString();
      time.textContent = date.toLocaleString("id-ID", {
        dateStyle: "long",
        timeStyle: "short",
      });
      card.append(time);
    }
    adminRsvpList.append(card);
  });
}

async function showAdminWishes() {
  const isAdmin = firebaseAuth.currentUser?.email?.toLowerCase() === adminEmail;
  if (!isAdmin) {
    showAdminLogin();
    return;
  }
  adminLoginView.hidden = true;
  adminRsvpView.hidden = false;
  $("#admin-login-open").hidden = isAdmin;
  $("#admin-signout").hidden = !isAdmin;
  setAdminTab("rsvps");
  $("#admin-rsvp-feedback").textContent = "";
  $("#admin-rsvp-feedback").classList.remove("is-error");
  $("#admin-wishes-count").textContent = "Memuat semua ucapan tamu...";
  $("#admin-wishes-list").replaceChildren();
  currentAdminWishes = [];
  renderAdminConfirmationWishes(currentAdminWishes);
  if (stopAdminRsvpListener) stopAdminRsvpListener();
  stopAdminRsvpListener = undefined;
  $("#admin-rsvp-count").textContent = isAdmin ? "Memuat konfirmasi..." : "Login admin diperlukan untuk melihat konfirmasi.";
  $("#admin-rsvp-login").hidden = isAdmin;
  adminRsvpList.replaceChildren();
  if (!isAdmin) {
    const note = document.createElement("p");
    note.className = "empty-note";
    note.textContent = "Daftar konfirmasi hanya dapat dilihat oleh admin.";
    adminRsvpList.append(note);
  } else {
    stopAdminRsvpListener = firebaseApi.onValue(
      firebaseApi.ref(firebaseDatabase, "rsvps"),
      renderRsvps,
      (error) => {
        console.error("Firebase admin RSVP listener failed:", error);
        $("#admin-rsvp-count").textContent = "Konfirmasi belum dapat dimuat";
        $("#admin-rsvp-feedback").textContent = firebaseErrorMessage(error);
        $("#admin-rsvp-feedback").classList.add("is-error");
        adminRsvpList.replaceChildren();
        const message = document.createElement("p");
        message.className = "empty-note";
        message.textContent = "Pastikan login menggunakan akun admin dan aturan baca RSVP sudah dipublikasikan di Firebase.";
        adminRsvpList.append(message);
      },
    );
  }
  if (stopAdminWishesListener) stopAdminWishesListener();
  const wishesRef = firebaseApi.ref(firebaseDatabase, "wishes");
  try {
    const snapshot = await firebaseApi.get(wishesRef);
    currentAdminWishes = [];
    snapshot.forEach((child) => {
      currentAdminWishes.push({ id: child.key, ...child.val() });
    });
    renderAdminWishes(currentAdminWishes);
  } catch (error) {
    console.error("Firebase admin wishes load failed:", error);
    $("#admin-wishes-count").textContent = "";
    $("#admin-rsvp-feedback").textContent = firebaseErrorMessage(error);
    $("#admin-rsvp-feedback").classList.add("is-error");
    const message = document.createElement("p");
    message.className = "empty-note";
    message.textContent = "Semua ucapan belum dapat dimuat. Periksa koneksi atau izin Firebase.";
    $("#admin-wishes-list").replaceChildren(message);
    $("#admin-confirmation-wishes-count").textContent = "";
    $("#admin-confirmation-wishes-list").replaceChildren(message.cloneNode(true));
    return;
  }
  const updateWish = (child) => {
    const index = currentAdminWishes.findIndex((wish) => wish.id === child.key);
    const wish = { id: child.key, ...child.val() };
    if (index === -1) currentAdminWishes.push(wish);
    else currentAdminWishes[index] = wish;
    renderAdminWishes(currentAdminWishes);
  };
  const removeWish = (child) => {
    currentAdminWishes = currentAdminWishes.filter((wish) => wish.id !== child.key);
    renderAdminWishes(currentAdminWishes);
  };
  const stopChildAdded = firebaseApi.onChildAdded(wishesRef, updateWish, handleAdminWishesError);
  const stopChildChanged = firebaseApi.onChildChanged(wishesRef, updateWish, handleAdminWishesError);
  const stopChildRemoved = firebaseApi.onChildRemoved(wishesRef, removeWish, handleAdminWishesError);
  stopAdminWishesListener = () => {
    stopChildAdded();
    stopChildChanged();
    stopChildRemoved();
  };
}

function handleAdminWishesError(error) {
  console.error("Firebase admin wishes listener failed:", error);
  $("#admin-wishes-count").textContent = "";
  $("#admin-rsvp-feedback").textContent = firebaseErrorMessage(error);
  $("#admin-rsvp-feedback").classList.add("is-error");
}

async function showAdminRsvps() {
  await showAdminWishes();
}

function showAdminLogin() {
  adminLoginView.hidden = false;
  adminRsvpView.hidden = true;
  $("#admin-password").value = "";
  const feedback = $("#admin-login-feedback");
  feedback.textContent = "";
  feedback.classList.remove("is-error");
  $("#admin-password").focus();
}

function renderAdminWishes(wishes) {
  const records = [...wishes];
  records.sort((first, second) => (second.created_at || 0) - (first.created_at || 0));
  currentAdminWishes = records;
  renderAdminConfirmationWishes(records);
  const list = $("#admin-wishes-list");
  $("#admin-wishes-count").textContent = `${new Intl.NumberFormat("id-ID").format(records.length)} ucapan`;
  list.replaceChildren();
  if (!records.length) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "Belum ada ucapan dari tamu.";
    list.append(empty);
    return;
  }
  records.forEach((record) => {
    const card = document.createElement("article");
    card.className = "admin-rsvp-card admin-wish-card";
    const name = document.createElement("h3");
    name.textContent = record.name || "Tanpa nama";
    const message = document.createElement("p");
    message.className = "admin-wish-message";
    message.textContent = record.message || "";
    card.append(name, message);
    if (Number.isFinite(record.created_at)) {
      const time = document.createElement("time");
      const date = new Date(record.created_at);
      time.dateTime = date.toISOString();
      time.textContent = date.toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" });
      card.append(time);
    }
    const form = document.createElement("form");
    form.className = "admin-reply-form";
    const label = document.createElement("label");
    label.htmlFor = `admin-reply-${record.id}`;
    label.textContent = "Balasan admin";
    const textarea = document.createElement("textarea");
    textarea.id = label.htmlFor;
    textarea.name = "message";
    textarea.maxLength = 500;
    textarea.rows = 2;
    textarea.required = true;
    textarea.placeholder = "Tulis balasan untuk tamu...";
    textarea.value = adminReplies[record.id]?.message || "";
    const actions = document.createElement("div");
    actions.className = "admin-wish-actions";
    const replyButton = document.createElement("button");
    replyButton.className = "button button-dark";
    replyButton.type = "submit";
    replyButton.textContent = adminReplies[record.id] ? "Perbarui balasan" : "Balas";
    const deleteButton = document.createElement("button");
    deleteButton.className = "admin-delete-button";
    deleteButton.type = "button";
    deleteButton.textContent = "Hapus ucapan";
    deleteButton.addEventListener("click", async () => {
      if (!window.confirm(`Hapus ucapan dari ${record.name || "tamu"}?`)) return;
      deleteButton.disabled = true;
      try {
        await firebaseApi.remove(firebaseApi.ref(firebaseDatabase, `wishes/${record.id}`));
        await firebaseApi.remove(firebaseApi.ref(firebaseDatabase, `admin_replies/${record.id}`));
        toast("Ucapan berhasil dihapus.");
      } catch (error) {
        console.error("Firebase wish deletion failed:", error);
        $("#admin-rsvp-feedback").textContent = firebaseErrorMessage(error);
        $("#admin-rsvp-feedback").classList.add("is-error");
        deleteButton.disabled = false;
      }
    });
    actions.append(replyButton, deleteButton);
    form.append(label, textarea, actions);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      replyButton.disabled = true;
      try {
        await firebaseApi.set(firebaseApi.ref(firebaseDatabase, `admin_replies/${record.id}`), {
          message: textarea.value.trim(),
          created_at: firebaseApi.serverTimestamp(),
        });
        toast("Balasan admin terkirim.");
      } catch (error) {
        console.error("Firebase admin reply failed:", error);
        $("#admin-rsvp-feedback").textContent = firebaseErrorMessage(error);
        $("#admin-rsvp-feedback").classList.add("is-error");
      } finally {
        replyButton.disabled = false;
      }
    });
    card.append(form);
    list.append(card);
  });
}

function renderAdminConfirmationWishes(wishes) {
  const records = [...wishes].sort((first, second) => (second.created_at || 0) - (first.created_at || 0));
  const count = $("#admin-confirmation-wishes-count");
  const list = $("#admin-confirmation-wishes-list");
  count.textContent = `${new Intl.NumberFormat("id-ID").format(records.length)} ucapan`;
  list.replaceChildren();
  if (!records.length) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "Belum ada ucapan dari tamu.";
    list.append(empty);
    return;
  }
  records.forEach((record) => {
    const card = document.createElement("article");
    card.className = "admin-rsvp-card";
    const name = document.createElement("h3");
    name.textContent = record.name || "Tanpa nama";
    const message = document.createElement("p");
    message.className = "admin-wish-message";
    message.textContent = record.message || "";
    card.append(name, message);
    if (Number.isFinite(record.created_at)) {
      const time = document.createElement("time");
      const date = new Date(record.created_at);
      time.dateTime = date.toISOString();
      time.textContent = date.toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" });
      card.append(time);
    }
    list.append(card);
  });
}

function setAdminTab(tab) {
  const wishesSelected = tab === "wishes";
  $("#admin-tab-rsvps").classList.toggle("is-active", !wishesSelected);
  $("#admin-tab-rsvps").setAttribute("aria-selected", String(!wishesSelected));
  $("#admin-tab-wishes").classList.toggle("is-active", wishesSelected);
  $("#admin-tab-wishes").setAttribute("aria-selected", String(wishesSelected));
  $("#admin-rsvps-panel").hidden = wishesSelected;
  $("#admin-wishes-panel").hidden = !wishesSelected;
}

$("#admin-tab-rsvps").addEventListener("click", () => setAdminTab("rsvps"));
$("#admin-tab-wishes").addEventListener("click", () => setAdminTab("wishes"));
$("#admin-login-open").addEventListener("click", showAdminLogin);
$("#admin-rsvp-login").addEventListener("click", showAdminLogin);

$("#admin-open").addEventListener("click", async () => {
  adminDialog.showModal();
  showAdminLogin();
  try {
    await initializeRealtime();
    if (firebaseAuth.currentUser?.email?.toLowerCase() === adminEmail) await showAdminRsvps();
  } catch (error) {
    showAdminLogin();
    const loginFeedback = $("#admin-login-feedback");
    $("#admin-login-feedback").textContent = firebaseErrorMessage(error);
    $("#admin-login-feedback").classList.add("is-error");
  }
});

$("#admin-close").addEventListener("click", () => adminDialog.close());
adminDialog.addEventListener("click", (event) => {
  if (event.target === adminDialog) adminDialog.close();
});
adminDialog.addEventListener("close", () => {
  if (stopAdminRsvpListener) {
    stopAdminRsvpListener();
    stopAdminRsvpListener = undefined;
  }
  if (stopAdminWishesListener) {
    stopAdminWishesListener();
    stopAdminWishesListener = undefined;
  }
});

$("#admin-login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("button[type='submit']", event.currentTarget);
  const feedback = $("#admin-login-feedback");
  feedback.textContent = "";
  feedback.classList.remove("is-error");
  button.disabled = true;
  try {
    await initializeRealtime();
    const password = new FormData(event.currentTarget).get("password");
    const credential = await firebaseAuthApi.signInWithEmailAndPassword(firebaseAuth, adminEmail, password);
    if (credential.user.email?.toLowerCase() !== adminEmail) {
      await firebaseAuthApi.signOut(firebaseAuth);
      throw new Error("Akun ini tidak diizinkan membuka panel admin.");
    }
    await showAdminRsvps();
  } catch (error) {
    console.error("Firebase admin sign-in failed:", error);
    feedback.textContent = error?.code === "auth/operation-not-allowed"
      ? "Aktifkan metode Email/Password di Firebase Authentication."
      : error?.code === "auth/invalid-credential" || error?.code === "auth/wrong-password" || error?.code === "auth/user-not-found"
        ? "Email atau password akun admin tidak cocok."
        : firebaseErrorMessage(error);
    feedback.classList.add("is-error");
  } finally {
    button.disabled = false;
  }
});

$("#admin-signout").addEventListener("click", async () => {
  try {
    await firebaseAuthApi.signOut(firebaseAuth);
    await firebaseAuthApi.signInAnonymously(firebaseAuth);
    adminLoginView.hidden = false;
    adminRsvpView.hidden = true;
    setAdminTab("rsvps");
    $("#admin-login-feedback").textContent = "Anda sudah keluar dari panel admin.";
  } catch (error) {
    console.error("Firebase admin sign-out failed:", error);
    $("#admin-rsvp-feedback").textContent = firebaseErrorMessage(error);
  }
});

initializeRealtime()
  .then(() => setRealtimeStatus("Langsung"))
  .catch((error) => {
    console.error("Firebase initialization failed:", error);
    setRealtimeStatus(isFirebaseConfigured() ? "Koneksi bermasalah" : "Perlu konfigurasi", true);
    const message = firebaseErrorMessage(error);
    $("#wish-feedback").textContent = message;
    $("#wish-feedback").classList.add("is-error");
    $("#rsvp-feedback").textContent = message;
    $("#rsvp-feedback").classList.add("is-error");
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = message;
    $("#wishes-list").replaceChildren(empty);
  });

$("#copy-account").addEventListener("click", async () => {
  const account = $("#account-number").textContent.trim();
  try {
    await navigator.clipboard.writeText(account);
    toast("Nomor rekening berhasil disalin.");
  } catch {
    const input = document.createElement("textarea");
    input.value = account;
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.append(input);
    input.select();
    const copied = document.execCommand("copy");
    input.remove();
    toast(copied ? "Nomor rekening berhasil disalin." : "Salin nomor rekening: " + account);
  }
});

const lightbox = $("#lightbox");
$$(".gallery-item").forEach((item) => item.addEventListener("click", () => {
  $("#lightbox-image").src = item.dataset.image;
  lightbox.showModal();
  document.body.classList.add("modal-open");
}));
function closeLightbox() {
  lightbox.close();
  document.body.classList.remove("modal-open");
}
$(".lightbox-close").addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (event) => { if (event.target === lightbox) closeLightbox(); });
lightbox.addEventListener("close", () => document.body.classList.remove("modal-open"));

const backgroundMusic = $("#background-music");
const musicToggle = $("#music-toggle");
const musicPreferenceKey = "intan-irfan-background-music";
backgroundMusic.volume = 0.35;
function setMusicPlaying(isPlaying) {
  musicToggle.setAttribute("aria-pressed", String(isPlaying));
  musicToggle.setAttribute("aria-label", isPlaying ? "Matikan musik latar" : "Putar musik latar");
  musicToggle.classList.toggle("is-playing", isPlaying);
  $(".music-label", musicToggle).textContent = isPlaying ? "Matikan Musik" : "Putar Musik";
}

async function playBackgroundMusic() {
  try {
    await backgroundMusic.play();
    localStorage.setItem(musicPreferenceKey, "true");
    setMusicPlaying(true);
  } catch (error) {
    console.error("Background music playback failed:", error);
    toast("Musik tidak dapat diputar otomatis oleh browser. Tekan Putar Musik untuk mencoba lagi.");
  }
}

musicToggle.addEventListener("click", async () => {
  if (musicToggle.getAttribute("aria-pressed") === "true") {
    localStorage.removeItem(musicPreferenceKey);
    backgroundMusic.pause();
    setMusicPlaying(false);
    return;
  }
  await playBackgroundMusic();
});
backgroundMusic.addEventListener("ended", () => {
  if (localStorage.getItem(musicPreferenceKey) === "true") {
    backgroundMusic.currentTime = 0;
    void playBackgroundMusic();
  } else {
    setMusicPlaying(false);
  }
});
backgroundMusic.addEventListener("error", () => {
  if (!backgroundMusic.src) {
    toast("File musik belum tersedia.");
    return;
  }
});

if (localStorage.getItem(musicPreferenceKey) === "true") {
  void playBackgroundMusic();
}
