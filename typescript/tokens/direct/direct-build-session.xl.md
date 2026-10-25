# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

直建 session 的唯一契约：一个 session 只服务一条语句壳，只读壳的 `Data`，收口时把已经建好的 AST 形状交回。

# interface DirectSession

```txt
let x = 2*3+1   -> VariableStatementDirectSession(owner=shell)   -> Finish() -> VariableStatementShape
2*3+1           -> ExpressionStatementDirectSession(owner=shell) -> Finish() -> ExpressionStatementShape
```

## property Owner:Token | null

壳（`StatementShape`，类型写 `Token` 以避免循环 import）；session 只读 `Owner.Data` / `Owner.Template`。

## property Declined:bool

是否已显式放弃：置位后 `Ingest` 立即返回、`Finish` 返回 null；只有覆盖范围外的构造才能置位。

## property Reason:string

放弃原因（可读），进 trace 与 strict 报错。

## property Finished:bool

`Finish` 是否已成功跑过（防重复）。

## method Ingest:(units:Array<Token>, context:SyntaxContext)=>void

从内部游标 `Ingested` 起增量吃 `units`（= 壳的 `Data`）；trivia 跳过；幂等（重复调用只处理新单元）；不改 `units`、不改任何 raw token、不碰 Parent/MountedUnit。

## method Finish:(endIndex:int, context:SyntaxContext)=>Token | null

先把自己补齐到 `endIndex`（用 `Owner.Data`），再完成并返回已闭合的顶层形状；不完整 / 内部失败返回 null（`Strict` 时抛）。

## method Summary:()=>string

一行摘要，trace 用（例如 `"Variable:2 decls, expr complete"`）。
