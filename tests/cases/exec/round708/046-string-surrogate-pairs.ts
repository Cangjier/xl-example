// xl:title 字符串的代理对与长度
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const s = "\u{1F600}";
console.log(show(s.length) + "," + show([...s].length) + "," + show(s.codePointAt(0)));
