(function(){
  var btn=document.getElementById('toTop');
  var ls=document.querySelector('.lang-switch');
  function onScroll(){
    (window.scrollY>300?btn.classList.add('show'):btn.classList.remove('show'));
    if(ls)(window.scrollY>30?ls.classList.add('ls-hide'):ls.classList.remove('ls-hide'));   // 语言/夜间开关只在页面顶部显示
  }
  window.addEventListener('scroll',onScroll,{passive:true});
  onScroll();
})();
