// xl:title 初始的洞与显式 undefined 的分别
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const a = [1, , 3]; const b = [1, undefined, 3];
console.log(show(1 in a) + "," + show(1 in b) + "," + show(a.hasOwnProperty(1)));
