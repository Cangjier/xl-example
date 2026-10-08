// xl:title async 生成器的形状
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

async function* g() { yield 1; }
const it = g();
console.log(show(typeof it.next) + "," + show(typeof it[Symbol.asyncIterator]));
