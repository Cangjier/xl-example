// xl:title (function () { let a = 1; let b = 2; [a, b] = [b, a]; return a + "," + b; })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let a = 1; let b = 2; [a, b] = [b, a]; return a + "," + b; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
