// xl:title 交换与函数参数解构
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

let a = 1, b = 2;
[a, b] = [b, a];
const f = ({ x, y = 3 }) => x + y;
console.log(show(a) + "," + show(b) + "," + show(f({ x: 1 })));
