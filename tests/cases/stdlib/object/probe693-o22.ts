// xl:title (function () { const o = {}; Object.preventExtensions(o); return Object.isExtensible(o); })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = {}; Object.preventExtensions(o); return Object.isExtensible(o); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
