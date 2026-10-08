// xl:title 下标上的属性与数组方法的空洞语义（concat / slice）
// xl:round 721
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
delete a[1];
console.log(show(a.concat([4]).join(",")) + "," + show(a.slice().length) + "," + show(1 in a.slice()));
