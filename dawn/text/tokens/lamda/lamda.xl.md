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
import { Statement } from "../statement.xl.md"
import { Symbol } from "../symbol.xl.md"
import { LamdaBody } from "./lamda-body.xl.md"
import { LamdaParameter } from "./lamda-parameter.xl.md"
import { LamdaParameters } from "./lamda-parameters.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

Lambda 表达式：把 `()=>{}` / `p1=>statement` / `():xxx=>{}` 这三种形态从「参数 + `=>` + 体」重组成单个 `Lamda` 单元，参数收进 `LamdaParameters`，体收进 `LamdaBody`。

按 M32，嵌套类 `Lamda.Reorganization` 展平成顶层类 `LamdaReorganization`；按 M33，它写在 `Lamda` **之前**（与同目录其它 token 一致）。

# class LamdaReorganization extends Reorganization

原 C# 是嵌套类 `Lamda.Reorganization`（M32 展平改名）。

`Process` 是整个文件里最重的一段：它要把 `=>` 左边的东西收成 `LamdaParameters`（括号形参表拆成一个个 `LamdaParameter`，或单个裸形参），把右边的东西收成 `LamdaBody`（花括号体直接搬家，语句体按表达式/语句两种终止规则截断）。

## static readonly field Instance:LamdaReorganization = new LamdaReorganization()

唯一的实例。原 C# 是静态属性 `public static Reorganization Instance { get; } = new();`——这里的 `Reorganization` 指的是嵌套的那个类本身，按 §4 的等价写法落成静态只读字段。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是本次重组的起点：它得是 `=>`，而且左边最近的（跳过软换行的）单元是括号或 `Common`。

原 C# 注释把三种情况写得很清楚：`()=>{}` / `()=>statement`、`p1=>{}` / `p1=>statement`、`():xxx=>{}` / `():xxx=>statement`。

原 C# 调了两次 `units.GetSkipPreviousWrapSymbol(index)`（一次判括号、一次判 `Common`），ts 侧提成一个局部量，取值次数变了但语义不变。

```ts
const current = Get(units, index);
const isArrow = current instanceof Symbol && current.Is("=>");
if (isArrow === false) {
  return false;
}
const previous = GetSkipPreviousWrapSymbol(units, index);
const previousIsParameters = previous instanceof Bracket && previous.StartBracketChar === "(";
const previousIsCommon = previous instanceof Common;
if (previousIsCommon || previousIsParameters) {
  return true;
}
return false;
```

## static method IsMethod:(unit:Token | null)=>bool

某个单元算不算「方法调用形态」——要么它本身就是 `Method`，要么它是一个 `(...)` 圆括号。

原 C# 是 `public static bool IsMethod(Token<char>? unit)`。`Process` 里用它判断「`=>` 右边是逗号分隔的实参列表」还是「一条语句」。

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

原 C# 是 `public override void Process(IOwner owner, Template<char> template, List<Token<char>> units, ref int index)`；按 M15 改成返回值，函数体末尾 `index = units.ReplaceAt(...)` 的结果直接 `return`。

改写点清单：

- 对象初始化器 `new Lamda(owner, template) { Parent = ... }` → 先 `new` 再赋值。
- `units.GetSkipPreviousWrapSymbol` / `units.SkipPreviousWrapSymbol` / `units.SkipNextWrapSymbol` 是 `TextCommonUtil` 的扩展方法，按 M11 落成模块级函数，调用形态改成 `SkipPreviousWrapSymbol(units, index)`。
- `units.Get` / `units.SearchBack` / `units.ReplaceAt` 同理改成模块级函数；四参的 `ReplaceAt` 在移植里叫 `ReplaceCountAt`（M14(c)），所以末尾那句写成 `ReplaceCountAt(units, startIndex, endIndex - startIndex + 1, result)`。
- 拆形参表时反复 `flush` 同一段代码（C# 里那两处 `#if NETSTANDARD2_0` 的差别只是取最后一个元素的写法，ts 侧统一用 `tempParameters[tempParameters.length - 1]`）。
- `temp.Add(tempParameters)` 传的是一批单元，ts 侧用 `AddRange`（M14(c)）。
- `tempParameters.Clear()` → `tempParameters.length = 0`。
- 语句体截断里的 `units.Skip(index + 1).Take(endIndex - (index + 1) + 1)` 是 LINQ，等价于 `units.slice(index + 1, endIndex + 1)`。
- `units.Count` → `units.length`；`Data.Count` → `Data.length`。
- C# 的 `catch { throw; }` 是无副作用的重新抛出；ts 没有裸 `throw;`，写成 `catch (e) { throw e; }`。
- `throw new NullReferenceException($"{nameof(previous)}")` → `throw new Error("previous")`；`throw new Exception("参数错误")` → `throw new Error("参数错误")`。
- `Json.JsonObject.Reorganization.IsObject(...)` 按 M32 写成 `JsonObjectReorganization.IsObject(...)`；它是单参数版（`IsObjectAt` 才是列表版）。
- `current?.Parent` 在 ts 里可能是 `undefined`，而 `IsObject` / `IsMethod` 的形参只接受 `null`，所以补 `?? null`。
- 末尾 `if (previous is Bracket) …Release()` 只是提前释放那个临时括号；资源归属层移除后整句消失，交给 GC。

```ts
const current = Get(units, index);
const result = new Lamda(template);
result.Parent = Get(units, index)!.Parent;
const parameters = result.CreateParameters();
let startIndex = SkipPreviousWrapSymbol(units, index);
const previous = Get(units, startIndex);
if (previous === null) {
  throw new Error("previous");
}
result.SignIn(previous.SourceRange.Start!);
const asyncIndex = SkipPreviousWrapSymbol(units, startIndex);
const asyncUnit = Get(units, asyncIndex);
if (asyncUnit instanceof Common && asyncUnit.Is("async")) {
  startIndex = asyncIndex;
  result.IsAsync = true;
}
if (previous instanceof Bracket) {
  const tempParameters: Token[] = [];
  for (let i = 0; i < previous.Data.length; i++) {
    const item = previous.Data[i];
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
    } else if (i === previous.Data.length - 1) {
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
} else if (previous instanceof Common) {
  const parameter = new LamdaParameter(template);
  parameter.SignIn(previous.SourceRange.Start!);
  parameter.SignOut(previous.SourceRange.End!);
  parameter.Add(previous);
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
index = ReplaceCountAt(units, startIndex, endIndex - startIndex + 1, result);
return index;
```

# class Lamda extends IndependentToken

Lambda 表达式。

原 C# 侧是 `public class Lamda : IndependentToken<char>`。按 M31，C# 的 `char` 在规范里一律写 `string`。

它**没有**覆写 `ToXmlString`，XML 由基类产出：`<Lamda>参数列表 + 体的 XML</Lamda>`。

## field IsAsync:bool = false

这个 lambda 前面是不是有 `async`。原 C# 是 `public bool IsAsync { get; set; } = false;`，按 M12 落成字段（纯数据，没有 `private set`）。

## constructor:(Template:Template)=>void

原 C# 构造体是空的，只是转调基类构造器。

```ts
super(Template);
```

## method CreateParameters:()=>LamdaParameters

造一个 `LamdaParameters` 作为自己的子单元并返回它。

原 C# 是 `public LamdaParameters CreateParameters() => Add(new LamdaParameters(Owner, Template));`——`Add<T>` 返回加进去的那个单元，所以这里直接返回。

```ts
return this.Add(new LamdaParameters(this.Template));
```

## property Parameters:LamdaParameters

参数列表：子单元里第一个 `LamdaParameters`。

### get

原 C# 是 `public LamdaParameters Parameters => (Data.Find(x => x is LamdaParameters) as LamdaParameters)!;`。ts 的 `Array.find` 找不到给 `undefined`（不是 `null`），断言成 `LamdaParameters` 与 C# 的 `!` 等价。

```ts
return this.Data.find((x) => x instanceof LamdaParameters) as LamdaParameters;
```

## method ComputeParametersCount:()=>int

形参个数。

原 C# 是 `public int ComputeParametersCount() => Parameters.Data.Count;`。`Dawn/Steper` 的 `StepInferenceUtil` 用它匹配委托参数，执行层不在此次移植范围。

```ts
return this.Parameters.Data.length;
```

## method CreateBody:()=>LamdaBody

造一个 `LamdaBody` 作为自己的子单元并返回它。

原 C# 是 `public LamdaBody CreateBody() => Add(new LamdaBody(Owner, Template));`。

```ts
return this.Add(new LamdaBody(this.Template));
```

## property Body:LamdaBody

体：子单元里第一个 `LamdaBody`。

### get

原 C# 是 `public LamdaBody Body => (Data.Find(x => x is LamdaBody) as LamdaBody)!;`。

```ts
return this.Data.find((x) => x instanceof LamdaBody) as LamdaBody;
```

## method ToDictionary:()=>Map<string, any>

转成字典：比基类多出 `async` / `parameters` / `body` 三项，**没有** `children`。

原 C# 返回 `Dictionary<string, object>`，按 M10 / M20 映射成 `Map<string, any>`；`result["parameters"] = Parameters.ToList()` 取的是父类 `Token.ToList()`（每项自带 `range`）。

```ts
const result = new Map<string, any>();
result.set("type", this.constructor.name);
result.set("async", this.IsAsync);
result.set("parameters", this.Parameters.ToList());
result.set("body", this.Body.ToDictionary());
return result;
```

## method Clone:()=>Token

克隆自身。

原 C# 的顺序是 `Sign(this)` → 拷 `IsAsync` → `Add(Data.Select(item => item.Clone()))` → `TryToClose()`；`Add` 收到的是一批克隆出来的子单元，所以 ts 侧用 `AddRange`（M14(c)）。

```ts
const result = new Lamda(this.Template);
result.Sign(this);
result.IsAsync = this.IsAsync;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
