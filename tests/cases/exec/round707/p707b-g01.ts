// xl:title 生成器的 return 与 finally
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

function* g() { try { yield 1; yield 2; } finally { console.log("fin"); } }
const it = g();
console.log(show(it.next().value));
console.log(show(it.return(9).value) + "," + show(it.return(9).done));
