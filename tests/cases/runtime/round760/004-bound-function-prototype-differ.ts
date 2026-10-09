// xl:title `bind` 出来的函数**不该有**自有 `prototype`，本仓抄了一格
// xl:round 760
// xl:judge stdout
// xl:want differ
// xl:why **量出来的形状**（第 760 轮普查当场红的那一行）：`typeof f.bind(null).prototype`
// xl:why 在 Node 里是 **`"undefined"`**（规范 §10.4.1.3 的 `BoundFunctionCreate` 只给
// xl:why `[[Prototype]]` / `[[Call]]` / `[[Construct]]` 三格，**没有 `prototype` 自有属性**），
// xl:why 本仓给 `"object"`——第 753 轮为了让 `new (F.bind(null))() instanceof F` 为真，
// xl:why 把**目标那一格 `prototype` 抄到了绑定对象自己身上**（`globals.xl.md` 里
// xl:why 第 753 轮那一段自己把这条差额写在明处了）。
// xl:why **两个读数的根是同一处**：`instanceof` 要的是「构造时用目标的 `prototype`」，
// xl:why 而规范把它放在 `[[Construct]]` 的转交里（本仓的 `new` 是从**被调的那个值**上
// xl:why 取 `prototype` 的——`vm.xl.md` 的 `CreateInstance`）；本仓用「抄一格」表达它，
// xl:why 于是那一格**看得见**。
// xl:why **为什么这一轮不顺手收**：收它要动 `CreateInstance`——那是**每一次 `new` 都要过的路**
// xl:why （与第 750 轮 `a.length = "2"` 那条同类的取舍），改法是把「被调者有没有绑定载荷」
// xl:why 加进取材那一步，属于引擎侧的改动。**先如实登记，不猜**。
// xl:end
const show = (v: any) => String(v);
console.log("1", show(typeof (function f() { }).bind(null).prototype));
console.log("2", show(Object.prototype.hasOwnProperty.call((function f() { }).bind(null), "prototype")));
console.log("3", show(typeof ((() => 1) as any).bind(null).prototype));
console.log("4", show((function () { function f(this: any) { this.x = 1; } const B: any = f.bind(null); return [new B().x, new B() instanceof f]; })()));
console.log("5", show([(function () { function f(a: any, b: any, c: any) { } return [f.bind(null).length, f.bind(null, 1).length]; })()]));
console.log("6", show((function () { function f() { } return f.bind(null).name; })()));
