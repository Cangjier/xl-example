// xl:title 数组的 length 描述符异形语义
// xl:round 707
// xl:judge stdout
// xl:want differ
// xl:why 数组 `length` 的描述符那一格没有异形语义：`Object.defineProperty(a, "length", { value: 1 })` 既不削短也不删元素（JS 把它截到 1 且 `a[1]` 变 `undefined`），`{ writable: false }` 之后 `push` 也不抛（JS 抛 `TypeError`）。`a.length = 1` 那条**赋值**是好的——差的是「描述符那条路」，而它要 `HeapArray` 上多一格「length 可写吗」的标志位，牵动面比这一条大。
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const a = [1, 2, 3];
run(() => { Object.defineProperty(a, "length", { value: 1 }); console.log(show(a.length) + "," + show(a[1])); });
