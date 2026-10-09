// xl:title 解构（默认值 / 剩余 / 内建迭代器）与实参展开
// xl:round 700
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const [a, b = 2] = [1]; return a + b; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const [a, ...r] = [1, 2, 3]; return a + ':' + r.length; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const { a, ...r } = { a: 1, b: 2 }; return a + ':' + Object.keys(r).join(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function f(a, b, c) { return a + b + c; } return f(...[1, 2, 3]); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
function f(...xs) { return xs.length; }
console.log(show(f(...[1, 2, 3])) + "|" + show(f(...new Set([1, 2]))));
})();
