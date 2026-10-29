#!/usr/bin/env python3
"""儿童德语页（kinder/）生成器。

kinder/themes.json（内容源）+ kinder/template.html（页面模板）
  → kinder/audio/<哈希>.mp3（Piper Thorsten 德语配音，CC0）
  → kinder/index.html（数据内联，页面走 sw.js 的网络优先，改了马上生效）

音频文件名取朗读文本的哈希：文本不变就不重新合成，文本一改文件名跟着变，
sw.js 的缓存优先策略不会拿到旧录音。

用法（需要 piper-tts 和 ffmpeg）：
  pip install piper-tts
  curl -LO https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-de_DE-thorsten-medium.tar.bz2
  tar xjf vits-piper-de_DE-thorsten-medium.tar.bz2
  PIPER_MODEL=vits-piper-de_DE-thorsten-medium/de_DE-thorsten-medium.onnx python3 tools/gen-kinder.py
"""
import hashlib, json, os, subprocess, sys, tempfile, wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KD = ROOT / 'kinder'
AUDIO = KD / 'audio'


def audio_name(text):
    return hashlib.sha1(text.encode('utf-8')).hexdigest()[:10] + '.mp3'


def main():
    themes = json.loads((KD / 'themes.json').read_text('utf-8'))
    texts = []
    for t in themes:
        for it in t.get('items', []):
            word = (it['art'] + ' ' + it['de']) if it.get('art') else it['de']
            it['wa'] = audio_name(word); texts.append(word)
            it['sa'] = audio_name(it['s']); texts.append(it['s'])
        for ln in t.get('story', {}).get('lines', []):
            ln['a'] = audio_name(ln['de']); texts.append(ln['de'])
        g = t.get('guide')
        if g:  # 官方教材伴读：生词和例句也配音
            for v in g['vocab']:
                v['a'] = audio_name(v['de']); texts.append(v['de'])
            for gr in g['grammar']:
                for x in gr['ex']:
                    x['a'] = audio_name(x['de']); texts.append(x['de'])

    AUDIO.mkdir(exist_ok=True)
    todo = [x for x in dict.fromkeys(texts) if not (AUDIO / audio_name(x)).exists()]
    if todo:
        model = os.environ.get('PIPER_MODEL')
        if not model:
            sys.exit(f'有 {len(todo)} 句缺配音，请设置 PIPER_MODEL（见文件头说明）')
        from piper import PiperVoice
        voice = PiperVoice.load(model)
        with tempfile.TemporaryDirectory() as tmp:
            for x in todo:
                wav = Path(tmp) / 'a.wav'
                with wave.open(str(wav), 'wb') as wf:
                    voice.synthesize_wav(x, wf)
                # 单声道 48kbps：人声足够清楚，一句只有几 KB
                subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(wav),
                                '-ac', '1', '-b:a', '48k', str(AUDIO / audio_name(x))], check=True)
                print('🔊', x)

    keep = {audio_name(x) for x in texts}
    for f in AUDIO.glob('*.mp3'):
        if f.name not in keep:
            f.unlink(); print('🗑', f.name)

    data = json.dumps(themes, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    tpl = (KD / 'template.html').read_text('utf-8')
    assert '/*KINDER_DATA*/' in tpl
    (KD / 'index.html').write_text(tpl.replace('/*KINDER_DATA*/', data), 'utf-8')
    print(f'✓ kinder/index.html：{len(themes)} 个主题，{len(keep)} 段配音')


if __name__ == '__main__':
    main()
