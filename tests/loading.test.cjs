const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const elements = new Map(), pending = [], frames = [], drawn = [];
const ctx = new Proxy({ drawImage(img) { assert(img?.ready, 'drawing before all images are ready'); drawn.push(img.src); } }, {get(obj, key) { return key in obj ? obj[key] : ()=>{}; }});
function element(key) { if(!elements.has(key))elements.set(key,{textContent:'',innerHTML:'',disabled:false,style:{},classList:{toggle(){}},addEventListener(){},setAttribute(){},getContext(){return ctx;}});return elements.get(key); }
const scope = {console,performance:{now:()=>0},requestAnimationFrame:fn=>frames.push(fn),Image:class {constructor(){this.width=1103;this.height=1426;pending.push(this)}},document:{querySelector:element,querySelectorAll:()=>[0,1,2,3].map(i=>element('lane'+i)),addEventListener(){}},location:{},CustomEvent:class {}};
scope.window=scope;scope.addEventListener=()=>{};scope.dispatchEvent=()=>{};
vm.createContext(scope);
for(const file of ['config.js','motion-data.js','engine.js','game.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),scope,{filename:file});
(async()=>{
 const background=pending.find(im=>im.src.includes('library-background'));
 background.ready=true;background.onload();
 frames.shift()(10);
 assert.equal(drawn.length,0,'partial image loading must not render');
 assert.equal(frames.length,1,'animation loop must survive partial loading');
 for(const image of pending.filter(im=>im!==background)){image.ready=true;image.onload()}
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(element('#primary').disabled,false);
 assert(drawn.some(src=>src.includes('librarian-idle')));
 frames.shift()(20);assert.equal(frames.length,1);
 console.log('PASS slow image loading does not stop the animation loop');
})().catch(error=>{console.error(error);process.exitCode=1});
