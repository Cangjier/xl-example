// xl:title 函数声明提升、`let` 的 TDZ
// xl:round 691
// xl:judge stdout
// xl:want blocked
// xl:why `let` 的 TDZ 在 JS 里是**运行期**的 `ReferenceError`（`try` 接得住），
//       本仓在链接那一步就报 `name used before its declaration` ⇒ 整份文件跑不起来。要做。
// xl:end
console.log(typeof f);
function f(): number { return 1; }
try { console.log(x); } catch (e: any) { console.log("tdz", e.constructor.name); }
let x = 1;
console.log(x, f());
