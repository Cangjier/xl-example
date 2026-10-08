// xl:title String 的 padStart / padEnd
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show("5".padStart(3, "0")) + "," + show("5".padEnd(3, "0")) + "," + show("abc".padStart(2, "0")));
