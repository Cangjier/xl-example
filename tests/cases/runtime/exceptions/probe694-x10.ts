// xl:title (function () { class E extends Error { constructor(m) { super(m); this.name = "E"; } } return new E("x").name; })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class E extends Error { constructor(m) { super(m); this.name = "E"; } } return new E("x").name; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
