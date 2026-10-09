// xl:title 受限属性 arguments / caller 的读法（松散给 null、严格该抛）
// xl:round 795
// xl:judge stdout
// xl:want differ
// xl:why **严格函数的受限属性该抛 `TypeError`**（本仓给 `undefined`）：JS 里 `arguments` / `caller` 是**每一函数**都有的受限属性——松散的普通函数读出来是 `null`，而**其余每一档**（箭头 / 方法 / `async` / 生成器 / 严格代码）读它**抛 `TypeError`**（那两格挂在 `Function.prototype` 上、一读就抛）。本仓的 `Function.prototype` 上**没有这两格**，于是落到「找不到 ⇒ `undefined`」。与 `stdlib/object/122-names-function-proto`（`Function.prototype` 缺 `length` / `name` / `arguments` / `caller`）**同一条根**：函数对象那一层还没做，而**补一格不能只补原型**——可调用接收者那条查询路是「先自有、再 `protos.Function`、最后才是闭包载荷」，原型上多一格同名属性就会把闭包自己的 `length` / `name` 遮住（第 690 轮实测撞过 40 条，见 `globals.xl.md` 那一段）。要做。
// xl:end
// **按判定点并组（第 795 轮）**：吸收 `p709a-a09` · `a10` · `a11` · `a16` 四条同判定点的探针
// （松散那三档两边读出来一样，只有严格那一档是账）。
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f: any) => {
  try { console.log(show(f())); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
};

probe(() => typeof (function f() {}).arguments);
probe(() => typeof (function f() {}).caller);
probe(() => (function f() {}).arguments);
probe(() => typeof (function () { "use strict"; }).arguments);
