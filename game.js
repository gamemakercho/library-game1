const $ = s => document.querySelector(s);
const canvas = $('#canvas'), ctx = canvas.getContext('2d');
const L = CONFIG.layout, game = new BookGame(CONFIG), images = {};
let phase='loading', last=0, countdown=0, pausedPhase='', completed=false, assetsReady=false;
const names=['library-background','empty-cart','pushing-cat','stack-red','stack-gold','stack-teal','librarian-idle','falling-book-red-trim','falling-book-teal-trim','floor-book-trim','cat-reshelve-5frames','librarian-drop-5frames','perfect-clear'];
const laneButtons=[...document.querySelectorAll('[data-lane]')];
laneButtons.forEach((b,i)=>{b.style.left=(L.columns[i]/L.width*100)+'%';b.addEventListener('pointerdown',e=>{e.preventDefault();sync();if(phase==='playing')game.move(i);render();});});
$('#shelve').addEventListener('pointerdown',e=>{e.preventDefault();sync();if(phase==='playing')game.shelve();render();});
canvas.addEventListener('pointerdown',e=>{e.preventDefault();sync();if(phase!=='playing')return;const x=(e.clientX-canvas.getBoundingClientRect().left)/canvas.getBoundingClientRect().width*L.width;if(x>855)return;let lane=L.columns.reduce((a,v,i)=>Math.abs(v-x)<Math.abs(L.columns[a]-x)?i:a,0);game.move(lane);render();});
document.addEventListener('keydown',e=>{if(e.repeat)return;if(['1','2','3','4',' ','Escape'].includes(e.key)){e.preventDefault();sync();if(e.key==='Escape')pause();else if(phase==='playing'){if(e.key===' ')game.shelve();else game.move(Number(e.key)-1);}render();}});
$('#primary').addEventListener('click',()=>{if(phase==='error')load();else if(phase==='paused')resume();else if(phase==='won' && CONFIG.nextPuzzleUrl)location.href=CONFIG.nextPuzzleUrl;else start();});
$('#pause').addEventListener('click',pause);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
function show(title,body,label,story='') {
  $('#overlay').className='';$('h1').textContent=title;$('#story').innerHTML=story;
  $('#perfect-image').hidden=true;
  $('#instructions').innerHTML=body;$('#primary').textContent=label;$('#primary').disabled=false;$('#status').textContent='';
}
async function load(){
  phase='loading';assetsReady=false;$('#primary').disabled=true;
  try { await Promise.all(names.map(name=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images[name]=im;resolve();};im.onerror=()=>reject(new Error(name));im.src='assets/'+name+'.png';})));
    assetsReady=true;phase='ready';$('#instructions').innerHTML='<p>카트를 움직여 책을 받아주세요.<br>카트에는 <b>'+CONFIG.capacity+'권</b>까지 담을 수 있어요.<br>오른쪽 <b>‘책 꽂기’</b>로 한 권씩 빠르게 정리하세요!<br><b>'+CONFIG.duration/1000+'초 동안 최대한 많이</b> · 목표 '+CONFIG.target+'권</p><div class="tips">① ② ③ ④ 이동 · ▣ 책 꽂기<br><small>한 권당 '+CONFIG.shelvePerBook/1000+'초!<br>마지막 책을 받은 뒤 '+CONFIG.cleanupGrace/1000+'초의 정리 시간이 있어요.</small></div>';$('#primary').textContent='시작하기';$('#primary').disabled=false;$('#status').textContent='터치 또는 키보드 1–4 · 스페이스로 책 꽂기';render();
  }catch(e){phase='error';show('그림을 불러오지 못했어요',`<p>assets 폴더가 index.html 옆에 있는지 확인해주세요.<br>불러오지 못한 그림: ${e.message}</p>`,'다시 불러오기');}
}
function start(){game.reset();completed=false;phase='countdown';countdown=3000;last=performance.now();$('#perfect-image').hidden=true;$('#overlay').className='countdown';$('h1').textContent='3';render();}
function sync(now=performance.now()){
  const dt=Math.max(0,now-last);last=now;
  if(phase==='countdown'){
    countdown-=dt;$('h1').textContent=Math.max(1,Math.ceil(countdown/1000));
    if(countdown<=0){phase='playing';$('#overlay').className='hidden';game.start();game.advance(-countdown);}
  }else if(phase==='playing')game.advance(game.time+dt);
  if(phase==='playing' && game.state!=='playing')finish();
}
function pause(){if(!['playing','countdown'].includes(phase))return;sync();if(!['playing','countdown'].includes(phase))return;pausedPhase=phase;phase='paused';show('잠시 쉬는 중', '<p>시간과 책의 움직임을 멈췄어요.<br>준비가 되면 이어서 플레이하세요.</p>','계속하기');}
function resume(){phase=pausedPhase;last=performance.now();$('#overlay').className=phase==='countdown'?'countdown':'hidden';render();}
function finish(){
 phase=game.state;
 const won=phase==='won', perfect=game.isPerfect;
 const title=perfect?'완벽하게 정리완료!':won?'정리 완료!':'시간이 다 됐어요';
 const message=perfect?'총 '+game.serial+'권, 한 권도 놓치지 않았어요!':won?'목표 '+CONFIG.target+'권 달성!<br>고양이 사서가 한숨 돌렸어요.':'목표는 '+CONFIG.target+'권이에요.<br>다시 한번 도전해보세요!';
 show(title,`<p><b>${game.score}점</b> · ${game.score}권 정리</p><p>${message}</p>`,won&&CONFIG.nextPuzzleUrl?'다음 단서로':'다시 도전');
 if(perfect){$('#overlay').classList.add('perfect-result');$('#perfect-image').src=images['perfect-clear'].src;$('#perfect-image').hidden=false;}
 if(won&&!completed){completed=true;const detail={score:game.score,elapsedMs:game.time,perfect,totalBooks:game.serial,missed:game.missed};window.dispatchEvent(new CustomEvent('bookcatch:complete',{detail}));if(typeof window.onGameComplete==='function'){try{window.onGameComplete(detail);}catch(e){console.error('onGameComplete',e);}}}
}
function draw(name,x,y,w,h){const im=images[name];if(im)ctx.drawImage(im,Math.round(x),Math.round(y),Math.round(w),Math.round(h??w*im.height/im.width));}
// Use JSON rect + frame canvas placement, with a fixed source anchor.
function motion(name,elapsed,x,y,scale,mirror=false,duration){
 const data=MOTION[name], total=data.frames.reduce((s,f)=>s+f.duration_ms,0);
 let t=Math.min(total-.001,elapsed*(total/(duration||total))),f=data.frames[0];
 for(const candidate of data.frames){f=candidate;if(t<f.duration_ms)break;t-=f.duration_ms;}
 const r=f.rect, a=f.anchor_in_rect,o=f.offset_in_canvas, fc=data.frame_canvas;
 // offset + anchor equals anchor_in_canvas; retain frame_canvas as the common coordinate space.
 const originX=-(o.x+a.x)/fc.w*fc.w, originY=-(o.y+a.y)/fc.h*fc.h;
 ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(mirror?-scale:scale,scale);
 ctx.drawImage(images[name+'-5frames'],r.x,r.y,r.w,r.h,originX+o.x,originY+o.y,r.w,r.h);ctx.restore();
}
function render(){
 if(!assetsReady)return;
 ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,L.width,L.height);draw('library-background',0,0,L.width,L.height);
 // Shelf bay centers are shared with touch targets, books, cart and numbered controls.
 const x=L.columns[game.lane];
 ctx.fillStyle='#ffe6a51d';ctx.fillRect(x-88,402,176,865);
 ctx.fillStyle='#ffe5a3';ctx.font='bold 24px system-ui';ctx.textAlign='center';
 L.columns.forEach((cx,i)=>{ctx.fillStyle=i===game.lane?'#fff1ae':'#ead7b690';ctx.fillText(String(i+1),cx,1260);});
 const d=game.lastDrop, librarianLane=d?.lane ?? 2, mirrored=librarianLane<2;
 const librarianX=L.columns[librarianLane]+(mirrored?L.librarianDropOffset:-L.librarianDropOffset);
 if(d && game.time-d.start<CONFIG.dropDuration){
   motion('librarian-drop',game.time-d.start,librarianX,L.shelfTop,L.librarianScale,mirrored,CONFIG.dropDuration);
 }else{
   // Same recover frame, scale and contact anchor as the drop animation; only the released book is removed.
   const idleFrame=MOTION['librarian-drop'].frames.at(-1), a=idleFrame.anchor_in_rect;
   ctx.save();ctx.translate(Math.round(librarianX),L.shelfTop);ctx.scale(mirrored?-L.librarianScale:L.librarianScale,L.librarianScale);
   ctx.drawImage(images['librarian-idle'],-a.x,-a.y);ctx.restore();
 }
 for(const b of game.books){const y=L.rows[b.row];draw('falling-book-red-trim',L.columns[b.lane]-40,y-57,80,114);}
 for(const b of game.floor){ctx.globalAlpha=Math.min(1,(CONFIG.floorLifetime-(game.time-b.at))/400);draw('floor-book-trim',L.columns[b.lane]-64,L.floor-23,128,60);ctx.globalAlpha=1;}
 // Cart crop preserves the original handles, three empty shelves, and wheels.
 const cartW=225, cartH=200, cartTop=L.floor-cartH;
 draw('empty-cart',x-cartW/2,cartTop,cartW,cartH);
 for(let i=0;i<game.load;i++)draw(['stack-red','stack-gold','stack-teal'][i%3],x-56,cartTop+37-(i+1)*25,112,27);
 if(game.shelving){
  const elapsed=game.time-game.shelving.start;
  motion('cat-reshelve',elapsed % CONFIG.shelvePerBook,x+164,L.floor,.34,false,CONFIG.shelvePerBook);
  ctx.fillStyle='#362336';ctx.fillRect(x-100,L.floor+24,200,12);ctx.fillStyle='#ffdc78';ctx.fillRect(x-100,L.floor+24,200*Math.min(1,elapsed/(game.shelving.end-game.shelving.start)),12);
 }else draw('pushing-cat',x+96,L.floor-155,141,155);
 const cleanup=game.lastLandingAt>0 && game.nextSpawn===Infinity && !game.books.length && !game.drops.length && game.time>=game.lastLandingAt;
 const extended=game.time>=CONFIG.duration;
 const timerEnd=cleanup||extended ? game.finishAt : CONFIG.duration;
 const remaining=Math.max(0,Math.ceil((timerEnd-game.time)/1000));
 $('#time-label').textContent=cleanup?'⌛ 정리 시간':extended?'⌛ 마무리':'⌛ 남은 시간';
 $('#time').innerHTML=remaining+'<small>초</small>';
 $('#score').innerHTML=game.score+'<small>점</small>';
 $('#load').innerHTML=game.load+'<small>/'+CONFIG.capacity+'</small>';
 $('#timebar').style.width=(cleanup ? Math.min(1,Math.max(0,(game.finishAt-game.time)/CONFIG.cleanupGrace)) : Math.max(0,1-game.time/CONFIG.duration))*100+'%';
 laneButtons.forEach((b,i)=>{b.classList.toggle('selected',i===game.lane);b.disabled=phase!=='playing'||!!game.shelving;b.setAttribute('aria-pressed',String(i===game.lane));});
 $('#shelve').disabled=phase!=='playing'||!!game.shelving||!game.load;
 $('#pause').disabled=!['playing','countdown'].includes(phase);
 const notice=game.shelving?'서가에 정리하는 중…':cleanup&&phase==='playing'?'마지막 책을 정리하세요! '+remaining+'초 남았어요.':game.time>=CONFIG.spawnUntil&&phase==='playing'?'새 책은 끝! 마지막 책을 받아 정리하세요.':game.load===CONFIG.capacity?'카트가 가득 찼어요! 책을 꽂아주세요.':'';
 if($('#notice').textContent!==notice)$('#notice').textContent=notice;
}
function frame(now){sync(now);render();requestAnimationFrame(frame);}load();requestAnimationFrame(frame);
