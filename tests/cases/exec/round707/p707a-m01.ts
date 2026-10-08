// xl:title Map 的构造与插入序
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const m = new Map([["b", 2], ["a", 1]]);
console.log(show([...m.keys()].join("|")) + "," + show([...m.values()].join("|")) + "," + show(m.size));
