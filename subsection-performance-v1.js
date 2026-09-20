(function(){
'use strict';
const V='20260920-subsection-paint-fix-v2';
if(window.DBEST_SUBSECTION_PERF?.version===V)return;

function pauseDecorativeMedia(){
  document.querySelectorAll('.tile video,.tileVisual video').forEach(v=>{try{v.pause()}catch(_){}});
}

function tuneMedia(root){
  (root||document).querySelectorAll?.('img').forEach(img=>{
    if(!img.hasAttribute('loading'))img.loading='lazy';
    if(!img.hasAttribute('decoding'))img.decoding='async';
  });
  (root||document).querySelectorAll?.('video').forEach(v=>{
    v.preload='metadata';
    v.playsInline=true;
  });
}

let io=null;
function observeVideos(){
  if(!('IntersectionObserver' in window))return;
  if(!io)io=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      const v=entry.target;
      if(entry.isIntersecting && entry.intersectionRatio>.35){
        if(v.autoplay || v.hasAttribute('autoplay'))v.play().catch(()=>{});
      }else{
        try{v.pause()}catch(_){ }
      }
    });
  },{threshold:[0,.35,.75],rootMargin:'80px 0px'});
  document.querySelectorAll('.tile video,.tileVisual video').forEach(v=>io.observe(v));
}

function installCss(){
  if(document.getElementById('dbest-subsection-perf-css'))return;
  const s=document.createElement('style');
  s.id='dbest-subsection-perf-css';
  s.textContent='.subs{content-visibility:visible!important;contain:none!important}.cards,.table{content-visibility:auto;contain-intrinsic-size:1px 420px}.sub{contain:none!important}.card{contain:layout paint style}.tile video,.tileVisual video{will-change:auto!important}';
  document.head.appendChild(s);
}

function prepare(){
  installCss();
  tuneMedia(document);
  observeVideos();
}

/* Free video decode/paint work before the existing tile handler renders a subsection. */
document.addEventListener('pointerdown',e=>{
  const t=e.target.closest&&e.target.closest('.tile,.sub,.card');
  if(!t)return;
  pauseDecorativeMedia();
},{capture:true,passive:true});

/* The application creates several subsection DOM blocks dynamically. Tune only new nodes. */
const mo=new MutationObserver(list=>{
  for(const m of list){
    for(const n of m.addedNodes){
      if(n&&n.nodeType===1)tuneMedia(n);
    }
  }
  observeVideos();
});

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{prepare();mo.observe(document.body,{childList:true,subtree:true})},{once:true});
else{prepare();mo.observe(document.body,{childList:true,subtree:true})}

window.DBEST_SUBSECTION_PERF={version:V,pauseDecorativeMedia,prepare};
})();
