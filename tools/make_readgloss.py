#!/usr/bin/env python3
# 构建时为阅读短文/留学连载预生成逐词小注词表 data/read_gloss.json
# 数据源：站内 dict/de_*.json 切片（HanDeDict 反向索引）；
# 只收词库(categories)查不到、且词典能给出合格中文(≤6字)的词 → 体积极小、离线可用。
import re,json,glob,sys

def bank_keys():
    keys=set()
    for c in json.load(open('data/categories.json',encoding='utf-8')):
        for p in c['phrases']:
            de=p['de']
            noun=re.sub(r'^(der|die|das)\s+','',de)
            if not re.search(r'\s',noun):keys.add(noun.lower())
            bare=re.sub(r'''[!?.,…;:"'()]''','',de).strip()
            if bare and not re.search(r'\s',bare):keys.add(bare.lower())
            keys.add(de.lower())
    return keys

def load_dict():
    d={}
    for f in glob.glob('dict/de_*.json'):d.update(json.load(open(f,encoding='utf-8')))
    return d

SUFS=['est','en','er','em','es','st','e','n','t','s']
def lookup(d,t):
    if t in d:return d[t]
    for f in SUFS:
        if len(t)>len(f)+2 and t.endswith(f):
            b=t[:-len(f)];u=b.replace('ä','a').replace('ö','o').replace('ü','u')
            for c in (b,b+'en',b+'e')+((u,u+'en') if u!=b else ()):
                if c in d:return d[c]
    return None

def bank_hit(bank,t):
    if t in bank:return True
    for f in SUFS:
        if len(t)>len(f)+2 and t.endswith(f):
            b=t[:-len(f)];u=b.replace('ä','a').replace('ö','o').replace('ü','u')
            for c in (b,b+'en',b+'e',u,u+'en'):
                if c in bank:return True
    return False

def main():
    bank=bank_keys();D=load_dict()
    words=set()
    for f in ('data/readings.json','data/series.json'):
        for r in json.load(open(f,encoding='utf-8')):
            for p in r['paras']:
                for w in re.findall(r"[A-Za-zÄÖÜäöüß]+",p[0]):words.add(w.lower())
    out={}
    for t in sorted(words):
        if bank_hit(bank,t):continue
        hit=lookup(D,t)
        if not hit:continue
        z=re.split(r'[，,、/；;（(]',hit[1])[0].rstrip('。！？!?.')
        if z and len(z)<=6:out[t]=[hit[0],z]
    open('data/read_gloss.json','w',encoding='utf-8').write(json.dumps(out,ensure_ascii=False,separators=(',',':')))
    print(f'✓ read_gloss: {len(out)} 词，{len(json.dumps(out,ensure_ascii=False))//1024}KB')

main()
