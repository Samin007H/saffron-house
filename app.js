/* ========== MOBILE NAV ========== */
(function () {
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.querySelector(".menu");
  if (!toggle || !menu) return;

  const closeMenu = () => {
    menu.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  };
  const openMenu = () => {
    menu.classList.add("open");
    toggle.setAttribute("aria-expanded", "true");
  };

  toggle.addEventListener("click", () => {
    if (menu.classList.contains("open")) closeMenu();
    else openMenu();
  });

  menu.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", closeMenu)
  );

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) closeMenu();
  });
})();

/* ========== HERO SLIDER (home only) ========== */
(function () {
  const slider = document.querySelector(".hero-slider");
  if (!slider) return;

  const slides = [...slider.querySelectorAll(".slide")];
  const dots = [...slider.querySelectorAll(".dot")];
  if (!slides.length) return;

  // Set background images from data-bg and preload
  slides.forEach((s) => {
    const src = s.dataset.bg;
    if (src) {
      s.style.backgroundImage = `url("${src}")`;
      const img = new Image();
      img.src = src;
    }
  });

  let idx = slides.findIndex((s) => s.classList.contains("active"));
  if (idx < 0) idx = 0;

  const DURATION = 6000; // 6s feels calmer than 1.5s

  function goTo(i) {
    slides[idx].classList.remove("active");
    dots[idx]?.classList.remove("active");

    const n = slides.length;
    idx = ((i % n) + n) % n;

    slides[idx].classList.add("active");
    dots[idx]?.classList.add("active");
  }

  let timer;
  function start() {
    stop();
    timer = setInterval(() => goTo(idx + 1), DURATION);
  }
  function stop() {
    if (timer) clearInterval(timer);
  }

  dots.forEach((dot, i) =>
    dot.addEventListener("click", () => {
      goTo(i);
      start();
    })
  );

  slider.addEventListener("mouseenter", stop);
  slider.addEventListener("mouseleave", start);

  start();
})();

/* ========== GENERIC MODALS (Contact/FAQ/Cart) ========== */
(function () {
  const openButtons = document.querySelectorAll("[data-open]");
  const closeButtons = document.querySelectorAll("[data-close]");
  let lastFocus = null;

  function closeModal(modal) {
    modal.hidden = true;
    if (lastFocus && document.contains(lastFocus)) {
      lastFocus.focus();
    }
  }

  function openModalById(id) {
    const modal = document.getElementById(id);
    if (!modal) return;

    lastFocus = document.activeElement;
    modal.hidden = false;

    // When opening the cart modal, ensure contents are rendered
    if (id === "cart-modal" && typeof renderCart === "function") {
      renderCart();
    }

    const focusable = modal.querySelector(
      "button, a, input, textarea, select"
    );
    focusable?.focus();

    const handleBackdrop = (e) => {
      if (e.target === modal) {
        modal.removeEventListener("click", handleBackdrop);
        modal.removeEventListener("keydown", handleKeydown);
        closeModal(modal);
      }
    };
    const handleKeydown = (e) => {
      if (e.key === "Escape") {
        modal.removeEventListener("click", handleBackdrop);
        modal.removeEventListener("keydown", handleKeydown);
        closeModal(modal);
      }
    };

    modal.addEventListener("click", handleBackdrop);
    modal.addEventListener("keydown", handleKeydown);
  }

  openButtons.forEach((btn) =>
    btn.addEventListener("click", () => {
      const id = btn.dataset.open;
      if (id) openModalById(id);
    })
  );

  closeButtons.forEach((btn) =>
    btn.addEventListener("click", () => {
      const modal = btn.closest(".modal");
      if (modal) closeModal(modal);
    })
  );

  // Expose in case we want it in other scripts (like recipes)
  window.__openModalById = openModalById;
})();

/* ========== CART (localStorage) ========== */
const CART_KEY = "sh_cart_v1";

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : { items: [] };
  } catch {
    return { items: [] };
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge(cart);
}

function updateCartBadge(cart) {
  const badge = document.getElementById("cart-badge");
  if (!badge) return;

  const data = cart || loadCart();
  const qty = data.items.reduce((sum, item) => sum + item.qty, 0);
  badge.textContent = qty;
}

function addToCart(item) {
  const cart = loadCart();
  const found = cart.items.find((i) => i.id === item.id);
  if (found) {
    found.qty += item.qty;
  } else {
    cart.items.push(item);
  }
  saveCart(cart);
}

function changeQty(id, delta) {
  const cart = loadCart();
  const item = cart.items.find((i) => i.id === id);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    cart.items = cart.items.filter((i) => i.id !== id);
  }
  saveCart(cart);
}

function clearCart() {
  saveCart({ items: [] });
}

function currency(n) {
  const num = Number(n) || 0;
  return `$${num.toFixed(2)}`;
}

function renderCart() {
  const wrap = document.getElementById("cart-contents");
  const totalEl = document.getElementById("cart-total");
  if (!wrap || !totalEl) return;

  const cart = loadCart();
  if (!cart.items.length) {
    wrap.innerHTML = "<p>Your cart is empty.</p>";
    totalEl.textContent = "$0.00";
    return;
  }

  wrap.innerHTML = cart.items
    .map(
      (it) => `
      <div class="cart-item">
        <div>
          <h4>${it.name}</h4>
          <div class="muted">${currency(it.price)} each</div>
        </div>
        <div class="cart-qty">
          <button aria-label="Decrease quantity" data-dec="${it.id}">−</button>
          <span>${it.qty}</span>
          <button aria-label="Increase quantity" data-inc="${it.id}">+</button>
        </div>
        <div><strong>${currency(it.price * it.qty)}</strong></div>
      </div>
    `
    )
    .join("");

  const total = cart.items.reduce(
    (sum, it) => sum + it.price * it.qty,
    0
  );
  totalEl.textContent = currency(total);
}

/* ========== RECIPES: DATA FOR MODAL ========== */
const recipeData = {
  milk: {
    title: "Kesar Doodh (Saffron Milk)",
    html: `<ol>
      <li>Bloom: Soak 8–10 strands in 2 tbsp warm milk (10 min).</li>
      <li>Simmer 300 ml milk with a pinch of cardamom & sugar.</li>
      <li>Stir in the bloom, garnish with chopped almonds.</li>
    </ol>`,
  },
  rice: {
    title: "Saffron Rice",
    html: `<ol>
      <li>Bloom: Pinch of saffron in 2 tbsp hot water.</li>
      <li>Cook basmati with butter, bay leaf & salt.</li>
      <li>Fold in saffron water at the end; fluff & rest 5 min.</li>
    </ol>`,
  },
  risotto: {
    title: "Risotto alla Milanese",
    html: `<ol>
      <li>Toast arborio in butter; add white wine.</li>
      <li>Add hot stock gradually while stirring.</li>
      <li>Stir in saffron bloom & parmesan; rest 2 min.</li>
    </ol>`,
  },
  tea: {
    title: "Saffron Tea",
    html: `<ol>
      <li>Steep saffron, lemon zest & ginger in hot water 6–8 min.</li>
      <li>Sweeten with honey; garnish with extra zest.</li>
    </ol>`,
  },
  icecream: {
    title: "Kesar Pistachio Ice Cream",
    html: `<ol>
      <li>Bloom saffron in warm cream.</li>
      <li>Whisk with condensed milk & crushed pistachios.</li>
      <li>Freeze 4–6 h, stirring once halfway.</li>
    </ol>`,
  },
  biriyani: {
    title: "Saffron Chicken Biryani",
    html: `<ol>
      <li>Marinate chicken with yogurt, spices & salt.</li>
      <li>Par-boil basmati; layer with chicken, fried onions & saffron milk.</li>
      <li>Dum cook on low heat 20–25 min; rest before serving.</li>
    </ol>`,
  },
};

/* ========== DOMContentLoaded HOOKS ========== */
document.addEventListener("DOMContentLoaded", () => {
  /* Add-to-cart buttons */
  document.querySelectorAll("[data-add-to-cart]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      if (!id) return;

      addToCart({
        id,
        name: btn.dataset.name || "Item",
        price: parseFloat(btn.dataset.price || "0"),
        img: btn.dataset.img || "",
        qty: 1,
      });

      // Tiny feedback
      btn.classList.add("added");
      btn.disabled = true;
      setTimeout(() => {
        btn.classList.remove("added");
        btn.disabled = false;
      }, 800);
    });
  });

  /* Clear cart */
  document.getElementById("cart-clear")?.addEventListener("click", () => {
    clearCart();
    renderCart();
  });

  /* Quantity +/- inside cart (event delegation) */
  const cartWrap = document.getElementById("cart-contents");
  if (cartWrap) {
    cartWrap.addEventListener("click", (e) => {
      const dec = e.target.closest("[data-dec]");
      const inc = e.target.closest("[data-inc]");

      if (dec) {
        changeQty(dec.dataset.dec, -1);
        renderCart();
      } else if (inc) {
        changeQty(inc.dataset.inc, +1);
        renderCart();
      }
    });
  }

  /* Recipe cards -> open modal with details */
  const recipeCards = document.querySelectorAll(".recipe-card[data-recipe]");
  const recipeModal = document.getElementById("recipe-modal");
  const recipeTitle = document.getElementById("recipe-title");
  const recipeContent = document.getElementById("recipe-content");

  if (recipeCards.length && recipeModal && recipeTitle && recipeContent) {
    recipeCards.forEach((card) =>
      card.addEventListener("click", (e) => {
        e.preventDefault();
        const key = card.dataset.recipe;
        const data = recipeData[key];
        if (!data) return;

        recipeTitle.textContent = data.title;
        recipeContent.innerHTML = data.html;
        recipeModal.hidden = false;
      })
    );

    recipeModal.addEventListener("click", (e) => {
      if (e.target === recipeModal) {
        recipeModal.hidden = true;
      }
    });

    recipeModal
      .querySelector("[data-close]")
      ?.addEventListener("click", () => (recipeModal.hidden = true));
  }

  /* Initial badge sync */
  updateCartBadge();
});
