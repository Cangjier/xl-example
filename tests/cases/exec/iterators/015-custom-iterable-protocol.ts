// xl:title 自定义可迭代物：`Symbol.iterator` 的两种写法
// xl:round 700
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { [Symbol.iterator]() { let i = 0; return { next: () => ({ value: i++, done: i > 3 }) }; } }; return [...o].join(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { *[Symbol.iterator]() { yield 1; yield 2; } }; return [...o].join(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();
