// 第 194 轮：**内部件与方法不该出现在 `Object.keys` / `JSON` 里**。
//
// 普查里 `map-internal-slots` 那一条（**静默错值**）：`Object.keys(new Map())` 给 12、
// JS 给 0；`JSON.stringify(new Map())` 给 `{"__k":[...],"__v":[...],"size":1}`、JS 给 `{}`。
//
// 根因：`Map` / `Set` 的内部格（`__k` / `__v` / `size`）与那一批方法都写在**实例自己**身上
// （方法挂实例是这一族的设计，见 map.xl.md），而写的时候用的是**普通属性**——
// 于是它们在 JS 眼里都是「**可枚举的自有属性**」，`Object.keys` / JSON / 展开全看得见。
// JS 里它们**一个都不算**：内部格不是属性，方法是原型上的、也不可枚举。
//
// 修法：引擎侧多一格 `SetHiddenProperty`（不可枚举、但可写可配置），
// Map / Set 的全部写入都经过 `WriteOwn` 这一个出口，改一处就够；
// `Error` 的 `message` / `name` 与 `Date` 的 `__t` 与方法同理。
//
// **还没做的那一格写在明处**：`JSON.stringify(new Date(0))` 在 JS 里走 `Date.prototype.toJSON`
// 给 `"1970-01-01T00:00:00.000Z"`，本仓给 `{}`——那是**另一件事**（要拼 ISO 文本），单独立一轮。

const m = new Map([["a", 1]]);
const s = new Set([1, 2]);
const d = new Date(0);
const e = new Error("boom");

// ① 三族的键都是空的（方法与内部格都不可枚举）
console.log(Object.keys(m).length, Object.keys(s).length, Object.keys(d).length);
console.log(JSON.stringify(m), JSON.stringify(s));

// ② 功能照旧：方法沿原型链找得到、内部格读得到
console.log(m.get("a"), m.size, s.has(2), s.size, d.getTime());
console.log([...m.keys()].join(","), [...s].join(","));

// ③ `Error` 的 `message` / `name` 也不是可枚举的（JS 的口径）
console.log(Object.keys(e).length, e.message, e.name);
console.log(JSON.stringify(e));

// ④ 回归：普通对象的键照旧看得见（不可枚举只给内部件与方法用）
const plain: any = { a: 1, b: 2 };
console.log(Object.keys(plain).join(","), JSON.stringify(plain));
const parsed: any = JSON.parse('{"x":1,"y":2}');
console.log(Object.keys(parsed).join(","), parsed.y);
