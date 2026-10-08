// xl:title (function () { let x = 1; { let x = 2; x = 3; } return x; })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let x = 1; { let x = 2; x = 3; } return x; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
