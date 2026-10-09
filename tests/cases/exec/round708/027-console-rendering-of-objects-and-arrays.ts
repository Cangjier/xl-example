// xl:title console.log 的对象与数组形状、多实参分隔
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log({ a: 1, b: [1, 2], c: { d: 3 } });

(() => {
console.log({}, [], { a: {} });
})();

(() => {
console.log("a", 1, null, undefined, [1]);
})();
