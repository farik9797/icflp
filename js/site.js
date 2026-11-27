// ICFLP: шапка и меню, видео первого экрана, появление блоков, этапы работы, формы заявки, события аналитики.
(() => {
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // .lite ставит скрипт в <head>: reduced motion, экономия трафика или мало памяти — без видео, 3D и эффектов прокрутки
  const lite = root.classList.contains("lite");
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const lang = (root.lang || "ru").slice(0, 2);

  // События для счётчиков (Метрика, GA4 через GTM). Персональные данные не передаём.
  const track = (event, params = {}) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, lang, ...params });
  };

  // Прелоадер: только первый заход за сессию, не дольше 0,6 с от начала загрузки страницы
  if (root.classList.contains("pl-on")) {
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      setTimeout(() => {
        root.classList.add("pl-done");
        try {
          sessionStorage.setItem("icflp-pl", "1");
        } catch (e) {}
        setTimeout(() => root.classList.remove("pl-on", "pl-done"), 300);
      }, Math.max(0, 250 - performance.now()));
    };
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(done);
    setTimeout(done, Math.max(0, 600 - performance.now()));
  }

  // Тексты, которые пишет скрипт, на языке страницы
  const T = {
    ru: {
      toLight: "Включить светлую тему",
      toDark: "Включить тёмную тему",
      errName: "Укажите, как к вам обращаться",
      errPhone: "Укажите номер полностью: для Узбекистана 9 цифр после +998",
      sending: "Отправляем…",
      sent: (n) => `Спасибо, ${n}. Заявка отправлена, юрист свяжется с вами в ближайшее время.`,
      netErr: "Не удалось отправить заявку: нет связи с сервером. Введённый текст сохранён, попробуйте ещё раз или позвоните +998 (87) 300-10-20.",
      demo: "Это макет сайта: поля проверяются, но заявка пока никуда не уходит. Приём заявок подключим при переносе на WordPress. Срочный вопрос можно решить по телефону +998 (87) 300-10-20.",
    },
    uz: {
      toLight: "Yorug‘ mavzuni yoqish",
      toDark: "Qorong‘i mavzuni yoqish",
      errName: "Ismingizni kiriting",
      errPhone: "Raqamni to‘liq kiriting: O‘zbekiston uchun +998 dan keyin 9 ta raqam",
      sending: "Yuborilmoqda…",
      sent: (n) => `Rahmat, ${n}. Ariza yuborildi, yurist tez orada siz bilan bog‘lanadi.`,
      netErr: "Arizani yuborib bo‘lmadi: server bilan aloqa yo‘q. Kiritilgan matn saqlandi, qayta urinib ko‘ring yoki +998 (87) 300-10-20 raqamiga qo‘ng‘iroq qiling.",
      demo: "Bu saytning maketi: maydonlar tekshiriladi, lekin ariza hozircha hech qayerga yuborilmaydi. Arizalarni qabul qilishni WordPress’ga ko‘chirishda ulaymiz. Shoshilinch savol bo‘lsa, +998 (87) 300-10-20 raqamiga qo‘ng‘iroq qiling.",
    },
    en: {
      toLight: "Switch to light theme",
      toDark: "Switch to dark theme",
      errName: "Please tell us your name",
      errPhone: "Please enter the full number: 9 digits after +998 for Uzbekistan",
      sending: "Sending…",
      sent: (n) => `Thank you, ${n}. Your request has been sent, a lawyer will contact you shortly.`,
      netErr: "We could not send your request: no connection to the server. Your text is saved, please try again or call +998 (87) 300-10-20.",
      demo: "This is a website mockup: the fields are checked, but the request is not sent anywhere yet. We will connect request handling when the site moves to WordPress. For an urgent question, call +998 (87) 300-10-20.",
    },
  }[lang] || {};

  // Тема: тёмная по умолчанию, светлая по кнопке; выбор запоминаем
  const themeBtns = $$("[data-theme-toggle]");
  const metaTheme = $('meta[name="theme-color"]');
  const syncThemeUi = () => {
    const light = root.getAttribute("data-theme") === "light";
    themeBtns.forEach((b) => b.setAttribute("aria-label", light ? T.toDark : T.toLight));
    if (metaTheme) metaTheme.setAttribute("content", light ? "#f8f7f4" : "#0a1020");
  };
  syncThemeUi();
  themeBtns.forEach((b) =>
    b.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
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
  } else if (header) {
    header.classList.add("is-solid");
  }

  // Выпадающие списки: «Практики», «Компания», язык, «Как добраться». Клик, стрелки, Esc, клик мимо.
  const dds = $$("[data-dd]").map((dd) => {
    const btn = $("[data-dd-btn]", dd);
    const menu = $("[data-dd-menu]", dd);
    const set = (open) => {
      menu.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
    };
    const items = () => $$("a", menu);
    btn.addEventListener("click", () => {
      const open = menu.hidden;
      dds.forEach((o) => o.dd !== dd && o.set(false));
      set(open);
    });
    dd.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !menu.hidden) {
        set(false);
        btn.focus();
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (menu.hidden) set(true);
        const list = items();
        const i = list.indexOf(document.activeElement);
        const next = i < 0 ? (e.key === "ArrowDown" ? 0 : list.length - 1) : e.key === "ArrowDown" ? (i + 1) % list.length : (i - 1 + list.length) % list.length;
        list[next].focus();
      }
    });
    dd.addEventListener("focusout", (e) => {
      if (!dd.contains(e.relatedTarget)) set(false);
    });
    return { dd, set };
  });
  document.addEventListener("click", (e) => dds.forEach((o) => !o.dd.contains(e.target) && o.set(false)));

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
    root.style.overflow = open ? "hidden" : "";
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
  window.matchMedia("(min-width: 1280px)").addEventListener("change", (e) => {
    if (e.matches) setMenu(false);
  });
  // Подменю в мобильном меню раскрываются по месту; раздел текущей страницы открыт сразу
  $$("[data-acc]").forEach((btn) => {
    const sub = document.getElementById(btn.getAttribute("aria-controls"));
    const set = (open) => {
      sub.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
    };
    if (btn.hasAttribute("aria-current")) set(true);
    btn.addEventListener("click", () => set(sub.hidden));
  });

  // Видео первого экрана: петля, пока первый экран виден. На слабых устройствах остаётся кадр-картинка.
  const video = $("[data-hero-video]");
  if (video) {
    if (lite) {
      video.poster = video.dataset.posterEnd;
    } else {
      const small = window.matchMedia("(max-width: 899px)").matches;
      video.src = small ? video.dataset.srcSm : video.dataset.srcLg;
      video.muted = true;
      video.loop = true;
      const play = () => {
        const p = video.play();
        if (p && p.catch) p.catch(() => (video.poster = video.dataset.posterEnd));
      };
      play();
      const hero = video.closest("section");
      if (hero && "IntersectionObserver" in window) {
        new IntersectionObserver(([e]) => (e.isIntersecting ? play() : video.pause()), { threshold: 0.05 }).observe(hero);
      }
    }
  }

  // Появление блоков. То, что видно сразу, не прячем; остальное проявляется за 0,4 с, как только входит в экран.
  const inView = (el) => {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0;
  };
  const animate = !lite && !reduce && "IntersectionObserver" in window;
  const revealEls = $$("[data-reveal]");
  if (animate) {
    revealEls.forEach((el) => inView(el) && el.classList.add("is-in"));
    root.classList.add("reveal-on");
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0 }
    );
    revealEls.filter((el) => !el.classList.contains("is-in")).forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-in"));
  }

  // Заголовки ниже первого экрана: слова поднимаются из-под маски
  const splitEls = animate ? $$("[data-split]").filter((el) => !inView(el)) : [];
  if (splitEls.length) {
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
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-split-in");
            splitIo.unobserve(e.target);
          }
        }),
      { threshold: 0 }
    );
    splitEls.forEach((el) => splitIo.observe(el));
  }

  // Блик за курсором на плитках и «магнитные» главные кнопки (только мышь и без облегчённого режима)
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (finePointer && !lite) {
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
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(steps.indexOf(e.target))),
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
    if (lite || !window.gsap || !window.ScrollTrigger) return;
    window.gsap.registerPlugin(window.ScrollTrigger);
    // Фоновые фото блоков медленно смещаются при прокрутке
    $$("[data-parallax]").forEach((img) => {
      window.gsap.fromTo(
        img,
        { yPercent: -5 },
        { yPercent: 5, ease: "none", scrollTrigger: { trigger: img.closest("section"), start: "top bottom", end: "bottom top", scrub: true } }
      );
    });
    if (!stepsList || !stage) return;
    window.ScrollTrigger.create({
      trigger: steps[0],
      start: `center ${band + 10}%`,
      endTrigger: steps[steps.length - 1],
      end: `center ${band}%`,
      onUpdate: (self) => emit(self.progress),
      onRefresh: (self) => emit(self.progress),
    });
  });

  // Телефон: +998 XX XXX-XX-XX для Узбекистана, для других стран + и цифры
  const formatPhone = (v) => {
    const intl = v.trim().startsWith("+");
    let d = v.replace(/\D/g, "");
    if (!d) return "";
    if (!intl && !d.startsWith("998")) d = "998" + d;
    if (!d.startsWith("998")) return "+" + d.slice(0, 15);
    const r = d.slice(3, 12);
    let out = "+998";
    if (r.length) out += " " + r.slice(0, 2);
    if (r.length > 2) out += " " + r.slice(2, 5);
    if (r.length > 5) out += "-" + r.slice(5, 7);
    if (r.length > 7) out += "-" + r.slice(7, 9);
    return out;
  };
  const phoneOk = (v) => {
    const d = v.replace(/\D/g, "");
    return d.startsWith("998") ? d.length === 12 : d.length >= 8 && d.length <= 15;
  };

  // Формы заявки. «Успех» только после ответа сервера; без адреса приёма (макет) говорим об этом прямо.
  const endpoint = () => (window.ICFLP_FORM_ENDPOINT || "").trim();
  $$("[data-form]").forEach((form) => {
    const status = $("[data-form-status]", form);
    const submit = $("[data-submit]", form);
    const submitLabel = $("[data-submit-label]", form);
    const labelText = submitLabel.textContent;
    const { name, phone, message, company } = form.elements;
    const setErr = (el, msg) => {
      el.setAttribute("aria-invalid", msg ? "true" : "false");
      const box = document.getElementById(`${el.id}-err`);
      if (box) box.textContent = msg;
      return !msg;
    };
    const show = (state, text) => {
      status.dataset.state = state;
      status.textContent = text;
      status.hidden = false;
    };
    phone.addEventListener("focus", () => {
      if (!phone.value) phone.value = "+998 ";
    });
    phone.addEventListener("blur", () => {
      if (phone.value.trim() === "+998") phone.value = "";
      else if (phone.value && !phoneOk(phone.value)) setErr(phone, T.errPhone);
    });
    phone.addEventListener("input", () => {
      if (phone.selectionStart === phone.value.length) phone.value = formatPhone(phone.value);
      phone.dataset.valid = String(phoneOk(phone.value));
    });
    [name, phone].forEach((el) =>
      el.addEventListener("input", () => {
        if (el.getAttribute("aria-invalid") === "true") setErr(el, "");
      })
    );
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (form.dataset.busy) return; // защита от повторной отправки
      const okName = setErr(name, name.value.trim().length < 2 ? T.errName : "");
      const okPhone = setErr(phone, phoneOk(phone.value) ? "" : T.errPhone);
      if (!okName || !okPhone) {
        form.querySelector('[aria-invalid="true"]').focus();
        return;
      }
      if (company && company.value) return; // скрытое поле заполнил бот
      const ENDPOINT = endpoint();
      if (!ENDPOINT) {
        show("info", T.demo);
        return;
      }
      form.dataset.busy = "1";
      submit.setAttribute("aria-busy", "true");
      submitLabel.textContent = T.sending;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      try {
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            name: name.value.trim(),
            phone: phone.value.replace(/[^\d+]/g, ""),
            message: message.value.trim(),
            source: form.dataset.formSource || "",
            page: location.pathname,
            lang,
          }),
          signal: ctrl.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.ok === false) throw new Error(String(res.status));
        show("ok", T.sent(name.value.trim()));
        form.reset();
        delete phone.dataset.valid;
        track("form_success", { form_source: form.dataset.formSource || "" });
      } catch (err) {
        show("error", T.netErr); // введённое не стираем
        track("form_error", { form_source: form.dataset.formSource || "" });
      } finally {
        clearTimeout(timer);
        delete form.dataset.busy;
        submit.removeAttribute("aria-busy");
        submitLabel.textContent = labelText;
      }
    });
  });

  // Всплывающее окно «Получить консультацию». Без JS или без <dialog> кнопки ведут к форме в «Контактах».
  const dialog = $("#consult");
  if (dialog && typeof dialog.showModal === "function") {
    const dForm = $("[data-form]", dialog);
    const dStatus = $("[data-form-status]", dForm);
    const openDialog = (e) => {
      e.preventDefault();
      if (mnav && mnav.classList.contains("is-open")) setMenu(false);
      // после успешной отправки показываем чистую форму; после ошибки введённое остаётся
      if (dStatus.dataset.state === "ok" || dStatus.dataset.state === "info") dStatus.hidden = true;
      dialog.showModal();
      root.style.overflow = "hidden";
      if (window.matchMedia("(pointer: fine)").matches) dForm.elements.name.focus();
      track("consult_open");
    };
    $$("[data-consult]").forEach((a) => a.addEventListener("click", openDialog));
    $("[data-consult-close]", dialog)?.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });
    dialog.addEventListener("close", () => {
      root.style.overflow = "";
    });
  }

  // Клики, которые считают счётчики: телефон, мессенджеры, карты, MaktabLaw
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    const href = a.getAttribute("href") || "";
    if (href.startsWith("tel:")) track("phone_click");
    else if (/wa\.me|t\.me/.test(href)) track("messenger_click", { messenger: href.includes("wa.me") ? "whatsapp" : "telegram" });
    else if (/2gis|yandex\.[a-z]+\/maps|google\.[a-z]+\/maps/.test(href)) track("map_click");
    if (a.dataset.ml) track("maktablaw_click", { target: a.dataset.ml });
  });
})();
