// xl:title delete 继承来的键给真
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const p = { a: 1 }; const o = Object.create(p); delete o.a;
console.log(show(o.a) + "," + show("a" in o));
