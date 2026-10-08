// xl:title (function () { const o = { a: 1 }; o.__proto__ = { b: 2 }; return o.b; })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { a: 1 }; o.__proto__ = { b: 2 }; return o.b; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
