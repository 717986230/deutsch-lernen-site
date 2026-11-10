import json
P={ # prefix: [py, meaning, kind]  kind: s=可分 u=不可分 b=两可
 "ab":["阿普","离开、去掉、做完","s"],"an":["安","靠上、接触、开始","s"],"auf":["奥夫","向上、打开","s"],
 "aus":["奥斯","出去、拿出来、做到底","s"],"ein":["艾因","进入","s"],"mit":["米特","一起、跟着","s"],
 "nach":["纳赫","跟在后面、照着","s"],"vor":["佛尔","在前、事先、出现在眼前","s"],"zu":["粗","关上、朝向、增加","s"],
 "weg":["韦克","走开、离开","s"],"los":["洛斯","出发、开始","s"],"zurück":["楚吕克","回来、往回","s"],
 "fest":["费斯特","牢固 → 确定下来","s"],"fern":["费恩","远处","s"],"teil":["泰尔","一部分","s"],
 "wieder":["维德","再、又","s"],"durch":["杜尔希","穿过、从头到尾","b"],"um":["乌姆","转个方向、换掉","b"],
 "über":["于伯尔","越过、从上面过去","b"],"unter":["温特尔","向下、在下面","b"],
 "be":["贝","把动作落到对象上（变成及物）","u"],"ver":["费尔","改变、弄错、彻底","u"],
 "er":["埃尔","达成、得到结果","u"],"wider":["维德尔","反对、相反","u"],
}
R=[]
INSEP={"überfahren","übersehen"}
def root(rid,icon,title,v,zh,py,story,words):
  R.append({"id":rid,"icon":icon,"title":title,"v":v,"zh":zh,"py":py,"story":story,"words":[
    dict(zip(["de","zh","py","pre","n","ex"],w)) for w in words]})
# words: [de, zh, py, prefix('' for root), note, [ex_de, ex_zh, ex_py]]
root("arbeiten","💼","打工人崩溃实录","arbeiten","工作","阿尔拜腾",[
 "周一早上八点，又要{arbeiten}了",
 "桌上堆着一摞文件等我{bearbeiten}",
 "老板{ausarbeiten}的新方案，全组看了都沉默",
 "摸鱼同事一点都不想{mitarbeiten}",
 "一想到周末还得{durcharbeiten}，眼前一黑",
 "算了，靠自己把待办一条条{abarbeiten}吧"],[
 ["arbeiten","工作","阿尔拜腾","","词根。arbeiten 本身就是「干活、工作」",["Ich arbeite heute bis sechs.","我今天上班到六点。","伊希 阿尔拜特 霍伊特 比斯 塞克斯。"]],
 ["bearbeiten","处理、加工","贝阿尔拜腾","be","be- 把「干活」落到一个对象上：对某件事下功夫 → 处理它。不可分，后面直接跟四格",["Ich bearbeite Ihre Anfrage.","我正在处理您的申请。","伊希 贝阿尔拜特 伊雷 安弗拉格。"]],
 ["ausarbeiten","拟定、详细制定出","奥斯阿尔拜腾","aus","aus- 做到底、拿出成品：把计划一点点做完整、做出来",["Wir arbeiten einen Plan aus.","我们拟一个详细计划。","维尔 阿尔拜腾 艾嫩 普兰 奥斯。"]],
 ["mitarbeiten","合作、参与工作","米特阿尔拜腾","mit","mit- 一起：一起干活 → 参与、配合。名词 der Mitarbeiter 就是「员工」",["Er arbeitet im Projekt mit.","他参与这个项目。","埃尔 阿尔拜特特 伊姆 普罗耶克特 米特。"]],
 ["durcharbeiten","连轴干、从头到尾做完","杜尔希阿尔拜腾","durch","durch- 从头穿到尾：一口气干下来不停，或把一本书从头啃到尾",["Wir haben die Nacht durchgearbeitet.","我们通宵干了一整夜。","维尔 哈本 迪 纳赫特 杜尔希格阿尔拜特特。"]],
 ["abarbeiten","一件件干完、清掉","阿普阿尔拜腾","ab","ab- 去掉、了结：把任务一项项划掉",["Ich muss die Liste abarbeiten.","我得把清单上的事一件件干完。","伊希 穆斯 迪 利斯特 阿普阿尔拜腾。"]]])
root("machen","🚪","室友的深夜迷惑行为","machen","做","马赫恩",[
 "凌晨一点，室友不知道在{machen}什么",
 "先是{aufmachen}冰箱翻吃的",
 "吃完又不{zumachen}冰箱门",
 "非要拉我{mitmachen}他的减肥操",
 "我只好跟着视频{nachmachen}开合跳",
 "楼下大爷敲门：你们能不能先把音乐{ausmachen}"],[
 ["machen","做、弄","马赫恩","","词根。machen 是「做、弄」，加前缀后意思很形象",["Was machst du da?","你在那儿干嘛？","瓦斯 马赫斯特 度 达？"]],
 ["aufmachen","打开","奥夫马亨","auf","auf- 打开：门、窗、瓶子、店铺开门都能用",["Mach bitte das Fenster auf!","请把窗户打开！","马赫 比特 达斯 芬斯特尔 奥夫！"]],
 ["zumachen","关上","粗马亨","zu","zu- 关上：和 aufmachen 正好一对",["Mach die Tür zu!","把门关上！","马赫 迪 蒂尔 粗！"]],
 ["mitmachen","一起参加、跟着做","米特马亨","mit","mit- 一起：一起做 → 参加。Machst du mit? 你也来吗？",["Machst du mit?","你也一起来吗？","马赫斯特 度 米特？"]],
 ["nachmachen","模仿、照着做","纳赫马亨","nach","nach- 跟在后面、照着：照别人的样子做",["Die Kinder machen alles nach.","孩子们什么都学。","迪 金德尔 马赫恩 阿勒斯 纳赫。"]],
 ["ausmachen","关掉（灯、电器）","奥斯马亨","aus","aus- 熄灭：灯、电视、音乐「关掉」。开是 anmachen",["Mach bitte das Licht aus!","请把灯关了！","马赫 比特 达斯 利希特 奥斯！"]]])
root("kommen","⏰","约会迟到的他","kommen","来","科门",[
 "说好七点{kommen}，七点半还没人影",
 "八点才{ankommen}，还一脸无辜",
 "说路上{vorkommen}了点小状况",
 "原来是超速，还{bekommen}了一张罚单",
 "居然还想带他兄弟一起{mitkommen}",
 "这样的人，谁能跟他{auskommen}啊"],[
 ["kommen","来","科门","","词根。kommen 是「来」",["Wann kommst du?","你什么时候来？","万 科姆斯特 度？"]],
 ["ankommen","到达","安科门","an","an- 靠上：靠到目的地 → 到达。Es kommt darauf an 是「看情况」",["Der Zug kommt um acht an.","火车八点到。","德尔 粗克 科姆特 乌姆 阿赫特 安。"]],
 ["vorkommen","发生、出现","佛尔科门","vor","vor- 出现在眼前：事情冒出来 → 发生。也有「看起来」：Das kommt mir komisch vor",["Das kommt oft vor.","这种事常有。","达斯 科姆特 奥夫特 佛尔。"]],
 ["bekommen","得到、收到","贝科门","be","be- 不可分。⚠️ 假朋友：不是英语 become，是「收到」",["Ich habe eine Strafe bekommen.","我收到了一张罚单。","伊希 哈贝 埃内 施特拉费 贝科门。"]],
 ["mitkommen","一起来、跟着来","米特科门","mit","mit- 一起：Kommst du mit? 你一起来吗？",["Kommst du mit?","你一起来吗？","科姆斯特 度 米特？"]],
 ["auskommen","相处、（钱）够用","奥斯科门","aus","aus- 撑到底：mit jemandem auskommen 跟某人处得来；mit dem Geld auskommen 钱够花",["Ich komme gut mit ihm aus.","我跟他处得很好。","伊希 科默 古特 米特 伊姆 奥斯。"]]])
root("gehen","🪩","周末蹦迪翻车","gehen","走、去","盖恩",[
 "周末终于能出门{gehen}一趟",
 "晚上约闺蜜{ausgehen}蹦迪",
 "她让我{vorgehen}先去占座",
 "一进门看见前任，我扭头就想{weggehen}",
 "我的尖叫完全{untergehen}在音乐里",
 "凌晨闺蜜还想跟陌生人{mitgehen}，被我拖回了家"],[
 ["gehen","走、去","盖恩","","词根。gehen 是「走、去」",["Ich gehe nach Hause.","我回家。","伊希 盖厄 纳赫 豪泽。"]],
 ["ausgehen","出去玩、外出","奥斯盖恩","aus","aus- 出去：晚上出门吃饭、喝酒、蹦迪。也指灯/火「灭了」",["Wir gehen heute Abend aus.","我们今晚出去玩。","维尔 盖恩 霍伊特 阿本特 奥斯。"]],
 ["vorgehen","先走；（钟）走快","佛尔盖恩","vor","vor- 在前：走在前面 → 先走。Die Uhr geht vor 表快了",["Geh schon mal vor!","你先走吧！","盖 肖恩 马尔 佛尔！"]],
 ["weggehen","走开、离开","韦克盖恩","weg","weg- 走开：Geh weg! 走开！",["Geh weg!","走开！","盖 韦克！"]],
 ["untergehen","沉没、被淹没；（太阳）落下","温特尔盖恩","unter","unter- 向下：船沉了、声音被盖过、太阳落山都是它",["Die Sonne geht unter.","太阳落山了。","迪 宗内 盖特 温特尔。"]],
 ["mitgehen","跟着去","米特盖恩","mit","mit- 一起：跟别人一起走",["Ich gehe nicht mit.","我不跟着去。","伊希 盖厄 尼希特 米特。"]]])
root("nehmen","🍰","减肥第 30 天","nehmen","拿、取","内梅恩",[
 "我发誓再也不{nehmen}零食",
 "目标：一个月{abnehmen}五斤",
 "同事拉我{teilnehmen}周五的聚餐",
 "我很有礼貌地{annehmen}了邀请",
 "还把吃剩的炸鸡{mitnehmen}回家当夜宵",
 "一个月后上秤，反而{zunehmen}了三斤"],[
 ["nehmen","拿、取、要","内梅恩","","词根。nehmen 是「拿」，点餐说 Ich nehme… 就是「我要…」",["Ich nehme den Kuchen.","我要这块蛋糕。","伊希 内默 登 库亨。"]],
 ["abnehmen","减肥；摘下；接（电话）","阿普内门","ab","ab- 去掉：把体重拿掉 → 减肥。也能摘帽子、接电话",["Ich will abnehmen.","我想减肥。","伊希 维尔 阿普内门。"]],
 ["teilnehmen","参加","泰尔内门","teil","teil 一部分：拿走一份 → 参与。搭配 an + 三格",["Ich nehme am Kurs teil.","我参加这门课。","伊希 内默 阿姆 库尔斯 泰尔。"]],
 ["annehmen","接受；假设","安内门","an","an- 靠上：把东西接到手里 → 接受。也有「假设」",["Ich nehme die Einladung an.","我接受邀请。","伊希 内默 迪 艾因拉东 安。"]],
 ["mitnehmen","带走、捎上","米特内门","mit","mit- 一起：拿着一起走 → 带走。外卖打包就是 zum Mitnehmen",["Kann ich das mitnehmen?","这个我能带走吗？","坎 伊希 达斯 米特内门？"]],
 ["zunehmen","长胖；增加","粗内门","zu","zu- 增加：和 abnehmen 正好相反",["Ich habe drei Kilo zugenommen.","我胖了三公斤。","伊希 哈贝 德莱 基洛 粗格诺门。"]]])
root("stellen","🧋","入职第一天","stellen","竖着放","施特伦",[
 "第一天上班，先把工位的椅子{stellen}好",
 "老板让我在会上{vorstellen}一下自己",
 "然后叫我给全组{bestellen}奶茶",
 "拎着十杯奶茶，赶紧{abstellen}在桌上",
 "听说公司还要{einstellen}三个实习生",
 "下班才{feststellen}：奶茶钱根本没人给我"],[
 ["stellen","竖着放、摆","施特伦","","词根。stellen 是「（竖着）放」，平放是 legen",["Stell die Flasche auf den Tisch.","把瓶子立在桌上。","施特尔 迪 弗拉舍 奥夫 登 提什。"]],
 ["vorstellen","介绍；想象","佛尔施特伦","vor","vor- 在前：把自己摆到别人面前 → 介绍。sich etwas vorstellen 是「想象」",["Darf ich mich kurz vorstellen?","我可以简单自我介绍一下吗？","达尔夫 伊希 米希 库尔茨 佛尔施泰伦？"]],
 ["bestellen","订购、点（餐）","贝施特伦","be","be- 不可分：点外卖、订东西、订座都用它",["Wir bestellen Pizza.","我们点披萨。","维尔 贝施泰伦 皮扎。"]],
 ["abstellen","放下、停放；关掉","阿普施特伦","ab","ab- 离手：把东西放下、把车停好；也能关掉水、暖气",["Wo kann ich das Fahrrad abstellen?","自行车能停哪儿？","沃 坎 伊希 达斯 法拉特 阿普施泰伦？"]],
 ["einstellen","雇用；调好（设备）","艾因施特伦","ein","ein- 进入：把人放进公司 → 雇用；把参数放进去 → 设置。手机的「设置」就是 Einstellungen",["Die Firma stellt drei Leute ein.","公司招三个人。","迪 菲尔马 施特尔特 德莱 洛伊特 艾因。"]],
 ["feststellen","发现、确定","费斯特施特伦","fest","fest 牢固：把事实钉牢 → 查明、发现",["Ich habe einen Fehler festgestellt.","我发现了一个错误。","伊希 哈贝 艾嫩 费勒 费斯特格施泰尔特。"]]])
root("sprechen","🗣️","年终加薪会","sprechen","说话","施普雷程",[
 "开会时，谁都不敢{sprechen}",
 "老板说要{besprechen}一下年终奖",
 "去年他明明{versprechen}过涨薪",
 "今年连「涨」字都不敢{aussprechen}",
 "我鼓起勇气想{ansprechen}这件事",
 "他立刻{widersprechen}：今年经济不好"],[
 ["sprechen","说话、讲","施普雷程","","词根。sprechen 是「说」",["Wir sprechen zu Hause Deutsch.","我们在家说德语。","维尔 施普雷程 粗 豪泽 多伊奇。"]],
 ["besprechen","商量、讨论","贝施普雷兴","be","be- 不可分、变及物：sprechen über etwas = etwas besprechen，不用再加 über",["Das besprechen wir morgen.","这个我们明天商量。","达斯 贝施普雷兴 维尔 摩根。"]],
 ["versprechen","承诺、答应","费尔施普雷兴","ver","ver- 不可分。sich versprechen 反而是「说错嘴」——ver- 常带「弄错」的意思",["Ich verspreche es dir.","我答应你。","伊希 费尔施普雷歇 埃斯 迪尔。"]],
 ["aussprechen","说出口；发音","奥斯施普雷亨","aus","aus- 说出来：把话说出口；也是「发音」，名词 die Aussprache",["Wie spricht man das Wort aus?","这个词怎么念？","维 施普里希特 曼 达斯 沃尔特 奥斯？"]],
 ["ansprechen","搭话；提起（话题）","安施普雷兴","an","an- 冲着某人：跟陌生人搭话，或把话题提出来",["Er hat mich auf Deutsch angesprochen.","他用德语跟我搭话。","埃尔 哈特 米希 奥夫 多伊奇 安格施普罗亨。"]],
 ["widersprechen","反驳、和…矛盾","维德尔施普雷赫恩","wider","wider- 相反、不可分：对着说 → 反驳，后面跟三格",["Da muss ich dir widersprechen.","这点我得反驳你。","达 穆斯 伊希 迪尔 维德尔施普雷兴。"]]])
root("ziehen","📦","搬家搬到怀疑人生","ziehen","拉","茨嗯",[
 "房东又涨租，只能{umziehen}",
 "周五从老房子{ausziehen}",
 "拖着三个大箱子在雪地里使劲{ziehen}",
 "零下五度，出门前多{anziehen}两件",
 "周日终于{einziehen}新家",
 "累到半夜，才给床{beziehen}好被套"],[
 ["ziehen","拉","茨嗯","","词根。ziehen 是「拉」，门上写 Ziehen 就是拉，Drücken 是推",["Ziehen, nicht drücken!","是拉，不是推！","齐恩，尼希特 德吕肯！"]],
 ["umziehen","搬家；换衣服","乌姆齐恩","um","um- 换掉：换个住处 → 搬家；sich umziehen 换衣服",["Wir ziehen nach Wien um.","我们搬去维也纳。","维尔 齐恩 纳赫 维恩 乌姆。"]],
 ["ausziehen","搬出；脱（衣服）","奥斯齐恩","aus","aus- 出去：从房子里搬出；把衣服从身上拉下来 → 脱",["Ich ziehe am Freitag aus.","我周五搬走。","伊希 齐厄 阿姆 弗莱塔克 奥斯。"]],
 ["anziehen","穿上；吸引","安齐恩","an","an- 贴上：把衣服拉到身上 → 穿",["Zieh dich warm an!","穿暖和点！","齐 迪希 瓦尔姆 安！"]],
 ["einziehen","搬进、入住","艾因齐恩","ein","ein- 进入：搬进新家，和 ausziehen 正好相反",["Wann ziehst du ein?","你什么时候搬进来？","万 齐斯特 度 艾因？"]],
 ["beziehen","套上（被套）；领取","贝齐恩","be","be- 不可分、覆盖到对象上：das Bett beziehen 铺床套被套；也有「领取（工资）」",["Ich beziehe das Bett.","我来铺床。","伊希 贝齐厄 达斯 贝特。"]]])
root("fahren","🚗","自驾游翻车记","fahren","开车、乘车","法伦",[
 "周末决定开车{fahren}去郊外",
 "早上七点准时{losfahren}",
 "导航没信号，很快就{verfahren}了",
 "转弯时差点{überfahren}一只鸭子",
 "到了才{erfahren}：景区周一闭园",
 "只好原路{zurückfahren}"],[
 ["fahren","开车、坐车去","法伦","","词根。fahren 是「乘交通工具走」，走路用 gehen",["Ich fahre mit dem Auto.","我开车去。","伊希 法勒 米特 登 奥托。"]],
 ["losfahren","出发（开车）","洛斯法伦","los","los- 出发、开始：Los geht's! 开始吧！",["Wann fahren wir los?","我们几点出发？","万 法伦 维尔 洛斯？"]],
 ["verfahren","（开车）迷路","费尔法伦","ver","ver- 弄错：sich verfahren 开错路。同理 sich verlaufen 走错路",["Wir haben uns verfahren.","我们开错路了。","维尔 哈本 翁斯 费尔法伦。"]],
 ["überfahren","碾过；闯（红灯）","于伯尔法伦","über","über- 从上面过去，这里不可分：碾过、闯红灯",["Fast hätte ich eine Ente überfahren.","我差点轧到一只鸭子。","法斯特 赫特 伊希 埃内 恩特 于伯尔法伦。"]],
 ["erfahren","得知；经历","埃尔法伦","er","er- 得到结果：一路「走」下来得到的 → 得知、经历。形容词 erfahren = 有经验的",["Das habe ich gerade erfahren.","我刚知道这事。","达斯 哈贝 伊希 格拉德 埃尔法伦。"]],
 ["zurückfahren","开回去、返程","楚吕克法伦","zurück","zurück- 往回：坐车/开车回去",["Wir fahren morgen zurück.","我们明天回去。","维尔 法伦 摩根 楚吕克。"]]])
root("sehen","💘","相亲现场","sehen","看见","泽恩",[
 "第一次{sehen}相亲对象",
 "照片上很帅，本人{aussehen}像他二舅",
 "他说周末只爱在家{fernsehen}",
 "整顿饭都没正眼{ansehen}我",
 "结账时他「刚好」{übersehen}了账单",
 "临走他说：下次再{wiedersehen}？算了吧"],[
 ["sehen","看见","泽恩","","词根。sehen 是「看见」",["Ich sehe dich.","我看见你了。","伊希 泽厄 迪希。"]],
 ["aussehen","看起来","奥斯泽恩","aus","aus- 向外：从外面看上去 → 长得、看起来",["Du siehst müde aus.","你看起来很累。","度 齐斯特 米德 奥斯。"]],
 ["fernsehen","看电视","费恩泽恩","fern","fern 远：看远处传来的画面 → 看电视。电视机 der Fernseher",["Ich sehe abends fern.","我晚上看电视。","伊希 泽厄 阿本茨 费恩。"]],
 ["ansehen","看着、端详","安泽恩","an","an- 冲着：盯着某人/某物看；sich etwas ansehen 仔细看看",["Sieh mich an!","看着我！","齐 米希 安！"]],
 ["übersehen","看漏、忽略","于伯尔泽恩","über","über- 越过、这里不可分：目光越过去了 → 没看到",["Das habe ich übersehen.","这个我看漏了。","达斯 哈贝 伊希 于伯尔泽恩。"]],
 ["wiedersehen","再见到","维德泽恩","wieder","wieder- 再：再见一次面。Auf Wiedersehen 就是这么来的",["Wann sehen wir uns wieder?","我们什么时候再见面？","万 泽恩 维尔 翁斯 维德？"]]])
import os
for _b in sorted(f for f in os.listdir(os.path.dirname(os.path.abspath(__file__))) if f.startswith("affix_batch") and f.endswith(".py")):
  exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),_b)).read())
for r in R:
  for w in r["words"]:
    if w["pre"] and P[w["pre"]][2]=="b": w["sep"]= w["de"] not in INSEP
out={"prefixes":{k:{"py":v[0],"zh":v[1],"t":v[2]} for k,v in P.items()},"roots":R}
json.dump(out,open('data/affix.json','w'),ensure_ascii=False,indent=1)
# sanity
import re
for r in R:
  ws={w["de"] for w in r["words"]}
  used=[m for s in r["story"] for m in re.findall(r"\{([^}]+)\}",s)]
  assert set(used)==ws and len(used)==len(ws),(r["id"],used)
  for w in r["words"]:
    assert w["pre"]=="" or w["pre"] in P,(w)
    assert w["de"].startswith(w["pre"]) and w["de"].endswith(r["v"]),w["de"]
print(len(R),sum(len(r["words"]) for r in R))
