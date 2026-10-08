// xl:title (function () { function* g() { yield* [1, 2]; yield* "ab"; } return [...g()].join(","); })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function* g() { yield* [1, 2]; yield* "ab"; } return [...g()].join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
