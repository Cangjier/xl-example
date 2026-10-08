// xl:title 生成器跑完之后的 next
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

function* g() { yield 1; }
const it = g(); it.next();
console.log(show(JSON.stringify(it.next())));
