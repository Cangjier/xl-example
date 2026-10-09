// xl:title try / catch / finally 的执行顺序（含没抛的那条路、嵌套 finally、catch 里重抛）
// xl:judge stdout
// xl:end
// **第 794 轮把同判定点的四条探针并了进来**（正文一字未改，只裹进 `show` 小壳）：
//   · probe3-x01（try { try { throw } finally {} } catch 接住）
//   · probe3-x02（catch 里重抛，外层接住）
//   · probe3-x04（`out += "t"` / `finally { out += "f" }`）
//   · probe694-x08（内层 throw + finally 写盘，外层 catch 接着写）
// 判定点只有一个：**每条出口路径上 finally 跑没跑、跑在谁前面**。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
function run(shouldThrow: boolean): string {
  let log = "";
  try { log += "try"; if (shouldThrow) throw new Error("x"); log += "-ok"; }
  catch (e) { log += "-catch"; }
  finally { log += "-finally"; }
  return log;
}
console.log(run(false), run(true));
try { console.log("nested-finally:", show((function () { try { try { throw new Error("a"); } finally { } } catch (e) { return e.message; } })())); }
catch (e: any) { console.log("nested-finally:", show("throw:" + (e && e.constructor ? e.constructor.name : "?"))); }
try { console.log("catch-rethrow:", show((function () { try { try { throw new Error("a"); } catch (e) { throw new Error("b"); } } catch (e) { return e.message; } })())); }
catch (e: any) { console.log("catch-rethrow:", show("throw:" + (e && e.constructor ? e.constructor.name : "?"))); }
try { console.log("order:", show((function () { let out = ""; try { out += "t"; } finally { out += "f"; } return out; })())); }
catch (e: any) { console.log("order:", show("throw:" + (e && e.constructor ? e.constructor.name : "?"))); }
try { console.log("inner-finally:", show((function () { let s = ""; try { try { throw 1; } finally { s += "a"; } } catch (e) { s += "b"; } return s; })())); }
catch (e: any) { console.log("inner-finally:", show("throw:" + (e && e.constructor ? e.constructor.name : "?"))); }
