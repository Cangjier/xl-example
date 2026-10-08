// xl:title async 函数的返回值是一个承诺
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

async function f() { return 1; }
console.log(show(f() instanceof Promise) + "," + show(typeof f().then));
