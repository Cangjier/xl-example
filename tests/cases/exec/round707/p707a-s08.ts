// xl:title String 的 codePointAt / charCodeAt
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show("A".charCodeAt(0)) + "," + show("A".codePointAt(0)) + "," + show(String.fromCodePoint(128512).codePointAt(0)));
