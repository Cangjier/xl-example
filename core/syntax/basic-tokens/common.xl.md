# dependencies
```xl
import { BlockToken } from "../block-token.xl.md"
import { BranchStates } from "../branch-states.xl.md"
import { CloseStates } from "../close-states.xl.md"
import { ComputePossibleShapesStates } from "../compute-possible-shapes-states.xl.md"
import { Source } from "../source.xl.md"
import { SyntaxContext } from "../syntax-context.xl.md"
import { Token } from "../token.xl.md"
import { Template } from "../templates/template.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

通用字符块：标识符、数字、布尔字面量。它把连续的「不是符号、也不是空白」的字符吞进自己的 `Temp`，最终吐成 `<Common>abc</Common>`。

# class Common extends BlockToken

通用字符块。

单元值类型是单字符的 `string`。

没有覆写 `ToXmlString`，XML 由 `BlockToken` 产出：`<Common>转义后的文本</Common>`。

## field IsBasicToken:bool = true

basic 单元：由 `Template.BasicBranchQueue()` 收出来。

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

## protected method Close(context?:SyntaxContext)=>CloseStates

关闭：只把自己标记为已关闭，然后**只问父单元**要不要重算候选——父单元没实现 `IComputePossibleShapes` 就不问，也不再往上找。

父单元是不是宿主由它自己的 `CatalogGuide` 说了算：为空就等于没挂向导，被问到也不做任何事。

重算的返回值要**原样带上去**：建出了形状时，正在被建的那个 token 的收尾就变成了「形状已就位，当前字符该重放」。

```ts
this.Closed = true;
const parent = this.Parent;
if (parent !== null && "ComputePossibleShapes" in parent) {
  const state = (parent as any).ComputePossibleShapes();
  if (state === ComputePossibleShapesStates.Built) {
    return CloseStates.Built;
  }
}
return CloseStates.Nothing;
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

## static method Transit:(context:SyntaxContext, unit:Token, source:Source)=>BranchStates

判定、收尾、新开都在这一个方法里：

- 上一个单元是未关闭的 `Common`：`.` 且它是纯数字 → 追加；`IsAppend` → 追加；否则先 `TryToClose` 它，建出形状就返回 `Reload`；
- 收尾之后（或本来就没有 `Common` 可续接）：当前字符是符号或空白 → `Undo`，交给后面的分支；
- 其余 → 开新块：先 `last.TryToClose()`，建出形状就返回 `Reload`，否则加新单元、签入当前字符并 `Done`。

```ts
const value = source.Value;
const template = unit.Template;
const last = unit.Last();
if (last instanceof Common && !last.Closed) {
  if (value === "." && template.SymbolTemplate.IsSymbol(value) && last.IsNumberWithoutDecimal()) {
    last.AppendAndSignOut(source);
    return BranchStates.Done;
  }
  if (last.IsAppend(source)) {
    last.AppendAndSignOut(source);
    return BranchStates.Done;
  }
  if (last.TryToClose() === CloseStates.Built) {
    return BranchStates.Reload;
  }
}
if (template.SymbolTemplate.IsSymbol(value) || template.SymbolTemplate.IsWhiteSpace(value)) {
  return BranchStates.Undo;
}
if (last !== null && !last.Closed && last.TryToClose() === CloseStates.Built) {
  return BranchStates.Reload;
}
unit.Add(new Common(unit.Template));
(unit.Last() as Common)!.AppendAndSignOut(source).SignIn(source);
return BranchStates.Done;
```
