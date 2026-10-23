# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { AngleJudge } from "./angle-judge.xl.md"
import { MemberBoundary, MemberBoundaryScan } from "./member-boundary.xl.md"
import { PropertySignatureShape } from "./property-signature-shape.xl.md"
import { TypeBuilder } from "./type-builder.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

# class MemberPossibleScan

接口 / 对象类型体里「当前成员」的判定状态。**七个成员候选共用这一份**：候选目录里每个形状都在同一个 `PossibleShapeCache` 里读写，键固定为 `MemberPossibleUtil.CacheKey`——同一次判定里只有一个形状真的去扫，其余直接读结论。

`Start` 是当前条目在宿主 `Data` 里的起点（`ItemUtil.ItemStart`），`Checked` 是已经扫到的 `tokenIndex + 1`；`Kinds` 是「还可能的成员种类」（见 `MemberPossibleUtil` 的 `Kind` 常量，空数组表示前缀已经不可能构成任何成员），`Complete` / `End` 是「当前成员已经收住、`End` 是代码单元下标」的结论，`CodeAt` 把代码单元下标映射回宿主 `Data` 下标（建形状时 `splice` 用）。

## field Start:int = -1

当前条目在宿主 `Data` 里的起点（`ItemUtil.ItemStart`）。

## field Checked:int = -1

已经扫到的 `tokenIndex + 1`；更小的下标直接复用结论。

## field Complete:bool = false

当前成员是否已经收住（边界确定）。

## field End:int = -1

成员最后一个代码单元的下标（`CodeAt` 的下标，不是宿主下标）；`-1` 表示还没收住。

## field Kinds:Array<int> = []

还可能的成员种类（`MemberPossibleUtil` 的 `Kind` 常量）；空数组表示前缀已不可能构成任何成员。

## field CodeAt:Array<int> = []

代码单元下标 → 宿主 `Data` 下标的映射（`BuildByIndex` 的 `splice` 用）。

## field Code:Array<Token> = []

已扫过的**代码单元**（非 trivia），下标与 `CodeAt` 一一对应。增量维护：新单元只 `push`，不从 `Start` 重建。

## field Angle:int = 0

已扫过的代码单元前缀的**未闭合 `<` 层数**（与 `MemberPossibleUtil.AngleDepth` / `AngleJudge.ScanDepth` 同口径，夹 0）。增量维护：每追加一个代码单元折一次。

## field BoundaryScan:MemberBoundaryScan = new MemberBoundaryScan()

成员边界的**增量扫描状态**：`Boundary` 是已经找到的下一个成员起点，`Checked` 是下一个待判位置。语义与 `MemberBoundary.FindTypeMemberBoundary(Code, 0)` 的全量重算逐 token 等价。

# class MemberItemStartShared

`PossibleShapeCache.Share` 里的**条目起点**（`ItemUtil.ItemStart`）长期缓存：一个接口体括号的 `CatalogGuide` 生命周期内，七类成员候选共用同一份。

为什么需要它：`Scan` 在每个 basic token 关闭时被七类候选**各调一次**，而 `ItemUtil.ItemStart` 要从 `Data` 尾部倒扫 O(k)——七个候选各扫一遍就是 7×O(k)，长成员上退化成二次。条目起点只在「上一条成员被 `splice` 顶替」时才前进一格，所以把它放进 `Share`，七类候选的 `BuildByIndex` 都在 `splice` 之后统一调 `MemberPossibleUtil.UpdateItemStartAfterBuild` 就地更新成 `start + 1`；`Scan` 首行只做 O(1) 新鲜度校验。

**新鲜度判据**（`Share` 不受 `Reset` 清空，必须逐项校验）：

- `Host === units`：缓存属于同一个宿主 `Data` 数组（跨宿主不会串）；
- `Start` 落在 `[0, units.length]`；
- `Start > 0` 时 `units[Start - 1]` 必须**不是** basic token——条目起点前面最近一格只能是已经建好的形状；
- `Start < units.length` 时 `units[Start]` 必须**不是**已建好的形状——若恰好在 `Start` 上坐着形状，说明上一条成员刚被 `splice` 顶替而 `Share` 还没更新（漏调 `UpdateItemStartAfterBuild`，或更新写在别的宿主数组上），缓存失效、退回倒扫兜底。

## field Host:Array<Token> = []

这份共享数据服务的宿主 `Data` 数组（引用同一性校验）。

## field Start:int = 0

当前条目在 `Host` 里的起点（`ItemUtil.ItemStart`）。

## field Valid:bool = false

是否已经写过一份有效值；`false` 时直接退回 `ItemUtil.ItemStart`。

# class MemberPossibleUtil

对象类型成员候选的公共判据。成员边界与 TS 同口径：**类型是贪心解析的**，但成员与成员之间的分界由 `MemberBoundary.FindMemberBoundary` 回答（换行 + 前一个单元能收住类型 + 当前单元像成员起点），显式 `;` / `,` 是确定边界，容器收口字符（`}` / `]` / `)` / `>` / EOF）也是确定边界。

判定本身**不建任何形状、也不解析类型**：只做「前缀是不是这个成员 / 收住了没有 / 是哪一类」的词的层面判断；真正的形状由被选中的候选在自己的 `BuildByIndex` 里用 `TypeBuilder.ParseTypeMember()` 建。

## static field CacheKey:string = "MemberPossible"

七个候选共用的缓存键。

## static field ItemStartKey:string = "MemberPossible.ItemStart"

条目起点在 `PossibleShapeCache.Share` 里的键（值类型 `MemberItemStartShared`）。

## static field PropertyKind:int = 1

属性签名（`a: A` / `a?: A` / `readonly a: A` / `[expr]: A`）。

## static field MethodKind:int = 2

方法签名（`m(): A` / `m?<T>(): A` / `[expr](): A`）。

## static field IndexKind:int = 3

索引签名（`[k: string]: A`）。

## static field CallKind:int = 4

调用签名（`(a: A): B` / `<T>(a: T): B`）。

## static field ConstructKind:int = 5

构造签名（`new (a: A): B` / `new <T>(a: T): B`）。

## static field GetKind:int = 6

`get` 访问器（`get x(): A`）。

## static field SetKind:int = 7

`set` 访问器（`set x(v: A)`）。

## static method AllKinds:()=>Array<int>

七类全可能。返回**新数组**，判定状态各持一份，避免共享后被就地改。

```ts
return [
  MemberPossibleUtil.PropertyKind,
  MemberPossibleUtil.MethodKind,
  MemberPossibleUtil.IndexKind,
  MemberPossibleUtil.CallKind,
  MemberPossibleUtil.ConstructKind,
  MemberPossibleUtil.GetKind,
  MemberPossibleUtil.SetKind,
];
```

## static method OnlyKind:(kind:int)=>Array<int>

只可能这一类。

```ts
return [kind];
```

## static method HasKind:(kinds:Array<int>, kind:int)=>bool

`kinds` 里有没有 `kind`。

```ts
for (const item of kinds) {
  if (item === kind) {
    return true;
  }
}
return false;
```

## static method TextOf:(unit:Token)=>string

代码单元的文本：保留字 / 标识符 / 符号取 `TempToString()`；字符串与括号只给占位串（成员判型只关心「是不是名字 / 是不是括号」）。

```ts
if (unit instanceof Common) {
  return (unit as Common).TempToString();
}
if (unit instanceof Symbol) {
  return (unit as Symbol).TempToString();
}
if (unit instanceof String) {
  return "string";
}
if (unit instanceof Bracket) {
  return "bracket";
}
return "";
```

## static method IsSeparator:(unit:Token)=>bool

成员之间的显式分隔符 `;` / `,`。

```ts
if (!(unit instanceof Symbol)) {
  return false;
}
return (unit as Symbol).Is(";") || (unit as Symbol).Is(",");
```

## static method HasParameterList:(code:Array<Token>, last:int)=>bool

`code[0 .. last]`（当前成员自己的消费范围）里有没有参数表 `(` 括号：有就说明这一格已经走到
「名字 + 参数表」的方法形态，收住时不能再把它收敛成属性签名。

只看成员自己的范围，不看后面的代码单元——`readonly` ⏎ `[Symbol.iterator](): T` 里那个 `(`
属于**下一个**成员，拿它当证据会把 `readonly` 误判成方法。

```ts
for (let cursor = 0; cursor <= last && cursor < code.length; cursor++) {
  const unit = code[cursor];
  if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "(") {
    return true;
  }
}
return false;
```

## static method IsNameToken:(unit:Token)=>bool

能不能当成员名：标识符 / 字符串字面量 / 计算名 `[...]`。

```ts
if (unit instanceof Common || unit instanceof String) {
  return true;
}
return unit instanceof Bracket && (unit as Bracket).StartBracketChar === "[";
```

## static method IsIndexBracket:(bracket:Bracket)=>bool

`[...]` 是索引签名还是计算属性名：与 `TypeBuilder.ParseTypeMember()` 同口径——括号内第二个代码单元是 `:` 是索引，空括号也按索引（TS 的 recovery）。

```ts
const inner:Array<Token> = [];
for (const item of bracket.Data) {
  if (!item.IsTriviaToken) {
    inner.push(item);
  }
}
if (inner.length === 0) {
  return true;
}
if (inner.length >= 2 && MemberPossibleUtil.TextOf(inner[1]) === ":") {
  return true;
}
return false;
```

## static method NextChar:(last:Source | null)=>string

`last` 之后的下一个字符，跳过空白与 `//` / `/* */` 注释；越界返回空串。

成员收口判据要用它回答「最后一个代码单元后面是不是容器的收口字符」——那个字符可能还没被 token 化。

```ts
if (last === null) {
  return "";
}
const document = last.Document;
const count = document.GetCount();
let at = last.Index + 1;
while (at < count) {
  const ch = document.At(at).Value;
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\v"
    || ch === "\f" || ch === "\u2028" || ch === "\u2029") {
    at++;
    continue;
  }
  if (ch === "/" && at + 1 < count) {
    const next = document.At(at + 1).Value;
    if (next === "/") {
      at += 2;
      while (at < count && document.At(at).Value !== "\n") {
        at++;
      }
      continue;
    }
    if (next === "*") {
      at += 2;
      while (at + 1 < count && !(document.At(at).Value === "*" && document.At(at + 1).Value === "/")) {
        at++;
      }
      at += 2;
      continue;
    }
  }
  return ch;
}
return "";
```

## static method AngleDepth:(code:Array<Token>)=>int

当前成员前缀里**未闭合的 `<` 层数**。数角口径与 `AngleJudge.ScanDepth` 完全一致（`>>` / `>>>` 是 basic token 的合符号，按层一次出 2 / 3 层，深度夹在 0 以上），因为 TypeBuilder / AngleJudge 也用同一口径。

成员自身的类型实参 `a: Foo<A>`、方法类型参数表 `m<T>(x: T): U` 里的 `<...>` 会被它数出来；只有深度为 0 时，`>` 和 `,` 才可能是本层的收口证据。

```ts
let depth = 0;
for (const unit of code) {
  depth = AngleJudge.ScanDepth(unit, depth);
}
return depth;
```

## static method IsCompletionBoundary:(ch:string)=>bool

容器收口字符：成员到这里一定结束了，而且后面不会再有本层的代码单元。

`;` / `,` **不在这里**：它们是显式分隔符，要等它们自己被 token 化、作为成员末尾消费进区间（与 `TypeBuilder.SpanTypeMember` 同口径）。

`>` **只在当前前缀没有未闭合 `<` 时**才是收口证据：`a: Foo<A>` 里的 `>` 属于成员自己的类型实参，不能提前收口。`Analyze` 用 `AngleDepth` 做这道门，本方法只回答「字符本身是不是收口字符」。

```ts
return ch === "" || ch === "}" || ch === "]" || ch === ")" || ch === ">";
```

## static method ClassifyHead:(code:Array<Token>)=>Array<int>

只看**已攒下的代码单元前缀**，回答「当前成员可能是哪几类」。信息不足时给多个可能（候选项继续等），已经能定死时给一类，明显不可能时给空数组。

前缀阶段的修饰词与 `TypeBuilder.ParseTypeMember()` 同口径：

- `readonly` 只有「同一行 + 后面跟名字 / 字符串名 / 计算名」时才是修饰词；换行时 TS 按 ASI 把 `readonly` 收成成员名（`readonly` ⏎ `readonly: number` 是两个成员）。
- `abstract` 只有后面紧跟 `new` 时才算构造签名的修饰词。

```ts
const ALL:Array<number> = MemberPossibleUtil.AllKinds();
if (code.length === 0) {
  return ALL;
}
let at = 0;
while (at < code.length) {
  const unit = code[at];
  const text = MemberPossibleUtil.TextOf(unit);
  if (text === "readonly") {
    if (at + 1 >= code.length) {
      return ALL;
    }
    const following = code[at + 1];
    if (MemberPossibleUtil.IsNameToken(following)
      && !MemberBoundary.HasLineBreakBetween(unit, following)) {
      at++;
      continue;
    }
    break;
  }
  if (text === "abstract") {
    if (at + 1 >= code.length) {
      return ALL;
    }
    if (MemberPossibleUtil.TextOf(code[at + 1]) === "new") {
      at++;
      continue;
    }
    break;
  }
  break;
}
if (at >= code.length) {
  return ALL;
}
const unit = code[at];
if (unit instanceof Bracket) {
  const bracket = unit as Bracket;
  if (bracket.Is("(", ")")) {
    return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.CallKind);
  }
  if (bracket.Is("[", "]")) {
    if (MemberPossibleUtil.IsIndexBracket(bracket)) {
      return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.IndexKind);
    }
    let cursor = at + 1;
    if (cursor < code.length) {
      const markText = MemberPossibleUtil.TextOf(code[cursor]);
      if (markText === "?" || markText === "?:") {
        cursor++;
      }
    }
    if (cursor >= code.length) {
      return [MemberPossibleUtil.PropertyKind, MemberPossibleUtil.MethodKind];
    }
    const after = code[cursor];
    if (after instanceof Bracket && (after as Bracket).Is("(", ")")) {
      return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.MethodKind);
    }
    if (MemberPossibleUtil.TextOf(after) === "<") {
      return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.MethodKind);
    }
    return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.PropertyKind);
  }
  return [];
}
const text = MemberPossibleUtil.TextOf(unit);
if (text === "<") {
  return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.CallKind);
}
if (text === "new") {
  if (at + 1 >= code.length) {
    return [MemberPossibleUtil.PropertyKind, MemberPossibleUtil.ConstructKind];
  }
  const following = code[at + 1];
  if (following instanceof Bracket && (following as Bracket).Is("(", ")")) {
    return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.ConstructKind);
  }
  if (MemberPossibleUtil.TextOf(following) === "<") {
    return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.ConstructKind);
  }
  return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.PropertyKind);
}
if (text === "get" || text === "set") {
  const accessorKind = text === "get" ? MemberPossibleUtil.GetKind : MemberPossibleUtil.SetKind;
  if (at + 1 >= code.length) {
    return ALL;
  }
  const nameUnit = code[at + 1];
  const nameText = MemberPossibleUtil.TextOf(nameUnit);
  if (nameUnit instanceof Bracket && (nameUnit as Bracket).Is("(", ")")) {
    return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.MethodKind);
  }
  if (nameText === ":" || nameText === ";" || nameText === ",") {
    return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.PropertyKind);
  }
  if (nameText === "?" || nameText === "?:") {
    // `get?` / `set?`：`?` 紧跟在访问器关键字后面，访问器这一类已经不成立
    //（访问器的形态是「get 名字 (`」），`get` / `set` 只能是成员名，
    // 所以这里按「名字 + 可选标记」的同一套判据往下看：
    // `get?(this: This): Value` 是 MethodSignature（名字 get），`get?: A` 是 PropertySignature。
    let cursor = at + 2;
    if (cursor >= code.length) {
      return [MemberPossibleUtil.PropertyKind, MemberPossibleUtil.MethodKind];
    }
    const afterMark = code[cursor];
    if (afterMark instanceof Bracket && (afterMark as Bracket).Is("(", ")")) {
      let methodLike = false;
      if (cursor + 1 < code.length) {
        methodLike = MemberPossibleUtil.TextOf(code[cursor + 1]) === ":";
      } else {
        methodLike = MemberPossibleUtil.NextChar((afterMark as Bracket).SourceRange.End) === ":";
      }
      if (methodLike) {
        return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.MethodKind);
      }
      return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.PropertyKind);
    }
    if (MemberPossibleUtil.TextOf(afterMark) === "<") {
      return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.MethodKind);
    }
    return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.PropertyKind);
  }
  if (!MemberPossibleUtil.IsNameToken(nameUnit)) {
    return [MemberPossibleUtil.PropertyKind, MemberPossibleUtil.MethodKind];
  }
  if (at + 2 >= code.length) {
    return [
      MemberPossibleUtil.PropertyKind,
      MemberPossibleUtil.MethodKind,
      accessorKind,
    ];
  }
  const bracketUnit = code[at + 2];
  if (bracketUnit instanceof Bracket && (bracketUnit as Bracket).Is("(", ")")) {
    return MemberPossibleUtil.OnlyKind(accessorKind);
  }
  return [MemberPossibleUtil.PropertyKind, MemberPossibleUtil.MethodKind];
}
if (unit instanceof Common || unit instanceof String) {
  let cursor = at + 1;
  if (cursor >= code.length) {
    return [MemberPossibleUtil.PropertyKind, MemberPossibleUtil.MethodKind];
  }
  const markText = MemberPossibleUtil.TextOf(code[cursor]);
  if (markText === "?" || markText === "?:") {
    cursor++;
    if (cursor >= code.length) {
      return [MemberPossibleUtil.PropertyKind, MemberPossibleUtil.MethodKind];
    }
    const after = code[cursor];
    if (after instanceof Bracket && (after as Bracket).Is("(", ")")) {
      let methodLike = false;
      if (cursor + 1 < code.length) {
        methodLike = MemberPossibleUtil.TextOf(code[cursor + 1]) === ":";
      } else {
        methodLike = MemberPossibleUtil.NextChar((after as Bracket).SourceRange.End) === ":";
      }
      if (methodLike) {
        return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.MethodKind);
      }
      return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.PropertyKind);
    }
    if (MemberPossibleUtil.TextOf(after) === "<") {
      return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.MethodKind);
    }
    return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.PropertyKind);
  }
  if (code[cursor] instanceof Bracket && (code[cursor] as Bracket).Is("(", ")")) {
    return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.MethodKind);
  }
  if (MemberPossibleUtil.TextOf(code[cursor]) === "<") {
    return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.MethodKind);
  }
  if (MemberPossibleUtil.TextOf(code[cursor]) === ":") {
    return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.PropertyKind);
  }
  return [MemberPossibleUtil.PropertyKind, MemberPossibleUtil.MethodKind];
}
return [];
```

## static method Analyze:(state:MemberPossibleScan)=>void

把「当前成员」的结论写进 `state`：可能种类 + 是否收住 + 收在哪个代码单元。

收住的三条证据（都与 `TypeBuilder.ParseTypeMember()` 的分界同口径）：

1. `MemberBoundary.FindTypeMemberBoundary` 在已攒下的前缀里找到了下一个成员的起点——前一个成员到此为止
   （对象类型成员的起点集合比 class 体多 `(` / `<`：调用/构造签名换行后紧随的 `(): A`、`<T>` 是新成员）；
2. 最后一个代码单元是 `;` / `,`——显式分隔符（它自己要被吃进成员区间）；
3. 最后一个代码单元之后的下一个字符是容器收口字符——本层不会再有代码单元。

**三条证据都只在角括号深度为 0 时生效**（`AngleDepth` 与 `AngleJudge.ScanDepth` 同口径）：成员自身的 `<...>` 里，`a: Foo<A>` 的 `>` 和 `m<T, U>(x: T): U` 类型参数表里的 `,` 都是成员内部结构，不是本层收口证据；深度 > 0 时宁可让候选多等一格，由闭合后的 `;` / `,` / 下一成员起点 / 容器收口来收。收口字符 `>` 也一样：只有它闭合的是**外层**、不是成员自己数出来的那层时才算数。

收住时可能种类已经定死；仍多值时按「有没有参数表」收敛：**有参数表 `(` 就是方法签名**
（`get?(this: This): Value` 这种「名字 + 可选标记 + 参数表」，`get` 只能是名字），
**没有参数表才收成属性签名**（`interface I { a }` 这种无类型属性）。

```ts
const code = state.Code;
state.Complete = false;
state.End = -1;
if (code.length === 0) {
  state.Kinds = MemberPossibleUtil.AllKinds();
  return;
}
if (MemberPossibleUtil.IsSeparator(code[0])) {
  // 纯分隔符条目：没有成员可以建，留给容器收口时的兜底解析。
  state.Kinds = MemberPossibleUtil.AllKinds();
  return;
}
const head = MemberPossibleUtil.ClassifyHead(code);
if (head.length === 0) {
  state.Kinds = [];
  return;
}
const last = code[code.length - 1];
// 边界与角深度都由增量状态给出（`ScanBoundary` / `Extend` 维护）：
// 与 `MemberBoundary.FindTypeMemberBoundary(code, 0)`、`MemberPossibleUtil.AngleDepth(code)` 的全量重算逐 token 等价。
const boundary = state.BoundaryScan.Boundary < 0 ? code.length : state.BoundaryScan.Boundary;
// 成员自身 <...> 里的 `>` / `,` 不是本层收口证据：深度 > 0 时三条证据全部不生效。
const angle = state.Angle;
let complete = false;
let end = -1;
if (angle === 0) {
  if (boundary < code.length) {
    complete = true;
    end = boundary - 1;
  } else if (MemberPossibleUtil.IsSeparator(last)) {
    complete = true;
    end = code.length - 1;
  } else if (MemberPossibleUtil.IsCompletionBoundary(MemberPossibleUtil.NextChar(last.SourceRange.End))) {
    complete = true;
    end = code.length - 1;
  }
}
let kinds = head;
if (complete && kinds.length > 1 && MemberPossibleUtil.HasKind(kinds, MemberPossibleUtil.PropertyKind)) {
  if (MemberPossibleUtil.HasKind(kinds, MemberPossibleUtil.MethodKind)
    && MemberPossibleUtil.HasParameterList(code, end)) {
    kinds = MemberPossibleUtil.OnlyKind(MemberPossibleUtil.MethodKind);
  } else {
    kinds = MemberPossibleUtil.OnlyKind(MemberPossibleUtil.PropertyKind);
  }
}
state.Kinds = kinds;
state.Complete = complete && end >= 0;
state.End = end;
```

## static method Extend:(state:MemberPossibleScan, units:Array<Token>, tokenIndex:int)=>void

把 `state.Checked`（新条目从 `Start` 起）之后的新单元**追加**进 `state.Code` / `state.CodeAt`，同时把每个新代码单元折进 `state.Angle`。

只追加、不重建：一次判定里 7 个候选共用同一份状态，只有第一个问到的形状会走到这里；其余 6 个在 `state.Checked > tokenIndex` 时直接读结论。

```ts
let from = state.Checked;
if (from < state.Start) {
  from = state.Start;
}
for (let at = from; at <= tokenIndex; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  state.Code.push(unit);
  state.CodeAt.push(at);
  state.Angle = AngleJudge.ScanDepth(unit, state.Angle);
}
```

## static method ScanBoundary:(state:MemberPossibleScan)=>void

成员边界的增量推进：转调 `MemberBoundary.ScanTypeMemberBoundary`（判据与 `FindTypeMemberBoundary` 逐条相同，带 lookahead 的末位复查也在那里）。

```ts
MemberBoundary.ScanTypeMemberBoundary(state.Code, state.BoundaryScan);
```

## static method ItemStartValid:(units:Array<Token>, shared:MemberItemStartShared)=>bool

`Share` 里那份条目起点还新不新鲜（判据见 `MemberItemStartShared`）。校验是 O(1)：只看 `Start` 前后各一格，不从头扫。

```ts
if (!shared.Valid) {
  return false;
}
if (shared.Host !== units) {
  return false;
}
if (shared.Start < 0 || shared.Start > units.length) {
  return false;
}
if (shared.Start > 0 && units[shared.Start - 1].IsBasicToken) {
  return false;
}
if (shared.Start < units.length) {
  const atStart = units[shared.Start];
  if (!atStart.IsTriviaToken) {
    return atStart.IsBasicToken;
  }
}
return true;
```

## static method ItemStartOf:(units:Array<Token>, cache:PossibleShapeCache)=>int

条目起点：先问 `Share`（O(1) 校验命中就免倒扫），失效才 `ItemUtil.ItemStart` 倒扫一次并写回 `Share`。

```ts
let shared = cache.GetShare<MemberItemStartShared>(MemberPossibleUtil.ItemStartKey);
if (shared !== null && MemberPossibleUtil.ItemStartValid(units, shared)) {
  return shared.Start;
}
const start = ItemUtil.ItemStart(units);
if (shared === null) {
  shared = new MemberItemStartShared();
  shared.Host = units;
  shared.Start = start;
  shared.Valid = true;
  cache.SetShare(MemberPossibleUtil.ItemStartKey, shared);
} else {
  shared.Host = units;
  shared.Start = start;
  shared.Valid = true;
}
return start;
```

## static method UpdateItemStartAfterBuild:(cache:PossibleShapeCache, host:Token, start:int)=>void

`BuildByIndex` 在 `host.Data.splice(...)` **之后**调用：被建的形状正好坐在 `start` 上，条目起点前进一格，下一次 `Scan` 的 O(1) 新鲜度校验就能命中。

七个成员候选（属性 / 方法 / 索引 / 调用 / 构造 / get / set）建完形状后都调这一份，而不是各写一遍：`Share` 里的条目起点是七者共用的一份事实源，写回口径必须逐字一致——`Host` 换成新的 `host.Data` 数组（`splice` 是原地改，但引用仍取宿主）、`Start = start + 1`、`Valid = true`。`Share` 里还没有值（`null`）时不新建：没有读者曾经问过，`ItemStartOf` 的倒扫会自己写下第一份。

不调它的后果是**正确但慢**：`splice` 之后 `units[start]` 变成已建好的形状，`ItemStartValid` 的第三、四条判据立刻失配，于是下一次 `Scan` 退回 `ItemUtil.ItemStart` 的 O(成员长) 倒扫——这正是本次推广要消掉的那次重扫。

```ts
const shared = cache.GetShare<MemberItemStartShared>(MemberPossibleUtil.ItemStartKey);
if (shared !== null) {
  shared.Host = host.Data;
  shared.Start = start + 1;
  shared.Valid = true;
}
```

## static method Scan:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>MemberPossibleScan

拿宿主攒下的 `Data` 与当前下标，取（必要时**增量推进**）当前成员的判定状态。

缓存以 `CacheKey` 为键只存一份：七个候选在同一次判定里共享，第一个问到的形状推进一次，其余直接读。

- `state === null`：新条目（首次判定，或目录复位后）。条目起点先问 `Share`（O(1) 新鲜度校验），失效才倒扫一次；
- `state.Checked > tokenIndex + 1`：缓存越过当前下标（防御；正常由 `Reset` 清空）→ 重建；
- `state.Checked <= tokenIndex`：只**追加**新单元（不重建），增量推进 `Angle` 与边界，然后重算收口结论。

```ts
let state = cache.GetState<MemberPossibleScan>(MemberPossibleUtil.CacheKey);
if (state === null || state.Checked > tokenIndex + 1) {
  const start = MemberPossibleUtil.ItemStartOf(units, cache);
  state = new MemberPossibleScan();
  state.Start = start;
  state.Checked = -1;
  state.Complete = false;
  state.End = -1;
  state.Kinds = MemberPossibleUtil.AllKinds();
  state.CodeAt = [];
  state.Code = [];
  state.Angle = 0;
  state.BoundaryScan = new MemberBoundaryScan();
  cache.SetState(MemberPossibleUtil.CacheKey, state);
}
if (state.Checked <= tokenIndex) {
  MemberPossibleUtil.Extend(state, units, tokenIndex);
  MemberPossibleUtil.ScanBoundary(state);
  MemberPossibleUtil.Analyze(state);
  state.Checked = tokenIndex + 1;
}
return state;
```

## static method BasePos:(host:Token, start:int)=>int

成员形状的 `Pos` 口径（与 `InterfaceDeclarationShape.BuildMembers` 的 `builder.Load(bracket.Data, bracket.SourceRange.Start.Index + 1)` 一致）：条目起点前面最近一个非 trivia 单元的 `End.Index + 1`；前面什么都没有时用宿主起点 + 1。

```ts
if (start > 0) {
  for (let at = start - 1; at >= 0; at--) {
    if (!host.Data[at].IsTriviaToken) {
      const previousEnd = host.Data[at].SourceRange.End;
      if (previousEnd !== null) {
        return previousEnd.Index + 1;
      }
      break;
    }
  }
}
if (host.SourceRange.Start === null) {
  return 0;
}
return host.SourceRange.Start.Index + 1;
```

## static method MemberParsedWhole:(builder:TypeBuilder, consumedLength:int)=>bool

`TypeBuilder.ParseTypeMember()` 是否**恰好**把这一条判定区间整段读完（没有 leftover、消费范围与判定一致）。

`Analyze` 的第三条收口证据（最后一个单元后面是容器收口字符）只保证「到容器收口为止没有更多代码单元」，它无法排除**同一行里挤了多条成员**：`interface I { a: number b: string }` 里 TS 不插 ASI，但类型解析在 `number` 处就收住、`b` 是下一条成员。返回 `false` 就表示这一段其实不止一条成员（或消费范围与判定不一致）：调用方**不建、不 `splice`**，把 raw 代码原样留给容器收口时的 `BuildMembers`（接口体 `CollectBodyMembers` 的 raw 尾巴）按重构前逐成员口径重新解析——恢复行为与 55578b9a 一致。

只有返回 `true` 的整段解析才值得做「产出形状必须是自己这一类」的断言：那时形状不对是真的判型 bug，不是成员边界问题，仍然直接抛错。

```ts
if (builder.At !== builder.Units.length) {
  return false;
}
if (builder.OriginalConsumed() !== consumedLength) {
  return false;
}
return true;
```

# class PropertySignaturePossibleShape extends PossibleShape

```txt
interface I { a: number; }
interface I { a?: A; }
interface I { readonly b: B; }
interface I { [expr]: A; }
interface I { "abort": Event }
```

对象类型里的属性签名候选：`readonly` 修饰词、可选 `?`、计算属性名 `[expr]`、字符串 / 数字字面量名、任意类型、成员边界 `;` / `,` / 换行 / 容器收口。

判定与建形状分离：`ComputeByIndex` 只读 `MemberPossibleUtil.Scan` 的结论（可能种类里没有属性签名就 `Reject`；收住了就 `Accept`），消费范围由扫描状态的 `End` 给，`BuildByIndex` 才用 `TypeBuilder.ParseTypeMember()` 建一次形状并断言产出的是 `PropertySignatureShape`。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

只读共享扫描结论：可能种类里没有属性签名就 `Reject`；收住了就 `Accept`；其余 `Uncertain`（继续等）。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const state = MemberPossibleUtil.Scan(units, tokenIndex, cache);
if (!MemberPossibleUtil.HasKind(state.Kinds, MemberPossibleUtil.PropertyKind)) {
  return ShapeStates.Reject;
}
if (state.Complete) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

收住了才建：`;` / `,` / 下一个成员起点 / 容器收口，三选一的证据在 `Analyze` 里已经算好。

```ts
const state = cache.GetState<MemberPossibleScan>(MemberPossibleUtil.CacheKey);
if (state === null) {
  return false;
}
return state.Complete && state.End >= 0
  && MemberPossibleUtil.HasKind(state.Kinds, MemberPossibleUtil.PropertyKind);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

消费 `state.Start .. CodeAt[state.End]` 这一段（含成员自己的 `;` / `,`），用 `TypeBuilder.ParseTypeMember()` 建出属性签名，然后 `host.Data.splice(start, consumed, shape)` 原地顶替。

成员区间尾部的 trivia 不属于成员：`splice` 只吃到最后一个代码单元，后面的 trivia 留给下一条目当先行 trivia（下一条目的 `Pos` 由 `BasePos` 按「前一个非 trivia 单元」算，与整段解析同口径）。

读不完 / 消费范围不一致时**不顶替**，raw 代码原样留给收口时的 `BuildMembers`（见 `MemberPossibleUtil.MemberParsedWhole`）。

```ts
const state = catalog.PossibleShapesComputeCache.GetState<MemberPossibleScan>(MemberPossibleUtil.CacheKey);
if (state === null || state.End < 0 || state.End >= state.CodeAt.length) {
  throw new Error("PropertySignaturePossibleShape.BuildByIndex: 判定状态缺失");
}
const start = state.Start;
const end = state.CodeAt[state.End];
if (start < 0 || end < start) {
  return host;
}
const basePos = MemberPossibleUtil.BasePos(host, start);
const consumed:Array<Token> = host.Data.slice(start, end + 1);
const builder = new TypeBuilder(host.Template, context);
builder.Load(consumed, basePos);
const built = builder.ParseTypeMember();
if (!MemberPossibleUtil.MemberParsedWhole(builder, consumed.length)) {
  return host;
}
if (!(built instanceof PropertySignatureShape)) {
  throw new Error("PropertySignaturePossibleShape.BuildByIndex: 产出不是 PropertySignatureShape");
}
host.Data.splice(start, consumed.length, built);
// Share 由 Build 阶段更新：条目起点前进一格（被建的形状正好坐在 start 上）。
MemberPossibleUtil.UpdateItemStartAfterBuild(catalog.PossibleShapesComputeCache, host, start);
built.Parent = host;
return built;
```
