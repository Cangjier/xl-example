# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { DirectBuildRouter } from "./direct-build-router.xl.md"
```

# namespace cangjie

H3-b（R3-CONTRACT §4.1）：控制流 / 块 / 函数声明三类「建壳候选」共用的**唯一挂载点**。
R1 的两处 H3 各自写死了 kind（`Create(StatementRoute.ShellVariable, …)`），R3 有 4 个 kind 要挂、
分布在 2 个建壳候选里；若每个分支各加一句就会「两个分支改同一个文件」（R3-CONTRACT §3.3 冲突）。
这里把「从壳自己取 kind → Create → 幂等挂上 → 首次喂入」收成一句，候选文件里只留一行调用，
**registry 仍然只在 `direct-build-plugins`**。

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
created.Ingest(statement.Data as Array<Token>, context);
```
