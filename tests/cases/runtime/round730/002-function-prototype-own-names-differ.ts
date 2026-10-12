// xl:title 三档原型自己的属性名：V8 那一格多出来的 `prototype`（账）
// xl:round 730
// xl:judge stdout
// xl:want differ
// xl:why **V8 自己的一处私货**：`Object.getOwnPropertyNames(Object.getPrototypeOf(function* () {}))`
// xl:why 在 Node 里给 `"prototype,constructor"`，而规范里 `%GeneratorFunction.prototype%` 是
// xl:why **一个普通对象**、自有属性只有 `constructor` 与 `@@toStringTag`（符号，不进这一格）——
// xl:why 那多出来的 `prototype`（值是一个空对象、不可写不可枚举）是 **V8 加的**，
// xl:why 规范文本里没有这一格。本仓按规范给 `constructor` 那一格（`async` 那一行两边一致）。
// xl:why **要做就得先决定「照规范还是照 V8」**：照 V8 给一个空对象是**明知故犯**地把
// xl:why 规范里没有的格子造出来（而 `Object.getOwnPropertyNames` 这一格只在自省时看得见，
// xl:why 没有任何运行期语义依赖它）——所以先把这一档**原样登在这里**，不猜。
// xl:end
// 第 803 轮改名（原 `p730a-a09`）：`xl:want` / `xl:why` 与正文一字未动。
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(function* () {})).join(","));
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(async function () {})).join(","));
