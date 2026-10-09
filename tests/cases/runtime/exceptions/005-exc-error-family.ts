// xl:title 错误家族：name / message / toString / 自定子类 / 子类的 instanceof 链
// xl:judge stdout
// xl:end
// **第 794 轮把同判定点的探针并了进来**（探针正文一字未改，只裹进 `show` 小壳）：
//   · probe694-x10（本地 `class E extends Error` 的 name 是 `"E"`）
//   · probe694-x11（`new TypeError("t")` 的 name + instanceof）
//   · probe694-x12（`new Error("m").message`）
//   · probe694-x13（`new Error()` 的 message 是空串）
//   · probe3-x09（`new Error("m")` 的 message + name）
//   · probe3-x14（`RangeError` 的 instanceof 两条链）
// 判定点只有一个：**错误对象的 name / message / toString / instanceof 这几格**。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
try { throw new TypeError("bad type"); } catch (e: any) {
  console.log(e.name, e.message, e instanceof TypeError, e instanceof Error);
}
class MyError extends Error {
  code = 42;
  constructor(message: string) { super(message); this.name = "MyError"; }
}
try { throw new MyError("custom"); } catch (e: any) {
  console.log(e.name, e.message, e.code, e instanceof MyError, e instanceof Error);
}
try { console.log("fields:", show((function () { const e = new Error("m"); return e.message + "|" + e.name; })())); }
catch (e: any) { console.log("fields:", show("throw:" + (e && e.constructor ? e.constructor.name : "?"))); }
try { console.log("message:", show((function () { return new Error("m").message; })())); }
catch (e: any) { console.log("message:", show("throw:" + (e && e.constructor ? e.constructor.name : "?"))); }
try { console.log("empty-message:", show((function () { const e = new Error(); return String(e.message); })())); }
catch (e: any) { console.log("empty-message:", show("throw:" + (e && e.constructor ? e.constructor.name : "?"))); }
try { console.log("typeerror:", show((function () { const e = new TypeError("t"); return e.name + "," + (e instanceof TypeError); })())); }
catch (e: any) { console.log("typeerror:", show("throw:" + (e && e.constructor ? e.constructor.name : "?"))); }
try { console.log("rangeerror:", show((function () { function f() { throw new RangeError("r"); } try { f(); } catch (e) { return e instanceof RangeError && e instanceof Error; } })())); }
catch (e: any) { console.log("rangeerror:", show("throw:" + (e && e.constructor ? e.constructor.name : "?"))); }
try { console.log("subclass-name:", show((function () { class E extends Error { constructor(m) { super(m); this.name = "E"; } } return new E("x").name; })())); }
catch (e: any) { console.log("subclass-name:", show("throw:" + (e && e.constructor ? e.constructor.name : "?"))); }
