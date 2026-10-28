# dependencies
```xl
```

# namespace cangjie

# class DirectBuildMetrics

## static field Sessions:int = 0

## static field StatementsBuilt:int = 0

## static field Declined:int = 0

## static field IncompleteFallback:int = 0

## static field Errors:int = 0

## static field StrictViolations:int = 0

## static field LastDeclineReason:string = ""

## static field DeclineReasons:Map<string, int> = new Map()

## static field LastError:string = ""

## static field Strict:bool = false

## static field TraceEnabled:bool = false

## static field Traces:Array<string> = []

## static method Reset:()=>void

```ts
DirectBuildMetrics.Sessions = 0;
DirectBuildMetrics.StatementsBuilt = 0;
DirectBuildMetrics.Declined = 0;
DirectBuildMetrics.IncompleteFallback = 0;
DirectBuildMetrics.Errors = 0;
DirectBuildMetrics.StrictViolations = 0;
DirectBuildMetrics.LastDeclineReason = "";
DirectBuildMetrics.DeclineReasons.clear();
DirectBuildMetrics.LastError = "";
DirectBuildMetrics.Traces.length = 0;
```

## static method NoteDecline:(reason:string, category:string)=>void

```ts
// C3（R2-CONTRACT §3.1）：Decline 的**分类计数**。键只做分组，细节留在 `LastDeclineReason` / trace。
// 只记分类表 + 最近原因 + trace；**不动** `Declined`（由 session 自己加，保持 R1 调用点单一职责）。
// 分类键是**闭集**（R4-CONTRACT §4.7；只补注释，不改计数语义）：
//   变量族  var.head / var.binding / var.type / var.init / var.stopped / var.coverage
//   表达式族 expr.decline / expr.stopped / expr.coverage / **expr.member**（R4-B4-c：对象成员是
//           async / 生成器 / 计算属性名 / 默认参数）
//   语句族  stmt.head / **stmt.catch**（R4-B3-a：catch 绑定是类型注解 / 解构 / 非 Identifier）/
//           **stmt.case**（R4-B3-b：`case` 子句形态超出闭集）/ **stmt.binding**（R4-B3：解构绑定）/
//           **stmt.type**（R4-B3：注解 / 确定赋值 `!`）/ **stmt.expr**（R4-B3：子句表达式引擎 Decline）/
//           **stmt.shape**（R4-B3：形状组装失败）/ stmt.label / stmt.func / stmt.body / stmt.nested
//   声明族  decl.head / **decl.class** / **decl.enum** / **decl.shape** / **decl.coverage**（R5-D2，
//           每条都有负例，R5-CONTRACT §4.9）：
//             decl.head     —— 声明族里不做建的族头（namespace / module / import / export / declare / using）⇒ DC-neg-04/05
//             decl.class    —— class 声明（kind 9）/ 装饰器声明（kind 10），建树归 R6 ⇒ DC-neg-02/04
//                             （R6-D1 起 class 已由 ClassDeclarationDirectSession 直建 ⇒ 本键只剩
//                              「class 建出后覆盖校验失败」这一格，R6-CONTRACT §4.5；键名不删）
//             decl.enum     —— enum 成员带初始值（会拉 ExpressionBuilder）⇒ DC-neg-01
//             decl.shape    —— `FromUnits` 抛错 / 形态不完整（无独立 case，形状失败即这里）
//             decl.coverage —— 建出的声明区间与壳的区间不一致（无独立 case，同 var.coverage 口径）
//             decl.module   —— **R6-D2 新增**：kind 7 内部头分派到 module 族
//                              （import / export / namespace / module / declare）后直建失败
//                              （`DirectExportAssembly.LastReason` / `ModuleFamilyDirectSession.Reason`），
//                              由 `DeclarationFamilyDirectSession` 一处落键（R6-CONTRACT §4.5）。
//                              `using` **不**进这一格（仍是 decl.head，R6-Q5 留 R7）。
// 空串兜底成 `unknown`，不抛错（新增 category 必须先改 CONTRACT 那张表）。
const key = category === "" ? "unknown" : category;
const old = DirectBuildMetrics.DeclineReasons.get(key);
DirectBuildMetrics.DeclineReasons.set(key, old === undefined ? 1 : old + 1);
DirectBuildMetrics.LastDeclineReason = reason;
DirectBuildMetrics.Trace("decline[" + key + "] " + reason);
```

## static method Trace:(line:string)=>void

```ts
if (!DirectBuildMetrics.TraceEnabled) {
  return;
}
DirectBuildMetrics.Traces.push(line);
if (DirectBuildMetrics.Traces.length > 256) {
  DirectBuildMetrics.Traces.splice(0, DirectBuildMetrics.Traces.length - 256);
}
```
