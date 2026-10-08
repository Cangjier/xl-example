// xl:title JSON.stringify 的 undefined / 函数 / 符号
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(JSON.stringify({ a: undefined, b: function () {}, c: Symbol("s"), d: 1 }));
console.log(JSON.stringify([undefined, function () {}]));
