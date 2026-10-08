// xl:title String.fromCharCode / fromCodePoint
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show(String.fromCharCode(65, 66)) + "," + show(String.fromCodePoint(128512).length) + "," + show(String.fromCodePoint(65)));
