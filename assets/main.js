/* ==========================================================
   Vectyo · script del sitio
   ⚠️ CONFIGURACIÓN: cambiar acá el número y las redes.
   Se actualizan solos en todas las páginas.
   ========================================================== */
const VECTYO = {
  // Número de WhatsApp con código de país, sin + ni espacios. Ej: 5493511234567
  whatsapp: "5492617776907",
  instagram: "https://www.instagram.com/vectyo",
  instagramUsuario: "@vectyo",
};

document.documentElement.classList.add("js");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const waLink = (mensaje) => `https://wa.me/${VECTYO.whatsapp}?text=${encodeURIComponent(mensaje)}`;

/* ---------- Links de WhatsApp e Instagram ---------- */
const prepararWa = (raiz = document) =>
  raiz.querySelectorAll("[data-wa]").forEach((a) => {
    a.href = waLink(a.dataset.wa || "Hola Vectyo!");
    a.target = "_blank";
    a.rel = "noopener";
  });
prepararWa();
document.querySelectorAll("[data-ig]").forEach((a) => {
  a.href = VECTYO.instagram;
  a.target = "_blank";
  a.rel = "noopener";
});
document.querySelectorAll("[data-ig-handle]").forEach((el) => (el.textContent = VECTYO.instagramUsuario));

/* ---------- Formularios que abren WhatsApp con el mensaje armado ---------- */
document.querySelectorAll("form[data-wa-form]").forEach((form) => {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const lineas = [form.dataset.waForm];
    form.querySelectorAll("[name]").forEach((campo) => {
      const valor = campo.value.trim();
      if (!valor) return;
      const etiqueta = form.querySelector(`label[for="${campo.id}"]`);
      lineas.push(`• ${etiqueta ? etiqueta.textContent : campo.name}: ${valor}`);
    });
    window.open(waLink(lineas.join("\n")), "_blank", "noopener");
  });
});

/* ---------- Menú en celular ---------- */
const toggle = document.querySelector(".nav-toggle");
const nav = document.getElementById("nav");
if (toggle && nav) {
  const cerrar = () => {
    toggle.setAttribute("aria-expanded", "false");
    nav.classList.remove("is-open");
    document.body.classList.remove("nav-open");
  };
  toggle.addEventListener("click", () => {
    if (toggle.getAttribute("aria-expanded") === "true") return cerrar();
    toggle.setAttribute("aria-expanded", "true");
    nav.classList.add("is-open");
    document.body.classList.add("nav-open");
  });
  nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", cerrar));
  document.addEventListener("keydown", (e) => e.key === "Escape" && cerrar());
}

/* ---------- Header con blur al hacer scroll ---------- */
const header = document.querySelector(".header");
const onScroll = () => header && header.classList.toggle("is-scrolled", window.scrollY > 8);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ---------- Título del hero palabra por palabra ---------- */
document.querySelectorAll("[data-palabras]").forEach((titulo) => {
  if (reduceMotion) return;
  let i = 0;
  const partir = (nodo) => {
    [...nodo.childNodes].forEach((hijo) => {
      if (hijo.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        hijo.textContent.split(/(\s+)/).forEach((trozo) => {
          if (!trozo) return;
          if (/^\s+$/.test(trozo)) return frag.append(trozo);
          const s = document.createElement("span");
          s.className = "w";
          s.style.setProperty("--i", i++);
          s.textContent = trozo;
          frag.append(s);
        });
        hijo.replaceWith(frag);
      } else if (hijo.nodeType === Node.ELEMENT_NODE) {
        partir(hijo);
      }
    });
  };
  titulo.setAttribute("aria-label", titulo.textContent.trim());
  partir(titulo);
});

/* ---------- Imágenes: skeleton hasta que cargan ---------- */
document.querySelectorAll(".skeleton img").forEach((img) => {
  const listo = () => {
    img.classList.add("is-loaded");
    img.closest(".skeleton").classList.add("is-loaded");
  };
  if (img.complete && img.naturalWidth) listo();
  else img.addEventListener("load", listo, { once: true });
});

/* ---------- Reveal al scroll con stagger ---------- */
const reveals = [...document.querySelectorAll(".reveal")];
const animarEntrada = (lista) => {
  if (!("IntersectionObserver" in window)) return lista.forEach((el) => el.classList.add("is-in"));
  const io = new IntersectionObserver(
    (entries) => {
      const visibles = entries.filter((en) => en.isIntersecting);
      visibles.forEach((en, n) => {
        en.target.style.setProperty("--d", n);
        en.target.classList.add("is-in");
        io.unobserve(en.target);
      });
    },
    { rootMargin: "0px 0px -6% 0px", threshold: 0.06 }
  );
  lista.forEach((el) => io.observe(el));
};
animarEntrada(reveals);

/* ---------- Me gusta (se guarda solo en este navegador) ---------- */
const LIKES_KEY = "vectyo-likes";
const leerLikes = () => {
  try { return new Set(JSON.parse(localStorage.getItem(LIKES_KEY) || "[]")); } catch { return new Set(); }
};
const likes = leerLikes();
const guardarLikes = () => {
  try { localStorage.setItem(LIKES_KEY, JSON.stringify([...likes])); } catch { /* sin almacenamiento: no pasa nada */ }
};
const pintarLikes = (id) =>
  document.querySelectorAll(`.like[data-id="${id}"]`).forEach((b) => {
    b.setAttribute("aria-pressed", likes.has(id) ? "true" : "false");
  });
document.querySelectorAll(".like[data-id]").forEach((b) => {
  b.setAttribute("aria-pressed", likes.has(b.dataset.id) ? "true" : "false");
  b.addEventListener("click", (e) => {
    e.stopPropagation();
    const id = b.dataset.id;
    likes.has(id) ? likes.delete(id) : likes.add(id);
    guardarLikes();
    pintarLikes(id);
    b.classList.remove("pop");
    void b.offsetWidth;
    b.classList.add("pop");
  });
});

/* ---------- Filtros con indicador animado ---------- */
document.querySelectorAll("[data-filtros]").forEach((barra) => {
  const chips = barra.querySelector(".chips");
  const ind = barra.querySelector(".chips__ind");
  const grilla = document.getElementById(barra.dataset.filtros);
  if (!chips || !grilla) return;
  const vacio = grilla.querySelector(".shots__empty");
  const moverIndicador = (chip) => {
    if (!ind) return;
    ind.style.width = `${chip.offsetWidth}px`;
    ind.style.transform = `translateX(${chip.offsetLeft - 2}px)`;
  };
  const activar = (chip) => {
    chips.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", c === chip ? "true" : "false"));
    moverIndicador(chip);
    const cat = chip.dataset.cat;
    let visibles = 0;
    grilla.querySelectorAll(".shot").forEach((s) => {
      const mostrar = cat === "todo" || s.dataset.cat === cat;
      s.hidden = !mostrar;
      if (mostrar) {
        visibles++;
        s.classList.remove("is-in");
        s.style.setProperty("--d", visibles - 1);
        requestAnimationFrame(() => requestAnimationFrame(() => s.classList.add("is-in")));
      }
    });
    if (vacio) vacio.hidden = visibles > 0;
  };
  chips.querySelectorAll(".chip").forEach((c) => c.addEventListener("click", () => activar(c)));
  const inicial = chips.querySelector('.chip[aria-pressed="true"]') || chips.querySelector(".chip");
  requestAnimationFrame(() => { moverIndicador(inicial); chips.classList.add("is-ready"); });
  window.addEventListener("resize", () => moverIndicador(chips.querySelector('.chip[aria-pressed="true"]')));
});

/* ---------- Visor de piezas ---------- */
const visor = document.getElementById("visor");
if (visor && typeof visor.showModal === "function") {
  const titulo = visor.querySelector("[data-visor-titulo]");
  const tipo = visor.querySelector("[data-visor-tipo]");
  const pista = visor.querySelector(".visor__track");
  const cta = visor.querySelector("[data-visor-cta]");
  document.querySelectorAll("[data-visor]").forEach((boton) => {
    boton.addEventListener("click", () => {
      const shot = boton.closest(".shot");
      const piezas = JSON.parse(shot.dataset.piezas || "[]");
      titulo.textContent = shot.dataset.titulo;
      tipo.textContent = shot.dataset.tipo;
      pista.replaceChildren(
        ...piezas.map((src, n) => {
          const img = new Image();
          img.src = src;
          img.alt = `${shot.dataset.titulo}, pieza ${n + 1} de ${piezas.length}`;
          img.loading = n < 3 ? "eager" : "lazy";
          return img;
        })
      );
      cta.dataset.wa = `Hola Vectyo! Vi "${shot.dataset.titulo}" en su web y quiero algo así para mi negocio`;
      prepararWa(visor);
      visor.showModal();
      pista.scrollLeft = 0;
    });
  });
  visor.querySelector("[data-visor-cerrar]").addEventListener("click", () => visor.close());
  visor.addEventListener("click", (e) => { if (e.target === visor) visor.close(); });
}

/* ---------- Selector de colores de prueba (solo con ?colores en la URL) ----------
   Sirve para elegir el color de acento viéndolo en la web real.
   Cuando se elige, se pasa el código a --acento en assets/styles.css y se borra el modo prueba. */
(() => {
  // Solo los tonos de la paleta que se leen bien sobre blanco (AA)
  const COLORES = [
    ["Terracota", "#A64D38"],
    ["Ladrillo", "#8B362C"],
    ["Negro cálido", "#1F1714"],
  ];
  const leer = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const escribir = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* nada */ } };
  if (new URLSearchParams(location.search).has("colores")) escribir("vectyo-modo-colores", "1");
  if (leer("vectyo-modo-colores") !== "1") return;

  const aplicar = (hex) => {
    document.documentElement.style.setProperty("--acento", hex);
    escribir("vectyo-color-prueba", hex);
    panel.querySelectorAll("button[data-hex]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.hex === hex ? "true" : "false"));
    panel.querySelector("[data-hex-actual]").textContent = hex;
  };
  const panel = document.createElement("div");
  panel.className = "colores";
  panel.innerHTML = `<p><strong>Probar color</strong> <span data-hex-actual></span></p>
    <div class="colores__lista">${COLORES.map(([n, h]) => `<button type="button" data-hex="${h}" title="${n}" aria-label="${n}" style="background:${h}"></button>`).join("")}</div>
    <button type="button" class="colores__salir">Salir del modo prueba</button>`;
  document.body.append(panel);
  panel.querySelectorAll("button[data-hex]").forEach((b) => b.addEventListener("click", () => aplicar(b.dataset.hex)));
  panel.querySelector(".colores__salir").addEventListener("click", () => {
    escribir("vectyo-modo-colores", null);
    escribir("vectyo-color-prueba", null);
    document.documentElement.style.removeProperty("--acento");
    panel.remove();
  });
  aplicar(leer("vectyo-color-prueba") || getComputedStyle(document.documentElement).getPropertyValue("--acento").trim().toUpperCase());
})();

/* ---------- Año del footer ---------- */
document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
