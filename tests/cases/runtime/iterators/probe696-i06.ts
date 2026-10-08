// xl:title (function () { const o = { [Symbol.iterator]: function* () { yield 5; } }; return [...o].join(","); })()
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { [Symbol.iterator]: function* () { yield 5; } }; return [...o].join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
