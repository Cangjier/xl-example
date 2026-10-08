// xl:title JSON.parse("[1,2]", (k, v) => (typeof v === "number" ? v * 2 : v))[0]
// xl:round 703
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(JSON.parse("[1,2]", (k, v) => (typeof v === "number" ? v * 2 : v))[0]));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
