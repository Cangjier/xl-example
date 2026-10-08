// xl:title 数组迭代器有没有 next
// xl:round 710
// xl:judge stdout
// xl:want differ
// xl:why **迭代器对象自己没有 `next`**：`[][Symbol.iterator]()` 在 JS 上给一个带 `next` / `return` / `throw` 的对象，本仓把它做成了**普通数组** ⇒ 取 `next` 得 `undefined`、调用抛。与 `runtime/iterators/probe694-g18` **同一条根**。要做。
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(typeof ([] as any)[Symbol.iterator]().next)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
