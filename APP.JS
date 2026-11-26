"use strict";
const $ = (s, r = document) => r.querySelector(s);
const HARI = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const api = async (url, method = "GET", body) => {
  const r = await fetch(url, {method, headers: {"Content-Type": "application/json"}, body: body && JSON.stringify(body)});
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Terjadi kesalahan");
  return d;
};
const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad = n => String(n).padStart(2, "0");
const kunci = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const fmt = s => { const d = new Date(s); return `${d.getDate()} ${BULAN[d.getMonth()].slice(0,3)} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`; };

/* ===== Tema gelap/terang ===== */
$("#tema")?.addEventListener("click", () => {
  const t = document.documentElement.dataset.tema === "gelap" ? "terang" : "gelap";
  document.documentElement.dataset.tema = t; localStorage.setItem("tema", t);
});

/* ===== Toast ===== */
function toast(teks) {
  const el = Object.assign(document.createElement("div"), {className: "toast", textContent: teks});
  $("#toast-area").append(el); setTimeout(() => el.remove(), 7000);
}

/* ===== Nada dering (dibuat dengan Web Audio, tanpa file) ===== */
const NADA = [
  [[523,.15],[659,.15],[784,.15],[1047,.35],[784,.15],[1047,.4]],   // Ceria
  [[880,.5],[660,.5],[880,.5],[660,.5],[880,.7]],                    // Lonceng
  [[1000,.12],[0,.08],[1000,.12],[0,.08],[1000,.12],[0,.3],[1400,.4]] // Digital
];
let ctx;
function bunyi() {
  ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
  ctx.resume();
  let t = ctx.currentTime;
  for (const [f, d] of NADA[+(localStorage.getItem("nada") || 0)]) {
    if (f) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(.25, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
      o.start(t); o.stop(t + d);
    }
    t += d;
  }
}

/* ===== Halaman Login ===== */
function halamanLogin() {
  let mode = "masuk"; const mk = $("#maskot"), kartu = $(".login-kartu");
  document.querySelectorAll(".tab button").forEach(b => b.onclick = () => {
    mode = b.dataset.mode;
    document.querySelectorAll(".tab button").forEach(x => x.classList.toggle("aktif", x === b));
    $("#nama").classList.toggle("hide", mode === "masuk");
    $("#nama").required = mode === "daftar";
    $("#kirim").textContent = mode === "masuk" ? "Masuk 🚀" : "Buat Akun ✨";
  });
  $("#pw").addEventListener("focus", () => mk.classList.add("tutup"));
  $("#pw").addEventListener("blur", () => mk.classList.remove("tutup"));
  $("#email").addEventListener("input", () => mk.classList.add("senang"));
  $("#form-login").addEventListener("submit", async e => {
    e.preventDefault(); $("#galat").textContent = "";
    try {
      await api(mode === "masuk" ? "/masuk" : "/daftar", "POST",
        {nama: $("#nama").value, email: $("#email").value, password: $("#pw").value});
      mk.className = "maskot senang"; setTimeout(() => location.href = "/beranda", 600);
    } catch (err) {
      $("#galat").textContent = err.message;
      mk.className = "maskot sedih"; kartu.classList.remove("goyang"); void kartu.offsetWidth; kartu.classList.add("goyang");
    }
  });
}

/* ===== Halaman Beranda ===== */
let D = {jadwal: [], tugas: []}, tab = "aktif", kal = new Date(), dipilih = null;

async function muat() { D = await api("/api/data"); gambar(); }

function gambar() {
  const now = new Date(), hari = HARI[now.getDay()], mnt = now.getHours() * 60 + now.getMinutes();
  $("#info-hari").textContent = `Hari ini: ${hari}, ${now.getDate()} ${BULAN[now.getMonth()]}`;
  const urut = [...D.jadwal].sort((a, b) => HARI.indexOf(a.hari) - HARI.indexOf(b.hari) || a.mulai.localeCompare(b.mulai));
  $("#jadwal").innerHTML = urut.map(j => {
    const [h1, m1] = j.mulai.split(":"), [h2, m2] = j.selesai.split(":");
    const sekarang = j.hari === hari && mnt >= +h1*60 + +m1 && mnt <= +h2*60 + +m2;
    return `<div class="item ${sekarang ? "sekarang" : ""}"><span class="jam">${esc(j.hari)}<br>${j.mulai}–${j.selesai}</span>
      <div class="isi"><b>${esc(j.matkul)}</b><br><small>${esc(j.ruang) || "-"}${sekarang ? " · 🟢 Sedang berlangsung" : ""}</small></div>
      <button class="x" onclick="hapus('jadwal',${j.id})">🗑️</button></div>`;
  }).join("") || '<p class="redup">Belum ada jadwal.</p>';

  const daftar = D.tugas.filter(t => tab === "aktif" ? !t.selesai : t.selesai);
  if (tab === "riwayat") daftar.sort((a, b) => (b.selesai_pada || "").localeCompare(a.selesai_pada || ""));
  $("#tugas").innerHTML = daftar.map(t => {
    const lewat = !t.selesai && new Date(t.deadline) < now;
    return `<div class="item ${t.selesai ? "beres" : lewat ? "lewat" : ""}">
      <button class="btn kecil" onclick="selesai(${t.id})">${t.selesai ? "↩ Batal" : "✓ Selesai"}</button>
      <div class="isi"><b>${esc(t.judul)}</b> <small>${esc(t.matkul)}</small><br>
      <small>${t.selesai ? "✅ Selesai " + fmt(t.selesai_pada.replace(" ", "T")) : (lewat ? "⚠️ Terlewat: " : "⏰ Deadline: ") + fmt(t.deadline)}</small></div>
      <button class="x" onclick="hapus('tugas',${t.id})">🗑️</button></div>`;
  }).join("") || `<p class="redup">${tab === "aktif" ? "Tidak ada tugas. Santai dulu! 🎉" : "Belum ada riwayat."}</p>`;
  kalender();
}

function kalender() {
  const y = kal.getFullYear(), m = kal.getMonth(), awal = new Date(y, m, 1).getDay(), jml = new Date(y, m + 1, 0).getDate();
  $("#bulan").textContent = `${BULAN[m]} ${y}`;
  const peta = {}; D.tugas.forEach(t => (peta[kunci(new Date(t.deadline))] ||= []).push(t));
  let h = HARI.map(x => `<b>${x.slice(0,3)}</b>`).join("") + '<span class="kosong"></span>'.repeat(awal);
  for (let i = 1; i <= jml; i++) {
    const d = new Date(y, m, i), k = kunci(d), ts = peta[k] || [];
    const dots = ts.map(t => `<i class="titik ${t.selesai ? "hijau" : new Date(t.deadline) < new Date() ? "merah" : "biru"}"></i>`).join("");
    h += `<button data-k="${k}" class="${k === kunci(new Date()) ? "hari-ini" : ""}">${i}<span class="dots">${dots}</span></button>`;
  }
  $("#kal").innerHTML = h;
  $("#kal").querySelectorAll("button").forEach(b => b.onclick = () => {
    const ts = peta[b.dataset.k] || [];
    $("#kal-detail").innerHTML = ts.length ? ts.map(t => `• <b>${esc(t.judul)}</b> (${fmt(t.deadline)})`).join("<br>") : "Tidak ada tugas di tanggal ini.";
  });
}

window.hapus = async (jenis, id) => { if (confirm("Hapus item ini?")) { await api(`/api/${jenis}/${id}`, "DELETE"); muat(); } };
window.selesai = async id => { await api(`/api/tugas/${id}/selesai`, "POST"); muat(); };

/* Pengingat: cek tiap 30 detik, bunyi + notifikasi pada H-24 jam, H-1 jam, dan saat lewat */
function cekPengingat() {
  const sudah = JSON.parse(localStorage.getItem("diingatkan") || "{}"), now = Date.now();
  D.tugas.filter(t => !t.selesai).forEach(t => {
    const sisa = (new Date(t.deadline) - now) / 6e4;
    const tahap = sisa < 0 ? "lewat" : sisa <= 60 ? "1j" : sisa <= 1440 ? "24j" : null;
    if (!tahap || sudah[t.id + tahap]) return;
    sudah[t.id + tahap] = 1;
    const pesan = {lewat: "sudah melewati deadline!", "1j": "deadline kurang dari 1 jam lagi!", "24j": "deadline dalam 24 jam."}[tahap];
    bunyi(); toast(`⏰ Tugas "${t.judul}" ${pesan}`);
    if (Notification.permission === "granted") new Notification("Si Siswa", {icon: "/static/icon.svg", body: `${t.judul} ${pesan}`});
  });
  localStorage.setItem("diingatkan", JSON.stringify(sudah));
}

function halamanBeranda() {
  $("#nada").value = localStorage.getItem("nada") || 0;
  $("#nada").onchange = e => localStorage.setItem("nada", e.target.value);
  $("#tes").onclick = bunyi;
  $("#izin").onclick = async () => toast((await Notification.requestPermission()) === "granted" ? "Notifikasi aktif ✅" : "Notifikasi ditolak. Pengingat tetap muncul di halaman.");
  $("#prev").onclick = () => { kal.setMonth(kal.getMonth() - 1); kalender(); };
  $("#next").onclick = () => { kal.setMonth(kal.getMonth() + 1); kalender(); };
  document.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => {
    tab = b.dataset.tab; document.querySelectorAll("[data-tab]").forEach(x => x.classList.toggle("aktif", x === b)); gambar();
  });
  for (const [id, url] of [["#f-jadwal", "/api/jadwal"], ["#f-tugas", "/api/tugas"]])
    $(id).onsubmit = async e => { e.preventDefault(); await api(url, "POST", Object.fromEntries(new FormData(e.target))); e.target.reset(); muat(); };
  muat().then(cekPengingat); setInterval(() => { muat().then(cekPengingat); }, 30000);
}

/* ===== Halaman Profil ===== */
async function halamanProfil() {
  const d = await api("/api/data");
  $("#p-nama").textContent = d.user.nama; $("#p-email").textContent = d.user.email;
  $("#avatar").textContent = d.user.nama[0].toUpperCase(); $("#in-nama").value = d.user.nama;
  $("#s-jadwal").textContent = d.jadwal.length;
  $("#s-aktif").textContent = d.tugas.filter(t => !t.selesai).length;
  $("#s-selesai").textContent = d.tugas.filter(t => t.selesai).length;
  $("#f-profil").onsubmit = async e => { e.preventDefault(); await api("/api/profil", "POST", {nama: $("#in-nama").value}); toast("Nama berhasil disimpan ✅"); halamanProfil(); };
}

({login: halamanLogin, beranda: halamanBeranda, profil: halamanProfil})[document.body.dataset.page]?.();