// xl:title console.log 的循环引用形状（账）
// xl:round 708
// xl:judge stdout
// xl:want differ
// xl:why `console.log` 的**循环引用**形状与 Node 不同：Node 先打 `<ref *1> { a: 1, self: [Circular *1] }`（记住每一个见过的容器、再遇到就印标记），而这一层**没有那张「见过的对象」表**——它靠 `InspectDepth = 2` 兜住（不会转圈，但一个自引用对象会被印成两层 `{ a: 1, self: { … } }`）。要做得在检查器里加一张「见过的容器 → 编号」表（`inspect.xl.md` 文首那张表里已经把这一格记成「形状上与 Node 不同」）。
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = { a: 1 }; o.self = o;
console.log(o);
