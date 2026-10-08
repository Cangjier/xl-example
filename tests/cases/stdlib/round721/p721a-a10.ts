// xl:title length 不可写之后 push 该抛 TypeError
// xl:round 721
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2];
Object.defineProperty(a, "length", { writable: false });
run(() => { a.push(3); console.log("pushed:" + a.length); });
