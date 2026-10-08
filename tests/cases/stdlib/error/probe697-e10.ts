// xl:title (function () { const e = new Error("m", { cause: 42 }); return e.cause; })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const e = new Error("m", { cause: 42 }); return e.cause; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
