// xl:title JSON.stringify(NaN) + "," + JSON.stringify(Infinity)
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(JSON.stringify(NaN) + "," + JSON.stringify(Infinity)));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
