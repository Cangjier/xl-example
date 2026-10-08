// xl:title (function* () { const r = yield* [1, 2]; return r; })().next().value
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function* () { const r = yield* [1, 2]; return r; })().next().value));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
