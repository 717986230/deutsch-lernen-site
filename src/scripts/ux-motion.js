/* Purposeful interaction layer: page transitions, reading progress, micro feedback,
   and defensive states. All hooks are additive and respect reduced-motion. */
(function(){
  var reduce=false;
  try{reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){}
  document.documentElement.classList.add('micro-ready');

  function ensureProgress(){
    var bar=document.getElementById('readProgress');
    if(!bar){
      bar=document.createElement('div');
      bar.id='readProgress';
      bar.className='read-progress';
      bar.setAttribute('aria-hidden','true');
      bar.innerHTML='<i></i>';
      document.body.appendChild(bar);
    }
    return bar.firstChild;
  }
  function updateReadingProgress(){
    var sec=document.querySelector('#reading.active,#series.active');
    var fill=ensureProgress();
    if(!sec){fill.style.width='0';return;}
    var r=sec.getBoundingClientRect();
    var max=Math.max(1,r.height-window.innerHeight);
    var pct=Math.min(100,Math.max(0,(-r.top)/max*100));
    fill.style.width=pct+'%';
  }

  function addReveal(root){
    if(reduce)return;
    root=root||document;
    var nodes=root.querySelectorAll('.card,.rule-box,.tip-card,.quiz-box,.gram-group,.level-card,.read-para,.pron-table');
    if(!('IntersectionObserver' in window)){
      for(var i=0;i<nodes.length;i++)nodes[i].classList.add('is-visible');
      return;
    }
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(ent){
        if(ent.isIntersecting){ent.target.classList.add('is-visible');io.unobserve(ent.target);}
      });
    },{rootMargin:'0px 0px -8% 0px',threshold:.05});
    for(var n=0;n<nodes.length;n++){
      if(!nodes[n].classList.contains('reveal-in')){
        nodes[n].classList.add('reveal-in');
        io.observe(nodes[n]);
      }
    }
  }

  function tapFeedback(e){
    var el=e.target&&e.target.closest&&e.target.closest('button,.card,.level-card,.rd-word,.rank-row,.pic-cell');
    if(!el||reduce)return;
    el.classList.remove('tap-pop');
    void el.offsetWidth;
    el.classList.add('tap-pop');
  }

  function decorateReadingControls(){
    ['reading','series'].forEach(function(id){
      var sec=document.getElementById(id);
      if(!sec||sec.querySelector('.reading-tools'))return;
      var tabs=sec.querySelector('.level-tabs');
      if(!tabs)return;
      var wrap=document.createElement('div');
      wrap.className='reading-tools';
      tabs.parentNode.insertBefore(wrap,tabs);
      while(tabs&&tabs.previousSibling&&tabs.previousSibling.nodeType===3&&!tabs.previousSibling.nodeValue.trim())tabs.previousSibling.parentNode.removeChild(tabs.previousSibling);
      wrap.appendChild(tabs);
      var gloss=sec.querySelector('.gloss-btn');
      if(gloss)wrap.appendChild(gloss);
    });
  }

  function defensiveStates(){
    var rank=document.getElementById('rankList');
    if(rank&&!rank.textContent.trim())rank.innerHTML='<div class="skeleton-line" aria-label="正在加载"></div>';
    if(window.AppServices){
      var cap=AppServices.capabilities();
      if(!cap.remoteApi){
        var host=document.getElementById('homeDash');
        if(host&&!document.getElementById('localModeNote')){
          var note=document.createElement('div');
          note.id='localModeNote';
          note.className='service-note';
          note.textContent='当前为本地学习模式：进度会保存在本设备；接入后端后可同步账号、排行和个性化内容。';
          host.parentNode.insertBefore(note,host.nextSibling);
        }
      }
    }
  }

  function wrap(name,after){
    var old=window[name];
    if(typeof old!=='function')return;
    window[name]=function(){
      var ret=old.apply(this,arguments);
      try{after.apply(this,arguments);}catch(e){}
      return ret;
    };
  }

  wrap('showSection',function(id){
    updateReadingProgress();
    setTimeout(function(){addReveal(document.getElementById(id)||document);decorateReadingControls();defensiveStates();},40);
  });
  wrap('renderReadings',function(){decorateReadingControls();addReveal(document.getElementById('reading'));});
  wrap('renderSeries',function(){decorateReadingControls();addReveal(document.getElementById('series'));});
  wrap('readWordClick',function(){updateReadingProgress();});

  window.addEventListener('scroll',updateReadingProgress,{passive:true});
  window.addEventListener('resize',updateReadingProgress,{passive:true});
  document.addEventListener('click',tapFeedback,true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){addReveal();decorateReadingControls();defensiveStates();updateReadingProgress();});
  else{addReveal();decorateReadingControls();defensiveStates();updateReadingProgress();}
})();
