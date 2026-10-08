// xl:title JSON.stringify({ a: 1, b: 2 }, (k, v) => (k === "b" ? undefined : v))
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(JSON.stringify({ a: 1, b: 2 }, (k, v) => (k === "b" ? undefined : v))));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
