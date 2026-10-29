#!/usr/bin/env python3
"""雅思词汇页（ielts/）数据生成器。

词库来自 Word Atlas（https://github.com/designfuchen/word-atlas），数据 CC BY 4.0，
署名「Word Atlas contributors」。这里只抽页面用得到的字段，按 CEFR 级别切成 6 个文件，
页面打开哪一级才下载哪一级。谐音用本仓库的 tools/en_pinyin.py（CMU 音标）生成。

    git clone --depth 1 https://github.com/designfuchen/word-atlas.git /tmp/word-atlas
    pip install cmudict
    python3 tools/gen-ielts.py /tmp/word-atlas/data/word-atlas.json

输出 ielts/data/<级别>.json：[[词, 英式音标, [[词性, 中文], …], 例句, 例句中文, 话题, 谐音, [搭配…]], …]
"""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
from en_pinyin import word_to_hanzi
import cmudict

cmu = cmudict.dict()
src = json.load(open(sys.argv[1], encoding='utf-8'))
out = {}
for w in src:
    lv = w.get('cefr') or 'C2'
    ex = (w.get('ex') or [{}])[0]
    py = ' '.join(filter(None, (word_to_hanzi(p, cmu) for p in w['w'].replace('-', ' ').split()))) if all(cmu.get(p.lower()) for p in w['w'].replace('-', ' ').split()) else ''
    out.setdefault(lv, []).append([
        w['w'], w.get('uk') or w.get('us') or '',
        [[s.get('pos', ''), s.get('zh', '')] for s in (w.get('senses') or [])[:3]],
        ex.get('en', ''), ex.get('zh', ''), w.get('topic', ''), py,
        [c for c in (w.get('col') or [])[:3]],
    ])
d = ROOT / 'ielts' / 'data'
d.mkdir(parents=True, exist_ok=True)
for lv, rows in sorted(out.items()):
    rows.sort(key=lambda r: r[0].lower())
    (d / f'{lv}.json').write_text(json.dumps(rows, ensure_ascii=False, separators=(',', ':')), 'utf-8')
    print(f'  {lv}: {len(rows)} 词, {(d / f"{lv}.json").stat().st_size // 1024}KB')
print('✓ 共', sum(len(v) for v in out.values()), '词')
