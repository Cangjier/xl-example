// xl:title Math.max 的长度
// xl:round 709
// xl:judge stdout
// xl:want differ
// xl:why **宿主引用（内建函数）身上没有 `name` / `length` 两格**：`Math.max.length` 在 Node 里是 `2`，本仓给 `undefined`（内建是一个**宿主引用值**，没有属性表）。与 `exec/round706/p706c-x20`（`Object.prototype` 上那一族内建的名字与长度）、`stdlib/object/122-names-function-proto` **同一族**：要给几百个内建各配一份名字与形参个数表。要做。
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Math.max.length)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
