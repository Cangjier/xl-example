// xl:title 削短再加长：补回来的是洞
// xl:round 722
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "length", { value: 1 });
Object.defineProperty(a, "length", { value: 3 });
console.log(show(a.length) + "," + show(a[1]) + "," + show(JSON.stringify(a)) + "," + show(1 in a));
