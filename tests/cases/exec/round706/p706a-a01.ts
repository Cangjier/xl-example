// xl:title 洞不进 JSON / join 给空串
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const a = [1, , 3];
console.log(show(JSON.stringify(a)) + " / " + show(a.join("-")) + " / " + show(a.length));
