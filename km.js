/* KM PLUS — shared site logic */
(function () {
  "use strict";
  // ===== Shop settings: change these to your own =====
  const TELEGRAM_ID = "kmplus_shop";
  const WHATSAPP_NUMBER = "989000000000";
  const SHIPPING = 95000;
  const FREE_OVER = 5000000;

  const B = window.KM_BASE || "";
  const P = window.KM_PRODUCTS || [];
  const BY = Object.fromEntries(P.map((p) => [p.id, p]));
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const FA = "۰۱۲۳۴۵۶۷۸۹";
  const fa = (v) => String(v).replace(/\d/g, (d) => FA[d]);
  const money = (n) => fa(Number(n).toLocaleString("en-US").replace(/,/g, "٬"));
  const toEn = (s) => String(s || "").replace(/[۰-۹]/g, (d) => d.charCodeAt(0) - 1776).replace(/[٠-٩]/g, (d) => d.charCodeAt(0) - 1632);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } },
    set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  };
  window.KM = { fa, money, toEn, esc, B, P, BY };

  // ===== Toast =====
  let toastT;
  function toast(html) {
    let t = $("#toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.innerHTML = html; t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2600);
  }

  // ===== Cart =====
  const cart = {
    all: () => store.get("km_cart", {}),
    save: (c) => { store.set("km_cart", c); badge(); },
    add(id, q) { const c = cart.all(); c[id] = Math.min(20, (c[id] || 0) + (q || 1)); cart.save(c); },
    set(id, q) { const c = cart.all(); if (q <= 0) delete c[id]; else c[id] = Math.min(20, q); cart.save(c); },
    clear() { cart.save({}); },
    lines() { const c = cart.all(); return Object.keys(c).filter((id) => BY[id]).map((id) => ({ p: BY[id], q: c[id] })); },
    count() { return cart.lines().reduce((a, l) => a + l.q, 0); },
    sub() { return cart.lines().reduce((a, l) => a + l.q * l.p.price, 0); },
  };
  function badge() { $$("[data-cart-count]").forEach((b) => { const n = cart.count(); b.textContent = n ? fa(n) : ""; b.dataset.n = n; }); }
  function addAndNotify(id, q) {
    cart.add(id, q || 1);
    toast('✓ به سبد اضافه شد <a href="' + B + 'cart.html">مشاهده سبد</a>');
  }
  window.KM.cart = cart;

  // ===== Account (stored on this device) =====
  async function hash(s) {
    if (window.crypto && crypto.subtle) {
      const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("kmplus:" + s));
      return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
    }
    return btoa(unescape(encodeURIComponent("kmplus:" + s)));
  }
  const acct = {
    users: () => store.get("km_users", {}),
    saveUsers: (u) => store.set("km_users", u),
    me() { const m = store.get("km_session", null); return m ? acct.users()[m] || null : null; },
    update(fn) { const u = acct.users(); const m = store.get("km_session", null); if (!m || !u[m]) return; fn(u[m]); acct.saveUsers(u); },
    async register(name, mobile, pass) {
      const u = acct.users();
      if (u[mobile]) throw new Error("این شماره قبلاً ثبت‌نام کرده. وارد شو.");
      u[mobile] = { name, mobile, email: "", pass: await hash(pass), address: {}, orders: [], since: Date.now() };
      acct.saveUsers(u); store.set("km_session", mobile);
    },
    async login(mobile, pass) {
      const u = acct.users()[mobile];
      if (!u || u.pass !== (await hash(pass))) throw new Error("شماره یا رمز عبور درست نیست.");
      store.set("km_session", mobile);
    },
    logout() { localStorage.removeItem("km_session"); },
  };
  window.KM.acct = acct;
  function accIcon() {
    const me = acct.me();
    $$("[data-acc]").forEach((a) => {
      a.innerHTML = me ? '<span style="font-weight:800;font-size:14px">' + esc((me.name || "؟").trim()[0]) + "</span>" : "👤";
      a.title = me ? "حساب " + me.name : "ورود / ثبت‌نام";
    });
  }

  // ===== Sound =====
  let ctx = null, gainN = null;
  const BUF = {};
  function ac() {
    if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ctx = new A(); gainN = ctx.createGain(); gainN.gain.value = 0.9; gainN.connect(ctx.destination); }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function load(name) {
    if (BUF[name]) return BUF[name];
    BUF[name] = fetch(B + "snd_" + name + ".mp3").then((r) => r.arrayBuffer()).then((b) => new Promise((ok, no) => ctx.decodeAudioData(b, ok, no)));
    return BUF[name];
  }
  function playBuf(name, delay, gain) {
    if (!ac()) return;
    load(name).then((buf) => {
      const s = ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = 0.97 + Math.random() * 0.06;
      const g = ctx.createGain(); g.gain.value = gain || 1; s.connect(g).connect(gainN);
      s.start(ctx.currentTime + 0.01 + (delay || 0));
    }).catch(() => {});
  }
  function keyPress(profile, deep, delay) {
    playBuf(deep ? profile + "_deep" : profile + "_" + Math.floor(Math.random() * 3), delay, 1.3);
    playBuf(profile + "_up", (delay || 0) + (deep ? 0.12 : 0.08), 0.8);
  }
  function typeDemo(profile) { [0, .14, .26, .41, .52, .7, .83, .95, 1.12].forEach((t, i) => keyPress(profile, i === 5, t)); }
  function clickDemo(kind) { [0, .28, .5].forEach((t) => playBuf(kind || "mouse", t, 1.1)); }
  function playFor(p) { if (!p) return; if (p.listen) typeDemo(p.listen); else if (p.mouse) clickDemo(p.mouse); }
  window.KM.sound = { keyPress, typeDemo, clickDemo, playFor };

  // ===== Product card =====
  const CATN = { kb: "کیبورد", mouse: "موس", pad: "موس‌پد", pc: "سیستم کامپیوتر کیس", mon: "مانیتور" };
  function cardHTML(p) {
    const u = B + "p-" + p.id + ".html";
    const snd = p.listen || p.mouse ? '<button class="pc__snd" type="button" data-play="' + p.id + '" aria-label="شنیدن صدا">' + (p.listen ? "🔊" : "🖱️") + "</button>" : "";
    return '<article class="pc"><div class="pc__img"><a href="' + u + '"><img src="' + B + p.img + '" alt="' + esc(p.name) + '" loading="lazy" /></a>' +
      (p.tag ? '<span class="pc__tag">' + esc(p.tag) + "</span>" : "") + snd + "</div>" +
      '<div class="pc__body"><a href="' + u + '"><h3 class="pc__name">' + esc(p.name) + "</h3></a>" +
      '<div class="pc__row"><span class="pc__price">' + money(p.price) + ' <small>تومان</small></span><button class="pc__add" type="button" data-add="' + p.id + '" aria-label="افزودن به سبد">+</button></div></div></article>';
  }
  window.KM.card = cardHTML;

  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-add]");
    if (a) { e.preventDefault(); addAndNotify(a.dataset.add, 1); return; }
    const s = e.target.closest("[data-play]");
    if (s) { e.preventDefault(); e.stopPropagation(); playFor(BY[s.dataset.play]); }
  });

  // ===== Header =====
  function header() {
    const d = $("#drawer");
    $$("[data-burger]").forEach((b) => b.addEventListener("click", () => d && d.classList.add("open")));
    $$("[data-close]").forEach((b) => b.addEventListener("click", () => d && d.classList.remove("open")));
    $$("form[data-search]").forEach((f) => f.addEventListener("submit", (e) => {
      e.preventDefault(); const q = f.querySelector("input").value.trim(); location.href = B + "search.html?q=" + encodeURIComponent(q);
    }));
    $$("[data-year]").forEach((y) => (y.textContent = fa(1405)));
  }

  // ===== Search helper =====
  const norm = (s) => toEn(String(s).toLowerCase()).replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/\u200c/g, " ").replace(/\s+/g, " ");
  const ALIAS = { "ردراگون": "redragon", "گلوریس": "glorious", "ریزر": "razer", "لاجیتک": "logitech", "بلادی": "bloody", "تسکو": "tsco", "بی سیم": "wireless", "گیمینگ": "gaming", "سفید": "white", "اپل": "apple", "سامسونگ": "samsung", "ال جی": "lg", "ایسوس": "asus" };
  function match(p, q) {
    const hay = norm([p.name, p.alt, p.meta, p.note, (p.feats || []).join(" "), p.tag, CATN[p.cat], (p.sub || []).join(" ")].join(" "));
    return norm(q).split(" ").filter(Boolean).every((w) => hay.includes(w) || (ALIAS[w] && hay.includes(ALIAS[w])) || Object.keys(ALIAS).some((k) => ALIAS[k] === w && hay.includes(k)));
  }
  window.KM.match = match;

  // ===== Listing page =====
  function listing() {
    const root = $("[data-listing]"); if (!root) return;
    const cat = root.dataset.listing; const grid = $("#grid"); const cnt = $("#count");
    let sub = new URLSearchParams(location.search).get("t") || "all", sort = "pop";
    const items = P.filter((p) => cat === "all" || p.cat === cat);
    function draw() {
      let list = items.filter((p) => sub === "all" || (p.sub || []).includes(sub));
      if (sort === "low") list = list.slice().sort((a, b) => a.price - b.price);
      if (sort === "high") list = list.slice().sort((a, b) => b.price - a.price);
      grid.innerHTML = list.map(cardHTML).join("");
      cnt.textContent = fa(list.length) + " کالا";
      $$(".chip", root).forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.t === sub)));
    }
    $$(".chip", root).forEach((c) => c.addEventListener("click", () => { sub = c.dataset.t; history.replaceState(null, "", sub === "all" ? location.pathname : "?t=" + sub); draw(); }));
    $("#sort").addEventListener("change", (e) => { sort = e.target.value; draw(); });
    draw();
  }

  function searchPage() {
    const g = $("#sgrid"); if (!g) return;
    const q = new URLSearchParams(location.search).get("q") || "";
    const inp = $("#sq"); inp.value = q;
    function run(v) {
      const list = v.trim() ? P.filter((p) => match(p, v)) : [];
      g.innerHTML = list.map(cardHTML).join("");
      $("#scount").textContent = v.trim() ? (list.length ? fa(list.length) + " نتیجه برای «" + v + "»" : "چیزی برای «" + v + "» پیدا نشد. یه کلمه‌ی دیگه امتحان کن.") : "اسم برند، مدل یا نوع محصول رو بنویس.";
    }
    inp.addEventListener("input", () => { run(inp.value); history.replaceState(null, "", "?q=" + encodeURIComponent(inp.value)); });
    run(q); if (!q) inp.focus();
  }

  // ===== Home rails =====
  function home() {
    $$("[data-rail]").forEach((el) => {
      const ids = el.dataset.rail.split(",");
      el.innerHTML = ids.map((id) => BY[id]).filter(Boolean).map(cardHTML).join("");
    });
    const board = $("#board"); if (!board) return;
    let prof = "linear";
    $$("[data-prof]").forEach((b) => b.addEventListener("click", () => { prof = b.dataset.prof; $$("[data-prof]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); typeDemo(prof); }));
    $$(".key", board).forEach((k) => k.addEventListener("pointerdown", () => { keyPress(prof, k.classList.contains("key--space")); k.classList.add("down"); setTimeout(() => k.classList.remove("down"), 90); }));
    document.addEventListener("keydown", (e) => {
      if (e.repeat || /input|textarea|select/i.test(e.target.tagName)) return;
      const r = board.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
      keyPress(prof, e.code === "Space" || e.code === "Enter");
      const k = $('[data-code="' + e.code + '"]', board); if (k) { k.classList.add("down"); setTimeout(() => k.classList.remove("down"), 90); }
      if (e.code === "Space") e.preventDefault();
    });
    $("#demo") && $("#demo").addEventListener("click", () => typeDemo(prof));
  }

  // ===== Product page =====
  function product() {
    const el = $("[data-product]"); if (!el) return;
    const p = BY[el.dataset.product]; let q = 1;
    const out = $$("[data-qty-out]");
    const setQ = (v) => { q = Math.max(1, Math.min(20, v)); out.forEach((o) => (o.textContent = fa(q))); };
    $$("[data-qty]").forEach((b) => b.addEventListener("click", () => setQ(q + Number(b.dataset.qty))));
    $$("[data-buy]").forEach((b) => b.addEventListener("click", () => addAndNotify(p.id, q)));
    $$("[data-buynow]").forEach((b) => b.addEventListener("click", () => { cart.add(p.id, q); location.href = B + "checkout.html"; }));
    $$("[data-listen-btn]").forEach((b) => b.addEventListener("click", () => playFor(p)));
    $$("[data-share]").forEach((b) => b.addEventListener("click", async () => {
      try { if (navigator.share) await navigator.share({ title: p.name, url: location.href }); else { await navigator.clipboard.writeText(location.href); toast("لینک کپی شد"); } } catch (e) {}
    }));
    const rel = $("#related");
    if (rel) {
      const same = P.filter((x) => x.cat === p.cat && x.id !== p.id);
      const near = same.sort((a, b) => Math.abs(a.price - p.price) - Math.abs(b.price - p.price)).slice(0, 4);
      rel.innerHTML = near.map(cardHTML).join("");
    }
    document.body.classList.add("has-sticky");
    // recently viewed
    const rv = store.get("km_recent", []).filter((x) => x !== p.id); rv.unshift(p.id); store.set("km_recent", rv.slice(0, 8));
  }

  // ===== Cart page =====
  function cartPage() {
    const list = $("#cartList"); if (!list) return;
    function draw() {
      const lines = cart.lines();
      $("#cartWrap").hidden = !lines.length; $("#cartEmpty").hidden = !!lines.length;
      list.innerHTML = lines.map((l) => '<div class="ci"><a href="' + B + "p-" + l.p.id + '.html"><img src="' + B + l.p.img + '" alt="" /></a><div><h3><a href="' + B + "p-" + l.p.id + '.html">' + esc(l.p.name) + '</a></h3><div class="ci__row"><div class="qty"><button type="button" data-cq="' + l.p.id + '" data-d="1" aria-label="بیشتر">+</button><span>' + fa(l.q) + '</span><button type="button" data-cq="' + l.p.id + '" data-d="-1" aria-label="کمتر">−</button></div><b>' + money(l.q * l.p.price) + ' <small class="muted">تومان</small></b></div><button class="rm" type="button" data-rm="' + l.p.id + '">حذف</button></div></div>').join("");
      totals();
    }
    list.addEventListener("click", (e) => {
      const b = e.target.closest("[data-cq]"); if (b) { const id = b.dataset.cq; cart.set(id, (cart.all()[id] || 0) + Number(b.dataset.d)); draw(); }
      const r = e.target.closest("[data-rm]"); if (r) { cart.set(r.dataset.rm, 0); draw(); }
    });
    draw();
  }
  function totals() {
    const sub = cart.sub(), ship = sub >= FREE_OVER || !sub ? 0 : SHIPPING;
    $$("[data-sub]").forEach((x) => (x.textContent = money(sub) + " تومان"));
    $$("[data-ship]").forEach((x) => (x.textContent = ship ? money(ship) + " تومان" : "رایگان"));
    $$("[data-total]").forEach((x) => (x.textContent = money(sub + ship) + " تومان"));
    $$("[data-count]").forEach((x) => (x.textContent = fa(cart.count())));
    const left = FREE_OVER - sub;
    $$("[data-free]").forEach((x) => (x.textContent = left > 0 ? money(left) + " تومان دیگه تا ارسال رایگان" : "🎉 ارسال این سفارش رایگانه"));
    $$("[data-bar]").forEach((x) => (x.style.width = Math.min(100, (sub / FREE_OVER) * 100) + "%"));
    return { sub, ship, total: sub + ship };
  }

  // ===== Checkout =====
  const PROVINCES = ["آذربایجان شرقی","آذربایجان غربی","اردبیل","اصفهان","البرز","ایلام","بوشهر","تهران","چهارمحال و بختیاری","خراسان جنوبی","خراسان رضوی","خراسان شمالی","خوزستان","زنجان","سمنان","سیستان و بلوچستان","فارس","قزوین","قم","کردستان","کرمان","کرمانشاه","کهگیلویه و بویراحمد","گلستان","گیلان","لرستان","مازندران","مرکزی","هرمزگان","همدان","یزد"];
  function fillProv(sel) { if (!sel || sel.options.length > 1) return; PROVINCES.forEach((p) => { const o = document.createElement("option"); o.value = o.textContent = p; sel.appendChild(o); }); }
  function checkout() {
    const f = $("#orderForm"); if (!f) return;
    fillProv($("#f-province"));
    const lines = cart.lines();
    if (!lines.length) { $("#coWrap").hidden = true; $("#coEmpty").hidden = false; return; }
    $("#coItems").innerHTML = lines.map((l) => '<div class="sumrow"><span>' + esc(l.p.name) + " × " + fa(l.q) + "</span><span>" + money(l.q * l.p.price) + "</span></div>").join("");
    totals();
    const me = acct.me();
    if (me) {
      const a = me.address || {};
      f.name.value = me.name || ""; f.mobile.value = me.mobile || "";
      ["province", "city", "address", "postal"].forEach((k) => a[k] && (f[k].value = a[k]));
      $("#coLogin").hidden = true;
    }
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = Object.fromEntries(new FormData(f).entries());
      const errs = {};
      if (v.name.trim().length < 3) errs.name = "نام و نام خانوادگی رو کامل بنویس.";
      if (!/^09\d{9}$/.test(toEn(v.mobile).replace(/\s|-/g, ""))) errs.mobile = "شماره موبایل باید ۱۱ رقم و با ۰۹ شروع بشه.";
      if (!v.province) errs.province = "استان رو انتخاب کن.";
      if (v.city.trim().length < 2) errs.city = "شهر رو بنویس.";
      if (v.address.trim().length < 10) errs.address = "آدرس رو کامل‌تر بنویس.";
      if (!/^\d{10}$/.test(toEn(v.postal).replace(/\s|-/g, ""))) errs.postal = "کد پستی ۱۰ رقمه.";
      if (!v.terms) errs.terms = "برای ثبت سفارش، مقررات رو بپذیر.";
      $$(".err", f).forEach((x) => (x.textContent = ""));
      Object.keys(errs).forEach((k) => { const x = $("#e-" + k); if (x) x.textContent = errs[k]; });
      if (Object.keys(errs).length) { const first = f.querySelector('[name="' + Object.keys(errs)[0] + '"]'); first && first.focus(); return; }
      const t = totals();
      const code = "KM-" + Date.now().toString().slice(-6);
      const order = { code, date: Date.now(), items: lines.map((l) => ({ id: l.p.id, name: l.p.name, q: l.q, price: l.p.price })), ...t, pay: v.pay, name: v.name, mobile: toEn(v.mobile), address: v.province + "، " + v.city + "، " + v.address, postal: toEn(v.postal), notes: v.notes || "" };
      if (me) acct.update((u) => { u.orders = [order].concat(u.orders || []); u.address = { province: v.province, city: v.city, address: v.address, postal: toEn(v.postal) }; });
      const msg = ["سلام، سفارش جدید از سایت KM PLUS", "کد سفارش: " + code, ""].concat(order.items.map((i) => "• " + i.name + " × " + i.q + " = " + money(i.q * i.price) + " تومان"), ["", "جمع کالاها: " + money(t.sub) + " تومان", "ارسال: " + (t.ship ? money(t.ship) + " تومان" : "رایگان"), "مبلغ نهایی: " + money(t.total) + " تومان", "پرداخت: " + v.pay, "", "نام: " + v.name, "موبایل: " + order.mobile, "آدرس: " + order.address, "کد پستی: " + order.postal]).concat(v.notes ? ["توضیحات: " + v.notes] : []).join("\n");
      $("#coWrap").hidden = true; const done = $("#coDone"); done.hidden = false;
      $("#orderCode").textContent = code; $("#doneTotal").textContent = money(t.total) + " تومان";
      $("#tgBtn").href = "https://t.me/" + TELEGRAM_ID;
      $("#waBtn").href = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(msg);
      $("#tgBtn").addEventListener("click", () => { navigator.clipboard && navigator.clipboard.writeText(msg).then(() => toast("متن سفارش کپی شد؛ در تلگرام بچسبون")); });
      cart.clear(); scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // ===== Account page =====
  function account() {
    const root = $("#account"); if (!root) return;
    const authBox = $("#authBox"), dash = $("#dash");
    function show() {
      const me = acct.me(); authBox.hidden = !!me; dash.hidden = !me; accIcon();
      if (!me) return;
      $("#hiName").textContent = me.name; $("#hiAv").textContent = (me.name || "؟").trim()[0]; $("#hiMob").textContent = fa(me.mobile);
      const os = me.orders || [];
      $("#orders").innerHTML = os.length ? os.map((o) => '<div class="order"><div class="order__top"><b>' + o.code + '</b><span class="pill">ثبت شده · در انتظار تأیید</span></div><p class="muted" style="margin:6px 0">' + new Date(o.date).toLocaleDateString("fa-IR") + " · " + fa(o.items.reduce((a, i) => a + i.q, 0)) + " کالا · " + money(o.total) + " تومان</p><div>" + o.items.map((i) => esc(i.name) + " × " + fa(i.q)).join("<br>") + "</div></div>").join("") : '<div class="empty"><i>📦</i>هنوز سفارشی ثبت نکردی.<br><a class="btn btn--primary" style="margin-top:12px" href="' + B + 'keyboards.html">شروع خرید</a></div>';
      const pf = $("#profileForm"); pf.name.value = me.name || ""; pf.email.value = me.email || "";
      const af = $("#addrForm"); fillProv(af.province); const a = me.address || {}; ["province", "city", "address", "postal"].forEach((k) => (af[k].value = a[k] || ""));
      const rv = store.get("km_recent", []).map((id) => BY[id]).filter(Boolean);
      $("#recent").innerHTML = rv.length ? rv.map(cardHTML).join("") : '<p class="muted">هنوز محصولی ندیدی.</p>';
    }
    // tabs
    $$("[data-tab]").forEach((b) => b.addEventListener("click", () => {
      $$("[data-tab]").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
      $$("[data-pane]").forEach((p) => (p.hidden = p.dataset.pane !== b.dataset.tab));
    }));
    $$("[data-seg]").forEach((b) => b.addEventListener("click", () => {
      $$("[data-seg]").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
      $("#loginForm").hidden = b.dataset.seg !== "login"; $("#regForm").hidden = b.dataset.seg !== "reg";
    }));
    const mob = (v) => toEn(v).replace(/\s|-/g, "");
    $("#loginForm").addEventListener("submit", async (e) => {
      e.preventDefault(); const f = e.target; const err = $("#e-login");
      try { await acct.login(mob(f.mobile.value), f.pass.value); show(); toast("خوش اومدی!"); } catch (x) { err.textContent = x.message; }
    });
    $("#regForm").addEventListener("submit", async (e) => {
      e.preventDefault(); const f = e.target; const err = $("#e-reg"); const m = mob(f.mobile.value);
      if (f.name.value.trim().length < 3) return (err.textContent = "نام و نام خانوادگی رو بنویس.");
      if (!/^09\d{9}$/.test(m)) return (err.textContent = "شماره موبایل باید ۱۱ رقم و با ۰۹ شروع بشه.");
      if (f.pass.value.length < 6) return (err.textContent = "رمز عبور حداقل ۶ کاراکتر باشه.");
      if (f.pass.value !== f.pass2.value) return (err.textContent = "تکرار رمز عبور یکی نیست.");
      try { await acct.register(f.name.value.trim(), m, f.pass.value); show(); toast("حسابت ساخته شد 🎉"); } catch (x) { err.textContent = x.message; }
    });
    $("#profileForm").addEventListener("submit", (e) => { e.preventDefault(); const f = e.target; acct.update((u) => { u.name = f.name.value.trim() || u.name; u.email = f.email.value.trim(); }); show(); toast("ذخیره شد"); });
    $("#addrForm").addEventListener("submit", (e) => { e.preventDefault(); const f = e.target; acct.update((u) => { u.address = { province: f.province.value, city: f.city.value, address: f.address.value, postal: toEn(f.postal.value) }; }); toast("آدرس ذخیره شد"); });
    $("#logout").addEventListener("click", () => { acct.logout(); show(); toast("از حساب خارج شدی"); });
    show();
  }

  // ===== Contact =====
  function contact() {
    const f = $("#contactForm"); if (!f) return;
    $$("[data-tg]").forEach((a) => (a.href = "https://t.me/" + TELEGRAM_ID));
    $$("[data-wa]").forEach((a) => (a.href = "https://wa.me/" + WHATSAPP_NUMBER));
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      if (f.msg.value.trim().length < 5) { $("#e-msg").textContent = "پیامت رو بنویس."; return; }
      const t = "سلام KM PLUS\nنام: " + f.name.value + "\nموضوع: " + f.topic.value + "\n" + f.msg.value;
      window.open("https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(t), "_blank", "noopener");
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    $$("[data-tg]").forEach((a) => (a.href = "https://t.me/" + TELEGRAM_ID));
    $$("[data-wa]").forEach((a) => (a.href = "https://wa.me/" + WHATSAPP_NUMBER));
    header(); badge(); accIcon(); home(); listing(); searchPage(); product(); cartPage(); checkout(); account(); contact();
  });
})();
