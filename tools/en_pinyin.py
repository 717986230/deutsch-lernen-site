# -*- coding: utf-8 -*-
"""英语谐音生成器：从 CMU 音标（ARPABET）生成中文谐音。

为什么要重写：原有英语谐音是**按字母**机械音译的，不是按发音，会教错读音。
例如 action → 「诶克什恩」（逐字母），实际读 [ˈæk.ʃən] 应作「诶克申」。
抽查 14 个常见词全错；-tion 结尾 280/287 条命中同一机械模式。

做法：CMU 词典给出音节化音素串，按「声母(辅音簇)+韵母(元音)」切分成音节，
每个音节查表映射到一个汉字，尽量贴近普通话可读音。
"""

# 元音：ARPABET → 汉字韵母近似（去掉重音数字后查表）
V = {
    'AA': '啊', 'AE': '诶', 'AH': '厄', 'AO': '奥', 'AW': '奥', 'AY': '艾',
    'EH': '埃', 'ER': '尔', 'EY': '诶', 'IH': '伊', 'IY': '伊',
    'OW': '欧', 'OY': '奥伊', 'UH': '乌', 'UW': '乌',
}
# 声母+韵母 合成表：优先整音节查表，查不到再用「声母字 + 韵母字」拼
SYL = {
 # b
 'B_AA':'巴','B_AE':'贝','B_AH':'伯','B_AO':'波','B_AW':'包','B_AY':'拜','B_EH':'贝','B_ER':'伯',
 'B_EY':'贝','B_IH':'比','B_IY':'比','B_OW':'波','B_UH':'布','B_UW':'布',
 # p
 'P_AA':'帕','P_AE':'佩','P_AH':'珀','P_AO':'泡','P_AW':'泡','P_AY':'派','P_EH':'佩','P_ER':'珀',
 'P_EY':'佩','P_IH':'皮','P_IY':'皮','P_OW':'坡','P_UH':'普','P_UW':'普',
 # m
 'M_AA':'马','M_AE':'梅','M_AH':'么','M_AO':'莫','M_AW':'毛','M_AY':'麦','M_EH':'梅','M_ER':'莫',
 'M_EY':'梅','M_IH':'米','M_IY':'米','M_OW':'莫','M_UH':'木','M_UW':'木',
 # f / v
 'F_AA':'法','F_AE':'菲','F_AH':'佛','F_AO':'佛','F_AW':'faul','F_AY':'法伊','F_EH':'费','F_ER':'佛',
 'F_EY':'菲','F_IH':'菲','F_IY':'菲','F_OW':'佛','F_UH':'福','F_UW':'福',
 'V_AA':'瓦','V_AE':'维','V_AH':'弗','V_AO':'沃','V_AW':'瓦','V_AY':'外','V_EH':'维','V_ER':'弗',
 'V_EY':'维','V_IH':'维','V_IY':'维','V_OW':'沃','V_UH':'乌','V_UW':'乌',
 # d / t
 'D_AA':'达','D_AE':'代','D_AH':'德','D_AO':'多','D_AW':'道','D_AY':'代','D_EH':'德','D_ER':'德',
 'D_EY':'戴','D_IH':'迪','D_IY':'迪','D_OW':'多','D_UH':'杜','D_UW':'杜',
 'T_AA':'塔','T_AE':'泰','T_AH':'特','T_AO':'托','T_AW':'陶','T_AY':'泰','T_EH':'特','T_ER':'特',
 'T_EY':'太','T_IH':'提','T_IY':'提','T_OW':'托','T_UH':'图','T_UW':'图',
 # n / l
 'N_AA':'那','N_AE':'内','N_AH':'呢','N_AO':'诺','N_AW':'瑙','N_AY':'奈','N_EH':'内','N_ER':'呢',
 'N_EY':'内','N_IH':'尼','N_IY':'尼','N_OW':'诺','N_UH':'努','N_UW':'努',
 'L_AA':'拉','L_AE':'莱','L_AH':'勒','L_AO':'洛','L_AW':'劳','L_AY':'莱','L_EH':'莱','L_ER':'勒',
 'L_EY':'雷','L_IH':'利','L_IY':'利','L_OW':'洛','L_UH':'鲁','L_UW':'鲁',
 # g / k
 'G_AA':'嘎','G_AE':'盖','G_AH':'格','G_AO':'高','G_AW':'高','G_AY':'盖','G_EH':'盖','G_ER':'格',
 'G_EY':'盖','G_IH':'吉','G_IY':'吉','G_OW':'戈','G_UH':'古','G_UW':'古',
 'K_AA':'卡','K_AE':'凯','K_AH':'克','K_AO':'考','K_AW':'考','K_AY':'凯','K_EH':'凯','K_ER':'克',
 'K_EY':'凯','K_IH':'基','K_IY':'基','K_OW':'科','K_UH':'库','K_UW':'库',
 # h
 'HH_AA':'哈','HH_AE':'海','HH_AH':'赫','HH_AO':'豪','HH_AW':'豪','HH_AY':'海','HH_EH':'海',
 'HH_ER':'赫','HH_EY':'海','HH_IH':'希','HH_IY':'希','HH_OW':'霍','HH_UH':'胡','HH_UW':'胡',
 # s / z
 'S_AA':'萨','S_AE':'塞','S_AH':'瑟','S_AO':'索','S_AW':'搔','S_AY':'赛','S_EH':'塞','S_ER':'瑟',
 'S_EY':'塞','S_IH':'西','S_IY':'西','S_OW':'索','S_UH':'苏','S_UW':'苏',
 'Z_AA':'扎','Z_AE':'泽','Z_AH':'兹','Z_AO':'佐','Z_AW':'藻','Z_AY':'宰','Z_EH':'泽','Z_ER':'兹',
 'Z_EY':'泽','Z_IH':'兹','Z_IY':'兹','Z_OW':'佐','Z_UH':'祖','Z_UW':'祖',
 # sh / zh / ch / jh
 'SH_AA':'沙','SH_AE':'谢','SH_AH':'申','SH_AO':'肖','SH_AW':'绍','SH_AY':'夏','SH_EH':'谢',
 'SH_ER':'舍','SH_EY':'谢','SH_IH':'施','SH_IY':'希','SH_OW':'肖','SH_UH':'舒','SH_UW':'舒',
 'ZH_AH':'热','ZH_ER':'热','ZH_AA':'扎','ZH_IH':'日','ZH_OW':'若','ZH_UW':'如',
 'CH_AA':'查','CH_AE':'切','CH_AH':'澈','CH_AO':'乔','CH_AW':'超','CH_AY':'柴','CH_EH':'切',
 'CH_ER':'澈','CH_EY':'切','CH_IH':'奇','CH_IY':'奇','CH_OW':'乔','CH_UH':'楚','CH_UW':'楚',
 'JH_AA':'贾','JH_AE':'杰','JH_AH':'哲','JH_AO':'乔','JH_AW':'焦','JH_AY':'贾','JH_EH':'杰',
 'JH_ER':'哲','JH_EY':'杰','JH_IH':'吉','JH_IY':'吉','JH_OW':'乔','JH_UH':'朱','JH_UW':'朱',
 # th / dh
 'TH_AA':'萨','TH_AE':'塞','TH_AH':'瑟','TH_ER':'瑟','TH_IH':'西','TH_IY':'西','TH_OW':'索',
 'TH_AO':'索','TH_EH':'塞','TH_EY':'塞','TH_AY':'赛','TH_UW':'苏','TH_AW':'骚','TH_UH':'苏',
 'DH_AA':'扎','DH_AE':'泽','DH_AH':'惹','DH_ER':'惹','DH_IH':'济','DH_IY':'济','DH_EH':'泽',
 'DH_OW':'佐','DH_AO':'佐','DH_EY':'泽','DH_AY':'宰','DH_UW':'祖','DH_AW':'藻','DH_UH':'祖',
 # r / w / y
 'R_AA':'拉','R_AE':'瑞','R_AH':'惹','R_AO':'罗','R_AW':'饶','R_AY':'赖','R_EH':'瑞','R_ER':'惹',
 'R_EY':'瑞','R_IH':'瑞','R_IY':'瑞','R_OW':'罗','R_UH':'鲁','R_UW':'鲁',
 'W_AA':'瓦','W_AE':'威','W_AH':'沃','W_AO':'沃','W_AW':'瓦','W_AY':'怀','W_EH':'威','W_ER':'沃',
 'W_EY':'威','W_IH':'威','W_IY':'威','W_OW':'沃','W_UH':'乌','W_UW':'乌',
 'Y_AA':'雅','Y_AE':'耶','Y_AH':'耶','Y_AO':'尤','Y_AW':'耀','Y_AY':'亚','Y_EH':'耶','Y_ER':'耶',
 'Y_EY':'耶','Y_IH':'伊','Y_IY':'伊','Y_OW':'哟','Y_UH':'尤','Y_UW':'尤',
}
# 独立辅音（音节尾/成音节）
CODA = {'B':'布','P':'普','M':'姆','F':'夫','V':'夫','D':'德','T':'特','N':'恩','NG':'恩',
        'L':'尔','G':'格','K':'克','HH':'赫','S':'斯','Z':'兹','SH':'什','ZH':'日',
        'CH':'奇','JH':'吉','TH':'斯','DH':'兹','R':'尔','W':'乌','Y':'伊'}
ONSET = {'B':'布','P':'普','M':'姆','F':'弗','V':'弗','D':'德','T':'特','N':'呢','L':'勒',
         'G':'格','K':'克','HH':'赫','S':'斯','Z':'兹','SH':'什','ZH':'日','CH':'奇',
         'JH':'吉','TH':'斯','DH':'兹','R':'瑞','W':'乌','Y':'伊','NG':'恩'}


# 尾鼻音并入：英语音节尾 N/NG 在汉语里应并进前字的韵尾，而不是另起一个「恩」。
# 这是机械音译最刺眼的破绽：accent 拼成「厄克塞恩特」，实际应是「厄克森特」。
NASAL = {
 '塞':'森','瑟':'森','萨':'桑','西':'辛','苏':'孙','索':'松',
 '贝':'本','巴':'邦','比':'宾','布':'本','波':'邦','伯':'本',
 '佩':'盆','帕':'潘','皮':'品','普':'喷','珀':'盆',
 '梅':'门','马':'芒','米':'民','木':'蒙','么':'门','莫':'蒙',
 '费':'芬','菲':'芬','法':'方','佛':'丰','福':'丰','弗':'芬',
 '维':'文','瓦':'万','沃':'翁','威':'文',
 '德':'登','达':'当','迪':'丁','杜':'顿','戴':'丹','多':'东','代':'丹',
 '特':'腾','塔':'汤','提':'廷','图':'吞','托':'通','泰':'坦',
 '内':'嫩','那':'南','尼':'宁','努':'农','诺':'农','呢':'嫩',
 '莱':'伦','拉':'兰','利':'林','鲁':'伦','洛':'龙','勒':'伦','雷':'冷',
 '格':'根','嘎':'冈','吉':'金','古':'滚','戈':'工','盖':'甘',
 '克':'肯','卡':'康','基':'金','库':'昆','科':'孔','凯':'肯','考':'肯',
 '赫':'亨','哈':'汉','希':'欣','胡':'魂','霍':'红','海':'汉',
 '兹':'怎','扎':'脏','祖':'尊','泽':'怎','佐':'宗',
 '惹':'仁','拉':'兰','瑞':'润','罗':'龙',
 '奇':'琴','查':'昌','切':'陈','楚':'春','乔':'冲','澈':'陈','柴':'缠',
 '杰':'真','贾':'张','朱':'准','哲':'真',
 '谢':'申','沙':'尚','施':'申','舒':'顺','肖':'雄','舍':'申',
 '耶':'言','雅':'羊','尤':'云','伊':'因',
 '厄':'恩','啊':'安','诶':'恩','埃':'恩','伊':'因','乌':'温','欧':'翁','奥':'昂','艾':'安','尔':'恩',
}

# 本身已带鼻韵尾的字，后面不该再挂一个「恩」（action 是「申」不是「申恩」）
NASAL_FINAL = set(NASAL.values()) | set('申森本门芬文登腾嫩伦根肯亨怎仁琴陈真因恩安温翁昂民金丁宁林品分ंज')

def _base(ph): return ph.rstrip('012')
def _is_vowel(ph): return _base(ph) in V

def phones_to_hanzi(phones):
    """把一串 ARPABET 音素转成汉字谐音。按音节切：辅音簇 + 元音 [+ 尾辅音]。"""
    out = []
    i = 0
    n = len(phones)
    while i < n:
        # 收集音节首辅音簇
        onset = []
        while i < n and not _is_vowel(phones[i]):
            onset.append(_base(phones[i])); i += 1
        if i < n:  # 有元音，构成一个音节
            v = _base(phones[i]); i += 1
            if onset:
                head = onset[-1]                      # 紧邻元音的那个辅音决定声母
                syl = SYL.get(head + '_' + v)
                if syl is None:
                    syl = ONSET.get(head, '') + V.get(v, '')
                # 前置辅音簇（如 str- 的 s、t）各出一个字
                out.append(''.join(ONSET.get(c, '') for c in onset[:-1]) + syl)
            else:
                out.append(V.get(v, ''))
        else:      # 词尾残余辅音
            out.append(''.join(CODA.get(c, '') for c in onset))
        # 音节尾辅音：后面若无元音跟随，则并入本音节
        j = i; tail = []
        while j < n and not _is_vowel(phones[j]):
            tail.append(_base(phones[j])); j += 1
        # 最大声母原则：两元音之间只有一个辅音时，它属于下一音节的声母
        # （money = mo-ney，不是 mon-ey；否则会拼出「门伊」而不是「马尼」）
        if len(tail) == 1 and j < n and tail[0] not in ('N', 'NG'):
            continue
        if len(tail) >= 2 and j < n:
            tail = tail[:-1]                          # 末位辅音让给下一音节做声母
            j = i + len(tail)
        # 元音后的 R 是卷舌化，并入前字而不是另起一个「瑞」（morning 是「莫宁」）
        if tail and tail[0] == 'R' and out:
            tail = tail[1:]
            if not tail:
                if j >= n: i = j
                continue
        if tail and out:
            # 紧跟的 N/NG 并进前一个字的韵尾（accent 应作「森特」而非「塞恩特」）
            if tail[0] in ('N', 'NG') and out[-1] and out[-1][-1] in NASAL_FINAL:
                tail = tail[1:]                       # 已带鼻韵尾，直接吞掉这个 N
                if j >= n:
                    if tail: out.append(''.join(CODA.get(c, '') for c in tail))
                    i = j; continue
                phones = phones[:i] + phones[i+1:]; n -= 1
                continue
            if tail[0] in ('N', 'NG') and out[-1] and out[-1][-1] in NASAL:
                out[-1] = out[-1][:-1] + NASAL[out[-1][-1]]
                tail = tail[1:]
                if j >= n:
                    if tail: out.append(''.join(CODA.get(c, '') for c in tail))
                    i = j
                else:
                    i = i + 1 + 0 if False else i     # 其余辅音留给下一音节做声母
                    i = i  # noop：让后续辅音自然成为下一音节声母
                    # 已消耗一个 N，从 i 起跳过它
                    phones = phones[:i] + phones[i+1:]; n -= 1
                continue
        if j >= n and tail:                            # 到词尾了，全部并入
            out.append(''.join(CODA.get(c, '') for c in tail)); i = j
    return ''.join(x for x in out if x)

def word_to_hanzi(word, cmu):
    key = word.lower().strip()
    pr = cmu.get(key)
    if not pr: return None
    return phones_to_hanzi(pr[0])
