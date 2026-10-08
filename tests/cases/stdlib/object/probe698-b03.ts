// xl:title (function () { const o = { [Symbol.toPrimitive]: (h) => h === "number" ? 7 : "s" }; return [o + 0, String(o)].join(","); })()
// xl:round 698
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { [Symbol.toPrimitive]: (h) => h === "number" ? 7 : "s" }; return [o + 0, String(o)].join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
