// ============================================================
// Общие интерактивные элементы сайта
// ============================================================
(function () {
  // ----- Ловушка фокуса для оверлеев (меню, лайтбокс) -----
  // Пока оверлей открыт, Tab не должен уводить в страницу под ним.
  const FOCUSABLE = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';

  function trapFocus(container) {
    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const items = [...container.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    container.addEventListener('keydown', onKey);
    return () => container.removeEventListener('keydown', onKey);
  }

  const lockScroll = (on) => document.body.classList.toggle('no-scroll', on);

  // ----- Мобильное меню -----
  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  if (menuBtn && mobileMenu) {
    let releaseMenuTrap = null;

    // Иконки рисуются, а не набираются глифами — один штрих с остальной графикой.
    const svg = (paths) =>
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">${paths}</svg>`;
    const ICON_BURGER = svg('<path d="M4 7h16M4 12h16M4 17h16"/>');
    const ICON_CLOSE = svg('<path d="M6 6l12 12M18 6L6 18"/>');

    const setMenu = (open) => {
      mobileMenu.classList.toggle('open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Закрыть меню' : 'Меню');
      menuBtn.innerHTML = open ? ICON_CLOSE : ICON_BURGER;
      lockScroll(open);

      if (open) {
        releaseMenuTrap = trapFocus(mobileMenu);
        mobileMenu.querySelector('a')?.focus();
      } else {
        releaseMenuTrap?.();
        releaseMenuTrap = null;
        // Фокус не должен остаться на ссылке, которую только что скрыли —
        // возвращаем его на кнопку при любом способе закрытия.
        if (mobileMenu.contains(document.activeElement)) menuBtn.focus();
      }
    };

    menuBtn.addEventListener('click', () => setMenu(!mobileMenu.classList.contains('open')));
    mobileMenu.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => setMenu(false))
    );
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('open')) setMenu(false);
    });
  }

  // ----- Scroll reveal -----
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // ----- Lightbox для фото (сертификаты, дипломы, фото с объектов) -----
  // Диалог собирается скриптом: без JS миниатюры остаются обычными
  // картинками и не притворяются кнопками, которые никуда не ведут.
  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-label', 'Просмотр изображения');
  // impeccable-disable broken-image: placeholder dynamically populated on click
  lightbox.innerHTML =
    '<button class="lightbox-close" type="button" aria-label="Закрыть">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
        '<path d="M6 6l12 12M18 6L6 18"/>' +
      '</svg>' +
    '</button>' +
    '<img alt="">';
  document.body.appendChild(lightbox);

  const lbImg = lightbox.querySelector('img');
  const lbClose = lightbox.querySelector('.lightbox-close');
  let lastTrigger = null;
  let releaseLbTrap = null;

  function openLightbox(el) {
    lbImg.src = el.getAttribute('data-lightbox') || el.src;
    lbImg.alt = el.alt || '';
    lightbox.setAttribute('aria-label', el.alt ? 'Просмотр: ' + el.alt : 'Просмотр изображения');
    lastTrigger = el;
    lightbox.classList.add('open');
    lockScroll(true);
    releaseLbTrap = trapFocus(lightbox);
    lbClose.focus();
  }

  function closeLightbox() {
    if (!lightbox.classList.contains('open')) return;
    lightbox.classList.remove('open');
    lockScroll(false);
    releaseLbTrap?.();
    releaseLbTrap = null;
    lastTrigger?.focus();   // фокус возвращается туда, откуда открыли
    lastTrigger = null;
  }

  document.querySelectorAll('[data-lightbox]').forEach(el => {
    // Доступ с клавиатуры добавляется здесь же, где живёт поведение.
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-haspopup', 'dialog');
    if (el.alt) el.setAttribute('aria-label', 'Открыть изображение: ' + el.alt);

    el.addEventListener('click', () => openLightbox(el));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(el); }
    });
  });

  lbClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => { if (e.target !== lbClose) closeLightbox(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });

  // ----- Глоссарные термины: связать всплывающую карточку с термином -----
  // Без этого скринридер зачитывает определение как обычный текст посреди
  // предложения, ещё и повторяя сам термин дважды.
  document.querySelectorAll('.term').forEach((term, n) => {
    const card = term.querySelector('.term-card');
    if (!card) return;
    const id = 'term-def-' + n;
    card.id = id;
    card.setAttribute('role', 'tooltip');
    card.querySelector('b')?.setAttribute('aria-hidden', 'true'); // дубль названия
    term.setAttribute('aria-describedby', id);
    term.setAttribute('role', 'button');
    term.setAttribute('aria-expanded', 'false');

    // На тач-устройствах :hover не срабатывает — объяснения были недоступны
    // вообще. Открываем по тапу, закрываем по повторному тапу или Escape.
    const toggle = (on) => {
      document.querySelectorAll('.term.is-open').forEach(t => {
        if (t !== term) { t.classList.remove('is-open'); t.setAttribute('aria-expanded', 'false'); }
      });
      term.classList.toggle('is-open', on);
      term.setAttribute('aria-expanded', String(on));
    };

    term.addEventListener('click', (e) => {
      e.stopPropagation();
      toggle(!term.classList.contains('is-open'));
    });
    term.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(!term.classList.contains('is-open')); }
      if (e.key === 'Escape') toggle(false);
    });
  });
  document.addEventListener('click', () => {
    document.querySelectorAll('.term.is-open').forEach(t => {
      t.classList.remove('is-open'); t.setAttribute('aria-expanded', 'false');
    });
  });

  // ----- Индикатор прокрутки страницы -----
  const progress = document.querySelector('.scroll-progress');
  if (progress) {
    const updateProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }

  // ----- Копирование почты по клику -----
  document.querySelectorAll('[data-copy]').forEach(el => {
    el.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await navigator.clipboard.writeText(el.getAttribute('data-copy'));
        const original = el.dataset.originalLabel || el.querySelector('.v')?.textContent;
        el.dataset.originalLabel = original;
        const v = el.querySelector('.v');
        if (v) {
          v.textContent = 'скопировано';
          setTimeout(() => { v.textContent = original; }, 1400);
        }
      } catch (err) {
        window.location.href = 'mailto:' + el.getAttribute('data-copy');
      }
    });
  });

  // ----- Терминал: загрузочная последовательность + маршрутизация командами -----
  const termBody = document.getElementById('termBody');
  const termInput = document.getElementById('termInput');
  const termBox = document.querySelector('.terminal');
  // На мобильных терминал скрыт через CSS — не гоняем анимацию впустую.
  const termVisible = termBox && getComputedStyle(termBox).display !== 'none';
  if (termBody && termVisible) {
    const bootLines = [
      { text: 'connecting to vs-tereshkin.local ...', delay: 300 },
      { text: 'authentication: ok', delay: 260 },
      { text: '', delay: 120 },
      { text: '$ whoami', delay: 300, hint: true },
      { text: 'Вячеслав Терёшкин', delay: 380, strong: true },
      { text: '', delay: 100 },
      { text: '$ role', delay: 260, hint: true },
      { text: 'Ведущий специалист по сетевой', delay: 340 },
      { text: 'и промышленной инфраструктуре связи', delay: 420 },
      { text: '', delay: 100 },
      { text: 'кликните ниже и введите help — список команд, Tab — автодополнение', delay: 220, hint: true }
    ];

    const COMMANDS = {
      scale:      { hash: '#scale',      desc: 'масштаб инфраструктуры' },
      about:      { hash: '#about',      desc: 'о себе' },
      cases:      { hash: '#cases',      desc: 'ключевые кейсы' },
      lifecycle:  { hash: '#lifecycle',  desc: 'как я работаю' },
      skills:     { hash: '#skills',     desc: 'навыки' },
      experience: { hash: '#experience', desc: 'опыт работы' },
      legal:      { hash: '#legal',      desc: 'нормативная база и КИИ' },
      education:  { hash: '#education',  desc: 'образование и сертификаты' },
      contact:    { hash: '#contact',    desc: 'связаться' },
      cv:         { url: 'https://barnaul.hh.ru/resume/d044b285ff0f369fa10039ed1f754d32427461?hhtmFrom=my_resumes', desc: 'резюме на hh.ru' },
      github:     { url: 'https://github.com/TereshkinVS', desc: 'профиль на github' },
      help:       { desc: 'список команд' },
      clear:      { desc: 'очистить экран' }
    };
    const NAMES = Object.keys(COMMANDS);

    let i = 0;
    function printLine(item) {
      const div = document.createElement('div');
      div.className = 'term-line';
      if (item.text === '#') {
        div.innerHTML = '<span class="term-prompt">vs@engineer:~$</span>';
      } else if (item.strong) {
        div.style.color = 'var(--accent)';
        div.style.fontWeight = '600';
        div.textContent = item.text;
      } else if (item.hint) {
        div.className = 'term-line term-hint';
        div.textContent = item.text;
      } else {
        div.textContent = item.text || '\u00A0';
      }
      termBody.appendChild(div);
      termBody.scrollTop = termBody.scrollHeight;
    }
    function typeNext() {
      if (i >= bootLines.length) {
        // Автофокуса нет намеренно: он угонял фокус посреди чтения страницы
        // и отнимал прокрутку с клавиатуры. Фокус — только по клику ниже.
        return;
      }
      printLine(bootLines[i]);
      i++;
      setTimeout(typeNext, bootLines[i - 1].delay);
    }
    setTimeout(typeNext, 260);

    function say(text, color) {
      const div = document.createElement('div');
      div.className = 'term-line';
      div.style.opacity = '1';
      if (color) div.style.color = color;
      div.textContent = text;
      termBody.appendChild(div);
    }

    const history = [];
    let historyPos = -1;

    if (termInput) {
      termInput.addEventListener('keydown', (e) => {
        // --- автодополнение по Tab ---
        if (e.key === 'Tab') {
          e.preventDefault();
          const partial = termInput.value.trim().toLowerCase();
          if (!partial) return;
          const matches = NAMES.filter(n => n.startsWith(partial));
          if (matches.length === 1) {
            termInput.value = matches[0];
          } else if (matches.length > 1) {
            say(matches.join('  '), 'var(--text-faint)');
            termBody.scrollTop = termBody.scrollHeight;
          }
          return;
        }

        // --- история команд ---
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          if (!history.length) return;
          e.preventDefault();
          if (e.key === 'ArrowUp') historyPos = Math.min(historyPos + 1, history.length - 1);
          else historyPos = Math.max(historyPos - 1, -1);
          termInput.value = historyPos === -1 ? '' : history[historyPos];
          return;
        }

        if (e.key !== 'Enter') return;

        const val = termInput.value.trim().toLowerCase();
        termInput.value = '';
        if (val) { history.unshift(val); historyPos = -1; }

        const echo = document.createElement('div');
        echo.className = 'term-line';
        echo.style.opacity = '1';
        echo.innerHTML = '<span class="term-prompt">vs@engineer:~$</span> ' + val;
        termBody.appendChild(echo);

        if (!val) {
          termBody.scrollTop = termBody.scrollHeight;
          return;
        }

        if (val === 'clear') {
          termBody.innerHTML = '';
          return;
        }

        if (val === 'help') {
          NAMES.forEach(n => say('  ' + n.padEnd(12) + '— ' + COMMANDS[n].desc, 'var(--text-faint)'));
          termBody.scrollTop = termBody.scrollHeight;
          return;
        }

        const cmd = COMMANDS[val];
        if (!cmd) {
          say('команда не найдена: ' + val + ' — введите help', 'var(--amber)');
          termBody.scrollTop = termBody.scrollHeight;
          return;
        }

        if (cmd.url) {
          say('→ открываю ' + cmd.desc, 'var(--accent)');
          window.open(cmd.url, '_blank', 'noopener');
        } else if (cmd.hash) {
          say('→ переход: ' + val, 'var(--accent)');
          setTimeout(() => {
            const target = document.querySelector(cmd.hash);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 280);
        }
        termBody.scrollTop = termBody.scrollHeight;
      });
    }
    document.querySelector('.terminal')?.addEventListener('click', (e) => {
      if (window.getSelection().toString()) return;
      termInput && termInput.focus({ preventScroll: true });
    });
  }
})();

// ============================================================
// Анимации: счётчики, подсветка карточек, лёгкий параллакс
// ============================================================
(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ----- Счётчики в hero: число набегает при появлении -----
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    if (reduced) {
      counters.forEach(el => {
        el.textContent = el.dataset.count + (el.dataset.suffix || '');
      });
    } else {
      const countIO = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          countIO.unobserve(el);
          const target = parseInt(el.dataset.count, 10);
          const suffix = el.dataset.suffix || '';
          const duration = 1100;
          const start = performance.now();
          function tick(now) {
            const p = Math.min((now - start) / duration, 1);
            // easeOutExpo — быстрый разгон, мягкая остановка
            const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
            el.textContent = Math.round(target * eased) + suffix;
            if (p < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        });
      }, { threshold: 0.6 });
      counters.forEach(el => countIO.observe(el));
    }
  }

  if (reduced) return;

  // ----- Подсветка карточек проектов следует за курсором -----
  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  // ----- Портрет слегка смещается при скролле -----
  const portrait = document.querySelector('.about-photo img');
  if (portrait) {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const r = portrait.getBoundingClientRect();
        if (r.bottom > 0 && r.top < window.innerHeight) {
          const progress = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
          portrait.style.transform = `translateY(${(-progress * 14).toFixed(2)}px) scale(1.05)`;
        }
        ticking = false;
      });
    }, { passive: true });
  }
})();

// Минимальные touch-targets заданы в style.css через @media (pointer: coarse).
