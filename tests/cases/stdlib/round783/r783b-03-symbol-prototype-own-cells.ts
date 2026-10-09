// xl:title `Symbol.prototype` 自己那一张名表：`constructor` / `toString` / `valueOf` / `description`
// xl:round 783
// xl:judge stdout
// xl:want differ
// xl:why 第 783 轮量到的：`Object.getOwnPropertyNames(Symbol.prototype)` 本仓给**空表**——
// xl:why `constructor` / `toString` / `valueOf` 三格都**不是自有的**（是继承来的、
// xl:why 还是从 `Object.prototype` 那一链上读到的），而 JS 给
// xl:why `constructor,toString,valueOf,description` 四格。四个出口同一个根：
// xl:why ① `hasOwnProperty(Symbol.prototype,"toString")` 本仓给假；
// xl:why ② `Symbol.prototype.toString.call(Symbol("q"))` 打的是
// xl:why `[object Symbol]`（走的是 `Object.prototype.toString`）而不是 `Symbol(q)`；
// xl:why ③ `Symbol.prototype[Symbol.toStringTag]` 本仓给 `undefined`、JS 给 `"Symbol"`；
// xl:why ④ `Symbol.prototype.description` 那一格**不存在**（`"description" in …` 给假）——
// xl:why 而 `Symbol("s").description` **读得到**（那一格本仓挂在符号值自己身上，
// xl:why 第 777 轮 `r777b-01` 量的是「下标读」那一半，且只差一格）。
// xl:why 所以这一条把「**值上读得到**」与「**原型上有没有**」两件事分开量：
// xl:why 前者已经对了、不许被这一趟带坏；后者才是缺的那一半。
// xl:why **不许被带偏的那一半**：`Symbol.prototype` 这个对象自己**在**、
// xl:why `typeof Symbol.prototype` 是 `"object"`、`Object.getPrototypeOf(Symbol.prototype)`
// xl:why 是 `Object.prototype`、`Symbol("s").description` 与 `Symbol().description`
// xl:why 两档的**值**要照旧对。
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
