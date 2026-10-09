// xl:title JSON.stringify 的值形状：undefined / 函数 / 符号 / 洞 / 不可枚举
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(JSON.stringify({ a: undefined, b: function () {}, c: Symbol("s"), d: 1 }));
console.log(JSON.stringify([undefined, function () {}]));

(() => {
console.log(JSON.stringify(1), JSON.stringify("a"), JSON.stringify(null), JSON.stringify(true));
console.log(show(JSON.stringify(undefined)) + "," + show(JSON.stringify(function () {})));
})();

(() => {
const a = [1, , 3];
console.log(JSON.stringify(a));
const o = {}; Object.defineProperty(o, "h", { value: 1, enumerable: false }); o.v = 2;
console.log(JSON.stringify(o));
})();
