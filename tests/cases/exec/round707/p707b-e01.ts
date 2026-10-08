// xl:title Error 家族的 name 与 instanceof
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const es = [new TypeError("t"), new RangeError("r"), new SyntaxError("s")];
console.log(show(es.map((e) => e.name).join("|")) + "," + show(es[0] instanceof Error));
