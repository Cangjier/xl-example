# dependencies
```xl
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { BasicTokenBatch } from "../../../core/syntax/batch/basic-token-batch.xl.md"
import { BatchPolicy } from "../../../core/syntax/batch/batch-policy.xl.md"
import { BatchStates } from "../../../core/syntax/batch/batch-states.xl.md"
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { IBatchHost } from "../../../core/syntax/batch/i-batch-host.xl.md"
import { ItemListEngine, ItemRule } from "../../../core/syntax/batch/item-list.xl.md"
import { ItemScanState } from "../../../core/syntax/batch/item-scan-state.xl.md"
import { RawFallback } from "../../../core/syntax/batch/raw-fallback.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { ExportKeywordShape } from "../keywords/export-keyword-shape.xl.md"
import { DeclareKeywordShape } from "../keywords/declare-keyword-shape.xl.md"
import { ClassDeclarationShape } from "../declarations/class-declaration-shape.xl.md"
import { EnumDeclarationShape } from "../declarations/enum-declaration-shape.xl.md"
import { ExportAssignmentShape } from "../declarations/export-assignment-shape.xl.md"
import { ExportDeclarationShape } from "../declarations/export-declaration-shape.xl.md"
import { FunctionDeclarationShape } from "../declarations/function-declaration-shape.xl.md"
import { ImportDeclarationShape } from "../declarations/import-declaration-shape.xl.md"
import { ImportEqualsDeclarationShape } from "../declarations/import-equals-declaration-shape.xl.md"
import { InterfaceDeclarationShape } from "../declarations/interface-declaration-shape.xl.md"
import { ModuleDeclarationShape } from "../declarations/module-declaration-shape.xl.md"
import { NamespaceExportDeclarationShape } from "../declarations/namespace-export-declaration-shape.xl.md"
import { TypeAliasDeclarationShape } from "../declarations/type-alias-declaration-shape.xl.md"
import { StatementBuilder } from "../statements/statement-builder.xl.md"
import { ExpressionStatementShape } from "../statements/expression-statement-shape.xl.md"
import { StatementScanner } from "../statements/statement-scanner.xl.md"
import { AngleJudge } from "../types/angle-judge.xl.md"
import { SourceFileTailBuilder } from "./source-file-tail-builder.xl.md"
```

# namespace cangjie

根级（`SourceFileShape` 的 `Data`）item 表：`RootItemRule`（判定 + 建造）+ `SourceFileBodyItemHost`（把引擎接到根上）。

引擎与状态全部来自 `core/syntax/batch`（契约冻结，本文件只消费、不修改）。

判定不是本文件自己写的：**13 个根候选在同一张表里竞争**（`CatalogGuide` 的语义），
语句族的判据在 `StatementPossibleShape` 里（`StatementScanner`），声明族的判据在各自的
`XxxDeclarationPossibleShape` 里。本文件只做「谁赢了 → 用哪个静态建造入口」的映射，
**不复制任何判据**（INV-2）。

`End` 一律是**宿主下标**：候选给出的收口点是 `Code` 下标，这里经 `state.CodeAt` 映射。

# class RootItemRule implements ItemRule

根级唯一的一族 item：**一条根单元**（import / export / 各类声明 / 语句）。
`Classify` 恒认领（root 拥有全部 item），判定交给 13 个候选在前缀上逐个淘汰。

候选表由构造器注入（`SourceFileShape.CreatePossibleShapes()`），本文件**不 import** `SourceFileShape`：
根形状反过来要 import 本文件的 host，双向 import 会成环。

## static field Item:int = 1

本族唯一的 kind 号（`ItemRule.Classify` 的返回值）。

## field Guide:CatalogGuide

候选目录：13 个根候选 + 判定缓存。**终结候选为 `null`**：尾巴（EOF / 硬边界）由容器的
`FinishBody` 收（`SourceFileTailBuilder.BuildTrailingItems`），不走 item 表。

## field Alive:Set<int> = new Set()

还活着的候选下标。每建完一条就由 `Reseed` 重新填满。

## field Watermark:int = 0

已经判过的 `Code` 下标水位线：`Analyze` 每次从上一格继续推进（候选的 `ComputeByIndex` 必须在递增下标上顺序调用）。

## field Winner:int = -1

最近一次 `Analyze` 判出的唯一候选下标；`Build` 用它决定建造入口，建完复位。

## field Owner:Token | null = null

宿主（根）引用。`ItemRule.Analyze(state)` 没有 host 形参，而「试建」需要宿主，
所以由 `SourceFileBodyItemHost.OnBasicTokens` 每批注入（与 `Context` 同一处）。

## field Pending:Token | null = null

`Analyze` 试建成功的 item；`Build` 直接取用，同一段不建两次。

## field HoldAt:int = -1

挂起中的 item 最后一格（`Code` 下标）。`new a.b.C` ⏎ `()` / `a<b` ⏎ `>` 这类
「续接符还没进 `code`」的收口先**挂起一格**，下一格到了再由 `TryResolveHold` 决定
（只挂这两种明确可续接的形状，不是整体推迟——wp3-12 的「推迟一格」净负 6122→6117）。

## field HoldGt:int = -1

挂起里已经看到的闭合 `>` 的 `Code` 下标（`-1` = 还没看到 / 不是尖括号形状）。

## field HoldLt:int = -1

挂起里那个**未闭合**的 `<` 的宿主 `Data` 下标（`AngleJudge.CanStart` 用它判「`>` 是不是
类型实参段的闭合」）；`-1` = 不是尖括号形状。

## field HoldKind:int = 9

挂起 item 的族号：`KindOf` 在挂起那一刻算好，下一格到了不必重算（`code` 已经变长）。

## field Context:SyntaxContext | null = null

判定上下文。`ItemRule.Analyze(state)` 没有 context 形参，而候选的 `IsBuildable(units, index, cache, context)`
需要它，所以由宿主 `SourceFileBodyItemHost.OnBasicTokens` **每批注入**。

## constructor:(shapes:Array<PossibleShape>)=>void

以候选表（`SourceFileShape.CreatePossibleShapes()`）创建，初始即复位。

```ts
this.Guide = new CatalogGuide(shapes, null);
this.Reseed();
```

## private method Reseed:()=>void

复位：候选下标填满、缓存清空、水位线与胜者归零。**每建完一条都必须调**——
不复位就再也建不出第二条（`CatalogGuide.Reset` 的注释）。

```ts
this.Alive.clear();
for (let index = 0; index < this.Guide.PossibleShapes.length; index++) {
  this.Alive.add(index);
}
this.Watermark = 0;
this.Winner = -1;
this.Pending = null;
this.HoldAt = -1;
this.HoldGt = -1;
this.HoldLt = -1;
this.HoldKind = 9;
this.Guide.PossibleShapesComputeCache.Clear();
```

## method Classify:(code:Array<Token>)=>Array<int>

恒认领：root 拥有全部 item，语句 / 声明由 13 个候选在 `Analyze` 里竞争，不需要先缩表。

```ts
if (code.length === 0) {
  return [];
}
const kinds: Array<number> = [];
kinds.push(RootItemRule.Item);
return kinds;
```

## method Extend:(state:ItemScanState, units:Array<Token>, tokenIndex:int)=>void

不维护增量状态：`Analyze` 用水位线自己推进。

```ts
// 不需要族内增量状态。
```

## method Analyze:(state:ItemScanState)=>void

= 不带 context 形参的 `CatalogGuide` 选表循环：逐个 `Code` 下标淘汰候选，只剩一个且
`IsBuildable` 成立时收口。

`Alive` 空 = 本段没有形状可建 → 立刻收口并交 raw（引擎 `RawFallback`），EOF 时由 `FinishBody` 兜底。

```ts
state.Complete = false;
state.End = -1;
if (this.Winner >= 0) {
  return;
}
const code: Array<Token> = state.Code;
if (code.length === 0) {
  return;
}
// 候选的 `ComputeByIndex` 是按**宿主 Data + 宿主下标**写的（`ItemUtil.ItemStart(units)`、
// `HasLineBreakBefore(units, at)` 都要看 trivia）。引擎给的是去掉 trivia 的 `Code`，所以这里
// 用 `CodeAt` 映射回宿主下标，判据本身一个字不改（INV-2）。
const owner: Token | null = this.Owner;
if (owner === null) {
  return;
}
const cache: PossibleShapeCache = this.Guide.PossibleShapesComputeCache;
// 候选按「从本条目起点开始的数组」判定：`ItemUtil.ItemStart(units)` 取的是「最后一个非 basic
// 单元之后」——只有把本条目之前的单元切掉，它才等于本条目的起点。上一段留下的 raw basic token
// 若还在数组里，`ItemStart` 会落回它们身上，所有候选的判据都会被带偏（`a` ⏎ `b;` 的 `b`）。
const base: number = state.Start >= 0 ? state.Start : 0;
const units: Array<Token> = base === 0 ? owner.Data : owner.Data.slice(base);
let at: number = this.Watermark;
if (this.HoldAt >= 0 && at > this.HoldAt) {
  if (this.TryResolveHold(state, code, at, base, owner, units)) {
    return;
  }
}
while (at < code.length) {
  if (this.HoldAt >= 0 && at > this.HoldAt) {
    if (this.TryResolveHold(state, code, at, base, owner, units)) {
      return;
    }
  }
  // 声明族在换行处的收口：`export const x = a as T` ⏎ `(b);` 里声明在 `T` 收口，
  // `(b);` 是**下一条语句**（TS 实测，HANDOFF.wp3-8 类 2/3）。候选扫描本身不会在这一格退出
  // （`(b)` 语法上续得下去），所以必须在淘汰候选之前按「这一格不能续接」判一次收口。
  if (at > 0 && state.Start >= 0 && this.Context !== null
    && this.IsDeclarationBoundary(code, at)) {
    const closeKind: number = this.KindOf(code);
    if (closeKind !== 9) {
      const closeEnd: number = state.CodeAt[at - 1];
      const closed: Token | null = this.BuildByKind(closeKind, owner, state.Start, closeEnd, this.Context);
      if (closed !== null) {
        state.Complete = true;
        state.End = closeEnd;
        this.Winner = -1;
        this.Pending = closed;
        this.Watermark = at;
        return;
      }
    }
  }
  const hostAt: number = state.CodeAt[at] - base;
  for (const index of this.Alive) {
    if (this.Guide.PossibleShapes[index].ComputeByIndex(units, hostAt, cache) === ShapeStates.Reject) {
      this.Alive.delete(index);
    }
  }
  if (this.Alive.size === 0) {
    // 所有候选在这一格退出。常见两种情况：
    //   ① 这一格是声明族的终结符 `;`（`import …;` 的候选在 `;` 上 Reject）——它属于本条 item；
    //   ② 这一格是下一条语句的开头（ASI 边界）——它不属于本条 item。
    // 先按「把这一格也算进来」建一次，再看形状实际右界截到哪一格：声明会吃进 `;`，
    // 语句则按 ASI 停在前一格（`StatementBuilder` 自己就在换行处收口）。
    if (this.Context !== null && state.Start >= 0 && !this.ShouldDeferToTail(code)) {
      // 这一格是 `;`：声明族的终结符属于本条 item（`module "m";`、`type T = A | B // c` ⏎ `;`），
      // 先按「含这一格」建；只有建出来且**真的吃掉了** `;` 才用它，否则仍走下面两条。
      if (this.IsSymbolAt(code, at, ";") && at > 0) {
        const withSemi: Token | null = this.BuildByKind(this.KindOf(code), owner, state.Start, state.CodeAt[at], this.Context);
        if (withSemi !== null && withSemi.SourceRange.EndIndex >= code[at].SourceRange.EndIndex) {
          state.Complete = true;
          state.End = state.CodeAt[at];
          this.Pending = withSemi;
          this.Watermark = at + 1;
          return;
        }
      }
      // ① 先按「不含这一格」建：这一格通常是下一条语句的开头（ASI 边界），不属于本条 item。
      if (at > 0) {
        const beforeEnd: number = state.CodeAt[at - 1];
        const before: Token | null = this.BuildByKind(this.KindOf(code), owner, state.Start, beforeEnd, this.Context);
        if (before !== null && !this.IsEmptyVariableStatement(code, before)) {
          state.Complete = true;
          state.End = beforeEnd;
          this.Pending = before;
          this.Watermark = at;
          return;
        }
      }
      // ② 再按「含这一格」建：声明族的终结符 `;` 就落在这一格（`import …;` 的候选在 `;` 上 Reject）。
      const over: Token | null = this.BuildByKind(this.KindOf(code), owner, state.Start, state.CodeAt[at], this.Context);
      if (over !== null && !this.IsEmptyVariableStatement(code, over)) {
        const overEnd: number = over.SourceRange.EndIndex;
        let overAt: number = at;
        if (overEnd >= 0) {
          while (overAt >= 0) {
            const overStart: number = code[overAt].SourceRange.Start;
            if (overStart >= 0 && overStart < overEnd) {
              break;
            }
            overAt = overAt - 1;
          }
        }
        if (overAt >= 0) {
          state.Complete = true;
          state.End = state.CodeAt[overAt];
          this.Pending = over;
          this.Watermark = overAt + 1;
          return;
        }
      }
    }
    // 收口到**上一格**，把这一格留给下一条：引擎按 `End + 1` 切，这一格会被重新读一次。
    if (at > 0) {
      state.Complete = true;
      state.End = state.CodeAt[at - 1];
      this.Winner = -1;
      this.Watermark = at;
      return;
    }
    // 第一格建不出来（`var` 单独一格、`@dec` 后面的声明词）：**继续扫描**，不在这里 raw 收口。
    // 后面的 unit 可能让这一段建得出：`var` ⏎ `y` 是一条 `VariableStatement[0,5)`（wp3-13 实测 +2）。
    // raw 收口会把第一格换成 raw token，尾巴只能看到剩下的 ` y`，整条语句就再也拼不回来了。
    at = at + 1;
    continue;
  }
  if (this.Alive.size === 1) {
    const only: number = RootItemRule.FirstOf(this.Alive);
    const shape: PossibleShape = this.Guide.PossibleShapes[only];
    if (this.Context !== null && shape.IsBuildable(units, hostAt, cache, this.Context)) {
      // 修饰词与声明词之间换行时 TS 按 ASI 拆成两条（`declare` ⏎ `enum E {}`）：
      // 这种段交给尾巴的 `BuildTrailingDeclaration`（它的多语句分界按这个口径写）。
      if (this.ShouldDeferToTail(code)) {
        at = at + 1;
        continue;
      }
      // C：`IsBuildable` 只说明「可以试着建」，不说明「这一段建得出」（`import a` 就是 true）。
      // 真建一次，建出来才收口；结果留给 `Build` 直接取用（同一段不建两次）。
      if (state.Start >= 0) {
        const built: Token | null = this.BuildByKind(this.KindOf(code), owner, state.Start, state.CodeAt[at], this.Context);
        if (built !== null) {
          // D：收口点按 shape 的实际右界反推，不能用试探格——试探格可能已是下一条语句的 token，
          // 按它收口会把 lookahead 一起 splice 掉。
          const builtEnd: number = built.SourceRange.EndIndex;
          let lastAt: number = at;
          if (builtEnd >= 0) {
            while (lastAt >= 0) {
              const unitStart: number = code[lastAt].SourceRange.Start;
              if (unitStart >= 0 && unitStart < builtEnd) {
                break;
              }
              lastAt = lastAt - 1;
            }
          }
          if (lastAt >= 0) {
            // E：`new a.b.C` ⏎ `()` / `a < b` ⏎ `>`——表达式在**最后可用的一格**收口时，紧随的
            // `()`（被调用者的实参表）/ `>`（类型实参段的闭合）还没进 `code`。TS 里它们属于
            // **本条** item：`new a.b.C()` 的 `()` 进 `NewExpression`、`a<b>` 的 `>` 让 `<…>`
            // 成为类型实参。所以这两形状先挂起一格，下一格到了再判（`TryResolveHold`）。
            // 只挂这两种**明确可续接**的形状，不是「收在最后一格就等下一格」——后者 wp3-12
            // 实测净负 6122→6117（`if (a) f()` ⏎ `else g()` 会在 `else` 那格建出截断形状）。
            const holdEnd: number = code[lastAt].SourceRange.EndIndex;
            const holdLt: number = this.LastOpenAngle(code, lastAt);
            const holdNew: boolean = holdEnd >= 0 && RootItemRule.HasTailNew(built, holdEnd);
            if (lastAt === code.length - 1 && !state.AtEof && (holdLt >= 0 || holdNew)) {
              this.HoldAt = lastAt;
              this.HoldKind = this.KindOf(code);
              this.HoldLt = holdLt;
              this.HoldGt = -1;
              this.Watermark = lastAt + 1;
              return;
            }
            // 注：这里试过「收在当前可用代码最后一格时先不收口、等下一格再判」，用来吸收紧随的
            // `;`（`a` ⏎ `;`）。实测**净负**（6122→6117）：`if (a) f()` ⏎ `else g()` /
            // `try {}` ⏎ `catch` / `const` ⏎ `enum E {}` 会在 `else` / `catch` / `enum` 那一格
            // 重新 `Build` 出一个**截断**的形状（cj[0,10] vs ts[0,19]）。别再试这个形状。
            // C 类：item 在**建成功的那一格**就收口，紧随其后的 `;` 会被引擎读成下一条 item 的
            // `EmptyStatement`（`import x from "m"` ⏎ `a;` 的 `a`、`type T = A | B // c` ⏎ `;`、
            // `import x from "m"` ⏎ `import y from "n"` ⏎ `a;` 的尾巴）。TS 侧那个 `;` 一律属于
            // **前一条** item——跨行也算（实测 `a` ⏎ `;` 是 `ExpressionStatement[0,3]`、
            // `type T = A` ⏎ `;` 是 `TypeAliasDeclaration[0,12]`）。所以这里向前看一格：形状
            // 还没吃到 `;` 时按含 `;` 重建一次，收口到 `;` 上；重建不出来就仍按原样收口。
            const semiAt: number = lastAt + 1;
            if (semiAt < code.length && this.IsSymbolAt(code, semiAt, ";")
              && builtEnd >= 0 && builtEnd < code[semiAt].SourceRange.EndIndex) {
              const withSemi: Token | null = this.BuildByKind(this.KindOf(code), owner, state.Start, state.CodeAt[semiAt], this.Context);
              if (withSemi !== null
                && withSemi.SourceRange.EndIndex >= code[semiAt].SourceRange.EndIndex) {
                state.Complete = true;
                state.End = state.CodeAt[semiAt];
                this.Winner = only;
                this.Pending = withSemi;
                this.Watermark = semiAt + 1;
                return;
              }
            }
            state.Complete = true;
            state.End = state.CodeAt[lastAt];
            this.Winner = only;
            this.Pending = built;
            this.Watermark = lastAt + 1;
            return;
          }
        }
      }
    }
  }
  at = at + 1;
}
this.Watermark = at;
if (state.AtEof) {
  // 到 EOF 还有候选没被淘汰、但谁都建不出：**无条件收口**。
  // 不收口的话引擎一条 item 都不建，`Flush` 既走不了「能建就建」也走不了「raw 回退」。
  // 收口后 `Winner = -1` → `Build` 返回 `null` → 引擎记 raw 回退，
  // 由容器的 `FinishBody` 用 `BuildTrailingItems` 把这段尾巴整段建对（legacy 里是「终结候选」干的事）。
  state.Complete = true;
  state.End = state.CodeAt[code.length - 1];
  this.Winner = -1;
}
```

## static method FirstOf:(set:Set<int>)=>int

取集合里唯一的下标（没有就 `-1`）。

```ts
for (const value of set) {
  return value;
}
return -1;
```

## method Build:(host:Token, state:ItemScanState, context:SyntaxContext)=>Token | null

按 `KindOf` 走候选对应的**静态建造入口**。**绝不改 `host.Data`**：splice 由引擎 `ApplyBuilds` 整批做。

建造器抛错（缺 `;` / 缺关键字等）→ 返回 `null` 走 raw 回退，不吞异常语义（INV-7）。

```ts
if (state.Start < 0 || state.Start >= host.Data.length) {
  return null;
}
const start: number = state.Start;
const end: number = state.End;
const built: Token | null = this.Pending;
this.ResetAfterBuild();
if (end < start || built === null) {
  return null;
}
built.Parent = host;
return built;
```

## private method ShouldDeferToTail:(code:Array<Token>)=>bool

修饰词（`declare` / `abstract` / `async`）与后面的声明词之间**有换行**时，TS 按 ASI 拆成两条：
`declare` 是独立的 ExpressionStatement，声明本身不带该修饰词（`declare` ⏎ `enum E {}`）。
这种段不能在这里用 `FromUnits` 合并建出来（`FromUnits` 不看修饰词与关键字之间的换行），
必须交给 EOF/尾巴的 `BuildTrailingDeclaration`——它的多语句分界正是按这个口径写的。

```ts
if (code.length < 2) {
  return false;
}
const head = code[0];
if (!(head instanceof Common)) {
  return false;
}
const headText: string = (head as Common).TempToString();
if (headText !== "declare" && headText !== "abstract" && headText !== "async") {
  return false;
}
const document = head.SourceRange.Document;
const from: number = head.SourceRange.EndIndex;
const to: number = code[1].SourceRange.StartIndex;
if (document === null || from < 0 || to < 0 || to <= from) {
  return false;
}
return document.GetRaw(from, to).indexOf("\n") >= 0;
```

## private method IsEmptyVariableStatement:(code:Array<Token>, shape:Token)=>bool

这条建出来的形状是不是**空声明列表的变量语句**（`VariableStatement` 里那个 `VariableDeclarationList`
一个声明项都没有）。这种形状只在「变量关键字已经是本段最后一格」时建得出（`var` 单独一格、
`@dec` ⏎ `const`），它不是一条完整的语句，**不许用来收口**：收口了就再也不会长回来
（`var` ⏎ `y` 会变成 `VariableStatement[0,3)` + `ExpressionStatement[3,5)`，wp3-13 实测）。

判据按形状结构读，不按 type/kind：`Data` 里只要有一个 `VariableDeclarationListShape` 且它的
`Data` 为空就成立。装饰器变量语句的 `Data` 是 `[Decorator…, VariableDeclarationList]`，
所以不能只看 `Data.length`。

```ts
if (shape === null) {
  return false;
}
// 装饰器开头的段照旧（装饰器变量声明的收口点另属 wp3-13 的 F 类，还没修）：这里只治
// 没有装饰器的「关键字单独一格」段。
if (code.length > 0 && code[0] instanceof Symbol && (code[0] as Symbol).Is("@")) {
  return false;
}
const data:Array<Token> = shape.Data;
if (data === null || data.length === 0) {
  return false;
}
for (const child of data) {
  if (child !== null && child.constructor.name === "VariableDeclarationListShape" && child.Data.length === 0) {
    return true;
  }
}
return false;
```

## private method IsDeclarationBoundary:(code:Array<Token>, at:int)=>bool

`code[at]` 前面**有换行**、且 `code[at]` **不能续接**前一个表达式时返回 true——声明族在换行处的
收口判据（与 TS 同口径：`export const x = a as T` ⏎ `(b);` 是两条）。

续接集合只放「语法上真能把表达式接下去」的单元：运算符、`;` `,` `.`，以及 `as` / `satisfies` /
`extends` 这类关键字。`(` `[` 与模板字符串**不在**里面（`export const x = a` ⏎ `(b)` 在 TS 里
是 VariableStatement + ExpressionStatement，实测见 HANDOFF.wp3-8 类 2）。

```ts
if (at <= 0 || at >= code.length) {
  return false;
}
const previous = code[at - 1];
const next = code[at];
const document = previous.SourceRange.Document;
const from: number = previous.SourceRange.EndIndex;
const to: number = next.SourceRange.StartIndex;
if (document === null || from < 0 || to < 0 || to <= from) {
  return false;
}
if (document.GetRaw(from, to).indexOf("\n") < 0) {
  return false;
}
if (next instanceof Symbol) {
  if ((next as Symbol).IsAny([";", ",", ".", ":", "?", "=", "+", "-", "*", "/", "%",
    "<", ">", "&", "|", "^", "~", "{"])) {
    return false;
  }
}
if (next instanceof Common) {
  const word: string = (next as Common).TempToString();
  if (word === "as" || word === "satisfies" || word === "extends" || word === "implements"
    || word === "instanceof" || word === "in" || word === "of" || word === "else"
    || word === "catch" || word === "finally" || word === "while" || word === "from"
    || word === "with" || word === "assert" || word === "is") {
    return false;
  }
}
return true;
```

## private method ResetAfterBuild:()=>void

建完复位：`Candidates`/缓存/水位线都回到 0，否则下一条会拿上一条的状态。

```ts
this.Reseed();
```

## private method TextOf:(unit:Token)=>string

取单元文本（只对关键字类 `Common` 有意义，其余返回空串）。

```ts
if (unit instanceof Common) {
  return (unit as Common).TempToString();
}
return "";
```

## private method IsSymbolAt:(code:Array<Token>, at:int, text:string)=>bool

`code[at]` 是不是指定的符号（越界 / 非 `Symbol` 一律 false）。

```ts
if (at < 0 || at >= code.length) {
  return false;
}
const unit: Token = code[at];
if (unit instanceof Symbol) {
  return (unit as Symbol).Is(text);
}
return false;
```

## private method TryResolveHold:(state:ItemScanState, code:Array<Token>, at:int, base:int, owner:Token, units:Array<Token>)=>bool

挂起的 item 在下一格到了之后收口：能续接（配对的 `>` / 被调用者的 `(`）就按**含**这一格重建，
否则按挂起前的那一格原样建（与不挂起时逐字节相同）。返回 `true` = 本格已有结论（收口或继续挂起）。

```ts
const holdAt: number = this.HoldAt;
if (holdAt < 0) {
  return false;
}
// 尖括号形状：`>` 已经看到、但 follower 还没进 `code`——再等一格。`AngleJudge.CanStart`
// 要看配对 `>` **之后**那一格是不是「类型实参段接得上」的东西，没有 follower 判不了。
if (this.HoldGt < 0 && this.HoldLt >= 0 && at < code.length
  && this.IsSymbolAt(code, at, ">") && at + 1 >= code.length && !state.AtEof) {
  this.HoldGt = at;
  this.Watermark = at + 1;
  return true;
}
let includeAt: number = -1;
const context: SyntaxContext | null = this.Context;
if (context === null || state.Start < 0) {
  return false;
}
if (this.HoldLt >= 0) {
  const gtAt: number = this.HoldGt >= 0 ? this.HoldGt : at;
  if (this.IsSymbolAt(code, gtAt, ">")) {
    // `a<b>` 的 `>` 是类型实参段的闭合，还是比较式的右半边？判据只用一个：`AngleJudge.CanStart`。
    if (AngleJudge.CanStart(units, this.HoldLt - base)) {
      includeAt = gtAt;
    }
  }
} else if (at < code.length) {
  // `new a.b.C` ⏎ `()`：空实参表属于被调用者（`ParseNew` 会把它吃进 `NewExpression`）。
  const nextUnit: Token = code[at];
  if (nextUnit instanceof Bracket && (nextUnit as Bracket).StartBracketChar === "(") {
    includeAt = at;
  }
}
if (includeAt >= 0 && state.Start >= 0) {
  const over: Token | null = this.BuildByKind(this.HoldKind, owner, state.Start, state.CodeAt[includeAt], context);
  if (over !== null) {
    this.HoldAt = -1;
    this.HoldGt = -1;
    this.HoldLt = -1;
    state.Complete = true;
    state.End = state.CodeAt[includeAt];
    this.Winner = -1;
    this.Pending = over;
    this.Watermark = includeAt + 1;
    return true;
  }
}
// 不续接（或按含这一格建不出）：按挂起前的那一格原样收口，与不挂起时行为相同。
const held: Token | null = this.BuildByKind(this.HoldKind, owner, state.Start, state.CodeAt[holdAt], context);
this.HoldAt = -1;
this.HoldGt = -1;
this.HoldLt = -1;
if (held !== null) {
  state.Complete = true;
  state.End = state.CodeAt[holdAt];
  this.Winner = -1;
  this.Pending = held;
  this.Watermark = holdAt + 1;
  return true;
}
return false;
```

## private method LastOpenAngle:(code:Array<Token>, lastAt:int)=>int

`code[0..lastAt]` 里**最后一个没有闭合**的 `<` 的 `Code` 下标（`-1` = 没有这样的 `<`）。
只数角符号（`>>` / `>>>` 按层拆），其它单元原样跳过——它只回答「表达式末尾是不是吊着一个 `<`」，
「`>` 该不该算类型实参」由 `AngleJudge.CanStart` 回答（两件事分开）。

```ts
let depth: number = 0;
let open: number = -1;
for (let at = 0; at <= lastAt && at < code.length; at++) {
  const unit: Token = code[at];
  if (!(unit instanceof Symbol)) {
    continue;
  }
  const text: string = (unit as Symbol).TempToString();
  if (text === "<") {
    depth = depth + 1;
    if (depth === 1) {
      open = at;
    }
    continue;
  }
  if (text === ">") {
    depth = depth - 1;
    if (depth <= 0) {
      depth = 0;
      open = -1;
    }
    continue;
  }
  if (AngleJudge.IsSplitClose(text)) {
    depth = depth - text.length;
    if (depth <= 0) {
      depth = 0;
      open = -1;
    }
  }
}
return depth > 0 ? open : -1;
```

## private static method HasTailNew:(unit:Token, endIndex:int)=>bool

形状树里有没有一个**右界正好停在 `endIndex`** 的 `NewExpressionShape`——即「整条 item 的末尾
是一个没有实参表的 `new` 表达式」（`new a.b.C`）。有的话，紧随的 `(` 属于它的被调用者。

```ts
if (unit === null) {
  return false;
}
if (unit.constructor.name === "NewExpressionShape" && unit.SourceRange.EndIndex === endIndex) {
  return true;
}
const data: Array<Token> = unit.Data;
if (data === null || data.length === 0) {
  return false;
}
for (const child of data) {
  if (child !== null && RootItemRule.HasTailNew(child, endIndex)) {
    return true;
  }
}
return false;
```

## private method KindOf:(code:Array<Token>)=>int

只按首格文本判族，顺序与候选表一致。跳过 `export` / `declare` / `abstract` / `async` 修饰词后看主关键字；
`const enum` 归 enum。不确定的一律 `9`（通用语句，走 `StatementBuilder` 兜底）。

1 = import 声明，2 = export 子句，3 = class，4 = interface，5 = enum，6 = function，7 = module，
8 = type alias，9 = 语句，10 = export 赋值（`export = …`），11 = import equals（`import x = …`）。

```ts
if (code.length === 0) {
  return 9;
}
const hadExport: boolean = this.IsTextAt(code, 0, "export");
let startAt: number = 0;
if (code[0] instanceof Symbol && (code[0] as Symbol).Is("@")) {
  // 装饰器前缀：声明词由 `StatementScanner` 一次认出（与 `ScanDecoratedHead` 同口径）。
  // `@dec\nconst x = 1;` 的声明词是 `const`，按变量语句走 `StatementBuilder` 的装饰器路径。
  const decoratedHead: number = StatementScanner.DecoratedHeadKeyword(code, 0);
  if (decoratedHead < 0) {
    return 9;
  }
  startAt = decoratedHead;
}
let at: number = startAt;
while (at < code.length) {
  const text: string = this.TextOf(code[at]);
  if (text === "export" || text === "declare" || text === "abstract" || text === "async"
    || text === "default") {
    at = at + 1;
    continue;
  }
  if (text === "const" && at + 1 < code.length && this.TextOf(code[at + 1]) === "enum") {
    return 5;
  }
  break;
}
if (at >= code.length) {
  return 9;
}
const head: string = this.TextOf(code[at]);
if (head === "import") {
  if (this.IsSymbolAt(code, at + 1, "(") || this.IsSymbolAt(code, at + 1, ".")) {
    return 9;
  }
  let probe: number = at + 2;
  if (at + 1 < code.length && this.TextOf(code[at + 1]) === "type") {
    probe = at + 3;
  }
  if (this.IsSymbolAt(code, probe, "=")) {
    return 11;
  }
  return 1;
}
if (head === "class") {
  // `class<T> {}`：TS 里 `class` 后**紧跟 `<`** 不是 ClassDeclaration（没有名字），而是
  // ClassExpression 语句（`<T>` 是类型参数前导）→ 交给 `StatementBuilder`。
  if (this.IsSymbolAt(code, at + 1, "<")) {
    return 9;
  }
  return 3;
}
if (head === "interface") {
  return 4;
}
if (head === "enum") {
  return 5;
}
if (head === "function") {
  return 6;
}
if (head === "namespace" || head === "module") {
  return 7;
}
if (head === "type") {
  // `export type { T }` / `export type * from "m"`：这是 ExportDeclaration（isTypeOnly），
  // 不是类型别名——不能按 `type` 去找 `=`。
  if (at + 1 < code.length) {
    const nextUnit: Token = code[at + 1];
    if (nextUnit instanceof Bracket && (nextUnit as Bracket).StartBracketChar === "{") {
      return 2;
    }
    if (this.IsSymbolAt(code, at + 1, "*")) {
      return 2;
    }
  }
  let probe: number = at + 2;
  while (probe < code.length && this.TextOf(code[probe]) !== "=" && !this.IsSymbolAt(code, probe, ";")) {
    probe = probe + 1;
  }
  if (probe < code.length && this.TextOf(code[probe]) === "=") {
    return 8;
  }
  return 9;
}
if (this.IsSymbolAt(code, at, "=") && hadExport) {
  return 10;
}
if (hadExport) {
  // `export default <表达式>` 是 ExportAssignment；带声明词的 `export default class …`
  // 已经在上面按声明词分派掉了。
  if (at >= 2 && this.IsTextAt(code, 1, "default")) {
    return 10;
  }
  return 2;
}
return 9;
```

## private method IsTextAt:(code:Array<Token>, at:int, text:string)=>bool

`code[at]` 的文本是不是 `text`（越界 false）。

```ts
if (at < 0 || at >= code.length) {
  return false;
}
return this.TextOf(code[at]) === text;
```

## private method BuildByKind:(kind:int, host:Token, start:int, end:int, context:SyntaxContext)=>Token | null

按族分派到候选的静态建造入口（**不是** `BuildByIndex`：class/interface/enum 的 `BuildByIndex` 走
`BodyGuideUtil.MountShell`，会改 `host.MountedUnit` 并替换 `host.Data`）。

```ts
try {
  // WP-6 的直接建造入口：`[start, stop)` 是**半开**区间，ASI（`;` 可有可无）与 End 重锚都由入口自己
  // 处理，不依赖 `BuildByIndex` / `MountShell`，也不改 `host.Data`。返回 `null` = 这一片不是该形态 →
  // 一律退回 6080 状态已经验证过的旧入口（`FromUnits` / `BuildModuleItem`），所以每个分支只增不减。
  const stop: number = end + 1;
  if (kind === 1) {
    // 带修饰词的 import（`export import a from "m"` / `declare import …` / `export declare import …`）：
    // `ImportDeclarationShape.FromUnits` 不认前导修饰词（抛），整条会落进 `StatementBuilder`
    // 报「表达式语句没有读完」（HANDOFF.wp3-11 的 E 类 3 条）。TS 侧它们是 **ImportDeclaration
    // 带 ExportKeyword / DeclareKeyword 子节点**，所以这里跳过修饰词建 import 本体，再把修饰词
    // 按原顺序插到 children 最前（Pos = 前一个非 trivia 单元的右界，与尾巴同口径）。
    let modifiedStart: number = start;
    let modifiedFound: boolean = false;
    while (modifiedStart <= end) {
      const modifiedUnit: Token = host.Data[modifiedStart];
      if (modifiedUnit.IsTriviaToken) {
        modifiedStart = modifiedStart + 1;
        continue;
      }
      const modifiedText: string = this.TextOf(modifiedUnit);
      if (modifiedText === "export" || modifiedText === "declare") {
        modifiedFound = true;
        modifiedStart = modifiedStart + 1;
        continue;
      }
      break;
    }
    if (modifiedFound && modifiedStart <= end
      && this.TextOf(host.Data[modifiedStart]) === "import") {
      let modified: Token | null = null;
      try {
        modified = ImportDeclarationShape.FromUnits(host, modifiedStart, end, context);
      } catch (error) {
        modified = null;
      }
      if (modified !== null) {
        let modifierPos: number = 0;
        for (let probe = start - 1; probe >= 0; probe--) {
          if (!host.Data[probe].IsTriviaToken) {
            const previousEnd: number = host.Data[probe].SourceRange.EndIndex;
            if (previousEnd >= 0) {
              modifierPos = previousEnd;
            }
            break;
          }
        }
        const shapePos: number = modifierPos;
        // 修饰词的 `Pos` 是**前一个非 trivia 单元的右界**（`export declare import` 里
        // DeclareKeyword 的 Pos 是 `export` 的 End，不是 0）。
        const modifiers: Array<Token> = [];
        for (let probe = start; probe < modifiedStart; probe++) {
          const modifierUnit: Token = host.Data[probe];
          if (modifierUnit.IsTriviaToken) {
            continue;
          }
          const modifierText: string = this.TextOf(modifierUnit);
          if (modifierText === "export") {
            const exportKeyword = ExportKeywordShape.FromBasicToken(modifierUnit as Common, context);
            (exportKeyword as ShapeToken).Pos = modifierPos;
            modifiers.push(exportKeyword);
          } else if (modifierText === "declare") {
            const declareKeyword = DeclareKeywordShape.FromBasicToken(modifierUnit as Common, context);
            (declareKeyword as ShapeToken).Pos = modifierPos;
            modifiers.push(declareKeyword);
          } else {
            continue;
          }
          if (modifierUnit.SourceRange.EndIndex >= 0) {
            modifierPos = modifierUnit.SourceRange.EndIndex;
          }
        }
        // 逆序 unshift：`export declare import` 的 children 顺序是 ExportKeyword → DeclareKeyword。
        for (let index = modifiers.length - 1; index >= 0; index--) {
          modifiers[index].Parent = modified;
          modified.Data.unshift(modifiers[index]);
        }
        if (modifiers.length > 0) {
          (modified as ShapeToken).Pos = shapePos;
        }
        return modified;
      }
    }
    // `import defer …`：`defer` 的 phase modifier 只在挂壳路径里实现，`FromUnits` 会把它当默认导入名。
    // 普通 import 仍走已验证的 `FromUnits`：本波实测把 `import` 全量切到 `BuildDirect` 会红 254 条
    // （`ImportDeclarationShape.BuildDirect` 与 `FromUnits` 在 import-clause 口径上并不等价）。
    if (this.TextOf(host.Data[start + 1]) === "defer") {
      const direct1: Token | null = ImportDeclarationShape.BuildDirect(host, start, stop, context);
      if (direct1 !== null) {
        return direct1;
      }
    }
    return ImportDeclarationShape.FromUnits(host, start, end, context);
  }
  if (kind === 2) {
    // 本波实测：`ExportDeclarationShape.BuildDirect` 与 `FromUnits` 不等价（全量切换后红 254 条，
    // 「FromUnits 失败再退 BuildDirect」的兜底也红 88 条、6167→6020），所以 kind 2 仍走旧口径。
    // `export const …` 这类带声明词的 export 在 item 表里建不出来（`FromUnits` 抛），整段落进
    // raw 回退，由 `source-file-tail-builder` 的 `isExportVariable` 分支建——**类 A/B 的收口点在
    // 那里**（该分支原来把整段 splice 成一条语句，后面的语句整体丢失）。
    return ExportDeclarationShape.FromUnits(host, start, end, context);
  }
  if (kind === 3) {
    return ClassDeclarationShape.FromUnits(host, start, end, context);
  }
  if (kind === 4) {
    return InterfaceDeclarationShape.FromUnits(host, start, end, context);
  }
  if (kind === 5) {
    return EnumDeclarationShape.FromUnits(host, start, end, context);
  }
  if (kind === 6) {
    return FunctionDeclarationShape.FromUnits(host, start, end, context, false, false);
  }
  if (kind === 7) {
    // 无体 ambient 模块（`declare module "m"` ⏎ `class C {}`）：直接入口按「名字单元 / `;`」重锚 End，
    // 不看尾随 trivia；带体的模块仍走尾巴的 `BuildModuleItem`（它的体括号口径不变）。
    let hasBody: boolean = false;
    for (let probe = start; probe <= end; probe++) {
      if (host.Data[probe] instanceof Bracket) {
        hasBody = true;
      }
    }
    if (!hasBody) {
      const direct7: Token | null = ModuleDeclarationShape.BuildDirect(host, start, stop, context);
      if (direct7 !== null) {
        return direct7;
      }
    }
    return SourceFileTailBuilder.BuildModuleItem(host, start, end, context);
  }
  if (kind === 8) {
    return TypeAliasDeclarationShape.FromUnits(host, start, end, context);
  }
  if (kind === 10) {
    // `export = …` / `export default …`：ASI 的尾巴没有分号，直接入口按表达式末尾收口；
    // 建不出时退回旧口径（`;` 在区间里才要求分号）。
    const direct10: Token | null = ExportAssignmentShape.BuildDirect(host, start, stop, context);
    if (direct10 !== null) {
      return direct10;
    }
    const lastUnit: Token = host.Data[end];
    const hasSemi: boolean = lastUnit instanceof Symbol && (lastUnit as Symbol).Is(";");
    return ExportAssignmentShape.FromUnits(host, start, end, context, hasSemi);
  }
  if (kind === 11) {
    // `import x = require("m")` 的 ASI 尾巴没有 `;`，而 `FromUnits` 强制要 `;`（本波 8 条）。
    const direct11: Token | null = ImportEqualsDeclarationShape.BuildDirect(host, start, stop, context);
    if (direct11 !== null) {
      return direct11;
    }
    return ImportEqualsDeclarationShape.FromUnits(host, start, end, context);
  }
  return this.BuildStatement(host, start, end, context);
} catch (error) {
  return null;
}
```

## private method BuildStatement:(host:Token, start:int, end:int, context:SyntaxContext)=>Token | null

通用语句：与 `StatementItemRule.Build` 同形，用既有 `StatementBuilder`（不复制建造逻辑）。

```ts
const units: Array<Token> = [];
for (let at = start; at <= end; at++) {
  units.push(host.Data[at]);
}
if (units.length === 0) {
  return null;
}
// 根上的 `basePos` 不能用 `StatementItemScan.BasePos`：那是「语句体」口径
// （宿主起点 + 1 跳过 `{`），根宿主起点是 0 → Pos 会整体偏 1。
// 根上只取「前一个非 trivia 单元的右界」，前面什么都没有就是 0。
let basePos: number = 0;
for (let at = start - 1; at >= 0; at--) {
  if (!host.Data[at].IsTriviaToken) {
    const previousEnd: number = host.Data[at].SourceRange.EndIndex;
    if (previousEnd >= 0) {
      basePos = previousEnd;
    }
    break;
  }
}
const builder: StatementBuilder = new StatementBuilder(host.Template, context);
builder.Load(units, basePos);
return builder.BuildStatement();
```

## method IncludesSeparator:()=>bool

根的 item 区间已由候选给出（含 `;` 的那一格就是收口点），不再额外吞分隔符。

```ts
return false;
```

# class SourceFileBodyItemHost implements IBatchHost

根单元（`SourceFileShape`）的批次宿主：`SourceFileShape.BatchAdapter` 指向本对象时，
根上每个 basic token 关闭时由 `UnitToken.OnBasicTokenClosed` 交给 `Engine.Feed`；
容器收口（`FinishBody`）时由 `CloseBatch → Engine.Flush` 把最后一条没建完的 item 建掉。

与 `StatementBodyItemHost` 的唯一差别：`OnBasicTokens` 每批把 `context` 注入 `RootItemRule`
（`Analyze` 没有 context 形参），以及多一条 `RawRange` 让容器读 raw 区间。

## field Host:Token | null = null

宿主（根）。`CloseBatch` 没有 batch 参数，所以引擎 flush 需要的宿主在这里记一份。

## field Engine:ItemListEngine = new ItemListEngine()

item 表引擎（core 契约实现）。

## field Fallback:RawFallback = new RawFallback(-1, -1, "")

建不出 item 的区间口袋；容器 `FinishBody` 读它，再把这段交给 `SourceFileTailBuilder.BuildTrailingItems`。

## field BatchPolicy:BatchPolicy | null = null

软边界策略：根不需要（每个 basic token 关闭就消费一批），只留 `null` 满足契约。

## constructor:(host:Token, rules:Array<ItemRule>)=>void

以宿主与规则表创建。

```ts
this.Host = host;
this.Engine.Rules = rules;
```

## method RawRange:()=>RawFallback

raw 回退口袋（`From` / `To` / `Reason`）。容器收口时按它决定要重建哪一段。

```ts
return this.Fallback;
```

## method OnBasicTokens:(batch:BasicTokenBatch, context:SyntaxContext)=>BatchStates

消费一个批次：先给根规则注入 `context`，再 `Feed` 整批，最后按 `Engine.Built` 的增量回答
`Done` / `NeedMore`（契约 §3：用 `Built` 判，不读 `host.Data`）。

```ts
const host = batch.Host;
if (host === null) {
  return BatchStates.NeedMore;
}
for (const rule of this.Engine.Rules) {
  if (rule instanceof RootItemRule) {
    (rule as RootItemRule).Context = context;
    (rule as RootItemRule).Owner = host;
  }
}
const before: number = this.Engine.Built;
this.Engine.Feed(host, batch, context);
if (this.Engine.Built > before) {
  return BatchStates.Done;
}
return BatchStates.NeedMore;
```

## method OnChildCreated:(child:Token, context:SyntaxContext)=>void

嵌套括号的创建与根 item 表无关（`(` / `[` / `{` 整体是一个 unit）。

```ts
// 不需要给嵌套括号挂任何东西。
```

## method OnBasicTokenClosed:(token:Token, context:SyntaxContext)=>CloseStates

根侧回调由 `SourceFileShape` 自己的 `UnitToken.OnBasicTokenClosed` 承担，本对象不重复实现。

```ts
return CloseStates.Nothing;
```

## method CloseBatch:(context:SyntaxContext)=>BatchStates

硬边界收口：把引擎里没建完的 item 交给 `Flush`（能建就建，建不出记 raw 回退）。

**不在这里 `Fallback.Reset()`**：raw 口袋是给容器读的，容器 `FinishBody` 读完并 splice 之后才清零
（`SourceFileShape.FinishBody` 里有那句 `raw.Reset()`）。在这里擦掉，容器永远读到 `{From:-1,To:-1}`。

```ts
const host = this.Host;
if (host === null) {
  return BatchStates.Done;
}
this.Engine.Flush(host, context, this.Fallback);
return BatchStates.Done;
```

## method Reset:()=>void

卸载 / 重建宿主时清空引擎与回退口袋。

```ts
this.Engine.Reset();
this.Fallback.Reset();
```

## static method CreateRules:(shapes:Array<PossibleShape>)=>Array<ItemRule>

根的规则表：只占 1 条规则；候选表由调用方给（`SourceFileShape.CreatePossibleShapes()`），
本文件因此不必 import 根形状，双向 import 不成环。

```ts
const rules: Array<ItemRule> = [];
rules.push(new RootItemRule(shapes));
return rules;
```
