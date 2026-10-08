// xl:title "abc".lastIndexOf("b", { valueOf: () => 0 })
// xl:round 702
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show("abc".lastIndexOf("b", { valueOf: () => 0 })));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
