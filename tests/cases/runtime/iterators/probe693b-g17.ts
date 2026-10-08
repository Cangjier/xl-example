// xl:title (function () { const o = { [Symbol.iterator]: function () { let i = 0; return { next: () => ({ value: i++, done: i > 2 }) }; } }; let s = ""; for (const v of o) s += v; return s; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { [Symbol.iterator]: function () { let i = 0; return { next: () => ({ value: i++, done: i > 2 }) }; } }; let s = ""; for (const v of o) s += v; return s; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
