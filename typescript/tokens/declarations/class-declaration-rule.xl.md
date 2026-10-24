# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { RootRule, RootRuleTable } from "../items/root-rule-contract.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ItemSlotCache } from "../../../core/syntax/item-slot-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { ExpressionStatementRule } from "../statements/expression-statement-rule.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { DeclarationShellUtil } from "./declaration-shell-util.xl.md"
import { ClassDeclarationShape } from "./class-declaration-shape.xl.md"
```

# namespace cangjie

# class ClassDeclarationScan

判定状态。`Stage` 是这条声明已经走到哪一格：0 = 等 `declare` / `abstract` / `class`，
1 = 装饰器前缀之后已见 `declare` / `abstract`、等 `class`，6 = 装饰器前缀，4 = 已经认下 `class` 关键字；
`DoneAt` 记 `class` 关键字那一格的下标。

`Done` 表示**已经确认是类声明**（看到 `class` 关键字）：名字 / 类型参数 / heritage / 类体全部交给建出来的壳自己吃——
本候选不再扫描类体。

## field Start:int = -1

## field Checked:int = 0

## field Stage:int = 0

## field PendingModifier:bool = false

## field Done:bool = false

## field DoneAt:int = -1

## field Rejected:bool = false

# class ClassDeclarationRule extends RootRule

```txt
class C {}
declare class C {}
@dec class C {}
```

第一个代码单元必须是 `class`（或修饰符 `declare` / `abstract` 后跟 `class`、或装饰器前缀后跟 `class`），
见到 `class` 关键字的这一格就 `Done` + `Accept`。

根层的类声明是**提前挂载的壳**：本候选一眼认下 `class`（连同前面的装饰器 / `declare` / `abstract` 前缀）就被
`RootRuleTable` 建出 `ClassDeclarationShape` 壳，壳随后吃名字 / 类型参数 / heritage / 类体；类体括号闭合时由壳的
终结候选（`ClassDeclarationEndShapeRule`）收口。所以本候选**不再扫描到类体**：`extends` / `implements` /
类型参数 / 类体内容全是壳的事，`class` 之后出现什么都不影响本候选的判定。

`declare` / `abstract` 与 `class` 之间换行时 TS 的 ASI 把修饰词收成独立的 ExpressionStatement、类声明不带该修饰词，
本候选必须退出。`export class` / `export default class` 走 `ExportDeclarationRule`（原子建，见
`export-declaration-rule.xl.md`），本候选在首格 `export` 上就退出。

## private static method HasLineBreakBefore:(units:Array<Token>, at:int)=>bool

`at` 这个代码单元与它前面第一个代码单元之间有没有换行（中间的 trivia 逐格看，块注释里的换行也算）。
扫描到 `at` 时只能往回看：用它判「修饰词后面换行，修饰词按 ASI 自成一条表达式语句」。

```ts
for (let index = at - 1; index >= 0; index--) {
  const unit = units[index];
  if (!unit.IsTriviaToken) {
    return false;
  }
  if (ExpressionStatementRule.HasLineBreak(unit)) {
    return true;
  }
}
return false;
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:ItemSlotCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.Slot();
let state = cache.GetState<ClassDeclarationScan>(name);
if (state === null) {
  state = new ClassDeclarationScan();
  state.Start = ItemUtil.ItemStart(units);
  state.Checked = state.Start;
  cache.SetState(name, state);
}
if (state.Checked > tokenIndex + 1) {
  state.Start = ItemUtil.ItemStart(units);
  state.Checked = state.Start;
  state.Stage = 0;
  state.PendingModifier = false;
  state.Done = false;
  state.DoneAt = -1;
  state.Rejected = false;
}
for (let at = state.Checked; at <= tokenIndex; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (state.Done) {
    // 已经认下 `class`：后面的名字 / 类型参数 / heritage / 类体都归壳，不再判。
    continue;
  }
  if (unit instanceof EndOfFileTokenShape) {
    // 文件到头了：`class` 关键字还没出现，这条声明不可能再成立。
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 0) {
    if (unit instanceof Common) {
      const text = (unit as Common).TempToString();
      if (text === "declare" || text === "abstract") {
        // 修饰词先挂起：`abstract` ⏎ `class A {}` 在 TS 里是两条（修饰词自成一条表达式语句）。
        // 换行与否要等 `class` 那一格才能判（ComputeByIndex 只看得到已到达的单元）。
        state.PendingModifier = true;
        continue;
      }
      if (text === "class") {
        // 修饰词与 `class` 之间换行：TS 的 ASI 把修饰词收成独立 ExpressionStatement，
        // `class` 另起一条声明。本候选退出，交给根级边界收尾。
        if (state.PendingModifier && ClassDeclarationRule.HasLineBreakBefore(units, at)) {
          state.Rejected = true;
          continue;
        }
        state.Stage = 4;
        state.Done = true;
        state.DoneAt = at;
        continue;
      }
    }
    if (unit instanceof Symbol && (unit as Symbol).Is("@")) {
      state.Stage = 6;
      continue;
    }
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 6) {
    if (unit instanceof Common) {
      const text = (unit as Common).TempToString();
      if (text === "class") {
        state.Stage = 4;
        state.Done = true;
        state.DoneAt = at;
        continue;
      }
      if (text === "declare" || text === "abstract") {
        state.Stage = 1;
        continue;
      }
      // 其它声明族的关键字（非成员名位置）说明这不是 class 声明：退出，避免与
      // Interface / TypeAlias / ModuleDeclaration 候选在装饰器前缀后共存。
      let previous = at - 1;
      while (previous >= 0 && units[previous].IsTriviaToken) {
        previous--;
      }
      let afterDot = false;
      if (previous >= 0 && units[previous] instanceof Symbol) {
        const previousText = (units[previous] as Symbol).TempToString();
        afterDot = previousText === "." || previousText === "?.";
      }
      if (!afterDot && (text === "interface" || text === "type" || text === "namespace"
        || text === "module" || text === "enum" || text === "function"
        || text === "const" || text === "let" || text === "var" || text === "global")) {
        state.Rejected = true;
        continue;
      }
      continue;
    }
    if (unit instanceof Symbol || unit instanceof Bracket) {
      continue;
    }
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 1) {
    if (unit instanceof Common && (unit as Common).Is("class")) {
      state.Stage = 4;
      state.Done = true;
      state.DoneAt = at;
      continue;
    }
    state.Rejected = true;
    continue;
  }
  state.Rejected = true;
}
state.Checked = tokenIndex + 1;
if (state.Rejected) {
  return ShapeStates.Reject;
}
if (state.Done) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:ItemSlotCache, context:SyntaxContext)=>bool

只要已经认下 `class` 就能建壳：建壳时机由 `RootRuleTable` 的唯一候选决定（`@dec class` 这类前缀要等其它候选都退出，
可能晚一两格），壳从 `state.Start` 起把已经攒下的代码单元全收进去。

```ts
const state = cache.GetState<ClassDeclarationScan>(this.Slot());
return state !== null && state.Done && !state.Rejected;
```

## method BuildByIndex:(host:Token, tokenIndex:int, table:RootRuleTable, context:SyntaxContext)=>Token

把 `class` 关键字的这一格变成**挂载的壳**：把 `state.Start..tokenIndex` 的单元原样搬进壳的 `Data`、签入，然后让壳
挂到宿主上接管后续字符（`DeclarationShellUtil.MountShell`）。

壳的 `Pos` 由 `MountShell` 按「`state.Start` 前面最近一个非 trivia 单元的 `EndIndex`」算出来——与
`FromUnits` 的口径一致。

```ts
const state = table.Cache.GetState<ClassDeclarationScan>(this.Slot());
const start = state === null ? ItemUtil.ItemStart(host.Data) : state.Start;
if (start < 0 || start > tokenIndex) {
  return host;
}
const shell = new ClassDeclarationShape(host.Template);
return DeclarationShellUtil.MountShell(host, start, tokenIndex, shell, context);
```
