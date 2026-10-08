// xl:title (function () { const ns = { C: class { constructor() { this.x = 2; } } }; return new ns.C().x; })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const ns = { C: class { constructor() { this.x = 2; } } }; return new ns.C().x; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
