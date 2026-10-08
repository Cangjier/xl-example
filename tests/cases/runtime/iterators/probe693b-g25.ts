// xl:title (function () { function* outer() { yield* inner(); } function* inner() { yield 3; } return [...outer()].join(","); })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function* outer() { yield* inner(); } function* inner() { yield 3; } return [...outer()].join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
