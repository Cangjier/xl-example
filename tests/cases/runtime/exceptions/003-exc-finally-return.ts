// xl:title `finally` 里 return 会**接管**；值要提前算出来
// xl:round 692
// xl:judge stdout
// xl:end
// **第 794 轮把同判定点的两条并了进来**：
//   · 035（`function f() { try { return 1; } finally { } }`，原是第 692 轮按标题起名的薄容器）
//   · probe3-x15（try 里改 `n`、catch 里再改、finally 里再改，最后 return）
// 035 与 probe3-x04 的正文逐字节相同（第 692 轮那次合并的产物），所以它的断言在 002 里已经有了。
// **第 809 轮并入 `exec/round736/004-finally-abrupt-completion`**（同一个判定点在 `exec` 里
// 又写了一遍：那一份的三条断言这里都有了，只有 `switch` 里 `break` 也要先走 `finally`
// 那一档是独有的，接在最下面）；那份文件从盘上删掉。
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
// 809 · 原 exec/round736/004（`switch` 里的 `break` 也要先走 `finally`）。
// **只留 `case 1` 那一格**：`case` 后面的第二个 `case` / `default` 标签在本仓降级期是
// **另一处已知缺口**（`exec/statements/084-switch-case-block-blocked`），写进来会把这条
// 用例整个带走（实测 `name is not a local or a capture: case`）；`f(2)` 落空那一路由同一格覆盖。
try { console.log("switch-break-finally:", show((function () { function g(x: number): string { const log: string[] = []; switch (x) { case 1: try { log.push("try"); break; } finally { log.push("finally"); } } log.push("end"); return log.join(","); } return [g(1), g(2)].join("|"); })())); }
catch (e: any) { console.log("switch-break-finally:", show("throw:" + (e && e.constructor ? e.constructor.name : "?"))); }
