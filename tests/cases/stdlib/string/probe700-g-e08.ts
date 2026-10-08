// xl:title "abc".indexOf("b", { valueOf: () => 2 })
// xl:round 702
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show("abc".indexOf("b", { valueOf: () => 2 })));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
