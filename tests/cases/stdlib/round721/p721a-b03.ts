// xl:title 下标上的访问器：展开与 for..of 该调 getter
// xl:round 721
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "1", { get() { return 99; }, enumerable: true, configurable: true });
console.log(show([...a].join(",")) + "|" + show(Array.from(a).join(",")));
