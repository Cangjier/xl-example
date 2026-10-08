// xl:title "aBc".toLowerCase() + "aBc".toUpperCase()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show("aBc".toLowerCase() + "aBc".toUpperCase()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
