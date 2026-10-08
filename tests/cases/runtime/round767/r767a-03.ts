// xl:title 可选 `catch` 绑定与 `catch` 里的解构
// xl:round 767
// xl:judge stdout
// xl:note 三档一起钉：**可选绑定**（`catch { }`，ES2019——不接那个值）、
// xl:note **对象解构**（按名字取 `message` / `code`）、**数组解构**（按下标取）。
// xl:note 外加 `try { return } finally { return }` 那一格：`finally` 的返回**接管**这次完成。
// xl:end
try { throw new Error("x"); } catch { console.log("01 no binding"); }
try { throw { message: "m", code: 7 }; } catch ({ message, code }: any) { console.log("02", message, code); }
try { throw [1, 2]; } catch ([a, b]: any) { console.log("03", a, b); }
function f(): string { try { return "try"; } finally { return "finally"; } }
console.log("04", f());
function g(): string { try { return "keep"; } finally { console.log("  fin"); } }
console.log("05", g());
try { null!.x; } catch (e) { console.log("06", (e as Error).constructor.name); }
console.log("done");
