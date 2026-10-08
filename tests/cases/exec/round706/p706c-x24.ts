// xl:title __lookupGetter__ 继承来的不给
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const p = { get g() { return 1; } }; const o = Object.create(p);
console.log(show(o.__lookupGetter__("g")));
