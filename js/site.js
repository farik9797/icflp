// ICFLP: шапка, меню, видео первого экрана, появление блоков, этапы работы, форма.
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Шапка становится плотной, когда первый экран уходит вверх
  const header = $("[data-header]");
  const sentinel = $("[data-header-sentinel]");
  if (header && sentinel) {
    new IntersectionObserver(([e]) => header.classList.toggle("is-solid", !e.isIntersecting)).observe(sentinel);
  }

  // Мобильное меню
  const mnav = $("#mnav");
  const openBtn = $("[data-menu-open]");
  const closeBtn = $("[data-menu-close]");
  let lastFocus = null;
  const setMenu = (open) => {
    if (!mnav) return;
    mnav.classList.toggle("is-open", open);
    mnav.inert = !open;
    openBtn?.setAttribute("aria-expanded", String(open));
    document.documentElement.style.overflow = open ? "hidden" : "";
    if (open) {
      lastFocus = document.activeElement;
      closeBtn?.focus();
    } else {
      lastFocus?.focus?.();
    }
  };
  openBtn?.addEventListener("click", () => setMenu(true));
  closeBtn?.addEventListener("click", () => setMenu(false));
  mnav?.addEventListener("click", (e) => {
    if (e.target.closest("a")) setMenu(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mnav?.classList.contains("is-open")) setMenu(false);
  });
  window.matchMedia("(min-width: 1024px)").addEventListener("change", (e) => {
    if (e.matches) setMenu(false);
  });

  // Видео первого экрана: проигрывается один раз (ночь → рассвет) и замирает на последнем кадре.
  // При reduced motion или режиме экономии трафика остаётся последний кадр картинкой.
  const video = $("[data-hero-video]");
  if (video) {
    const saveData = navigator.connection && navigator.connection.saveData;
    if (reduce || saveData) {
      video.poster = video.dataset.posterEnd;
    } else {
      const small = window.matchMedia("(max-width: 899px)").matches;
      video.src = small ? video.dataset.srcSm : video.dataset.srcLg;
      video.muted = true;
      const p = video.play();
      if (p && p.catch) p.catch(() => { video.poster = video.dataset.posterEnd; });
    }
  }

  // Появление блоков при прокрутке
  const revealEls = $$("[data-reveal]");
  if (!reduce && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-in"));
  }

  // Этапы работы: активный этап по центру экрана, прогресс уходит 3D-весам
  const steps = $$("[data-step]");
  const stepsList = $("[data-steps]");
  const stage = $("[data-scales]");
  // На телефоне весы закреплены сверху, поэтому активный этап считаем ниже, в свободной части экрана
  const band = window.matchMedia("(max-width: 1023px)").matches ? 70 : 50;
  if (steps.length) {
    const setActive = (i) => steps.forEach((s, j) => s.classList.toggle("is-active", j === i));
    setActive(0);
    const sio = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(steps.indexOf(e.target));
        });
      },
      { rootMargin: `-${band - 2}% 0px -${100 - band - 2}% 0px` }
    );
    steps.forEach((s) => sio.observe(s));
  }

  const emit = (p) => {
    if (!stage) return;
    stage.dataset.progress = p.toFixed(4);
    stage.dispatchEvent(new CustomEvent("scales:progress", { detail: p }));
  };
  window.addEventListener("load", () => {
    if (!stepsList || !stage || reduce || !window.gsap || !window.ScrollTrigger) return;
    window.gsap.registerPlugin(window.ScrollTrigger);
    window.ScrollTrigger.create({
      trigger: steps[0],
      start: `center ${band + 10}%`,
      endTrigger: steps[steps.length - 1],
      end: `center ${band}%`,
      onUpdate: (self) => emit(self.progress),
      onRefresh: (self) => emit(self.progress),
    });
  });

  // Форма заявки (в макете не отправляется, говорим об этом прямо)
  const form = $("[data-form]");
  if (form) {
    const status = $("[data-form-status]", form);
    const setErr = (el, msg) => {
      el.setAttribute("aria-invalid", msg ? "true" : "false");
      const box = document.getElementById(el.getAttribute("aria-describedby"));
      if (box) box.textContent = msg;
      return !msg;
    };
    const name = form.elements.name;
    const phone = form.elements.phone;
    phone.addEventListener("focus", () => {
      if (!phone.value) phone.value = "+998 ";
    });
    phone.addEventListener("blur", () => {
      if (phone.value.trim() === "+998") phone.value = "";
    });
    [name, phone].forEach((el) =>
      el.addEventListener("input", () => {
        if (el.getAttribute("aria-invalid") === "true") setErr(el, "");
      })
    );
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const digits = phone.value.replace(/\D/g, "");
      const okName = setErr(name, name.value.trim().length < 2 ? "Укажите, как к вам обращаться" : "");
      const okPhone = setErr(phone, digits.length < 12 && digits.length !== 9 ? "Укажите номер полностью, вместе с кодом оператора" : "");
      if (!okName || !okPhone) {
        form.querySelector('[aria-invalid="true"]').focus();
        return;
      }
      status.classList.remove("hidden");
      status.textContent =
        "Спасибо, " + name.value.trim() + ". Это макет сайта, заявка пока никуда не уходит: отправку подключим при переносе на WordPress. Срочный вопрос можно решить по телефону +998 (87) 300-10-20.";
    });
  }
})();
