// xl:title 函数：`length` / `name` / `toString` 与默认值、剩余、解构形参
// xl:round 753
// xl:judge stdout
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('(function (a, b) {}).length', show(() => (function (a, b) {}).length));
console.log('(function (a, b = 1) {}).lengt', show(() => (function (a, b = 1) {}).length));
console.log('(function (a, ...r) {}).length', show(() => (function (a, ...r) {}).length));
console.log('(function ({ a }) {}).length', show(() => (function ({ a }) {}).length));
console.log('(function f() {}).name', show(() => (function f() {}).name));
console.log('((() => {})).name', show(() => ((() => {})).name));
console.log('((function () {})).name', show(() => ((function () {})).name));
console.log('(async function f() {}).name', show(() => (async function f() {}).name));
console.log('(function* g() {}).name', show(() => (function* g() {}).name));
console.log('Object.getOwnPropertyDescripto', show(() => Object.getOwnPropertyDescriptor(function (a) {}, "length")));
console.log('(function (a) {}).toString().s', show(() => (function (a) {}).toString().slice(0, 8)));
