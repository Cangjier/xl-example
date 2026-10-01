# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { IsDeclarationTailStop } from "../declaration-common.xl.md"
import { SkipNextWrapSymbol, SkipPreviousWrapSymbol } from "../../text-common-util.xl.md"
import { Bracket } from "../bracket.xl.md"
import { ClassBody } from "../class/class-body.xl.md"
import { Identifier } from "../identifier.xl.md"
import { GenericType } from "../generic-type.xl.md"
import { InterfaceBody } from "../interface/interface-body.xl.md"
import { ArrayLiteral } from "../json/array-literal.xl.md"
import { ReturnType } from "../function/return-type.xl.md"
import { SymbolToken } from "../symbol-token.xl.md"
import { TypeLiteralBody } from "../type-literal/type-literal-body.xl.md"
import { LineWrap } from "../line-wrap.xl.md"
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
  而 `JsonArrayReorganization` 排在成员规则之后；要在它成形前后各抢一次，属于另一条改动。
  这一轮只做 call / construct（占 1355 处里的 1355 处中的绝大多数：1190 处是 construct）。
- **类型字面量里的签名**（`type F = { (): void }`）：那里的父单元是 `ObjectLiteral` 而不是
  `InterfaceBody` / `ClassBody`，本轮的成员位置判据不含它（类型字面量的成员是另一条已知缺口）。

`SignatureReorganization` 写在 `Signature` **之前**：后者的静态字段 `Instance` 在类定义时就
`new SignatureReorganization()`，写反了会命中暂时性死区（TDZ）。

# class SignatureReorganization extends Reorganization

## static readonly field Instance:SignatureReorganization = new SignatureReorganization()

唯一的实例，注册进通用重组队列时用。

## private method SignatureTailEnd:(units:Array<Token>, parametersIndex:int)=>int

签名右端（`:` 与返回类型）的最后一个单元下标；取不到时返回 `-1`。

判据与 `method-declaration.xl.md` 的 `SignatureTailEnd` 同源（这里独立实现一份：
两边都是「成员签名」的尾部，但一个在方法声明文件里、一个在成员签名文件里，
合并到 `declaration-common` 会为了 20 行代码引入新的依赖方向）：

- `;` / `,` 终止；
- **软换行就是成员边界**——但换行前一个实义单元是 `;` / `,` 以外的符号时继续扫（支持折行的联合类型）；
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
    const continues = previous instanceof SymbolToken && !previous.Is(";") && !previous.Is(",");
    if (continues === false) {
      break;
    }
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

## private method HasSignatureTail:(units:Array<Token>, parametersIndex:int)=>bool

参数表之后是不是「`: 返回类型` 而且到此收尾」——调用签名与构造签名都**必须**有返回类型。

要求那个 `:` 存在，是为了把 `(f())` 这类**括号表达式**挡在外面：后者后面没有冒号，
它属于表达式层，不该被当成成员。

```ts
const colon = Get(units, SkipNextWrapSymbol(units, parametersIndex));
if (!(colon instanceof SymbolToken) || colon.Is(":") === false) {
  return false;
}
const tailEnd = this.SignatureTailEnd(units, parametersIndex);
if (tailEnd < 0) {
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

**为什么必须在这里拒一次**：通用重组队列里 `SignatureReorganization` 排在
`MethodDeclarationReorganization` **之前**（见 `../../parse-pipeline.xl.md` 的 `GeneralReorganize`），
而 `(` 那一支原来只挡 `Identifier` / `GenericType`。`[Symbol.iterator]` 在这个时机是一个
`Bracket`（`[`）或已经成形的 `ArrayLiteral`，两种都不在挡的范围里，于是
`(): ArrayIterator<number>;` 被收成一个**无名签名**，那个 `[` 单元被签名规则消费掉；
等轮到 `MethodDeclarationReorganization`，`ParameterIndex` 再也找不到「名字 + `(`」，
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

第 2 条是与 `MethodDeclaration` 的分工线，看的是**紧挨着的前一个单元（不跳软换行）**：

- `m(): void` 里 `m` 与 `(` 相邻 → 前一个是 `Identifier`，那是方法名 → 不是无名签名；
- `rename?(a: string): void` 里 `(` 前面是可选标记 `?`，`?` 前面才是方法名 → **也要往后看一格**，
  否则可选方法签名会被拆成「`rename` + `?` + 一个无名签名」；
- `… : number` 换行 `(): void` 里 `(` 前面是**软换行** → 这是新的一条成员 → 是签名。

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
  let immediateIndex = index - 1;
  const immediate = Get(units, immediateIndex);
  if (immediate instanceof SymbolToken && immediate.Is("?")) {
    immediateIndex = immediateIndex - 1;
  }
  const before = Get(units, immediateIndex);
  if (before instanceof Identifier || before instanceof GenericType) {
    return false;
  }
  // **`=` 后面不是签名**（第 66 轮）：类字段 `f = (a: number): void => {}` 是一条**值**字段，
  // 括号前面是赋值号。本规则排在 `FieldReorganization` 之前，此刻那个 `(` 的父单元还是
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
  let parametersIndex = SkipNextWrapSymbol(units, index);
  if (Get(units, parametersIndex) instanceof GenericType) {
    parametersIndex = SkipNextWrapSymbol(units, parametersIndex);
  }
  const parameters = Get(units, parametersIndex);
  if (!(parameters instanceof Bracket) || parameters.startBracket !== "(") {
    return false;
  }
  return this.HasSignatureTail(units, parametersIndex);
}
if (current instanceof GenericType) {
  let immediateIndex = index - 1;
  const immediate = Get(units, immediateIndex);
  if (immediate instanceof SymbolToken && immediate.Is("?")) {
    immediateIndex = immediateIndex - 1;
  }
  const before = Get(units, immediateIndex);
  if (before instanceof Identifier || before instanceof String || before instanceof GenericType) {
    return false;
  }
  if (this.IsComputedMemberName(before)) {
    return false;
  }
  const parametersIndex = SkipNextWrapSymbol(units, index);
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
那是 `MethodDeclaration` 的形状。少了这条守卫，本规则（位次在 `MethodDeclarationReorganization`
**之前**）会把 `m<T>(…)` 收成一个 `Signature`，丢掉 `MethodDeclaration`
（`decl-interface-method-generics` / `type-object-method-generic` 两条用例当场报缺）。

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
let startIndex = index;
let abstractUnit: Token | null = null;
if (isConstruct) {
  const beforeIndex = SkipPreviousWrapSymbol(units, index);
  const before = Get(units, beforeIndex);
  if (before instanceof Identifier && before.Is("abstract")) {
    abstractUnit = before;
    startIndex = beforeIndex;
  }
}
let parametersIndex = isConstruct ? SkipNextWrapSymbol(units, index) : index;
if (isConstruct && Get(units, parametersIndex) instanceof GenericType) {
  parametersIndex = SkipNextWrapSymbol(units, parametersIndex);
}
if (isGenericCall) {
  parametersIndex = SkipNextWrapSymbol(units, index);
}
const parameters = Get(units, parametersIndex);
if (!(parameters instanceof Bracket)) {
  throw new Error("成员签名不满足格式要求：(...) : Type");
}
const tailStart = SkipNextWrapSymbol(units, parametersIndex);
const tailEnd = this.SignatureTailEnd(units, parametersIndex);
if (tailEnd < 0 || tailStart > tailEnd) {
  throw new Error("成员签名不满足格式要求：(...) : Type");
}
const result = new Signature(template);
result.Parent = current.Parent;
result.kind = isConstruct ? "construct" : "call";
if (abstractUnit !== null) {
  result.AddAndCloseLast(abstractUnit);
}
if (isConstruct || isGenericCall) {
  result.AddAndCloseLast(current);
  for (let i = index + 1; i < parametersIndex; i++) {
    const item = Get(units, i);
    if (item !== null && !(item instanceof LineWrap)) {
      result.AddAndCloseLast(item);
    }
  }
}
result.AddAndCloseLast(parameters);
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
let memberEnd = tailEnd;
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

## constructor:(template:Template)=>void

创建时把本类型的重组规则挂上来（模板里没有专门给 `Signature` 注册就用通用队列）。

理由与 `MethodDeclaration` 的构造器相同：返回类型那一段是 `Process` 搬进来的，
不给它自己的队列，它就凑不成 `TypeDefine`。

```ts
super(template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## field kind:string = "call"

签名的种类：`call`（`(…): T`）或 `construct`（`new (…): T`）。

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

## method Clone:()=>Token

克隆自身。

```ts
const result = new Signature(this.Template);
result.Sign(this);
result.kind = this.kind;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
