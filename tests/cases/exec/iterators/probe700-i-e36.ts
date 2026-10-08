// xl:title (function () { const o = { [Symbol.iterator]() { let i = 0; return { next: () => ({ value: i++, done: i > 3 }) }; } }; return [...o].join(); })()
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { [Symbol.iterator]() { let i = 0; return { next: () => ({ value: i++, done: i > 3 }) }; } }; return [...o].join(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
