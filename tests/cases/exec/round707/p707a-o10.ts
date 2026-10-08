// xl:title Object.create(null) 两问
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = Object.create(null); o.a = 1;
console.log(show(Object.getPrototypeOf(o)) + "," + show(JSON.stringify(o)) + "," + show("toString" in o));
