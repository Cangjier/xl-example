// xl:title 数组解构的洞与剩余
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const [a, , c, ...rest] = [1, 2, 3, 4, 5];
console.log(show(a) + "," + show(c) + "," + show(rest.join("|")));
