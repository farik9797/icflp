// ICFLP: шапка, меню, видео первого экрана, появление блоков, этапы работы, форма.
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Тема: тёмная по умолчанию (как в брендбуке), светлая по кнопке; выбор запоминаем
  const rootEl = document.documentElement;
  const themeBtns = $$("[data-theme-toggle]");
  const metaTheme = $('meta[name="theme-color"]');
  const syncThemeUi = () => {
    const light = rootEl.getAttribute("data-theme") === "light";
    themeBtns.forEach((b) => b.setAttribute("aria-label", light ? "Включить тёмную тему" : "Включить светлую тему"));
    if (metaTheme) metaTheme.setAttribute("content", light ? "#f5f7fa" : "#0a1020");
  };
  syncThemeUi();
  themeBtns.forEach((b) =>
    b.addEventListener("click", () => {
      const next = rootEl.getAttribute("data-theme") === "light" ? "dark" : "light";
      rootEl.setAttribute("data-theme", next);
      try {
        localStorage.setItem("icflp-theme", next);
      } catch (e) {}
      syncThemeUi();
    })
  );

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

  // Заголовки разделов: слова поднимаются из-под маски, когда заголовок входит в экран
  const splitEls = $$("[data-split]");
  if (!reduce && "IntersectionObserver" in window && splitEls.length) {
    splitEls.forEach((el) => {
      let wi = 0;
      const walk = (node) => {
        [...node.childNodes].forEach((n) => {
          if (n.nodeType === 3) {
            const frag = document.createDocumentFragment();
            n.textContent.split(/([ \n\t]+)/).forEach((part) => {
              if (!part) return;
              if (/^[ \n\t]+$/.test(part)) {
                frag.appendChild(document.createTextNode(" "));
                return;
              }
              const w = document.createElement("span");
              w.className = "sw";
              const inner = document.createElement("span");
              inner.className = "sw-i";
              inner.style.setProperty("--wi", wi++);
              inner.textContent = part;
              w.appendChild(inner);
              frag.appendChild(w);
            });
            n.replaceWith(frag);
          } else if (n.nodeType === 1 && n.tagName !== "BR") {
            walk(n);
          }
        });
      };
      walk(el);
    });
    const splitIo = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-split-in");
            splitIo.unobserve(e.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    splitEls.forEach((el) => splitIo.observe(el));
  }

  // Блик за курсором на плитках и «магнитные» главные кнопки (только мышь, без reduced motion)
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (finePointer && !reduce) {
    $$(".spot").forEach((el) =>
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", e.clientX - r.left + "px");
        el.style.setProperty("--my", e.clientY - r.top + "px");
      })
    );
    $$("[data-magnetic]").forEach((btn) => {
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        btn.style.setProperty("--tx", (dx * 6).toFixed(2) + "px");
        btn.style.setProperty("--ty", (dy * 4).toFixed(2) + "px");
      });
      btn.addEventListener("pointerleave", () => {
        btn.style.setProperty("--tx", "0px");
        btn.style.setProperty("--ty", "0px");
      });
    });
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
    // Фоновые фото блоков медленно смещаются при прокрутке: даёт глубину без отвлечения от текста
    $$("[data-parallax]").forEach((img) => {
      window.gsap.fromTo(
        img,
        { yPercent: -5 },
        { yPercent: 5, ease: "none", scrollTrigger: { trigger: img.closest("section"), start: "top bottom", end: "bottom top", scrub: true } }
      );
    });
    window.ScrollTrigger.create({
      trigger: steps[0],
      start: `center ${band + 10}%`,
      endTrigger: steps[steps.length - 1],
      end: `center ${band}%`,
      onUpdate: (self) => emit(self.progress),
      onRefresh: (self) => emit(self.progress),
    });
  });

  // Формы заявки: в разделе «Контакты» и во всплывающем окне (в макете не отправляются, говорим об этом прямо)
  $$("[data-form]").forEach((form) => {
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
  });

  // Всплывающее окно «Получить консультацию». Без JS или без <dialog> кнопки ведут к форме в «Контактах».
  const dialog = $("#consult");
  if (dialog && typeof dialog.showModal === "function") {
    const dForm = $("[data-form]", dialog);
    const dStatus = $("[data-form-status]", dForm);
    const clearForm = () => {
      dForm.reset();
      $$("[aria-invalid]", dForm).forEach((el) => el.setAttribute("aria-invalid", "false"));
      $$(".field-error", dForm).forEach((el) => (el.textContent = ""));
      dStatus.classList.add("hidden");
    };
    const openDialog = (e) => {
      e.preventDefault();
      if (mnav && mnav.classList.contains("is-open")) setMenu(false);
      if (!dStatus.classList.contains("hidden")) clearForm();
      dialog.showModal();
      document.documentElement.style.overflow = "hidden";
      if (window.matchMedia("(pointer: fine)").matches) dForm.elements.name.focus();
    };
    $$("[data-consult]").forEach((a) => a.addEventListener("click", openDialog));
    $("[data-consult-close]", dialog)?.addEventListener("click", () => dialog.close());
    // клик по затемнению вокруг окна закрывает его
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });
    dialog.addEventListener("close", () => {
      document.documentElement.style.overflow = "";
    });
  }
})();
