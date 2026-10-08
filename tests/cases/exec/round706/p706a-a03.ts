// xl:title keys 只给在的那些格
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const a = [1, , 3];
console.log(show(Object.keys(a).join("|")) + " / " + show(a.map((v) => String(v)).join("|")));
