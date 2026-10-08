// xl:title (function () { const o = {}; Object.defineProperty(o, "x", { value: 1, enumerable: true }); return Object.keys(o).join(",") + "|" + Object.getOwnPropertyDescriptor(o, "x").writable; })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = {}; Object.defineProperty(o, "x", { value: 1, enumerable: true }); return Object.keys(o).join(",") + "|" + Object.getOwnPropertyDescriptor(o, "x").writable; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
