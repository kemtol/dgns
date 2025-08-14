/* ===== App State ===== */
const state = {
  onboarded: JSON.parse(localStorage.getItem("onboarded") || "false"),
  user: JSON.parse(localStorage.getItem("user") || "{}"),
};
let deferredPrompt = null;

/* ===== Helpers ===== */
const genPid = () => {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `DG-${t}-${r}`;
};

function showSection(id) {
  // sembunyikan semua page
  $("section.page").addClass("hidden");

  // tampilkan target
  const $sec = $("#" + id);
  if ($sec.length) $sec.removeClass("hidden");

  // halaman app vs onboarding
  const appPages = ["home", "riwayat", "layanan", "akun"];
  const isApp = appPages.includes(id);

  // tampilkan header & bottom nav hanya di halaman app
  $("#appHeader").toggleClass("d-none", !isApp);
  $("#bottomNav").toggleClass("d-none", !isApp);

  // set active nav
  if (isApp) {
    $("#bottomNav .nav-link").removeClass("active");
    $('#bottomNav .nav-link[data-go="' + id + '"]').addClass("active");
  }

  // kalau user sudah onboarded, jangan pernah tampilkan splash
  if (state.onboarded && id === "onb-splash") {
    location.replace("#home");
  }
}

function handleRoute() {
  let id = (location.hash || "").replace(/^#/, "");
  if (!id) id = state.onboarded ? "home" : "onb-splash";
  showSection(id);
}

/* ===== DOM Ready ===== */
document.addEventListener("DOMContentLoaded", () => {
  // 1) Tentukan hash awal dengan benar (tampilkan splash hanya untuk user baru)
  if (!location.hash) {
    location.replace("#" + (state.onboarded ? "home" : "onb-splash"));
  }

  // 2) Render pertama
  handleRoute();

  // 3) Kalau memang sedang di splash & user belum onboarded, kasih delay lalu pindah
  if (!state.onboarded && location.hash === "#onb-splash") {
    // jangan meng-hide splash manual; biarkan tetap tampil
    setTimeout(() => {
      // pindah halus ke welcome, router akan meng-hide splash
      location.replace("#onb-welcome");
    }, 3000); // 1000–1200ms cukup nyaman
  }

  // 4) Router jalan saat hash berubah
  window.addEventListener("hashchange", handleRoute);

  // 5) Nav via [data-go]
  $(document).on("click", "[data-go]", function () {
    const target = this.getAttribute("data-go");
    if (target) location.hash = target;
  });

  // 6) Submit form onboarding
  // Matikan validasi HTML5 (wajib agar submit event tetap terpanggil meski kosong)
  $("#formOnb")
    .attr("novalidate", "novalidate")
    .find("[required],[pattern]")
    .removeAttr("required pattern");

  // Ganti handler submit-nya jadi ini
  $("#formOnb")
    .off("submit")
    .on("submit", function (e) {
      e.preventDefault();

      // Ambil raw form lalu isi default bila kosong
      const raw = Object.fromEntries(new FormData(this).entries());
      const data = {
        name: (raw.name || "").trim() || "Guest",
        nik:
          (raw.nik || "").replace(/\D/g, "").slice(0, 16) || "0000000000000000",
        phone: (raw.phone || "").trim() || "-", // biarkan '-' jika kosong
      };

      state.user = {
        ...state.user,
        ...data,
        nikVerified: false,
        patientId: genPid(),
      };
      state.onboarded = true;
      localStorage.setItem("user", JSON.stringify(state.user));
      localStorage.setItem("onboarded", "true");

      $("#successPatientId").text(state.user.patientId || "-");
      $("#successNikStatus").text(
        state.user.nikVerified ? "Terverifikasi" : "Belum Verifikasi"
      );

      location.replace("#onb-success");
    });

  // 7) (Opsional) PWA install
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    $("#installBtn").removeClass("d-none");
  });
  $("#installBtn").on("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    $("#installBtn").addClass("d-none");
  });

  // 8) SW (tidak mengubah perilaku splash)
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(console.error);
  }
});
