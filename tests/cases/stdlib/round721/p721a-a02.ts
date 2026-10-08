// xl:title 下标上的数据属性再来一次：只写 enumerable:false（值该留住）
// xl:round 721
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "1", { value: 9 });
Object.defineProperty(a, "1", { enumerable: false });
console.log(show(Object.keys(a).join(",")) + "|" + show(a[1]) + "|" + show(JSON.stringify(a)) + "|" + show(a.length));
