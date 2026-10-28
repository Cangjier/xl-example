# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { DirectBuildRouter } from "./direct-build-router.xl.md"
import { DirectBuildMetrics } from "./direct-build-metrics.xl.md"
```

# namespace cangjie

# class DirectStatementHook

```txt
if (a) { b; }     -> ShellStatementFamily(4) -> ControlFlowStatementDirectSession（已注册时）
{}                -> ShellBlock(5)           -> 同一个 session 类（router 的 Create 只看 kind）
switch (a) { … }  -> ShellStatementFamily(4) -> session 建出来后在 Ingest 里 Decline(stmt.head)
function f() {}   -> ShellFunctionDeclaration(8) -> 未注册 => Create 返回 null => 行为逐字节不变
```

## static method Attach:(shell:Token, context:SyntaxContext)=>void

```ts
// 调用点（2 个，逐行限定，R3-CONTRACT §3.2）：`ControlFlowStatementPossibleShape.BuildByIndex` 与
// `BlockPossibleShape.BuildByIndex` 的 `return shell;` 前一行。候选文件里只有这一句 + 1 行 import。
//
// 为什么用 `any` 而不是 `(shell as StatementShape)`：XLD-MD-GUIDE §3 禁止 `direct/*` 反向 import
// `statement-shape.xl.md`（会形成 statement-shape → block-possible-shape → hook → statement-shape 的循环）。
// 这里只需要壳上的三个成员（`DirectSession` / `Kind` / `Data`），duck type 与 import 的效果相同，
// 且 `Create` 对未注册 kind 恒返回 null —— 未注册的族行为**逐字节不变**（这就是 R1 的安全回退形态）。
const statement = shell as any;
if (statement.DirectSession !== null && statement.DirectSession !== undefined) {
  return;                       // 幂等：晚建 / 重复调用不重复建 session
}
const created = DirectBuildRouter.Create(statement.Kind, shell, context);
if (created === null) {
  return;
}
statement.DirectSession = created;
// R4 strict 全量化（R4-CONTRACT §1.5 / §2.6）：这是**第 4 个喂入点**（R3 只包了 H1 与变量壳）。
// 语义与 `StatementShape.ComputePossibleShapes` 的 H1′ 逐字相同：`--strict` 时 `Decline` 在 Ingest
// 期就抛（Declined+=1 → NoteDecline → StrictViolations+=1 → throw）；这里不接住，异常会从
// `ControlFlowStatementPossibleShape.BuildByIndex` / `BlockPossibleShape.BuildByIndex` 穿出去，
// 经 `TryToClose` 的 catch 拆壳重放，第二次抛就穿出 `Parse`（`--strict-all` 的 R2-INC-01/02 就是这条）。
// 接住之后：**已计数的 Decline 不再计 `Errors`**，只记 LastError / Trace，然后照原样返回（session 已挂上、
// 已 Decline 的那条由 H2 的 `!direct.Declined` 拦下 Finish ⇒ 旧路径建树，AST 不变）。不是空 catch。
try {
  created.Ingest(statement.Data as Array<Token>, context);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  // 与 root-expression 的第 3 个喂入点同一条判据：`--strict` 的 Decline / Incomplete 抛出前**已计数**
  // （Declined / IncompleteFallback + StrictViolations），不得再记 `Errors`；非 strict 的真异常照旧计。
  if (!created.Declined && message.indexOf("DirectBuild strict") !== 0) {
    DirectBuildMetrics.Errors += 1;
    DirectBuildMetrics.LastError = message;
    DirectBuildMetrics.Trace("direct ingest error: " + message);
  } else {
    DirectBuildMetrics.Trace("direct ingest strict (already counted): " + message);
  }
}
```
