// xl:title (function () { let n = 0; for (let i = 0; i < 3; i++) n += i; return n; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let n = 0; for (let i = 0; i < 3; i++) n += i; return n; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
