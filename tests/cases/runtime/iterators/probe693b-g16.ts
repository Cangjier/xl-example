// xl:title (function () { const o = { [Symbol.iterator]: function () { let i = 0; return { next: () => (i < 2 ? { value: i++, done: false } : { value: undefined, done: true }) }; } }; return [...o].join(","); })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { [Symbol.iterator]: function () { let i = 0; return { next: () => (i < 2 ? { value: i++, done: false } : { value: undefined, done: true }) }; } }; return [...o].join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
