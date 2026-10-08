// xl:title defineProperty 的 length：加长（空洞与 JSON）
// xl:round 721
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2];
Object.defineProperty(a, "length", { value: 4 });
console.log(show(a.length) + "," + show(a[3]) + "," + show(JSON.stringify(a)) + "," + show(Object.keys(a).join(",")));
