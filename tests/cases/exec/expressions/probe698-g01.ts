// xl:title (function () { const xs = [1, 2, 3]; delete xs[1]; return [xs.length, xs[1], 1 in xs, Object.keys(xs).join(",")].join("|"); })()
// xl:round 698
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const xs = [1, 2, 3]; delete xs[1]; return [xs.length, xs[1], 1 in xs, Object.keys(xs).join(",")].join("|"); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
