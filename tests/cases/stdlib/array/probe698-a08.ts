// xl:title (function () { const xs = [1, 2, 3]; xs.sort((x, y) => x - y); return xs.join(","); })()
// xl:round 698
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const xs = [1, 2, 3]; xs.sort((x, y) => x - y); return xs.join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
