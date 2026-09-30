# dependencies
```xl
import { BlockToken } from "../../../core/syntax/block-token.xl.md"
import { Branch } from "../../../core/syntax/branch.xl.md"
import { BranchConditionResult } from "../../../core/syntax/branch-condition-result.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

通用字符块：标识符、数字、布尔字面量。它把连续的「不是符号、也不是空白」的字符吞进自己的 `Temp`，最终吐成 `<Common>abc</Common>`。

`CommonBranch` 必须写在 `Common` 之前：后者的静态字段 `AppendIn` 在类定义时就 `new CommonBranch()`。

# class CommonBranch extends Branch

分发规则比看上去绕：**上一个单元也是 `Common`** 时才会尝试续写，否则一律开新的。三条分支：

1. 当前字符是 `.` 且算符号——如果上一个 `Common` 是「纯数字」，这个点要**交给 `Symbol`**（小数点归符号处理），返回失败；否则失败。
2. 上一个 `Common` 已关闭——用「当前字符不是符号也不是空白」决定能不能开新块，`Message = 0`（新增）。
3. 否则——问上一个 `Common` 的 `IsAppend`，`Message = 1`（追加）。

无上一个 `Common` 时与第 2 条同款判定。

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

判断要不要接手当前字符，以及是「新增」还是「追加」。

```ts
const value = source.Value;
const last = unit.Last();
if (last instanceof Common) {
  if (value === "." && unit.Template.SymbolTemplate.IsSymbol(value)) {
    const result = new BranchConditionResult();
    result.Success = last.IsNumberWithoutDecimal();
    if (result.Success) {
      result.Message = 1;
    }
    return result;
  }
  if (last.Closed) {
    const result = new BranchConditionResult();
    result.Success = !(unit.Template.SymbolTemplate.IsSymbol(source.Value) || unit.Template.SymbolTemplate.IsWhiteSpace(source.Value));
    result.Message = 0;
    return result;
  }
  const result = new BranchConditionResult();
  result.Success = last.IsAppend(source);
  result.Message = 1;
  return result;
}
const result = new BranchConditionResult();
result.Success = !(unit.Template.SymbolTemplate.IsSymbol(source.Value) || unit.Template.SymbolTemplate.IsWhiteSpace(source.Value));
result.Message = 0;
return result;
```

## method Success:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

`Message` 为 `0` 就开一个新 `Common` 并签入，为 `1` 就追加到上一个。

```ts
if (result.Message === 0) {
  unit.AddAndCloseLast(new Common(unit.Template)).AppendAndSignOut(source).SignIn(source);
} else {
  (unit.Last() as Common)!.AppendAndSignOut(source);
}
```

## method Failed:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

失败时把上一个 `Common` 关掉——它已经断开了。

与基类的空实现不同，这里**有活干**。

```ts
const last = unit.Last();
if (last instanceof Common) {
  last.TryToClose();
}
```

# class Common extends BlockToken

通用字符块。

单元值类型是单字符的 `string`。

它没有覆写 `ToXmlString`，XML 由 `BlockToken` 产出：`<Common>转义后的文本</Common>`。

## static readonly field AppendIn:CommonBranch = new CommonBranch()

把 `CommonBranch` 注册进通用跳转队列用的实例。

## constructor:(Template:Template)=>void

转调基类构造器。

```ts
super(Template);
```

## method IsAppend:(Src:Source)=>bool

能不能把 `Src` 并进本块：不是符号、也不是空白就行。

```ts
return !(this.Template.SymbolTemplate.IsSymbol(Src.Value) || this.Template.SymbolTemplate.IsWhiteSpace(Src.Value));
```

## protected method Close:()=>void

关闭：只把自己标记为已关闭。

```ts
this.Closed = true;
```

## method IsNumberWithoutDecimal:()=>bool

`Temp` 里的内容是不是「纯数字」——每一位都是数字。

直接转调符号模板的同名方法。

```ts
return this.Template.SymbolTemplate.IsNumberWithoutDecimal(this.Temp.join(""));
```

## method IsNumberContainsDecimal:()=>bool

`Temp` 里的内容是不是能解析成小数。

```ts
return this.Template.SymbolTemplate.IsNumberContainsDecimal(this.Temp.join(""));
```

## method IsLastCharIsNumber:()=>bool

最后一个字符是不是数字。

直接转调符号模板的 `IsNumber`，取 `Temp` 的末位字符。

```ts
return this.Template.SymbolTemplate.IsNumber(this.Temp[this.Temp.length - 1]);
```

## method IsNumber:()=>bool

`Temp` 里的内容算不算数字字面量。

规则里有两处**反直觉但必须保留**的行为：

- 允许**至多一个小数点**，而且**不要求有数字**——所以 `"."` 也会返回 `true`；`".."` 返回 `false`。
- 允许结尾一个 `d` 或 `f` 后缀，但**必须在有数字之后且是最后一个字符**。

`Temp` 为空时循环一次都不执行，返回 `true`。

```ts
let containsDot = false;
let containsNumber = false;
let index = 0;
for (const item of this.Temp) {
  if (this.Template.SymbolTemplate.IsNumber(item)) {
    if (!containsNumber) {
      containsNumber = true;
    }
  } else if (item === ".") {
    if (containsDot) {
      return false;
    }
    containsDot = true;
  } else {
    if ((item === "d" || item === "f") && containsNumber && index === this.Temp.length - 1) {
      // 后缀合法，什么都不做
    } else {
      return false;
    }
  }
  index++;
}
return true;
```

## method IsBool:()=>bool

`Temp` 里的内容是不是 `true` / `false` 字面量。

```ts
const text = this.TempToString();
return text === "true" || text === "false";
```

## method Is:(value:string)=>bool

`Temp` 里的内容是否**逐字符**等于 `value`。

先比长度，再逐字符比；语义上等价于 `TempToString() === value`，但这里保留显式循环。

```ts
if (this.Temp.length !== value.length) {
  return false;
}
for (let i = 0; i < this.Temp.length; i++) {
  if (this.Temp[i] !== value[i]) {
    return false;
  }
}
return true;
```

## method IsAny:(items:Array<string>)=>bool

`Temp` 里的内容是否命中 `items` 里的任意一项。

这是 `Is` 的多项版本，参数个数与单参版不同，所以叫 `IsAny`。

```ts
return items.includes(this.TempToString());
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 把 `Temp` 追加到自身 → `TryToClose()`。

```ts
const result = new Common(this.Template);
result.Sign(this);
result.Temp.push(...this.Temp);
result.TryToClose();
return result;
```
