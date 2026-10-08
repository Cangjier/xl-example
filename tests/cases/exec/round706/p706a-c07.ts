// xl:title 计算键的静态成员
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

class A { static ["a" + "b"]() { return 1; } }
console.log(show(typeof A.ab) + "," + show(A.ab()));
