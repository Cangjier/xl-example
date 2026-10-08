// xl:title (function () { const [x = 1, y = 2] = [undefined, 3]; return x + y; })()
// xl:round 698
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const [x = 1, y = 2] = [undefined, 3]; return x + y; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
