# dependencies
```xl
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../../core/extensions/list-extension.xl.md"
import { DeclarationEnd, DeclarationModifiers, DeclarationStart, ScanDeclarationBody, ScanDeclarationTailEnd, TakeDeclarationDecorators } from "../declaration-common.xl.md"
import { SkipNextWrapSymbol } from "../../text-common-util.xl.md"
import { Bracket } from "../bracket.xl.md"
import { Common } from "../common.xl.md"
import { GenericType } from "../generic-type.xl.md"
import { MethodBody } from "./method-body.xl.md"
import { ReturnType } from "./return-type.xl.md"
import { Symbol } from "../symbol.xl.md"
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

**没有方法体的声明不收**：`abstract f(): void;` / `declare f(): void` 这类形状在括号后面是 `;`，
与「一条以 `;` 收尾的调用语句」完全同形，收它就是拿 `foo(a);` 去换一个假的方法声明。
这类成员这一轮仍旧落成 `Method` + `TypeDefine`（见 README 的已知缺口）。

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

取参数表括号的下标：`index` 是方法名，名字后面允许夹一个类型参数段（`GenericType`），
再往后就是 `(` 括号。形状不对时返回 `-1`。

`Previous` 与 `Process` 共用它。

```ts
let i = SkipNextWrapSymbol(units, index);
if (Get(units, i) instanceof GenericType) {
  i = SkipNextWrapSymbol(units, i);
}
const parameters = Get(units, i);
if (!(parameters instanceof Bracket) || parameters.StartBracketChar !== "(") {
  return -1;
}
return i;
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个方法声明的名字：一个能当方法名的 `Common`，后面紧跟（允许夹一段类型参数）`(` 括号，
且括号后面（允许一段返回类型）有一个 `{` 方法体。

名字判定用的是 `template.MethodNameTemplate`——`switch` / `function` / `typeof` 这类
「名字 + 括号」的关键字在 `../parse-pipeline.xl.md` 的 `BanedMethodNames` 里已经被挡掉了。

```ts
const current = Get(units, index);
if (!(current instanceof Common) || !template.MethodNameTemplate.IsMethodName(current.TempToString())) {
  return false;
}
const parametersIndex = this.ParameterIndex(units, index);
if (parametersIndex < 0) {
  return false;
}
return this.BodyIndex(units, parametersIndex) >= 0;
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

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("current 为空");
}
const startIndex = DeclarationStart(units, index);
const parametersIndex = this.ParameterIndex(units, index);
if (parametersIndex < 0) {
  throw new Error("方法声明不满足格式要求：name(...) { ... }");
}
const bodyIndex = this.BodyIndex(units, parametersIndex);
if (bodyIndex < 0) {
  throw new Error("方法声明不满足格式要求：name(...) { ... }");
}
const tailEnd = ScanDeclarationTailEnd(units, parametersIndex);
const tailStart = SkipNextWrapSymbol(units, parametersIndex);
const result = new MethodDeclaration(template);
result.Parent = current.Parent;
result.MethodName = (Get(units, index) as Common).TempToString();
result.Modifiers = DeclarationModifiers(units, startIndex, index).join(",");
for (const item of TakeDeclarationDecorators(units, startIndex, index)) {
  result.AddAndCloseLast(item);
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
result.SignIn(Get(units, startIndex)!.SourceRange.Start!);
const endIndex = DeclarationEnd(units, bodyIndex);
result.SignOut(Get(units, endIndex)!.SourceRange.End!);
const body = Get(units, bodyIndex) as Bracket;
const methodBody = result.CreateBody();
body.MoveDataTo(methodBody);
methodBody.Sign(body);
methodBody.TryToClose();
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
