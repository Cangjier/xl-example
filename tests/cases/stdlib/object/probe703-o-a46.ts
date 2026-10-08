// xl:title ({ ["__proto__"]: { z: 1 } }).z
// xl:round 703
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(({ ["__proto__"]: { z: 1 } }).z));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
