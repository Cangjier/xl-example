// xl:title `preventExtensions` 之后 `length` 还可以改（只是不能加新的）
// xl:round 723
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.preventExtensions(a);
a.length = 1;
console.log(show(a.length) + "," + show(a.join(",")));
const b = [1, 2, 3];
Object.preventExtensions(b);
b.length = 5;
console.log(show(b.length) + "," + show(JSON.stringify(b)));
