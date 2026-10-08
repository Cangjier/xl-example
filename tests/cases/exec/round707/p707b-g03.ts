// xl:title 生成器的 throw 进 try
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

function* g() { try { yield 1; } catch (e) { console.log("caught:" + e); } }
const it = g(); it.next(); it.throw("X");
