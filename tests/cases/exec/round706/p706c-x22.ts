// xl:title __defineSetter__ 与读回
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = {}; o.__defineSetter__("x", function (v) { this.y = v; }); o.x = 5;
console.log(show(o.y) + "," + show(Object.keys(o).join("|")));
