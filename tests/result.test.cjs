const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const elements=new Map(),pending=[],events=[];
const ctx=new Proxy({drawImage(im){assert(im?.ready)}},{get(o,k){return k in o?o[k]:()=>{}}});
function node(id){if(!elements.has(id)){const e={className:'',hidden:true,style:{},addEventListener(){},setAttribute(){},getContext(){return ctx}};e.classList={add(...tokens){e.className=[...new Set([...e.className.split(' ').filter(Boolean),...tokens])].join(' ')},toggle(){}};elements.set(id,e)}return elements.get(id)}
const scope={console,performance:{now:()=>0},requestAnimationFrame(){},Image:class{constructor(){this.width=1024;this.height=1536;pending.push(this)}},document:{querySelector:node,querySelectorAll:()=>[0,1,2,3].map(i=>node('lane'+i)),addEventListener(){}},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}},location:{}};scope.window=scope;scope.dispatchEvent=e=>events.push(e);vm.createContext(scope);
for(const file of ['config.js','motion-data.js','engine.js','game.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),scope,{filename:file});
(async()=>{
 for(const image of pending){image.ready=true;image.onload()}
 await new Promise(resolve=>setImmediate(resolve));
 function result(score,state){vm.runInContext(`start();game.start();game.serial=30;game.score=${score};game.caught=${score};game.missed=${30-score};game.state='${state}';finish();`,scope)}
 result(19,'lost');assert.equal(node('#result-visual').hidden,false);assert(node('#result-image').src.endsWith('clear-failure.webp'));assert(node('#overlay').className.includes('lost-result'));assert(!node('#overlay').className.includes('won-result'));assert.equal(node('#perfect-image').hidden,true);assert.equal(events.length,0);
 console.log('PASS failure art shown without success sparkle class');
 result(20,'won');assert(node('#result-image').src.endsWith('clear-success.webp'));assert(node('#overlay').className.includes('won-result'));assert.equal(node('#perfect-image').hidden,true);assert.equal(events.at(-1).detail.perfect,false);
 console.log('PASS standard clear shows success art and sparkle class');
 result(30,'won');assert(node('#result-image').src.endsWith('clear-success.webp'));assert(node('#overlay').className.includes('perfect-result'));assert.equal(node('#perfect-image').hidden,false);assert(node('#perfect-image').src.endsWith('perfect-clear.webp'));assert.equal(events.at(-1).detail.perfect,true);
 console.log('PASS perfect clear retains the badge with success art');
 vm.runInContext('start()',scope);assert.equal(node('#result-visual').hidden,true);assert.equal(node('#perfect-image').hidden,true);assert(!node('#overlay').className.includes('won-result'));
 console.log('PASS restart hides result art and stops sparkle display');
})().catch(error=>{console.error(error);process.exitCode=1});
