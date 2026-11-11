(() => {
  const data = JSON.parse(document.getElementById("gallery-data").textContent);
  const { site, photos } = data;
  const $ = (id) => document.getElementById(id);

  // ---------- header, about, footer ----------
  $("site-title").textContent = site.title;
  $("tagline").textContent = site.tagline;
  $("photographer").textContent = [site.photographer, site.location].filter(Boolean).join("  ·  ");
  $("footer-text").textContent = `© ${new Date().getFullYear()} ${site.photographer || site.title}`;

  const paragraphs = (text) =>
    text.split(/\n\s*\n/).map((p) => {
      const el = document.createElement("p");
      el.textContent = p.replace(/\n/g, " ");
      return el;
    });

  const links = [];
  if (site.contact) links.push([site.contact.includes("@") && !site.contact.startsWith("http") ? `mailto:${site.contact}` : site.contact, "Contact"]);
  if (site.instagram) links.push([site.instagram.startsWith("http") ? site.instagram : `https://instagram.com/${site.instagram.replace(/^@/, "")}`, "Instagram"]);
  if (site.astrobin) links.push([site.astrobin.startsWith("http") ? site.astrobin : `https://www.astrobin.com/users/${site.astrobin}/`, "AstroBin"]);
  if (site.about || links.length) {
    $("about").hidden = false;
    $("about-text").append(...paragraphs(site.about || ""));
    for (const [href, label] of links) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = href; a.textContent = label; a.rel = "noopener"; if (!href.startsWith("mailto:")) a.target = "_blank";
      li.append(a); $("links").append(li);
    }
  } else {
    $("about-link").hidden = true;
  }

  // ---------- gallery + filters ----------
  const fmtDate = (d) => {
    if (!d) return "";
    const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(d);
    if (!m) return d;
    const date = new Date(+m[1], +m[2] - 1, +(m[3] || 1));
    return date.toLocaleDateString(undefined, m[3] ? { year: "numeric", month: "long", day: "numeric" } : { year: "numeric", month: "long" });
  };

  const categories = [...new Set(photos.map((p) => p.category).filter(Boolean))].sort();
  let active = "All";
  let visible = photos;

  function renderFilters() {
    $("filters").innerHTML = "";
    if (categories.length < 2) return;
    for (const c of ["All", ...categories]) {
      const b = document.createElement("button");
      b.className = "chip"; b.textContent = c; b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(c === active));
      b.onclick = () => { active = c; renderFilters(); renderGrid(); };
      $("filters").append(b);
    }
  }

  function renderGrid() {
    visible = active === "All" ? photos : photos.filter((p) => p.category === active);
    const grid = $("grid");
    grid.innerHTML = "";
    $("empty").hidden = photos.length > 0;
    $("count").textContent = photos.length ? `${visible.length} image${visible.length === 1 ? "" : "s"}` : "";
    visible.forEach((p, i) => {
      const card = document.createElement("button");
      card.className = "card";
      card.setAttribute("aria-label", `Open ${p.title}`);
      const img = new Image();
      img.loading = "lazy"; img.decoding = "async";
      img.width = p.w; img.height = p.h; img.alt = p.title;
      img.onload = () => img.classList.add("loaded");
      img.src = p.thumb;
      const cap = document.createElement("div");
      cap.className = "cap";
      const t = document.createElement("strong"); t.textContent = p.title;
      const s = document.createElement("span"); s.textContent = [p.category, fmtDate(p.date)].filter(Boolean).join(" · ");
      cap.append(t, s);
      card.append(img, cap);
      card.onclick = () => openPhoto(i);
      grid.append(card);
    });
  }

  // ---------- lightbox ----------
  const lb = $("lightbox"), lbImg = $("lb-img");
  let index = -1, lastFocus = null;

  function show(i) {
    index = (i + visible.length) % visible.length;
    const p = visible[index];
    lbImg.classList.add("loading"); $("lb-spinner").classList.add("on");
    const next = new Image();
    next.onload = next.onerror = () => {
      if (visible[index] !== p) return;
      lbImg.src = p.display; lbImg.alt = p.title;
      lbImg.classList.remove("loading"); $("lb-spinner").classList.remove("on");
    };
    next.src = p.display;
    // preload neighbours so arrowing through is instant
    [index + 1, index - 1].forEach((j) => { const q = visible[(j + visible.length) % visible.length]; if (q) new Image().src = q.display; });

    $("lb-title").textContent = p.title;
    $("lb-meta").textContent = [p.category, fmtDate(p.date)].filter(Boolean).join("  ·  ");
    $("lb-desc").replaceChildren(...paragraphs(p.description || ""));
    const dl = $("lb-details"); dl.innerHTML = "";
    for (const [k, v] of p.details) {
      const dt = document.createElement("dt"); dt.textContent = k;
      const dd = document.createElement("dd"); dd.textContent = v;
      dl.append(dt, dd);
    }
    const dlBtn = $("lb-download");
    dlBtn.hidden = !p.full;
    if (p.full) dlBtn.href = p.full;
    $("lb-prev").hidden = $("lb-next").hidden = visible.length < 2;
    history.replaceState(null, "", `#${p.id}`);
  }

  function openPhoto(i) {
    lastFocus = document.activeElement;
    lb.hidden = false;
    document.body.style.overflow = "hidden";
    show(i);
    $("lb-close").focus({ preventScroll: true });
  }

  function close() {
    lb.hidden = true;
    document.body.style.overflow = "";
    lbImg.removeAttribute("src");
    history.replaceState(null, "", location.pathname + location.search);
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }

  $("lb-close").onclick = $("lb-close2").onclick = close;
  $("lb-prev").onclick = () => show(index - 1);
  $("lb-next").onclick = () => show(index + 1);
  $("lb-toggle").onclick = () => lb.classList.toggle("info-hidden");
  lbImg.onclick = () => { if (matchMedia("(max-width: 860px)").matches) lb.classList.toggle("info-hidden"); };
  $("lb-share").onclick = async () => {
    const url = location.href;
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) await navigator.share({ title: visible[index].title, url });
      else { await navigator.clipboard.writeText(url); $("lb-share").textContent = "Link copied"; setTimeout(() => ($("lb-share").textContent = "Copy link"), 1800); }
    } catch {}
  };
  document.addEventListener("keydown", (e) => {
    if (lb.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight") show(index + 1);
    else if (e.key === "ArrowLeft") show(index - 1);
  });
  let touchX = null;
  $("lb-stage").addEventListener("touchstart", (e) => (touchX = e.touches[0].clientX), { passive: true });
  $("lb-stage").addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX; touchX = null;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
  });

  renderFilters();
  renderGrid();

  // Open a photo straight away if the link points at one (e.g. .../#m42-orion-nebula)
  const fromHash = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    const i = visible.findIndex((p) => p.id === id);
    if (i >= 0) openPhoto(i);
  };
  fromHash();
  window.addEventListener("hashchange", () => { if (lb.hidden) fromHash(); });

  // ---------- subtle twinkling star background ----------
  const canvas = $("sky"), ctx = canvas.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let stars = [];
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round((innerWidth * innerHeight) / 5000);
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * innerWidth, y: Math.random() * innerHeight,
      r: Math.random() ** 3 * 1.3 + 0.2, a: Math.random() * 0.6 + 0.2,
      s: Math.random() * 0.002 + 0.0005, p: Math.random() * Math.PI * 2,
    }));
  }
  function frame(t) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const st of stars) {
      ctx.globalAlpha = st.a * (reduce ? 1 : 0.65 + 0.35 * Math.sin(t * st.s + st.p));
      ctx.fillStyle = "#dfe6ff";
      ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill();
    }
    if (!reduce) requestAnimationFrame(frame);
  }
  resize(); addEventListener("resize", resize);
  requestAnimationFrame(frame);
})();
