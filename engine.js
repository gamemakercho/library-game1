/* Pure time-based simulation, shared by the browser and deterministic tests. */
(function(root) {
class BookGame {
  constructor(config, random = Math.random) { this.c = config; this.random = random; this.reset(); }
  reset() { Object.assign(this, { time: 0, score: 0, load: 0, lane: 3, books: [], floor: [],
    drops: [], lastDrop: null, shelving: null, nextSpawn: 0, state: 'ready', missed: 0, caught: 0, serial: 0 }); }
  start() { this.reset(); this.state = 'playing'; }
  move(lane) { if (this.state === 'playing' && !this.shelving && lane >= 0 && lane < 4) this.lane = lane; }
  shelve() {
    if (this.state !== 'playing' || this.shelving || !this.load) return false;
    this.lane = 3;
    this.shelving = { start: this.time, end: this.time + this.c.shelvePerBook * this.load,
      next: this.time + this.c.shelvePerBook, count: this.load, completed: 0 };
    return true;
  }
  advance(to) {
    if (this.state !== 'playing') return;
    to = Math.min(to, this.c.duration);
    while (this.state === 'playing') {
      const next = Math.min(this.nextSpawn, this.shelving?.next ?? Infinity,
        ...this.drops.map(x => x.release), ...this.books.map(x => x.next), this.c.duration);
      if (next > to) break;
      this.time = next;
      // The deadline wins ties: an unfinished shelving operation never scores.
      if (next >= this.c.duration) { this.state = this.score >= this.c.target ? 'won' : 'lost'; break; }
      if (this.shelving && this.shelving.next === next) {
        this.score++; this.load--; this.shelving.completed++;
        if (this.shelving.completed === this.shelving.count) this.shelving = null;
        else this.shelving.next += this.c.shelvePerBook;
      }
      if (this.nextSpawn === next) {
        const p = Math.min(1, next / this.c.duration);
        this.lastDrop = { id: ++this.serial, lane: Math.floor(this.random()*4), start: next,
          release: next + this.c.dropDuration, step: this.c.fallStart + (this.c.fallEnd-this.c.fallStart)*p };
        this.drops.push(this.lastDrop);
        this.nextSpawn = next + this.c.spawnStart + (this.c.spawnEnd-this.c.spawnStart)*p;
      }
      for (const d of this.drops.filter(d=>d.release === next)) this.books.push({ ...d, row: 0, next: next+d.step });
      this.drops = this.drops.filter(d=>d.release > next);
      for (const b of this.books.filter(b=>b.next === next)) {
        b.row++; b.next += b.step;
        if (b.row === 4) {
          if (!this.shelving && this.lane === b.lane && this.load < this.c.capacity) { this.load++; this.caught++; }
          else { this.missed++; this.floor.push({ lane:b.lane, at:next, id:b.id }); this.floor=this.floor.slice(-this.c.floorLimit); }
        }
      }
      this.books=this.books.filter(b=>b.row<4);
    }
    if (this.state === 'playing') this.time = to;
    this.floor=this.floor.filter(b=>this.time-b.at<this.c.floorLifetime);
  }
}
if (typeof module !== 'undefined') module.exports=BookGame; else root.BookGame=BookGame;
})(globalThis);
