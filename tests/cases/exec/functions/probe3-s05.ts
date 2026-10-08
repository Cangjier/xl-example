// xl:title (function () { const fs = []; for (var i = 0; i < 3; i++) fs.push(() => i); return fs.map((f) => f()).join(","); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const fs = []; for (var i = 0; i < 3; i++) fs.push(() => i); return fs.map((f) => f()).join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
