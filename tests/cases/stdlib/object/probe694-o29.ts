// xl:title (function () { return Object.fromEntries(new Map([["a", 1]])).a; })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { return Object.fromEntries(new Map([["a", 1]])).a; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
