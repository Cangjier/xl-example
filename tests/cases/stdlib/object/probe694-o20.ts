// xl:title (function () { const a = [1, 2]; return Object.getOwnPropertyDescriptor(a, "length").writable; })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const a = [1, 2]; return Object.getOwnPropertyDescriptor(a, "length").writable; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
