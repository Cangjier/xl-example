# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ClassDeclarationShape } from "../declarations/class-declaration-shape.xl.md"
import { FunctionDeclarationShape } from "../declarations/function-declaration-shape.xl.md"
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

**实测（`feat-r6-class`，24/24）**：注册 kind 9/10 后逐条跑 `CLS` 24 条，`built` / A6 精确值 /
A1=YES / XML==基线 全部命中（8 条补测见 `_tmp-r6class/probe-cls.mjs`；`/tmp` 不入库）。
47 个真实 `.ts` 语料 `FILES=47 XML-DIFF=1 CRASH-DIFF=0` 与**未注册时逐字节相同**（唯一差异仍是
`angle.ts` 的 `f<T>` tagged template，属引擎，归 R6-A3 / `feat-r6-harden`）⇒ class 直建本身不引入
任何语料差异。**未合入窗口**：只注册本 session 时 189 条里有 3 条按设计变红（`R2-SAFE-02` /
`R5-DC-neg-02` / `R5-DC-neg-03` = §5.3 的改判项），与 `feat-r6-verify` 的改判同批收口。

**不做（R7）**：类表达式（`const C = class {}`，`class` 作操作数，走引擎 ⇒ 旧路径建树正确，保持
`var.init` 显式 Decline，`R6-Q5`）；成员体内引擎不接受的表达式（`super()` / 部分 `new` / 字符串字面量）
让**整个 class 回落旧路径**——`BuildFromCode` 抛错即 `return null`，绝不建半棵树（`R6-CLS-neg-01/02`）。

**R7-A2 装饰器转发（`R7-CONTRACT §1.4`）**：kind 10（`ShellDecoratedDeclaration`）也承载
`@dec function f() {}` / `@dec declare function f(): void;`。本文件在 `BuildFromCode` 之前加**一条**
转发：`code[0]` 是 `@` 且**顶格**出现 `function` ⇒ `FunctionDeclarationShape.FromUnits`（它自带
装饰器循环 + declare / async 修饰词 + 无体 ambient 判据），**不新增注册行、不改 9/10 的指向**。
顶格预检（`HasDecoratedFunctionHead`）是必须的：没有它，`@dec class C {}` 会先被试探一次
`FromUnits` 的装饰器 `ExpressionBuilder`，A6 从 0/1 漂到 0/2（`R7-DEC2-guard-01` 硬读数）。
实测 4 条函数形态全 `built>=1 / A1=YES / XML=IDENTICAL`，`@dec class` / 成员装饰器读数逐项不变
（`_coord/REPORT-r7-module2.md` §3）。

# class ClassDeclarationDirectSession implements DirectSession

```txt
class C {}                                  -> ClassDeclarationShape[Identifier C]
class C extends B implements I {}           -> HeritageClause[extends]/[implements]（顺序同源码）
class C { x = 1; }                          -> PropertyDeclaration[Identifier x, NumericLiteral 1]
class C { m(a) { return a; } }              -> MethodDeclaration[Identifier m, Parameter a, Block]
class C { static { a; } }                   -> ClassStaticBlockDeclaration[Block[ExpressionStatement a]]
@dec class C {}                             -> Decorator[Identifier dec] + ClassDeclaration[Identifier C]
@dec function f() {}                        -> R7-A2 转 FunctionDeclarationShape.FromUnits（不是 class）
@dec declare function f(): void;            -> 同上（ambient，无体，A6 0/1）
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

## field ForwardHandled:bool = false

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
// 折 code / codeAt：**截断到 endIndex**（壳可能已经吞进了下一条语句，`TryToClose` 收口时只消费到 endIndex；
// 与 `R5-CONTRACT §4.4` / `DeclarationFamilyDirectSession.Finish` 同一口）。
const code:Array<Token> = [];
const codeAt:Array<number> = [];
for (let at = 0; at <= endIndex && at < this.Units.length; at++) {
  if (this.Units[at].IsTriviaToken) {
    continue;
  }
  code.push(this.Units[at]);
  codeAt.push(at);
}
// 最短形态 `class {}` 是 2 个代码单元（关键字 + 类体括号）；更短就是壳没收到类体。
if (code.length < 2) {
  this.Incomplete("收口区间里没有类声明");
  return null;
}
// **R7-A2 装饰器转发**（`R7-CONTRACT §1.4`）：kind 10 也承载 `@dec function f() {}`。
// 判据不新写：`HasDecoratedFunctionHead` 只做一次**只看顶格单元**的扫描 —— `@dec class C {}`
// 在顶格看不见 `function`（类体是原子 Bracket）⇒ 连 `FromUnits` 都不试，A6 与 R6 逐项相同；
// 真函数才交给 `FunctionDeclarationShape.FromUnits`（它自己带装饰器循环 + declare / async 修饰词）。
if (code[0] instanceof Symbol && (code[0] as Symbol).Is("@")
  && this.HasDecoratedFunctionHead(code)) {
  const forwarded = this.TryDecoratedFunction(code, codeAt, context);
  if (forwarded !== null) {
    return forwarded;                       // Decline / 计数已在方法内处理
  }
  if (this.ForwardHandled) {
    return null;                            // 转发已收口（Decline 已置位），不再走 class 支
  }
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

## method HasDecoratedFunctionHead:(code:Array<Token>)=>bool

```ts
// 装饰器之后**顶格**有没有 `function`。为什么必须先在顶格扫一遍、而不是直接试 `FromUnits`：
// `FunctionDeclarationShape.FromUnits` 的装饰器循环会 `new ExpressionBuilder` 解析装饰器表达式
// （A6 的 `exprOther` +1）。对 `@dec class C {}` 那次试探会先解析装饰器再在 `class` 上抛 ——
// AST 不变，但 **A6 从 0/1 漂到 0/2**（`R7-DEC2-guard-01` 是硬读数）。本节只看顶格单元：
// 类体 / 参数表 / 装饰器实参都是原子 `Bracket`，里面的 `function` 扫不到 ⇒ 保守地**不试**，
// 行为与 R6 逐字节相同（漏判只是少一次直建，不会建错树）。
for (let at = 1; at < code.length; at++) {
  const unit = code[at];
  if (unit instanceof Common && (unit as Common).TempToString() === "function") {
    return true;
  }
}
return false;
```

## method TryDecoratedFunction:(code:Array<Token>, codeAt:Array<int>, context:SyntaxContext)=>Token | null

```ts
// **R7-A2**（`R7-CONTRACT §1.4`）：kind 10（`ShellDecoratedDeclaration`）不只有 `@dec class`，
// 还有 `@dec function f() {}` / `@dec declare function f(): void;`。R6 把 kind 10 注册到本 session
// 之后，后者必然在 `ClassDeclarationShape.BuildFromCode` 里抛 ⇒ 落 `decl.shape`（A1=YES 的回落）。
// 转发**只加在这里，不加注册行**：装饰器之后的第一个代码单元是不是 `function` 由形状工厂自己判
//（`FunctionDeclarationShape.FromUnits` 带装饰器循环 + declare / async 修饰词 + 无体 ambient 判据），
// 本文件不写第二份关键字表 ⇒ `@dec class` / `@dec abstract class` 抛错后原样落回 class 支。
// `Pos` 口径与 class 同源：`start` 必须是装饰器在壳 `Data` 里的下标（`codeAt[0]`），**不能是 0**。
const data:Array<Token> = (this.Owner as any).Data;
const hostLike:any = { Data: data, Template: this.Template };
const lastAt = codeAt[code.length - 1];
let shape:Token | null = null;
try {
  shape = FunctionDeclarationShape.FromUnits(hostLike, codeAt[0], lastAt, context, false, false);
} catch (error) {
  // 装饰器后面不是函数（`@dec class C {}` / `@dec abstract class C {}` / `@dec interface I {}`）：
  // 不是本方法的格子 —— `ForwardHandled` 保持 false，`Finish` 继续走 class 支（行为逐字节不变）。
  DirectBuildMetrics.Trace("decorated function forward skipped: "
    + (error instanceof Error ? error.message : String(error)));
  return null;
}
if (shape === null) {
  return null;
}
const expectedEnd = code[code.length - 1].SourceRange.EndIndex;
if (!this.CoverageOk(shape, expectedEnd)) {
  // 建出来了但区间不符：不交半棵树，也不再走 class 支（对函数必然抛，只会换个 category 记同一次失败）。
  this.ForwardHandled = true;
  this.Decline("装饰器函数声明覆盖不一致: built=" + String(shape.SourceRange.EndIndex)
    + " units=" + String(expectedEnd), "decl.coverage");
  return null;
}
this.Finished = true;
this.ForwardHandled = true;
DirectBuildMetrics.StatementsBuilt += 1;
DirectBuildMetrics.Trace("decorated function built: units=" + String(code.length));
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
