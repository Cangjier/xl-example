// xl:title `Object.freeze` 之后 `a.length = 5` 该静默、`push` 该抛
// xl:round 722
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2];
Object.freeze(a);
a.length = 5;
console.log(show(a.length) + "," + show(a.join(",")));
run(() => { a.push(3); console.log("pushed:" + a.length); });
console.log(show(Object.getOwnPropertyDescriptor(a, "length").writable));
