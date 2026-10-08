// xl:title 数组的 length 描述符异形语义
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const a = [1, 2, 3];
run(() => { Object.defineProperty(a, "length", { value: 1 }); console.log(show(a.length) + "," + show(a[1])); });
