# dependencies
```xl
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt, SearchBack } from "../../../../core/extensions/list-extension.xl.md"
import { GetSkipPreviousWrapSymbol, SkipNextWrapSymbol, SkipPreviousWrapSymbol } from "../../text-common-util.xl.md"
import { Bracket } from "../bracket.xl.md"
import { Common } from "../common.xl.md"
import { JsonObjectReorganization } from "../json/json-object.xl.md"
import { Method } from "../method.xl.md"
import { ReturnType } from "../function/return-type.xl.md"
import { Statement } from "../statement.xl.md"
import { Symbol } from "../symbol.xl.md"
import { WrapSymbol } from "../wrap-symbol.xl.md"
import { LamdaBody } from "./lamda-body.xl.md"
import { LamdaParameter } from "./lamda-parameter.xl.md"
import { LamdaParameters } from "./lamda-parameters.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

Lambda 表达式：把 `()=>{}` / `p1=>statement` / `():xxx=>{}` 这三种形态从「参数 + `=>` + 体」重组成单个 `Lamda` 单元，参数收进 `LamdaParameters`，体收进 `LamdaBody`。

重组规则类 `LamdaReorganization` 写在 `Lamda` **之前**（与同目录其它 token 一致）。

# class LamdaReorganization extends Reorganization

`Process` 是整个文件里最重的一段：它要把 `=>` 左边的东西收成 `LamdaParameters`（括号形参表拆成一个个 `LamdaParameter`，或单个裸形参），把右边的东西收成 `LamdaBody`（花括号体直接搬家，语句体按表达式/语句两种终止规则截断）。

## static readonly field Instance:LamdaReorganization = new LamdaReorganization()

唯一的实例。

## private method IsLambdaParameters:(units:Array<Token>, index:int)=>bool

`index` 处的 `(` 括号是**箭头函数的形参表**，不是一段函数类型。

`(a: A) => B` 与 `(a: A): B => body` 长得几乎一样，区别在括号**前面**是什么：

- 前面是 `:`（`let f: (a: A) => B`）→ 这是类型标注里的**函数类型**，不是箭头函数，本规则不接手；
- 前面是别的（`=` / `(` / `,` / `return` / 行首…）→ 形参表，成立。

```ts
const previousIndex = SkipPreviousWrapSymbol(units, index);
const previous = Get(units, previousIndex);
if (previous instanceof Symbol && previous.Is(":")) {
  return false;
}
return true;
```

## private method FindParameters:(units:Array<Token>, index:int)=>int

`index`（一个 `=>`）左边那段是不是形参；是就返回**形参单元**的下标（`(` 括号或裸形参 `Common`），否则返回 `-1`。

`Previous` 与 `Process` 共用它——两边对「形参在哪」的判断必须一致。

四种形状都走这里：

- `( …. ) =>`：`=>` 左边就是形参括号；
- `p1 =>`：`=>` 左边是裸形参；
- `( …. ) : T =>`：要先跨过返回类型标注：从 `=>` 往左走，遇到 `:` 再看它**左边**是不是 `(` 括号；
- 反过来，`let f: (a: A) => B` 这种**函数类型**必须排除掉——它的括号左边也是 `:`，
  但那个 `:` 属于类型标注而不是箭头函数的返回类型；区别在**冒号左边**：
  函数类型是 `: ( … ) =>`（括号前面直接是冒号），箭头函数是 `( … ) : T =>`（冒号前面是形参括号）。
  所以判定统一成一句：**冒号左边那个单元是 `(` 括号 ⇒ 它是箭头函数的返回类型标注**。

往左走时遇到 `=` / `,` / `;` / `?` / 另一个括号就停：再往左就是上一条语句或另一个表达式了。
一路走完都没找到 `:` 时，若 `=>` 左边是个裸 `Common`，它就是裸形参。

```ts
const firstIndex = SkipPreviousWrapSymbol(units, index);
const first = Get(units, firstIndex);
if (first === null) {
  return -1;
}
if (first instanceof Bracket && first.StartBracketChar === "(") {
  return this.IsLambdaParameters(units, firstIndex) ? firstIndex : -1;
}
let scan = SkipPreviousWrapSymbol(units, firstIndex);
while (scan >= 0) {
  const item = Get(units, scan);
  if (item instanceof Symbol && item.Is(":")) {
    const candidateIndex = SkipPreviousWrapSymbol(units, scan);
    const candidate = Get(units, candidateIndex);
    if (candidate instanceof Bracket && candidate.StartBracketChar === "(") {
      return this.IsLambdaParameters(units, candidateIndex) ? candidateIndex : -1;
    }
    break;
  }
  if (item instanceof Bracket) {
    break;
  }
  if (item instanceof Symbol && (item.Is("=") || item.Is(",") || item.Is(";") || item.Is("=>") || item.Is("?"))) {
    break;
  }
  scan = SkipPreviousWrapSymbol(units, scan);
}
if (first instanceof Common) {
  return firstIndex;
}
return -1;
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是本次重组的起点：它得是 `=>`，而且左边那一段能认成形参（见 `FindParameters`）。

```ts
const current = Get(units, index);
if (!(current instanceof Symbol) || !current.Is("=>")) {
  return false;
}
return this.FindParameters(units, index) >= 0;
```

## static method IsMethod:(unit:Token | null)=>bool

某个单元算不算「方法调用形态」——要么它本身就是 `Method`，要么它是一个 `(...)` 圆括号。

`Process` 里用它判断「`=>` 右边是逗号分隔的实参列表」还是「一条语句」。

```ts
if (unit instanceof Method) {
  return true;
} else if (unit instanceof Bracket && unit.Is("(", ")")) {
  return true;
}
return false;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

执行重组，**返回新的下标**。

重组把多个子单元换成一个，下标必须跟着走；函数体末尾把 `ReplaceCountAt(...)` 的结果直接 `return`。

- **带返回类型标注时要先退回形参**：`(a: A): T => body` 里 `=>` 左边那一段是 `: T`，
  `FindParameters` 会退回形参括号；形参与 `=>` 之间的那一截（`:` 与类型单元）搬进 `ReturnType`，
  替换范围从**形参**起算（有 `async` 时从 `async` 起算）——
  从 `T` 起算的话，形参括号与冒号会被留在外面，紧接着的 `TypeDefine` 会把整个 `Lamda` 包起来。

几处实现说明：

- 语句体截断用数组原生的 `slice(index + 1, endIndex + 1)`。
- 抛错一律用 `new Error(...)`（不进规范类型位）——形参形态认不出来时抛 `参数错误`。
- `JsonObjectReorganization.IsObject` 是单参数版（`IsObjectAt` 才是列表版）。
- `current?.Parent` 可能是 `undefined`，而 `IsObject` / `IsMethod` 的形参只接受 `null`，所以补 `?? null`。

```ts
const current = Get(units, index);
const result = new Lamda(template);
result.Parent = Get(units, index)!.Parent;
const parameters = result.CreateParameters();
const lastIndex = SkipPreviousWrapSymbol(units, index);
const parametersIndex = this.FindParameters(units, index);
if (parametersIndex < 0) {
  throw new Error("参数错误");
}
const parameterUnit = Get(units, parametersIndex);
if (parameterUnit === null) {
  throw new Error("参数错误");
}
let rangeStart = parametersIndex;
const asyncIndex = SkipPreviousWrapSymbol(units, parametersIndex);
const asyncUnit = Get(units, asyncIndex);
if (asyncUnit instanceof Common && asyncUnit.Is("async")) {
  rangeStart = asyncIndex;
  result.IsAsync = true;
}
result.SignIn(parameterUnit.SourceRange.Start!);
if (parametersIndex < lastIndex) {
  const returnType = result.CreateReturnType();
  for (let t = parametersIndex + 1; t <= lastIndex; t++) {
    const item = Get(units, t);
    if (!(item instanceof WrapSymbol)) {
      returnType.AddAndCloseLast(item!);
    }
  }
  returnType.SignIn(Get(units, parametersIndex + 1)!.SourceRange.Start!);
  returnType.SignOut(Get(units, lastIndex)!.SourceRange.End!);
  returnType.TryToClose();
}
if (parameterUnit instanceof Bracket) {
  const tempParameters: Token[] = [];
  for (let i = 0; i < parameterUnit.Data.length; i++) {
    const item = parameterUnit.Data[i];
    if (item instanceof Symbol && item.Is(",")) {
      if (tempParameters.length !== 0) {
        const parameter = new LamdaParameter(template);
        parameter.SignIn(tempParameters[0].SourceRange.Start!);
        parameter.SignOut(tempParameters[tempParameters.length - 1].SourceRange.End!);
        parameter.AddRange(tempParameters);
        parameter.TryToClose();
        parameters.Add(parameter);
        tempParameters.length = 0;
      }
    } else if (i === parameterUnit.Data.length - 1) {
      tempParameters.push(item);
      const parameter = new LamdaParameter(template);
      parameter.SignIn(tempParameters[0].SourceRange.Start!);
      parameter.SignOut(tempParameters[tempParameters.length - 1].SourceRange.End!);
      parameter.AddRange(tempParameters);
      parameter.TryToClose();
      parameters.Add(parameter);
      tempParameters.length = 0;
    } else {
      tempParameters.push(item);
    }
  }
} else if (parameterUnit instanceof Common) {
  const parameter = new LamdaParameter(template);
  parameter.SignIn(parameterUnit.SourceRange.Start!);
  parameter.SignOut(parameterUnit.SourceRange.End!);
  parameter.Add(parameterUnit);
  parameter.TryToClose();
  parameters.Add(parameter);
} else {
  throw new Error("参数错误");
}

const body = result.CreateBody();
let endIndex = SkipNextWrapSymbol(units, index);
const next = Get(units, endIndex);
if (next instanceof Bracket && next.StartBracketChar === "{") {
  try {
    next.MoveDataTo(body);
    body.SignIn(next.SourceRange.Start!);
    body.SignOut(next.SourceRange.End!);
    result.SignOut(next.SourceRange.End!);
  } catch (e) {
    throw e;
  }
} else {
  if (JsonObjectReorganization.Instance.IsObject(current?.Parent ?? null) || LamdaReorganization.IsMethod(current?.Parent ?? null)) {
    endIndex = SearchBack(units, index + 1, (x) => x instanceof Symbol && x.Is(","));
    if (endIndex !== -1) {
      endIndex--;
    }
  } else {
    endIndex = Statement.SearchStatementEnd(units, index);
  }
  if (endIndex === -1) {
    endIndex = units.length - 1;
  }
  body.AddRange(units.slice(index + 1, endIndex + 1));
  body.SignIn(Get(units, index + 1)!.SourceRange.Start!);
  body.SignOut(Get(units, endIndex)!.SourceRange.End!);
  result.SignOut(Get(units, endIndex)!.SourceRange.End!);
  body.IsStatement = true;
}
body.TryToClose();
result.TryToClose();
index = ReplaceCountAt(units, rangeStart, endIndex - rangeStart + 1, result);
return index;
```

# class Lamda extends IndependentToken

Lambda 表达式。

它**没有**覆写 `ToXmlString`，XML 由基类产出：`<Lamda>参数列表 + 体的 XML</Lamda>`。

## field IsAsync:bool = false

这个 lambda 前面是不是有 `async`。纯数据字段，没有访问器。

## constructor:(Template:Template)=>void

转调基类构造器（体是空的）。

```ts
super(Template);
```

## method CreateParameters:()=>LamdaParameters

造一个 `LamdaParameters` 作为自己的子单元并返回它。

`Add` 返回加进去的那个单元，所以这里直接返回。

```ts
return this.Add(new LamdaParameters(this.Template));
```

## property Parameters:LamdaParameters

参数列表：子单元里第一个 `LamdaParameters`。

### get

`Array.find` 找不到给 `undefined`，这里直接断言成 `LamdaParameters`。

```ts
return this.Data.find((x) => x instanceof LamdaParameters) as LamdaParameters;
```

## method ComputeParametersCount:()=>int

形参个数。

`Dawn/Steper` 的 `StepInferenceUtil` 用它匹配委托参数；执行层不在本规范范围内。

```ts
return this.Parameters.Data.length;
```

## method CreateReturnType:()=>ReturnType

造一个 `ReturnType` 作为自己的子单元并返回它。

**箭头函数的返回类型标注必须自成一段**：`(a: A): T => body` 里的 `: T` 若与体同级，
贪婪的 `TypeDefine` 会连函数体一起吞掉——这与 `Function` / `MethodDeclaration` 是同一个问题。
它也是本规则必须排在 `TypeDefine` **之前**的原因（见 `../parse-pipeline.xl.md` 的队列顺序）。

```ts
return this.Add(new ReturnType(this.Template));
```

## property ReturnType:ReturnType | null

返回类型段：子单元里第一个 `ReturnType`；没有标注时给 `null`。

### get

```ts
for (const item of this.Data) {
  if (item instanceof ReturnType) {
    return item;
  }
}
return null;
```

## method CreateBody:()=>LamdaBody

造一个 `LamdaBody` 作为自己的子单元并返回它。

```ts
return this.Add(new LamdaBody(this.Template));
```

## property Body:LamdaBody

体：子单元里第一个 `LamdaBody`。

### get

```ts
return this.Data.find((x) => x instanceof LamdaBody) as LamdaBody;
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 拷 `IsAsync` → 克隆全部子单元 → `TryToClose()`。

```ts
const result = new Lamda(this.Template);
result.Sign(this);
result.IsAsync = this.IsAsync;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
