// xl:title Object.values / entries 同序
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = { 2: "b", 1: "a", x: "c" };
console.log(show(Object.values(o).join("|")) + " / " + show(JSON.stringify(Object.entries(o))));
