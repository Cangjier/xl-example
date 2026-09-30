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
import { FunctionBody } from "./function-body.xl.md"
import { GenericType } from "../generic-type.xl.md"
import { ReturnType } from "./return-type.xl.md"
import { Symbol } from "../symbol.xl.md"
import { WrapSymbol } from "../wrap-symbol.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`function` 声明：把 `function name(参数): 返回类型 { 函数体 }` 整段收成一个 `Function`。

能收的形状（前导修饰词与装饰器见 `../declaration-common.xl.md`）：

```
[@Decorator …] [export] [declare] [default] [async] function Name [<类型参数>] (参数) [: 返回类型] { 函数体 }
```

**无函数体的写法也收**：`declare function f(x: number): void;` 这类环境声明里，`function` 头停在 `;` 上，
`Function` 照样成形——只是没有 `FunctionBody` 子单元。这种「没有体」的形状与「一条以 `;` 收尾的表达式」
（`foo(a);`）只差一个 `{`，所以判定的重心全在 `ScanDeclarationTail` 上：它跨得过分行写的返回类型，
但要被下一条语句的关键字拦住（`let` / `class` / `type` …），详见 `../declaration-common.xl.md`。

它必须排在 `MethodReorganization` **之前**（见 `../parse-pipeline.xl.md` 的队列顺序）：
`function (x) { }`（函数表达式）里的 `function (x)` 本身长着「名字 + 括号」的样子，
`MethodReorganization` 先跑就会把它吃掉，`function` 这个关键字就再也配不上名字了。

`FunctionReorganization` 写在 `Function` **之前**。

# class FunctionReorganization extends Reorganization

## static readonly field Instance:FunctionReorganization = new FunctionReorganization()

唯一的实例，注册进通用重组队列时用。

## private method ParameterIndex:(units:Array<Token>, index:int)=>int

取参数表括号的下标：`index` 是 `function` 关键字，往后的第一个实义单元是名字，
名字后面允许夹一个类型参数段（`GenericType`，或者没被认下来的裸 `<…>`），再往后就是 `(` 括号。形状不对时返回 `-1`。

`Previous` 与 `Process` 共用它——两边对「参数表在哪」的判断必须一致。

```ts
const nameIndex = SkipNextWrapSymbol(units, index);
if (!(Get(units, nameIndex) instanceof Common)) {
  return -1;
}
let i = SkipNextWrapSymbol(units, nameIndex);
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

`index` 处是不是一个函数声明的开头：内容是 `function` 的 `Common`，且后面能凑出「名字 + 可选类型参数 + `(`」。

```ts
const current = Get(units, index);
if (!(current instanceof Common) || !current.Is("function")) {
  return false;
}
return this.ParameterIndex(units, index) >= 0;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把整个函数声明收成一个 `Function`，**返回新的下标**。

两段扫描：

1. **头部**：起点由 `DeclarationStart` 往前吃掉一串修饰词与装饰器；名字与参数表之间允许一个 `GenericType`。
2. **尾部**：`ScanDeclarationBody` 给出函数体那个 `{` 的下标（没有体时 `-1`），
   `ScanDeclarationTailEnd` 给出返回类型段的末尾下标（没有返回类型时 `-1`）。
   返回类型整段搬给 `ReturnType` 并 `TryToClose()`——**必须自成一段**，否则 `TypeDefine` 会从 `:`
   一路吞到函数体里去（见 `./return-type.xl.md`）。
   有函数体就把括号内容搬给 `FunctionBody` 并 `TryToClose()`（让它跑语句队列）；
   没有就收成一个**没有函数体**的 `Function`（环境声明）。

   返回类型的边界判定（跨换行、类型字面量 `{`、下一条语句的关键字）全在 `../declaration-common.xl.md`
   的 `IsDeclarationTailStop` 里，那是两条声明规则共用的终止条件。

`FunctionBody` 的范围沿用它那对括号；`Function` 的范围终点取整个声明的终点
（有体时含 `}`，无体时含返回类型的最后一个单元），
并且用 `DeclarationEnd` 把紧跟的软换行一并收进来——否则那个换行会在语句重组阶段变成一个空的
`Statement`（见 `../declaration-common.xl.md`）。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("current 为空");
}
const startIndex = DeclarationStart(units, index);
const nameIndex = SkipNextWrapSymbol(units, index);
const parametersIndex = this.ParameterIndex(units, index);
if (parametersIndex < 0) {
  throw new Error("function 语句不满足格式要求：function Name(...){...}");
}
const result = new Function(template);
result.Parent = current.Parent;
result.FunctionName = (Get(units, nameIndex) as Common).TempToString();
result.Modifiers = DeclarationModifiers(units, startIndex, index).join(",");
for (const item of TakeDeclarationDecorators(units, startIndex, index)) {
  result.AddAndCloseLast(item);
}
let i = SkipNextWrapSymbol(units, nameIndex);
while (i < parametersIndex) {
  result.AddAndCloseLast(Get(units, i)!);
  i = SkipNextWrapSymbol(units, i);
}
result.AddAndCloseLast(Get(units, parametersIndex)!);
const bodyIndex = ScanDeclarationBody(units, parametersIndex);
const tailEnd = ScanDeclarationTailEnd(units, parametersIndex);
const tailStart = SkipNextWrapSymbol(units, parametersIndex);
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
let lastIndex = parametersIndex;
if (tailEnd >= 0) {
  lastIndex = tailEnd;
}
if (bodyIndex >= 0) {
  lastIndex = bodyIndex;
}
const endIndex = DeclarationEnd(units, lastIndex);
result.SignIn(Get(units, startIndex)!.SourceRange.Start!);
result.SignOut(Get(units, endIndex)!.SourceRange.End!);
if (bodyIndex >= 0) {
  const body = Get(units, bodyIndex) as Bracket;
  const functionBody = result.CreateBody();
  body.MoveDataTo(functionBody);
  functionBody.Sign(body);
  functionBody.TryToClose();
}
result.TryToClose();
return ReplaceCountAt(units, startIndex, endIndex - startIndex + 1, result);
```

# class Function extends IndependentToken

函数声明。

它由重组造出来、自己不消费字符，所以只继承 `IndependentToken` 的空 `Process`。

类名必须与产物里的标签名一致：`this.constructor.name` 就是 `<Function>` 的标签。
它与 `Class` 那一族同形：名字进属性，其余单元（类型参数、参数括号、返回类型、函数体）留作子单元。

## constructor:(template:Template)=>void

创建时把本类型的重组规则挂上来（模板里没有专门给 `Function` 注册就用通用队列）。

理由与 `Class` 的构造器相同：返回类型那几个单元是在 `Process`
里被搬进来的，不给 `Function` 自己的队列，`:` 那一段就凑不成 `TypeDefine`、关键字也升不了级。

```ts
super(template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## field FunctionName:string = ""

函数名。

## field Modifiers:string = ""

声明前面的修饰词，按源码顺序用 `,` 连接；没有修饰词时是空串。

## method CreateBody:()=>FunctionBody

新建函数体段并挂到自己名下，返回新单元。

```ts
return this.Add(new FunctionBody(this.Template));
```

## method CreateReturnType:()=>ReturnType

新建返回类型段并挂到自己名下，返回新单元。

返回类型单独成段是必须的：`TypeDefineReorganization` 从 `:` 起贪婪地收，直到 `;` / `,` / 赋值符号为止——
函数体不是终止符，返回类型一旦与方法体同级，`TypeDefine` 就会把函数体整个吞进去
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

## property Body:FunctionBody | null

函数体段：子单元列表里**第一个** `FunctionBody`；没有函数体（环境声明）时给 `null`。

### get

```ts
for (const item of this.Data) {
  if (item instanceof FunctionBody) {
    return item;
  }
}
return null;
```

## method ToXmlString:()=>string

产出 XML：开标签上带 `FunctionName` 与 `Modifiers` 两个属性。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} FunctionName="${this.FunctionName}" Modifiers="${this.Modifiers}">${temp.join("")}</${name}>`;
```

## method Clone:()=>Token

克隆自身。

两个声明字段都要抄。

```ts
const result = new Function(this.Template);
result.Sign(this);
result.FunctionName = this.FunctionName;
result.Modifiers = this.Modifiers;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
