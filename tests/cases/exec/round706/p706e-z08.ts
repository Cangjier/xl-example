// xl:title 两次 defineProperty 不同下标
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const a = [];
Object.defineProperty(a, 0, { value: 5 });
Object.defineProperty(a, 1, { value: 6 });
console.log(show(Object.keys(a).join("|")) + " / " + show(JSON.stringify(a)));
