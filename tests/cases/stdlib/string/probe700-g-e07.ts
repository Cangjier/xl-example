// xl:title "abc".includes({ toString: () => "b" }, { valueOf: () => 1 })
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show("abc".includes({ toString: () => "b" }, { valueOf: () => 1 })));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
