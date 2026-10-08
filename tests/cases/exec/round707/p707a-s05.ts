// xl:title String 的 replace 与 $&
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show("abc".replace("b", "[$&]")) + "," + show("abc".replace("b", "$" + String.fromCharCode(96))) + "," + show("abc".replace("b", "$'")));
