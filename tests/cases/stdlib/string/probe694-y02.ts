// xl:title "a-b_c".replace("-", "+").replace("_", "+")
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show("a-b_c".replace("-", "+").replace("_", "+")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
