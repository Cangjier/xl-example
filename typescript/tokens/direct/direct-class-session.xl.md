# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ClassDeclarationShape } from "../declarations/class-declaration-shape.xl.md"
import { DirectSession } from "./direct-build-session.xl.md"
import { DirectBuildMetrics } from "./direct-build-metrics.xl.md"
```

# namespace cangjie

R6-D1 `class` 声明的直建 session（`ShellClassDeclaration` kind 9 / `ShellDecoratedDeclaration` kind 10）。

**只有一条建树路径**：收口时把壳的 `Data` 折成代码单元，交给既有形状工厂
`ClassDeclarationShape.BuildFromCode(owner, code, BasePos, context, allowAnonymous)`。本 session
**不新写第二套配方**：`export` / `default` / `declare` / `abstract` 修饰词、装饰器循环、`extends` /
`implements` 子句、类型参数、成员体（字段 / 方法 / 访问器 / 构造器 / static 块 / 索引签名 / 计算名 /
可选成员 / 成员修饰词）全部由该工厂按既有规则处理（`R6-CONTRACT §2.1`）。

**A6 边界（R6-CONTRACT §5.4 的精确值档）**：本 session **只 new `ClassDeclarationShape` 一次**；
成员体与属性初始值的 `StatementBuilder` / `ExpressionBuilder` 由**形状工厂自己**调（`BuildMembers` /
`BuildBlock` / 初始值 / 装饰器表达式 / 计算名），本文件**一处都不新增**。因此读数是**确定值**：

- `stmtLoads` = 每个「有体成员」1 次（method / accessor / constructor / static block），空体 `{}` 再 +1；
- `exprOther` = 每个属性初始值 / 装饰器表达式 / 计算名 1 次（`DirectTokenUtil.OperatorToken` 那 1 次不计，R2 起口径）。

期望值逐条见 `_coord/R6-TARGET-CASES.md` 的 `CLS` 表（`a6ExpectStmtLoads` / `a6ExpectExprLoads`）。

**不做（R7）**：类表达式（`const C = class {}`，`class` 作操作数，走引擎 ⇒ 旧路径建树正确，保持
`var.init` 显式 Decline，`R6-Q5`）；成员体内引擎不接受的表达式（`super()` / 部分 `new` / 字符串字面量）
让**整个 class 回落旧路径**——`BuildFromCode` 抛错即 `return null`，绝不建半棵树（`R6-CLS-neg-01/02`）。

# class ClassDeclarationDirectSession implements DirectSession

```txt
class C {}                                  -> ClassDeclarationShape[Identifier C]
class C extends B implements I {}           -> HeritageClause[extends]/[implements]（顺序同源码）
class C { x = 1; }                          -> PropertyDeclaration[Identifier x, NumericLiteral 1]
class C { m(a) { return a; } }              -> MethodDeclaration[Identifier m, Parameter a, Block]
class C { static { a; } }                   -> ClassStaticBlockDeclaration[Block[ExpressionStatement a]]
@dec class C {}                             -> Decorator[Identifier dec] + ClassDeclaration[Identifier C]
class {}                                    -> 匿名 ClassDeclaration（allowAnonymous，R2-SAFE-02 改判 pos）
class C extends B { constructor() { super(); } }
                                            -> BuildFromCode 抛（引擎不认 super()）=> return null => 旧路径
const C = class {}; / let c = class X { … } -> 不到本 session（var.init，R6-Q5）
declare class C { x: number; }              -> 不到本 session（kind 7 的 decl.head，归 feat-r6-module）
```

## field Owner:Token | null = null

## field Declined:bool = false

## field Reason:string = ""

## field Finished:bool = false

## field Template:Template

## field Context:SyntaxContext

## field BasePos:int

## field Ingested:int = 0

## field Units:Array<Token> = []

## field HasUnits:bool = false

## field Kind:int = 0

## constructor:(template:Template, context:SyntaxContext, basePos:int, owner:Token)=>void

```ts
this.Template = template;
this.Context = context;
this.BasePos = basePos;
this.Owner = owner;
// router 的 `Create(kind, …)` 只按 kind 选类、不把 kind 传进构造函数，所以从壳自己取（duck type，
// 与 `DirectStatementHook` / `DeclarationFamilyDirectSession` 同一手法：不反向 import
// `statement-shape.xl.md`，避免 direct → statement-shape 的循环）。未设置时恒为 0。
this.Kind = (owner as any).Kind === undefined ? 0 : (owner as any).Kind;
```

## method Decline:(reason:string, category:string)=>void

```ts
if (this.Declined) {
  return;
}
this.Declined = true;
this.Reason = reason;
DirectBuildMetrics.Declined += 1;
DirectBuildMetrics.NoteDecline(reason, category);
if (DirectBuildMetrics.Strict) {
  DirectBuildMetrics.StrictViolations += 1;
  throw new Error("DirectBuild strict: " + reason + " [" + this.Summary() + "]");
}
```

## method Incomplete:(reason:string)=>void

```ts
this.Reason = reason;
DirectBuildMetrics.IncompleteFallback += 1;
DirectBuildMetrics.Trace("class session incomplete: " + reason);
if (DirectBuildMetrics.Strict) {
  DirectBuildMetrics.StrictViolations += 1;
  throw new Error("DirectBuild strict(incomplete): " + reason + " [" + this.Summary() + "]");
}
```

## method Ingest:(units:Array<Token>, context:SyntaxContext)=>void

```ts
// 与 R2/R3/R4/R5 的 session 同构（增量 / 幂等 / 只读）：从 `Ingested` 往后逐单元吃，trivia 跳过。
// **Ingest 期不做任何判定**（R6-CONTRACT §4.1 第 1 条）：class 的形状完全由「收口区间」决定
//（`extends` / `implements` 子句、类型参数、成员体都要整段已就位），提前判成员只会得到半棵树。
// 这里唯一的作用是推进游标，让 `Finish` 的「补齐到 endIndex」有确定的起点。
if (this.Declined || this.Finished) {
  return;
}
if (!this.HasUnits) {
  this.HasUnits = true;
  this.Units = units;
}
while (this.Ingested < units.length) {
  this.Ingested = this.Ingested + 1;
}
```

## method Finish:(endIndex:int, context:SyntaxContext)=>Token | null

```ts
if (this.Finished) {
  return null;
}
if (this.Declined) {
  return null;
}
if (endIndex < 0) {
  this.Incomplete("endIndex 非法");
  return null;
}
if (!this.HasUnits || this.Units.length === 0) {
  this.Incomplete("壳里没有单元");
  return null;
}
// 补齐：H2 收口前最后的单元可能还没经过 H1（体的 `}` 那一格）。
if (this.Ingested <= endIndex) {
  const upTo:Array<Token> = this.Units.slice(0, endIndex + 1);
  this.Ingest(upTo, context);
}
if (this.Declined) {
  return null;
}
// 折 code：**截断到 endIndex**（壳可能已经吞进了下一条语句，`TryToClose` 收口时只消费到 endIndex；
// 与 `R5-CONTRACT §4.4` / `DeclarationFamilyDirectSession.Finish` 同一口）。
const code:Array<Token> = [];
for (let at = 0; at <= endIndex && at < this.Units.length; at++) {
  if (this.Units[at].IsTriviaToken) {
    continue;
  }
  code.push(this.Units[at]);
}
// 最短形态 `class {}` 是 2 个代码单元（关键字 + 类体括号）；更短就是壳没收到类体。
if (code.length < 2) {
  this.Incomplete("收口区间里没有类声明");
  return null;
}
// `class {}` / `export default class {}` 是 TS 的匿名 ClassDeclaration（`R2-SAFE-02` 改判 pos）：
// 名字位的判据复用形状工厂自己的 `HasNoName`，本文件不新写第二份名字表。
const allowAnonymous = ClassDeclarationShape.HasNoName(code, 0, code.length - 1);
let shape:ClassDeclarationShape | null = null;
try {
  // **必须用 `BuildFromCode(…, this.BasePos, …)`，不能用 `FromUnits`**：`FromUnits` 的 `start=0` 会让
  // 内部 `host.Data[start-1]` 取不到前一个单元（`pos=0`），节点区间整体左移 ⇒ A1=NO（R5-R2 同源陷阱）。
  shape = ClassDeclarationShape.BuildFromCode(this.Owner as Token, code, this.BasePos, context, allowAnonymous);
} catch (error) {
  // 「绝不建半棵树」：成员体里出现引擎不接受的东西（`super()` / 部分 `new` / 字符串字面量）时
  // `BuildMembers` 会抛；这里整段放弃，旧路径重读同一段（AST 与基线逐字节一致，A1=YES）。
  const message = error instanceof Error ? error.message : String(error);
  this.Decline("类声明形状失败: " + message, "decl.shape");
  return null;
}
if (shape === null) {
  this.Decline("类声明形状为空", "decl.shape");
  return null;
}
// 覆盖校验：建出的类区间必须与壳的**最后一个代码单元**的终点相等（`SourceRange.EndIndex` 是开区间
// 终点 = 末字符下标 + 1）。不等就不交出半棵树 —— Decline 后旧路径重读同一段，AST 不会更差。
const expectedEnd = code[code.length - 1].SourceRange.EndIndex;
if (!this.CoverageOk(shape, expectedEnd)) {
  this.Decline("类声明覆盖不一致: built=" + String(shape.SourceRange.EndIndex)
    + " units=" + String(expectedEnd), "decl.coverage");
  return null;
}
this.Finished = true;
DirectBuildMetrics.StatementsBuilt += 1;
DirectBuildMetrics.Trace("class built: units=" + String(code.length)
  + " members=" + String(shape.Members.length)
  + (allowAnonymous ? " anonymous" : ""));
return shape;
```

## method CoverageOk:(built:Token, expectedEnd:int)=>bool

```ts
// 只比上界，不比内容：空体 `class C {}`、继承 / 实现子句、带装饰器 / 带 export 的形态都必须过。
if (expectedEnd < 0) {
  return false;
}
return built.SourceRange.EndIndex === expectedEnd;
```

## method Summary:()=>string

```ts
return "Class@kind" + String(this.Kind)
  + " ingested=" + String(this.Ingested)
  + " units=" + String(this.Units.length)
  + (this.Declined ? " declined(" + this.Reason + ")" : "");
```
