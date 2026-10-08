// xl:title (function () { const o = { a: 1 }; Object.defineProperty(o, "a", { enumerable: false }); return Object.keys(o).length + "," + o.a; })()
// xl:round 695
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { a: 1 }; Object.defineProperty(o, "a", { enumerable: false }); return Object.keys(o).length + "," + o.a; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
