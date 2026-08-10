// ============================================================
// Общие интерактивные элементы сайта
// ============================================================
(function () {
  // ----- Мобильное меню -----
  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
    });
    mobileMenu.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => mobileMenu.classList.remove('open'))
    );
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
  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  // impeccable-disable broken-image: placeholder dynamically populated on click
  lightbox.innerHTML = '<img alt="">';
  document.body.appendChild(lightbox);
  const lbImg = lightbox.querySelector('img');
  document.querySelectorAll('[data-lightbox]').forEach(el => {
    el.addEventListener('click', () => {
      lbImg.src = el.getAttribute('data-lightbox') || el.src;
      lbImg.alt = el.alt || '';
      lightbox.classList.add('open');
    });
  });
  lightbox.addEventListener('click', () => lightbox.classList.remove('open'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') lightbox.classList.remove('open');
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
  if (termBody) {
    const bootLines = [
      { text: 'connecting to vs-tereshkin.local ...', delay: 300 },
      { text: 'authentication: ok', delay: 260 },
      { text: 'sysname VS-ENGINEER', delay: 260 },
      { text: '', delay: 120 },
      { text: 'Вячеслав Терёшкин — сетевой инженер / специалист ИБ.', delay: 480, strong: true },
      { text: '14+ лет в связи: от ВОЛС и АТС до 802.1X и КИИ.', delay: 420 },
      { text: '', delay: 100 },
      { text: 'введите help — список команд, Tab — автодополнение', delay: 220, hint: true },
      { text: '#', delay: 0 }
    ];

    const COMMANDS = {
      about:      { hash: '#about',      desc: 'обо мне' },
      experience: { hash: '#experience', desc: 'опыт работы' },
      education:  { hash: '#education',  desc: 'образование и сертификаты' },
      skills:     { hash: '#skills',     desc: 'навыки' },
      projects:   { hash: '#projects',   desc: 'проекты' },
      lab:        { hash: '#homelab',    desc: 'домашняя лаборатория' },
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
        setTimeout(() => termInput && termInput.focus({ preventScroll: true }), 100);
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

// ----- Финальная адаптивность: гарантировать минимальные touch-targets -----
function ensureMinTouchTargets() {
  // Кнопки
  document.querySelectorAll('button').forEach(btn => {
    if (btn.offsetWidth < 44) btn.style.width = '44px';
    if (btn.offsetHeight < 44) btn.style.height = '44px';
  });

  // Интерактивные ссылки и кнопки
  document.querySelectorAll('a, [role="button"]').forEach(el => {
    const h = el.offsetHeight;
    const w = el.offsetWidth;

    // Если высота < 44, гарантировать минимум
    if (h > 0 && h < 44 && (el.textContent.includes('Связаться') || el.textContent.includes('Резюме') || el.textContent.includes('Проекты'))) {
      el.style.display = 'inline-flex';
      el.style.alignItems = 'center';
      el.style.minHeight = '44px';
    }

    // Логотип
    if (el.textContent.includes('VS') && el.textContent.includes('tereshkin')) {
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.minHeight = '44px';
    }
  });
}

// Выполнить через 100ms, 500ms и 1000ms
setTimeout(ensureMinTouchTargets, 100);
setTimeout(ensureMinTouchTargets, 500);
setTimeout(ensureMinTouchTargets, 1000);
