// xl:title 冻结之后 `Object.keys` / `JSON` / 迭代都不变
// xl:round 723
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.freeze(a);
console.log(show(Object.keys(a).join(",")) + "," + show(JSON.stringify(a)) + "," + show([...a].join(",")) + "," + show(a.map((x) => x).join(",")));
