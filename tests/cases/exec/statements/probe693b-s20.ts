// xl:title (function () { let s = ""; a: b: for (let i = 0; i < 2; i++) { s += i; break a; } return s; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let s = ""; a: b: for (let i = 0; i < 2; i++) { s += i; break a; } return s; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
