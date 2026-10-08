// xl:title `Symbol` 的静态面与 `Symbol.prototype`
// xl:round 751
// xl:judge stdout
// xl:want differ
// xl:why **`Symbol.prototype` 那一格是空的**（Node 给一个对象、`Object.prototype.toString.call` 给 `[object Symbol]`）。
// xl:why **它的意义比看上去大**：JS 里裸的符号值借的就是它（`Symbol('x').toString()` 走 `Symbol.prototype.toString`），
// xl:why 而本仓的符号**连属性表都没有**（`Object(sym)` 那一档还响亮地抛着，见第 750 轮那一条的注释），
// xl:why 所以补这一格要连**符号的包装对象**一起做——那是另一件活。
// xl:why **`Symbol.dispose` / `Symbol.asyncDispose` 同一族**：名字第 690 轮已经进了知名符号名单，
// xl:why 缺的是**用它们的语法**（`using` / `await using`），台账 `exec/expressions/110-ex-using-declaration-dispose` 就是它。
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log("Symbol.prototype", show(() => Symbol.prototype));
console.log("Object.prototype.toString.", show(() => Object.prototype.toString.call(Symbol.prototype)));
console.log("typeof (Symbol as any).dis", show(() => typeof (Symbol as any).dispose));
console.log("typeof (Symbol as any).asy", show(() => typeof (Symbol as any).asyncDispose));
