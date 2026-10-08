// xl:title (function () { let r = "no"; Promise.reject(new Error("x")).catch((e) => { r = e.message; }); return r; })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let r = "no"; Promise.reject(new Error("x")).catch((e) => { r = e.message; }); return r; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
