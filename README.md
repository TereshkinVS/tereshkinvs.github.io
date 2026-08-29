# tereshkinvs.ru — портфолио

Сетевой инженер / специалист ИБ — Вячеслав Терёшкин.

## Состав

```
index.html              главная (одностраничник, без сборки)
projects/               страницы проектов
  configurator.html     генератор L3-конфигураций (работает локально в браузере)
  configurator-engine.js
  infinet-wenco.html · private-lte.html · l3-8021x.html
  video-surveillance.html · kii-lab.html
assets/css/             style.css (общие токены), tool.css (конфигуратор)
assets/js/main.js       интерактив страниц проектов
assets/img/             фото, дипломы, сертификаты, favicon
```

## Локальный запуск

Достаточно открыть `index.html` в браузере. Либо:

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## Публикация на GitHub Pages

1. Создать репозиторий и залить содержимое этой папки в корень ветки `main`.
2. Settings → Pages → Source: `Deploy from a branch`, ветка `main`, папка `/ (root)`.
3. Через минуту сайт доступен по адресу `https://<username>.github.io/<repo>/`.
4. Для своего домена: Settings → Pages → Custom domain → `tereshkinvs.ru`, у регистратора добавить CNAME на `<username>.github.io`.

## Кастомизация

Весь сайт — статический HTML без сборки. Главная и страницы проектов используют
общие `assets/css/style.css` и `assets/js/main.js`.

Дизайн-токены заданы переменными в начале `assets/css/style.css`:
`--accent: #f2c94c` (жёлтый акцент), `--bg`, `--surface`, `--border`, радиусы,
шрифты и три цвета карьерного нарратива (`--copper`, `--slate`, `--accent`).

### Структура главной

`hero` → `#scale` → `#about` → `#cases` → `#lifecycle` → `#skills` →
`#experience` → `#legal` → `#education` → `#principles` → `#contact`

### Анимации

Появление секций (`.reveal`, `.stagger`) включается классом `js` на `<html>` —
его ставит инлайн-скрипт в `<head>`. Без JS и при `prefers-reduced-motion`
контент показывается сразу, ничего не скрывается.
