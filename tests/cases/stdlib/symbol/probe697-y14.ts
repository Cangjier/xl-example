// xl:title [...Object.getOwnPropertySymbols({ [Symbol.for("a")]: 1 })].map(String).join(",")
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show([...Object.getOwnPropertySymbols({ [Symbol.for("a")]: 1 })].map(String).join(",")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
