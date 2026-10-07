const assert=require('node:assert/strict');
const C=require('../config.js'), Game=require('../engine.js');
let n=0;function check(name,fn){fn();console.log('PASS',name);n++}
function clean(){let g=new Game(C,()=>0);g.start();g.nextSpawn=Infinity;return g}
function book(g,t,lane=0){g.books.push({lane,row:3,next:t,step:650,id:t})}
check('four discrete rows and fixed per-book tempo',()=>{let g=new Game(C,()=>0);g.start();g.advance(600);assert.equal(g.books[0].row,0);g.advance(1249);assert.equal(g.books[0].row,0);g.advance(1250);assert.equal(g.books[0].row,1);g.advance(1900);assert.equal(g.books[0].row,2);assert.equal(g.books[0].step,650)});
check('instant movement and capacity 0 through 5; overflow misses',()=>{let g=clean();g.move(0);assert.equal(g.lane,0);for(let i=1;i<=6;i++){book(g,i);g.advance(i);assert.equal(g.load,Math.min(i,5))}assert.equal(g.missed,1);assert.equal(g.score,0)});
check('shelve lane 4, lock, falling continues, only completion scores',()=>{let g=clean();g.load=3;assert(g.shelve());assert.equal(g.lane,3);g.move(0);assert.equal(g.lane,3);assert(!g.shelve());book(g,500,3);g.advance(999);assert.equal(g.score,0);assert.equal(g.missed,1);g.advance(1000);assert.equal(g.score,3);assert.equal(g.load,0);assert.equal(g.lane,3);assert(!g.shelve())});
check('deadline excludes unfinished and exactly-at-deadline shelving',()=>{let g=clean();g.time=29000;g.load=5;g.shelve();g.advance(30000);assert.equal(g.state,'lost');assert.equal(g.score,0)});
check('success immediate and full restart reset',()=>{let g=clean();g.score=14;g.load=1;g.shelve();g.advance(1500);assert.equal(g.state,'won');assert.equal(g.time,1000);g.start();assert.equal(g.score,0);assert.equal(g.load,0);assert.equal(g.shelving,null);assert.equal(g.books.length,0);assert.equal(g.time,0)});
check('frame-rate independent simulation',()=>{let a=new Game(C,()=>.5),b=new Game(C,()=>.5);a.start();b.start();a.move(2);b.move(2);a.advance(20000);for(let t=17;t<20000;t+=17)b.advance(t);b.advance(20000);assert.equal(JSON.stringify(a),JSON.stringify(b))});
check('smooth decreasing spawn and fall intervals',()=>{let g=new Game(C,()=>0);g.start();g.advance(0);let first=g.drops[0].step;g.advance(1200);assert(g.drops[0].step<first);assert(g.nextSpawn-1200<1200)});
check('floor limit and expiration',()=>{let g=clean();for(let i=1;i<=20;i++){book(g,i);g.advance(i)}assert.equal(g.floor.length,C.floorLimit);g.advance(3000);assert.equal(g.floor.length,0)});
console.log(n+' tests passed');


