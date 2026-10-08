// xl:title `seal` 之后 `push` 与 `a.length = 5` 的差别（可写那一格还在）
// xl:round 723
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2];
Object.seal(a);
a.length = 4;
console.log(show(a.length) + "," + show(JSON.stringify(a)));
run(() => { a.push(9); console.log("pushed:" + a.length); });
