// xl:title new Map([[1, "a"], [2, "b"]]).get("1") === undefined
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(new Map([[1, "a"], [2, "b"]]).get("1") === undefined));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
