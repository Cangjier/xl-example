// xl:title "A".charCodeAt(0) < "a".charCodeAt(0)
// xl:round 695
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show("A".charCodeAt(0) < "a".charCodeAt(0)));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
