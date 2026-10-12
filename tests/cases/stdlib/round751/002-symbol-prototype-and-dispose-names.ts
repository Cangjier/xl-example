// xl:title `Symbol` 的静态面与 `Symbol.prototype`
// xl:round 751
// xl:judge stdout
// xl:why **第 754 轮起这一条是「守卫」不再是「缺口」**：`Symbol.prototype` 那一格
// xl:why 第 754 轮造出来了（`Protos.Symbol` + `InitProtos` 里那一格对象），
// xl:why 而 `Object.prototype.toString.call(Symbol.prototype)` 的标签走
// xl:why `ObjectTagOf` 里按**句柄相等**答的那一支（挂属性会在
// xl:why `Object.create(Number.prototype)` 那一档上漏出去，实测红过一条台账）。
// xl:why **仍然开着的那一半**：符号的**包装对象**（`Object(sym)`）与
// xl:why `Symbol.prototype` 的三个成员还没做——所以这一条留着当守卫，
// xl:why 谁把它们做出来，这里会红、逼着改。
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
