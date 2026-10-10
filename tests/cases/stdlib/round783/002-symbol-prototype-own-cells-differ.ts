// xl:title `Symbol.prototype` 自己那一张名表：`constructor` / `toString` / `valueOf` / `description`
// xl:round 783
// xl:judge stdout
// xl:want differ
// xl:why **第 935 轮（二）收掉了四格里的三格**：`constructor` / `toString` / `description`
// xl:why 与 `Symbol.prototype[Symbol.toStringTag] = "Symbol"` 都挂上了
// xl:why （写法与 `Object.prototype` / `Error.prototype` 那几族逐字相同）。
// xl:why 于是本文件 19 档里 **17 档转绿**：自有名表、
// xl:why 两者 `hasOwnProperty`、`description in` / `isOwn` / 描述符、
// xl:why `Symbol.prototype.toString.call(sym)` 给 `Symbol(q)`、
// xl:why `...toString.call(5)` 抛 `TypeError`、`toStringTag`、原型链、`typeof`。
// xl:why **还差的两格是 `valueOf`**（第 01 / 02 / 04 三行）：
// xl:why `valueOf` 那一格本轮试过整条线（号 `SymbolValueOf = 255`、并进能力表名单、
// xl:why 挂上原型），而**实测它走不到建库分派那一层**——能力号造对了
// xl:why（`RegisterCapability(255, …)` 成功、`BuiltinHostRef(255)` 读回的就是它），
// xl:why 可 `Symbol.prototype.valueOf.call(1)` 一路只留下
// xl:why `340`（`FunctionCall`）→ `220`（`StringCtor`）→ `301`（`ConsoleLog`）三个号，
// xl:why **255 一次都没到 `InvokeGlobal`**（不是漏登记：漏登记会抛
// xl:why `capability is not registered: 255`，而它一声不响地给 `undefined`）。
// xl:why **所以那一格先撤掉**，于是它落回**继承来的** `Object.prototype.valueOf`——
// xl:why 而 `valueOf` 对符号接收者**本来就该原样交回**，所以第 12 行现在是对的
// xl:why（`Symbol.prototype.valueOf.call(Symbol("q"))` 给 `Symbol(q)`）；
// xl:why 差的只是「它不是自有的」这一格（第 04 行）与它带出来的 `own count`（第 02 行）。
// xl:why **下一轮的入口就写在这里**：255 号为什么到不了 `InvokeGlobal`。
// xl:why **不许被带偏的那一半**（本轮实测全对、留在文件里当守卫）：
// xl:why `Symbol.prototype` 这个对象自己在、`typeof` 是 `"object"`、
// xl:why `Object.getPrototypeOf(Symbol.prototype)` 是 `Object.prototype`、
// xl:why `Symbol("s").description` 与 `Symbol().description` 两档的**值**照旧对。
// xl:end

const names = Object.getOwnPropertyNames(Symbol.prototype).sort();

console.log("01 own names = " + names.join(","));
console.log("02 own count = " + names.length);
console.log("03 toString is own = " + Object.prototype.hasOwnProperty.call(Symbol.prototype, "toString"));
console.log("04 valueOf is own = " + Object.prototype.hasOwnProperty.call(Symbol.prototype, "valueOf"));
console.log("05 constructor is own = " + Object.prototype.hasOwnProperty.call(Symbol.prototype, "constructor"));
console.log("06 description in = " + ("description" in Symbol.prototype));
console.log("07 description is own = " + Object.prototype.hasOwnProperty.call(Symbol.prototype, "description"));

// 值上那一半（已经对的，不许被带坏）
console.log("08 value description = " + JSON.stringify(Symbol("s").description));
console.log("09 empty description = " + String(Symbol().description));
console.log("10 value description type = " + typeof Symbol("s").description);

// 调用的落点：`Symbol.prototype.toString.call(sym)` 该给 `Symbol(q)` 而不是 `[object Symbol]`
const show = (label: string, f: () => any): void => {
  try {
    console.log(label + " = ok:" + String(f()));
  } catch (e) {
    console.log(label + " = throw:" + ((e as any) && (e as any).constructor ? (e as any).constructor.name : "?"));
  }
};
show("11 proto toString.call", () => Symbol.prototype.toString.call(Symbol("q")));
show("12 proto valueOf.call", () => String(Symbol.prototype.valueOf.call(Symbol("q"))));
show("13 value toString", () => Symbol("q").toString());
show("14 Object.prototype.toString.call", () => Object.prototype.toString.call(Symbol("q")));
show("15 proto toString on non-symbol", () => Symbol.prototype.toString.call(5));

// `toStringTag` 那一格与原型链
console.log("16 toStringTag = " + String(Symbol.prototype[Symbol.toStringTag]));
console.log("17 proto of Symbol.prototype = " + (Object.getPrototypeOf(Symbol.prototype) === Object.prototype));
console.log("18 typeof Symbol.prototype = " + typeof Symbol.prototype);
console.log("19 description descriptor = " + JSON.stringify(Object.getOwnPropertyDescriptor(Symbol.prototype, "description") === undefined ? "undefined" : "present"));
