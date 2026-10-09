// xl:title `finally` 里 return 会**接管**；值要提前算出来
// xl:round 692
// xl:judge stdout
// xl:end
// **第 794 轮把同判定点的两条并了进来**：
//   · 035（`function f() { try { return 1; } finally { } }`，原是第 692 轮按标题起名的薄容器）
//   · probe3-x15（try 里改 `n`、catch 里再改、finally 里再改，最后 return）
// 035 与 probe3-x04 的正文逐字节相同（第 692 轮那次合并的产物），所以它的断言在 002 里已经有了。
function a(): number { try { return 1; } finally { console.log("cleanup"); } }
console.log(a());
function b(): number { let n = 0; try { n = 1; return n; } finally { n = 2; } }
console.log(b());
function c(): string { try { return "t"; } finally { return "f"; } }
console.log(c());
function f(): number { try { return 1; } finally { } }
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log("empty-finally-return:", show((function () { function g() { try { return 1; } finally { } } return g(); })())); }
catch (e: any) { console.log("empty-finally-return:", show("throw:" + (e && e.constructor ? e.constructor.name : "?"))); }
console.log("empty-finally-return-raw:", f());
try { console.log("scope-order:", show((function () { let n = 0; try { n = 1; throw 1; } catch (e) { n = 2; } finally { n = 3; } return n; })())); }
catch (e: any) { console.log("scope-order:", show("throw:" + (e && e.constructor ? e.constructor.name : "?"))); }
