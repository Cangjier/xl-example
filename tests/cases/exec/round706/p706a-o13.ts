// xl:title defineProperty 造出的属性默认三个标志全假
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = {}; Object.defineProperty(o, "a", { value: 1 });
console.log(show(JSON.stringify(o)) + "," + show(Object.keys(o).length));
