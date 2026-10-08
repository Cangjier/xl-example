// xl:title 定义在 length 上的名字（不是下标）
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const a = [];
Object.defineProperty(a, "0", { value: 5, enumerable: false });
console.log(show(Object.keys(a).join("|")) + " / " + show(JSON.stringify(a)));
