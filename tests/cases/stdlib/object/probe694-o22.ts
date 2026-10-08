// xl:title 数组下标的 hasOwnProperty
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const a = [1, 2]; return a.hasOwnProperty(0) + "," + a.hasOwnProperty(2); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
