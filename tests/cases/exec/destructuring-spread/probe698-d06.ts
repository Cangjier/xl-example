// xl:title (function () { const [a, ...rest] = [1, 2, 3]; return [a, rest.join(",")].join("|"); })()
// xl:round 698
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const [a, ...rest] = [1, 2, 3]; return [a, rest.join(",")].join("|"); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
