// xl:title (function () { function* g() { yield [1, 2]; } const [a, b] = g().next().value; return a + b; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function* g() { yield [1, 2]; } const [a, b] = g().next().value; return a + b; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
