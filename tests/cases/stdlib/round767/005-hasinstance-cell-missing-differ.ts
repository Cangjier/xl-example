// xl:title 缺省的 `Function.prototype[Symbol.hasInstance]`：本仓那一格是空的
// xl:round 767
// xl:judge stdout
// xl:want differ
// xl:why **量出来的形状**：JS 里 `Function.prototype[Symbol.hasInstance]` 是一个**方法**
// xl:why （普通 `instanceof` 的正身：读 `this.prototype`、沿实参的原型链找）。
// xl:why 所以**每一个**函数 / 类都能取到它：`typeof C[Symbol.hasInstance]` 给 `"function"`、
// xl:why `C[Symbol.hasInstance] === Function.prototype[Symbol.hasInstance]` 给真。
// xl:why 本仓那一格**没有装** ⇒ `typeof` 给 `"undefined"`；直接调它报
// xl:why `cannot call a non-closure value (it is not a function)`
// xl:why （那句话听起来像「调用写错了」，其实是那一格没人挂——与第 761 轮 `console.count`
// xl:why  同一副面孔）。
// xl:why **`instanceof` 本身照旧是对的**：引擎在 `RtInstanceOf` 里先问那一格、
// xl:why 问不到才回落原型链（`rt.xl.md`），所以这一格缺了只影响**显式取用它**的脚本。
// xl:why **为什么只登记不收**：把那一格装上之后，**每一次 `instanceof` 的右边**都会先命中它
// xl:why （`InstanceofOperator` 的第一步就是问这一格）——而内建构造函数（`Array` / `Date` …）
// xl:why 是**宿主引用、没有属性表**，`this.prototype` 在它们身上读不出来，
// xl:why 于是 `[] instanceof Array` 这条路会换一条走法（那一格得转而问
// xl:why `ConstructorProtos` 那张登记表）。**不是补一格属性，是给 `instanceof` 换入口**，
// xl:why 第 767 轮先把它量清楚、如实登记。
// xl:end
class C {}
console.log("01", typeof (C as any)[Symbol.hasInstance]);
console.log("02", (C as any)[Symbol.hasInstance] === (Function.prototype as any)[Symbol.hasInstance]);
function f() {}
console.log("03", typeof (f as any)[Symbol.hasInstance]);
console.log("04", {} instanceof ({ [Symbol.hasInstance]: (x: any) => true } as any));
console.log("05", new C() instanceof C);
