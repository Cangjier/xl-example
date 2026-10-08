// xl:title [1, 2, 3].at(-1) + "," + [1, 2, 3].at(0)
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show([1, 2, 3].at(-1) + "," + [1, 2, 3].at(0)));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
