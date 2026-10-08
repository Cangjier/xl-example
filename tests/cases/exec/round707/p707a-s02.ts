// xl:title String 的 slice / substring 的负值
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show("abcdef".slice(-3)) + "," + show("abcdef".substring(-3)) + "," + show("abcdef".slice(1, -1)));
