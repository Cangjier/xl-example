// xl:title 削短之后 push 还能写（那一格仍然可写）
// xl:round 722
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "length", { value: 1 });
a.push(9);
console.log(show(a.length) + "," + show(a.join(",")) + "," + show(a[1]));
