"""
Собирает карточку для соцсетей assets/img/og-card.jpg (1200x630).

Запуск из корня сайта:  python tools/make-og.py
Нужны пакеты:           pip install Pillow fonttools brotli

Кириллица и латиница у Google Fonts лежат в разных подмножествах, поэтому
шрифт переключается посимвольно — см. draw_mixed().
"""
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont
import os, tempfile, shutil

W, H = 1200, 630
BG, TEXT, DIM, FAINT = (10, 10, 12), (240, 238, 234), (185, 183, 192), (138, 136, 160)
ACCENT, BORDER = (242, 201, 76), (38, 38, 46)

# ——— что написано на карточке ———
NAME = 'Вячеслав Терёшкин'
ROLE = ['Сетевая и промышленная', 'инфраструктура связи']
FACTS = ['12+ лет в связи  ·  300+ единиц техники',
         'ВОЛС · TETRA · Private LTE · защита КИИ']
DOMAIN = 'TERESHKINVS.RU'

FONTS = 'assets/fonts'
tmp = tempfile.mkdtemp()

def ttf(src, size):
    """woff2 -> ttf: Pillow не читает woff2 напрямую."""
    dst = os.path.join(tmp, src.replace('.woff2', '.ttf'))
    f = TTFont(os.path.join(FONTS, src)); f.flavor = None; f.save(dst)
    return ImageFont.truetype(dst, size), set(TTFont(dst).getBestCmap())

# Имя — заголовочным шрифтом сайта, роль — основным текстовым
faces = {
    ('name', 'cyr'): ttf('golos-text-700-cyrillic.woff2', 58),
    ('name', 'lat'): ttf('golos-text-700-latin.woff2', 58),
    ('role', 'cyr'): ttf('manrope-500-cyrillic.woff2', 30),
    ('role', 'lat'): ttf('manrope-500-latin.woff2', 30),
    ('mono', 'cyr'): ttf('jetbrains-mono-400-cyrillic.woff2', 17),
    ('mono', 'lat'): ttf('jetbrains-mono-400-latin.woff2', 17),
    ('eyebrow', 'lat'): ttf('jetbrains-mono-500-latin.woff2', 15),
}

def draw_mixed(d, xy, text, role, fill):
    """Рисует строку, выбирая шрифт по наличию символа в подмножестве."""
    x, y = xy
    for ch in text:
        font = None
        for sub in ('cyr', 'lat'):
            face = faces.get((role, sub))
            if face and ord(ch) in face[1]:
                font = face[0]; break
        font = font or faces[(role, 'lat')][0]
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font)
    return x

img = Image.new('RGB', (W, H), BG)
d = ImageDraw.Draw(img)

# портрет справа: кадрируем по ширине, чтобы голова осталась в кадре
PW = 470
photo = Image.open('assets/img/portrait-suit.jpg').convert('RGB')
pw, ph = photo.size
cw = int(ph * (PW / H))
photo = photo.crop(((pw - cw) // 2, 0, (pw - cw) // 2 + cw, ph)).resize((PW, H), Image.LANCZOS)

# левый край растворяется в фоне
mask = Image.new('L', (PW, H), 255)
md = ImageDraw.Draw(mask)
FADE = 200
for i in range(FADE):
    md.line([(i, 0), (i, H)], fill=int(255 * (i / FADE) ** 1.4))
img.paste(photo, (W - PW, 0), mask)

d.rectangle([0, 0, W, 4], fill=ACCENT)          # акцентная полоса сверху

x0 = 64
draw_mixed(d, (x0, 96), DOMAIN, 'eyebrow', FAINT)
draw_mixed(d, (x0, 150), NAME, 'name', TEXT)
draw_mixed(d, (x0, 240), ROLE[0], 'role', ACCENT)
draw_mixed(d, (x0, 282), ROLE[1], 'role', ACCENT)
d.line([(x0, 360), (x0 + 300, 360)], fill=BORDER, width=1)
draw_mixed(d, (x0, 390), FACTS[0], 'mono', DIM)
draw_mixed(d, (x0, 420), FACTS[1], 'mono', DIM)

out = 'assets/img/og-card.jpg'
img.save(out, 'JPEG', quality=90, optimize=True, progressive=True)
shutil.rmtree(tmp, ignore_errors=True)
print(f'{out}: {img.size[0]}x{img.size[1]}, {os.path.getsize(out)} байт')
