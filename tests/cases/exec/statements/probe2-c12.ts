// xl:title (function () { let out = []; for (let i = 0, j = 3; i < j; i++, j--) out.push(i + "" + j); return out.join(","); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let out = []; for (let i = 0, j = 3; i < j; i++, j--) out.push(i + "" + j); return out.join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
