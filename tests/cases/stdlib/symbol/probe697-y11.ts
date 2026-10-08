// xl:title Object.getOwnPropertySymbols({ [Symbol("a")]: 1 }).length
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.getOwnPropertySymbols({ [Symbol("a")]: 1 }).length));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
