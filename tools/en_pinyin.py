# -*- coding: utf-8 -*-
"""英语谐音生成器：从 CMU 音标（ARPABET）按音节生成中文谐音。

为什么重写：原有英语谐音是**按字母**机械音译的，会教错读音
（action → 「诶克什恩」，实际读 [ˈækʃən] 应作「诶克申」）。

算法（三步，不打补丁）：
 1. 以元音为核心切音节，辅音按「最大声母原则」分配：
    两元音之间的最后一个辅音归下一音节做声母，其余留作上一音节韵尾
    （money = mo-ney「马尼」，不是 mon-ey「门伊」）
 2. 每个音节用「声母+韵母」查表映射到一个汉字
 3. 韵尾归并：R 卷舌化并入前字（morning→莫宁）；N/NG 并作鼻韵尾
    （accent→厄克森特，不是「厄克塞恩特」）
"""

V = {'AA':'啊','AE':'诶','AH':'厄','AO':'奥','AW':'奥','AY':'艾','EH':'埃','ER':'尔',
     'EY':'诶','IH':'伊','IY':'伊','OW':'欧','OY':'奥伊','UH':'乌','UW':'乌'}

# 声母 + 韵母 → 汉字。查不到时退化为「声母字 + 韵母字」两个字。
SYL = {}
_ONSETS = {
 'B':'巴贝伯波包拜贝伯贝比比波布布','P':'帕佩珀泡泡派佩珀佩皮皮坡普普',
 'M':'马梅么莫毛麦梅默梅米米莫木木','F':'法菲佛佛福法费佛菲菲菲佛福福',
 'V':'瓦维弗沃瓦外维弗维维维沃乌乌','D':'达代德多道代德德戴迪迪多杜杜',
 'T':'塔泰特托陶泰特特太提提托图图','N':'那内呢诺瑙奈内呢内尼尼诺努努',
 'L':'拉莱勒洛劳莱莱勒雷利利洛鲁鲁','G':'嘎盖格高高盖盖格盖吉吉戈古古',
 'K':'卡凯克考考凯凯克凯基基科库库','HH':'哈哈赫豪豪海海赫海希希霍胡胡',
 'S':'萨塞瑟索骚赛塞瑟塞西西索苏苏','Z':'扎泽兹佐藻宰泽兹泽兹兹佐祖祖',
 'SH':'沙谢申肖绍夏谢舍谢施希肖舒舒','ZH':'扎日热若饶热日热日日日若如如',
 'CH':'查切澈乔超柴切澈切奇奇乔楚楚','JH':'贾杰哲乔焦贾杰哲杰吉吉乔朱朱',
 'TH':'萨塞瑟索骚赛塞瑟塞西西索苏苏','DH':'扎泽惹佐藻宰泽泽泽济济佐祖祖',
 'R':'拉瑞惹罗饶赖瑞惹瑞瑞瑞罗鲁鲁','W':'瓦威沃沃瓦怀威沃威威威沃乌乌',
 'Y':'雅耶耶尤耀亚耶耶耶伊伊哟尤尤',
}
_VORDER = ['AA','AE','AH','AO','AW','AY','EH','ER','EY','IH','IY','OW','UH','UW']
for _c, _s in _ONSETS.items():
    for _i, _v in enumerate(_VORDER):
        if _i < len(_s): SYL[_c + '_' + _v] = _s[_i]

CODA = {'B':'布','P':'普','M':'姆','F':'夫','V':'夫','D':'德','T':'特','N':'恩','NG':'恩',
        'L':'尔','G':'格','K':'克','HH':'赫','S':'斯','Z':'兹','SH':'什','ZH':'日',
        'CH':'奇','JH':'吉','TH':'斯','DH':'兹','R':'尔','W':'乌','Y':'伊'}
ONSET1 = {'B':'布','P':'普','M':'姆','F':'弗','V':'弗','D':'德','T':'特','N':'呢','L':'勒',
          'G':'格','K':'克','HH':'赫','S':'斯','Z':'兹','SH':'什','ZH':'日','CH':'奇',
          'JH':'吉','TH':'斯','DH':'兹','R':'瑞','W':'乌','Y':'伊','NG':'恩'}

# 鼻韵尾归并：韵母字 + N/NG → 带鼻音的字
NASAL = {
 '塞':'森','瑟':'森','萨':'桑','西':'辛','苏':'孙','索':'松','斯':'森',
 '贝':'本','巴':'邦','比':'宾','布':'本','波':'邦','伯':'本','包':'邦',
 '佩':'盆','帕':'潘','皮':'品','普':'喷','珀':'盆','泡':'潘',
 '梅':'门','马':'芒','米':'民','木':'蒙','么':'门','莫':'蒙','毛':'芒',
 '费':'芬','菲':'芬','法':'方','佛':'丰','福':'丰','弗':'芬',
 '维':'文','瓦':'万','沃':'翁','威':'文','外':'弯',
 '德':'登','达':'当','迪':'丁','杜':'顿','戴':'丹','多':'东','代':'丹','道':'当',
 '特':'腾','塔':'汤','提':'廷','图':'吞','托':'通','泰':'坦','陶':'汤',
 '内':'嫩','那':'南','尼':'宁','努':'农','诺':'农','呢':'嫩','瑙':'囊',
 '莱':'伦','拉':'兰','利':'林','鲁':'伦','洛':'龙','勒':'伦','雷':'冷','劳':'朗',
 '格':'根','嘎':'冈','吉':'金','古':'滚','戈':'工','盖':'甘','高':'冈',
 '克':'肯','卡':'康','基':'金','库':'昆','科':'孔','凯':'肯','考':'康',
 '赫':'亨','哈':'汉','希':'欣','胡':'魂','霍':'红','海':'汉','豪':'航',
 '兹':'怎','扎':'脏','祖':'尊','泽':'怎','佐':'宗','宰':'赞','藻':'脏',
 '惹':'仁','瑞':'润','罗':'龙','赖':'兰','饶':'让',
 '奇':'琴','查':'昌','切':'陈','楚':'春','乔':'冲','澈':'陈','柴':'缠','超':'昌',
 '杰':'真','贾':'张','朱':'准','哲':'真','焦':'江',
 '谢':'申','沙':'尚','施':'申','舒':'顺','肖':'雄','舍':'申','绍':'尚','夏':'香',
 '耶':'言','雅':'羊','尤':'云','伊':'因','哟':'用','耀':'样','亚':'央',
 '日':'仁','热':'仁','若':'荣','如':'润','饶':'让',
 '厄':'恩','啊':'安','诶':'恩','埃':'恩','乌':'温','欧':'翁','奥':'昂','艾':'安','尔':'恩',
}
NASAL_FINAL = set(NASAL.values()) | set('申森本门芬文登腾嫩伦根肯亨怎仁琴陈真因恩安温翁昂民金丁宁林品分')

# 重读的 AH 是 [ʌ]（money 的 u），弱读的 AH0 才是 schwa [ə]。
# 不区分会把 money 拼成「么尼」而不是「马尼」——重音是英语谐音准不准的关键。
STRESSED_AH = {'B':'巴','P':'帕','M':'马','F':'法','V':'瓦','D':'达','T':'塔','N':'那',
 'L':'拉','G':'嘎','K':'卡','HH':'哈','S':'萨','Z':'扎','SH':'沙','ZH':'扎','CH':'查',
 'JH':'贾','TH':'萨','DH':'扎','R':'拉','W':'瓦','Y':'雅'}

_base = lambda ph: ph.rstrip('012')
_stress = lambda ph: ph[-1] if ph and ph[-1] in '012' else ''
_is_v = lambda ph: _base(ph) in V


def _syllabify(phones):
    """按最大声母原则切音节，返回 [(onset[], nucleus, coda[]), ...]"""
    idx = [i for i, p in enumerate(phones) if _is_v(p)]
    if not idx:
        return [([], None, [_base(p) for p in phones], '')]
    out = []
    for n, vi in enumerate(idx):
        prev = idx[n - 1] if n else -1
        between = [_base(p) for p in phones[prev + 1:vi]]      # 上一元音与本元音之间的辅音
        if n == 0:
            onset = between                                     # 词首辅音簇全归第一音节
        else:
            # 只有一个辅音 → 全给下一音节做声母；多个 → 最后一个给声母，其余留作上一音节韵尾
            onset = between[-1:] if between else []
            out[-1][2].extend(between[:-1] if len(between) > 1 else [])
        tail = [_base(p) for p in phones[vi + 1:]] if n == len(idx) - 1 else []
        out.append([onset, _base(phones[vi]), tail, _stress(phones[vi])])
    return [tuple(x) for x in out]


def phones_to_hanzi(phones):
    syls = _syllabify(phones)
    out = []
    for onset, v, coda, st in syls:
        if v is None:
            out.append(''.join(CODA.get(c, '') for c in coda)); continue
        head = onset[-1] if onset else None
        if v == 'AH' and st in ('1', '2') and head in STRESSED_AH:
            ch = STRESSED_AH[head]                              # 重读 [ʌ]
        else:
            ch = SYL.get(head + '_' + v) if head else V.get(v, '')
        if ch is None:
            ch = ONSET1.get(head, '') + V.get(v, '')
        pre = ''.join(ONSET1.get(c, '') for c in onset[:-1]) if len(onset) > 1 else ''
        # 韵尾：R 卷舌并入前字；N/NG 作鼻韵尾；其余各出一字
        rest = list(coda)
        if rest and rest[0] == 'R':
            rest.pop(0)                                        # r-coloring，不另起字
        # M 作韵尾并入鼻韵尾：number 是「南伯」不是「那姆伯」
        if rest and rest[0] == 'M':
            last = ch[-1]
            if last in NASAL_FINAL: rest.pop(0)
            elif last in NASAL: ch = ch[:-1] + NASAL[last]; rest.pop(0)
        if rest and rest[0] in ('N', 'NG'):
            last = ch[-1]
            if last in NASAL_FINAL: rest.pop(0)                 # 本身已带鼻韵尾
            elif last in NASAL: ch = ch[:-1] + NASAL[last]; rest.pop(0)
        out.append(pre + ch + ''.join(CODA.get(c, '') for c in rest))
    return ''.join(out)


def word_to_hanzi(word, cmu):
    pr = cmu.get(word.lower().strip())
    return phones_to_hanzi(pr[0]) if pr else None
