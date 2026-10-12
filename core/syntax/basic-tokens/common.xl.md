# dependencies
```xl
import { BlockToken } from "../block-token.xl.md"
import { Branch } from "../branch.xl.md"
import { BranchConditionResult } from "../branch-condition-result.xl.md"
import { Source } from "../source.xl.md"
import { SyntaxContext } from "../syntax-context.xl.md"
import { Token } from "../token.xl.md"
import { Template } from "../templates/template.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

通用字符块：标识符、数字、布尔字面量。它把连续的「不是符号、也不是空白」的字符吞进自己的 `Temp`，最终吐成 `<Common>abc</Common>`。

# class CommonBranch extends Branch

通用字符块的跳转规则：判断当前字符是开一个新的 `Common`，还是追加到上一个 `Common`。

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

上一个单元是 `Common` 时按三条分支判定：当前字符是 `.` 且算符号时，只有上一个 `Common` 是纯数字才接手，`Message = 1`；上一个 `Common` 已关闭时，以「不是符号、也不是空白」开新块，`Message = 0`；否则问上一个 `Common` 的 `IsAppend`，`Message = 1`。没有上一个 `Common` 时与「已关闭」同款判定。

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

`Message` 为 `0` 就新建一个 `Common` 并签入；为 `1` 就追加到上一个 `Common`。

```ts
if (result.Message === 0) {
  unit.AddAndCloseLast(new Common(unit.Template)).AppendAndSignOut(source).SignIn(source);
} else {
  (unit.Last() as Common)!.AppendAndSignOut(source);
}
```

## method Failed:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

失败时把上一个 `Common` 关闭。

```ts
const last = unit.Last();
if (last instanceof Common) {
  last.TryToClose();
}
```

# class Common extends BlockToken

通用字符块。

单元值类型是单字符的 `string`。

没有覆写 `ToXmlString`，XML 由 `BlockToken` 产出：`<Common>转义后的文本</Common>`。

## static readonly field AppendIn:CommonBranch = new CommonBranch()

注册进通用跳转队列用的实例。

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

`Temp` 里的内容是不是纯数字——每一位都是数字。

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

```ts
return this.Template.SymbolTemplate.IsNumber(this.Temp[this.Temp.length - 1]);
```

## method IsNumber:()=>bool

`Temp` 里的内容算不算数字字面量：至多一个小数点，且不要求有数字——`"."` 成立、`".."` 不成立；结尾允许一个 `d` 或 `f` 后缀，但必须在有数字之后且是最后一个字符；`Temp` 为空时成立。

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

`Temp` 里的内容是否逐字符等于 `value`。

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

```ts
return items.includes(this.TempToString());
```

## method Clone:()=>Token

克隆自身。顺序是 `Sign(this)` → 把 `Temp` 追加到自身 → `TryToClose()`。

```ts
const result = new Common(this.Template);
result.Sign(this);
result.Temp.push(...this.Temp);
result.TryToClose();
return result;
```
