// xl:title (function () { let n = 0; for (const v of { [Symbol.iterator]: function* () { yield 1; yield 2; } }) n += v; return n; })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let n = 0; for (const v of { [Symbol.iterator]: function* () { yield 1; yield 2; } }) n += v; return n; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
