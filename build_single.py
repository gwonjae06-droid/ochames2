from pathlib import Path

ROOT = Path(__file__).resolve().parent
html = (ROOT / 'index.html').read_text(encoding='utf-8')
css_marker = '<link rel="stylesheet" href="style.css">'
if html.count(css_marker) != 1:
    raise RuntimeError('CSS 참조를 정확히 한 번 찾을 수 없습니다.')
html = html.replace(css_marker, '<style>' + (ROOT / 'style.css').read_text(encoding='utf-8') + '</style>', 1)
for name in ('data.js', 'engine.js', 'ai.js', 'audio.js', 'effects.js', 'app.js'):
    marker = f'<script src="js/{name}"></script>'
    if html.count(marker) != 1:
        raise RuntimeError(f'{name} 참조를 정확히 한 번 찾을 수 없습니다.')
    html = html.replace(marker, '<script>' + (ROOT / 'js' / name).read_text(encoding='utf-8') + '</script>', 1)
output = ROOT / 'dist' / 'oibung_battle_share.html'
output.parent.mkdir(exist_ok=True)
output.write_text(html, encoding='utf-8')
print(f'생성 완료: {output}')
