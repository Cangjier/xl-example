# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../../core/syntax/close-rule.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { IsDeclarationTailStop } from "../declaration-common.xl.md"
import { SkipNextTrivia, SkipNextWrapSymbol, SkipPreviousAnnotation, SkipPreviousWrapSymbol, SkipPreviousTrivia } from "../../text-common-util.xl.md"
import { Bracket } from "../bracket.xl.md"
import { ClassBody } from "../class/class-body.xl.md"
import { Identifier } from "../identifier.xl.md"
import { GenericType } from "../generic-type.xl.md"
import { InterfaceBody } from "../interface/interface-body.xl.md"
import { ArrayLiteral } from "../json/array-literal.xl.md"
import { ReturnType } from "../function/return-type.xl.md"
import { SymbolToken } from "../symbol-token.xl.md"
import { String } from "../string/string.xl.md"
import { TypeLiteralBody } from "../type-literal/type-literal-body.xl.md"
import { LineWrap } from "../line-wrap.xl.md"
import { New } from "../new/new.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

成员签名：把接口 / 类型体里**没有名字**的成员收成一个 `Signature`。

三种形状共用这一个节点，靠 `kind` 属性区分：

| 写法 | `kind` | 说明 |
| --- | --- | --- |
| `(a: number): string` | `call` | 调用签名（`interface I { (): void }`） |
| `new (a: number): I` | `construct` | 构造签名（`interface ArrayConstructor { new (…): Array<any> }`） |
| `[key: string]: number` | `index` | 索引签名——**本文件暂不接手**，见下面「边界」 |

**为什么要单独一条规则**：`(` 与 `new` 都不是「名字 + 括号」的形状，`MethodDeclaration` 与 `Field`
都要求先有一个能当名字的 `Identifier`，所以这两种成员此前完全没有节点——
产物里只剩 `<Statement>` 加一堆散单元（实测 `@types` / `lib.es5.d.ts` 里 1355 处）。

**边界（本文件不做的部分）**：

- **索引签名** `[key: string]: number`：它同时是 Json 数组的形状（`[` 开头的括号），
  而 `JsonArrayCloseRule` 排在成员规则之后；要在它成形前后各抢一次，属于另一条改动。
  这一轮只做 call / construct（占 1355 处里的 1355 处中的绝大多数：1190 处是 construct）。
- **类型字面量里的签名**（`type F = { (): void }`）：那里的父单元是 `ObjectLiteral` 而不是
  `InterfaceBody` / `ClassBody`，本轮的成员位置判据不含它（第 674 轮复核：那一格**已经成形**，
  成员位置判据后来一起认了它）。

`SignatureCloseRule` 写在 `Signature` **之前**：后者的静态字段 `Instance` 在类定义时就
`new SignatureCloseRule()`，写反了会命中暂时性死区（TDZ）。

# class SignatureCloseRule extends CloseRule

## static readonly field Instance:SignatureCloseRule = new SignatureCloseRule()

唯一的实例，注册进通用规则队列时用。

## private method SignatureTailEnd:(units:Array<Token>, parametersIndex:int)=>int

签名右端（`:` 与返回类型）的最后一个单元下标；取不到时返回 `-1`。

判据与 `method-declaration.xl.md` 的 `SignatureTailEnd` 同源（这里独立实现一份：
两边都是「成员签名」的尾部，但一个在方法声明文件里、一个在成员签名文件里，
合并到 `declaration-common` 会为了 20 行代码引入新的依赖方向）：

- `;` / `,` 终止；
- **软换行就是成员边界**——但换行前一个实义单元是 `;` / `,` 以外的符号时继续扫（支持折行的联合类型）；
- **换行的下一格是 `:` 时要跨过去**（第 901 轮，见 `HasSignatureTail` 那一段的账）；
- **还没找到冒号时，成员体自己的 `}` 也跨过去**（第 901 轮）：`type T = { (a: string): void }`
  的列表里，返回类型 `void` 后面紧跟着的就是那对花括号的 `}` ——它是**这个体的收尾**、
  不是下一条声明的开头（`IsDeclarationTailStop` 把任何非类型字面量的 `{` 都当体，
  `}` 走的是另一支，这里补上）。
  **只在本方法还没见到那个 `:` 时跳**：见到之后 `}` 就是这一段的终点，不能越过它去吞下一条成员。
- `IsDeclarationTailStop` 的其余终止条件照样生效。

```ts
let tailEnd = -1;
let i = parametersIndex + 1;
while (i < units.length) {
  const item = Get(units, i);
  if (item instanceof SymbolToken && (item.Is(";") || item.Is(","))) {
    break;
  }
  if (item instanceof LineWrap) {
    const previous = Get(units, i - 1);
    // **返回类型那个 `:` 写在下一行**（第 901 轮）：`(a: string)` 换行 `: void }` 里
    // 换行后面那一格就是返回类型的冒号 —— 那是同一段排版，不是这一行的终点。
    // 这一跳与 `SignatureTailIsColon` 是**同一句判据**（两处必须一致，否则判定说成立、
    // 搬运却停在换行上）。
    const after = Get(units, SkipNextTrivia(units, i));
    if (after instanceof SymbolToken && after.Is(":")) {
      i = i + 1;
      continue;
    }
    const continues = previous instanceof SymbolToken && !previous.Is(";") && !previous.Is(",");
    if (continues === false) {
      break;
    }
    i = i + 1;
    continue;
  }
  if (tailEnd < 0 && item instanceof Bracket && item.startBracket === "}") {
    i = i + 1;
    continue;
  }
  if (tailEnd < 0 && item instanceof Bracket && item.startBracket === "}") {
    i = i + 1;
    continue;
  }
  if (IsDeclarationTailStop(units, i)) {
    break;
  }
  tailEnd = i;
  i = i + 1;
}
return tailEnd;
```

## private method SignatureTailIsColon:(units:Array<Token>, parametersIndex:int)=>bool

参数表之后是不是「一个 `:` 起头的返回类型」——跨过 trivia（注释与软换行）之后那个实义单元。

**为什么那一跳要走 `SkipNextTrivia`**（第 900 轮，片段普查当场逮到的）：形参表与返回类型那个 `:`
之间夹**一条注释**在 TypeScript 里是合法排法——`type T = { (a: string)/*c*/: void }`。
原来只跳软换行 ⇒ 看到的下一格是那条注释 ⇒ 判否 ⇒ 括号留在原地成了裸 `Bracket`、
签名一个都不成形（实测：调用签名 / 泛型签名 / 构造签名三族，类型字面量与接口两种宿主，
缺 `CallSignature` / `Parameter`、多 `Bracket`）。`Process` 那一侧早就是 `SkipNextTrivia` 了，
这里与它对齐——**判据与搬运问的必须是同一格**，两处各跳各的就是第二份会漂的答案。

**夹一个软换行的那一档**（`(a: string)` 换行 `: void`）第 901 轮一起收掉：`SkipNextTrivia`
本来就跳得过那个换行，缺的只是**解析期不许在它前面收壳**——那一格由
`Statement.IsPendingSignatureReturnColon` 兜住（账在 `gap-r900-signature-return-newline`）。

```ts
const colon = Get(units, SkipNextTrivia(units, parametersIndex));
return colon instanceof SymbolToken && colon.Is(":");
```

## private method IsBareParameters:(units:Array<Token>, parametersIndex:int, parameters:Token | null)=>bool

`parameters` 这一对 `(` 括号是成员体里**一条没有返回类型的签名**吗——`type T = { (a: string) }`。

**为什么这一档必须存在**：`HasSignatureTail` 原来要求那个 `:` 存在（理由原本是
「把 `(f())` 这类**括号表达式**挡在外面」），可**括号表达式不可能出现在成员体里** ——
`InterfaceBody` / `ClassBody` / `TypeLiteralBody` 装的只能是成员（`Field` /
`MethodDeclaration` / `Signature`），而一个裸的 `( … )` 在那里**只有调用签名一种读法**。
`MethodDeclaration` 那一侧早就是这个口径（`IsMemberSignature` 的 `tailEnd < 0` 那一支：
「参数表之后什么都没有」照样算成员签名），这里与它对齐。
少了这一格：`type T = { (a: string) }` 里那对括号留在原地成了裸 `Bracket`、
签名一个都不成形（实测 `token/types/gap-r900-call-signature-no-return-type`：
缺 `CallSignature` / `Parameter`、多 `Bracket`）。

**判据一条**：参数表之后**没有别的单元**（列表末尾）或**只有一个软换行**。

**为什么「列表末尾」这一支是安全的**（片段普查实测过）：成员体那个 `}` **不在**这一层列表里
（`MoveDataTo` 只搬内容、不搬那对花括号），所以「最后一名成员的参数表之后再无实义单元」
正好就是这一档。反过来，函数类型里那对括号**永远不住在成员体的列表里**——它是
`ParenthesizedType` / `FunctionType` 的内容，另有归宿。

**函数类型那一路的另一个入口也要堵**（第 901 轮实测撞出来的，`@types/node/dgram.d.ts`
等 11 份 `.d.ts` 从绿变红）：`interface I { lookup?: ((hostname: string, …) => void) | undefined }`
里内层那对括号的**自己那张表**里也有一个 `:`（就在它自己的形参里：`hostname: string`），
于是 `SignatureTailIsColon` 在那张表上答「是」⇒ 整段函数类型被抢成一个 `CallSignature`。
那一格由 `HasSignatureTail` 开头那句「**形参表后面紧跟 `=>` ⇒ 是函数类型**」堵住。

```ts
if (!(parameters instanceof Bracket) || parameters.startBracket !== "(") {
  return false;
}
// **后面跟着 `=>` ⇒ 这是函数类型的形参表**（第 901 轮）：与 `HasSignatureTail` 开头那一句
// 同一条判据（两处都要问，因为两条入口各走各的）。
const after = Get(units, SkipNextTrivia(units, parametersIndex));
if (after instanceof SymbolToken && after.Is("=>")) {
  return false;
}
return after === null || after instanceof LineWrap;
```

## private method HasSignatureTail:(units:Array<Token>, parametersIndex:int)=>bool

参数表之后是不是「`: 返回类型` 而且到此收尾」。

**没有返回类型那一档见 `IsBareParameters`**（第 901 轮）：`type T = { (a: string) }` 里
那对括号同样是调用签名 —— 判据、为什么可以只看父单元、少了它会怎样都写在那一处。

```ts
// **形参表后面紧跟 `=>` ⇒ 这一段是函数类型，不是签名**（第 901 轮，实测撞出来的）：
// `interface I { lookup?: ((hostname: string, …) => void) | undefined }` 里，
// 内层那对括号的**自己那张表**里也有一个 `:`（就在它自己的形参里：`hostname: string`），
// 于是 `SignatureTailIsColon` 在那张表上答「是」（探针实测：那张表是
// `[Bracket, LineWrap, =>, void]`）⇒ 整段函数类型被抢成一个 `CallSignature`
//（第 901 轮实测 `@types/node/dgram.d.ts` 等 11 份 `.d.ts` 从绿变红）。
// **那一跳要跨 trivia**：探针里那个 `=>` 与形参表之间正夹着一个软换行。
// **这一句是安全的**：调用签名与构造签名的形参表右边**永远不会**直接跟 `=>`
//（`(a) => b` 只有函数类型与箭头函数两种读法，两种都不归本规则）。
const parameters = Get(units, parametersIndex);
const afterParameters = Get(units, SkipNextTrivia(units, parametersIndex));
if (afterParameters instanceof SymbolToken && afterParameters.Is("=>")) {
  return false;
}
// **没有返回类型那一档**：形参表之后什么都没有 / 只有一个软换行 ⇒ 裸形参表签名。
if (this.SignatureTailIsColon(units, parametersIndex) === false) {
  return this.IsBareParameters(units, parametersIndex, parameters);
}
const tailEnd = this.SignatureTailEnd(units, parametersIndex);
if (tailEnd < 0) {
  return false;
}
// **尾部之前夹着 `=>` ⇒ 这一段也是函数类型**（第 901 轮，与上面那句同一条根的另一处落点）：
// `((hostname: string, …) => void)` 那种**括号套括号**里，本方法拿到的「形参表」
// 是**外层**那个 `(`，而它的实义内容是内层那一整段函数类型——于是
// `SignatureTailEnd` 从**内层形参自己的类型标注**那个 `:`
//（`hostname: string`）上算出了尾部（探针实测：`parametersIndex+1` 的下一格是联合类型的 `|`，
// 而 `tailEnd` 停在内层那个冒号上）。
// 判据是「**从形参表右端到那个尾部之间有没有 `=>`**」——调用签名的返回类型位里
// 不可能出现一个平级的箭头。
let sawArrow = false;
for (let i = parametersIndex + 1; i <= tailEnd; i++) {
  const item = Get(units, i);
  if (item instanceof SymbolToken && item.Is("=>")) {
    sawArrow = true;
    break;
  }
}
if (sawArrow) {
  return false;
}
const afterTail = Get(units, tailEnd + 1);
if (afterTail === null || afterTail instanceof LineWrap) {
  return true;
}
return afterTail instanceof SymbolToken && afterTail.Is(";");
```

## private method IsMemberPosition:(unit:Token | null)=>bool

这个单元是不是**直接**落在成员位置上（`InterfaceBody` / `ClassBody`）。

与 `Field` 读父单元的做法同源：只有成员体里的括号才是签名，
函数体里的 `(a): b` 是表达式。

```ts
if (unit === null) {
  return false;
}
const parent = unit.Parent;
return parent instanceof InterfaceBody || parent instanceof ClassBody || parent instanceof TypeLiteralBody;
```

## private method IsComputedMemberName:(unit:Token | null)=>bool

这个单元是不是**计算成员名**的 `[` 括号（`[Symbol.iterator]` / `["m"]` / `[KEY]`）。

**为什么必须在这里拒一次**：通用规则队列里 `SignatureCloseRule` 排在
`MethodDeclarationCloseRule` **之前**（见 `../../parse-pipeline.xl.md` 的 `GeneralCloseRule`），
而 `(` 那一支原来只挡 `Identifier` / `GenericType`。`[Symbol.iterator]` 在这个时机是一个
`Bracket`（`[`）或已经成形的 `ArrayLiteral`，两种都不在挡的范围里，于是
`(): ArrayIterator<number>;` 被收成一个**无名签名**，那个 `[` 单元被签名规则消费掉；
等轮到 `MethodDeclarationCloseRule`，`ParameterIndex` 再也找不到「名字 + `(`」，
整条方法签名**永远拿不到 `MethodDeclaration`**。

实测（`interface I { [Symbol.iterator](): ArrayIterator<number>; }`，修前）：
`<ArrayLiteral>Symbol.iterator</ArrayLiteral><Signature kind="call">…</Signature>`；
修后：`<MethodDeclaration name="Symbol.iterator">…`。

**只跟「有没有方法体」有关**：带方法体的 `[Symbol.iterator]() { }` 本来就走
`BodyIndex >= 0` 那一支，与签名规则无关，所以原来就是对的；
接口 / 类型字面量 / 类三种容器表现完全一致。

```ts
if (unit instanceof ArrayLiteral) {
  return true;
}
return unit instanceof Bracket && unit.startBracket === "[";
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个成员签名的开头（`(` 括号或 `new` 词）。

**两条位置判据**，缺一不可：

1. 父单元是 `InterfaceBody` / `ClassBody`（`IsMemberPosition`）；
2. 圆括号那条路还要看**前一个实义单元**：它不能是 `Identifier` / `GenericType`——
   `m(): void` 里那个 `(` 前面是方法名 `m`，那是 `MethodDeclaration` 的形状，不是无名签名。

第 2 条是与 `MethodDeclaration` 的分工线，看的是**紧挨着的前一个实义单元（只跨注释，不跳软换行）**：

- `m(): void` 里 `m` 与 `(` 相邻 → 前一个是 `Identifier`，那是方法名 → 不是无名签名；
- `rename?(a: string): void` 里 `(` 前面是可选标记 `?`，`?` 前面才是方法名 → **也要往后看一格**，
  否则可选方法签名会被拆成「`rename` + `?` + 一个无名签名」；
- `… : number` 换行 `(): void` 里 `(` 前面是**软换行** → 这是新的一条成员 → 是签名。

**注释要跨过去**（第 817 轮）：`interface I { m /* c */ (): void; }` 里 `(` 前面那个实义单元是
注释 ⇒ 照「紧挨着的前一格」判，`before` 是 `AreaAnnotation` 而不是方法名 ⇒ 本规则把
`(): void;` 收成一个无名 `Signature`，而 `m` 与注释漏在外面（实测 `MethodSignature` 缺、
多出一个 `CallSignature`）。而 **`MethodDeclaration` 那一侧（`ParameterIndex`）已经改了**——
两边判据不对齐时，谁先把括号认走就决定了产物形状。
改法只能用 `SkipPreviousAnnotation`（**只跳注释**）：软换行在这里是成员边界、语义上不能跳
（上面那条），跳了就漏掉真正的无名签名。
`abstract class A { abstract m /* c */ (): void; }` 与泛型那一支同族。

**不跳软换行**是关键：成员体里「一行一条成员」的排版让软换行天然就是成员边界，
若跳过它去看，就会把上一条成员的尾部（`number`）当成名字，从而漏掉真正的无名签名。

**本规则必须排在 `MethodDeclaration` 之前**：重组是**按规则轮询**的（每条规则扫一遍所有下标），
`MethodDeclaration` 排在前面时会先把 `string(a: string): number` 里的 `string` 当成方法名收走——
那条无语义的类型名 `string` 于是变成了 `<MethodDeclaration name="string">`，
而前面那条无名签名再也拼不回来（实测 `interface I { (a: number): string` 换行 `(a: string): number }`
两条签名全丢）。

```ts
const current = Get(units, index);
if (!this.IsMemberPosition(current)) {
  return false;
}
if (current instanceof Bracket && current.startBracket === "(") {
  let immediateIndex = SkipPreviousAnnotation(units, index);
  const immediate = Get(units, immediateIndex);
  if (immediate instanceof SymbolToken && immediate.Is("?")) {
    immediateIndex = SkipPreviousAnnotation(units, immediateIndex);
  }
  const before = Get(units, immediateIndex);
  // **字符串字面量名也是名字**（第 833 轮）：`interface I { "a"(x: string): void }` 里 `(` 前面
  // 是那个 `String` 单元 —— 与 `m(): void` 同一条分工线（本规则必须让给 `MethodDeclaration`，
  // 它那一侧的 `MethodNameOf` / 名字判据早就认 `String`，缺的只是这里让路）。
  // 少了这一档：字符串名的方法被抢成一个无名 `Signature`，那个名字掉在成员列表里当散单元
  // （实测 `"a"(x: string): void` 的产物是 `StringLiteral` + `CallSignature`，
  // 而 TS 是**一个** `MethodSignature`）。
  if (before instanceof Identifier || before instanceof GenericType || before instanceof String) {
    return false;
  }
  // **名字写在上一行**（第 827 轮）：`interface I { m` 换行 `(): void; }` 里那个 `(` 是
  // `m` 的形参表（TS 那边是 `MethodSignature`），不是无名签名 —— 成员体里 ASI 不管换行，
  // 「名字 + `(`」永远读成方法。
  //
  // **判据是「上一行只写了一个名字」**：往前跳过 trivia 得到那个名字，再看名字**自己**前面
  // 是不是一条成员的起点（体那个 `{`、`;` / `,`、修饰词、或列表开头）。
  // 少了「名字前面那一格」这一问，`interface I { a: number` 换行 `(): void }` 那条**真正的**
  // 无名签名会被上一行的类型名 `number` 误认成方法名（那条文档里写着「不跳软换行」的理由）。
  if (before instanceof LineWrap) {
    const nameIndex = SkipPreviousTrivia(units, immediateIndex);
    const name = Get(units, nameIndex);
    if (name instanceof Identifier) {
      const headIndex = SkipPreviousTrivia(units, nameIndex);
      const head = Get(units, headIndex);
      if (headIndex < 0) {
        return false;
      }
      if (head instanceof Bracket && head.startBracket === "{") {
        return false;
      }
      if (head instanceof SymbolToken && (head.Is(";") || head.Is(",") || head.Is("}"))) {
        return false;
      }
      if (head instanceof Identifier || (head !== null && head.constructor.name === "Keyword")) {
        const word = head instanceof Identifier ? head.TempToString() : (head as any).Value;
        if (
          word === "public" ||
          word === "private" ||
          word === "protected" ||
          word === "static" ||
          word === "readonly" ||
          word === "abstract" ||
          word === "async" ||
          word === "get" ||
          word === "set" ||
          word === "declare" ||
          word === "export" ||
          word === "default"
        ) {
          return false;
        }
      }
    }
  }
  // **`=` 后面不是签名**（第 66 轮）：类字段 `f = (a: number): void => {}` 是一条**值**字段，
  // 括号前面是赋值号。本规则排在 `FieldCloseRule` 之前，此刻那个 `(` 的父单元还是
  // `ClassBody`（`IsMemberPosition` 成立），不挡的话整条字段被收成一个
  // `<Signature kind="call">`、箭头函数永远不成形（实测 `ArrowFunction` 缺 1 处）。
  // 签名语法里 `(` 前面不会有 `=`（带 `=` 的成员只有字段初始化式）。
  if (before instanceof SymbolToken && before.Is("=")) {
    return false;
  }
  if (this.IsComputedMemberName(before)) {
    return false;
  }
  return this.HasSignatureTail(units, index);
}
if (current instanceof Identifier && current.Is("new")) {
  // **`new` 与形参表之间的注释**（第 873 轮）：与 `Process` 那一侧成对改成 trivia 口径——
  // `new /*c*/ (a: number): X` 里只跳软换行会把注释当成形参表 ⇒ 本规则让路 ⇒
  // 那条签名被 `MethodDeclarationCloseRule` 抢成 `MethodSignature`（实测多 `Identifier(new)`）。
  let parametersIndex = SkipNextTrivia(units, index);
  if (Get(units, parametersIndex) instanceof GenericType) {
    parametersIndex = SkipNextTrivia(units, parametersIndex);
  }
  const parameters = Get(units, parametersIndex);
  if (!(parameters instanceof Bracket) || parameters.startBracket !== "(") {
    return false;
  }
  return this.HasSignatureTail(units, parametersIndex);
}
// **`new (…): T` 已经被 `NewCloseRule` 收成一个 `New` 单元**：本规则排在它后面，
// 于是这里看到的是 `New` 而不是裸的 `new` 词（`new close rule` 的 `Previous` 认
// 「`new` 后面直接跟括号」这一格）。形状与上面那一支同构，只是括号在 `New` 里面。
if (current instanceof New) {
  const newType = current.Data.find((item) => item.constructor.name === "NewType");
  if (newType === null || newType === undefined) {
    return false;
  }
  const bracket = newType.Data.find((item) => item instanceof Bracket);
  if (!(bracket instanceof Bracket) || bracket.startBracket !== "(") {
    return false;
  }
  return this.HasSignatureTail(units, index);
}
if (current instanceof GenericType) {
  let immediateIndex = SkipPreviousAnnotation(units, index);
  const immediate = Get(units, immediateIndex);
  if (immediate instanceof SymbolToken && immediate.Is("?")) {
    immediateIndex = SkipPreviousAnnotation(units, immediateIndex);
  }
  const before = Get(units, immediateIndex);
  if (before instanceof Identifier || before instanceof String || before instanceof GenericType) {
    return false;
  }
  if (this.IsComputedMemberName(before)) {
    return false;
  }
  const parametersIndex = SkipNextTrivia(units, index);
  const parameters = Get(units, parametersIndex);
  if (!(parameters instanceof Bracket) || parameters.startBracket !== "(") {
    return false;
  }
  return this.HasSignatureTail(units, parametersIndex);
}
return false;
```

**`<T …>(…)` 是第三种起点：泛型调用签名**（实测补的）。
TypeScript 允许成员签名自己带类型参数段：`interface I { <TIn extends Node>(node: TIn): void }`
（`typescript.d.ts` 里成片存在）。这一支原来完全没有起点——
`Previous` 只认「`(` 开头」与「`new` 开头」，于是那个 `<TIn …>` 散成裸的 `<` `Identifier` `extends` …，
`Signature` 本身产不出来。判据与 `new` 那一支同构：跳过类型参数段之后必须是 `(` 括号，
且 `(` 之后有 `: 返回类型` 收尾。

**但 `<` 前面有名字时要让给方法声明**（实测踩过）：
`interface I { m<T>(x: T): T }` 里的 `m` 是**方法名**、`<T>` 只是它的类型参数段，
那是 `MethodDeclaration` 的形状。少了这条守卫，本规则（位次在 `MethodDeclarationCloseRule`
**之前**）会把 `m<T>(…)` 收成一个 `Signature`，丢掉 `MethodDeclaration`
（`decl-interface-method-generics` / `type-object-method-generic` 两条用例当场报缺）。

**名字也可以是字符串**（`interface I { "a"<T>(x: T): T }`，第 833 轮）：所以那条守卫是
`Identifier` / `String` / `GenericType` 三档。**`String` 这一档原先一次都没生效过**——
它没在 `# dependencies` 里，生成出来的 TS 里 `before instanceof String` 命中的是
**JS 内建的那个 `String`** ⇒ 恒为假 ⇒ 字符串名的方法被本规则抢成无名 `Signature`
（与第 832 轮 `statement.xl.md` 那一处同一个根）。

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把一个成员签名收成一个 `Signature`，**返回新的下标**。

参数表括号作为子单元留着（与 `MethodDeclaration` 一致；括号内容已经由它自己的队列啃过）；
`new` 词也留着——它是构造签名的标记，丢了就分不出 `kind`；
`new` 与括号之间的**类型参数段**（`new <T>(x: T): T` 的 `<T>`）也要搬进去，
漏掉它 `<T>` 会从产物里整个消失（实测就是这条用例先报的 `缺 GenericType`）。
**构造签名前面可以有一个 `abstract`**（`abstract new (…) => T`）：它按修饰词处理——
起点前移一格、作为**第一个子单元**加进来，于是 `abstract` 不再以裸 `<Keyword>` 的身份
留在成员体里（`interface I { abstract new (): A }` 实测就是这个形状）。
只有构造签名认它：`abstract` 在 `(` 开头的调用签名上没有意义。
返回类型单独成一段 `ReturnType`（理由与 `MethodDeclaration` 相同：不然 `TypeDefine` 会从 `:` 一路吞下去）；
结尾那个可选的 `;` 与尾随软换行一并收进范围。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("current 为空");
}
const isConstruct = current instanceof Identifier;
const isGenericCall = current instanceof GenericType;
// **`new (…): T` 已经被 `NewCloseRule` 收成一个 `New` 单元**（本规则排在它后面）：
// 括号在 `New` 的 `NewType` 段里面，单元列表上那个位置就是 `New` 自己。
// 原来这一支认不出来，于是 `interface I { abstract /* c */ new (): A }` 整条签名塌成
// 裸 `ConstructSignature`（`abstract` 与注释都漏在外面）。
let isNewUnit = false;
let parametersIndex = index;
let newParameters: Token | null = null;
if (current instanceof New) {
  isNewUnit = true;
  const newType = current.Data.find((item) => item.constructor.name === "NewType");
  newParameters = newType === undefined ? null : newType.Data.find((item) => item instanceof Bracket) ?? null;
  if (newParameters === null) {
    throw new Error("成员签名不满足格式要求：new (...) : Type");
  }
}
let startIndex = index;
let abstractUnit: Token | null = null;
if (isConstruct || isNewUnit) {
  // **`abstract` 与 `new` 之间可以夹注释**：`SkipPreviousWrapSymbol` 只跳软换行，
  // 注释是一个实义单元（`AreaAnnotation`），于是 `abstract /* new */ new (): A` 里
  // 那个 `abstract` 认不出来，整条签名落成裸 `ConstructSignature`
  //（TS 那边是 `MethodSignature` + `AbstractKeyword`）。这里要的是**上一个实义单元**，
  // 所以用 `SkipPreviousTrivia`（注释也算 trivia）。
  const beforeIndex = SkipPreviousTrivia(units, index);
  const before = Get(units, beforeIndex);
  if (before instanceof Identifier && before.Is("abstract")) {
    abstractUnit = before;
    startIndex = beforeIndex;
  }
}
if (isConstruct) {
  // 与 `Previous` 那一侧成对（第 873 轮）：`new /*c*/ (…)` 里形参表要跨过注释才找得到。
  parametersIndex = SkipNextTrivia(units, index);
  if (Get(units, parametersIndex) instanceof GenericType) {
    parametersIndex = SkipNextTrivia(units, parametersIndex);
  }
}
if (isGenericCall) {
  parametersIndex = SkipNextTrivia(units, index);
}
const parameters = isNewUnit ? newParameters : Get(units, parametersIndex);
if (!(parameters instanceof Bracket)) {
  throw new Error("成员签名不满足格式要求：(...) : Type");
}
// **与 `HasSignatureTail` 问同一格**（第 900 轮）：那边判「形参表之后跨过 trivia 是不是 `:`」，
// 这边取「返回类型段从哪儿起」——两处必须同一个 `Skip`，否则判定说成立、搬运却停在注释上
// （`SignatureTailEnd` 是独立一份，`tailStart` 只用来做「找没找到」的一致性检查）。
// **没有返回类型那一档**（第 901 轮）：`SignatureTailIsColon` 答否时那对括号就是一条
// **裸形参表签名**（`type T = { (a: string) }`）——判据与 `HasSignatureTail` 同一句，
// 这里只是不再抛错（`IsBareParameters` 已经保证它确实是一条签名）。
const hasTail = this.SignatureTailIsColon(units, parametersIndex);
const tailStart = SkipNextTrivia(units, parametersIndex);
const tailEnd = hasTail ? this.SignatureTailEnd(units, parametersIndex) : -1;
if (hasTail && (tailEnd < 0 || tailStart > tailEnd)) {
  throw new Error("成员签名不满足格式要求：(...) : Type");
}
const result = new Signature(template);
result.Parent = current.Parent;
result.kind = isConstruct || isNewUnit ? "construct" : "call";
// **`new` 那个词的位置当场记下**（用户口径：token 出字段、投影直读）：
// 两个分支拿到的都是 `new` 自己那一段的起点（`Identifier(new)` 或 `New` 单元）。
if (isConstruct || isNewUnit) {
  result.NewAt = current.SourceRange.Start!.Index;
}
if (abstractUnit !== null) {
  result.AddAndCloseLast(abstractUnit);
}
if (isNewUnit) {
  // `New` 整段（含它自己的 `NewType` 与 `NewArguments` 两段）作为一个子单元收进来：
  // 投影在它里面找那个括号（见 `PrintAst` 的 `newUnit` 那一支）。
  result.AddAndCloseLast(current);
} else if (isConstruct || isGenericCall) {
  result.AddAndCloseLast(current);
  for (let i = index + 1; i < parametersIndex; i++) {
    const item = Get(units, i);
    if (item !== null && !(item instanceof LineWrap)) {
      result.AddAndCloseLast(item);
    }
  }
}
if (!isNewUnit) {
  result.AddAndCloseLast(parameters);
}
let memberEnd = parametersIndex;
if (hasTail) {
  const returnType = result.CreateReturnType();
  for (let i = tailStart; i <= tailEnd; i++) {
    const item = Get(units, i);
    if (!(item instanceof LineWrap)) {
      returnType.AddAndCloseLast(item!);
    }
  }
  returnType.SignIn(Get(units, tailStart)!.SourceRange.Start!);
  returnType.SignOut(Get(units, tailEnd)!.SourceRange.End!);
  returnType.TryToClose();
  memberEnd = tailEnd;
}
const semicolon = Get(units, memberEnd + 1);
if (semicolon instanceof SymbolToken && semicolon.Is(";")) {
  memberEnd = memberEnd + 1;
}
result.SignIn(Get(units, startIndex)!.SourceRange.Start!);
const endIndex = memberEnd;
result.SignOut(Get(units, endIndex)!.SourceRange.End!);
result.TryToClose();
return ReplaceCountAt(units, startIndex, endIndex - startIndex + 1, result);
```

# class Signature extends IndependentToken

成员签名。

**类名必须与产物的标签名一致**：`constructor.name` 就是它的 XML 标签名。

## method PrintAst:(ctx:any, v:any)=>any

可调用 / 可构造签名 `(x: A): B` / `new (x: A): B` → `CallSignature` / `ConstructSignature`
（**从 `ts-ast.xl.md` 的 `projectSignature` 整块搬来**，第 193 轮）。

产物那边两者**同标签**（`<Signature kind="call|construct">`），靠 `kind` 属性分——
所以这里按属性换 kind。TS 那边两者都没有名字字段、形参直接挂在自己身上。

**`abstract new (): A` 在接口里是 `MethodSignature`**（第 172 轮）：`abstract` 不能修饰构造签名，
TS 的解析器于是把它读成「名叫 `new` 的方法签名」——
`MethodSignature > [AbstractKeyword, Identifier("new"), TypeReference(A)]`。

**`new` 不是 `ConstructSignature` 的子节点**（第 111 轮）：TS 里 `new (x): T` 的 `new`
只是语法记号，而产物把它收成一个平级的 `Keyword(new)`（实测多出 `NewKeyword` 67）。
产物把 `new` 收成一个 `New` 子单元（`NewType` 里才是形参括号）：TS 那边
`ConstructSignature` 的形参**直接挂在自己身上**，中间没有那一层。

**结尾的分号是**照原来那份实现量的（只认 `;`，不认 `,`）——共享层的 `ctx.Node`
对可调用签名两种都加，所以这里**不能用 `ctx.Node`**，直接写字面量。

```ts
  let kind = v.attrs.get("kind") === "construct" ? "ConstructSignature" : "CallSignature";
  const props: any = ctx.Structural(v, kind);
  const kids = ctx.Kids(v);
  const abstractUnit = kids.find((k: any) => ctx.TextOf(k) === "abstract");
  if (kind === "ConstructSignature" && abstractUnit !== undefined) {
    kind = "MethodSignature";
    const at = ctx.StartOf(abstractUnit);
    props.modifiers = [
      ...(props.modifiers ?? []),
      { kind: "AbstractKeyword", text: "abstract", pos: at, end: ctx.EndOf(abstractUnit) },
    ];
    const newAt = this.NewAt;
    if (newAt >= 0) {
      props.name = { kind: "Identifier", text: "new", pos: newAt, end: newAt + 3 };
    }
  }
  if (kind === "ConstructSignature" && Array.isArray(props.parameters)) {
    props.parameters = props.parameters.filter(
      (p: any) => !(p !== null && p !== undefined && p.kind === "NewKeyword"),
    );
  }
  const newUnit = kids.find((k: any) => k.get("type") === "New");
  if (newUnit !== undefined) {
    const inner = ctx.Kids(newUnit);
    const bracket = inner.find((k: any) => k.get("type") === "Bracket");
    if (bracket !== undefined) {
      const params = ctx.UnwrapNodes(bracket).filter((k: any) => !ctx.Invisible.has(k.get("type")));
      props.parameters = ctx.ProjectEach(params, kind);
    }
    const returnType = inner.find((k: any) => k.get("type") === "ReturnType");
    if (returnType !== undefined) {
      const inner2 = ctx.UnwrapNodes(returnType).filter((k: any) => !ctx.Invisible.has(k.get("type")));
      const t = ctx.TypeOf(inner2);
      if (t !== undefined) props.type = t;
    }
    delete props.children;
  }
  const end = ctx.source[ctx.StmtEndOf(v)] === ";" ? ctx.StmtEndOf(v) + 1 : ctx.StmtEndOf(v);
  return { kind, pos: v.start, end, ...props };
```

## constructor:(template:Template)=>void

创建时把本类型的收尾规则挂上来（模板里没有专门给 `Signature` 注册就用通用队列）。

理由与 `MethodDeclaration` 的构造器相同：返回类型那一段是 `Process` 搬进来的，
不给它自己的队列，它就凑不成 `TypeDefine`。

```ts
super(template);
this.CloseRuleQueue = template.CloseRuleTemplate.Get(this.constructor);
```

## field kind:string = "call"

签名的种类：`call`（`(…): T`）或 `construct`（`new (…): T`）。

## field NewAt:int = -1

**构造签名里 `new` 那个词的下标**；不是构造签名时是 `-1`。

**为什么要有这一格**：`abstract new (): A` 在 TS 那边是 `MethodSignature > [AbstractKeyword,
Identifier("new"), …]`，所以投影要造出那个 `Identifier("new")` 的名字节点。
原来用 `ctx.source.indexOf("new", ctx.EndOf(abstractUnit))` **回原文里找**——那是
**第二份位置答案**：`abstract /* new */ new (): A` 会先命中注释里的 `new`。
而 `Process` 认下这个签名时 `current` **就是** `new` 那个单元，当场记下来即可。

## method CreateReturnType:()=>ReturnType

新建返回类型段并挂到自己名下，返回新单元。

```ts
return this.Add(new ReturnType(this.Template));
```

## method ToXmlString:()=>string

产出 XML：开标签上带 `kind` 属性，内容是参数表（构造签名还带 `new`）与返回类型段的 XML。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} kind="${this.kind}">${temp.join("")}</${name}>`;
```

## method ToDictionary:()=>Map<string, any>

产出 JSON 对象：类型名 + `kind`，外加子单元。

键名与 `ToXmlString` 开标签上的 `kind` 属性同名、值同源（都是那个区分三形态的字符串）。
子单元（构造签名的 `new` 词与类型参数段、参数表括号、返回类型段）非空时才写 `children`。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.constructor.name);
result.set("kind", this.kind);
if (this.Data.length !== 0) {
  const children: Array<any> = [];
  for (const item of this.Data) {
    children.push(item.ToDictionary());
  }
  result.set("children", children);
}
return result;
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new Signature(this.Template);
result.Sign(this);
result.kind = this.kind;
result.NewAt = this.NewAt;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
