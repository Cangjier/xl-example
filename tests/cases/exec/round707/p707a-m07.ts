// xl:title Map 的 delete 返回与链式
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const m = new Map([["a", 1]]);
console.log(show(m.delete("a")) + "," + show(m.delete("a")) + "," + show(m.size));
