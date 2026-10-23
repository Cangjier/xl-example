# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ItemScanState } from "../../../core/syntax/batch/item-scan-state.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ClassDeclarationShape } from "../declarations/class-declaration-shape.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { AngleJudge } from "../types/angle-judge.xl.md"
import { MemberBoundary, MemberBoundaryScan } from "../types/member-boundary.xl.md"
import { SourceRange } from "../../../core/syntax/source-range.xl.md"
```

# namespace cangjie

# class ClassMemberPossibleScan

类体里「当前成员」的判定状态。**所有类体成员候选共用这一份**：候选目录里每个形状都在同一个 `PossibleShapeCache` 里读写，键固定为 `ClassMemberPossibleUtil.CacheKey`——同一次判定里只有一个形状真的去扫，其余直接读结论。

`Start` 是当前条目在宿主 `Data` 里的起点（`ItemUtil.ItemStart`），`Checked` 是已经扫到的 `tokenIndex + 1`；`Kinds` 是「还可能的成员种类」（见 `ClassMemberPossibleUtil` 的 `Kind` 常量），`Complete` / `End` 是「当前成员已经收住、`End` 是代码单元下标」的结论，`CodeAt` 把代码单元下标映射回宿主 `Data` 下标（建形状时 `splice` 用）。

判定状态与接口体成员（`MemberPossibleScan`）同构，但**判据是 class 体的**：分界用 `MemberBoundary.FindMemberBoundary`（不是对象类型的 `FindTypeMemberBoundary`——class 体里换行后的 `(` / `<` 可能是上一行初始化器的续接），成员种类是 `ClassDeclarationShape.BuildMembers` 会建出的那几类。

## field Start:int = -1

当前条目在宿主 `Data` 里的起点（`ItemUtil.ItemStart`）。

## field Checked:int = -1

已经扫到的 `tokenIndex + 1`；更小的下标直接复用结论。

## field Complete:bool = false

当前成员是否已经收住（边界确定）。

## field End:int = -1

成员最后一个代码单元的下标（`CodeAt` 的下标，不是宿主下标）；`-1` 表示还没收住。

## field Kinds:Array<int> = []

还可能的成员种类（`ClassMemberPossibleUtil` 的 `Kind` 常量）。**永不返回空数组**：判不清的形态一律给 `AllKinds()`，这是 `CatalogGuide` 0 候选不抛错的全函数性要求（`docs/body-guide-contract.md` §3.1）。

## field CodeAt:Array<int> = []

代码单元下标 → 宿主 `Data` 下标的映射（`BuildByIndex` 的 `splice` 用）。

## field Code:Array<Token> = []

已扫过的**代码单元**（非 trivia），下标与 `CodeAt` 一一对应。增量维护：新单元只 `push`，不从 `Start` 重建。

## field Angle:int = 0

已扫过的代码单元前缀的**未闭合 `<` 层数**（与 `ClassMemberPossibleUtil.AngleDepth` / `AngleJudge.ScanDepth` 同口径，夹 0）。增量维护：每追加一个代码单元折一次。

## field BoundaryScan:MemberBoundaryScan = new MemberBoundaryScan()

class 体成员边界的**增量扫描状态**：`Boundary` 是已经找到的下一个成员起点，`Checked` 是下一个待判位置。语义与 `MemberBoundary.FindMemberBoundary(Code, from)` 的全量重算逐 token 等价（`from` = `BoundaryAnchor`）。

## field BoundaryAnchor:int = -1

增量边界扫描的**锚点**（`FindMemberBoundary` 的 `from`）：非装饰器成员恒为 `0`；装饰器成员是 `DecoratorHeadAt(code)`，随装饰器前缀变长而单调前进。锚点前进**不重扫**（判据只看局部三格，已判为 false 的位置结论不变）；只有锚点后退（理论上不发生）才整段重扫。

# class ClassMemberItemStartShared

`PossibleShapeCache.Share` 里的**条目起点**（`ItemUtil.ItemStart`）长期缓存：一个类体括号的 `CatalogGuide` 生命周期内，全部类体成员候选共用同一份。

为什么需要它：`Scan` 在每个 basic token 关闭时被每个类体候选**各调一次**，而 `ItemUtil.ItemStart` 要从 `Data` 尾部倒扫 O(k)——每个候选各扫一遍就是 k×O(k)，长成员上退化成二次。条目起点只在「上一条成员被 `splice` 顶替」时才前进一格，所以把它放进 `Share`，各候选的 `BuildByIndex` 都在 `splice` 之后统一调 `ClassMemberPossibleUtil.UpdateItemStartAfterBuild` 就地更新成 `start + 1`；`Scan` 首行只做 O(1) 新鲜度校验。

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

# class ClassMemberPossibleUtil

类体成员候选的公共判据。与接口体成员候选（`MemberPossibleUtil`）同构，区别只有两处：

1. **分界**：`MemberBoundary.FindMemberBoundary`（class 体口径）。对象类型那套 `FindTypeMemberBoundary` 把换行后的 `(` / `<` 当新成员起点，而 class 体里它们是值初始化器 / 调用的续接（`a = foo` ⏎ `(x)`、`a = foo` ⏎ `<T>(x)`），用错入口会把一条成员切成两条。
2. **成员种类**：`ClassDeclarationShape.BuildMembers` 会建出的那几类——属性 / 方法 / 构造 / get / set / static 块 / `;` 成员 / 索引签名。判型必须与 `BuildMembers` 逐条对齐：**判定出的种类就是 `BuildMembers` 会产出哪个形状**，否则候选的 `instanceof` 断言会炸。

判定本身**不建任何形状、也不解析类型**：只做「前缀是不是这个成员 / 收住了没有 / 是哪一类」的词的层面判断；真正的形状由被选中的候选在自己的 `BuildByIndex` 里交给 `ClassDeclarationShape.BuildMemberFromCode` 建（复用一次性构建的同一个 `BuildMembers`，见 `class-declaration-shape.xl.md`）。

## static field CacheKey:any = PossibleShape.SlotOf(ClassMemberPossibleScan)

所有类体成员候选共用的缓存槽。**槽号由这一组共同的标识类 `ClassMemberPossibleScan` 发出来**（`PossibleShape.SlotOf`，同一类同号），所以全部类体成员候选读到同一个槽，而不是各自的 `this.Slot()`。

## static field ItemStartKey:any = PossibleShape.SlotOf(ClassMemberItemStartShared)

条目起点在 `PossibleShapeCache.Share` 里的槽（值类型 `ClassMemberItemStartShared`）；槽号由值类型 `ClassMemberItemStartShared` 发出来。标注用 `any` 的理由同 `CacheKey`（xl 的 `E1207` 不认跨类静态调用的返回值）。

## static field PropertyKind:int = 1

属性（`a = 1` / `a: A` / `readonly a?: A` / `a!: A` / `[expr] = 1` / `"x" = 1` / `#x = 1`）。

## static field MethodKind:int = 2

方法（`m() {}` / `m(): void` / `m?<T>(): T` / `*m()` / `async m()` / 计算名方法）。

## static field ConstructorKind:int = 3

构造（`constructor(...) {}`；含修饰词与参数属性，`static constructor` 也归这里——与 `BuildMembers` 的判定一致）。

## static field GetKind:int = 4

`get` 访问器（`get x(): A`）。

## static field SetKind:int = 5

`set` 访问器（`set x(v: A)`）。

## static field StaticBlockKind:int = 6

`static { ... }` 静态块。

## static field SemicolonKind:int = 7

单独的 `;` 成员（`SemicolonClassElement`）。

## static field IndexKind:int = 8

索引签名（`[k: string]: A`）。

## static method AllKinds:()=>Array<int>

八类全可能。返回**新数组**，判定状态各持一份，避免共享后被就地改。

```ts
return [
  ClassMemberPossibleUtil.PropertyKind,
  ClassMemberPossibleUtil.MethodKind,
  ClassMemberPossibleUtil.ConstructorKind,
  ClassMemberPossibleUtil.GetKind,
  ClassMemberPossibleUtil.SetKind,
  ClassMemberPossibleUtil.StaticBlockKind,
  ClassMemberPossibleUtil.SemicolonKind,
  ClassMemberPossibleUtil.IndexKind,
];
```

## static method OnlyKind:(kind:int)=>Array<int>

只可能这一类。

```ts
return [kind];
```

## static method ImplementedKinds:()=>Array<int>

**已经有候选负责建造**的成员种类。兜底候选只在「收住且 Kinds 全部落在这一组里」时退出，把唯一候选让给真正的候选；
新增一个成员候选时，必须把它的种类加进这里（否则兜底候选会挡住它，目录永远到不了唯一候选）。

本阶段（T6b P1）：八类成员全部有候选负责建造——属性 / 方法 / 构造 / get / set / static 块 / 孤立 `;` / 索引签名；
装饰器成员由 `DecoratorHeadAt` 跳过装饰器后按真实成员头判型，同样走增量（判不清时留在 raw 兜底）。

```ts
return [
  ClassMemberPossibleUtil.PropertyKind,
  ClassMemberPossibleUtil.MethodKind,
  ClassMemberPossibleUtil.ConstructorKind,
  ClassMemberPossibleUtil.GetKind,
  ClassMemberPossibleUtil.SetKind,
  ClassMemberPossibleUtil.StaticBlockKind,
  ClassMemberPossibleUtil.SemicolonKind,
  ClassMemberPossibleUtil.IndexKind,
];
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

代码单元的文本：保留字 / 标识符 / 符号取 `TempToString()`；字符串与括号只给占位串（判型只关心「是不是名字 / 是不是括号」）。

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

成员之间的显式分隔符。class 体里只有 `;` 是分隔符（`,` 不是：`class C { a: A, b: B }` 在 TS 里是错误恢复，分界由换行 / 下一成员起点给）。

```ts
if (!(unit instanceof Symbol)) {
  return false;
}
return (unit as Symbol).Is(";");
```

## static method IsCompletionBoundary:(ch:string)=>bool

容器收口字符：成员到这里一定结束了，而且后面不会再有本层的代码单元。

`;` **不在这里**：它是显式分隔符，要等它自己被 token 化、作为成员末尾消费进区间（与 `BuildMembers` 的 `endUnit = code[at]` 同口径）。

`>` **只在当前前缀没有未闭合 `<` 时**才是收口证据：`a: Foo<A>` 里的 `>` 属于成员自己的类型实参；`Analyze` 用 `AngleDepth` 做这道门，本方法只回答「字符本身是不是收口字符」。

```ts
return ch === "" || ch === "}" || ch === "]" || ch === ")" || ch === ">";
```

## static method NextChar:(last:SourceRange | null)=>string

`last` 之后的下一个字符，跳过空白与 `//` / `/* */` 注释；越界返回空串。

`last` 是**单元自己的范围**（半开 `[Start, End)`）：扫描从 `EndIndex` 开始。token 的 `SourceRange` 只带下标，
读字符用的文档取自 `last.Document`；没有关联文档（或还没签出）时返回空串。

成员收口判据要用它回答「最后一个代码单元后面是不是容器的收口字符」——那个字符可能还没被 token 化。

```ts
if (last === null) {
  return "";
}
const document = last.Document;
if (document === null || last.EndIndex < 0) {
  return "";
}
const count = document.GetCount();
const whole = SourceRange.Whole(document);
let at = last.EndIndex;
while (at < count) {
  const ch = whole.At(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\v"
    || ch === "\f" || ch === "\u2028" || ch === "\u2029") {
    at++;
    continue;
  }
  if (ch === "/" && at + 1 < count) {
    const next = whole.At(at + 1);
    if (next === "/") {
      at += 2;
      while (at < count && whole.At(at) !== "\n") {
        at++;
      }
      continue;
    }
    if (next === "*") {
      at += 2;
      while (at + 1 < count && !(whole.At(at) === "*" && whole.At(at + 1) === "/")) {
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

当前成员前缀里**未闭合的 `<` 层数**。数角口径与 `AngleJudge.ScanDepth` 完全一致（`>>` / `>>>` 是 basic token 的合符号，按层一次出 2 / 3 层，深度夹在 0 以上），因为 `TypeBuilder` / `AngleJudge` 也用同一口径。

成员自身的类型实参 `a: Foo<A>`、方法类型参数表 `m<T>(x: T): U` 里的 `<...>` 会被它数出来；只有深度为 0 时，`>` / `;` 才可能是本层的收口证据。

```ts
let depth = 0;
for (const unit of code) {
  depth = AngleJudge.ScanDepth(unit, depth);
}
return depth;
```

## static method IsIndexSignatureBracket:(bracket:Bracket)=>bool

`[...]` 是索引签名还是计算属性名：与 `ClassDeclarationShape.BuildMembers` 同口径——括号内至少三个代码单元、第一个是标识符、第二个是 `:` 时是索引签名。空括号不按索引（`BuildMembers` 走计算名，空名字抛错）。

```ts
const inner:Array<Token> = [];
for (const item of bracket.Data) {
  if (!item.IsTriviaToken) {
    inner.push(item);
  }
}
if (inner.length >= 3 && inner[0] instanceof Common
  && ClassMemberPossibleUtil.TextOf(inner[1]) === ":") {
  return true;
}
return false;
```

## static method IsModifierWord:(unit:Token)=>bool

`unit` 的文本是不是 `BuildMembers` 的修饰词表里的一员（`readonly` / `static` / 可见性 / `abstract` / `declare` /
`override` / `async` / `accessor` / `get` / `set`）。这个词表必须与 `BuildMembers` 的 `parseModifiers` 同步。

```ts
const text = ClassMemberPossibleUtil.TextOf(unit);
return text === "readonly" || text === "static" || text === "private" || text === "public"
  || text === "protected" || text === "abstract" || text === "declare" || text === "override"
  || text === "async" || text === "accessor" || text === "get" || text === "set";
```

## static method HasParameterList:(code:Array<Token>, last:int)=>bool

`code[0 .. last]`（当前成员自己的消费范围）里有没有参数表 `(` 括号：有就说明这一格已经走到「名字 + 参数表」的方法形态，收住时不能再把它收敛成属性。

只看成员自己的范围，不看后面的代码单元。

```ts
for (let cursor = 0; cursor <= last && cursor < code.length; cursor++) {
  if (code[cursor] instanceof Bracket && (code[cursor] as Bracket).StartBracketChar === "(") {
    return true;
  }
}
return false;
```

## static method DecoratorHeadAt:(code:Array<Token>)=>int

跳过前缀装饰器，返回**真正的成员头**在 `code` 里的下标；装饰器表达式还没读完 / 形态无法静态判定时返回 `-1`（判型退回 `AllKinds()`，留给 raw 兜底）。

消费口径与 `ClassDeclarationShape.BuildMembers` 的装饰器循环对齐（`ExpressionBuilder.ParseExpression` 吃掉一个左值表达式）：
`@name` / `@a.b` / `@a?.b` / `@dec()` / `@dec<T>()` / `@(expr)` / `@a[0]` / `@new Foo()`。装饰器与成员头之间没有分隔符，
静态扫描靠「后缀链」判断表达式到哪结束：`.name` / `?.name` / `(...)` / `[...]` / `<...>` / `!` 是表达式的一部分，
下一个名字 / 修饰词 / `@` 是成员头。`new` 前缀单独吃一格，避免把 `@new Foo()` 的 `Foo` 当成成员名。

这个判据只服务**判型**（`ClassifyHead`）与**分界起点**（`Analyze`）；真正的装饰器 AST 仍由 `BuildMembers` 的
`ExpressionBuilder` 建，候选只负责把整段交给 `BuildMemberFromCode`。

```ts
let at = 0;
while (at < code.length && ClassMemberPossibleUtil.TextOf(code[at]) === "@") {
  at++;
  if (at >= code.length) {
    return -1;
  }
  if (ClassMemberPossibleUtil.TextOf(code[at]) === "new") {
    at++;
    if (at >= code.length) {
      return -1;
    }
  }
  const first = code[at];
  if (first instanceof Common || first instanceof String) {
    at++;
  } else if (first instanceof Bracket
    && ((first as Bracket).StartBracketChar === "(" || (first as Bracket).StartBracketChar === "[")) {
    at++;
  } else {
    return -1;
  }
  while (at < code.length) {
    const unit = code[at];
    if (unit instanceof Bracket
      && ((unit as Bracket).StartBracketChar === "(" || (unit as Bracket).StartBracketChar === "[")) {
      at++;
      continue;
    }
    const text = ClassMemberPossibleUtil.TextOf(unit);
    if (text === "." || text === "?.") {
      at++;
      if (at >= code.length || !(code[at] instanceof Common || code[at] instanceof String)) {
        return -1;
      }
      at++;
      continue;
    }
    if (text === "!") {
      at++;
      continue;
    }
    if (text === "<") {
      let depth = 0;
      while (at < code.length) {
        const angleText = ClassMemberPossibleUtil.TextOf(code[at]);
        if (angleText === "<") {
          depth++;
        } else if (angleText === ">") {
          depth--;
        } else if (angleText === ">>") {
          depth -= 2;
        } else if (angleText === ">>>") {
          depth -= 3;
        }
        at++;
        if (depth <= 0) {
          break;
        }
      }
      if (depth > 0) {
        return -1;
      }
      continue;
    }
    break;
  }
}
return at;
```

## static method ClassifyHead:(code:Array<Token>)=>Array<int>

只看**已攒下的代码单元前缀**，回答「当前成员可能是哪几类」。信息不足时给 `AllKinds()`（候选项继续等），已经能定死时给一类。

前缀阶段的修饰词与 `ClassDeclarationShape.BuildMembers` 的 `parseModifiers` **逐条对齐**（三档换行规则）：

- `static` 只看下一格能否接名字（`CanFollowModifier`），**不看换行**（`static` ⏎ `m() {}` 仍是静态方法）；
- `get` / `set` 同样不看换行，但只在后面跟名字（标识符 / `[` / `#`）时才是访问器关键字；
- 其余修饰词要求「同一行 + 下一格能接名字」，否则按 ASI 收成只有名字的成员（`public` ⏎ `static readonly a = 1` 是两条成员）。

名字之后按后面的单元分派：`(` → 方法 / 构造 / 访问器；`<` → 泛型方法；`:` / `!` / `=` / `;` → 属性；`?` / `?:` 再按「`(` / `<` / `:`」细分。

**装饰器成员**（`@dec m() {}` / `@dec a: A` / `@a @b.c(x) m()`）：先用 `DecoratorHeadAt` 跳过装饰器，再按真正的成员头判型；
装饰器表达式没读完 / 跳不过去时给 `AllKinds()`。判出的种类与 `BuildMembers` 一致——装饰器 AST 由建造器那边建，
候选只需确信整段的成员种类。

```ts
const ALL:Array<number> = ClassMemberPossibleUtil.AllKinds();
if (code.length === 0) {
  return ALL;
}
let at = 0;
if (ClassMemberPossibleUtil.TextOf(code[0]) === "@") {
  at = ClassMemberPossibleUtil.DecoratorHeadAt(code);
  if (at < 0 || at >= code.length) {
    return ALL;
  }
}
if (ClassMemberPossibleUtil.IsSeparator(code[at])) {
  return ClassMemberPossibleUtil.OnlyKind(ClassMemberPossibleUtil.SemicolonKind);
}
let hasStatic = false;
let accessorKind = "";
while (at < code.length) {
  const unit = code[at];
  const text = ClassMemberPossibleUtil.TextOf(unit);
  if (text !== "readonly" && text !== "static" && text !== "private" && text !== "public"
    && text !== "protected" && text !== "abstract" && text !== "declare" && text !== "override"
    && text !== "async" && text !== "accessor" && text !== "get" && text !== "set") {
    break;
  }
  if (at + 1 >= code.length) {
    return ALL;
  }
  const nextUnit = code[at + 1];
  let isModifier = true;
  if (text === "static") {
    isModifier = ClassDeclarationShape.CanFollowModifier(nextUnit);
  } else if (text !== "get" && text !== "set") {
    isModifier = !MemberBoundary.HasLineBreakBetween(unit, nextUnit)
      && ClassDeclarationShape.CanFollowModifier(nextUnit);
  }
  if (!isModifier) {
    break;
  }
  if (text === "static") {
    hasStatic = true;
  }
  if (text === "get" || text === "set") {
    const accessorHasName = nextUnit instanceof Common
      || (nextUnit instanceof Bracket && (nextUnit as Bracket).StartBracketChar === "[")
      || (nextUnit instanceof Symbol && (nextUnit as Symbol).Is("#"));
    if (!accessorHasName) {
      break;
    }
    accessorKind = text;
    at++;
    continue;
  }
  at++;
}
if (at >= code.length) {
  return ALL;
}
const unit = code[at];
const unitText = ClassMemberPossibleUtil.TextOf(unit);
if (unitText === "*") {
  return ClassMemberPossibleUtil.OnlyKind(ClassMemberPossibleUtil.MethodKind);
}
if (hasStatic && unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{") {
  return ClassMemberPossibleUtil.OnlyKind(ClassMemberPossibleUtil.StaticBlockKind);
}
let nameText = "";
let nameIsIdentifier = false;
let nextAt = at;
if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "[") {
  if (ClassMemberPossibleUtil.IsIndexSignatureBracket(unit as Bracket)) {
    return ClassMemberPossibleUtil.OnlyKind(ClassMemberPossibleUtil.IndexKind);
  }
  nextAt = at + 1;
} else if (unit instanceof Symbol && (unit as Symbol).Is("#")) {
  if (at + 1 >= code.length) {
    return ALL;
  }
  nameText = "#" + ClassMemberPossibleUtil.TextOf(code[at + 1]);
  nextAt = at + 2;
} else if (unit instanceof String) {
  nextAt = at + 1;
} else if (unit instanceof Common) {
  nameText = (unit as Common).TempToString();
  nameIsIdentifier = true;
  nextAt = at + 1;
} else {
  return ALL;
}
let accessorKindOf = 0;
if (accessorKind === "get") {
  accessorKindOf = ClassMemberPossibleUtil.GetKind;
} else if (accessorKind === "set") {
  accessorKindOf = ClassMemberPossibleUtil.SetKind;
}
const methodLike = accessorKindOf !== 0
  ? ClassMemberPossibleUtil.OnlyKind(accessorKindOf)
  : ClassMemberPossibleUtil.OnlyKind(ClassMemberPossibleUtil.MethodKind);
if (nextAt >= code.length) {
  return ALL;
}
const markText = ClassMemberPossibleUtil.TextOf(code[nextAt]);
if (markText === "?" || markText === "?:") {
  const afterMark = nextAt + 1 < code.length ? code[nextAt + 1] : null;
  if (afterMark === null) {
    return ALL;
  }
  if (afterMark instanceof Bracket && (afterMark as Bracket).StartBracketChar === "(") {
    if (markText === "?") {
      return methodLike;
    }
    const afterParams = nextAt + 2 < code.length ? code[nextAt + 2] : null;
    let optionalMethodLike = false;
    if (afterParams !== null) {
      optionalMethodLike = ClassMemberPossibleUtil.TextOf(afterParams) === ":";
    } else {
      optionalMethodLike = ClassMemberPossibleUtil.NextChar((afterMark as Bracket).SourceRange) === ":";
    }
    if (optionalMethodLike) {
      return methodLike;
    }
    return ClassMemberPossibleUtil.OnlyKind(ClassMemberPossibleUtil.PropertyKind);
  }
  if (ClassMemberPossibleUtil.TextOf(afterMark) === "<") {
    return methodLike;
  }
  return ClassMemberPossibleUtil.OnlyKind(ClassMemberPossibleUtil.PropertyKind);
}
const following = code[nextAt];
if (following instanceof Bracket && (following as Bracket).StartBracketChar === "(") {
  if (accessorKindOf !== 0) {
    return ClassMemberPossibleUtil.OnlyKind(accessorKindOf);
  }
  if (nameIsIdentifier && nameText === "constructor") {
    return ClassMemberPossibleUtil.OnlyKind(ClassMemberPossibleUtil.ConstructorKind);
  }
  return ClassMemberPossibleUtil.OnlyKind(ClassMemberPossibleUtil.MethodKind);
}
const followingText = ClassMemberPossibleUtil.TextOf(following);
if (followingText === "<") {
  if (accessorKindOf !== 0) {
    return ClassMemberPossibleUtil.OnlyKind(accessorKindOf);
  }
  if (nameIsIdentifier && nameText === "constructor") {
    return ClassMemberPossibleUtil.OnlyKind(ClassMemberPossibleUtil.ConstructorKind);
  }
  return ClassMemberPossibleUtil.OnlyKind(ClassMemberPossibleUtil.MethodKind);
}
if (followingText === ":" || followingText === "!" || followingText === "="
  || followingText === ";" || followingText === ",") {
  return ClassMemberPossibleUtil.OnlyKind(ClassMemberPossibleUtil.PropertyKind);
}
return ALL;
```

## static method Extend:(state:ClassMemberPossibleScan, units:Array<Token>, tokenIndex:int)=>void

把 `state.Checked`（新条目从 `Start` 起）之后的新单元**追加**进 `state.Code` / `state.CodeAt`，同时把每个新代码单元折进 `state.Angle`。

只追加、不重建：一次判定里全部类体候选共用同一份状态，只有第一个问到的形状会走到这里；其余在 `state.Checked > tokenIndex` 时直接读结论。

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

## static method ScanBoundary:(state:ClassMemberPossibleScan, from:int)=>void

class 体成员边界的增量推进：判据与 `MemberBoundary.FindMemberBoundary(Code, from)` **逐条相同、顺序相同**（换行 + 前一个单元能收住 + `[` 不是初始化器续接 + 当前单元像成员起点），只是把「已判到哪」记在 `state.BoundaryScan` 里，新单元只判一次。

`from` 是锚点：非装饰器成员传 `0`，装饰器成员传 `DecoratorHeadAt(code)`（装饰器前缀之后）。锚点会随装饰器变长而前进，而**前进不需要重扫**：判据只看 `code[at - 1] / code[at] / code[at + 1]`，锚点只决定「哪些位置允许找」，已判为 false 的位置结论不变；若此前找到的边界落在新锚点之前（装饰器后来把它包住了），把它作废、从 `Checked` 继续往后找即可。所以整段仍是 O(L)，而不是每个 token 一次 O(L) 全量重扫——后者在「装饰器 + 长成员」上是 O(L²)（实测 T=2000 比非装饰器成员慢 21 倍，见 `tests/bench/class-scaling.mjs` 档 C）。

与对象类型那套 `MemberBoundary.ScanTypeMemberBoundary` 的区别：class 体里换行后的 `(` / `<` 是上一行初始化器 / 调用的续接，**不是**新成员起点，所以这里不能复用 `FindTypeMemberBoundary` 的那两个特例，必须走 `FindMemberBoundary` 的判据。

`Checked` 回退一格（`code.length - 1`）是为了带 lookahead 的末位复查：`IsInitializerIndexContinuation` / `LooksLikeMemberStart` 会看 `code[at + 1]`，末位在下一轮补上新单元后结论可能变化，所以最后一格下一轮再判一次。

```ts
const code = state.Code;
if (from < state.BoundaryAnchor) {
  // 锚点后退（理论上不发生）：已判过的位置区间变了，整段重扫。
  state.BoundaryAnchor = from;
  state.BoundaryScan.Boundary = -1;
  state.BoundaryScan.Checked = from + 1;
}
if (from > state.BoundaryAnchor) {
  state.BoundaryAnchor = from;
}
if (state.BoundaryScan.Boundary > from) {
  return;
}
if (state.BoundaryScan.Boundary >= 0) {
  // 边界落在锚点之前/之内（装饰器前缀变长后把它包住了）：作废，继续往后找。
  state.BoundaryScan.Boundary = -1;
}
let at = state.BoundaryScan.Checked;
if (at <= from) {
  at = from + 1;
}
if (at < 1) {
  at = 1;
}
while (at < code.length) {
  if (MemberBoundary.HasLineBreakBetween(code[at - 1], code[at])
    && MemberBoundary.CanEndTypeUnit(code[at - 1])
    && !MemberBoundary.IsInitializerIndexContinuation(code, at)
    && MemberBoundary.LooksLikeMemberStart(code, at)) {
    state.BoundaryScan.Boundary = at;
    return;
  }
  at++;
}
state.BoundaryScan.Checked = code.length > 1 ? code.length - 1 : 1;
```

## static method ItemStartValid:(units:Array<Token>, shared:ClassMemberItemStartShared)=>bool

`Share` 里那份条目起点还新不新鲜（判据见 `ClassMemberItemStartShared`）。校验是 O(1)：只看 `Start` 前后各一格，不从头扫。

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
let shared = cache.GetShare<ClassMemberItemStartShared>(ClassMemberPossibleUtil.ItemStartKey);
if (shared !== null && ClassMemberPossibleUtil.ItemStartValid(units, shared)) {
  return shared.Start;
}
const start = ItemUtil.ItemStart(units);
if (shared === null) {
  shared = new ClassMemberItemStartShared();
  shared.Host = units;
  shared.Start = start;
  shared.Valid = true;
  cache.SetShare(ClassMemberPossibleUtil.ItemStartKey, shared);
} else {
  shared.Host = units;
  shared.Start = start;
  shared.Valid = true;
}
return start;
```

## static method UpdateItemStartAfterBuild:(cache:PossibleShapeCache, host:Token, start:int)=>void

`BuildByIndex` 在 `host.Data.splice(...)` **之后**调用：被建的形状正好坐在 `start` 上，条目起点前进一格，下一次 `Scan` 的 O(1) 新鲜度校验就能命中。

不调它的后果是**正确但慢**：`splice` 之后 `units[start]` 变成已建好的形状，`ItemStartValid` 的第三、四条判据立刻失配，于是下一次 `Scan` 退回 `ItemUtil.ItemStart` 的 O(成员长) 倒扫——这正是本次推广要消掉的那次重扫。

```ts
const shared = cache.GetShare<ClassMemberItemStartShared>(ClassMemberPossibleUtil.ItemStartKey);
if (shared !== null) {
  shared.Host = host.Data;
  shared.Start = start + 1;
  shared.Valid = true;
}
```

## static method Analyze:(state:ClassMemberPossibleScan)=>void

把「当前成员」的结论写进 `state`：可能种类 + 是否收住 + 收在哪个代码单元。

收住的三条证据（与 `ClassDeclarationShape.BuildMembers` 的分界同口径）：

1. `MemberBoundary.FindMemberBoundary` 在已攒下的前缀里找到了下一个成员的起点——前一个成员到此为止；
2. 最后一个代码单元是 `;`——显式分隔符（它自己要被吃进成员区间）；
3. 最后一个代码单元之后的下一个字符是容器收口字符（`}` / `]` / `)` / `>` / EOF）——本层不会再有代码单元。

三条**只在角括号深度为 0 时生效**：成员自身 `<...>` 里的 `>` 是成员内部结构，不是本层收口证据。

最后一个代码单元还没闭合（`SourceRange.EndIndex < 0`）时**一律不收口**：方法体 / 类型字面量的 `{` 在关闭之前不能算成员末尾。

**分界证据落在修饰词上时不收口**：`class C { public static` ⏎ `readonly a = 1 }` 里 `FindMemberBoundary` 会在
`readonly` 处给出边界（`static` 是 Common、`readonly` 像成员起点），但整段 raw 文本里它们是**同一条成员**的修饰词链——
把 `public static` 单独切出来重跑 `BuildMembers`，最后一个修饰词会按「后面没有下一格」被收成成员名，于是 AST 多出一条
成员。所以 `end` 落在修饰词上时跳过这条证据，继续看 `;` / 容器收口：`class C { public static` ⏎ `readonly a = 1; }`
在 `;` 那一格收口，切出的整段就是一条完整成员。

收住时可能种类已经定死；仍多值时按「有没有参数表」收敛：有参数表 `(` 就是方法，没有才收成属性——与 `BuildMembers` 一致
（`class C { a = 1 b = 2 }` 这类同一行挤两条成员的恢复形照样会收住，由 `BuildMemberFromCode` 的「整段没读完 ⇒ 不建」兜底）。

**装饰器成员**：收口判据不变，只是「下一个成员起点」的搜索从**成员头**（`DecoratorHeadAt`）开始——从 `@` 开始搜会把
装饰器表达式本身当成成员起点，把一条成员切在装饰器中间。跳不过去（装饰器没读完 / 形态无法静态判定）或判型仍多值时
**不判收口**：留在 raw 兜底，宁可慢一点也不能切错。

**角深度与边界都由增量状态给出**（`state.Angle` / `state.BoundaryScan`，由 `Extend` / `ScanBoundary` 维护）：原先每次判定都要
`AngleDepth(code)` + `FindMemberBoundary(code, boundaryStart)` 全量重扫，单个长成员上退化成 O(L²)（L = 成员的代码单元数）。
`tests/bench/class-scaling.mjs` 的档 B 守非装饰器成员（T=2000 时改前 ~478ms、改后 ~10ms，interface 增量样板 ~7ms）、
**档 C 守装饰器长成员**（边界锚点不是 0：改前 T=2000 ~150ms，改后与档 B 同量级）。

```ts
const code = state.Code;
state.Complete = false;
state.End = -1;
if (code.length === 0) {
  state.Kinds = ClassMemberPossibleUtil.AllKinds();
  return;
}
const decorated = ClassMemberPossibleUtil.TextOf(code[0]) === "@";
let boundaryStart = 0;
if (decorated) {
  boundaryStart = ClassMemberPossibleUtil.DecoratorHeadAt(code);
  if (boundaryStart < 0 || boundaryStart >= code.length) {
    state.Kinds = ClassMemberPossibleUtil.ClassifyHead(code);
    return;
  }
}
state.Kinds = ClassMemberPossibleUtil.ClassifyHead(code);
if (decorated && state.Kinds.length > 1) {
  return;
}
const last = code[code.length - 1];
if (last.SourceRange.EndIndex < 0) {
  return;
}
// 角深度与边界都由增量状态给出（`Extend` / `ScanBoundary` 维护）：
// 与 `ClassMemberPossibleUtil.AngleDepth(code)`、`MemberBoundary.FindMemberBoundary(code, boundaryStart)`
// 的全量重算逐 token 等价。装饰器成员的锚点是 `DecoratorHeadAt(code)`（不是 0），
// 锚点前进时增量状态不需要重扫（见 `ScanBoundary`）。
const angle = state.Angle;
ClassMemberPossibleUtil.ScanBoundary(state, boundaryStart);
const boundary = state.BoundaryScan.Boundary < 0 ? code.length : state.BoundaryScan.Boundary;
let complete = false;
let end = -1;
if (angle === 0) {
  if (boundary > boundaryStart && boundary < code.length) {
    const boundaryEnd = boundary - 1;
    if (!ClassMemberPossibleUtil.IsModifierWord(code[boundaryEnd])) {
      complete = true;
      end = boundaryEnd;
    }
  }
  if (!complete && ClassMemberPossibleUtil.IsSeparator(last)) {
    complete = true;
    end = code.length - 1;
  }
  if (!complete && ClassMemberPossibleUtil.IsCompletionBoundary(ClassMemberPossibleUtil.NextChar(last.SourceRange))) {
    complete = true;
    end = code.length - 1;
  }
  if (complete && end >= 0 && ClassMemberPossibleUtil.IsModifierWord(code[end])) {
    complete = false;
    end = -1;
  }
}
let kinds = state.Kinds;
if (complete && kinds.length > 1
  && ClassMemberPossibleUtil.HasKind(kinds, ClassMemberPossibleUtil.PropertyKind)) {
  if (ClassMemberPossibleUtil.HasKind(kinds, ClassMemberPossibleUtil.MethodKind)
    && ClassMemberPossibleUtil.HasParameterList(code, end)) {
    kinds = ClassMemberPossibleUtil.OnlyKind(ClassMemberPossibleUtil.MethodKind);
  } else {
    kinds = ClassMemberPossibleUtil.OnlyKind(ClassMemberPossibleUtil.PropertyKind);
  }
}
state.Kinds = kinds;
state.Complete = complete && end >= 0;
state.End = end;
```

## static method Scan:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ClassMemberPossibleScan

拿宿主攒下的 `Data` 与当前下标，取（必要时**增量推进**）当前成员的判定状态。

缓存以 `CacheKey` 为键只存一份：所有类体成员候选在同一次判定里共享，第一个问到的形状推进一次，其余直接读。

- `state === null`：新条目（首次判定，或目录复位后）。条目起点先问 `Share`（O(1) 新鲜度校验），失效才倒扫一次；
- `state.Start !== start`：条目起点变了（上一条成员刚被顶替而 `Share` 没跟上，或换了一个宿主数组）→ 重建；
- `state.Checked > tokenIndex + 1`：缓存越过当前下标（防御）→ 重建；
- `state.Checked <= tokenIndex`：只**追加**新单元（不重建），`Angle` 在追加时折好，边界与收口结论由 `Analyze` 里的 `ScanBoundary` 增量推进。

新建状态时只覆盖 `Start`（随调用而变的那一项）：`Checked` / `Complete` / `End` / `Kinds` 初值 / `CodeAt` / `Code` / `Angle` / `BoundaryScan` / `BoundaryAnchor` 全部是 `ClassMemberPossibleScan` 字段声明处的构造默认值，**不在 `Scan` 里二次分配**。`Kinds` 不是构造默认值的语义（默认为 `[]`），所以仍然显式写成 `AllKinds()`。

边界扫描的锚点（`0` 或装饰器之后的 `DecoratorHeadAt`）只有 `Analyze` 知道，所以 `ScanBoundary` 由 `Analyze` 调用，而不是在这里先按 0 跑一遍。

```ts
const start = ClassMemberPossibleUtil.ItemStartOf(units, cache);
let state = cache.GetState<ClassMemberPossibleScan>(ClassMemberPossibleUtil.CacheKey);
if (state === null || state.Start !== start || state.Checked > tokenIndex + 1) {
  state = new ClassMemberPossibleScan();
  state.Start = start;
  state.Kinds = ClassMemberPossibleUtil.AllKinds();
  cache.SetState(ClassMemberPossibleUtil.CacheKey, state);
}
if (state.Checked <= tokenIndex) {
  ClassMemberPossibleUtil.Extend(state, units, tokenIndex);
  ClassMemberPossibleUtil.Analyze(state);
  state.Checked = tokenIndex + 1;
}
return state;
```

## static method BasePos:(host:Token, start:int)=>int

成员形状的 `Pos` 口径，与 `ClassDeclarationShape.BuildMembers` 里 `previousEnd` 的初值同口径：`start` 前面最近一个非 trivia 单元的 `EndIndex`；前面什么都没有时用**宿主括号起点 + 1**（class 体首成员的 `Pos` 是 `{` 之后，不是 `0`）。

```ts
if (start > 0) {
  for (let at = start - 1; at >= 0; at--) {
    if (!host.Data[at].IsTriviaToken) {
      const previousEnd = host.Data[at].SourceRange.EndIndex;
      if (previousEnd >= 0) {
        return previousEnd;
      }
      break;
    }
  }
}
if (host.SourceRange.StartIndex < 0) {
  return 0;
}
return host.SourceRange.StartIndex + 1;
```

# class ClassMemberItemUtil

类体 item 表（`ClassItemRule`）的判定入口：把 `ClassMemberPossibleUtil` 的算法（`Extend` / `ScanBoundary` /
`Analyze` / `DecoratorHeadAt` / `BasePos`）搬到 `core/syntax/batch/item-scan-state` 上。

与 possible 路径的差别只有「状态从哪来」：`Code` / `CodeAt` / `Angle` 由引擎的 `ItemScanState` 维护，
判定用的代码数组、角深度与**增量边界扫描状态**放在 `ClassMemberPossibleScan` 上（每个类体括号一份，
见 `ClassItemRule.Scan`）。`Analyze` 仍走 `ClassMemberPossibleUtil.ScanBoundary` 的增量判据，不是每个
basic token 从头 `FindMemberBoundary`：`tests/bench/class-scaling.mjs` 档 B/C 守的就是这条（长成员 /
装饰器长成员的 O(L²)）。

`ClassMemberPossibleUtil` 本身逐字保留（判型、分界、装饰器头、`BasePos` 都在那里），本类只负责
「新 item 时把扫描状态归零」「把新代码单元增量喂进去」「把代码下标结论映射回宿主下标」。

## static method ResetScan:(scan:ClassMemberPossibleScan)=>void

新 item 的扫描状态归零：条目起点固定为 `0`（这里喂进来的 `units` 是 `state.Code`，代码下标从 0 起），
`Code` / `CodeAt` 清空、角深度归零、边界扫描回到初始态（`Boundary = -1`、`Checked = 1`）。

```ts
scan.Start = 0;
scan.Checked = -1;
scan.Complete = false;
scan.End = -1;
scan.Kinds = ClassMemberPossibleUtil.AllKinds();
scan.Code = [];
scan.CodeAt = [];
scan.Angle = 0;
scan.BoundaryScan.Boundary = -1;
scan.BoundaryScan.Checked = 1;
scan.BoundaryAnchor = -1;
```

## static method Extend:(state:ItemScanState, scan:ClassMemberPossibleScan)=>void

把刚追加的代码单元增量折进扫描状态。`state.Code.length === 1` 是「本 item 的第一个代码单元」——
引擎每个 item 都从空 `Code` 开始，所以这一条就是新条目的判据（不需要额外的条目号）。

```ts
const code = state.Code;
if (code.length === 0) {
  return;
}
if (code.length === 1) {
  ClassMemberItemUtil.ResetScan(scan);
}
ClassMemberPossibleUtil.Extend(scan, code, code.length - 1);
scan.Checked = code.length;
```

## static method Analyze:(state:ItemScanState, scan:ClassMemberPossibleScan)=>void

收口判定：`ClassMemberPossibleUtil.Analyze(scan)` 把「是否收住、收在哪个代码单元」写进 `scan`，
这里把它映射成 `ItemScanState.Complete` / `ItemScanState.End`（`End` 是宿主 `Data` 下标，经 `state.CodeAt`
映射）。判据与 possible 路径逐条相同：① 前缀里找到下一个成员起点；② 最后一个代码单元是 `;`；
③ 最后一个代码单元之后是容器收口字符。三条都只在角深度 0 时生效。

```ts
state.Complete = false;
state.End = -1;
if (state.Code.length === 0) {
  return;
}
ClassMemberPossibleUtil.Analyze(scan);
if (!scan.Complete || scan.End < 0 || scan.End >= state.CodeAt.length) {
  return;
}
state.Complete = true;
state.End = state.CodeAt[scan.End];
```
