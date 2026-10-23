# dependencies
```xl
import { GuideToken } from "../../guide-token.xl.md"
import { SourceRange } from "../../source-range.xl.md"
import { SyntaxContext } from "../../syntax-context.xl.md"
import { Token } from "../../token.xl.md"
import { Template } from "../../templates/template.xl.md"
import { InterpolationString } from "./interpolation-string.xl.md"
import { ReloadMessage } from "../../messages/reload-message.xl.md"
import { String } from "./string.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

插值引导：原始/内插混合的字符串（`StringGuide` 认出来的 `$` + `"""` 那一族）遇到 `{` 时挂上本向导，由它数**连续的左花括号**，再决定这串括号是「字面量」还是「插值的开头」。

# class InterpolationGuide extends GuideToken

插值的进入向导。

## property ParentString:String

本向导所属的那层字符串——`Parent` 直接就是 `String`。

### get

```ts
return (this.Parent as String)!;
```

## private field Items:Array<int> = []

已经数过的左花括号位置（下标，每个 `{` 一个），按遇到顺序排列；只有当前字符就是 `{` 时才会记进来。

## private field BracketCount:int = 0

已经数过的连续左花括号个数。

## constructor:(template:Template)=>void

构造器只是转调基类。

```ts
super(template);
```

## protected method Navigate:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

当前字符还是 `{` 就接着数；一旦遇到别的字符，就用数到的个数做结论。

两条支路：

- **够数**（`BracketCount >= ParentString.InterpolationCount`）：先把自己摘掉，然后把多出来的 `Next = BracketCount - InterpolationCount` 个 `{` 当作字面量还给常量字符串（`AppendToLastConstString(…, i, context)`，并在 `i == 0` 时用 `TrySignIn(i)` 给新建的常量字符串签入）；接着挂一个新的 `InterpolationString` 并用 `Items[0]` 签入，最后把当前字符 `ReloadMessage` 重放一遍，然后返回。
  - 注意 `Items[0]` 是**第一个** `{` 的位置（不是第 `Next` 个）。
- **不够数**（`BracketCount < ParentString.InterpolationCount`）：这串 `{` 全是字面量，逐个 `AppendToLastConstString(…, i, context).TrySignIn(i)` 还回去，再把当前字符重放一遍。

两个分支都 `return`，所以只有 `{` 会走到末尾的 `Items.push(index)`。

`Items` 里记的是更早的下标，可能已经落在当前 buffer 窗口之前，所以取字符用 `SourceRange.Whole(buffer.Document!)`。

```ts
const Value = buffer.At(index);
if (Value !== "{") {
  const whole = SourceRange.Whole(buffer.Document!);
  if (this.BracketCount >= this.ParentString.InterpolationCount) {
    //满足情况
    this.RemoveSelf();
    const Next = this.BracketCount - this.ParentString.InterpolationCount;
    for (let i = 0; i < Next; i++) {
      const ItemIndex = this.Items[i];
      const Const = this.ParentString.AppendToLastConstString(whole.At(ItemIndex), ItemIndex, context);
      if (i === 0) {
        Const.TrySignIn(ItemIndex);
      }
    }
    {
      const lastOfMounted = this.ParentString.Last();
      if (lastOfMounted !== null && !lastOfMounted.Closed) {
        lastOfMounted.TryToClose(context);
      }
      const mounted = new InterpolationString(this.Template);
      this.ParentString.Add(mounted);
      this.ParentString.MountedUnit = mounted;
    }
    (this.ParentString.MountedUnit as InterpolationString)!.SignIn(this.Items[0]);
    context.Messages.push(ReloadMessage.WithoutProcessOwner(this, index));
    return;
  } else {
    //不满足情况
    this.RemoveSelf();
    for (const ItemIndex of this.Items) {
      this.ParentString.AppendToLastConstString(whole.At(ItemIndex), ItemIndex, context).TrySignIn(ItemIndex);
    }
    context.Messages.push(ReloadMessage.WithoutProcessOwner(this, index));
  }
} else {
  this.BracketCount++;
}

this.Items.push(index);
```
