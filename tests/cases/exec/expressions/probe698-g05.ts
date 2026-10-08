// xl:title (function () { const xs = [1]; return [0 in xs, 1 in xs, "length" in xs].join("|"); })()
// xl:round 698
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const xs = [1]; return [0 in xs, 1 in xs, "length" in xs].join("|"); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
