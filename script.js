const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const EMAIL = "letifli58@gmail.com";
const SVG_NS = "http://www.w3.org/2000/svg";

function buildNetwork(svg, { count, seed, maxDistance, radius, hubRatio }) {
  if (!svg) return;
  const width = 1600;
  const height = 1000;
  let state = seed;
  const random = () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid slice");

  const nodes = Array.from({ length: count }, () => ({
    x: random() * width,
    y: random() * height,
    r: radius * (0.6 + random() * 0.8),
    hub: random() < hubRatio
  }));

  const lines = document.createElementNS(SVG_NS, "g");
  const dots = document.createElementNS(SVG_NS, "g");

  nodes.forEach((a, i) => {
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (distance < maxDistance) {
        const line = document.createElementNS(SVG_NS, "line");
        line.setAttribute("x1", a.x.toFixed(1));
        line.setAttribute("y1", a.y.toFixed(1));
        line.setAttribute("x2", b.x.toFixed(1));
        line.setAttribute("y2", b.y.toFixed(1));
        line.setAttribute("stroke-opacity", (0.9 * (1 - distance / maxDistance)).toFixed(2));
        lines.appendChild(line);
      }
    }

    if (a.hub) {
      const halo = document.createElementNS(SVG_NS, "circle");
      halo.setAttribute("cx", a.x.toFixed(1));
      halo.setAttribute("cy", a.y.toFixed(1));
      halo.setAttribute("r", (a.r * 4.5).toFixed(1));
      halo.setAttribute("class", "hub");
      halo.setAttribute("fill-opacity", "0.12");
      dots.appendChild(halo);
    }

    const dot = document.createElementNS(SVG_NS, "circle");
    dot.setAttribute("cx", a.x.toFixed(1));
    dot.setAttribute("cy", a.y.toFixed(1));
    dot.setAttribute("r", (a.hub ? a.r * 1.3 : a.r).toFixed(1));
    if (a.hub) dot.setAttribute("class", "hub");
    dots.appendChild(dot);
  });

  svg.append(lines, dots);
}

function initParallax() {
  const hero = $(".hero");
  const content = $("#hero-content");
  const stats = $("#hero-stats");
  const layers = $$(".layer", hero).map((el) => ({ el, depth: Number(el.dataset.depth) || 0 }));
  if (reduceMotion || !hero) return;

  const finePointer = window.matchMedia("(pointer: fine)").matches;
  let scrollY = window.scrollY;
  let pointerX = 0;
  let pointerY = 0;
  let easedX = 0;
  let easedY = 0;
  let lastKey = "";
  let ticking = false;

  const render = () => {
    ticking = false;
    const height = hero.offsetHeight;
    const y = Math.min(Math.max(scrollY, 0), height);
    easedX += (pointerX - easedX) * 0.08;
    easedY += (pointerY - easedY) * 0.08;

    const key = `${y}|${easedX.toFixed(4)}|${easedY.toFixed(4)}`;
    if (key !== lastKey) {
      lastKey = key;
      layers.forEach(({ el, depth }) => {
        const drift = 1 - depth;
        const x = easedX * drift * 28;
        const offset = y * depth + easedY * drift * 18;
        el.style.transform = `translate3d(${x.toFixed(2)}px, ${offset.toFixed(2)}px, 0)`;
      });
      content.style.transform = `translate3d(0, ${(y * 0.28).toFixed(2)}px, 0)`;
      content.style.opacity = Math.max(0, 1 - y / (height * 0.85)).toFixed(3);
      stats.style.transform = `translate3d(0, ${(y * 0.1).toFixed(2)}px, 0)`;
    }

    if (Math.abs(pointerX - easedX) > 0.0005 || Math.abs(pointerY - easedY) > 0.0005) request();
  };

  const request = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(render);
  };

  window.addEventListener("scroll", () => {
    scrollY = window.scrollY;
    request();
  }, { passive: true });

  window.addEventListener("resize", request);

  if (finePointer) {
    hero.addEventListener("pointermove", (e) => {
      const rect = hero.getBoundingClientRect();
      pointerX = (e.clientX - rect.left) / rect.width - 0.5;
      pointerY = (e.clientY - rect.top) / rect.height - 0.5;
      request();
    });
    hero.addEventListener("pointerleave", () => {
      pointerX = 0;
      pointerY = 0;
      request();
    });
  }

  render();
}

function initNav() {
  const nav = $("#nav");
  const burger = $("#burger");
  const links = $("#nav-links");

  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 24);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const closeMenu = () => {
    links.classList.remove("open");
    burger.setAttribute("aria-expanded", "false");
  };

  burger.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    burger.setAttribute("aria-expanded", String(open));
  });

  $$("a", links).forEach((a) => a.addEventListener("click", closeMenu));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
  document.addEventListener("click", (e) => {
    if (!nav.contains(e.target)) closeMenu();
  });

  const navLinks = $$(".nav-link");
  const byId = new Map(navLinks.map((a) => [a.getAttribute("href").slice(1), a]));
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a) => a.classList.remove("active"));
      const active = byId.get(entry.target.id);
      if (active) active.classList.add("active");
    });
  }, { rootMargin: "-45% 0px -50% 0px" });

  ["top", ...byId.keys(), "contact"].forEach((id) => {
    const section = document.getElementById(id);
    if (section) spy.observe(section);
  });
}

function initReveal() {
  const items = $$(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("in-view"));
    return;
  }

  items.forEach((el) => {
    const siblings = [...el.parentElement.children].filter((child) => child.classList.contains("reveal"));
    if (siblings.length > 2) {
      const columns = Math.max(1, Math.round(el.parentElement.clientWidth / Math.max(el.clientWidth, 1)));
      el.style.setProperty("--d", `${(siblings.indexOf(el) % columns) * 80}ms`);
    }
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("in-view");
      io.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

  items.forEach((el) => io.observe(el));
}

let toastTimer;
function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

function initContact() {
  $("#copy-email").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      toast("Email address copied to clipboard");
    } catch {
      toast(EMAIL);
    }
  });
}

$("#year").textContent = new Date().getFullYear();
buildNetwork($("#net-far"), { count: 70, seed: 7, maxDistance: 165, radius: 1.6, hubRatio: 0.04 });
buildNetwork($("#net-near"), { count: 36, seed: 42, maxDistance: 270, radius: 2.6, hubRatio: 0.14 });
initParallax();
initNav();
initReveal();
initContact();
