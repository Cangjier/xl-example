// xl:title (function* () { try { yield 1; } finally { yield 2; } })().next().value
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function* () { try { yield 1; } finally { yield 2; } })().next().value));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
