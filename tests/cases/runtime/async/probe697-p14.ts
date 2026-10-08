// xl:title Promise.resolve(Promise.resolve(2)).constructor.name
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Promise.resolve(Promise.resolve(2)).constructor.name));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
