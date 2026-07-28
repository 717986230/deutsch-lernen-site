// ══════════════════════════════════════
// DATA
// ══════════════════════════════════════
const nums0 = [
  {n:0,de:'null',py:'努尔'},{n:1,de:'eins',py:'艾因斯'},{n:2,de:'zwei',py:'茨威'},
  {n:3,de:'drei',py:'德莱'},{n:4,de:'vier',py:'费尔'},{n:5,de:'fünf',py:'费因夫'},
  {n:6,de:'sechs',py:'泽克斯'},{n:7,de:'sieben',py:'泽本'},{n:8,de:'acht',py:'阿赫特'},
  {n:9,de:'neun',py:'诺伊因'},{n:10,de:'zehn',py:'泽恩'},{n:11,de:'elf',py:'埃尔夫'},
  {n:12,de:'zwölf',py:'茨沃尔夫'}
];
const numsBig = [
  {n:100,de:'hundert',py:'洪德特'},{n:1000,de:'tausend',py:'套森特'},
  {n:1000000,de:'eine Million',py:'艾嫩 米利昂'},{n:1000000000,de:'eine Milliarde',py:'艾嫩 米利阿德'},
  {n:0.5,de:'ein halb',py:'艾因 哈尔普'},{n:'1.',de:'erste',py:'尔斯特'}
];
// 数字测验题库（练习测验「数字测验」用）
const NUM_POOL=[...nums0,
  {n:13,de:'dreizehn'},{n:14,de:'vierzehn'},{n:16,de:'sechzehn'},{n:17,de:'siebzehn'},{n:19,de:'neunzehn'},
  {n:20,de:'zwanzig'},{n:21,de:'einundzwanzig'},{n:30,de:'dreißig'},{n:35,de:'fünfunddreißig'},
  {n:40,de:'vierzig'},{n:50,de:'fünfzig'},{n:60,de:'sechzig'},{n:70,de:'siebzig'},{n:80,de:'achtzig'},
  {n:90,de:'neunzig'},{n:99,de:'neunundneunzig'},{n:100,de:'hundert'},{n:1000,de:'tausend'}
];
// 字母表（say=喂给 TTS 的德语字母名称拼写，确保稳定读出德语念法；裸单字母会被部分引擎按英文念）
const LETTERS = [
  {l:'A a',name:'啊（ah）',sound:'长/短"啊"<br>Alt=啊尔特，ja=雅',say:'A'},
  {l:'B b',name:'贝（beh）',sound:'"b"<br>词尾变清音"p"<br>Brot=布罗特',say:'Beh'},
  {l:'C c',name:'采（tseh）',sound:'e/i前→"ts采"<br>其他→"k卡"<br>Café=卡菲',say:'Tseh'},
  {l:'D d',name:'德（deh）',sound:'"d"<br>词尾变清音"t"<br>Danke=当克',say:'Deh'},
  {l:'E e',name:'诶（eh）',sound:'重读→"诶"<br>词尾轻读→"厄"<br>es=埃斯',say:'Eh'},
  {l:'F f',name:'艾夫（ef）',sound:'"f夫"<br>Frau=弗劳',say:'Eff'},
  {l:'G g',name:'格（geh）',sound:'"g格"<br>词尾变"k克"<br>gut=古特',say:'Geh'},
  {l:'H h',name:'哈（hah）',sound:'词首发"h哈"<br>母音后不发音<br>Hallo=哈洛',say:'Ha'},
  {l:'I i',name:'伊（ih）',sound:'短"i伊"或长"i依"<br>ich=伊希<br>ie→长"依"',say:'I'},
  {l:'J j',name:'约特（yot）',sound:'⚠️ 发"y雅"音！<br>不是英语"j"<br>ja=雅，Jahr=雅尔',say:'Jott'},
  {l:'K k',name:'卡（kah）',sound:'"k卡"<br>Kaffee=卡菲<br>kalt=卡尔特',say:'Ka'},
  {l:'L l',name:'艾尔（el）',sound:'"l勒"（清晰）<br>lieben=里本<br>laut=劳特',say:'Ell'},
  {l:'M m',name:'艾姆（em）',sound:'"m妈"<br>Morgen=摩根<br>Milch=米尔希',say:'Emm'},
  {l:'N n',name:'艾恩（en）',sound:'"n嫩"<br>nein=奈因<br>Nacht=纳赫特',say:'Enn'},
  {l:'O o',name:'哦（oh）',sound:'长/短"哦"<br>oder=哦德尔<br>oben=哦本',say:'O'},
  {l:'P p',name:'配（peh）',sound:'"p配"<br>Pause=葩乌泽<br>Post=波斯特',say:'Peh'},
  {l:'Q q',name:'库（kuh）',sound:'⚠️ qu→"kv夸"<br>不是"kw"<br>Qualität=克瓦利泰特',say:'Kuh'},
  {l:'R r',name:'艾尔（er）',sound:'⚠️ 喉部颤音<br>词尾→弱化"厄"<br>rot=罗特',say:'Err'},
  {l:'S s',name:'艾斯（es）',sound:'母音间→"z兹"<br>其余→"s斯"<br>See=泽，das=达斯',say:'Ess'},
  {l:'T t',name:'特（teh）',sound:'"t特"<br>Tag=塔克<br>Tisch=提什',say:'Teh'},
  {l:'U u',name:'乌（uh）',sound:'长/短"乌"<br>und=温特<br>Uhr=乌尔',say:'U'},
  {l:'V v',name:'法乌（fau）',sound:'⚠️ 发"f夫"音！<br>外来词发"v"<br>Vater=法特尔',say:'Vau'},
  {l:'W w',name:'韦（veh）',sound:'⚠️ 发"v"音！<br>不是英语"w"<br>Wasser=瓦瑟',say:'Weh'},
  {l:'X x',name:'伊克斯（iks）',sound:'发"ks"音<br>Taxi=塔克西<br>（主要在外来词）',say:'Ix'},
  {l:'Y y',name:'于普西龙（Ypsilon）',sound:'德语词→"ü于"<br>外来词→"i伊/j雅"<br>（主要外来词）',say:'Ypsilon'},
  {l:'Z z',name:'采特（tset）',sound:'⚠️ 发"ts茨"！<br>不是英语"z"<br>Zeit=采特，zu=楚',say:'Zett'},
  {l:'Ä ä',name:'埃（ä）',sound:'发"ä诶"（类似"诶"）<br>Mädchen=梅特兴<br>Äpfel=埃普费尔',say:'Äh',sp:1},
  {l:'Ö ö',name:'厄（圆唇 ö）',sound:'⚠️ 圆唇发"诶"<br>嘴形成"o"说"e"<br>schön=舍恩',say:'Öh',sp:1},
  {l:'Ü ü',name:'于（ü）',sound:'⚠️ 圆唇发"衣"<br>嘴形成"u"说"i"<br>grün=格吕恩',say:'Üh',sp:1},
  {l:'ß',name:'艾斯采特（Eszett）',sound:'等于双ss"斯"<br>长元音/双元音后用<br>Straße=施特拉瑟',say:'Eszett',sp:1},
];

const categories = __DATA_categories__; // 数据在 data/categories.json，由 build.mjs 注入（生产拆为 de.<hash>.dat 按需下载）

// ══════════════ 双语框架：德语 / 英语 整站切换 ══════════════
// categories 切换时原地替换内容，所有引用它的功能自动跟随。
// DE_CATEGORIES：纯德语原始数据。生产拆包后取 window._DEC（到货前为空数组，不冻结）；dev/内联时取 categories 快照。
Object.defineProperty(window,'DE_CATEGORIES',{configurable:true,get:function(){
  if(window._DEC)return window._DEC;
  var v=categories.slice();
  if(v.length){Object.defineProperty(window,'DE_CATEGORIES',{value:v,writable:true});}
  return v;
}});
// 词库是否就绪：dev 内联即就绪；生产等 de.dat 到货（window._DEC）。_deEnsure 未就绪时后台拉取并在到货后回调。
function _deReady(){return typeof _loadDE!=='function'||!!window._DEC;}
function _deEnsure(cb){if(_deReady())return true;try{_loadDE().then(function(){try{cb&&cb();}catch(e){}});}catch(e){}return false;}
// de.dat 到货回调：清掉依赖词库的派生缓存并补渲染当前版块
function _onDELoaded(){
  try{_phSug=null;_phSugP=null;_deWordMap=null;_spMetaMap=null;}catch(e){}
  try{if(!document.documentElement.classList.contains('locked')&&LANG==='de')setLang('de');}catch(e){}
  try{var a=document.querySelector('.section.active'),id=a&&a.id;
      if(id==='spell'&&typeof spUpdatePoolInfo==='function')spUpdatePoolInfo();}catch(e){}
}
// 英语版词库（中文谐音学英语）。数据源：packageData/data/en.js，构建时注入。
// 注：英语词放在 de 字段，复用全部现有逻辑（卡片/朗读/测验）。英语不可规则拼读，故英语模式隐藏「拼读」只显谐音。
const EN_CATEGORIES = __DATA_EN_CATEGORIES__; // 数据在 data/en_categories.json，由 build.mjs 注入（部署时加密）
let LANG='de';
try{const s=localStorage.getItem('siteLang');if(s==='en'||s==='de')LANG=s;}catch(e){}
function applyLangData(){
  const de=DE_CATEGORIES;   // 先固化德语快照再原地替换，防「英语优先」用户首次快照被污染
  const src=(LANG==='en')?EN_CATEGORIES:de;
  categories.length=0; src.forEach(c=>categories.push(c));
}
function setLang(lang){
  if(lang!==LANG){
    LANG=lang;
    try{localStorage.setItem('siteLang',lang);}catch(e){}
    try{track('lang',{l:lang});}catch(e){}
  }
  // 登录门槛上锁时不碰词库（免 366KB 解密），解锁后 appInit 会重跑 setLang 补齐
  if(document.documentElement.classList.contains('locked'))return;
  // 英语库按需下载（生产构建拆为 en.dat）：未到货时先渲染空态，到货后 _loadEN 自动重跑 setLang('en')
  if(LANG==='en'&&typeof _loadEN==='function'&&!window._ENC){try{_loadEN()['catch'](function(){});}catch(e){}}
  // 德语词库同理（生产拆为 de.dat）：解锁首次进入即后台预取，到货后 _onDELoaded 补渲染
  if(LANG==='de'&&typeof _loadDE==='function'&&!window._DEC){try{_loadDE()['catch'](function(){});}catch(e){}}
  applyLangData();
  if(typeof stopAutoPlay==='function')stopAutoPlay();
  if(typeof stopReading==='function')stopReading();
  // 切换语言相关 UI
  document.querySelectorAll('.lang-btn').forEach(b=>b.classList.toggle('active',b.dataset.lang===LANG));
  document.body.classList.toggle('lang-en',LANG==='en');
  updateHeroLang();
  updateQuizCardLang();
  updatePhrasesSub();
  // 词句版块默认回到「全部」级别，避免英语词少时空白
  activeLevel = (LANG==='en')?'0':activeLevel;
  activeCat='all';
  if(typeof buildLevelTabs==='function'){buildLevelTabs();buildCatTabs();if(_rendered.phrases)renderPhrases();showLevelInfo(activeLevel);}
  // 英语模式下若停留在德语专属版块，跳到「词句大全」
  const cur=[...document.querySelectorAll('.section')].find(s=>s.classList.contains('active'));
  if(cur&&LANG==='en'&&['pronunciation','numbers','grammar','reading','series','body'].includes(cur.id))showSection('phrases');
  if(cur&&LANG==='de'&&['en-pron','en-num','en-grammar'].includes(cur.id))showSection('phrases');
}
function updatePhrasesSub(){
  const el=document.getElementById('phrasesSub');
  if(el){
    const cc=categories.length, pc=categories.reduce((s,c)=>s+c.phrases.length,0);
    const lw=LANG==='en'?'英语':'德语';
    el.textContent=cc+'个分类 · '+pc+'个词句 · 点击卡片看谐音 · 🔊 点喇叭听地道'+lw+'发音';
  }
  const si=document.getElementById('searchInput');
  if(si)si.placeholder=(LANG==='en'?'搜索英语、中文或谐音...':'搜索德语、中文或谐音...');
}
function updateQuizCardLang(){
  const en=LANG==='en';
  const set=(id,t)=>{const e=document.getElementById(id);if(e)e.textContent=t;};
  set('qdNum', en?'看数字→选英语':'看数字→说德语');
  set('qdPhrase', en?'看中文→选英语':'看中文→选德语');
  set('qdReverse', en?'看英语→选中文':'看德语→选中文');
  // 测验出题范围标签跟随语言：德语 A1/A2/B1/B2，英语 入门/中考/高考/四级/六级
  _lvTabs('quizLevelTabs','setQuizLevel',(typeof quizLevel!=='undefined')?quizLevel:'all');
}
function updateHeroLang(){
  const lab=document.getElementById('heroLabel'),tit=document.getElementById('heroTitle'),sub=document.getElementById('heroSub');
  if(!lab)return;
  if(LANG==='en'){lab.textContent='English · 英语学习';tit.textContent='英语学习手册';sub.textContent='中文谐音学英语 · 词句 · 朗读 · 测验';}
  else{lab.textContent='Deutsche Sprache · 德语学习';tit.textContent='德语学习手册';sub.textContent='发音 · 数字 · 语法 · 词句 · 5阶段进阶 · 互动测验';}
}
// 启动时若存为英语，载入英语数据
if(LANG==='en')applyLangData();

function showSection(id){
  if(typeof stopAutoPlay==='function')stopAutoPlay();
  if(typeof stopReading==='function')stopReading();
  if(typeof stopSeries==='function')stopSeries();
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>{b.classList.remove('active');b.removeAttribute('aria-current');});
  document.getElementById(id).classList.add('active');
  const navId=(id==='series')?'reading':id;   // 连载并入阅读入口，导航高亮同一按钮
  const btns=document.querySelectorAll('.nav-btn');
  btns.forEach(b=>{if(b.getAttribute('onclick').includes("'"+navId+"'")){b.classList.add('active');b.setAttribute('aria-current','page');}});
  if(id==='phrases'&&!_rendered.phrases){renderPhrases();_rendered.phrases=true;}       // 懒渲染：首次打开才渲染长列表
  if(id==='phrases'&&typeof renderRecent==='function')renderRecent();
  if(id==='body'){if(typeof renderBoardTabs==='function')renderBoardTabs();if(typeof switchBoard==='function')switchBoard(_curBoard);}
  if(id==='account'&&typeof acctToken==='function'&&acctToken()){document.getElementById(id).classList.remove('active');document.getElementById('me').classList.add('active');id='me';}
  if(id==='me'&&typeof renderMe==='function')renderMe();
  if(id==='rank'&&typeof rankScope==='function')rankScope(_rankScope);
  if(id==='spell'&&typeof spInit==='function')spInit();
  if(id==='home'&&typeof renderHomeDash==='function')renderHomeDash();
  var _bsec=(id==='me'||id==='account')?'account':(id==='series'?'reading':id);
  document.querySelectorAll('#bottomNav .bn-btn').forEach(function(b){var on=b.getAttribute('data-sec')===_bsec;b.classList.toggle('on',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  document.body.classList.toggle('hide-fab',id==='account'||id==='me'||id==='rank'||id==='spell');
  try{track('view',{s:id});}catch(e){}
  if(id==='reading'&&!_rendered.reading){renderReadings();_rendered.reading=true;}
  if(id==='series'&&!_rendered.series){renderSeries();renderSeriesLinks();_rendered.series=true;}
  _histPush(id);
  window.scrollTo(0,0);
}
var _rendered={};

// ── 版块历史：pushState 记录版块，返回键/右滑在站内后退不退站；#hash 白名单深链 ──
var SEC_IDS='home pronunciation numbers grammar phrases reading series quiz spell rank body support me account en-pron en-num en-grammar'.split(' ');
var _histNav=false,_histInit=false,_deepSec=null;
function _lk(){return document.documentElement.classList.contains('locked');}
// 深链捕获：'account' 是登录墙自身，不算深链（否则登录后被 account→me 重定向带偏）
try{var _h0=(location.hash||'').replace(/^#/,'');if(SEC_IDS.indexOf(_h0)>=0&&_h0!=='account')_deepSec=_h0;}catch(e){}
function _histPush(id){
  if(_histNav||_lk()||SEC_IDS.indexOf(id)<0)return;   // 锁定态（登录墙）不写 URL
  try{
    if(('#'+id)===location.hash&&_histInit)return;   // 重复进同版块不重复压栈
    history[_histInit?'pushState':'replaceState']({sec:id},'','#'+id);_histInit=true;
  }catch(e){}
}
try{window.addEventListener('popstate',function(){
  if(_lk())return;   // 登录墙内不响应
  var id=(location.hash||'').replace(/^#/,'');
  if(SEC_IDS.indexOf(id)<0)id='home';
  _histNav=true;
  try{showSection(id);}catch(e){}
  _histNav=false;
});}catch(e){}

// ══════════════════════════════════════
// NUMBERS
// ══════════════════════════════════════
function renderNumGrid(containerId, data){
  const g=document.getElementById(containerId);
  if(!g)return;
  data.forEach(item=>{
    const d=document.createElement('div');
    d.className='num-card';
    d.innerHTML=`<div class="num-big">${item.n}</div><div class="num-de" lang="de">${item.de}</div><div class="num-py">${item.py}</div><button class="speak-btn" type="button" title="朗读" aria-label="朗读 ${item.de}" style="margin-top:6px">🔊</button>`;
    d.querySelector('.speak-btn').addEventListener('click',(e)=>{e.stopPropagation();speakDE(item.de,e.currentTarget);});
    g.appendChild(d);
  });
}
renderNumGrid('numGrid0',nums0);
renderNumGrid('numGridBig',numsBig);
// 英语数字卡（en-num 版块）
const enNums1=[{n:1,de:'one',py:'万'},{n:2,de:'two',py:'图'},{n:3,de:'three',py:'斯瑞'},{n:4,de:'four',py:'佛'},{n:5,de:'five',py:'法夫'},{n:6,de:'six',py:'西克斯'},{n:7,de:'seven',py:'赛文'},{n:8,de:'eight',py:'诶特'},{n:9,de:'nine',py:'奈恩'},{n:10,de:'ten',py:'腾'},{n:11,de:'eleven',py:'衣勒文'},{n:12,de:'twelve',py:'退尔夫'}];
const enNums2=[{n:13,de:'thirteen',py:'瑟廷'},{n:14,de:'fourteen',py:'佛廷'},{n:15,de:'fifteen',py:'飞夫廷'},{n:16,de:'sixteen',py:'西克斯廷'},{n:17,de:'seventeen',py:'赛文廷'},{n:18,de:'eighteen',py:'诶廷'},{n:19,de:'nineteen',py:'奈恩廷'}];
const enNums3=[{n:20,de:'twenty',py:'湍提'},{n:30,de:'thirty',py:'瑟提'},{n:40,de:'forty',py:'佛提'},{n:50,de:'fifty',py:'飞夫提'},{n:60,de:'sixty',py:'西克斯提'},{n:70,de:'seventy',py:'赛文提'},{n:80,de:'eighty',py:'诶提'},{n:90,de:'ninety',py:'奈恩提'}];
const enNums4=[{n:'1st',de:'first',py:'佛斯特'},{n:'2nd',de:'second',py:'赛肯德'},{n:'3rd',de:'third',py:'瑟德'},{n:'4th',de:'fourth',py:'佛斯'},{n:'5th',de:'fifth',py:'飞夫斯'},{n:'10th',de:'tenth',py:'腾斯'}];
renderNumGrid('enNum1',enNums1);
renderNumGrid('enNum2',enNums2);
renderNumGrid('enNum3',enNums3);
renderNumGrid('enNum4',enNums4);
const EN_NUM_POOL=[...enNums1,...enNums2,...enNums3]; // 英语数字测验池

// 字母表渲染（含🔊朗读）
function renderLetterGrid(){
  const g=document.getElementById('letterGrid');
  if(!g)return;
  g.innerHTML=LETTERS.map(x=>`<div class="letter-card${x.sp?' special':''}"><div class="lc-letter">${x.l}</div><div class="lc-name">名称：<b>${x.name}</b></div><div class="lc-sound">${x.sound}</div><button class="speak-btn" type="button" title="朗读字母" aria-label="朗读字母 ${x.l}" onclick="speakDE('${x.say}',this)">🔊</button></div>`).join('');
}
renderLetterGrid();

// Number quiz
let numQ={score:0,total:0,mode:'de2zh',current:null};
function startNumQuiz(mode){
  numQ={score:0,total:0,mode:mode,current:null};
  nextNumQ();
}
function nextNumQ(){
  const pool=[...nums0,...[
    {n:13,de:'dreizehn',py:'德莱岑'},{n:20,de:'zwanzig',py:'茨万齐希'},
    {n:30,de:'dreißig',py:'德莱西希'},{n:50,de:'fünfzig',py:'菲因夫齐希'},
    {n:100,de:'hundert',py:'洪德特'},{n:21,de:'einundzwanzig',py:'艾因温楚万齐希'},
    {n:35,de:'fünfunddreißig',py:'菲因夫温德莱西希'},{n:99,de:'neunundneunzig',py:'诺伊因温诺伊因齐希'},
  ]];
  const idx=Math.floor(Math.random()*pool.length);
  numQ.current=pool[idx];
  const wrong=[];
  while(wrong.length<3){
    const w=pool[Math.floor(Math.random()*pool.length)];
    if(w.n!==numQ.current.n&&!wrong.find(x=>x.n===w.n))wrong.push(w);
  }
  const opts=[numQ.current,...wrong].sort(()=>Math.random()-.5);
  let qText='',optText='';
  if(numQ.mode==='de2zh'){
    qText=`<div class="quiz-q">${numQ.current.n}</div><div class="quiz-hint">这个数字的德语怎么说？</div>`;
    optText=opts.map(o=>`<button class="quiz-opt" onclick="checkNumQ(this,'${o.de}','${numQ.current.de}')">${o.de}</button>`).join('');
  } else if(numQ.mode==='zh2de'){
    qText=`<div class="quiz-q" style="font-size:24px">${numQ.current.de}</div><div class="quiz-hint">这个德语数字是多少？</div>`;
    optText=opts.map(o=>`<button class="quiz-opt" onclick="checkNumQ(this,${o.n},${numQ.current.n})">${o.n}</button>`).join('');
  } else {
    const a=pool[Math.floor(Math.random()*8)];
    const b=pool[Math.floor(Math.random()*8)];
    const ans=a.n+b.n;
    const ansObj={n:ans,de:`${ans}`};
    qText=`<div class="quiz-q" style="font-size:22px">${a.n} + ${b.n} = ?</div><div class="quiz-hint">用德语说出答案</div>`;
    const wrongNums=[ans+1,ans-1,ans+2,ans-2].filter(x=>x>=0);
    const calcOpts=[ansObj,...wrongNums.slice(0,3).map(x=>({n:x,de:String(x)}))].sort(()=>Math.random()-.5);
    optText=calcOpts.map(o=>`<button class="quiz-opt" onclick="checkNumQ(this,${o.n},${ans})">${o.n}</button>`).join('');
  }
  document.getElementById('numQuizArea').innerHTML=`
    <div class="quiz-box">
      <div class="quiz-score">得分：${numQ.score} / ${numQ.total}</div>
      ${qText}
      <div class="quiz-opts">${optText}</div>
    </div>`;
}
function checkNumQ(btn,selected,correct){
  document.querySelectorAll('#numQuizArea .quiz-opt').forEach(b=>b.disabled=true);
  numQ.total++;
  if(String(selected)===String(correct)){
    btn.classList.add('correct');
    numQ.score++;
  } else {
    btn.classList.add('wrong');
    document.querySelectorAll('#numQuizArea .quiz-opt').forEach(b=>{
      if(String(b.getAttribute('onclick')).includes(`'${correct}'`)||String(b.getAttribute('onclick')).includes(`,${correct})`))b.classList.add('correct');
    });
  }
  setTimeout(nextNumQ,1200);
}

// ══════════════════════════════════════
// PHRASES
// ══════════════════════════════════════
let activeCat='all';
let flippedCards={};


let activeLevel = '0';   // 默认进「零基础」，避免首屏一次渲染数千张卡（全部仍可一键切换）

const levelMeta = {
  'all': {label:'全部', desc:'', color:'var(--gold)'},
  '0':   {label:'🌱 零基础', desc:'打招呼·道别·礼貌用语，第一天就能开口！', color:'#58cc02'},
  'a1':  {label:'⭐ A1 初级', desc:'自我介绍·时间·天气·家庭，能进行最简单的日常交流。', color:'#1cb0f6'},
  'a2':  {label:'⭐⭐ A2 基础', desc:'购物·点餐·交通·住宿，能在熟悉场景下顺畅沟通。', color:'var(--gold)'},
  'b1':  {label:'🔥 B1 中级', desc:'情感·医疗·银行·社会·抽象词汇，能理解日常生活主要内容。', color:'#ff7a4d'},
  'b2':  {label:'💎 B2 中高级', desc:'政府·科技·经济·历史·学术，接近流利日常交流水平。', color:'#ff4b4b'},
};
// 英语按中国考试体系分级（入门/中考/高考/四级/六级）
const levelMetaEN = {
  'all': {label:'全部', desc:'', color:'var(--gold)'},
  '0':   {label:'🌱 入门', desc:'最常用的问候与日常，零基础就能开口。', color:'#58cc02'},
  'a1':  {label:'⭐ 中考', desc:'初中水平高频词句。', color:'#1cb0f6'},
  'a2':  {label:'⭐⭐ 高考', desc:'高中水平常用表达。', color:'var(--gold)'},
  'b1':  {label:'🔥 四级', desc:'CET-4 词汇与表达。', color:'#ff7a4d'},
  'b2':  {label:'💎 六级', desc:'CET-6 进阶词汇。', color:'#ff4b4b'},
};
const LEVEL_TABS_DE=[['all','📚 全部'],['0','🌱 零基础'],['a1','⭐ A1'],['a2','⭐⭐ A2'],['b1','🔥 B1'],['b2','💎 B2']];
const LEVEL_TABS_EN=[['all','📚 全部'],['0','🌱 入门'],['a1','⭐ 中考'],['a2','⭐⭐ 高考'],['b1','🔥 四级'],['b2','💎 六级']];
const LN_DE={'0':'零基础','a1':'A1','a2':'A2','b1':'B1','b2':'B2'};
const LN_EN={'0':'入门','a1':'中考','a2':'高考','b1':'四级','b2':'六级'};
function curLevelMeta(){return LANG==='en'?levelMetaEN:levelMeta;}
function levelName(l){return (LANG==='en'?LN_EN:LN_DE)[l]||'';}
// 级别标签通用构建：levelTabs（词句）与 quizLevelTabs（测验）共用
function _lvTabs(id,fn,cur){
  var el=document.getElementById(id); if(!el)return;
  var def=LANG==='en'?LEVEL_TABS_EN:LEVEL_TABS_DE;
  el.innerHTML=def.map(function(x){return '<button class="level-tab'+(x[0]===cur?' active':'')+'" onclick="'+fn+'(\''+x[0]+'\',this)">'+x[1]+'</button>';}).join('');
}
function buildLevelTabs(){_lvTabs('levelTabs','setLevel',activeLevel);}

function getLevelCats() {
  if (activeLevel === 'all') return categories;
  return categories.filter(c => c.level === activeLevel);
}

function showLevelInfo(level){
  const info = document.getElementById('levelInfo');
  const m = curLevelMeta()[level];
  if (m && level !== 'all') {
    info.style.display = 'block';
    info.style.borderLeftColor = m.color;
    info.innerHTML = '<b style="color:'+m.color+'">'+m.label+'</b>　'+m.desc;
  } else { info.style.display = 'none'; }
}

// 「继续上次学习」记录：{level,cat,name,t}（spell 场景另加 spell:1）
function _lastStudySet(o){try{o.t=Date.now();localStorage.setItem('lastStudy',JSON.stringify(o));}catch(e){}}
function _lastStudyName(level){return '词句 · '+(levelName(level)||'全部');}

function goLevel(level) {
  showSection('phrases');
  setTimeout(() => {
    activeLevel = level;
    activeCat = 'all';
    buildLevelTabs();
    showLevelInfo(level);
    buildCatTabs();
    renderPhrases();
    _lastStudySet({level:level,cat:'all',name:_lastStudyName(level)});
  }, 80);
}

function setLevel(level, btn) {
  activeLevel = level;
  activeCat = 'all';
  buildLevelTabs();
  showLevelInfo(level);
  buildCatTabs();
  renderPhrases();
  _lastStudySet({level:level,cat:'all',name:_lastStudyName(level)});
}

function buildCatTabs() {
  const tabs = document.getElementById('catTabs');
  const lb = {'0':'lb-0','a1':'lb-a1','a2':'lb-a2','b1':'lb-b1','b2':'lb-b2'};
  tabs.innerHTML = '<button class="cat-tab active" onclick="setCat(\'all\',this)">全部</button>';
  getLevelCats().forEach(cat => {
    const b = document.createElement('button');
    b.className = 'cat-tab';
    const badge = activeLevel === 'all'
      ? `<span class="level-badge ${lb[cat.level]||''}">${levelName(cat.level)}</span>` : '';
    b.innerHTML = cat.icon + ' ' + cat.name + badge;
    b.setAttribute('onclick', `setCat('${cat.name}',this)`);
    tabs.appendChild(b);
  });
}

function initPhrases() {
  buildLevelTabs();
  showLevelInfo(activeLevel);
  buildCatTabs();
  // 词句长列表在首次打开「词句大全」时才渲染（见 showSection 懒渲染）——首页默认视图无需先渲染 95 张卡
}

function setCat(cat,btn){
  activeCat=cat;
  document.querySelectorAll('.cat-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  filterPhrases();
  _lastStudySet({level:activeLevel,cat:cat,name:(cat==='all')?_lastStudyName(activeLevel):('词句 · '+cat)});
}

// 搜索命中高亮：在可信词库文本(de/zh/py)中包裹匹配段，query 仅用于定位、不注入输出，无 XSS
var _searchQ='';
var _onlyUnknown=false;
function toggleOnlyUnknown(v){_onlyUnknown=v;filterPhrases();}
function _hl(t,q){if(!q||!t)return t;var lt=(''+t).toLowerCase(),i=lt.indexOf(q);if(i<0)return t;var out='',pos=0;while(i>=0){out+=t.slice(pos,i)+'<mark class="sh">'+t.slice(i,i+q.length)+'</mark>';pos=i+q.length;i=lt.indexOf(q,pos);}return out+t.slice(pos);}
// 最近搜索
function _recentGet(){try{return JSON.parse(localStorage.getItem('recentSearch')||'[]');}catch(e){return [];}}
function _recentAdd(q){q=(q||'').trim();if(q.length<2)return;try{var a=_recentGet().filter(function(x){return x!==q;});a.unshift(q);localStorage.setItem('recentSearch',JSON.stringify(a.slice(0,8)));}catch(e){}}
function renderRecent(){var el=document.getElementById('recentSearch');if(!el)return;var a=_recentGet();if(!a.length){el.innerHTML='';return;}el.innerHTML='<span class="rc-lab">最近：</span>'+a.map(function(q){return '<span class="rc" onclick="doRecent(\''+_esc(q).replace(/'/g,'&#39;')+'\')">'+_esc(q)+'</span>';}).join('')+'<span class="rc-clr" onclick="clearRecent()">清空</span>';}
function doRecent(q){var i=document.getElementById('searchInput');if(i){i.value=q;filterPhrases();}}
function clearRecent(){try{localStorage.removeItem('recentSearch');}catch(e){}renderRecent();}
var _recentT=null;
function filterPhrases(){
  if(typeof stopAutoPlay==='function')stopAutoPlay();
  const q=document.getElementById('searchInput').value.toLowerCase();
  _searchQ=q;
  if(_recentT)clearTimeout(_recentT);
  if(q.length>=2)_recentT=setTimeout(function(){_recentAdd(q);renderRecent();},1200);
  let results=[];
  const pool = q ? categories : getLevelCats();
  pool.forEach((cat,ci)=>{
    if(activeCat!=='all'&&cat.name!==activeCat)return;
    cat.phrases.forEach((p,pi)=>{
      if(_onlyUnknown&&typeof knownHas==='function'&&knownHas(p.de))return; // 藏起已学会的
      if(!q||p.de.toLowerCase().includes(q)||p.zh.includes(q)||p.py.includes(q)){
        results.push(Object.assign({},p,{cat:cat.name,icon:cat.icon,id:`${ci}-${pi}`}));
      }
    });
  });
  const res=document.getElementById('phraseResults');
  if(q||activeCat!=='all') res.textContent=`找到 ${results.length} 条结果`;
  else if(_onlyUnknown) res.textContent=`还没学会 ${results.length} 条`;
  else res.textContent='';
  renderSearchResults(results,q||activeCat!=='all'||_onlyUnknown);
  // 词库零结果 → 查词典切片（单词前缀+短语词首），结果标「词典」
  if(q&&!results.length&&/^[a-zäöüß][a-zäöüß\- ]*$/.test(q)){
    res.textContent='词库无结果，查询词典…';
    const merge=[];let done=0;
    const fin=function(){
      if(++done<3)return;
      if((document.getElementById('searchInput').value||'').toLowerCase()!==q)return;
      if(!merge.length){res.textContent='词库和词典都没找到，换个拼写试试';return;}
      res.textContent=`词典找到 ${merge.length} 条（来自 HanDeDict）`;
      renderSearchResults(merge.map((e,i)=>({de:e[0],zh:e[1],py:'（词典）',id:'hd-'+i})),true);
    };
    try{hdLookup(q,function(h){if(h)merge.unshift(h);fin();});}catch(e){fin();}
    try{hdPrefix(q,10,function(l){merge.push.apply(merge,l);fin();});}catch(e){fin();}
    try{hdPhrase(q,6,function(l){merge.push.apply(merge,l);fin();});}catch(e){fin();}
  }
}

// ── 分块渲染：大列表(英语高考/四级上千卡)滚动到哪挂载到哪，首屏轻、滚动顺 ──
let _phChunk=null;
const PH_CHUNK=100;
function mountChunk(){
  const s=_phChunk; if(!s)return;
  const frag=document.createDocumentFragment();
  const end=Math.min(s.idx+PH_CHUNK,s.items.length);
  for(;s.idx<end;s.idx++) frag.appendChild(s.makeFn(s.items[s.idx]));
  s.grid.appendChild(frag);
  if(s.idx>=s.items.length){ if(s.observer)s.observer.disconnect(); if(s.sentinel)s.sentinel.remove(); }
}
function mountAllChunks(){ while(_phChunk&&_phChunk.idx<_phChunk.items.length) mountChunk(); }
// 兜底：滚动到接近底部也挂载下一批（防 IntersectionObserver 偶发不触发）
window.addEventListener('scroll',function(){
  if(_phChunk&&_phChunk.idx<_phChunk.items.length&&window.innerHeight+window.scrollY>document.body.offsetHeight-900) mountChunk();
},{passive:true});
function startChunkedRender(container,items,makeFn){
  if(_phChunk&&_phChunk.observer)_phChunk.observer.disconnect();
  container.innerHTML='';
  const grid=document.createElement('div'); grid.className='phrase-grid'; container.appendChild(grid);
  const sentinel=document.createElement('div'); sentinel.style.height='1px'; container.appendChild(sentinel);
  _phChunk={items,idx:0,grid,makeFn,sentinel,observer:null};
  mountChunk();
  if(items.length>PH_CHUNK&&'IntersectionObserver' in window){
    const obs=new IntersectionObserver(es=>{if(es[0].isIntersecting)mountChunk();},{rootMargin:'700px'});
    obs.observe(sentinel); _phChunk.observer=obs;
  } else { sentinel.remove(); }
}
function renderPhrases(){
  if(typeof stopAutoPlay==='function')stopAutoPlay();
  _rendered.phrases=true;   // 任何渲染路径都视为已渲染，避免切回时重复渲染
  if(!_deReady()){const el0=document.getElementById('phraseContent');if(el0)el0.innerHTML='<div style="grid-column:1/-1;text-align:center;color:var(--text-dim);padding:48px 0">📖 词库加载中…</div>';_deEnsure(renderPhrases);return;}
  const el=document.getElementById('phraseContent');
  const lb={'0':'lb-0','a1':'lb-a1','a2':'lb-a2','b1':'lb-b1','b2':'lb-b2'};
  const items=[];
  getLevelCats().forEach((cat,ci)=>{
    items.push({header:true,cat:cat});
    cat.phrases.forEach((p,pi)=>items.push({p:p,id:`${ci}-${pi}`}));
  });
  startChunkedRender(el,items,function(it){
    if(it.header){
      const d=document.createElement('div'); d.style.gridColumn='1/-1';
      const badge=activeLevel==='all'?`<span class="level-badge ${lb[it.cat.level]||''}">${levelName(it.cat.level)}</span>`:'';
      d.innerHTML=`<div class="sec-title"><span class="sec-title-icon">${it.cat.icon}</span><span class="sec-title-text">${it.cat.name}</span>${badge}<span class="sec-title-count" style="margin-left:auto">${it.cat.phrases.length}句</span></div>`;
      return d;
    }
    return makeCard(it.p,it.id);
  });
}

function renderSearchResults(results, isFiltered){
  const el=document.getElementById('phraseContent');
  if(!isFiltered){ renderPhrases(); return; }
  startChunkedRender(el,results,function(p){return makeCard(p,p.id);});
}

// ── 德语"拼读"拆解：把词按字母组合切分并标注读音，帮助脱离谐音自行拼读 ──
function dePhonics(text){
  if(!text)return[];
  const V='aeiouäöü';
  const isV=c=>c&&(V.indexOf(c)>=0||c==='y');
  const out=[];
  text.split(/(\s+)/).forEach(tok=>{
    if(!tok)return;
    if(/^\s+$/.test(tok)){out.push({g:' ',sp:1});return;}
    const lo=tok.toLowerCase(),n=lo.length;let i=0;
    while(i<n){
      const r=lo.slice(i),start=(i===0),prev=lo[i-1];
      let len=1,zh='',note='',vow=false;
      const is=s=>r.indexOf(s)===0;
      if(is('tsch')){len=4;zh='期';note='tsch';}
      else if(is('sch')){len=3;zh='施';note='sch';}
      else if(is('chs')){len=3;zh='克斯';note='chs=ks';}
      else if(is('ch')){if(prev==='a'||prev==='o'||prev==='u'){len=2;zh='赫';note='a/o/u后的ch';}else{len=2;zh='希';note='ch';}}
      else if(is('ck')){len=2;zh='克';note='ck=k';}
      else if(is('ng')){len=2;zh='嗯';note='ng鼻音';}
      else if(is('pf')){len=2;zh='普夫';note='pf连读';}
      else if(is('ph')){len=2;zh='夫';note='ph=f';}
      else if(is('qu')){len=2;zh='克夫';note='qu=kv';}
      else if(is('th')){len=2;zh='特';note='th=t';}
      else if(is('tz')){len=2;zh='茨';note='tz=ts';}
      else if(is('ss')){len=2;zh='斯';note='ss=s';}
      else if(is('ei')||is('ai')){len=2;zh='艾';note=r.slice(0,2)+'=ai';vow=true;}
      else if(is('ie')){len=2;zh='伊';note='ie长i';vow=true;}
      else if(is('eu')||is('äu')){len=2;zh='欧伊';note=r.slice(0,2)+'=oi';vow=true;}
      else if(is('au')){len=2;zh='奥';note='au';vow=true;}
      else if(is('ee')){len=2;zh='诶';note='ee长e';vow=true;}
      else if(is('aa')){len=2;zh='啊';note='aa长a';vow=true;}
      else if(is('oo')){len=2;zh='哦';note='oo长o';vow=true;}
      else if('aeiouäöü'.indexOf(lo[i])>=0&&lo[i+1]==='h'&&(i+2>=n||!isV(lo[i+2]))){
        const mv={a:'啊',e:'诶',i:'伊',o:'哦',u:'乌','ä':'诶','ö':'厄','ü':'于'}[lo[i]];
        len=2;zh=mv+'(长)';note='元音+h拉长，h不发音';vow=true;
      }
      else if(is('er')&&i+2===n&&n>2){len=2;zh='厄';note='词尾-er弱化';}
      else if(is('ig')&&i+2===n){len=2;zh='伊希';note='词尾-ig=ich';}
      else if(start&&is('sp')){len=2;zh='施普';note='词首sp→shp';}
      else if(start&&is('st')){len=2;zh='施特';note='词首st→sht';}
      else{
        const c=lo[i];len=1;
        switch(c){
          case'a':zh='啊';vow=true;break;case'e':zh=(((i===n-1&&n>1)||((lo[i+1]==='n'||lo[i+1]==='l')&&i+2===n))?'呃(轻)':'诶');vow=true;break;
          case'i':zh='伊';vow=true;break;case'o':zh='哦';vow=true;break;case'u':zh='乌';vow=true;break;
          case'ä':zh='诶';note='ä';vow=true;break;case'ö':zh='厄';note='ö圆唇';vow=true;break;case'ü':zh='于';note='ü圆唇';vow=true;break;
          case'b':zh=(i===n-1?'普':'布');note=(i===n-1?'词尾b→p':'');break;
          case'd':zh=(i===n-1?'特':'德');note=(i===n-1?'词尾d→t':'');break;
          case'g':zh=(i===n-1?'克':'格');note=(i===n-1?'词尾g→k':'');break;
          case'c':zh=('eiäöy'.indexOf(lo[i+1])>=0?'茨':'克');break;
          case'f':zh='夫';break;case'h':zh='哈';break;case'j':zh='雅';note='j=y';break;
          case'k':zh='克';break;case'l':zh='勒';break;case'm':zh='姆';break;case'n':zh='呢';break;case'p':zh='普';break;
          case'r':zh='尔';note='r小舌音';break;
          case's':zh=(isV(lo[i+1])?'兹':'斯');note=(isV(lo[i+1])?'s在元音前→浊z':'');break;
          case't':zh='特';break;case'v':zh='夫';note='v=f（外来词读v）';break;case'w':zh='喂';note='w=英语v';break;
          case'x':zh='克斯';note='x=ks';break;case'y':zh='于';note='y≈ü';vow=true;break;case'z':zh='茨';note='z=ts';break;case'ß':zh='斯';note='ß=ss';break;
          default:zh='';
        }
      }
      out.push({g:tok.substr(i,len),zh:zh,note:note,vow:vow});
      i+=len;
    }
  });
  return out;
}
function phonicsHtml(de,lg){
  const cls=lg?' lg':'';
  return dePhonics(de).map(s=>s.sp?'<span style="width:7px;display:inline-block"></span>':
    `<span class="ph-chip${cls}${s.vow?' vow':''}" title="${s.note||''}"><b lang="de">${s.g}</b><i>${s.zh}</i></span>`).join('');
}
let _phSug=null,_phSugP=null;
function buildPhSug(){ // 联想表：单词（去标点、去重）+ 日常短句（分词，供词首匹配）
  _phSug=[];_phSugP=[];const seen={},seenP={};
  DE_CATEGORIES.forEach(c=>c.phrases.forEach(p=>{
    const bare=p.de.replace(/[!?.,…;:"'()]/g,'').trim();
    if(bare&&!/\s/.test(bare)){const k=bare.toLowerCase();if(!seen[k]){seen[k]=1;_phSug.push({w:bare,zh:p.zh,k:k});}}
    else if(bare&&bare.length<=44&&!/^(der|die|das)\s+\S+$/i.test(p.de)){   // 短句（纯冠词名词除外）
      const k=bare.toLowerCase();
      if(!seenP[k]){seenP[k]=1;_phSugP.push({w:p.de,zh:p.zh,ws:k.split(/\s+/)});}
    }
    const noun=bare.replace(/^(der|die|das)\s+/,'');   // 带冠词名词也进联想：die Wassermelone → Wassermelone
    if(noun!==bare&&noun&&!/\s/.test(noun)){const k2=noun.toLowerCase();if(!seen[k2]){seen[k2]=1;_phSug.push({w:noun,zh:p.zh,k:k2});}}
  }));
  _phSug.sort((a,b)=>a.k<b.k?-1:(a.k>b.k?1:0));
  _phSugP.sort((a,b)=>a.w.length-b.w.length);
}
function phOpen(){var m=document.getElementById('phModal');if(m){m.style.display='flex';var i=document.getElementById('phInput');if(i)setTimeout(function(){i.focus();},50);}}
function phClose(){var m=document.getElementById('phModal');if(m)m.style.display='none';}
document.addEventListener('keydown',function(e){if(e.key==='Escape')phClose();});
function renderPhTool(){
  const v=(document.getElementById('phInput').value||'').trim();
  const out=document.getElementById('phToolOut');if(!out)return;
  if(!v){out.innerHTML='';return;}
  // 中文反查：输中文 → 在词库里找德语（点德语再拼读）
  if(/[\u4e00-\u9fff]/.test(v)){
    const hits=[];
    outer:for(const c of categories){for(const p of c.phrases){if(p.zh&&p.zh.indexOf(v)!==-1){hits.push(p);if(hits.length>=8)break outer;}}}
    out.innerHTML=hits.length
      ?'<div style="font-size:12px;color:var(--text-faint)">找到 '+hits.length+' 条（点德语看拼读）：</div>'+hits.map(p=>{
          const w=p.de.replace(/'/g,"\\'");
          return `<div class="ph-zhhit"><b lang="de" onclick="phTry('${w}')">${p.de}</b> — ${p.zh} <button class="speak-btn" type="button" style="width:22px;height:22px;font-size:11px" onclick="speakDE('${w}',this)">🔊</button></div>`;
        }).join('')
      :'<div style="font-size:13px;color:var(--text-dim)">词库没找到「'+v+'」，换个说法试试（比如"你好""谢谢"）。</div>';
    return;
  }
  // 联想：本地词库（即时）+ 词典切片（异步补充），同样式逐行展示
  let sug='';const shown={};
  try{
    if(!_phSug)buildPhSug();
    const q=v.toLowerCase(),all=[];
    for(let i=0;i<_phSug.length;i++){const e=_phSug[i];if(e.k!==q&&e.k.indexOf(q)===0)all.push(e);}
    all.sort((a,b)=>a.k.length-b.k.length||(a.k<b.k?-1:1));
    const hits=all.slice(0,4);
    if(q.length>=2){   // 日常短句：句中任一词以输入开头即联想
      let pn=0;
      for(let i=0;i<_phSugP.length&&pn<4;i++){
        const e=_phSugP[i];
        for(let j=0;j<e.ws.length;j++){if(e.ws[j].indexOf(q)===0){hits.push({w:e.w,zh:e.zh});pn++;break;}}
      }
    }
    const rows=hits.map(e=>{
      shown[e.w.toLowerCase()]=1;
      const w=e.w.replace(/'/g,"\\'");
      return `<div class="ph-zhhit"><b lang="de" onclick="phTry('${w}')">${e.w}</b> — ${e.zh} <button class="speak-btn" type="button" style="width:22px;height:22px;font-size:11px" onclick="speakDE('${w}',this)">🔊</button></div>`;
    }).join('');
    sug='<div id="phSugWrap">'+(rows?'<div style="font-size:12px;color:var(--text-faint);margin-top:10px">联想（点德语看拼读）：</div>'+rows:'')+'</div>';
  }catch(e){}
  // 查词库给中文翻译（含去冠词匹配）
  let zh='';
  try{
    if(!_deWordMap)buildDeWordMap();
    const k=v.toLowerCase(),hit=_deWordMap[k]||_deWordMap[k.replace(/^(der|die|das)\s+/,'')];
    if(hit){zh=`<div style="font-size:14px;color:var(--text);margin-top:10px">📖 <b lang="de">${hit.de}</b> — <b style="color:#46a302">${hit.zh}</b>${hit.py?` <span style="font-size:12px;color:var(--text-faint)">谐音：${hit.py}</span>`:''}</div>`;}
    else{
      zh=`<div id="phDictOut" style="font-size:12px;color:var(--text-faint);margin-top:10px">📖 查询词典中…</div>`;
      setTimeout(function(){hdLookup(v,function(h){
        const o=document.getElementById('phDictOut');
        if(!o||(document.getElementById('phInput').value||'').trim()!==v)return;   // 输入已变，丢弃
        o.innerHTML=h?`📖 <b lang="de" style="font-size:14px;color:var(--text)">${h[0]}</b> — <b style="color:#46a302;font-size:14px">${h[1]}</b> <span style="color:var(--text-faint)">·词典</span>`
                    :`📖 词库和词典都没查到这个词——拼读和 🔊 朗读照常可用。`;
      });},0);
    }
  }catch(e){}
  out.innerHTML=`<div class="ph-row">${phonicsHtml(v,true)}</div>`+zh+sug+`<div style="font-size:12px;color:var(--text-faint);margin-top:8px">蓝色=元音(响)，绿色=辅音。把每段连起来念，就是这个词的读音。点 🔊 听真人发音对照。</div>`;
  // 词典切片联想：分片就绪后补进同一列表（输入已变则丢弃）
  setTimeout(function(){
    const q=v.toLowerCase();
    if(!/^[a-zäöüß][a-zäöüß-]{1,}$/.test(q))return;
    const addRows=function(list){
      const wrap=document.getElementById('phSugWrap');
      if(!wrap||(document.getElementById('phInput').value||'').trim()!==v)return;
      let h='';
      list.forEach(function(e){
        const lw=e[0].toLowerCase();
        if(shown[lw]||lw===q)return;shown[lw]=1;
        const w=e[0].replace(/'/g,"\\'");
        h+=`<div class="ph-zhhit"><b lang="de" onclick="phTry('${w}')">${e[0]}</b> — ${e[1]} <span style="font-size:11px;color:var(--text-faint)">·词典</span> <button class="speak-btn" type="button" style="width:22px;height:22px;font-size:11px" onclick="speakDE('${w}',this)">🔊</button></div>`;
      });
      if(!h)return;
      if(!wrap.innerHTML)h='<div style="font-size:12px;color:var(--text-faint);margin-top:10px">联想（点德语看拼读）：</div>'+h;
      wrap.innerHTML+=h;
    };
    try{hdPrefix(q,3,addRows);}catch(e){}
    try{hdPhrase(q,3,addRows);}catch(e){}
  },0);
}
function phTry(w){const el=document.getElementById('phInput');if(el){el.value=w;renderPhTool();speakDE(w);}}
function makeCard(p,id){
  const d=document.createElement('div');
  d.className='card'+(flippedCards[id]?' flipped':'');
  d.id='card-'+id;
  const known=typeof knownHas==='function'&&knownHas(p.de);
  const lng=(typeof LANG!=='undefined'&&LANG==='en')?'en':'de';
  const phon=(lng==='de')
    ? `<div class="py-label" style="margin-bottom:5px">拼读（按字母组合自己读出来）</div><div class="ph-row">${phonicsHtml(p.de)}</div><div style="margin-top:8px"><span class="py-label">谐音参考</span> <span class="py-text">${p.py}</span></div>`
    : `<span class="py-label">谐音</span> <span class="py-text">${p.py}</span>`;
  d.innerHTML=`<div class="card-de-row"><button class="speak-btn" type="button" title="朗读" aria-label="朗读 ${p.de}">🔊</button><div class="card-de" lang="${lng}">${_hl(p.de,_searchQ)}</div><button class="star-btn know-btn${known?' on':''}" type="button" title="${known?'已学会（点击取消）':'标记为已学会'}" aria-label="标记已学会" style="margin-left:auto">✓</button></div><div class="card-zh">${_hl(p.zh,_searchQ)}</div><div class="card-py">${phon}</div>`;
  const sb=d.querySelector('.speak-btn');
  sb.addEventListener('click',(e)=>{e.stopPropagation();speakDE(p.de,sb);});
  const kb=d.querySelector('.know-btn');if(kb)kb.addEventListener('click',(e)=>{e.stopPropagation();knownToggle(p,kb);});
  d.addEventListener('click',()=>{
    flippedCards[id]=!flippedCards[id];
    d.classList.toggle('flipped');
  });
  return d;
}

// ══════════════ 德语朗读（贴合真实德国发音）══════════════
// 用浏览器德语语音引擎(de-DE)朗读德语原文，自动优选系统德语真人语音
// 朗读设置（控制面板，localStorage 记忆）
let _spk={rate:0.62,repeat:2,zh:true,shuffle:false};
try{Object.assign(_spk,JSON.parse(localStorage.getItem('spkCfg')||'{}'));}catch(e){}
function spkSet(k,v){_spk[k]=v;try{localStorage.setItem('spkCfg',JSON.stringify(_spk));}catch(e){}}
function setSpkRate(v){ // 语速：词句区/阅读区共享，改一处两边同步
  v=+v; spkSet('rate',v);
  ['spkRate','readRate','seriesRate'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=v;});
  ['spkRateV','readRateV','seriesRateV'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=v;});
}
function spkInitPanel(){
  const r=document.getElementById('spkRate');if(r){r.value=_spk.rate;document.getElementById('spkRateV').textContent=_spk.rate;}
  const rr=document.getElementById('readRate');if(rr){rr.value=_spk.rate;document.getElementById('readRateV').textContent=_spk.rate;}
  const p=document.getElementById('spkRepeat');if(p)p.value=String(_spk.repeat);
  const z=document.getElementById('spkZh');if(z)z.checked=_spk.zh;
  const s=document.getElementById('spkShuffle');if(s)s.checked=_spk.shuffle;
}
document.addEventListener('DOMContentLoaded',spkInitPanel);
let _deVoice=null,_zhVoice=null,_enVoice=null;
function pickGermanVoice(){
  if(!('speechSynthesis' in window))return;
  const vs=speechSynthesis.getVoices();
  // 优选常见高质量德语语音；其次任意 de-DE；再次任意 de-*
  const pref=['Anna','Petra','Markus','Yannick','Helena','Google Deutsch','Microsoft Katja','Microsoft Hedda','Microsoft Stefan'];
  _deVoice = vs.find(v=>v.lang==='de-DE'&&pref.some(p=>v.name.includes(p)))
           || vs.find(v=>v.lang==='de-DE')
           || vs.find(v=>(v.lang||'').toLowerCase().startsWith('de'))
           || null;
  // 英语语音（英语版朗读用）
  const epref=['Samantha','Daniel','Karen','Moira','Google US English','Google UK English','Microsoft Aria','Microsoft Guy','Microsoft Zira'];
  _enVoice = vs.find(v=>v.lang==='en-US'&&epref.some(p=>v.name.includes(p)))
           || vs.find(v=>(v.lang||'').toLowerCase().startsWith('en-us'))
           || vs.find(v=>(v.lang||'').toLowerCase().startsWith('en'))
           || null;
  // 中文语音（读释义用）
  const zpref=['Tingting','婷婷','Google 普通话','Microsoft Xiaoxiao','Microsoft Huihui','Mei-Jia'];
  _zhVoice = vs.find(v=>(v.lang||'').replace('_','-').toLowerCase().startsWith('zh')&&zpref.some(p=>v.name.includes(p)))
           || vs.find(v=>(v.lang||'').replace('_','-').toLowerCase().startsWith('zh'))
           || null;
  try{updateVoiceTip();}catch(e){}
}
function updateVoiceTip(){var el=document.getElementById('voiceTip');if(!el)return;var good=false;try{var vs=(window.speechSynthesis&&speechSynthesis.getVoices)?speechSynthesis.getVoices():[];good=vs.some(function(v){var l=(v.lang||'').toLowerCase();if(l.indexOf('de')!==0)return false;return v.localService||/google|microsoft|anna|petra|markus|helena|yannick/i.test(v.name||'');});}catch(e){}el.style.display=good?'none':'';}
if('speechSynthesis' in window){ pickGermanVoice(); speechSynthesis.onvoiceschanged=pickGermanVoice; }
// 目标语言（'de'德语 / 'en'英语），整站切换用
function tgtLang(){return LANG==='en'?'en-US':'de-DE';}
function tgtVoice(){return LANG==='en'?_enVoice:_deVoice;}
// 通用轻提示条（TTS 提示 / 目标达成共用一个元素）
function _toast(msg,ms){try{var d=document.getElementById('__ttsh');if(!d){d=document.createElement('div');d.id='__ttsh';d.style.cssText='position:fixed;left:50%;bottom:84px;transform:translateX(-50%);z-index:600;background:rgba(40,40,40,.94);color:#fff;font-size:13px;line-height:1.5;padding:10px 16px;border-radius:12px;max-width:86%;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,.3)';(document.body||document.documentElement).appendChild(d);}d.textContent=msg;d.style.display='block';clearTimeout(window.__ttshT);window.__ttshT=setTimeout(function(){d.style.display='none';},ms||3000);}catch(e){}}
function _ttsHint(){_toast('此浏览器内核不支持朗读 🔇 点右上角「⋯」→「在浏览器打开」即可发音',4000);}
function speakDE(text,btn){
  if(window.__noTTS||!('speechSynthesis' in window)){_ttsHint();return;}
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  u.lang=tgtLang();               // 按当前语言朗读（德/英）
  if(tgtVoice())u.voice=tgtVoice();
  u.rate=_spk.rate;               // 语速由控制面板设定
  u.pitch=1;
  if(btn){
    document.querySelectorAll('.speak-btn.speaking').forEach(b=>b.classList.remove('speaking'));
    btn.classList.add('speaking');
    u.onend=u.onerror=()=>btn.classList.remove('speaking');
  }
  speechSynthesis.speak(u);
}

// ══════════════ 一键全部循环朗读 ══════════════
let _auto={on:false,cards:[],i:0,cur:null};
function clearAutoHighlight(){
  document.querySelectorAll('.card.speaking-now').forEach(c=>c.classList.remove('speaking-now'));
  if(_auto.cur){_auto.cur.classList.remove('flipped');_auto.cur=null;} // 收起上一张自动展开的卡
}
function toggleAutoPlay(){
  const btn=document.getElementById('playAllBtn');
  if(_auto.on){ stopAutoPlay(); return; }
  if(!('speechSynthesis' in window)){alert('当前浏览器不支持朗读，请用 Chrome/Edge/Safari');return;}
  if(typeof mountAllChunks==='function')mountAllChunks(); // 循环朗读前先全部挂载
  let cards=[...document.querySelectorAll('#phraseContent .card')];
  if(!cards.length)return;
  if(_spk.shuffle)cards=cards.map(c=>[Math.random(),c]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]); // 乱序
  _auto={on:true,cards,i:0};
  btn.textContent='⏹ 停止';
  btn.classList.add('playing');
  autoNext();
}
function autoNext(){
  if(!_auto.on)return;
  if(_auto.i>=_auto.cards.length)_auto.i=0; // 到底循环
  const card=_auto.cards[_auto.i];
  const deEl=card&&card.querySelector('.card-de');
  if(!deEl){_auto.i++;return autoNext();}
  clearAutoHighlight();
  card.classList.add('speaking-now');
  card.classList.add('flipped');   // 展开当前卡，露出谐音
  _auto.cur=card;
  card.scrollIntoView({block:'center',behavior:'smooth'});
  const info=document.getElementById('playAllInfo');
  if(info)info.textContent=`朗读中 ${_auto.i+1}/${_auto.cards.length}`;
  speechSynthesis.cancel();
  const text=deEl.textContent;
  const zhEl=card.querySelector('.card-zh');
  const zhText=zhEl?zhEl.textContent:'';
  let pass=0;                       // 德语读 N 遍（面板可调），可选再读中文
  const next=()=>{ if(_auto.on){ _auto.i++; setTimeout(autoNext,700); } };
  const speakZh=()=>{
    if(!_auto.on)return;
    if(!_spk.zh||!zhText)return next();
    const u=new SpeechSynthesisUtterance(zhText);
    u.lang='zh-CN'; if(_zhVoice)u.voice=_zhVoice;
    u.rate=0.9;
    u.onend=next; u.onerror=next;
    speechSynthesis.speak(u);
  };
  const speakOnce=()=>{
    const u=new SpeechSynthesisUtterance(text);
    u.lang=tgtLang(); if(tgtVoice())u.voice=tgtVoice();
    u.rate=_spk.rate;               // 语速由面板设定
    u.onend=()=>{
      if(!_auto.on)return;
      pass++;
      if(pass<_spk.repeat){ setTimeout(speakOnce,500); } // 遍数由面板设定
      else { setTimeout(speakZh,500); }                  // 之后读中文（可关）
    };
    u.onerror=u.onend;
    speechSynthesis.speak(u);
  };
  speakOnce();
}
function stopAutoPlay(){
  _auto.on=false; speechSynthesis.cancel(); clearAutoHighlight();
  const btn=document.getElementById('playAllBtn');
  if(btn){btn.textContent='▶ 循环朗读';btn.classList.remove('playing');}
  const info=document.getElementById('playAllInfo'); if(info)info.textContent='';
}

// ══════════════════════════════════════
// MAIN QUIZ
// ══════════════════════════════════════
let mq={score:0,total:0,mode:'',current:null,roundLen:10};
let quizLevel='all';
function startQuiz(mode){
  if(!_deEnsure(function(){startQuiz(mode);})){try{_toast('词库加载中，马上开始…',1500);}catch(e){}return;}
  mq={score:0,total:0,mode:mode,current:null,roundLen:10,wrong:[]};
  nextQ();
}
// 词汇类测验（出题对象是词库 {de,zh,py} 条目）才计错题本；数字/冠词/变位不参与
function _quizIsVocab(){return mq.mode==='phrase'||mq.mode==='reverse'||mq.mode==='listen';}
function setQuizLevel(k,btn){
  quizLevel=k;
  document.querySelectorAll('#quizLevelTabs .level-tab').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  if(mq.mode)startQuiz(mq.mode); // 用新范围重开当前测验
}
function getAllPhrases(){
  const src=quizLevel==='all'?categories:categories.filter(c=>c.level===quizLevel);
  return src.flatMap((c,ci)=>c.phrases.map((p,pi)=>Object.assign({},p,{id:`${ci}-${pi}`})));
}
function quizHeader(){
  const prog=Math.round(mq.total/mq.roundLen*100);
  return `<div class="quiz-score">第 ${Math.min(mq.total+1,mq.roundLen)} / ${mq.roundLen} 题 · 得分 ${mq.score}</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${prog}%"></div></div>`;
}
function nextQ(){
  if(mq.mode==='num'){ nextNumMainQ(); return; }
  if(mq.mode==='gender'){ nextGenderQ(); return; }
  if(mq.mode==='conj'){ nextConjQ(); return; }
  const all=getAllPhrases();
  const idx=Math.floor(Math.random()*all.length);
  mq.current=all[idx];
  const wrong=[];
  while(wrong.length<3){
    const w=all[Math.floor(Math.random()*all.length)];
    if(w.id!==mq.current.id&&!wrong.find(x=>x.id===w.id))wrong.push(w);
  }
  const opts=[mq.current,...wrong].sort(()=>Math.random()-.5);
  let qHtml='',optsHtml='';
  if(mq.mode==='phrase'){
    qHtml=`<div class="quiz-q" style="font-size:20px">${mq.current.zh}</div><div class="quiz-hint">请选择正确的德语翻译</div>`;
    optsHtml=opts.map(o=>`<button class="quiz-opt" lang="de" onclick="checkQ(this,'${escQ(o.de)}','${escQ(mq.current.de)}')">${o.de}</button>`).join('');
  } else if(mq.mode==='listen'){
    qHtml=`<div class="quiz-q"><button class="speak-btn" type="button" title="重播发音" aria-label="重播发音" style="width:62px;height:62px;font-size:28px" onclick="speakDE(mq.current.de,this)">🔊</button></div><div class="quiz-hint">听德语发音，选出正确的中文（可点喇叭重播）</div>`;
    optsHtml=opts.map(o=>`<button class="quiz-opt" onclick="checkQ(this,'${escQ(o.zh)}','${escQ(mq.current.zh)}')">${o.zh}</button>`).join('');
  } else {
    qHtml=`<div class="quiz-q" style="font-size:18px;font-style:italic" lang="de">${mq.current.de} <button class="speak-btn" type="button" title="朗读" aria-label="朗读" style="font-style:normal;vertical-align:middle" onclick="speakDE(mq.current.de,this)">🔊</button></div><div class="quiz-hint">请选择正确的中文翻译</div>`;
    optsHtml=opts.map(o=>`<button class="quiz-opt" onclick="checkQ(this,'${escQ(o.zh)}','${escQ(mq.current.zh)}')">${o.zh}</button>`).join('');
  }
  document.getElementById('mainQuizArea').innerHTML=`
    <div class="quiz-box">
      ${quizHeader()}
      ${qHtml}
      <div class="quiz-opts">${optsHtml}</div>
      <button class="btn" onclick="startQuiz('${mq.mode}')" style="font-size:12px">重新开始</button>
    </div>`;
  if(mq.mode==='listen'){try{speakDE(mq.current.de);}catch(e){}}
}
function escQ(s){return s.replace(/'/g,"&#39;").replace(/"/g,'&quot;')}
function checkQ(btn,selected,correct){
  document.querySelectorAll('#mainQuizArea .quiz-opt').forEach(b=>b.disabled=true);
  mq.total++;try{studyTick();}catch(e){}
  const sel=selected.replace(/&#39;/g,"'").replace(/&quot;/g,'"');
  const cor=correct.replace(/&#39;/g,"'").replace(/&quot;/g,'"');
  if(sel===cor){btn.classList.add('correct');mq.score++;}
  else{
    btn.classList.add('wrong');
    document.querySelectorAll('#mainQuizArea .quiz-opt').forEach(b=>{
      if(b.textContent.trim()===cor)b.classList.add('correct');
    });
    // 词汇类测验答错 → 本轮错题数组（按 de 去重）
    if(_quizIsVocab()&&mq.current&&mq.current.de){
      mq.wrong=mq.wrong||[];
      mq.wrong.some(function(x){return x.de===mq.current.de;})||mq.wrong.push({de:mq.current.de,zh:mq.current.zh||'',py:mq.current.py||''});
    }
  }
  if(mq.current&&mq.current.de){try{speakDE(mq.current.de);}catch(e){}} // 答完听德语发音
  const done=mq.total>=mq.roundLen;
  setTimeout(done?showQuizResult:nextQ,1500);
}
function showQuizResult(){
  const pct=mq.total?Math.round(mq.score/mq.total*100):0;
  const cls=pct>=80?'good':(pct>=50?'ok':'bad');
  const emoji=pct>=80?'🎉':(pct>=50?'👍':'💪');
  const msg=pct>=80?'太棒了，掌握得很好！':(pct>=50?'不错，继续加油！':'多练几遍会更熟练！');
  // 词汇类测验：结算页列出本轮错题（德语+中文+🔊），一键写入拼写错词本巩固
  var wr=(_quizIsVocab()&&mq.wrong)?mq.wrong:[];
  var wrHtml='';
  if(wr.length){
    // 错题行复用排行榜行样式（rank-row/rank-name/rank-nick/rank-meta），零新增 CSS
    var rows='',i;
    for(i=0;i<wr.length;i++){
      var w=wr[i];
      rows+='<div class="rank-row" style="cursor:auto"><div class="rank-name"><div class="rank-nick" lang="de">'+_esc(w.de)+'</div><div class="rank-meta">'+_esc(w.zh)+'</div></div><button class="speak-btn" type="button" title="朗读" aria-label="朗读 '+_esc(w.de)+'" onclick="speakDE(\''+escQ(w.de)+'\',this)">🔊</button></div>';
    }
    wrHtml='<div style="margin-top:16px;text-align:left"><div style="font-size:13px;font-weight:700;margin-bottom:8px">📝 本轮错题（'+wr.length+'）</div>'+rows+'<button class="btn" style="margin-top:6px" onclick="quizWrongToSpell()">⌨️ 拼写巩固错词</button></div>';
  }
  document.getElementById('mainQuizArea').innerHTML=`
    <div class="quiz-box">
      <div class="result-box ${cls}">
        <div style="font-size:42px;line-height:1">${emoji}</div>
        <div style="font-size:24px;color:var(--gold);font-weight:700;margin:10px 0">${mq.score} / ${mq.total} <span style="font-size:16px">（${pct}%）</span></div>
        <div style="font-size:13px;color:var(--text-dim)">${msg}</div>
      </div>
      ${wrHtml}
      <button class="btn" onclick="startQuiz('${mq.mode}')" style="margin-top:16px">🔁 再来一组</button>
    </div>`;
}
// 本轮错题 → 拼写错词本（spWrong，{de:{zh,py}} 去重），并跳转拼写记忆
function quizWrongToSpell(){
  var wr=(mq&&mq.wrong)||[],i;
  try{
    var m=_spWrongGet();
    for(i=0;i<wr.length;i++){var w=wr[i];if(w&&w.de)m[w.de]={zh:w.zh||'',py:w.py||''};}
    _spWrongSave(m);
  }catch(e){}
  try{track('quiz2spell',{n:wr.length});}catch(e){}
  showSection('spell');
}
// 练习测验·数字题（看数字→选德语）
function nextNumMainQ(){
  const pool=(typeof LANG!=='undefined'&&LANG==='en')?EN_NUM_POOL:NUM_POOL;
  mq.current=pool[Math.floor(Math.random()*pool.length)];
  const wrong=[];
  while(wrong.length<3){
    const w=pool[Math.floor(Math.random()*pool.length)];
    if(w.n!==mq.current.n&&!wrong.find(x=>x.n===w.n))wrong.push(w);
  }
  const opts=[mq.current,...wrong].sort(()=>Math.random()-.5);
  const qHtml=`<div class="quiz-q">${mq.current.n}</div><div class="quiz-hint">这个数字的德语怎么说？</div>`;
  const optsHtml=opts.map(o=>`<button class="quiz-opt" lang="de" onclick="checkQ(this,'${escQ(o.de)}','${escQ(mq.current.de)}')">${o.de}</button>`).join('');
  document.getElementById('mainQuizArea').innerHTML=`
    <div class="quiz-box">
      ${quizHeader()}
      ${qHtml}
      <div class="quiz-opts">${optsHtml}</div>
      <button class="btn" onclick="startQuiz('num')" style="font-size:12px">重新开始</button>
    </div>`;
}
// 练习测验·冠词题（猜 der/die/das）—— 德语最难点专项
const GENDER_COLOR={der:'#1cb0f6',die:'#ff4b4b',das:'#58cc02'};
function nextGenderQ(){
  const all=getAllPhrases().filter(p=>/^(der|die|das)\s+\S/.test(p.de));
  if(!all.length){document.getElementById('mainQuizArea').innerHTML='<div class="quiz-box">该范围暂无带冠词的名词，换个出题范围试试。</div>';return;}
  mq.current=all[Math.floor(Math.random()*all.length)];
  const noun=mq.current.de.replace(/^(der|die|das)\s+/,'');
  const correct=mq.current.de.match(/^(der|die|das)/)[1];
  const opts=['der','die','das'];
  const optsHtml=opts.map(o=>`<button class="quiz-opt" lang="de" style="font-weight:700;color:${GENDER_COLOR[o]}" onclick="checkGenderQ(this,'${o}','${correct}')">${o}</button>`).join('');
  document.getElementById('mainQuizArea').innerHTML=`
    <div class="quiz-box">
      ${quizHeader()}
      <div class="quiz-q" style="font-size:24px" lang="de">${noun}</div>
      <div class="quiz-hint">这个名词是 der / die / das？<br><span style="font-size:11px"><b style="color:#1cb0f6">der</b> 阳 · <b style="color:#ff4b4b">die</b> 阴 · <b style="color:#58cc02">das</b> 中</span></div>
      <div class="quiz-opts" style="grid-template-columns:1fr 1fr 1fr">${optsHtml}</div>
      <button class="btn" onclick="startQuiz('gender')" style="font-size:12px">重新开始</button>
    </div>`;
}
// 练习测验·动词变位（现在时）
const VERB_CONJ=[
  {inf:'machen',zh:'做',f:['mache','machst','macht','machen','macht','machen']},
  {inf:'lernen',zh:'学',f:['lerne','lernst','lernt','lernen','lernt','lernen']},
  {inf:'spielen',zh:'玩',f:['spiele','spielst','spielt','spielen','spielt','spielen']},
  {inf:'wohnen',zh:'住',f:['wohne','wohnst','wohnt','wohnen','wohnt','wohnen']},
  {inf:'kommen',zh:'来',f:['komme','kommst','kommt','kommen','kommt','kommen']},
  {inf:'gehen',zh:'走/去',f:['gehe','gehst','geht','gehen','geht','gehen']},
  {inf:'sein',zh:'是',f:['bin','bist','ist','sind','seid','sind']},
  {inf:'haben',zh:'有',f:['habe','hast','hat','haben','habt','haben']},
  {inf:'fahren',zh:'开车/行驶',f:['fahre','fährst','fährt','fahren','fahrt','fahren']},
  {inf:'sehen',zh:'看见',f:['sehe','siehst','sieht','sehen','seht','sehen']},
  {inf:'essen',zh:'吃',f:['esse','isst','isst','essen','esst','essen']},
  {inf:'sprechen',zh:'说',f:['spreche','sprichst','spricht','sprechen','sprecht','sprechen']},
  {inf:'nehmen',zh:'拿',f:['nehme','nimmst','nimmt','nehmen','nehmt','nehmen']},
  {inf:'lesen',zh:'读',f:['lese','liest','liest','lesen','lest','lesen']},
  {inf:'geben',zh:'给',f:['gebe','gibst','gibt','geben','gebt','geben']},
  {inf:'lachen',zh:'笑',f:['lache','lachst','lacht','lachen','lacht','lachen']},
  {inf:'singen',zh:'唱',f:['singe','singst','singt','singen','singt','singen']},
  {inf:'laufen',zh:'跑',f:['laufe','läufst','läuft','laufen','lauft','laufen']},
  {inf:'trinken',zh:'喝',f:['trinke','trinkst','trinkt','trinken','trinkt','trinken']},
  {inf:'schlafen',zh:'睡',f:['schlafe','schläfst','schläft','schlafen','schlaft','schlafen']},
  {inf:'wissen',zh:'知道',f:['weiß','weißt','weiß','wissen','wisst','wissen']},
  {inf:'finden',zh:'找到',f:['finde','findest','findet','finden','findet','finden']},
  {inf:'helfen',zh:'帮助',f:['helfe','hilfst','hilft','helfen','helft','helfen']},
  {inf:'sagen',zh:'说',f:['sage','sagst','sagt','sagen','sagt','sagen']},
  {inf:'fragen',zh:'问',f:['frage','fragst','fragt','fragen','fragt','fragen']},
  {inf:'brauchen',zh:'需要',f:['brauche','brauchst','braucht','brauchen','braucht','brauchen']},
  {inf:'denken',zh:'认为',f:['denke','denkst','denkt','denken','denkt','denken']},
  {inf:'glauben',zh:'相信',f:['glaube','glaubst','glaubt','glauben','glaubt','glauben']},
  {inf:'hören',zh:'听',f:['höre','hörst','hört','hören','hört','hören']},
  {inf:'schreiben',zh:'写',f:['schreibe','schreibst','schreibt','schreiben','schreibt','schreiben']},
  {inf:'öffnen',zh:'打开',f:['öffne','öffnest','öffnet','öffnen','öffnet','öffnen']},
  {inf:'kennen',zh:'认识',f:['kenne','kennst','kennt','kennen','kennt','kennen']},
];
const CONJ_PERSON=['ich','du','er/sie/es','wir','ihr','sie/Sie'];
function nextConjQ(){
  const v=VERB_CONJ[Math.floor(Math.random()*VERB_CONJ.length)];
  const idx=Math.floor(Math.random()*6);
  const correct=v.f[idx];
  const wrong=[];
  const pool=v.f.filter(x=>x!==correct);
  while(wrong.length<3&&pool.length){const w=pool.splice(Math.floor(Math.random()*pool.length),1)[0];if(!wrong.includes(w))wrong.push(w);}
  const opts=[correct,...wrong].sort(()=>Math.random()-.5);
  mq.current={de:CONJ_PERSON[idx]+' '+correct,zh:v.zh};
  const optsHtml=opts.map(o=>`<button class="quiz-opt" lang="de" onclick="checkConjQ(this,'${o}','${correct}')">${o}</button>`).join('');
  document.getElementById('mainQuizArea').innerHTML=`
    <div class="quiz-box">
      ${quizHeader()}
      <div class="quiz-q" style="font-size:22px" lang="de"><b style="color:#1cb0f6">${CONJ_PERSON[idx]}</b> ____</div>
      <div class="quiz-hint">选 <b lang="de">${v.inf}</b>（${v.zh}）的正确变位</div>
      <div class="quiz-opts">${optsHtml}</div>
      <button class="btn" onclick="startQuiz('conj')" style="font-size:12px">重新开始</button>
    </div>`;
}
function checkConjQ(btn,sel,correct){
  document.querySelectorAll('#mainQuizArea .quiz-opt').forEach(b=>b.disabled=true);
  mq.total++;
  if(sel===correct){btn.classList.add('correct');mq.score++;}
  else{btn.classList.add('wrong');document.querySelectorAll('#mainQuizArea .quiz-opt').forEach(b=>{if(b.textContent.trim()===correct)b.classList.add('correct');});}
  try{speakDE(mq.current.de);}catch(e){}
  const done=mq.total>=mq.roundLen;
  setTimeout(done?showQuizResult:nextQ,1400);
}
function checkGenderQ(btn,sel,correct){
  document.querySelectorAll('#mainQuizArea .quiz-opt').forEach(b=>b.disabled=true);
  mq.total++;
  if(sel===correct){btn.classList.add('correct');mq.score++;}
  else{
    btn.classList.add('wrong');
    document.querySelectorAll('#mainQuizArea .quiz-opt').forEach(b=>{if(b.textContent.trim()===correct)b.classList.add('correct');});
  }
  if(mq.current&&mq.current.de){try{speakDE(mq.current.de);}catch(e){}}
  const done=mq.total>=mq.roundLen;
  setTimeout(done?showQuizResult:nextQ,1400);
}


// ══════════════════════════════════════
// READING / 分级阅读短文
// ══════════════════════════════════════
const READINGS = __DATA_READINGS__; // 数据在 data/readings.json，由 build.mjs 注入（部署时加密）
const SERIES = __DATA_SERIES__; // 数据在 data/series.json，由 build.mjs 注入（部署时加密）

const READ_LEVELS=[['all','📚 全部'],['0','🌱 零基础'],['a1','⭐ A1'],['a2','⭐⭐ A2'],['b1','🔥 B1'],['b2','💎 B2'],['c1','🏆 C1'],['c2','👑 C2']];
const READ_LB={'0':'lb-0','a1':'lb-a1','a2':'lb-a2','b1':'lb-b1','b2':'lb-b2','c1':'lb-c1','c2':'lb-c2'};
const READ_LN={'0':'零基础','a1':'A1','a2':'A2','b1':'B1','b2':'B2','c1':'C1','c2':'C2'};
let readActive='all';
function buildReadTabs(){
  document.getElementById('readLevelTabs').innerHTML=READ_LEVELS.map(([k,l])=>
    `<button class="level-tab${k===readActive?' active':''}" onclick="setReadLevel('${k}')">${l}</button>`).join('');
}
function setReadLevel(k){stopReading();readActive=k;buildReadTabs();renderReadings();}
function _getReadList(){return READINGS.filter(r=>readActive==='all'||r.level===readActive);}
// 阅读点词：朗读 + 查词义（德语）
let _deWordMap=null;
function buildDeWordMap(){
  _deWordMap={};
  DE_CATEGORIES.forEach(c=>c.phrases.forEach(p=>{
    const noun=p.de.replace(/^(der|die|das)\s+/,'');
    if(!/\s/.test(noun)){ const k=noun.toLowerCase(); if(!_deWordMap[k])_deWordMap[k]=p; }
    const bare=p.de.replace(/[!?.,…؛;:"'()]/g,'').trim();   // 去标点：让 danke 匹配「Danke!」
    if(bare&&!/\s/.test(bare)){ const k2=bare.toLowerCase(); if(!_deWordMap[k2])_deWordMap[k2]=p; }
    const full=p.de.toLowerCase(); if(!_deWordMap[full])_deWordMap[full]=p;
  }));
}
const RD_GLOSS = __DATA_RD_GLOSS__; // 阅读/连载专用小注词表（构建时由词典预生成，见 tools/make_readgloss.py）
// 高频词人工词表：保证最常见词标注准确；空串=不标（冠词等语法词，标了是噪音）
const RD_OVR={der:'',die:'',das:'',den:'',dem:'',des:'',ein:'',eine:'',einen:'',einem:'',einer:'',eines:'',
ich:'我',du:'你',er:'他',sie:'她/他们',es:'它',wir:'我们',ihr:'你们',man:'人们',sich:'自己',
mich:'我',mir:'给我',dich:'你',dir:'给你',ihn:'他',ihm:'给他',uns:'我们',euch:'你们',ihnen:'给他们',
mein:'我的',meine:'我的',dein:'你的',deine:'你的',sein:'他的/是',seine:'他的',
bin:'是',bist:'是',ist:'是',sind:'是',seid:'是',war:'曾是',waren:'曾是',
habe:'有',hast:'有',hat:'有',haben:'有',habt:'有',hatte:'曾有',
werde:'将',wirst:'将',wird:'将',werden:'将/变成',
kann:'能',kannst:'能',muss:'必须',musst:'必须',will:'想要',willst:'想要',
soll:'应该',darf:'可以',möchte:'想要',
und:'和',oder:'或者',aber:'但是',auch:'也',nicht:'不',kein:'没有',keine:'没有',
zu:'到/太',in:'在…里',an:'在…旁',auf:'在…上',mit:'和/用',für:'为了',von:'从/的',
bei:'在…处',nach:'去/之后',aus:'从…出',um:'在…点',über:'在…上方',unter:'在…下',
vor:'在…前',hinter:'在…后',neben:'在…旁',zwischen:'在…之间',durch:'穿过',ohne:'没有',gegen:'对着',
dann:'然后',denn:'因为',weil:'因为',dass:'……这件事',wenn:'如果/当',als:'当时/作为',
sehr:'很',gut:'好',heute:'今天',morgen:'明天/早上',gestern:'昨天',jetzt:'现在',
hier:'这里',dort:'那里',da:'那里/这时',so:'这样/如此',noch:'还',schon:'已经',nur:'只',
immer:'总是',oft:'经常',manchmal:'有时',nie:'从不',wieder:'又/再',
alle:'所有',viele:'许多',viel:'多',etwas:'一些',nichts:'什么都没',alles:'一切',mehr:'更多',
was:'什么',wer:'谁',wie:'怎样/像',wo:'哪里',wann:'何时',warum:'为什么',
ja:'是的',nein:'不',bitte:'请',danke:'谢谢',
null:'零',eins:'一',zwei:'二',drei:'三',vier:'四',fünf:'五',sechs:'六',
sieben:'七',acht:'八',neun:'九',zehn:'十',elf:'十一',zwölf:'十二',
zwanzig:'二十',dreißig:'三十',hundert:'百',tausend:'千',uhr:'点钟',
am:'在…',im:'在…里',ins:'到…里',zum:'到…',zur:'到…',beim:'在…时',vom:'从…',
mich:'我'};
// ── HanDeDict 词典兜底（CC BY-SA 3.0，来源 github.com/gugray/HanDeDict）──
// 站内词库查不到的词，按首字母懒加载 dict/de_*.json 分片再查（含词形还原）。
var _hd={},_hdQ={};
function _hdShard(t){var c=t[0];c={'ä':'a','ö':'o','ü':'u','ß':'s'}[c]||c;return (c>='a'&&c<='z')?c:'x';}
function hdFind(t){
  var d=_hd['de_'+_hdShard(t)];if(!d)return null;
  if(d[t])return d[t];
  var sufs=['est','en','er','em','es','st','e','n','t','s'];
  for(var i=0;i<sufs.length;i++){var f=sufs[i];
    if(t.length>f.length+2&&t.slice(-f.length)===f){
      var b=t.slice(0,-f.length),u=b.replace(/ä/g,'a').replace(/ö/g,'o').replace(/ü/g,'u');
      var cs=[b,b+'en',b+'e'];if(u!==b)cs.push(u,u+'en');
      for(var j=0;j<cs.length;j++){var hd2=_hd['de_'+_hdShard(cs[j])];if(hd2&&hd2[cs[j]])return hd2[cs[j]];}
    }
  }
  return null;
}
function _hdLoad(pre,ch,cb){ // 通用分片加载：pre='de_'单词 / 'ph_'短语；缓存+并发排队
  var key=pre+ch;
  if(_hd[key]){cb();return;}
  if(_hdQ[key]){_hdQ[key].push(cb);return;}
  _hdQ[key]=[cb];
  var x=new XMLHttpRequest();
  x.open('GET','dict/'+key+'.json',true);
  x.onreadystatechange=function(){
    if(x.readyState!==4)return;
    try{_hd[key]=(x.status===200)?JSON.parse(x.responseText):{};}catch(e){_hd[key]={};}
    var q2=_hdQ[key];delete _hdQ[key];
    for(var i=0;i<q2.length;i++)try{q2[i]();}catch(e){}
  };
  try{x.send();}catch(e){_hd[key]={};cb();}
}
function hdPrefix(q,limit,cb){ // 单词分片前缀联想
  var ch=_hdShard(q);
  _hdLoad('de_',ch,function(){
    var d=_hd['de_'+ch]||{},out=[];
    for(var k in d){if(k.length>q.length&&k.indexOf(q)===0)out.push(d[k]);}
    out.sort(function(a,b){return a[0].length-b[0].length;});
    cb(out.slice(0,limit));
  });
}
function hdPhrase(q,limit,cb){ // 短语分片联想：短语中任一词以 q 开头
  var ch=_hdShard(q);
  _hdLoad('ph_',ch,function(){
    var d=_hd['ph_'+ch]||{},out=[];
    for(var k in d){
      var ws=k.split(' ');
      for(var i=0;i<ws.length;i++){if(ws[i].indexOf(q)===0){out.push(d[k]);break;}}
      if(out.length>=limit*6)break;
    }
    out.sort(function(a,b){return a[0].length-b[0].length;});
    cb(out.slice(0,limit));
  });
}
function hdLookup(word,cb){ // 异步：cb([德语原形,中文]) 或 cb(null)
  var t=(word||'').toLowerCase().replace(/^[^a-zäöüß]+|[^a-zäöüß]+$/g,'');
  if(!t){cb(null);return;}
  _hdLoad('de_',_hdShard(t),function(){cb(hdFind(t));});
}
function rdLookup(w){ // 词库查词（含简单词形还原），返回 {de,zh} 或 null；点词与逐词小注共用
  if(!_deWordMap)buildDeWordMap();
  let t=w.toLowerCase().replace(/^[^a-zäöüß]+|[^a-zäöüß]+$/g,'');
  if(!t)return null;
  if(Object.prototype.hasOwnProperty.call(RD_OVR,t))return RD_OVR[t]?{de:t,zh:RD_OVR[t]}:null;
  let hit=_deWordMap[t];
  if(!hit){
    const sufs=['est','en','er','em','es','st','e','n','t','s'];
    for(let i=0;i<sufs.length&&!hit;i++){const f=sufs[i];
      if(t.length>f.length+2&&t.slice(-f.length)===f){
        const b=t.slice(0,-f.length);
        const u=b.replace(/ä/g,'a').replace(/ö/g,'o').replace(/ü/g,'u'); // 变音还原：Zähne→Zahn
        hit=_deWordMap[b]||_deWordMap[b+'en']||_deWordMap[b+'e']||(u!==b?(_deWordMap[u]||_deWordMap[u+'en']):null);
      }
    }
  }
  if(hit)return hit;
  if(typeof RD_GLOSS!=='undefined'&&RD_GLOSS[t])return{de:RD_GLOSS[t][0],zh:RD_GLOSS[t][1]};
  return null;
}
function rdGloss(w){ // 逐词小注：查不到或太长返回 null
  try{
    const hit=rdLookup(w);
    if(!hit)return null;
    const z=(hit.zh||'').split(/[，,、/；;（(]/)[0].replace(/[。！？!?.]+$/,'');
    return (z&&z.length<=6)?z:null;
  }catch(e){return null;}
}
function wrapWords(text){
  return text.split(/(\s+)/).map(t=>{
    if(!/\S/.test(t))return t;
    const g=rdGloss(t);
    const inner=g?`<ruby>${t}<rt>${g}</rt></ruby>`:t;
    return `<span class="rd-word" data-w="${t.replace(/"/g,'&quot;')}" onclick="readWordClick(event,this)">${inner}</span>`;
  }).join('');
}
function toggleGloss(){
  const off=document.body.classList.toggle('no-gloss');
  try{localStorage.setItem('gloss',off?'0':'1');}catch(e){}
  document.querySelectorAll('.gloss-btn').forEach(b=>b.textContent=off?'显示词义':'隐藏词义');
}
try{if(localStorage.getItem('gloss')==='0'){document.body.classList.add('no-gloss');document.querySelectorAll('.gloss-btn').forEach(b=>b.textContent='显示词义');}}catch(e){}
// 转义用于内联 onclick 的字符串：先转义 JS 单引号字符串，再 HTML 实体化（句中含 " 时不会截断属性）
function escSpk(s){return s.replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/&/g,'&amp;').replace(/"/g,'&quot;');}
function readWordClick(e,el){
  e.stopPropagation();
  if(!_deWordMap)buildDeWordMap();
  const raw=(el.dataset&&el.dataset.w)?el.dataset.w:el.textContent;
  const clean=raw.replace(/^[^A-Za-zÄÖÜäöüß]+|[^A-Za-zÄÖÜäöüß]+$/g,'');
  if(!clean)return;
  try{speakDE(clean);}catch(_){}
  const ART={der:'定冠词（阳性）',die:'定冠词（阴性/复数）',das:'定冠词（中性）',den:'定冠词（第四格）',dem:'定冠词（第三格）',des:'定冠词（第二格）',ein:'不定冠词「一个」',eine:'不定冠词（阴性）',einen:'不定冠词（四格）',einem:'不定冠词（三格）',einer:'不定冠词（阴性）',eines:'不定冠词（二格）'};
  const lk=clean.toLowerCase();
  let hit=null;
  if(ART[lk]){ rdToast(clean+' — '+ART[lk]); return; }
  try{hit=rdLookup(clean);}catch(_){}
  if(hit){ rdToast((hit.de===lk?clean:clean+' → '+hit.de)+' — '+hit.zh); return; }
  hdLookup(clean,function(h){
    if(h){ rdToast((h[0].toLowerCase()===lk?clean:clean+' → '+h[0])+' — '+h[1]+'　·词典'); }
    else { rdToast('词库暂无「'+clean+'」，可在词句大全搜索'); }
  });
}
let _rdToastT=null;
function rdToast(msg){
  let t=document.getElementById('rdToast');
  if(!t){t=document.createElement('div');t.id='rdToast';t.className='rd-toast';document.body.appendChild(t);}
  t.textContent=msg; t.classList.add('show');
  clearTimeout(_rdToastT); _rdToastT=setTimeout(()=>t.classList.remove('show'),1800);
}
function renderReadings(){
  const list=_getReadList();
  const cnt=document.getElementById('readCount');
  if(cnt)cnt.textContent='共 '+list.length+' 篇短文';
  const el=document.getElementById('readList');
  const htmls=list.map((r,ri)=>{
    const body=r.paras.map((p,pi)=>`<div class="read-para" id="rp_${ri}_${pi}"><div style="display:flex;align-items:start;gap:8px"><button class="para-spk" type="button" title="朗读本句" aria-label="朗读本句" onclick="speakPara(this,'${escSpk(p[0])}')">🔊</button><div style="flex:1"><div style="font-size:15px;color:var(--text);line-height:1.6" lang="de">${wrapWords(p[0])}</div><div style="font-size:13px;color:var(--text-dim);margin-top:2px">${p[1]}</div></div></div></div>`).join('');
    return `<div class="card" id="rcard_${ri}" style="cursor:default;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap">
        <span style="font-size:17px;font-weight:600;color:#46a302" lang="de">${r.title}</span>
        <span class="level-badge ${READ_LB[r.level]}">${READ_LN[r.level]}</span>
        <span style="font-size:13px;color:var(--text-dim)">${r.zh}</span>
        <button class="read-art-btn" id="rab_${ri}" type="button" title="朗读全文" aria-label="朗读全文：${r.title}" style="margin-left:auto" onclick="toggleArticle(this,${ri})">▶ 朗读</button>
      </div>${body}</div>`;
  });
  // 分批渲染：先同步出前 6 篇，其余每帧追加（低端机首开不卡）
  el.innerHTML=htmls.slice(0,6).join('');
  let i=6;
  (function step(){
    if(i>=htmls.length)return;
    el.insertAdjacentHTML('beforeend',htmls.slice(i,i+6).join(''));
    i+=6;
    (window.requestAnimationFrame||setTimeout)(step,16);
  })();
}
// ── 统一阅读朗读引擎：单句 / 单篇 / 循环全部（只有播放/停止；停止或刷新后从头读）──
var _rq=null; // {ri,pi,mode:'loop'|'one'}
function speakPara(btn,text){stopReading();speakDE(text,btn);}
function toggleLoopAll(){if(window.__noTTS){_ttsHint();return;}
  if(_rq&&_rq.mode==='loop'){stopReading();return;}                  // 播放中再按＝停止（下次从头）
  stopReading();
  if(!_getReadList().length)return;
  _rq={ri:0,pi:0,mode:'loop',paused:false};_syncReadBtns();_playNext();
}
function toggleArticle(btn,ri){if(window.__noTTS){_ttsHint();return;}
  if(_rq&&_rq.mode==='one'&&_rq.ri===ri){stopReading();return;}      // 播放中再按＝停止
  stopReading();
  _rq={ri:ri,pi:0,mode:'one',paused:false};_syncReadBtns();_playNext();
}
function _syncReadBtns(){
  const lb=document.getElementById('loopAllBtn');
  if(lb){const on=_rq&&_rq.mode==='loop';lb.classList.toggle('speaking',!!on);lb.textContent=!on?'🔊 循环朗读':'⏹ 停止';}
  document.querySelectorAll('.read-art-btn').forEach(b=>{b.classList.remove('speaking');b.textContent='▶ 朗读';});
  if(_rq&&_rq.mode==='one'){const ab=document.getElementById('rab_'+_rq.ri);if(ab){ab.classList.add('speaking');ab.textContent='⏹ 停止';}}
}
function _clearReadHL(){document.querySelectorAll('.read-para.rp-on').forEach(e=>e.classList.remove('rp-on'));}
function _playNext(){
  const q=_rq;if(!q||q.paused)return;
  const list=_getReadList();
  if(q.ri>=list.length){if(q.mode==='loop'){q.ri=0;q.pi=0;}else{stopReading();return;}}
  const r=list[q.ri];
  _clearReadHL();
  if(q.pi>=r.paras.length){
    if(q.mode==='one'){stopReading();return;}
    q.ri++;q.pi=0;return _playNext();
  }
  const el=document.getElementById('rp_'+q.ri+'_'+q.pi);
  if(el){el.classList.add('rp-on');el.scrollIntoView({behavior:'smooth',block:'center'});}
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(r.paras[q.pi][0]);
  u.lang='de-DE';if(_deVoice)u.voice=_deVoice;u.rate=_spk.rate;u.pitch=1;
  u.onend=()=>{if(!_rq||_rq.paused)return;q.pi++;_playNext();};   // 暂停时不前进，继续后重读本句
  u.onerror=()=>{if(!_rq||_rq.paused)return;q.pi++;_playNext();};
  speechSynthesis.speak(u);
}
function stopReading(){
  _rq=null;speechSynthesis.cancel();_clearReadHL();_syncReadBtns();
}

// ══════════════ 留学连载：独立板块（原创系列 + 视频资源）══════════════
// 自带朗读引擎，与上方阅读引擎隔离（DOM 前缀 srp_/scard_/srab_，队列 _sq）
var _sq=null; // {i,j,mode:'one'|'loop',paused} 当前播放的集/句
let seriesActive='all';
function _getSeriesList(){return SERIES.filter(r=>seriesActive==='all'||r.level===seriesActive);}
function buildSeriesTabs(){
  const el=document.getElementById('seriesLevelTabs'); if(!el)return;
  const present=READ_LEVELS.filter(([k])=>k==='all'||SERIES.some(r=>r.level===k));
  el.innerHTML=present.map(([k,l])=>`<button class="level-tab${k===seriesActive?' active':''}" onclick="setSeriesLevel('${k}')">${l}</button>`).join('');
}
function setSeriesLevel(k){stopSeries();seriesActive=k;buildSeriesTabs();renderSeries();}
function renderSeries(){
  const el=document.getElementById('seriesList'); if(!el)return;
  const list=_getSeriesList();
  const cnt=document.getElementById('seriesCount'); if(cnt)cnt.textContent='共 '+list.length+' 集';
  el.innerHTML=list.map((r,i)=>{
    const body=r.paras.map((p,j)=>`<div class="read-para" id="srp_${i}_${j}"><div style="display:flex;align-items:start;gap:8px"><button class="para-spk" type="button" title="朗读本句" aria-label="朗读本句" onclick="speakSeriesPara(this,'${escSpk(p[0])}')">🔊</button><div style="flex:1"><div style="font-size:15px;color:var(--text);line-height:1.6" lang="de">${wrapWords(p[0])}</div><div style="font-size:13px;color:var(--text-dim);margin-top:2px">${p[1]}</div></div></div></div>`).join('');
    return `<div class="card" id="scard_${i}" style="cursor:default;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap">
        <span style="font-size:17px;font-weight:600;color:#46a302" lang="de">${r.title}</span>
        <span class="level-badge ${READ_LB[r.level]}">${READ_LN[r.level]}</span>
        <span style="font-size:13px;color:var(--text-dim)">${r.zh}</span>
        <button class="read-art-btn" id="srab_${i}" type="button" title="朗读整集" aria-label="朗读整集：${r.title}" style="margin-left:auto" onclick="toggleEpisode(this,${i})">▶ 朗读</button>
      </div>${body}</div>`;
  }).join('');
}
function speakSeriesPara(btn,text){stopSeries();speakDE(text,btn);}
function _clearSeriesHL(){document.querySelectorAll('#seriesList .read-para.rp-on').forEach(e=>e.classList.remove('rp-on'));}
function _syncSeriesBtns(){
  const lb=document.getElementById('seriesLoopBtn');
  if(lb){const on=_sq&&_sq.mode==='loop';lb.classList.toggle('speaking',!!on);lb.textContent=!on?'🔊 全部朗读':'⏹ 停止';}
  document.querySelectorAll('#seriesList .read-art-btn').forEach(b=>{b.classList.remove('speaking');b.textContent='▶ 朗读';});
  if(_sq&&_sq.mode==='one'){const ab=document.getElementById('srab_'+_sq.i);if(ab){ab.classList.add('speaking');ab.textContent='⏹ 停止';}}
}
function stopSeries(){
  _sq=null;speechSynthesis.cancel();_clearSeriesHL();_syncSeriesBtns();
}
function toggleSeriesLoop(){if(window.__noTTS){_ttsHint();return;}
  if(_sq&&_sq.mode==='loop'){stopSeries();return;}                   // 播放中再按＝停止（下次从头）
  stopSeries();
  if(!_getSeriesList().length)return;
  _sq={i:0,j:0,mode:'loop',paused:false};_syncSeriesBtns();_playSeriesNext();
}
function toggleEpisode(btn,i){if(window.__noTTS){_ttsHint();return;}
  if(_sq&&_sq.mode==='one'&&_sq.i===i){stopSeries();return;}         // 播放中再按＝停止
  stopSeries();_sq={i:i,j:0,mode:'one',paused:false};_syncSeriesBtns();_playSeriesNext();
}
function _playSeriesNext(){
  const q=_sq;if(!q||q.paused)return;
  const list=_getSeriesList();
  if(q.i>=list.length){if(q.mode==='loop'){q.i=0;q.j=0;}else{stopSeries();return;}}
  const r=list[q.i];_clearSeriesHL();
  if(q.j>=r.paras.length){
    if(q.mode==='one'){stopSeries();return;}
    q.i++;q.j=0;return _playSeriesNext();
  }
  const el=document.getElementById('srp_'+q.i+'_'+q.j);
  if(el){el.classList.add('rp-on');el.scrollIntoView({behavior:'smooth',block:'center'});}
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(r.paras[q.j][0]);
  u.lang='de-DE';if(_deVoice)u.voice=_deVoice;u.rate=_spk.rate;u.pitch=1;
  u.onend=()=>{if(!_sq||_sq.paused)return;q.j++;_playSeriesNext();};
  u.onerror=()=>{if(!_sq||_sq.paused)return;q.j++;_playSeriesNext();};
  speechSynthesis.speak(u);
}
// 视频资源：仅标题 + 原创简介 + 官方/平台跳转链接（不复制其内容）
const SERIES_LINKS=[
  {t:"DW · Nicos Weg",lv:"A1–B1",d:"德国之声官方免费课程：跟主人公尼科在德国生活、工作、交友，边看剧边学，含视频与配套练习。",u:"https://learngerman.dw.com/de/nicos-weg/c-36519797"},
  {t:"DW Learn German",lv:"A1–C1",d:"德国之声学德语总入口：分级课程、语法、词汇与情景视频，全部免费正版。",u:"https://learngerman.dw.com/"},
  {t:"DW · 慢速德语新闻",lv:"B2+",d:"每日「Langsam gesprochene Nachrichten」慢速新闻，配文本，练听力与时事词汇。",u:"https://learngerman.dw.com/de/deutsch-im-fokus/s-9092"},
  {t:"DW Learn German · YouTube",lv:"A1–C1",d:"德国之声官方 YouTube 频道，Nicos Weg 等系列的官方视频在此观看。",u:"https://www.youtube.com/@dwlearngerman"},
  {t:"Bilibili 搜索 · Nicos Weg",lv:"搜索",d:"在 B 站搜索相关学习视频（请认准官方/授权账号观看，支持正版）。",u:"https://search.bilibili.com/all?keyword=Nicos+Weg"}
];
function renderSeriesLinks(){
  const el=document.getElementById('seriesLinks'); if(!el)return;
  el.innerHTML=SERIES_LINKS.map(s=>`<a class="card" href="${s.u}" target="_blank" rel="noopener noreferrer" style="display:block;text-decoration:none;cursor:pointer">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <span style="font-size:15px;font-weight:600;color:#46a302" lang="de">${s.t}</span>
      <span class="level-badge lb-a1" style="margin-left:auto">${s.lv}</span>
    </div>
    <div style="font-size:13px;color:var(--text-dim);line-height:1.55;margin-bottom:8px">${s.d}</div>
    <div style="font-size:13px;color:var(--blue);font-weight:600">↗ 去观看</div>
  </a>`).join('');
}

// ── 朗读时保持屏幕常亮（Screen Wake Lock）：缓解「息屏即停」──
// 说明：设备 TTS(speechSynthesis) 无法在切到其他 App 的真后台继续，也无法驱动锁屏/灵动岛；
// 这里在朗读期间阻止息屏/锁屏，让「放着听」不中断。心跳每秒检测是否在朗读来自动开/关。
let _wl=null;
function _wakeOn(){try{if('wakeLock'in navigator&&!_wl&&document.visibilityState==='visible'){navigator.wakeLock.request('screen').then(function(w){_wl=w;w.addEventListener('release',function(){_wl=null;});}).catch(function(){});}}catch(e){}}
function _wakeOff(){try{if(_wl){_wl.release();_wl=null;}}catch(e){_wl=null;}}
setInterval(()=>{try{if(typeof speechSynthesis!=='undefined'&&speechSynthesis.speaking)_wakeOn();else _wakeOff();}catch(e){}},1000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&typeof speechSynthesis!=='undefined'&&speechSynthesis.speaking)_wakeOn();});

function applyTheme(t){var r=document.documentElement;if(t==="dark"||t==="light")r.setAttribute("data-theme",t);else r.removeAttribute("data-theme");var dark=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme:dark)").matches);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",dark?"#111417":"#58cc02");var b=document.getElementById("themeToggle");if(b)b.textContent=dark?"☀️":"🌙";}function toggleTheme(){var cur=document.documentElement.getAttribute("data-theme");var sys=matchMedia("(prefers-color-scheme:dark)").matches;var eff=cur==="dark"||(cur!=="light"&&sys);var next=eff?"light":"dark";try{localStorage.setItem("theme",next);}catch(e){}applyTheme(next);}(function(){var t=null;try{t=localStorage.getItem("theme");}catch(e){}applyTheme(t);})();try{matchMedia("(prefers-color-scheme:dark)").addEventListener("change",function(){var t=null;try{t=localStorage.getItem("theme");}catch(e){}if(t!=="dark"&&t!=="light")applyTheme(null);});}catch(e){}
function _today(){var d=new Date();return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate();}function _yday(){var d=new Date(Date.now()-864e5);return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate();}function getStudy(){var s;try{s=JSON.parse(localStorage.getItem("study")||"{}");}catch(e){s={};}if(!s.goal)s.goal=20;return s;}function saveStudy(s){try{localStorage.setItem("study",JSON.stringify(s));}catch(e){}}function studyTick(n,isQuiz){var s=getStudy(),t=_today();if(s.d!==t){s.streak=(s.last===_yday())?(s.streak||0)+1:1;s.last=t;s.d=t;s.n=0;}var _pn=(s.n||0);s.n=_pn+(n||1);s.total=(s.total||0)+(n||1);if(isQuiz)s.quiz=(s.quiz||0)+1;if((s.streak||0)>(s.best||0))s.best=s.streak;if(!s.h)s.h={};s.h[t]=s.n;var hk=Object.keys(s.h);if(hk.length>14){hk.sort();for(var hi=0;hi<hk.length-14;hi++)delete s.h[hk[hi]];}var _gl=s.goal||20;var _hit=(_pn<_gl&&s.n>=_gl&&s.gday!==t);if(_hit)s.gday=t;saveStudy(s);if(_hit)_goalToast(_gl);try{track("study");}catch(e){}try{acctSyncSoon();}catch(e){}}
// 当日首次达标轻提示（3 秒消失，同日不重复；样式对齐现有 _ttsHint 提示条）
function _goalToast(g){try{_toast('🎉 今日目标达成（'+g+' 次）！明天继续保持');}catch(e){}}function getKnown(){try{return JSON.parse(localStorage.getItem("known")||"{}");}catch(e){return {};}}function saveKnown(m){try{localStorage.setItem("known",JSON.stringify(m));}catch(e){}}function knownHas(de){return !!getKnown()[de];}function knownToggle(p,btn){var m=getKnown();if(m[p.de]){delete m[p.de];}else{m[p.de]={b:1,t:Date.now()};try{studyTick();}catch(e){}}saveKnown(m);try{acctSyncSoon();}catch(e){}if(btn){var on=!!m[p.de];btn.classList.toggle("on",on);btn.title=on?"已学会（点击取消）":"标记为已学会";}}
// ── 间隔复习（Leitner）：掌握的词按盒级 3/7/16/35 天到期回炉；老数据(值=1)视为立即到期 ──
var SRS_IV=[0,3,7,16,35];
function srsInfo(v){if(v===1||v===true)return {b:1,t:0};if(v&&typeof v==="object")return {b:Math.min(v.b||1,4),t:v.t||0};return null;}
function srsDueList(){var m=getKnown(),out=[],now=Date.now();for(var k in m){var s=srsInfo(m[k]);if(s&&now-s.t>=SRS_IV[s.b]*864e5)out.push(k);}return out;}
function srsGrade(w,ok){var m=getKnown(),s=srsInfo(m[w]);if(!s)return;m[w]={b:ok?Math.min(s.b+1,4):1,t:Date.now()};saveKnown(m);}
function copyQQ(btn){var q="717986230";function ok(){btn.textContent="✓ 已复制";setTimeout(function(){btn.textContent="复制";},2000);}try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(q).then(ok).catch(function(){prompt("QQ 号：",q);});}else{prompt("QQ 号：",q);}}catch(e){prompt("QQ 号：",q);}}
function copyShare(btn){var u="https://www.uuoo.site/";function ok(){btn.textContent="✓ 已复制，去粘贴分享吧";setTimeout(function(){btn.textContent="📋 复制网址分享";},2500);}try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(u).then(ok).catch(function(){prompt("复制这个网址分享：",u);});}else{prompt("复制这个网址分享：",u);}}catch(e){prompt("复制这个网址分享：",u);}}
function rejectDonate(){var t=document.createElement('div');t.textContent='谢谢你来过 \uD83D\uDE0A';t.style.cssText='position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:9999;background:rgba(40,40,40,.94);color:#fff;font-size:16px;padding:16px 26px;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,.35)';document.body.appendChild(t);setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t);showSection('home');},1100);}
var VERB_IRR={sein:["bin","bist","ist","sind","seid","sind"],haben:["habe","hast","hat","haben","habt","haben"],werden:["werde","wirst","wird","werden","werdet","werden"],wissen:["weiß","weißt","weiß","wissen","wisst","wissen"],essen:["esse","isst","isst","essen","esst","essen"],geben:["gebe","gibst","gibt","geben","gebt","geben"],nehmen:["nehme","nimmst","nimmt","nehmen","nehmt","nehmen"],sprechen:["spreche","sprichst","spricht","sprechen","sprecht","sprechen"],sehen:["sehe","siehst","sieht","sehen","seht","sehen"],lesen:["lese","liest","liest","lesen","lest","lesen"],helfen:["helfe","hilfst","hilft","helfen","helft","helfen"],treffen:["treffe","triffst","trifft","treffen","trefft","treffen"],fahren:["fahre","fährst","fährt","fahren","fahrt","fahren"],schlafen:["schlafe","schläfst","schläft","schlafen","schlaft","schlafen"],laufen:["laufe","läufst","läuft","laufen","lauft","laufen"],tragen:["trage","trägst","trägt","tragen","tragt","tragen"],fallen:["falle","fällst","fällt","fallen","fallt","fallen"],halten:["halte","hältst","hält","halten","haltet","halten"],waschen:["wasche","wäschst","wäscht","waschen","wascht","waschen"],mögen:["mag","magst","mag","mögen","mögt","mögen"],"können":["kann","kannst","kann","können","könnt","können"],"müssen":["muss","musst","muss","müssen","müsst","müssen"],wollen:["will","willst","will","wollen","wollt","wollen"],sollen:["soll","sollst","soll","sollen","sollt","sollen"],"dürfen":["darf","darfst","darf","dürfen","dürft","dürfen"]};
var VERB_PART={sein:"gewesen",haben:"gehabt",werden:"geworden",wissen:"gewusst",essen:"gegessen",geben:"gegeben",nehmen:"genommen",sprechen:"gesprochen",sehen:"gesehen",lesen:"gelesen",helfen:"geholfen",treffen:"getroffen",fahren:"gefahren",schlafen:"geschlafen",laufen:"gelaufen",tragen:"getragen",fallen:"gefallen",halten:"gehalten",waschen:"gewaschen","mögen":"gemocht","können":"gekonnt","müssen":"gemusst",wollen:"gewollt",sollen:"gesollt","dürfen":"gedurft"};
var VERB_SEIN={sein:1,werden:1,fahren:1,laufen:1,fallen:1};   // 完成时用 sein 的（位移/状态变化）
function perfektOf(v){ // 完成时：助动词 + 过去分词（规则动词自动生成，-ieren 无 ge-）
  var part=VERB_PART[v];
  if(!part){
    var stem=v.replace(/e?n$/,'');
    if(/ieren$/.test(v))part=stem+'t';
    else part='ge'+stem+(/[td]$/.test(stem)?'et':'t');
  }
  return {aux:VERB_SEIN[v]?'ist':'hat',part:part};
}
function conjVerb(v){v=(v||"").trim().toLowerCase().replace(/\s+/g,"");if(!v)return null;if(VERB_IRR[v])return{forms:VERB_IRR[v],reg:false};var stem=v.replace(/en$/,"");if(stem===v)stem=v.replace(/n$/,"");if(!stem)return null;var sE=/[sßxz]$/.test(stem);var needE=/[td]$/.test(stem)||/[^aeiourlh][mn]$/.test(stem);var du=sE?stem+"t":(needE?stem+"est":stem+"st");var er=needE?stem+"et":stem+"t";var ihr=needE?stem+"et":stem+"t";return{forms:[stem+"e",du,er,v,ihr,v],reg:true};}
function conjEx(v){var i=document.getElementById("conjIn");if(i)i.value=v;runConj();}
function runConj(){var i=document.getElementById("conjIn"),o=document.getElementById("conjOut");if(!i||!o)return;var v=i.value.trim().toLowerCase();var r=conjVerb(v);if(!r){o.innerHTML=v?"<div style=\"font-size:13px;color:var(--text-dim)\">请输入动词原形（一般以 -en 结尾）</div>":"";return;}var pron=["ich","du","er/sie/es","wir","ihr","sie/Sie"];var rows=r.forms.map(function(f,k){return "<tr><td>"+pron[k]+"</td><td lang=\"de\"><b style=\"color:#46a302\">"+f+"</b> <button class=\"speak-btn\" type=\"button\" style=\"width:22px;height:22px;font-size:11px\" onclick=\"speakDE('"+pron[k].split("/")[0]+" "+f+"',this)\">🔊</button></td></tr>";}).join("");var pf=perfektOf(v);
o.innerHTML="<div style=\"font-size:12px;color:var(--text-dim);margin:2px 0 4px\">"+(r.reg?"规则变位":"不规则/变音（已内置）")+" · 现在时</div><table class=\"pron-table\"><tr><th>人称</th><th lang=\"de\">"+v+"</th></tr>"+rows+"</table>"+
"<div style=\"font-size:13px;margin-top:8px;color:var(--text)\">⏰ 完成时（口语过去）：<b lang=\"de\" style=\"color:#46a302\">er "+pf.aux+" "+pf.part+"</b> <button class=\"speak-btn\" type=\"button\" style=\"width:22px;height:22px;font-size:11px\" onclick=\"speakDE('er "+pf.aux+" "+pf.part+"',this)\">🔊</button><span style=\"font-size:12px;color:var(--text-faint)\">　分词甩句尾：Er "+pf.aux+" gestern … "+pf.part+".</span></div>";}
// 即学即练：语法/发音每组 3 题，学完立刻主动回忆一次
var GQ_DATA={
p1:[
 {q:'Wasser（水）的 W 读哪个音？',o:['英语 w「窝」','v「瓦」','f「夫」'],a:1,w:'德语 W 一律发 v 音：Wasser＝瓦瑟。而字母 V 大多发 f 音（Vater＝法特尔）。'},
 {q:'ja（是的）怎么读？',o:['贾','雅','夏'],a:1,w:'J 发 y 音：ja＝雅。德语里没有汉语「鸡」那个 j 音。'},
 {q:'zu（去 / 太）的 z 读什么？',o:['兹 z','楚 ts','苏 s'],a:1,w:'Z 永远读 ts（近似「茨 / 楚」的声母）：zu＝楚，Zeit＝采特。'},
 {q:'sch 组合读什么？',o:['s、c、h 分开读','「施」','「斯克」'],a:1,w:'sch 固定读「施」：Schule＝施乌勒，schön＝舍恩。'},
 {q:'ei 组合读什么？',o:['艾','诶','伊'],a:0,w:'ei 读「艾」：Wein＝魏因，nein＝奈因。别和 ie（长音「伊」）搞混。'},
 {q:'ie 组合读什么？',o:['艾','长音「伊」','耶'],a:1,w:'ie 读长「伊」：viel＝菲尔，Liebe＝利贝。和 ei 正好相反。'},
 {q:'Hund（狗）词尾的 d 读什么？',o:['d','t','不发音'],a:1,w:'词尾 b/d/g 清化成 p/t/k：Hund 读「洪特」，Weg 读「韦克」。'},
 {q:'richtig 词尾的 -ig 读什么？',o:['伊格','伊希','伊克'],a:1,w:'-ig 结尾读「伊希」：richtig＝里希提希，lustig＝卢斯提希。'},
 {q:'德语单词的重音一般在哪？',o:['最后一个音节','第一个音节','没有规律'],a:1,w:'重音基本落在第一音节：KOMmen、SPRAche、GUten。外来词除外。'}],
g1:[
 {q:'「学校 Schule」前面用哪个冠词？___ Schule',o:['der','die','das'],a:1,w:'以 -e 结尾的名词 98% 是阴性 → die Schule。记住这条能猜对一大片。'},
 {q:'du trink___ Wasser（你喝水），空里填什么？',o:['-e','-st','-t'],a:1,w:'du 永远配 -st：du trinkst。词尾口诀：-e / -st / -t / -en / -t / -en。'},
 {q:'Ich sehe ___ Mann.（我看见这个男人）',o:['der','dem','den'],a:2,w:'「看见谁」是直接宾语 → 第四格，der 变 den。初学最要紧的就这一个变化。'},
 {q:'「妈妈 Mutter」是什么性？',o:['阳性 der','阴性 die','中性 das'],a:1,w:'人的自然性别一般一致：der Vater 爸爸（阳）、die Mutter 妈妈（阴）。'},
 {q:'wir trink___（我们喝）？',o:['-t','-en','-st'],a:1,w:'wir 配 -en，和原形一样：wir trinken。'},
 {q:'-ung 结尾的名词用哪个冠词？',o:['der','die','das'],a:1,w:'-ung / -heit / -keit / -schaft 结尾 100% 阴性 → die Wohnung、die Zeitung。'},
 {q:'Das ist ___ Buch.（一本书）',o:['ein','eine','einen'],a:0,w:'Buch 是中性，一格用 ein：ein Buch。阴性才用 eine。'},
 {q:'ihr mach___（你们做）？',o:['-en','-t','-st'],a:1,w:'ihr（你们）配 -t：ihr macht。'},
 {q:'Ich helfe ___ Mann.（我帮这个男人）',o:['den','dem','der'],a:1,w:'helfen 固定配第三格 → dem Mann。helfen/danken/gefallen 这几个动词要单独记。'}],
g2:[
 {q:'口语里说「我学了德语」，最自然的是？',o:['Ich lernte Deutsch.','Ich habe Deutsch gelernt.','Ich werde Deutsch lernen.'],a:1,w:'口语说过去用完成时 Perfekt：habe + gelernt（分词甩句尾）。lernte 是书面 / 讲故事用的。'},
 {q:'Ich ___ nach Berlin gefahren.（我去了柏林）',o:['habe','bin','ist'],a:1,w:'位移动词（fahren / gehen / kommen）完成时用 sein → ich bin … gefahren。'},
 {q:'「因为我病了」正确的语序是？',o:['…, weil ich bin krank.','…, weil ich krank bin.','…, weil bin ich krank.'],a:1,w:'weil / dass / wenn 一出现，变位动词站最后 → weil ich krank bin。'},
 {q:'machen 的过去分词是？',o:['gemacht','machte','gemachen'],a:0,w:'规则动词分词＝ge + 词干 + t：machen → gemacht。'},
 {q:'Ich habe Pizza ___.（我吃了披萨）',o:['geesst','gegessen','esste'],a:1,w:'essen 不规则：分词 gegessen（ge-…-en 型）。'},
 {q:'Wir ___ ins Kino gegangen.（我们去了电影院）',o:['haben','sind','waren'],a:1,w:'gehen 是位移动词 → 助动词用 sein：Wir sind ins Kino gegangen。'},
 {q:'aufstehen（起床）造句正确的是？',o:['Ich aufstehe um 7.','Ich stehe um 7 auf.','Ich auf stehe um 7.'],a:1,w:'可分前缀甩句尾：Ich stehe um 7 Uhr auf。'},
 {q:'…, dass er Deutsch ___.（……他学德语）',o:['lernt','lernt er','er lernt'],a:0,w:'dass 从句动词放句尾：…, dass er Deutsch lernt。'},
 {q:'口语「昨天我工作了」最自然：',o:['Ich arbeitete gestern.','Ich habe gestern gearbeitet.','Ich arbeite gestern.'],a:1,w:'口语过去用 Perfekt：habe … gearbeitet（词干带 t → 分词 gearbeitet 插 e）。'}],
g3:[
 {q:'Ich trinke ___ Kaffee.（我喝热咖啡）',o:['heiß','heiße','heißen'],a:2,w:'形容词放名词前要加词尾；喝「什么」是四格、Kaffee 是阳性 → heißen。放动词后面则不变：Der Kaffee ist heiß.'},
 {q:'Das Buch ist auf ___ Tisch.（书在桌上）',o:['den','dem','der'],a:1,w:'静三动四：ist 表静止位置 → 第三格 dem。若是「把它放到桌上」lege … auf den Tisch 才用四格。'},
 {q:'Das ist für ___.（这是给你的）',o:['du','dir','dich'],a:2,w:'für 永远支配第四格 → dich。口诀：durch für gegen ohne um。'},
 {q:'Der ___ Mann ist mein Lehrer.（这个好人）',o:['gut','gute','guter'],a:1,w:'定冠词后统一加 -e：der gute Mann。der 已点明性别，形容词偷懒。'},
 {q:'Ein ___ Mann wartet draußen.（一位老先生）',o:['alte','alter','alt'],a:1,w:'ein 看不出阳性 → 形容词补上 -er：ein alter Mann。'},
 {q:'Ich lege das Buch auf ___ Tisch.（把书放到桌上）',o:['dem','den','der'],a:1,w:'静三动四：legen 是移动方向 → 第四格 den Tisch。'},
 {q:'Ich komme ___ China.（我来自中国）',o:['von','aus','bei'],a:1,w:'从国家/城市来用 aus：Ich komme aus China。'},
 {q:'Wir fahren ___ dem Zug.（我们坐火车）',o:['mit','für','ohne'],a:0,w:'交通工具用 mit + 第三格：mit dem Zug / mit dem Bus。'},
 {q:'Das Geschenk ist ___ meine Mutter.（给我妈的礼物）',o:['für','mit','zu'],a:0,w:'für 支配第四格：für meine Mutter。'},
 {q:'「更好」怎么说？',o:['guter','besser','mehr gut'],a:1,w:'gut 不规则：gut → besser → am besten。德语没有 mehr + 形容词的说法。'},
 {q:'alt（老）的比较级是？',o:['alter','älter','mehr alt'],a:1,w:'单音节 a/o/u 常变音：alt→älter，groß→größer，jung→jünger。'},
 {q:'「他比我高」怎么说？',o:['Er ist größer als ich.','Er ist größer wie ich.','Er ist mehr groß als ich.'],a:0,w:'比较用 als（标准德语）；wie 用于「和…一样」so groß wie。'}],
g4:[
 {q:'er / sie / es（他 / 她 / 它）配哪个动词词尾？',o:['-st','-t','-en'],a:1,w:'er/sie/es 配 -t：er lernt，sie macht。'},
 {q:'du ___ müde.（你累了，用 sein）',o:['bin','bist','ist'],a:1,w:'sein 不规则：ich bin，du bist，er ist——必背，它还是完成时助动词。'},
 {q:'arbeiten（工作）→ du arbeit___？',o:['-st','-est','-et'],a:1,w:'词干以 t / d 结尾要插个 e 好发音 → du arbeitest（试试上面的变位器）。'},
 {q:'sie（他们）lern___？',o:['-t','-en','-st'],a:1,w:'sie/Sie（他们/您）配 -en：sie lernen。'},
 {q:'lesen（读）的 du 形式是？',o:['lesst','liest','leset'],a:1,w:'词干以 s 结尾 du 只加 -t，且 e→ie 变音：du liest。'},
 {q:'fahren（开车/去）的 er 形式是？',o:['fahrt','fährt','fahret'],a:1,w:'强变化动词 a→ä 只发生在 du/er：er fährt，但 wir fahren。'},
 {q:'Ich ___ 20 Jahre alt.（我20岁）',o:['bin','habe','werde'],a:0,w:'说年龄用 sein：Ich bin 20 Jahre alt。'},
 {q:'___ du Hunger?（你饿吗）',o:['Bist','Hast','Wirst'],a:1,w:'德语「饿/渴」用 haben：Hast du Hunger?（直译「你有饥饿吗」）。'},
 {q:'möchten（想要）的 ich 形式？',o:['möchte','möchten','möchtet'],a:0,w:'情态动词 ich 和 er 同形：ich möchte，er möchte（都没有 -e/-t 词尾变化）。'}],
g5:[
 {q:'「今天我踢球」正确语序是？',o:['Heute ich spiele Fußball.','Heute spiele ich Fußball.','Heute Fußball ich spiele.'],a:1,w:'铁律：陈述句动词永远第二位。Heute 占了第一位，动词 spiele 紧跟，主语 ich 退到后面。'},
 {q:'Ich gebe ___ das Buch.（我给你这本书）',o:['du','dich','dir'],a:2,w:'给「谁」用第三格 → dir；给的「东西」用第四格 → das Buch。'},
 {q:'「你来吗？」怎么问？',o:['Du kommst?','Kommst du?','Kommen du?'],a:1,w:'是非问句把变位动词提到句首：Kommst du? 回答 ja / nein。'},
 {q:'Ich sehe ___.（我看见他）',o:['er','ihn','ihm'],a:1,w:'「他」做直接宾语用第四格：er → ihn。'},
 {q:'Wie geht es ___?（你好吗）',o:['du','dich','dir'],a:2,w:'es geht + 第三格：Wie geht es dir? 回答 Mir geht es gut。'},
 {q:'「明天我们学德语」正确语序：',o:['Morgen wir lernen Deutsch.','Morgen lernen wir Deutsch.','Morgen Deutsch lernen wir.'],a:1,w:'动词第二位：Morgen lernen wir Deutsch。'},
 {q:'对方答「aus China」，你问的是？',o:['Wohin kommst du?','Woher kommst du?','Wo kommst du?'],a:1,w:'woher＝从哪来，wohin＝去哪，wo＝在哪——三个别混。'},
 {q:'「这是我的书」',o:['Das ist mein Buch.','Das ist meine Buch.','Das ist meinen Buch.'],a:0,w:'Buch 中性一格 → mein 不加词尾。meine 是阴性/复数。'},
 {q:'否定「我不喝咖啡」',o:['Ich trinke nicht Kaffee.','Ich trinke keinen Kaffee.','Ich nicht trinke Kaffee.'],a:1,w:'否定名词用 kein（阳性四格 keinen）；nicht 用来否定动词/形容词。'}]
};
function _up(el,cls){while(el&&!(el.classList&&el.classList.contains(cls)))el=el.parentNode;return el;}
function renderGqBox(box){ // 从题池随机抽3题（重练自动换题）
  var pool=GQ_DATA[box.getAttribute('data-gq')];if(!pool)return;
  var idx=pool.map(function(_,i){return i;});
  for(var i=idx.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=idx[i];idx[i]=idx[j];idx[j]=t;}
  var qs=idx.slice(0,3).map(function(i){return pool[i];});
  var h='<div class="gq-head">✏️ 即学即练</div><div class="gq-sub">从 '+pool.length+' 题里随机抽 3 题——答错也没关系，看一眼解释就懂了</div>';
  qs.forEach(function(q,qi){
    h+='<div class="gq-item"><div class="gq-q">'+(qi+1)+'. '+q.q+'</div><div class="gq-opts">'
      +q.o.map(function(o,oi){return '<button type="button" class="gq-opt" onclick="gqPick(this,'+q.a+','+oi+')">'+o+'</button>';}).join('')
      +'</div><div class="gq-why">💡 '+q.w+'</div></div>';
  });
  box.innerHTML=h+'<div class="gq-score"></div>';
}
function renderGramQuizzes(){
  document.querySelectorAll('[data-gq]').forEach(renderGqBox);
}
function gqPick(btn,a,oi){
  var item=_up(btn,'gq-item');if(!item||item.classList.contains('done'))return;
  item.classList.add('done');
  var opts=item.querySelectorAll('.gq-opt');
  opts[a].classList.add('ok');
  if(oi!==a)btn.classList.add('bad');
  item.setAttribute('data-right',oi===a?'1':'0');
  try{studyTick(1,1);}catch(e){}   // 计入首页「今日目标」
  var box=_up(item,'gq-box');
  if(box.querySelectorAll('.gq-item.done').length===box.querySelectorAll('.gq-item').length){
    var n=box.querySelectorAll('.gq-item').length,r=box.querySelectorAll('.gq-item[data-right="1"]').length;
    var sc=box.querySelector('.gq-score');
    sc.style.display='block';
    sc.innerHTML=(r===n?'🎉 全对！这组你已经掌握了':'✅ 答对 '+r+'/'+n+' · 错的看上面绿色解释，马上就懂')
      +'<button class="btn" type="button" onclick="gqReset(this)">🔄 换一组再练</button>';
  }
}
function gqReset(btn){
  var box=_up(btn,'gq-box');
  renderGqBox(box);   // 重练＝重新随机抽题
}
// ── 人体图解：原创SVG + 16个部位点读 ──
var BODY_PARTS=[
 {de:"das Haar",zh:"头发",py:"达斯 哈尔",xp:49,yp:3,em:"💇"},
 {de:"die Stirn",zh:"额头",py:"迪 施提恩",xp:49,yp:8,em:"🧑"},
 {de:"die Augenbraue",zh:"眉毛",py:"迪 奥根布劳厄",xp:45,yp:9,em:"🤨"},
 {de:"das Auge",zh:"眼睛",py:"达斯 奥格",xp:53,yp:10,em:"👀"},
 {de:"die Nase",zh:"鼻子",py:"迪 娜泽",xp:49,yp:12,em:"👃"},
 {de:"der Mund",zh:"嘴",py:"德尔 蒙特",xp:49,yp:15,em:"👄"},
 {de:"das Ohr",zh:"耳朵",py:"达斯 奥尔",xp:57,yp:11,em:"👂"},
 {de:"das Kinn",zh:"下巴",py:"达斯 金",xp:49,yp:17,em:"🧔"},
 {de:"der Hals",zh:"脖子",py:"德尔 哈尔斯",xp:49,yp:20,em:"🧣"},
 {de:"die Schulter",zh:"肩膀",py:"迪 舒尔特",xp:35,yp:23,em:"💪"},
 {de:"die Achsel",zh:"腋窝",py:"迪 阿克塞尔",xp:34,yp:28,em:"🙋"},
 {de:"die Brust",zh:"胸",py:"迪 布鲁斯特",xp:43,yp:29,em:"👕"},
 {de:"der Oberarm",zh:"上臂",py:"德尔 奥伯阿姆",xp:30,yp:33,em:"💪"},
 {de:"der Bauch",zh:"肚子",py:"德尔 包赫",xp:50,yp:36,em:"🫃"},
 {de:"der Nabel",zh:"肚脐",py:"德尔 纳贝尔",xp:50,yp:40,em:"🔵"},
 {de:"die Taille",zh:"腰",py:"迪 塔耶",xp:38,yp:38,em:"📏"},
 {de:"der Ellbogen",zh:"手肘",py:"德尔 埃尔博根",xp:28,yp:42,em:"💪"},
 {de:"die Leiste",zh:"鼠蹊",py:"迪 莱斯特",xp:44,yp:46,em:"🩲"},
 {de:"das Handgelenk",zh:"手腕",py:"达斯 汉特格伦克",xp:26,yp:50,em:"⌚"},
 {de:"die Hand",zh:"手",py:"迪 汉特",xp:25,yp:54,em:"✋"},
 {de:"der Finger",zh:"手指",py:"德尔 芬格",xp:24,yp:57,em:"👆"},
 {de:"der Oberschenkel",zh:"大腿",py:"德尔 奥伯申克尔",xp:42,yp:54,em:"🦵"},
 {de:"das Knie",zh:"膝盖",py:"达斯 克尼",xp:45,yp:66,em:"🦵"},
 {de:"das Schienbein",zh:"小腿",py:"达斯 席恩拜因",xp:45,yp:77,em:"🦵"},
 {de:"der Knöchel",zh:"脚踝",py:"德尔 克讷歇尔",xp:41,yp:85,em:"🦶"},
 {de:"der Fuß",zh:"脚",py:"德尔 福斯",xp:39,yp:89,em:"🦶"},
 {de:"der Kopf",zh:"头",py:"德尔 科普夫",xp:43,yp:6,em:"🗣️"},
 {de:"das Gesicht",zh:"脸",py:"达斯 格济希特",xp:54,yp:14,em:"😀"},
 {de:"der Arm",zh:"手臂",py:"德尔 阿姆",xp:68,yp:35,em:"💪"},
 {de:"der Zeh",zh:"脚趾",py:"德尔 采",xp:60,yp:89,em:"🦶"}
];
// 图卡板：emoji 图卡（彩色、全设备一致、免版权），词全部取自站内词库主题
var PIC_BOARDS=[
 {id:"koerper",icon:"🧍",name:"人体"},
 {id:"obst",icon:"🍎",name:"水果蔬菜",items:[
  ["der Apfel","苹果","德尔 阿普费尔","🍎"],["die Banane","香蕉","迪 巴娜呢","🍌"],["die Orange","橙子","迪 奥朗热","🍊"],["die Zitrone","柠檬","迪 齐特罗呢","🍋"],
  ["die Wassermelone","西瓜","迪 瓦瑟梅隆呢","🍉"],["die Traube","葡萄","迪 特劳伯","🍇"],["die Erdbeere","草莓","迪 埃尔特贝勒","🍓"],["die Kirsche","樱桃","迪 基尔舍","🍒"],
  ["der Pfirsich","桃子","德尔 普菲尔西希","🍑"],["die Ananas","菠萝","迪 阿纳纳斯","🍍"],["die Mango","芒果","迪 芒果","🥭"],["die Kiwi","猕猴桃","迪 奇维","🥝"],
  ["die Tomate","番茄","迪 托马特","🍅"],["die Aubergine","茄子","迪 奥贝尔基呢","🍆"],["die Karotte","胡萝卜","迪 卡罗特","🥕"],["der Mais","玉米","德尔 迈斯","🌽"],
  ["die Kartoffel","土豆","迪 卡托费尔","🥔"],["die Gurke","黄瓜","迪 古尔克","🥒"],["der Brokkoli","西兰花","德尔 布罗科利","🥦"],["die Zwiebel","洋葱","迪 茨维贝尔","🧅"],
  ["der Knoblauch","大蒜","德尔 克诺布劳赫","🧄"],["der Pilz","蘑菇","德尔 皮尔茨","🍄"]]},
 {id:"tier",icon:"🐶",name:"动物",items:[
  ["der Hund","狗","德尔 洪特","🐶"],["die Katze","猫","迪 卡策","🐱"],["das Pferd","马","达斯 普费尔特","🐴"],["die Kuh","牛","迪 库","🐮"],
  ["das Schwein","猪","达斯 施瓦因","🐷"],["das Schaf","羊","达斯 沙夫","🐑"],["das Huhn","鸡","达斯 洪","🐔"],["die Ente","鸭子","迪 恩特","🦆"],
  ["der Vogel","鸟","德尔 佛格尔","🐦"],["der Fisch","鱼","德尔 菲什","🐟"],["der Löwe","狮子","德尔 勒维","🦁"],["der Tiger","老虎","德尔 提格","🐯"],
  ["der Bär","熊","德尔 贝尔","🐻"],["der Panda","熊猫","德尔 潘达","🐼"],["der Elefant","大象","德尔 埃勒方特","🐘"],["das Kaninchen","兔子","达斯 卡宁兴","🐰"],
  ["der Affe","猴子","德尔 阿费","🐵"],["der Frosch","青蛙","德尔 弗罗什","🐸"],["die Schlange","蛇","迪 施朗厄","🐍"],["die Biene","蜜蜂","迪 比呢","🐝"],
  ["der Schmetterling","蝴蝶","德尔 施梅特林","🦋"],["der Pinguin","企鹅","德尔 平古因","🐧"]]},
 {id:"verkehr",icon:"🚗",name:"交通",items:[
  ["das Auto","汽车","达斯 奥托","🚗"],["der Bus","公交车","德尔 布斯","🚌"],["das Taxi","出租车","达斯 塔克西","🚕"],["das Fahrrad","自行车","达斯 法拉特","🚲"],
  ["das Motorrad","摩托车","达斯 摩托拉特","🏍️"],["der Zug","火车","德尔 楚克","🚆"],["die U-Bahn","地铁","迪 乌-班","🚇"],["die Straßenbahn","有轨电车","迪 施特拉森班","🚊"],
  ["das Flugzeug","飞机","达斯 弗鲁克措伊克","✈️"],["das Schiff","轮船","达斯 施夫","🚢"],["der LKW","卡车","德尔 埃尔卡维","🚚"],["der Krankenwagen","救护车","德尔 克兰肯瓦根","🚑"],
  ["das Polizeiauto","警车","达斯 波利采奥托","🚓"],["das Feuerwehrauto","消防车","达斯 佛伊尔韦尔奥托","🚒"],["die Ampel","红绿灯","迪 安佩尔","🚦"]]},
 {id:"kleidung",icon:"👕",name:"衣物",items:[
  ["das T-Shirt","T恤","达斯 提-舍尔特","👕"],["die Hose","裤子","迪 霍泽","👖"],["das Kleid","连衣裙","达斯 克莱特","👗"],["der Rock","裙子","德尔 罗克","👚"],
  ["der Mantel","大衣","德尔 曼特尔","🧥"],["der Pullover","毛衣","德尔 普洛佛","🧶"],["die Jacke","夹克","迪 亚克","🧥"],["die Socke","袜子","迪 佐克","🧦"],
  ["der Schuh","鞋","德尔 舒","👞"],["der Stiefel","靴子","德尔 施提弗尔","🥾"],["der Sportschuh","运动鞋","德尔 施波尔特舒","👟"],["der Hut","帽子","德尔 胡特","🎩"],
  ["die Mütze","毛线帽","迪 缪策","🧢"],["der Handschuh","手套","德尔 汉特舒","🧤"],["der Schal","围巾","德尔 沙尔","🧣"],["die Brille","眼镜","迪 布里勒","👓"],
  ["die Krawatte","领带","迪 克拉瓦特","👔"],["die Tasche","包","迪 塔舍","👜"]]},
 {id:"kueche",icon:"🍴",name:"餐具厨房",items:[
  ["der Teller","盘子","德尔 泰勒","🍽️"],["die Gabel","叉子","迪 加贝尔","🍴"],["das Messer","刀","达斯 梅瑟","🔪"],["der Löffel","勺子","德尔 勒费尔","🥄"],
  ["die Tasse","杯子","迪 塔瑟","☕"],["das Glas","玻璃杯","达斯 格拉斯","🥛"],["die Flasche","瓶子","迪 弗拉舍","🍾"],["der Topf","锅","德尔 托普夫","🍲"],
  ["die Pfanne","平底锅","迪 普凡呢","🍳"],["der Kühlschrank","冰箱","德尔 屈尔施兰克","🧊"],["der Herd","炉灶","德尔 黑尔特","🔥"],["die Mikrowelle","微波炉","迪 米克罗韦勒","📻"],
  ["die Schere","剪刀","迪 舍勒","✂️"],["die Serviette","餐巾","迪 泽尔维耶特","🧻"],
  ["die Essensbox","外卖盒","迪 埃森斯博克斯","🍱"],["die Lieferbox","外卖保温箱","迪 利弗博克斯","📦"],
  ["die Papiertüte","外卖纸袋","迪 帕皮尔提特","🛍️"],["die Plastiktüte","塑料袋","迪 普拉斯提克提特","🛍️"],
  ["der Abholschrank","外卖取餐柜","德尔 阿普霍尔施兰克","🗄️"],["das Einweggeschirr","一次性餐具","达斯 艾因韦克格施尔","🥢"]]},
 {id:"wetter",icon:"☀️",name:"天气",items:[
  ["die Sonne","太阳","迪 佐呢","☀️"],["die Wolke","云","迪 沃尔克","☁️"],["der Regen","雨","德尔 雷根","🌧️"],["der Schnee","雪","德尔 施内","❄️"],
  ["der Blitz","闪电","德尔 布利茨","⚡"],["der Wind","风","德尔 温特","🌬️"],["der Regenbogen","彩虹","德尔 雷根博根","🌈"],["der Nebel","雾","德尔 内贝尔","🌫️"],
  ["das Gewitter","雷雨","达斯 格维特","⛈️"],["der Mond","月亮","德尔 蒙特","🌙"],["der Stern","星星","德尔 施特恩","⭐"],["der Schirm","雨伞","德尔 施尔姆","☂️"]]}
];
var _curBoard="koerper";
function renderBoardTabs(){
  var el=document.getElementById("boardTabs");if(!el||el.childNodes.length)return;
  PIC_BOARDS.forEach(function(b){
    var t=document.createElement("button");
    t.type="button";t.className="board-tab"+(b.id===_curBoard?" active":"");
    t.textContent=b.icon+" "+b.name;
    t.addEventListener("click",function(){switchBoard(b.id);});
    el.appendChild(t);
  });
}
function switchBoard(id){
  _curBoard=id;
  document.querySelectorAll("#boardTabs .board-tab").forEach(function(t,i){t.className="board-tab"+(PIC_BOARDS[i].id===id?" active":"");});
  var isBody=id==="koerper";
  document.getElementById("boardBody").style.display=isBody?"":"none";
  document.getElementById("boardGrid").style.display=isBody?"none":"grid";
  document.getElementById("picOut").style.display="none";
  if(isBody){renderBody();buildBoardQuiz();return;}
  var brd=null;for(var i=0;i<PIC_BOARDS.length;i++)if(PIC_BOARDS[i].id===id)brd=PIC_BOARDS[i];
  var g=document.getElementById("boardGrid");
  g.innerHTML=(brd.items||[]).map(function(it,i){
    return '<div class="pic-cell" data-i="'+i+'"><div class="pic-emoji">'+it[3]+'</div><div class="pic-de" lang="de">'+it[0]+'</div><div class="pic-zh">'+it[1]+'</div></div>';
  }).join("");
  g.querySelectorAll(".pic-cell").forEach(function(c){
    c.addEventListener("click",function(){picPick(brd,+c.getAttribute("data-i"),c);});
  });
  buildBoardQuiz();
}
function picPick(brd,i,cell){
  var it=brd.items[i];if(!it)return;
  brd._grid=document.getElementById("boardGrid");
  document.querySelectorAll("#boardGrid .pic-cell").forEach(function(c){c.classList.remove("active");});
  if(cell)cell.classList.add("active");
  var out=document.getElementById("picOut");
  out.style.display="block";
  out.innerHTML='<span style="font-size:30px;vertical-align:middle">'+it[3]+'</span> <b lang="de" style="font-size:20px;color:#46a302;vertical-align:middle">'+it[0]+'</b> <button class="speak-btn" type="button" onclick="speakDE(\''+it[0].replace(/'/g,"\\'")+'\',this)" style="vertical-align:middle">🔊</button><div style="font-size:14px;color:var(--text);margin-top:4px">'+it[1]+' · <span style="color:var(--text-faint)">'+it[2]+'</span></div>';
  try{speakDE(it[0]);}catch(e){}
  try{studyTick(1,1);}catch(e){}
}
function _boardItems(){
  if(_curBoard==='koerper')return BODY_PARTS.map(function(p){return{de:p.de,zh:p.zh,em:p.em};});
  for(var i=0;i<PIC_BOARDS.length;i++)if(PIC_BOARDS[i].id===_curBoard&&PIC_BOARDS[i].items)
    return PIC_BOARDS[i].items.map(function(it){return{de:it[0],zh:it[1],em:it[3]};});
  return [];
}
function buildBoardQuiz(){
  var box=document.getElementById('boardQuiz');if(!box)return;
  var items=_boardItems();if(items.length<4){box.innerHTML='';return;}
  var ti=Math.floor(Math.random()*items.length),t=items[ti];
  var opts=[t],guard=0;
  while(opts.length<4&&guard++<200){var c=items[Math.floor(Math.random()*items.length)];if(opts.indexOf(c)<0&&c.de!==t.de)opts.push(c);}
  for(var i=opts.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),x=opts[i];opts[i]=opts[j];opts[j]=x;}
  var h='<div class="gq-head">✏️ 看图选德语</div><div class="gq-sub">选出下面这个的德语说法</div>'
    +'<div style="text-align:center;margin:6px 0 10px"><span style="font-size:46px">'+t.em+'</span><div style="font-size:15px;color:var(--text);font-weight:600">'+t.zh+'</div></div>'
    +'<div class="gq-opts" style="justify-content:center">'
    +opts.map(function(o){return '<button type="button" class="gq-opt" lang="de" onclick="boardAns(this,\''+o.de.replace(/'/g,"\\'")+'\',\''+t.de.replace(/'/g,"\\'")+'\')">'+o.de+'</button>';}).join('')
    +'</div><div class="gq-score" style="margin-top:12px"></div>';
  box.innerHTML=h;
}
function boardAns(btn,sel,cor){
  var box=document.getElementById('boardQuiz');
  box.querySelectorAll('.gq-opt').forEach(function(b){b.style.pointerEvents='none';if(b.textContent===cor)b.classList.add('ok');});
  if(sel!==cor)btn.classList.add('bad');
  try{speakDE(cor);}catch(e){}
  try{studyTick(1,1);}catch(e){}
  var sc=box.querySelector('.gq-score');sc.style.display='block';
  sc.innerHTML=(sel===cor?'🎉 答对了！':'✅ 正确答案已标绿')+'<button class="btn" type="button" style="padding:5px 14px;font-size:12px;margin-left:8px" onclick="buildBoardQuiz()">🔄 下一题</button>';
}
function renderBody(){
  var chips=document.getElementById('bodyChips');
  if(!chips||chips.childNodes.length)return;
  chips.innerHTML=BODY_PARTS.map(function(p,i){
    return '<div class="pic-cell" data-i="'+i+'"><div class="pic-emoji">'+p.em+'</div><div class="pic-de" lang="de">'+p.de+'</div><div class="pic-zh">'+p.zh+'</div></div>';
  }).join('');
  chips.querySelectorAll('.pic-cell').forEach(function(c){c.addEventListener('click',function(){bpPick(+c.getAttribute('data-i'));});});
}
function bpPick(i){
  var p=BODY_PARTS[i];if(!p)return;
  document.querySelectorAll('#bodyChips .pic-cell').forEach(function(x,k){x.className='pic-cell'+(k===i?' active':'');});
  var out=document.getElementById('picOut');
  out.style.display='block';
  out.innerHTML='<span style="font-size:30px;vertical-align:middle">'+p.em+'</span> <b lang="de" style="font-size:20px;color:#46a302;vertical-align:middle">'+p.de+'</b> <button class="speak-btn" type="button" onclick="speakDE(\''+p.de.replace(/'/g,"\\'")+'\',this)" style="vertical-align:middle">🔊</button><div style="font-size:14px;color:var(--text);margin-top:4px">'+p.zh+' · <span style="color:var(--text-faint)">'+p.py+'</span></div>';
  try{speakDE(p.de);}catch(e){}
  try{studyTick(1,1);}catch(e){}
}
// PWA 安装：捕获浏览器可安装事件，页面上给一个「安装到桌面」按钮（Chrome 自动提示很吝啬，删了就不弹，这里可随时手动装）
var _deferredPrompt=null;
window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();_deferredPrompt=e;var b=document.getElementById('pwaInstall');if(b&&!_isStandalone())b.style.display='block';});
window.addEventListener('appinstalled',function(){_deferredPrompt=null;var b=document.getElementById('pwaInstall');if(b)b.style.display='none';try{track('install');}catch(e){}});
function _isStandalone(){return (window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||window.navigator.standalone===true;}
function pwaInstall(){
  if(_deferredPrompt){_deferredPrompt.prompt();_deferredPrompt.userChoice.then(function(){_deferredPrompt=null;var b=document.getElementById('pwaInstall');if(b)b.style.display='none';});}
  else{alert('如果没弹出安装框：\n• 电脑 Chrome/Edge：点地址栏右侧的「安装」图标（⊕ / 显示器带箭头）\n• 安卓 Chrome：菜单 ⋮ → 安装应用 / 添加到主屏幕\n• iPhone Safari：分享 → 添加到主屏幕');}
}
// Service Worker：真离线支持（https/localhost 下注册；老内核无 SW 自动跳过）
// ── 匿名埋点（可选）：只记匿名使用统计；离线队列 + 批量发送 + 失败不打扰用户 ──
// 部署 analytics/（Cloudflare Worker+D1）后，把 Worker 地址填到 TRACK_URL；留空=完全不采集、零请求。
var TRACK_URL="https://uuoo-analytics.uuoo.workers.dev/collect";
var _sid=Math.random().toString(36).slice(2,10),_tq=[];
function _vid(){try{var v=localStorage.getItem('_vid');if(!v){v=Date.now().toString(36)+Math.random().toString(36).slice(2,8);localStorage.setItem('_vid',v);}return v;}catch(e){return '0';}}
function _trackOn(){try{if(navigator.doNotTrack=='1'||localStorage.getItem('_noTrack')=='1')return false;}catch(e){}return !!TRACK_URL;}
function track(name,props){if(!_trackOn())return;_tq.push({t:Date.now(),n:name,p:props||null});if(_tq.length>=10)_trackFlush();}
function _trackFlush(beacon){
  if(!_trackOn()||!_tq.length)return;
  var batch=_tq.splice(0,_tq.length);
  var body=JSON.stringify({vid:_vid(),sid:_sid,path:location.pathname,ref:document.referrer||'',ua:navigator.userAgent,events:batch});
  try{
    if(beacon&&navigator.sendBeacon){navigator.sendBeacon(TRACK_URL,body);return;}
    fetch(TRACK_URL,{method:'POST',headers:{'Content-Type':'text/plain'},body:body,keepalive:true})['catch'](function(){_trackSave(batch);});
  }catch(e){_trackSave(batch);}
}
function _trackSave(b){try{var o=JSON.parse(localStorage.getItem('_tq')||'[]');localStorage.setItem('_tq',JSON.stringify(o.concat(b).slice(-200)));}catch(e){}}
function _trackResend(){try{var o=JSON.parse(localStorage.getItem('_tq')||'[]');if(o.length&&_trackOn()){localStorage.removeItem('_tq');_tq=o.concat(_tq);_trackFlush();}}catch(e){}}
try{document.addEventListener('visibilitychange',function(){if(document.visibilityState=='hidden')_trackFlush(true);});}catch(e){}
try{_trackResend();}catch(e){}
try{if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='127.0.0.1'||location.hostname==='localhost'))navigator.serviceWorker.register('sw.js');}catch(e){}
// INIT：硬登录门槛下，登录页(locked)不建任何内容，解锁后再建，显著加快登录首屏
var _appInited=false;
function appInit(){
  if(_appInited)return;_appInited=true;
  try{setLang(LANG);}catch(e){}   // 解锁后先补齐语言/词库（登录页时被跳过）
  try{initPhrases();}catch(e){}
  try{renderGramQuizzes();}catch(e){}
  try{buildReadTabs();buildSeriesTabs();}catch(e){}   // 标签轻量先建；长列表首次打开懒渲染
  try{buildSubNav('grammar','grammarSubnav');buildSubNav('en-grammar','enGrammarSubnav');buildSubNav('pronunciation','pronSubnav');buildSubNav('numbers','numSubnav');buildSubNav('en-pron','enPronSubnav');buildSubNav('en-num','enNumSubnav');}catch(e){}
}
// 长版块快速跳转条
function buildSubNav(sectionId,navId){
  const sec=document.getElementById(sectionId), nav=document.getElementById(navId);
  if(!sec||!nav)return;
  nav.innerHTML='';
  sec.querySelectorAll('.sec-title').forEach((t,i)=>{
    const id=sectionId+'_s'+i; t.id=id;
    const lab=t.querySelector('.sec-title-text'); if(!lab)return;
    const chip=document.createElement('button');
    chip.className='subnav-chip'; chip.type='button'; chip.textContent=lab.textContent;
    chip.onclick=function(){var el=document.getElementById(id);var d=el.closest&&el.closest('details');if(d)d.open=true;el.scrollIntoView({behavior:'smooth',block:'start'});};
    nav.appendChild(chip);
  });
}
setLang(LANG); // 应用初始语言（含 localStorage 记忆）
if(!document.documentElement.classList.contains('locked'))appInit();  // 已登录直接建；未登录等解锁后建
