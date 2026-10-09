// xl:title 普通函数 `prototype` 那一格的描述符：`configurable` 该是假
// xl:round 783
// xl:judge stdout
// xl:want differ
// xl:why 第 783 轮量到的：普通函数（**不是类**、不是箭头）的 `prototype` 那一格在 JS 里是
// xl:why `{ writable: true, enumerable: false, configurable: false }`（规范 §10.2.5
// xl:why `MakeConstructor`：`DefinePropertyOrThrow(F, "prototype", … configurable: false)`），
// xl:why 本仓给 `configurable: true`。**一个字的差别，两个出口**：
// xl:why ① 描述符那一格直接读出来就是错的；
// xl:why ② `delete f.prototype` 于是**删得掉**（本仓给 `undefined`）——
// xl:why 而 JS 里「不可配置」正是「删不掉」的定义（严格模式还要抛 `TypeError`，
// xl:why 那一半登在 `r783a-02` 的出口二里）。
// xl:why **类的 `prototype` 是对的**（那一格本仓走的是另一条路，`r783a-04` 的对照组量着它），
// xl:why 所以这不是「prototype 那一格整体没做」，是**函数那一条路上错了位**。
// xl:why **不许被带偏的那一半**：`writable` / `enumerable` 两位、`f.prototype` 是个普通对象、
// xl:why 「箭头函数没有这一格」、以及**改这一位不许动到 `length` / `name` 的描述符**
// xl:why （那两格本来就是 `configurable: true`，规范如此）。
// xl:end

function plain(this: any) { }
class Klass { }

const dPlain = Object.getOwnPropertyDescriptor(plain, "prototype")!;
console.log("01 plain configurable = " + dPlain.configurable);
console.log("02 plain writable = " + dPlain.writable);
console.log("03 plain enumerable = " + dPlain.enumerable);
console.log("04 plain has value = " + ("value" in dPlain));
console.log("05 plain value typeof = " + typeof dPlain.value);

const dKlass = Object.getOwnPropertyDescriptor(Klass, "prototype")!;
console.log("06 class configurable = " + dKlass.configurable);
console.log("07 class writable = " + dKlass.writable);
console.log("08 class enumerable = " + dKlass.enumerable);

// 删不掉 / 删得掉，是这一位最直接的那个出口
console.log("09 sloppy delete keeps it = " + (delete (plain as any).prototype) + "/" + typeof (plain as any).prototype);

// `length` / `name` 那两格**本来就是可配置**的（收这一条时不许把它们一起改成假）
const dLen = Object.getOwnPropertyDescriptor(plain, "length")!;
const dName = Object.getOwnPropertyDescriptor(plain, "name")!;
console.log("10 length configurable = " + dLen.configurable + ", writable = " + dLen.writable + ", enumerable = " + dLen.enumerable);
console.log("11 name configurable = " + dName.configurable + ", writable = " + dName.writable + ", enumerable = " + dName.enumerable);

// 箭头函数与 `prototype` 那一格的关系（对照组）
console.log("12 arrow has prototype = " + ("prototype" in ((() => 0) as any)));
console.log("13 bound has prototype = " + ("prototype" in ((function (this: any) { }).bind(null) as any)));
console.log("14 own names order = " + Object.getOwnPropertyNames(plain).join(","));
