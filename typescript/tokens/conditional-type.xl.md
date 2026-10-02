# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../core/syntax/reorganization.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { GetSkipNextWrapSymbol, GetSkipPreviousWrapSymbol, SkipPreviousWrapSymbol } from "../text-common-util.xl.md"
import { Bracket } from "./bracket.xl.md"
import { GenericType } from "./generic-type.xl.md"
import { Identifier } from "./identifier.xl.md"
import { AreaAnnotation } from "./area-annotation.xl.md"
import { IsDeclarationBoundary, IsStatementKeyword } from "./declaration-common.xl.md"
import { LineAnnotation } from "./line-annotation.xl.md"
import { ParsePipeline } from "../parse-pipeline.xl.md"
import { Statement } from "./statement.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

**条件类型**：把类型位的 `T extends U ? A : B` 整段收成一个 `ConditionalType` 单元
（条件、`extends`、真分支、`?`、假分支、`:` 全在里面）。

它是类型层第二常见的构造（真实语料 183 处），第 55 轮之前**一处节点都没有**：
`T extends U ? A : B` 在产物里只是一串散单元，个别位置还被
`TernaryOperatorReorganization` 收成 `<TernaryOperator>`——**值位三元**的标签，
戴上它之后类型与值就分不出来了（与第 54 轮修掉的「函数类型戴 `Lamda`」是同一类错误）。

`ConditionalTypeReorganization` 排在 `TernaryOperator` **之前**、`FunctionType` 之后：
函数类型先在自己的约束里成形（`T extends (a: A) => B ? C : D` 的约束就是一个函数类型），
条件类型再把整段收走；`TernaryOperator` 轮到时，类型位这一份已经被认领了。

# class ConditionalTypeReorganization extends Reorganization

## static readonly field Instance:ConditionalTypeReorganization = new ConditionalTypeReorganization()

唯一的实例，注册进通用重组队列时用。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是条件类型的 `?`。

判据只有一条：**它前面有没有 `extends`**（`FindExtendsIndex` 给 `-1` 就不是）。
`A extends B ? C : D` 的条件类型与 `cond ? a : b` 的三元表达式在**形状上完全一样**，
区别就在那个 `extends`——它只可能出现在声明头（`class C extends B`）与条件类型里，
而前者的 `extends` 后面不会跟着一个 `?`。

判据与 `lamda.xl.md` / `type-literal.xl.md` 里那两份同源，各自独立实现一份
（三处看的是不同字符、也允许不同的保守程度，与 `generic-type.xl.md` 的 `IsTypePosition` 同一个理由）。

```ts
const current = Get(units, index);
if (!(current instanceof SymbolToken) || current.Is("?") === false) {
  return false;
}
// **不许「整段重包」**（第 123 轮加的守卫，第 126 轮收紧到「整段」）：
// 本单元挂的正是类型队列（队列里有这条规则），收进去的那一段会再跑一趟——
// 如果这一趟又会圈出**同一个区间**，就是**无限递归**
// （实测 `RangeError: Maximum call stack size exceeded`，与 `type-union.xl.md`
// 那条「整段重包」的守卫同一个理由）。
//
// 判据与联合那一份同源：**条件那一端从第 0 格起**就说明这一趟圈的是宿主自己。
// 只挡这一种，**内层条件类型照常成形**——TS 那边
// `T extends null | undefined ? T : T extends object & { … } ? … : T` 的外层
// `falseType` 就是**一个** `ConditionalType` 节点（`lib.es5.d.ts` 的 `Awaited` 一整个
// 类型别名，42 个节点）。早先整类挡掉时，外层贪婪收集把内层压成平铺单元，
// 内层的 `ConditionalType` / `IntersectionType` / `TypeLiteral` / `MethodSignature`
// 一个都出不来。
const guardedParent = current.Parent !== null && current.Parent.constructor.name === "ConditionalType";
const extendsIndex = this.FindExtendsIndex(units, index);
if (extendsIndex < 0) {
  return false;
}
if (guardedParent && this.FindStart(units, extendsIndex) === 0) {
  return false;
}
// **条件那一端还顶着一个 `|` / `&` ⇒ 先让联合成形**（第 123 轮）。
//
// `type X = null | undefined extends T ? T : never;` 这一族里，条件类型的**检查类型本身**
// 是一个联合。联合是在**类型容器**（`TypeAssign` / `TypeDefine` / …）自己的队列里收的，
// 而本规则在通用队列里也会被问到——语句那一层 `|` 的父单元是 `Root`，联合规则在那里
// 判不成立（`Root` 不是类型容器）。于是本规则会在**联合还没成形**时先动手：
// 回扫停在 `|` 上、`FindStart` 给出 `undefined`，收出一个
// `ConditionalType(undefined extends T ? T : never)`——联合的左半边 `null |` 被留在外面，
// 产物里于是「缺 `ConditionalType` + 缺 `UnionType` + 多出两个节点」。
//
// 判据就是「检查类型的左边界紧挨着一个 `|` / `&`」：那种情况下这一段还没有定型，
// 让位给类型容器那一趟（联合先收成 `UnionType`，下一趟本规则再收条件类型）。
const checkStart = this.FindStart(units, extendsIndex);
const leftOfCheck = checkStart > 0 ? Get(units, checkStart - 1) : null;
if (leftOfCheck instanceof SymbolToken && (leftOfCheck.Is("|") || leftOfCheck.Is("&"))) {
  return false;
}
return true;
```

## private method FindExtendsIndex:(units:Array<Token>, index:int)=>int

`index`（一个 `?`）**往前**那个条件类型的 `extends` 的下标；没有给 `-1`。

`Previous` 与 `Process` **共用这一份**：两边都要找到同一个 `extends`，
各写一份就会出现「判定说有、收集时说找不到」的错位（实测：`Process` 那份漏了 `.`，
于是 `type BufferView<T extends X> = T extends NodeJS.ArrayBufferView<infer B> ? … : …`
判定通过、收集却直接返回原下标，节点一个都不出）。

扫到别的符号（`;` / `=` / 语句边界）就停；括号、泛型实参段与软换行是透明的
（`{ valueOf(): infer V extends ArrayBufferLike }` 这样的约束体是**原子**括号）。

**`.` 也要放行**：约束段里的成员访问（`T extends NodeJS.ArrayBufferView<infer B> ? … : …`）
在回扫路上会先撞上那个点号，不放行的话整条条件类型认不出来。

```ts
for (let i = index - 1; i >= 0; i--) {
  const item = Get(units, i);
  if (item instanceof LineWrap || item instanceof Bracket || item instanceof GenericType) {
    continue;
  }
  // **已经成形的类型节点是透明的**（第 66 轮补）：`infer` 现在会先被
  // `infer-type.xl.md` 收成 `InferType`（它排在通用队列里、比条件类型更早），
  // 于是 `T extends infer U ? U : never` 的回扫会撞上 `InferType` ——
  // 不跳过去就整条条件类型认不出来（判定说有、收集说找不到）。
  // 同类还有参数表 `TypeParameter`（`T extends X<in infer U> ? … : …`）。
  if (item === null) {
    continue;
  }
  if (item.constructor.name === "InferType" || item.constructor.name === "TypeParameter") {
    continue;
  }
  if (item instanceof Identifier) {
    if (item.Is("extends")) {
      return i;
    }
    continue;
  }
  // **`extends` 也可能是 `Keyword`**（第 123 轮）：`KeywordReorganization` 会把类型位的
  // `extends` 升级（本文件按类型队列排在它前面，但**通用队列那一趟**里本规则也可能被问到
  // 第二趟——那时词已经升级完了）。只认 `Identifier` 会让第二趟整类失灵，
  // 与 `ternary-operator.xl.md` 的 `IsTypePosition` 记的是同一个坑。
  // `Identifier` 与 `Keyword` **没有共同的取文本方法**（`Keyword` 只有 `Value`），所以分两支写。
  if (item !== null && item.constructor.name === "Keyword" && (item as any).Value === "extends") {
    return i;
  }
  if (item instanceof SymbolToken) {
    const text = item.TempToString();
    if (text === "." || text === "?.") {
      // 约束段里的成员访问：`T extends NodeJS.ArrayBufferView<infer B> ? … : …`
      // ——`.` 必须放行，否则回扫在约束的第一个点号上就停下，
      // 整条条件类型认不出来（实测 `@types/node/buffer.buffer.d.ts` 与
      // `compatibility/iterators.d.ts` 各一片）。
      continue;
    }
    if (text === "-" || text === "+") {
      // **带符号的数字字面量**（第 66 轮补）：约束可以是 `Depth extends -1 ? … : …`
      // （`lib.es2019.array.d.ts` 的 `FlatArray`）。类型位里的 `-1` **不会**被折成
      // `UnaryOperator`（折叠规则在通用队列上，那时这段文本已经装进类型容器了），
      // 所以回扫会先撞上一个裸的 `-` 符号——不放行就整条条件类型认不出来，
      // 它会被值位的三元规则抢走（产物里出现 `<TernaryOperator>` 而不是 `<ConditionalType>`，
      // `cases:align` 实测 `LiteralType` 缺 3 处正是它）。
      continue;
    }
    return -1;
  }
}
return -1;
```

## private method FindStart:(units:Array<Token>, extendsIndex:int)=>int

条件那一端的起始下标。

从 `extends` 往左走，把条件类型**吃掉的单元**收进来：标识符 / 关键字 / 字符串字面量类型 /
`[...]`（索引访问）/ `(...)`（括号类型）/ 泛型实参段 / 已经成形的函数类型……
判据反过来写更省事：**只有符号会划边界**，而且只放行 `.` / `?.` / `!`（成员访问与非空断言）。

两处必须停：

- 别的符号（`=` / `:` / `,` / `|` / `&` / `(` / `;`）——再往左就不是这个条件了
  （`type A = B extends C ? D : E` 停在 `=`；联合类型里的 `X | T extends U ? A : B` 停在 `|`）；
- 换行且**换行本身是语句边界**（`Statement.IsLineBreakBoundary`）——上一行是另一条语句。

```ts
let start = extendsIndex - 1;
while (start >= 0) {
  const item = Get(units, start);
  if (item === null) {
    break;
  }
  // **`is` 是类型谓词的标记，不划在这里面**（第 66 轮第三批）：
  // `x is A extends B ? C : D` 的条件是 `A`，不是 `x is A`——`is` 是个 `Identifier`，
  // 不挡的话回扫会越过它把参数名也吃进条件里。那又会让谓词规则在条件类型里再匹配一次，
  // 两条规则互相套娃（实测 `@types/node/util.d.ts` 抛 `Maximum call stack size exceeded`）。
  if (item instanceof Identifier && item.Is("is")) {
    break;
  }
  if (item instanceof SymbolToken) {
    const text = item.TempToString();
    if (text === "." || text === "?." || text === "!") {
      start = start - 1;
      continue;
    }
    break;
  }
  if (item instanceof LineWrap && Statement.IsLineBreakBoundary(units, start)) {
    break;
  }
  start = start - 1;
}
return start + 1;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把条件类型整段收成一个 `ConditionalType`，**返回新的下标**。

收集规则与 `function-type.xl.md` / `type-define.xl.md` 同一套（都是「一段类型文本到哪里为止」）：

- 起点由 `FindStart` 给出（从 `?` 往前找到 `extends`，再往前找到条件的左边界）；
- 从 `?` 往后扫到 `;` / `,` / 赋值符号为止；
- 换行处按 `IsStatementKeyword` / `IsDeclarationBoundary` / `Statement.IsLineBreakBoundary` 三条判终点；
- **嵌套的条件类型只会被收进最外层那个节点**（`A extends B ? C : D extends E ? F : G` 里的
  假分支又是条件类型）：收集是贪婪的，内层不会单独成形——与柯里化函数类型同一个取舍；
- 一路没遇到终止符就收到列表末尾。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("current 为空");
}
const extendsIndex = this.FindExtendsIndex(units, index);
if (extendsIndex < 0) {
  return index;
}
const startIndex = this.FindStart(units, extendsIndex);
const items: Token[] = [];
let endIndex = index;
// **假分支那一端的 `:` 还没出现时，换行不是边界**（第 100 轮）：
// ```
// ): MockedObject[MethodName] extends Function ? Mock<MockedObject[MethodName]>
//     : never;
// ```
// 这种「`?` 真分支在这一行、`:` 假分支在下一行」的排版在 `.d.ts` 里遍地都是
// （`@types/node/test.d.ts` 的 `Mocked` 接口一整屏都是它）。照原来那三条判据会在换行处收尾，
// `: never` 掉到外面成了**平级语句**——投影侧表现为「多出 `ExpressionStatement` 412
// + 假分支里的类型字面量成员整片丢失（`PropertySignature` 缺 67）」，而且
// `ConditionalType` / `MethodSignature` 的区间都短一截（漂移）。
//
// 两条放行都必要：`colonNext`（换行后面紧跟 `:`）与 `afterColon`（`:` 后面紧跟换行）。
// 判据落在「本条条件类型自己的那个冒号」上，所以只在**类型位已经确认有 `extends` + `?`**
// 的这一趟扫描里生效，不会动值位三元。
let colonSeen = false;
let afterColon = false;
// **自己那个 `:` 之后又出现 `?` ⇒ 那个 `:` 是内层条件类型的**（第 126 轮）。
// 见下面 `isColon` 那一支：假分支里的**外层 `:`** 才是这一段的终点。
let questionSinceColon = false;
for (let i = index + 1; i < units.length; i++) {
  const item = Get(units, i);
  if (item === null) {
    throw new Error("item 为空");
  }
  if (item instanceof SymbolToken && (item.Is(";") || item.Is(",") || template.SymbolTemplate.IsAssignmentSymbol(item.TempToString()))) {
    break;
  }
  if (item instanceof LineWrap) {
    const next = GetSkipNextWrapSymbol(units, i);
    if (next === null || IsStatementKeyword(next) || IsDeclarationBoundary(next)) {
      break;
    }
    // **判据要落在原文那个字符上，不能只看「下一格是不是 `:` 符号」**：跑到这里时
    // `TypeDefineReorganization` 往往已经把 `: never` 收成一个 `TypeDefine` 单元了
    // （`next instanceof SymbolToken` 于是为假，第一版就是这么漏的）。
    // `Source.Value` 就是那一格上的字符，它不受「收成哪个单元」影响。
    const nextStart = next.SourceRange.Start;
    const colonNext =
      !colonSeen && nextStart !== null && (nextStart.Value === ":" || nextStart.Value === "?");
    if (!colonNext && !afterColon && Statement.IsLineBreakBoundary(units, i)) {
      break;
    }
  }
  if (!(item instanceof LineWrap)) {
    // **注释不改变 `afterColon`**（第 126 轮）：`.d.ts` 里「`:` 之后先一行注释、再换行」
    // 的排版遍地都是——
    //
    //     T extends null | undefined ? T : // special case for `null | undefined`
    //         T extends object & { … } ? … : …
    //
    // 注释是一个 `LineAnnotation` 单元，原来它被当成「别的单元」把 `afterColon` 清成 `false`，
    // 紧接着那个换行的边界判定就成立、整条条件类型在注释处收尾
    // （实测 `lib.es5.d.ts` 的 `Awaited`：缺 43 个节点，假分支里那一整条内层条件类型全没了）。
    // 注释是 trivia，与软换行一样**不参与**这段判定；它仍然进 `Data`（投影侧按 `INVISIBLE` 跳过）。
    const isComment = item instanceof LineAnnotation || item instanceof AreaAnnotation;
    if (!isComment) {
      const isColon = item instanceof SymbolToken && item.Is(":");
      afterColon = false;
      if (isColon) {
        if (!colonSeen) {
          // 本条条件类型自己的那个 `:`。
          colonSeen = true;
          afterColon = true;
        } else if (!questionSinceColon) {
          // **这是外面那条条件类型的 `:`**（自己那个 `:` 之后没再出现 `?`）：
          // 本条件类型的假分支到此为止。少了这一支，内层会把外层假分支的尾巴
          // 一起吞进去——实测 `lib.es5.d.ts` 的 `F extends (…) ? Awaited<V> : never : T`
          // 里内层的区间一直撑到 `T`（`ConditionalType` 漂移 + 假分支整段丢）。
          break;
        } else {
          // 自己那个 `:` 之后出现过 `?`，所以这个是**内层**条件类型的 `:`——
          // 右结合嵌套 `A extends B ? C : D extends E ? F : G` 靠这一支才能整段收完。
          questionSinceColon = false;
        }
      } else if (item instanceof SymbolToken && item.Is("?") && colonSeen) {
        questionSinceColon = true;
      }
    }
    items.push(item);
    endIndex = i;
  }
}
if (items.length === 0) {
  return index;
}
const result = new ConditionalType(template);
result.Parent = current.Parent;
result.SignIn(Get(units, startIndex)!.SourceRange.Start!);
result.SignOut(Get(units, endIndex)!.SourceRange.End!);
for (let i = startIndex; i <= endIndex; i++) {
  const item = Get(units, i);
  if (item !== null && !(item instanceof LineWrap)) {
    result.AddAndCloseLast(item);
  }
}
result.TryToClose();
return ReplaceCountAt(units, startIndex, endIndex - startIndex + 1, result);
```

# class ConditionalType extends IndependentToken

条件类型（`T extends U ? A : B`）。

**类名必须与产物的标签名一致**：`constructor.name` 就是它的 XML 标签名。

它**没有**覆写 `ToXmlString`，XML 由基类产出：`<ConditionalType>…</ConditionalType>`。

## constructor:(template:Template)=>void

转调基类构造器，**并且把类型队列装上**。

理由与 `type-define.xl.md` / `function-type.xl.md` 的同名构造器相同：本单元是重组规则建出来的，
里面的 `keyof` / `typeof` / `infer` / `readonly` / `void` 不会被外层再扫一遍，
`KeywordReorganization` 排在通用队列最后、轮不到它们。

```ts
super(template);
ParsePipeline.InitialKeywordReorganizationQueue(this);
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 把 `Data` 里每个子单元克隆后整批加入 → `TryToClose()`；批量加入用 `AddRange`。

```ts
const result = new ConditionalType(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
