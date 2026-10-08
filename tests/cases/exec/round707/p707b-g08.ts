// xl:title 数组、字符串、Map、Set 的迭代器
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show([...new Map([["a", 1]])].map((p) => p.join(":")).join("|")));
console.log(show([..."ab"].join("|")) + "," + show([...new Set([1, 2])].join("|")));
