# dependencies
```xl
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../../core/extensions/list-extension.xl.md"
import { DeclarationEnd, DeclarationModifiers, DeclarationStart, IsDeclarationTailStop, ScanDeclarationBody, ScanDeclarationTailEnd, TakeDeclarationDecorators } from "../declaration-common.xl.md"
import { SkipNextWrapSymbol } from "../../text-common-util.xl.md"
import { Bracket } from "../bracket.xl.md"
import { BracketNameText } from "../field.xl.md"
import { JsonArray } from "../json/json-array.xl.md"
import { ClassBody } from "../class/class-body.xl.md"
import { Common } from "../common.xl.md"
import { GenericType } from "../generic-type.xl.md"
import { InterfaceBody } from "../interface/interface-body.xl.md"
import { MethodBody } from "./method-body.xl.md"
import { TypeLiteralBody } from "../type-literal/type-literal-body.xl.md"
import { ReturnType } from "./return-type.xl.md"
import { Symbol } from "../symbol.xl.md"
import { ConstString } from "../string/const-string.xl.md"
import { String } from "../string/string.xl.md"
import { WrapSymbol } from "../wrap-symbol.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

方法声明：把 `name(参数): 返回类型 { 方法体 }` 收成一个 `MethodDeclaration`。

「名字 + 括号」默认会收成 `Method`（**调用**）：`Method` 是 `<Method MethodName="x">实参…</Method>`，
而方法声明要的 `<MethodDeclaration MethodName="x">参数 + 方法体</MethodDeclaration>` 结构完全不同，两者必须分开。

**与 `Method` 的分工靠「括号后面跟不跟 `{`」**：

- 括号后面是 `{` → 声明（本文件接手）；
- 其余 → 调用（`MethodReorganization` 接手）。

这也是本规则必须排在 `MethodReorganization` **之前**的原因（见 `../parse-pipeline.xl.md`）：
`Method` 一旦先成形，名字与参数就都被它装走了，这里再也看不到「名字 + `(`」。

**没有方法体的成员签名也收**：`abstract f(): void;` / 接口里的 `m(): void` / 重载签名
`calls(exact?: number): () => void;` 都是**成员签名**，它们该有自己的节点。

原来这一条不收，理由是「括号后面是 `;`，与一条以 `;` 收尾的调用语句完全同形」。
那个理由只在**语句位置**成立：在类体 / 接口体里，直接成员不可能是调用语句——
`f(1);` 只能是某个字段初始化式的一部分，而那种情况下 `Field`（排在方法声明之后，但它的起点更靠左）
会先把整条 `x = f(1);` 收走，`f` 根本轮不到这里。

所以判据是**父单元**：只有 `ClassBody` / `InterfaceBody` 的直接成员才允许无体形状，
其余位置仍然要 `{` 才收——`foo(a);` 这类语句不会因此变成假的方法声明。

`MethodDeclarationReorganization` 写在 `MethodDeclaration` **之前**。

# class MethodDeclarationReorganization extends Reorganization

## static readonly field Instance:MethodDeclarationReorganization = new MethodDeclarationReorganization()

唯一的实例，注册进通用重组队列时用。

## private method BodyIndex:(units:Array<Token>, index:int)=>int

取方法体括号的下标：`index` 是参数表括号，往后允许一段 `: 返回类型`，再往后必须是 `{` 括号。
形状不成立时返回 `-1`（那说明这是一条调用语句，不是一个方法声明）。

判定全部委托给 `ScanDeclarationBody`（见 `../declaration-common.xl.md`）：跨换行、类型字面量 `{`
（`m(): { a: number } { … }` 里第一个 `{` 是类型）、下一条语句的关键字，都由那一处统一处理。
`Function` 用的是同一个函数，两条声明规则不会走偏。

```ts
return ScanDeclarationBody(units, index);
```

## private method ParameterIndex:(units:Array<Token>, index:int)=>int

取参数表括号的下标：`index` 是方法名，名字后面允许夹一个**可选标记 `?`** 与一段类型参数段（`GenericType`），
再往后就是 `(` 括号。形状不对时返回 `-1`。

`?` 排在最前：TypeScript 的可选成员签名写作 `m?()` / `m?<T>()`，`?` 在类型参数之前。
没有这个 `?`，接口里的可选方法签名就永远匹配不上（`Get(units, i)` 拿到的是 `Symbol("?")` 而不是括号）。

**`*` 是生成器方法**（`class C { *g() {} }`）：它在**名字前面**，所以由 `Process` 在头部先吃掉、
而这里只需要知道「名字之后」的形状——`*` 不在名字之后，`ParameterIndex` 因此不用为它加分支。
（`Previous` 那一侧用 `GeneratorMark` 先把游标越过 `*`，见 `Previous` 的说明。）

`Previous` 与 `Process` 共用它。

```ts
let i = SkipNextWrapSymbol(units, index);
const mark = Get(units, i);
if (mark instanceof Symbol && mark.Is("?")) {
  i = SkipNextWrapSymbol(units, i);
}
if (Get(units, i) instanceof GenericType) {
  i = SkipNextWrapSymbol(units, i);
}
const parameters = Get(units, i);
if (!(parameters instanceof Bracket) || parameters.StartBracketChar !== "(") {
  return -1;
}
return i;
```

## private method GeneratorMark:(units:Array<Token>, index:int)=>Token | null

`index` 处如果是生成器方法的 `*`，返回它，否则返回 `null`。

`class C { *g() {} }` / `interface I { *g(): void }` 里的 `*` 在**名字前面**：
只认「名字 + `(`」的判定会在 `*` 处断掉，整条方法声明降级成
`<Symbol>*</Symbol>` 加一串散单元（实测生成器方法就是这么丢的）。

`*` 只认一次（`*` 与名字之间允许软换行）；拿到之后**要留在节点里**——
丢了就分不出生成器方法与普通方法。

```ts
const item = Get(units, index);
if (item instanceof Symbol && item.Is("*")) {
  return item;
}
return null;
```

## private method SignatureTailEnd:(units:Array<Token>, parametersIndex:int)=>int

成员签名的返回类型段末尾：与 `ScanDeclarationTailEnd` 的区别是**软换行就是成员边界**。

为什么不能直接用 `ScanDeclarationTailEnd`：它的四条终止条件里没有「换行」——那是为「返回类型可以折行」设计的。
但签名在没有 `;` 的写法里靠换行分隔成员：`interface I {` 换行 `m?(): void` 换行 `n?<T>(x: T): T` 换行 `}`。
用 `ScanDeclarationTailEnd` 会把 `n?<T>(x: T): T` 整条吞进 `m` 的返回类型里（实测产物里能看到 `m` 的
`ReturnType` 里跟着 `Common(n)`）。

折行仍然要支持（`m(): A |` 换行 `B`），所以判法与 `Field.MemberEnd` 同源：
换行前一个实义单元是 `;` / `,` 以外的**符号**时才继续扫，否则换行即边界。其余四条终止条件照样生效。

```ts
let tailEnd = -1;
let i = parametersIndex + 1;
while (i < units.length) {
  const item = Get(units, i);
  if (item instanceof Symbol && (item.Is(";") || item.Is(","))) {
    break;
  }
  if (item instanceof WrapSymbol) {
    const previous = Get(units, i - 1);
    const continues = previous instanceof Symbol && !previous.Is(";") && !previous.Is(",");
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

## private method IsMemberSignature:(units:Array<Token>, index:int, parametersIndex:int)=>bool

`index` 处的「名字 + 参数表」是不是一条**没有方法体的成员签名**。

两条都要成立：

1. `current.Parent` 是 `ClassBody` 或 `InterfaceBody`——只有成员位置上无体形状才没有歧义（见文件头的说明）；
2. 参数表之后只剩下「返回类型」，并且以一个 `;`、一个软换行或列表结尾收住。

第 2 条用 `ScanDeclarationTailEnd` 找到返回类型的末尾，再看它**紧接着的一个单元**：
`;` / 软换行 / 结尾之外都不算签名——例如 `x = f(1)` 里 `f` 后面跟的是 `)`（属于外面的括号），
`foo(a).bar()` 里跟的是 `.`，这些都必须留给别的规则。

```ts
const current = Get(units, index);
if (current === null) {
  return false;
}
const parent = current.Parent;
if (!(parent instanceof ClassBody) && !(parent instanceof InterfaceBody) && !(parent instanceof TypeLiteralBody)) {
  return false;
}
const tailEnd = this.SignatureTailEnd(units, parametersIndex);
const afterTail = Get(units, tailEnd >= 0 ? tailEnd + 1 : parametersIndex + 1);
if (afterTail === null || afterTail instanceof WrapSymbol) {
  return true;
}
return afterTail instanceof Symbol && afterTail.Is(";");
```

## private method MethodNameOf:(unit:Token)=>string

取方法名的文本：`Common` 直接取；**字符串字面量名字**（`"m"() { }`）取它第一个 `ConstString` 子单元的文本。

TypeScript 允许成员名写成字符串字面量（`class C { "m"() { } }`），
与 `Field` 那边的 `NameText` 是同一套处理——只认 `Common` 时这些成员整个丢掉。

```ts
if (unit instanceof Common) {
  return unit.TempToString();
}
if (unit instanceof String) {
  for (const item of unit.Data) {
    if (item instanceof ConstString) {
      return item.TempToString();
    }
  }
}
return "";
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个方法声明的名字：一个能当方法名的 `Common`，后面紧跟（允许夹一段类型参数）`(` 括号，
且括号后面（允许一段返回类型）有一个 `{` 方法体。

名字判定用的是 `template.MethodNameTemplate`——`switch` / `function` / `typeof` 这类
「名字 + 括号」的关键字在 `../parse-pipeline.xl.md` 的 `BanedMethodNames` 里已经被挡掉了。

**`import` 单独在这里再挡一次**：`typeof import("assert")`（模块查询类型）也是「名字 + 括号」的形状，
但 `import` **不能**加进 `BanedMethodNames`——那张表是「能不能当方法名」的唯一判据，
调用规则（`Method`）与声明规则共用它，加进去会连带挡掉动态 `import("m")` 的调用节点。
所以这里就地拒一次：`import` 不在成员位置当方法名。

**成员位置反而要放开禁用表**：`class A { delete() {} if() {} for() {} new() {} }` /
`interface I { for(): void }` 里的方法名正是关键字——它们是**成员名**，不存在
「`if (x)` 被误当成调用」的风险（那个风险只属于表达式位）。所以名字的父单元是成员体时不再查
`MethodNameTemplate`，只查语句位的那一支。

**计算成员名 `[`m`]()` / `[x]()` 也算名字**：它是一个 `[` 括号，
名字由 `field.xl.md` 的 `BracketNameText` 拼出来（与 `[key: string]` 索引签名同一套）。
不认这一支时那个 `[...]` 会被收成 `JsonArray`，整条方法声明散架。

```ts
let nameIndex = index;
const generator = this.GeneratorMark(units, index);
if (generator !== null) {
  nameIndex = SkipNextWrapSymbol(units, index);
}
const current = Get(units, nameIndex);
const isPrivateName = current instanceof Symbol && current.Is("#");
if (isPrivateName) {
  nameIndex = SkipNextWrapSymbol(units, nameIndex);
}
const name = Get(units, nameIndex);
const isComputedName = (name instanceof Bracket && name.StartBracketChar === "[") || name instanceof JsonArray;
if (isComputedName === false && !(name instanceof Common) && !(name instanceof String)) {
  return false;
}
const inMemberBody =
  name !== null &&
  (name.Parent instanceof ClassBody || name.Parent instanceof InterfaceBody || name.Parent instanceof TypeLiteralBody);
if (isComputedName === false && inMemberBody === false && name instanceof Common && !template.MethodNameTemplate.IsMethodName(name.TempToString())) {
  return false;
}
if (name instanceof Common && name.Is("import")) {
  return false;
}
const parametersIndex = this.ParameterIndex(units, nameIndex);
if (parametersIndex < 0) {
  return false;
}
return this.BodyIndex(units, parametersIndex) >= 0 || this.IsMemberSignature(units, nameIndex, parametersIndex);
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把整条方法声明收成一个 `MethodDeclaration`，**返回新的下标**。

要点：

- 起点由 `DeclarationStart` 往前吃掉一串修饰词（`public` / `static` / `async` / `get` / `set` …）与装饰器；
  修饰词折进 `Modifiers`（`join(",")`），装饰器作为子单元搬进 `MethodDeclaration`。
- 名字与参数表之间允许一个 `GenericType`（`find<U>(key: U)`）。
- 参数表括号作为子单元留着；参数括号的内容已经由它自己的重组队列啃过
  （`(` 括号有队列，见 `../bracket.xl.md` 的 `Use`），不重复处理。
- 返回类型段（`:` 与类型单元）单独搬给 `ReturnType` 并 `TryToClose()`——**必须自成一段**，
  否则 `TypeDefine` 会从 `:` 一路吞到方法体里去（见 `./return-type.xl.md`）。
  它的边界由 `ScanDeclarationBody` / `ScanDeclarationTailEnd` 给出（见 `../declaration-common.xl.md`）。
- 名字与方法体之间搬进去的子单元里，软换行**不进树**（与 `Class` / `Function` 一致：
  它们本来就会被 `WrapSymbolReorganization` 摘掉，这里先一步跳过，免得落进一个不跑重组的单元里）。
- 范围终点用 `DeclarationEnd` 把紧跟的软换行一并收进来——否则那个换行会在语句重组阶段变成一个空的
  `Statement`（见 `../declaration-common.xl.md`）。
- 方法体括号的**内容**整体搬给 `MethodBody`，括号本身不再留在树里；`MethodBody` 有自己的语句队列，
  搬完要 `TryToClose()` 一次。
- **没有方法体时**（成员签名）：`memberEnd` 取返回类型的末尾，并把紧跟的一个 `;` 一起吃掉，
  再交给 `DeclarationEnd`。`MethodBody` 那一段整个跳过——签名本来就没有体。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("current 为空");
}
const startIndex = DeclarationStart(units, index);
let nameIndex = index;
const generator = this.GeneratorMark(units, index);
if (generator !== null) {
  nameIndex = SkipNextWrapSymbol(units, index);
}
const markUnit = Get(units, nameIndex);
const privateMark = markUnit instanceof Symbol && markUnit.Is("#") ? markUnit : null;
if (privateMark !== null) {
  nameIndex = SkipNextWrapSymbol(units, nameIndex);
}
const parametersIndex = this.ParameterIndex(units, nameIndex);
if (parametersIndex < 0) {
  throw new Error("方法声明不满足格式要求：name(...) { ... }");
}
const bodyIndex = this.BodyIndex(units, parametersIndex);
const isSignature = bodyIndex < 0;
if (isSignature && this.IsMemberSignature(units, nameIndex, parametersIndex) === false) {
  throw new Error("方法声明不满足格式要求：name(...) { ... }");
}
const tailEnd = isSignature
  ? this.SignatureTailEnd(units, parametersIndex)
  : ScanDeclarationTailEnd(units, parametersIndex);
const tailStart = SkipNextWrapSymbol(units, parametersIndex);
const result = new MethodDeclaration(template);
result.Parent = current.Parent;
const nameUnit = Get(units, nameIndex)!;
const computedName = nameUnit instanceof Bracket || nameUnit instanceof JsonArray;
if (computedName) {
  result.MethodName = BracketNameText(nameUnit);
} else if (privateMark === null) {
  result.MethodName = this.MethodNameOf(nameUnit);
} else {
  result.MethodName = "#" + this.MethodNameOf(nameUnit);
}
result.Modifiers = DeclarationModifiers(units, startIndex, index).join(",");
for (const item of TakeDeclarationDecorators(units, startIndex, index)) {
  result.AddAndCloseLast(item);
}
if (computedName) {
  result.AddAndCloseLast(nameUnit);
}
if (generator !== null) {
  result.AddAndCloseLast(generator);
}
if (privateMark !== null) {
  result.AddAndCloseLast(privateMark);
}
let i = index + 1;
while (i < parametersIndex) {
  const item = Get(units, i);
  if (!(item instanceof WrapSymbol)) {
    result.AddAndCloseLast(item!);
  }
  i = i + 1;
}
result.AddAndCloseLast(Get(units, parametersIndex)!);
if (tailStart <= tailEnd) {
  const returnType = result.CreateReturnType();
  for (let t = tailStart; t <= tailEnd; t++) {
    const item = Get(units, t);
    if (!(item instanceof WrapSymbol)) {
      returnType.AddAndCloseLast(item!);
    }
  }
  returnType.SignIn(Get(units, tailStart)!.SourceRange.Start!);
  returnType.SignOut(Get(units, tailEnd)!.SourceRange.End!);
  returnType.TryToClose();
}
let memberEnd = tailEnd >= 0 ? tailEnd : parametersIndex;
if (bodyIndex >= 0) {
  memberEnd = bodyIndex;
} else {
  const semicolon = Get(units, memberEnd + 1);
  if (semicolon instanceof Symbol && semicolon.Is(";")) {
    memberEnd = memberEnd + 1;
  }
}
result.SignIn(Get(units, startIndex)!.SourceRange.Start!);
const endIndex = DeclarationEnd(units, memberEnd);
result.SignOut(Get(units, endIndex)!.SourceRange.End!);
if (bodyIndex >= 0) {
  const body = Get(units, bodyIndex) as Bracket;
  const methodBody = result.CreateBody();
  body.MoveDataTo(methodBody);
  methodBody.Sign(body);
  methodBody.TryToClose();
}
result.TryToClose();
return ReplaceCountAt(units, startIndex, endIndex - startIndex + 1, result);
```

# class MethodDeclaration extends IndependentToken

方法声明。

它由重组造出来、自己不消费字符，所以只继承 `IndependentToken` 的空 `Process`。

类名必须与产物里的标签名一致：`this.constructor.name` 就是 `<MethodDeclaration>` 的标签。

## constructor:(template:Template)=>void

创建时把本类型的重组规则挂上来（模板里没有专门给 `MethodDeclaration` 注册就用通用队列）。

理由与 `Class` / `Function` 的构造器相同：返回类型那一段
（`:` 与类型单元）是 `Process` 搬进来的，不给自己的队列，它就凑不成 `TypeDefine`。

```ts
super(template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## field MethodName:string = ""

方法名。

## field Modifiers:string = ""

声明前面的修饰词（`public` / `private` / `protected` / `static` / `readonly` / `abstract` / `override` /
`declare` / `async` / `get` / `set`），按源码顺序用 `,` 连接；没有修饰词时是空串。

## method CreateBody:()=>MethodBody

新建方法体段并挂到自己名下，返回新单元。

```ts
return this.Add(new MethodBody(this.Template));
```

## method CreateReturnType:()=>ReturnType

新建返回类型段并挂到自己名下，返回新单元。

返回类型单独成段是必须的：`TypeDefineReorganization` 从 `:` 起贪婪地收，直到 `;` / `,` / 赋值符号为止——
方法体不是终止符，返回类型一旦与方法体同级，`TypeDefine` 就会把方法体整个吞进去
（见 `./return-type.xl.md`）。

```ts
return this.Add(new ReturnType(this.Template));
```

## property ReturnType:ReturnType | null

返回类型段：子单元列表里**第一个** `ReturnType`；这条声明没有返回类型标注时给 `null`。

### get

```ts
for (const item of this.Data) {
  if (item instanceof ReturnType) {
    return item;
  }
}
return null;
```

## property Body:MethodBody

方法体段：子单元列表里**第一个** `MethodBody`。

### get

```ts
for (const item of this.Data) {
  if (item instanceof MethodBody) {
    return item;
  }
}
throw new Error("找不到匹配的子单元");
```

## method ToXmlString:()=>string

产出 XML：开标签上带 `MethodName` 与 `Modifiers` 两个属性。

与 `Method` 的 `<Method MethodName="x">` 只在标签名与多出来的 `Modifiers` 上不同——
调用点是 `Method`，声明点是 `MethodDeclaration`，两者靠标签名区分。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} MethodName="${this.MethodName}" Modifiers="${this.Modifiers}">${temp.join("")}</${name}>`;
```

## method Clone:()=>Token

克隆自身。

两个声明字段都要抄。

```ts
const result = new MethodDeclaration(this.Template);
result.Sign(this);
result.MethodName = this.MethodName;
result.Modifiers = this.Modifiers;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
