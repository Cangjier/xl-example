// xl:title 形参默认值引用前面的形参
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

function f(a, b = a + 1) { return a + "," + b; }
console.log(show(f(1)) + "," + show(f(1, 5)));
