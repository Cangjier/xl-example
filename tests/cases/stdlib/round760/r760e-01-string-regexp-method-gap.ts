// xl:title `String.prototype` 缺 `match` / `search` / `matchAll` 三个名字
// xl:round 760
// xl:judge stdout
// xl:want differ
// xl:why **量出来的形状**（第 760 轮普查当场红的那一行）：`Object.getOwnPropertyNames(String.prototype).length`
// xl:why 在 Node 里是 **52**、本仓是 **49**——少的三格是 `match` / `search` / `matchAll`
// xl:why （`typeof String.prototype.match` 本仓给 `undefined`、Node 给 `"function"`）。
// xl:why **它们是正则协议那一族的入口**（`Symbol.match` / `Symbol.search` / `Symbol.matchAll`
// xl:why 三个知名符号第 690 轮已经装上了，可**协议本身没做**）：
// xl:why `String.prototype.match` 的两条路都要 `RegExp`——`IsRegExp` 认 `Symbol.match` 之后
// xl:why 要真造一个正则对象；而降级层**连正则字面量都不收**
// xl:why （第 760 轮同一批的另外两条候选报的就是 `unimplemented: expression RegularExpressionLiteral`）。
// xl:why 所以这一条**不是「漏挂三个名字」**：挂了也只是把「取不到」换成「调了抛」。
// xl:why **同一族另外两处也开着**：`String.prototype.normalize` 已经装上（本仓有），
// xl:why 而 `replace` 那一格第 700 轮把「不是字符串就抛」改成了 JS 的 `IsRegExp` 判据——
// xl:why 也就是说**这一族的分界早就量清**，缺的是 `RegExp` 本体。**先如实登记，不猜**。
// xl:end
const show = (v: any) => String(v);
console.log("1", show(Object.getOwnPropertyNames(String.prototype).length));
console.log("2", show(typeof (String.prototype as any).match));
console.log("3", show(typeof (String.prototype as any).search));
console.log("4", show(typeof (String.prototype as any).matchAll));
console.log("5", show(["isWellFormed", "toWellFormed", "normalize", "replaceAll", "at", "anchor"].map((k) => k + "=" + typeof (String.prototype as any)[k]).join(" ")));
