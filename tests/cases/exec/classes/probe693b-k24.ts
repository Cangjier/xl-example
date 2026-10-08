// xl:title (function () { class A { } const a = new A(); a.x = 1; return a.x + "," + Object.keys(a).join(","); })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { } const a = new A(); a.x = 1; return a.x + "," + Object.keys(a).join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
