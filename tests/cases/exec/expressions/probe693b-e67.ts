// xl:title (true ? 1 : 2) + (false ? 1 : 2)
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((true ? 1 : 2) + (false ? 1 : 2)));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
