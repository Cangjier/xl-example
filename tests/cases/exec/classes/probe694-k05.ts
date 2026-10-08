// xl:title (function () { class A { static x = 1; static get y() { return this.x + 1; } } return A.y; })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { static x = 1; static get y() { return this.x + 1; } } return A.y; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
