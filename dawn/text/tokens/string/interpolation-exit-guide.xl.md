# dependencies
```xl
import { GuideToken } from "../../../../core/syntax/guide-token.xl.md"
import { Source } from "../../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { InterpolationString } from "./interpolation-string.xl.md"
import { String } from "./string.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

插值的**退出**向导：`InterpolationString` 收到 `}` 时把本向导挂到自己身上，由本向导数右花括号；数够 `InterpolationCount` 个就让整个插值单元退出，插值单元外面那层字符串继续啃源码。

# class InterpolationExitGuide extends GuideToken

插值的退出向导。

## property AncestorString:String

本向导所属插值单元**外面那一层**字符串：`Parent` 是 `InterpolationString`，从它那里再取 `ParentString`。

### get

```ts
return (this.Parent as InterpolationString)!.ParentString;
```

## protected field BracketCount:int = 0

已经数过的右花括号个数。

## protected field Items:Array<Source> = []

数括号过程中经过的位置。

## constructor:(Template:Template)=>void

构造器只是转调基类。

```ts
super(Template);
```

## protected method Navigate:(context:SyntaxContext, Src:Source)=>void

只认右花括号，按数到的个数分四种走法：

1. `}` 且个数**等于** `AncestorString.InterpolationCount`——把自己从父单元摘掉，再让父插值单元 `ForceExit(context, Src)`，然后**直接返回**（这个 `}` 不进 `Items`）。
2. `}` 但个数**还没到**——这一支是空实现只带一句注释「不确定」，落到方法末尾的 `Items.push(Src)`。
3. `}` 但个数**超过了**——抛空消息异常。
4. 不是 `}`（原注释「不正常」）——抛「插值关闭异常」。

```ts
const Value = Src.Value;
if (Value === "}") {
  this.BracketCount++;
  if (this.BracketCount === this.AncestorString.InterpolationCount) {
    this.RemoveSelf();
    (this.Parent as InterpolationString)!.ForceExit(context, Src);
    return;
  } else if (this.BracketCount < this.AncestorString.InterpolationCount) {
    //不确定
  } else {
    throw new Error("");
  }
} else {
  //不正常
  throw new Error("插值关闭异常");
}
this.Items.push(Src);
```

## method Clone:()=>Token

克隆自身——这个向导是一次性的，随用随弃，所以克隆直接抛错。

```ts
throw new Error("抽象成员未实现");
```
