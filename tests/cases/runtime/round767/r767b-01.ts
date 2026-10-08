// xl:title `yield*` 的 `throw` 转发：`it.throw(e)` 该送进**被委托**那个生成器
// xl:round 767
// xl:judge stdout
// xl:want differ
// xl:why **量出来的形状**：外层生成器挂在 `yield*` 上时，`it.throw(e)` 在 JS 里要
// xl:why **转给被委托的那个迭代器**（`yield*` 是迭代协议的一条路：`next` / `throw` / `return`
// xl:why 三个方向都要转）⇒ 内层那句 `catch` **接得住**、还能 `return` 一个值回来。
// xl:why 本仓把这一抛留在**外层帧**上展开：内层生成器挂着（它的帧不在栈上、处理点被
// xl:why `IsSuspendedFrame` 留着），而外层的处理点只有脚本那一层 ⇒
// xl:why 内层 `catch` **一次都不跑**、异常直接从 `it.throw()` 那一句冒出去
// xl:why （Node 打 `  inner caught boom`，本仓打 `04 escaped boom`——**静默错值**那一类：
// xl:why  脚本里看着像「catch 写了但没用」）。
// xl:why **根子**：第 766 轮把「挑处理点」改成按**帧的层深**认之后，同一个生成器**自己**那一层
// xl:why 已经对了（`runtime/round766/r766a-01` 四种排版全过）；错的只剩**跨生成器**这一档——
// xl:why 它要的不是「挑哪条处理点」，而是**在挂起点先把这一抛转交出去**
// xl:why （`iter.throw(value)` 那条协议，与 `.next()` 在 `LowerIterationLoop` 里那条对称）。
// xl:why **要收它得让降级层在「这一次恢复带着一抛」时走另一条路**：认得出当前挂起点
// xl:why 是不是 `yield*`（那里有一格被委托的迭代器），是就调它的 `throw`、
// xl:why 按返回的 `{value, done}` 决定继续挂还是收尾。**先如实登记**（第 767 轮只登记）。
// xl:end
function* inner(): Generator<number, string, any> {
  try {
    yield 1;
    yield 2;
  } catch (e) {
    console.log("  inner caught", (e as Error).message);
    return "recovered";
  }
  return "done";
}
function* outer(): Generator<number, string, any> {
  const r = yield* inner();
  console.log("  inner returned", r);
  return "outer-done";
}
const it = outer();
console.log("01", JSON.stringify(it.next()));
console.log("02", JSON.stringify(it.next()));
console.log("03", JSON.stringify(it.next()));
const it2 = outer();
it2.next();
try { it2.throw(new Error("boom")); } catch (e) { console.log("04 escaped", (e as Error).message); }
console.log("done");
