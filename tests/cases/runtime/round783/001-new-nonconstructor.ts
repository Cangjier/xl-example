// xl:title `new` 一个不可构造的值：**该抛 TypeError** 的那些位置
// xl:round 783
// xl:judge stdout
// xl:note 第 935 轮收掉（`xl:want differ` 按规矩撤掉，用例留着当守卫）：
// xl:note 第 783 轮量到的缺口是「本仓的 `new` **不判可构造性**」——箭头函数、对象方法、
// xl:note `async` 函数、生成器函数、绑定出来的箭头、以及内建方法（`Math.max`）
// xl:note **全都建得出来**（一个空对象），而 JS 里除「绑定过的普通函数」以外
// xl:note **一律抛 `TypeError`**（规范 §10.2.1：那四档根本没有 `[[Construct]]`）。
// xl:note **收在值模型那一位上**：降级层把「方法」那一位拼进 `new_closure` 第四格
// xl:note （`HeapClosure.IsMethod`，步长 64 → 128），引擎的 `IsConstructable`
// xl:note 按「闭包四位 + 对象自己那一格」答，`DoNew` 与 `ConstructApply` 两处共用它。
// xl:note **不许被带偏的那一半仍然钉在这里**：`new` 普通函数 / 类 / 绑定过的普通函数
// xl:note 照旧建得出来，而且 `new F()` 给的对象原型仍然接 `F.prototype`（第 14 档）。
// xl:end

const show = (label: string, f: () => any): void => {
  try {
    const v = f();
    console.log(label + " = ok:" + (v === null ? "null" : typeof v));
  } catch (e) {
    console.log(label + " = throw:" + ((e as any) && (e as any).constructor ? (e as any).constructor.name : "?"));
  }
};

// —— 该抛的六档（本仓全都给 ok:object） ——
show("01 arrow literal", () => new (((x: any) => x) as any)());
show("02 arrow in var", () => { const f = (x: any) => x; return new (f as any)(); });
show("03 object method", () => { const o: any = { m() { return 1; } }; return new o.m(); });
show("04 shorthand arrow prop", () => { const o: any = { m: () => 1 }; return new o.m(); });
show("05 async function", () => new ((async () => 0) as any)());
show("06 generator function", () => new ((function* () { }) as any)());
show("07 bound arrow", () => { const f = ((() => 0) as any).bind(null); return new (f as any)(); });
show("08 builtin method", () => new ((Math.max) as any)());

// —— **不许被带偏**的那一半：三种该建得出来的 ——
show("11 plain function", () => new (function (this: any) { this.a = 1; })());
show("12 class", () => new (class { })().constructor.name);
show("13 bound plain function", () => {
  function g(this: any) { this.a = 1; }
  const f = (g as any).bind(null);
  return new (f as any)().a;
});

// —— 原型那一格照旧：`new F()` 要接 `F.prototype` ——
const F: any = function (this: any) { };
F.prototype = { tag: "x" };
show("14 ctor prototype taken", () => (new F()).tag);
show("15 ctor returns object", () => { const H: any = function (this: any) { return { a: 2 }; }; return new H().a; });
show("16 ctor returns primitive", () => { const H: any = function (this: any) { this.a = 1; return 5; }; return new H().a; });

// —— 「不可构造」与「没有 prototype」是两件事，分开量 ——
console.log("17 arrow has prototype = " + ("prototype" in ((() => 0) as any)));
console.log("18 method has prototype = " + ("prototype" in ({ m() { } } as any).m));
console.log("19 async has prototype = " + ("prototype" in ((async () => 0) as any)));
console.log("20 generator has prototype = " + typeof ((function* () { }) as any).prototype);
console.log("21 plain function has prototype = " + ("prototype" in (function (this: any) { } as any)));
