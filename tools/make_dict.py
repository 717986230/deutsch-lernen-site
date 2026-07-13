#!/usr/bin/env python3
# 从 HanDeDict（CC BY-SA）生成德→中兜底词典分片 dict/de_*.json
# 用法：curl -sL -o /tmp/handedict.u8 https://raw.githubusercontent.com/gugray/HanDeDict/master/handedict.u8
#       python3 tools/make_dict.py /tmp/handedict.u8
import re,json,collections,sys
src=sys.argv[1] if len(sys.argv)>1 else '/tmp/handedict.u8'
pat=re.compile(r'^(\S+)\s+(\S+)\s+\[([^\]]*)\]\s+/(.+)/\s*$')
tag=re.compile(r'\([^)]*\)')
W={1:1,2:4,3:5,4:4,5:2,6:1}          # 中文长度权重：2-4 字最像"词义"
votes=collections.defaultdict(collections.Counter)
disp={}
for line in open(src,encoding='utf-8-sig'):
    if line.startswith('#'):continue
    m=pat.match(line.strip())
    if not m:continue
    _,simp,_,glosses=m.groups()
    if len(simp)>6 or not re.search(r'[一-鿿]',simp):continue
    for g in glosses.split('/'):
        g=tag.sub('',g.split(';')[0])         # 先去 (S, Bio) 标记再切逗号并列
        for part in g.split(','):
            w=part.strip()
            if not re.fullmatch(r"[A-Za-zÄÖÜäöüß\-]{2,24}",w):continue
            k=w.lower()
            votes[k][simp]+=W.get(len(simp),1)
            if k not in disp or w[0].isupper():disp[k]=w
def shard(k):
    c=k[0]
    c={'ä':'a','ö':'o','ü':'u','ß':'s'}.get(c,c)
    return c if 'a'<=c<='z' else 'x'
shards=collections.defaultdict(dict)
for k,c in votes.items():
    zh=sorted(c.items(),key=lambda x:(-x[1],len(x[0])))[0][0]
    shards[shard(k)][k]=[disp[k],zh]
tot=0
for c,d in sorted(shards.items()):
    b=json.dumps(d,ensure_ascii=False,separators=(',',':'))
    open(f'dict/de_{c}.json','w',encoding='utf-8').write(b)
    tot+=len(b.encode())
print(f'✓ {sum(len(d) for d in shards.values())} 键 → {len(shards)} 分片，共 {tot//1024}KB')
