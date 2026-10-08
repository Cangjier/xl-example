// xl:title (function () { const arr = []; arr.push(typeof f); function f() {} return arr.join(","); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const arr = []; arr.push(typeof f); function f() {} return arr.join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
