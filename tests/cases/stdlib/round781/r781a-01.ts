// xl:title 错误家族的形状：`cause` / `AggregateError` / 标签 / 原型链
// xl:round 781
// xl:judge stdout
// xl:want differ
// xl:why 这一份十八档里只剩**两行**不同，两行都是**已登记的根的新排版**：① `typeof new Error("x").stack` 在 Node 里是 `"string"`、本仓给 `"undefined"`（`Error.stack` 那一格，第 697 / 704 / 708 / 749 轮各登过一次）；② `Object.getPrototypeOf(TypeError) === Error` 在 Node 里是**真**、本仓是假（第 724 轮 `p724a-b01` 登的：错误家族的原型链只接了 `prototype` 那一半，构造器之间那一层没接）。其余十六档全对（`cause` 的传给与缺省、`AggregateError` 的 `errors` / `message` / `name` / `length`、`toString` 有消息与没消息、`name` 可写、`message` 是自有属性、`Error.isError`、抛原始值、重抛、嵌套 `cause`），收那两条时不许连累它们。**另注**：`class My extends Error {}` 写在**函数体**里会**整份文件进不来**（`heap object is not an environment`）——那是 `runtime/round778b/r778m-01` 与 `runtime/round780/r780b-04` 那一处根，所以这一条里**不写**它，免得把上面十六档一起带走。
// xl:end
const S = (v: any): string => {
  try {
    if (typeof v === "string") return JSON.stringify(v);
    if (typeof v === "function") return "fn:" + v.name;
    if (v === undefined) return "undefined";
    if (v !== null && typeof v === "object" && !Array.isArray(v)) return JSON.stringify(v);
    return String(v);
  } catch (e) { return "<unprintable>"; }
};
const t = (label: string, f: () => any) => {
  try { console.log(label + " = " + S(f())); }
  catch (e) { console.log(label + " ! " + ((e as any) && (e as any).constructor ? (e as any).constructor.name : "?")); }
};

t("01 cause", () => { const e: any = new Error("a", { cause: 5 }); return String(e.cause); });
t("02 cause absent", () => String(new Error("a").cause));
t("03 aggregate errors", () => { const e: any = new AggregateError([1, 2], "m"); return e.errors.join(",") + ":" + e.message + ":" + e.name; });
t("04 aggregate length", () => AggregateError.length);
t("08 toString", () => String(new TypeError("t")));
t("09 toString no message", () => String(new TypeError()));
t("10 stack typeof", () => typeof new Error("x").stack);
t("11 name writable", () => { const e: any = new Error("x"); e.name = "Custom"; return String(e); });
t("12 message own prop", () => Object.prototype.hasOwnProperty.call(new Error("x"), "message"));
t("13 error in array", () => [new Error("a")].map(e => e.message).join(","));
t("14 isError", () => Error.isError(new Error("x")) + ":" + Error.isError({}));
t("15 throw non-error", () => { try { throw "s"; } catch (e: any) { return typeof e; } });
t("16 rethrow", () => { try { try { throw new RangeError("r"); } catch (e: any) { throw e; } } catch (e: any) { return e.constructor.name; } });
t("17 error proto chain", () => Object.getPrototypeOf(TypeError) === Error);
t("18 cause with nested", () => { const inner = new Error("i"); const e: any = new Error("o", { cause: inner }); return e.cause.message; });
