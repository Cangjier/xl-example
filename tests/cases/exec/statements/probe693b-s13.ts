// xl:title (function () { switch (2) { default: return "d"; case 2: return "two"; } })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { switch (2) { default: return "d"; case 2: return "two"; } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
