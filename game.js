const $ = s => document.querySelector(s);
const canvas = $('#canvas'), ctx = canvas.getContext('2d');
const L = CONFIG.layout, game = new BookGame(CONFIG), images = {};
let phase='loading', last=0, countdown=0, pausedPhase='', completed=false;
const names=['library-background','empty-cart','pushing-cat','stack-red','stack-gold','stack-teal','librarian-trim','falling-book-red-trim','falling-book-teal-trim','floor-book-trim','cat-reshelve-5frames','librarian-drop-5frames'];
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
  $('#instructions').innerHTML=body;$('#primary').textContent=label;$('#primary').disabled=false;$('#status').textContent='';
}
async function load(){
  phase='loading';$('#primary').disabled=true;
  try { await Promise.all(names.map(name=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images[name]=im;resolve();};im.onerror=()=>reject(new Error(name));im.src='assets/'+name+'.png';})));
    phase='ready';$('#instructions').innerHTML='<p>카트를 움직여 책을 받아주세요.<br>카트에는 <b>'+CONFIG.capacity+'권</b>까지 담을 수 있어요.<br>오른쪽 <b>‘책 꽂기’</b>를 눌러<br><b>'+CONFIG.duration/1000+'초 안에 '+CONFIG.target+'권</b>을 정리하세요!</p><div class="tips">① ② ③ ④ 이동 · ▣ 책 꽂기<br><small>정리하는 '+CONFIG.shelveDuration/1000+'초 동안에는 책을 받을 수 없어요.</small></div>';$('#primary').textContent='시작하기';$('#primary').disabled=false;$('#status').textContent='터치 또는 키보드 1–4 · 스페이스로 책 꽂기';render();
  }catch(e){phase='error';show('그림을 불러오지 못했어요',`<p>assets 폴더가 index.html 옆에 있는지 확인해주세요.<br>불러오지 못한 그림: ${e.message}</p>`,'다시 불러오기');}
}
function start(){game.reset();completed=false;phase='countdown';countdown=3000;last=performance.now();$('#overlay').className='countdown';$('h1').textContent='3';render();}
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
 const won=phase==='won';
 show(won?'정리 완료!':'시간이 다 됐어요',`<p><b>${game.score} / ${CONFIG.target}권</b> 정리했어요.</p><p>${won?'고양이 사서가 한숨 돌렸어요.<br>다음 단서를 찾아볼까요?':'카트의 책은 꽂아야 점수가 돼요.<br>다시 한번 도전해보세요!'}</p>`,won&&CONFIG.nextPuzzleUrl?'다음 단서로':'다시 도전');
 if(won&&!completed){completed=true;const detail={score:game.score,elapsedMs:game.time};window.dispatchEvent(new CustomEvent('bookcatch:complete',{detail}));if(typeof window.onGameComplete==='function'){try{window.onGameComplete(detail);}catch(e){console.error('onGameComplete',e);}}}
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
 if(!images['library-background'])return;
 ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,L.width,L.height);draw('library-background',0,0,L.width,L.height);
 // Shelf bay centers are shared with touch targets, books, cart and numbered controls.
 const x=L.columns[game.lane];
 ctx.fillStyle='#ffe6a51d';ctx.fillRect(x-88,402,176,865);
 ctx.fillStyle='#ffe5a3';ctx.font='bold 24px system-ui';ctx.textAlign='center';
 L.columns.forEach((cx,i)=>{ctx.fillStyle=i===game.lane?'#fff1ae':'#ead7b690';ctx.fillText(String(i+1),cx,1260);});
 const d=game.drops[game.drops.length-1];
 if(d){const mirrored=d.lane<2;motion('librarian-drop',game.time-d.start,L.columns[d.lane]+(mirrored?218:-218),L.shelfTop,.78,mirrored,CONFIG.dropDuration);}
 else draw('librarian-trim',390,L.shelfTop-293,360,293);
 for(const b of game.books){const y=L.rows[b.row];ctx.fillStyle='#25172888';ctx.fillRect(L.columns[b.lane]-46,y-65,92,126);draw('falling-book-red-trim',L.columns[b.lane]-40,y-57,80,114);}
 for(const b of game.floor){ctx.globalAlpha=Math.min(1,(CONFIG.floorLifetime-(game.time-b.at))/400);draw('floor-book-trim',L.columns[b.lane]-64,L.floor-23,128,60);ctx.globalAlpha=1;}
 // Cart crop preserves the original handles, three empty shelves, and wheels.
 const cartW=225, cartH=200, cartTop=L.floor-cartH;
 draw('empty-cart',x-cartW/2,cartTop,cartW,cartH);
 for(let i=0;i<game.load;i++)draw(['stack-red','stack-gold','stack-teal'][i%3],x-56,cartTop+37-(i+1)*25,112,27);
 if(game.shelving){motion('cat-reshelve',game.time-game.shelving.start,x+164,L.floor,.34,false,CONFIG.shelveDuration);
  ctx.fillStyle='#362336';ctx.fillRect(x-100,L.floor+24,200,12);ctx.fillStyle='#ffdc78';ctx.fillRect(x-100,L.floor+24,200*Math.min(1,(game.time-game.shelving.start)/CONFIG.shelveDuration),12);
 }else draw('pushing-cat',x+96,L.floor-155,141,155);
 $('#time').innerHTML=Math.max(0,Math.ceil((CONFIG.duration-game.time)/1000))+'<small>초</small>';
 $('#score').innerHTML=game.score+'<small>/'+CONFIG.target+'</small>';
 $('#load').innerHTML=game.load+'<small>/'+CONFIG.capacity+'</small>';
 $('#timebar').style.width=Math.max(0,1-game.time/CONFIG.duration)*100+'%';
 laneButtons.forEach((b,i)=>{b.classList.toggle('selected',i===game.lane);b.disabled=phase!=='playing'||!!game.shelving;b.setAttribute('aria-pressed',String(i===game.lane));});
 $('#shelve').disabled=phase!=='playing'||!!game.shelving||!game.load;
 $('#pause').disabled=!['playing','countdown'].includes(phase);
 const notice=game.shelving?'서가에 정리하는 중…':game.load===CONFIG.capacity?'카트가 가득 찼어요! 책을 꽂아주세요.':'';
 if($('#notice').textContent!==notice)$('#notice').textContent=notice;
}
function frame(now){sync(now);render();requestAnimationFrame(frame);}load();requestAnimationFrame(frame);
