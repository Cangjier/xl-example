// xl:title 往生成器里 `return`（对照）：`finally` 那一档的形状
// xl:round 766
// xl:judge stdout
// xl:note 上面那条钉的是 `throw` 注入；这一条钉 `return` 注入那一半（它第 336 轮就通了），
// xl:note 两条合起来才是 JS 的 `GeneratorResumeAbrupt` 全部：`return` 只跑 `finally`、
// xl:note `catch` **不接**；`finally` 里再 `yield` 一次时那个 `yield` **接管**这次完成
// xl:note （所以 `return(9)` 给的是 `finally` 里那个 `yield` 的产出，而不是 `9`）。
// xl:end
function* plain() { try { yield 1; } finally { console.log("  fin"); } }
const a = plain();
a.next();
console.log("01", JSON.stringify(a.return(9)));
console.log("02", JSON.stringify(a.next()));
function* catchAndFinally() { try { yield 1; } catch (e) { console.log("  catch"); } finally { console.log("  fin"); } }
const b = catchAndFinally();
b.next();
console.log("03", JSON.stringify(b.return(7)));
function* finallyYields() { try { yield 1; } finally { yield 2; } }
const c = finallyYields();
c.next();
console.log("04", JSON.stringify(c.return(9)));
console.log("05", JSON.stringify(c.next()));
console.log("done");
