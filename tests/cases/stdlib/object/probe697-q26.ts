// xl:title (function () { const o = {}; o.__proto__ = { a: 1 }; delete o.__proto__; return Object.getPrototypeOf(o) === Object.prototype; })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = {}; o.__proto__ = { a: 1 }; delete o.__proto__; return Object.getPrototypeOf(o) === Object.prototype; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
