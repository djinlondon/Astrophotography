(() => {
  const data = JSON.parse(document.getElementById("gallery-data").textContent);
  const { site, photos } = data;
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const svg = (paths) => {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 16 16");
    s.innerHTML = paths;
    return s;
  };
  const PAGE_ICON = '<path d="M4 1.5h5.5L13 5v9.5H4z"/><path d="M9.5 1.5V5H13M6 8h5M6 10.5h5"/>';
  const TAGS_ICON = '<circle cx="8" cy="8" r="6.2"/><path d="M5.5 8h5M8 5.5v5"/>';

  // ---------- page header ----------
  document.title = site.title;
  $("site-title").textContent = site.title;
  $("crumb-title").textContent = site.title;
  $("crumb-icon").textContent = site.icon || "";
  $("page-icon").textContent = site.icon || "";
  if (site.icon) {
    $("favicon").href = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${site.icon}</text></svg>`)}`;
  }
  if (site.tagline) { $("tagline").textContent = site.tagline; $("tagline").hidden = false; }
  if (site.banner) { $("cover-img").src = site.banner; $("cover").hidden = false; }
  $("gallery-heading").textContent = site.heading || "Gallery";
  $("footer-text").textContent = `© ${new Date().getFullYear()} ${site.photographer || site.title}`;

  const paragraphs = (text) =>
    (text || "").split(/\n\s*\n/).filter((p) => p.trim()).map((p) => el("p", null, p.trim()));

  const links = [];
  if (site.contact) links.push([site.contact.includes("@") && !site.contact.startsWith("http") ? `mailto:${site.contact}` : site.contact, "Contact"]);
  if (site.instagram) links.push([site.instagram.startsWith("http") ? site.instagram : `https://instagram.com/${site.instagram.replace(/^@/, "")}`, "Instagram"]);
  if (site.astrobin) links.push([site.astrobin.startsWith("http") ? site.astrobin : `https://www.astrobin.com/users/${site.astrobin}/`, "AstroBin"]);
  if (site.about || links.length) {
    $("about").hidden = false;
    $("about-text").append(...paragraphs(site.about));
    for (const [href, label] of links) {
      const a = el("a", null, label);
      a.href = href; a.rel = "noopener"; if (!href.startsWith("mailto:")) a.target = "_blank";
      const li = el("li"); li.append(a); $("links").append(li);
    }
  }

  // ---------- tags ----------
  const fixed = { galaxy: "purple", nebula: "brown" }; // same colours as the Notion draft
  const palette = ["blue", "green", "orange", "pink", "yellow", "red", "gray"];
  const categories = [...new Set(photos.map((p) => p.category).filter(Boolean))].sort();
  const colour = {};
  let next = 0;
  for (const c of categories) colour[c] = fixed[c.toLowerCase()] || palette[next++ % palette.length];
  const tag = (c) => { const t = el("span", "tag", c); t.dataset.c = colour[c]; return t; };

  // ---------- gallery ----------
  let active = "All";
  let visible = photos;

  function renderFilters() {
    const box = $("filters");
    box.innerHTML = "";
    if (categories.length < 2) return;
    for (const c of ["All", ...categories]) {
      const b = el("button", "tab", c);
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(c === active));
      b.onclick = () => { active = c; renderFilters(); renderGrid(); };
      box.append(b);
    }
  }

  function renderGrid() {
    visible = active === "All" ? photos : photos.filter((p) => p.category === active);
    const grid = $("grid");
    grid.innerHTML = "";
    $("empty").hidden = photos.length > 0;
    $("count").textContent = photos.length ? `${visible.length}` : "";
    visible.forEach((p, i) => {
      const card = el("button", "card");
      card.setAttribute("aria-label", `Open ${p.title}`);
      const prev = el("div", "preview");
      const img = new Image();
      img.loading = "lazy"; img.decoding = "async"; img.alt = "";
      img.onload = () => img.classList.add("loaded");
      img.src = p.thumb;
      prev.append(img);
      const body = el("div", "card-body");
      const title = el("div", "card-title");
      title.append(svg(PAGE_ICON), el("span", null, p.title));
      body.append(title);
      if (p.category) body.append(tag(p.category));
      card.append(prev, body);
      card.onclick = () => openPhoto(i);
      grid.append(card);
    });
  }

  // ---------- peek: one photo's page ----------
  const peek = $("peek");
  let index = -1, lastFocus = null;

  function show(i) {
    index = (i + visible.length) % visible.length;
    const p = visible[index];
    $("pk-title").textContent = p.title;
    $("pk-pos").textContent = `${index + 1} of ${visible.length}`;

    const props = $("pk-props");
    props.innerHTML = "";
    const row = (icon, key, value) => {
      const k = el("div", "k"); k.append(svg(icon), el("span", null, key));
      const v = el("div", "v"); typeof value === "string" ? (v.textContent = value) : v.append(value);
      props.append(k, v);
    };
    if (p.category) row(TAGS_ICON, "Tags", tag(p.category));
    for (const [k, v] of p.details) row(TAGS_ICON, k, v);

    const imgs = [p, ...(p.more || [])];
    const box = $("pk-images");
    box.innerHTML = "";
    box.classList.toggle("two", imgs.length === 2);
    for (const im of imgs) {
      const a = el("a");
      a.href = im.full || im.display; a.target = "_blank"; a.rel = "noopener";
      a.title = "Open full size";
      const img = new Image();
      img.src = im.display; img.alt = p.title; img.width = im.w; img.height = im.h;
      a.append(img);
      box.append(a);
    }
    $("pk-desc").replaceChildren(...paragraphs(p.description));

    const dl = $("pk-download");
    dl.innerHTML = "";
    imgs.forEach((im, n) => {
      if (!im.full) return;
      const a = el("a", null, imgs.length > 1 ? `Download full size (${n + 1})` : "Download full size");
      a.href = im.full; a.download = "";
      if (dl.childNodes.length) dl.append(" · ");
      dl.append(a);
    });

    $("pk-prev").hidden = $("pk-next").hidden = visible.length < 2;
    document.querySelector(".peek-body").scrollTop = 0;
    history.replaceState(null, "", `#${p.id}`);
    // warm up the neighbours so arrowing through is quick
    [index + 1, index - 1].forEach((j) => { const q = visible[(j + visible.length) % visible.length]; if (q) new Image().src = q.display; });
  }

  function openPhoto(i) {
    lastFocus = document.activeElement;
    peek.hidden = false;
    document.body.style.overflow = "hidden";
    show(i);
    $("pk-close").focus({ preventScroll: true });
  }

  function close() {
    peek.hidden = true;
    document.body.style.overflow = "";
    history.replaceState(null, "", location.pathname + location.search);
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }

  $("pk-close").onclick = $("peek-backdrop").onclick = close;
  $("pk-prev").onclick = () => show(index - 1);
  $("pk-next").onclick = () => show(index + 1);
  $("pk-share").onclick = async () => {
    const url = location.href;
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) await navigator.share({ title: visible[index].title, url });
      else { await navigator.clipboard.writeText(url); $("pk-share").textContent = "Link copied"; setTimeout(() => ($("pk-share").textContent = "Copy link"), 1800); }
    } catch {}
  };
  document.addEventListener("keydown", (e) => {
    if (peek.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight") show(index + 1);
    else if (e.key === "ArrowLeft") show(index - 1);
  });
  let touchX = null, touchY = null;
  $("peek-panel").addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; touchY = e.touches[0].clientY; }, { passive: true });
  $("peek-panel").addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX, dy = e.changedTouches[0].clientY - touchY;
    touchX = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) show(index + (dx < 0 ? 1 : -1));
  });

  renderFilters();
  renderGrid();

  // Open a photo straight away if the link points at one (e.g. .../#carina-nebula)
  const fromHash = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    const i = visible.findIndex((p) => p.id === id);
    if (i >= 0) openPhoto(i);
  };
  fromHash();
  window.addEventListener("hashchange", () => { if (peek.hidden) fromHash(); });
})();
