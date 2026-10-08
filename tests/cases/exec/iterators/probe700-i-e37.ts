// xl:title (function () { const o = { *[Symbol.iterator]() { yield 1; yield 2; } }; return [...o].join(); })()
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { *[Symbol.iterator]() { yield 1; yield 2; } }; return [...o].join(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
