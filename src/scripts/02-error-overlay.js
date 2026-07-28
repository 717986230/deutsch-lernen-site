/* 诊断：独立脚本块，即使主脚本解析失败也会运行；把任何 JS 错误显示到屏幕上 */
(function(){
  function box(){var d=document.getElementById('__eb');if(!d){d=document.createElement('div');d.id='__eb';d.style.cssText='position:fixed;top:0;left:0;right:0;z-index:99999;background:#c0392b;color:#fff;font:12px/1.6 monospace;padding:10px;white-space:pre-wrap;word-break:break-all;max-height:60%;overflow:auto';(document.body||document.documentElement).appendChild(d);}return d;}
  window.onerror=function(m,s,l,c){try{box().textContent='⚠️ 脚本出错（请截图发我）\n'+m+'\n@'+(s||'')+' '+l+':'+c;}catch(e){}return false;};
  try{window.addEventListener('unhandledrejection',function(e){try{box().textContent='⚠️ Promise 出错（截图发我）\n'+(((e.reason)&&(e.reason.message||e.reason))||'unknown');}catch(_){}}); }catch(e){}
})();
