# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ClassDeclarationShape } from "../declarations/class-declaration-shape.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { AngleJudge } from "./angle-judge.xl.md"
import { MemberBoundary } from "./member-boundary.xl.md"
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

# class ClassMemberPossibleUtil

类体成员候选的公共判据。与接口体成员候选（`MemberPossibleUtil`）同构，区别只有两处：

1. **分界**：`MemberBoundary.FindMemberBoundary`（class 体口径）。对象类型那套 `FindTypeMemberBoundary` 把换行后的 `(` / `<` 当新成员起点，而 class 体里它们是值初始化器 / 调用的续接（`a = foo` ⏎ `(x)`、`a = foo` ⏎ `<T>(x)`），用错入口会把一条成员切成两条。
2. **成员种类**：`ClassDeclarationShape.BuildMembers` 会建出的那几类——属性 / 方法 / 构造 / get / set / static 块 / `;` 成员 / 索引签名。判型必须与 `BuildMembers` 逐条对齐：**判定出的种类就是 `BuildMembers` 会产出哪个形状**，否则候选的 `instanceof` 断言会炸。

判定本身**不建任何形状、也不解析类型**：只做「前缀是不是这个成员 / 收住了没有 / 是哪一类」的词的层面判断；真正的形状由被选中的候选在自己的 `BuildByIndex` 里交给 `ClassDeclarationShape.BuildMemberFromCode` 建（复用一次性构建的同一个 `BuildMembers`，见 `class-declaration-shape.xl.md`）。

## static field CacheKey:any = PossibleShape.SlotOf(ClassMemberPossibleScan)

所有类体成员候选共用的缓存槽。**槽号由这一组共同的标识类 `ClassMemberPossibleScan` 发出来**（`PossibleShape.SlotOf`，同一类同号），所以全部类体成员候选读到同一个槽，而不是各自的 `this.Slot()`。

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

## static method Analyze:(code:Array<Token>, state:ClassMemberPossibleScan)=>void

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

```ts
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
const angle = ClassMemberPossibleUtil.AngleDepth(code);
const boundary = MemberBoundary.FindMemberBoundary(code, boundaryStart);
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

拿宿主攒下的 `Data` 与当前下标，取（必要时重算）当前成员的判定状态。

缓存以 `CacheKey` 为键只存一份：所有类体成员候选在同一次判定里共享，第一个问到的形状算一次，其余直接读。

条目起点变化、或缓存已经越过当前下标（目录复位后残留），就地重建。

```ts
const start = ItemUtil.ItemStart(units);
let state = cache.GetState<ClassMemberPossibleScan>(ClassMemberPossibleUtil.CacheKey);
if (state === null || state.Start !== start || state.Checked > tokenIndex + 1) {
  state = new ClassMemberPossibleScan();
  state.Start = start;
  state.Checked = -1;
  state.Complete = false;
  state.End = -1;
  state.Kinds = ClassMemberPossibleUtil.AllKinds();
  state.CodeAt = [];
  cache.SetState(ClassMemberPossibleUtil.CacheKey, state);
}
if (state.Checked <= tokenIndex) {
  const code:Array<Token> = [];
  const codeAt:Array<number> = [];
  for (let at = start; at <= tokenIndex; at++) {
    if (!units[at].IsTriviaToken) {
      code.push(units[at]);
      codeAt.push(at);
    }
  }
  state.CodeAt = codeAt;
  ClassMemberPossibleUtil.Analyze(code, state);
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
