/* CSTECH16 UI: splash, progresso, cabeçalho, revelar, tilt, ripple e carrossel */
(function(){
'use strict';
var D=document,reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
function $(s,r){return (r||D).querySelector(s)}function $$(s,r){return Array.prototype.slice.call((r||D).querySelectorAll(s))}
/* splash com o ícone, só na primeira visita da sessão */
try{if(!reduce&&!sessionStorage.getItem('cs_splash')&&($('.store-page')||$('.auth-page'))){
 sessionStorage.setItem('cs_splash','1');var sp=D.createElement('div');sp.id='cs-splash';sp.setAttribute('aria-hidden','true');
 sp.innerHTML='<div><img src="/static/img/icon.svg" alt=""></div>';D.body.appendChild(sp);
 var out=function(){sp.classList.add('is-out');setTimeout(function(){sp.remove()},600)};
 var t0=Date.now();addEventListener('load',function(){setTimeout(out,Math.max(0,550-(Date.now()-t0)))});setTimeout(out,2200);}}catch(e){}
/* barra de progresso + cabeçalho */
var bar=D.createElement('div');bar.id='cs-progress';D.body.appendChild(bar);var hd=$('.v4-header'),tick=false;
function onScroll(){tick=false;var h=D.documentElement,m=h.scrollHeight-innerHeight;bar.style.transform='scaleX('+(m>0?Math.min(1,scrollY/m):0)+')';if(hd)hd.classList.toggle('is-scrolled',scrollY>8)}
addEventListener('scroll',function(){if(!tick){tick=true;requestAnimationFrame(onScroll)}},{passive:true});onScroll();
/* revelar ao rolar */
var targets=$$('.cs-promo-strip,.premium-categories,.store-section-head,.store-toolbar,.v4-departments');
if('IntersectionObserver' in window&&!reduce){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('is-in');io.unobserve(e.target)}})},{threshold:.12});
 targets.forEach(function(t){t.classList.add('cs-reveal');io.observe(t)})}
/* cards: entrada em cascata + tilt */
var grid=$('.store-grid');
if(grid){var stag=function(){$$(':scope>*',grid).forEach(function(c,i){c.style.setProperty('--i',Math.min(i,12))})};
 new MutationObserver(stag).observe(grid,{childList:true});stag();
 if(fine&&!reduce){grid.addEventListener('pointermove',function(e){var c=e.target.closest('.store-grid>*');if(!c)return;var r=c.getBoundingClientRect();
  c.style.setProperty('--ry',((e.clientX-r.left)/r.width-.5)*6+'deg');c.style.setProperty('--rx',(.5-(e.clientY-r.top)/r.height)*6+'deg')});
  grid.addEventListener('pointerout',function(e){var c=e.target.closest('.store-grid>*');if(c){c.style.removeProperty('--rx');c.style.removeProperty('--ry')}})}}
/* ripple */
D.addEventListener('pointerdown',function(e){var b=e.target.closest('.btn,.cs-slider-ui button');if(!b||reduce)return;var r=b.getBoundingClientRect(),s=Math.max(r.width,r.height),k=D.createElement('span');
 k.className='cs-ripple';k.style.cssText='width:'+s+'px;height:'+s+'px;left:'+(e.clientX-r.left-s/2)+'px;top:'+(e.clientY-r.top-s/2)+'px';b.appendChild(k);setTimeout(function(){k.remove()},650)});
/* carrossel */
var sl=$('.cs-slider');if(!sl)return;
var slides=$$('.cs-slide',sl),n=slides.length,cur=0,ui=$('.cs-slider-ui',sl),dots=$('.cs-dots',sl),cnt=$('.cs-count',sl),pp=$('.cs-pp',sl),userPaused=false;
var ico={pause:'<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>',play:'<svg viewBox="0 0 24 24"><path d="M7 5l12 7-12 7z"/></svg>'};
slides.forEach(function(s,i){var b=D.createElement('button');b.type='button';b.className='cs-dot';b.setAttribute('aria-label','Ir para o slide '+(i+1));b.innerHTML='<i></i>';b.onclick=function(){go(i)};dots.appendChild(b)});
var dl=$$('.cs-dot',sl);
function go(i){cur=(i+n)%n;slides.forEach(function(s,k){s.classList.toggle('is-active',k===cur);s.setAttribute('aria-hidden',k===cur?'false':'true')});
 dl.forEach(function(d,k){d.classList.remove('is-active');if(k===cur){void d.offsetWidth;d.classList.add('is-active');d.setAttribute('aria-current','true')}else d.removeAttribute('aria-current')});
 cnt.innerHTML='<b>'+String(cur+1).padStart(2,'0')+'</b> / '+String(n).padStart(2,'0')}
sl.addEventListener('animationend',function(e){if(e.animationName==='cs-fill')go(cur+1)});
$('.cs-prev',sl).onclick=function(){go(cur-1)};$('.cs-next',sl).onclick=function(){go(cur+1)};
function setPause(){sl.classList.toggle('is-paused',!!(userPaused||sl._hov||sl._foc));pp.innerHTML=userPaused?ico.play:ico.pause;pp.setAttribute('aria-label',userPaused?'Retomar slides':'Pausar slides')}
pp.onclick=function(){userPaused=!userPaused;setPause()};
sl.addEventListener('mouseenter',function(){sl._hov=1;setPause()});sl.addEventListener('mouseleave',function(){sl._hov=0;setPause()});
sl.addEventListener('focusin',function(){sl._foc=1;setPause()});sl.addEventListener('focusout',function(){sl._foc=0;setPause()});
D.addEventListener('visibilitychange',function(){sl._hov=D.hidden;setPause()});
sl.addEventListener('keydown',function(e){if(e.key==='ArrowLeft')go(cur-1);if(e.key==='ArrowRight')go(cur+1)});
var x0=null;sl.addEventListener('pointerdown',function(e){if(!e.target.closest('a,button'))x0=e.clientX});
addEventListener('pointerup',function(e){if(x0===null)return;var d=e.clientX-x0;x0=null;if(Math.abs(d)>45)go(cur+(d<0?1:-1))});
if(reduce)sl.classList.add('no-auto');setPause();go(0);
})();
