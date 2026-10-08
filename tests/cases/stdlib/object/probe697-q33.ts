// xl:title (function () { class A {} const a = new A(); Object.setPrototypeOf(a, null); return a instanceof A; })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A {} const a = new A(); Object.setPrototypeOf(a, null); return a instanceof A; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
