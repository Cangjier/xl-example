// xl:title (function () { const o = { [Symbol.toPrimitive]: () => 2 }; return o + 3; })()
// xl:round 698
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { [Symbol.toPrimitive]: () => 2 }; return o + 3; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
