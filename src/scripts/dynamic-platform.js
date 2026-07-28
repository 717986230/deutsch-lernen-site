/* Dynamic platform seam.
   Public learning remains static and local-first. Future account/progress/content backends
   should attach adapters here instead of reaching across UI modules directly. */
(function(){
  function ok(data){return Promise.resolve({ok:true,source:'local',data:data});}
  function fail(err){return Promise.resolve({ok:false,source:'local',error:err||'unavailable'});}
  function readJson(key,fallback){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}catch(e){return fallback;}}
  function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch(e){return false;}}

  var localProgress={
    get:function(){return ok({study:readJson('study',{}),known:readJson('known',{}),wrong:readJson('spWrong',{})});},
    saveStudy:function(study){return writeJson('study',study)?ok(study):fail('storage_full');},
    saveKnown:function(known){return writeJson('known',known)?ok(known):fail('storage_full');}
  };

  var remoteProgress={
    sync:function(snapshot){
      if(typeof apiFetch!=='function'||!window.ACCT||!ACCT.token)return ok({queued:false,mode:'local-only'});
      return apiFetch('/api/sync',{method:'POST',body:snapshot}).then(function(r){
        return r&&r.ok?{ok:true,source:'remote',data:r.data}:{ok:false,source:'remote',status:r&&r.status,error:r&&r.data&&r.data.err};
      });
    }
  };

  var contentCatalog={
    levels:function(){
      var list=[];
      try{list=(window.DE_CATEGORIES||[]).map(function(c){return {id:c.id,name:c.name,level:c.level,count:(c.phrases||[]).length};});}catch(e){}
      return ok(list);
    },
    readings:function(){
      var list=[];
      try{list=(window.READINGS||[]).map(function(r){return {title:r.title,level:r.level,count:(r.paras||[]).length};});}catch(e){}
      return ok(list);
    }
  };

  window.AppServices={
    version:'2026-07-local-first',
    progress:localProgress,
    remoteProgress:remoteProgress,
    content:contentCatalog,
    capabilities:function(){
      return {
        staticContent:true,
        localProgress:true,
        offlinePwa:'serviceWorker' in navigator,
        accountSync:!!(window.ACCT&&ACCT.token),
        remoteApi:typeof API_BASE==='string'&&!!API_BASE
      };
    }
  };
})();
