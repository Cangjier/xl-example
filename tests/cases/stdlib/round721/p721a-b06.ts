// xl:title length 不可写之后赋值静默、length 不动
// xl:round 721
// xl:judge stdout
// xl:want differ
// xl:why 同上第三档：`{ writable: false }` 之后 `a.length = 5` 在 JS 里**静默无效**
// xl:why （长度停在 2）；本仓照写（长度变 5、尾部三个洞）。`push` 那一档
// xl:why （`stdlib/object/125` 的第二行）量的是同一个标志位的另一个消费者。
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2];
Object.defineProperty(a, "length", { writable: false });
a.length = 5;
console.log(show(a.length) + "," + show(a.join(",")));
