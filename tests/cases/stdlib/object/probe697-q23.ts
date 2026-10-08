// xl:title (function () { const o = {}; o.__proto__ = { a: 1 }; return "a" in o; })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = {}; o.__proto__ = { a: 1 }; return "a" in o; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
