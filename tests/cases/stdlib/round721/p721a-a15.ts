// xl:title 访问器与 `in` / for..in / getOwnPropertyNames
// xl:round 721
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "1", { get() { return 99; }, enumerable: true, configurable: true });
let seen = "";
for (const k in a) seen += k;
console.log(show("1" in a) + "," + show(seen) + "," + show(Object.getOwnPropertyNames(a).join(",")));
