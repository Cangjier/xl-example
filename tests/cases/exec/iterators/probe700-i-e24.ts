// xl:title (function () { for (const { a } of [{ a: 1 }, { a: 2 }]) { } return 'ok'; })()
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { for (const { a } of [{ a: 1 }, { a: 2 }]) { } return 'ok'; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
