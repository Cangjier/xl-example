// xl:title 不是下标的那些键：length 不动
// xl:round 721
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "01", { value: 4 });
Object.defineProperty(a, "1.5", { value: 5 });
Object.defineProperty(a, "-1", { value: 6 });
Object.defineProperty(a, "4294967295", { value: 7 });
console.log(show(a.length) + "," + show(a["01"]) + "," + show(a["4294967295"]) + "," + show(Object.keys(a).length));
