// xl:title `instanceof` 的四种写法：原型链、`isPrototypeOf`、`bind` 出来的构造、原始值
// xl:round 767
// xl:judge stdout
// xl:note 四条路一起钉：`new F() instanceof F`、`F.prototype.isPrototypeOf(x)`（两者同一件事）、
// xl:note 自定义 `Symbol.hasInstance`（**用 static 那一格，见下**）、以及原始值 / `null` 那几档
// xl:note （JS 对它们**不抛**，给 `false`——`x instanceof 42` 那种「右边没有原型对象」才抛）。
// xl:note **`bind` 出来的构造**那一档：本仓把目标的 `prototype` 抄到了绑定对象身上
// xl:note （第 753 轮的取舍），所以 `new bound() instanceof F` 与 Node 一致；
// xl:note 而 `typeof bound.prototype` 那一格**与 Node 差一处**，已登在第 760 轮
// xl:note （`runtime/round760/r760d-01`）——这一条故意不碰它。
// xl:note **缺省的 `Function.prototype[Symbol.hasInstance]` 本仓没有**：所以这里
// xl:note 只对**自己装了那一格**的类用 `C[Symbol.hasInstance]`（见 `stdlib/round767/r767b-01`）。
// xl:end
function F() {}
console.log("01", new F() instanceof F, F.prototype.isPrototypeOf(new F()));
class C { static [Symbol.hasInstance](x: any) { return x === 1; } }
console.log("02", new C() instanceof C, C[Symbol.hasInstance](1), C[Symbol.hasInstance](2));
const custom: any = { [Symbol.hasInstance](x: any) { return typeof x === "number"; } };
console.log("03", 1 instanceof custom, "s" instanceof custom);
const bound = F.bind(null);
console.log("04", new bound() instanceof F, new bound() instanceof bound);
console.log("05", (Object.create(null) as any) instanceof Object, null instanceof Object);
console.log("06", (1 as any) instanceof Number, ("s" as any) instanceof String, [] instanceof Array);
