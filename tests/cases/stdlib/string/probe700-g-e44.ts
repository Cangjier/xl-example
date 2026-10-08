// xl:title "abc".endsWith("c", { valueOf: () => 3 })
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show("abc".endsWith("c", { valueOf: () => 3 })));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
