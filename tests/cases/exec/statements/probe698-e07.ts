// xl:title (function () { let n = 0; sw: switch (1) { case 1: n = 1; break sw; default: n = 9; } return n; })()
// xl:round 698
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let n = 0; sw: switch (1) { case 1: n = 1; break sw; default: n = 9; } return n; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
