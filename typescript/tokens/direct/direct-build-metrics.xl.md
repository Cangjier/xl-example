# dependencies
```xl
```

# namespace cangjie

直建的唯一计数 / strict / trace 出口：验收看这里的计数器，不看「有没有抛异常」。

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
