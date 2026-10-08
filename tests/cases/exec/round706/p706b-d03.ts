// xl:title defineProperty 字符串数字键
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = {}; Object.defineProperty(o, "1", { value: "v", enumerable: true });
console.log(show(o[1]) + "," + show(Object.keys(o).join("|")));
