# dependencies
```xl
import { IOwner } from "../../../../owners/i-owner.xl.md"
import { GuideToken } from "../../../../core/syntax/guide-token.xl.md"
import { Source } from "../../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { InterpolationString } from "./interpolation-string.xl.md"
import { ReloadMessage } from "../../../../core/syntax/messages/reload-message.xl.md"
import { String } from "./string.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

插值引导：原始/内插混合的字符串（`StringGuide` 认出来的 `$` + `"""` 那一族）遇到 `{` 时挂上本向导，由它数**连续的左花括号**，再决定这串括号是「字面量」还是「插值的开头」。

# class InterpolationGuide extends GuideToken

插值的进入向导。

原 C# 侧是 `public class InterpolationGuide : GuideToken<char>`。按 M31，C# 的 `char` 在规范里写 `string`（单字符）。

## property ParentString:String

本向导所属的那层字符串——`Parent` 直接就是 `String`。

原 C# 是 `public String ParentString => (Parent as String)!;`。类名 `String` 与 C# 完全一致（M17）。

### get

```ts
return (this.Parent as String)!;
```

## private field Items:Array<Source> = []

已经数过的左花括号位置（每个 `{` 一个），按遇到顺序排列。因为两个分支都会提前 `return`，方法末尾那句 `push` 实际上只在「当前字符就是 `{`」时执行，所以这里只装 `{`。

原 C# 是 `private List<Source<char>> Items = new();`。

## private field BracketCount:int = 0

已经数过的连续左花括号个数。

原 C# 是 `private int BracketCount = 0;`。

## constructor:(owner:IOwner, template:Template)=>void

原 C# 只是转调基类构造器。

```ts
super(owner, template);
```

## protected method Navigate:(context:SyntaxContext, source:Source)=>void

当前字符还是 `{` 就接着数；一旦遇到别的字符，就用数到的个数做结论。

原 C# 是 `protected override void Navigate(SyntaxContext<char> context, in Source<char> source)`，两条支路照抄：

- **够数**（`BracketCount >= ParentString.InterpolationCount`）：先把自己摘掉，然后把多出来的 `Next = BracketCount - InterpolationCount` 个 `{` 当作字面量还给常量字符串（`AppendToLastConstString`，并在 `i == 0` 时用 `TrySignIn` 给新建的常量字符串签入）；接着挂一个新的 `InterpolationString` 并用 `Items[0]` 签入，最后把当前字符 `ReloadMessage` 回队首重新处理一遍，然后返回。
  - 注意 `Items[0]` 是**第一个** `{` 的位置（不是第 `Next` 个）——这是原实现，照抄，不"修正"。
- **不够数**（`BracketCount < ParentString.InterpolationCount`）：这串 `{` 全是字面量，逐个 `AppendToLastConstString(…).TrySignIn(…)` 还回去，再 `ReloadMessage`。

两个分支都 `return`，所以只有 `{` 会走到末尾的 `Items.Add(source)`。

C# 的 `new ReloadMessage<char>(Owner, this, source)` 用的是三参构造器；它在 xl 里对应静态工厂 `ReloadMessage.WithoutProcessOwner`（M14(b)）。

```ts
const Value = source.Value;
if (Value !== "{") {
  if (this.BracketCount >= this.ParentString.InterpolationCount) {
    //满足情况
    this.RemoveSelf();
    const Next = this.BracketCount - this.ParentString.InterpolationCount;
    for (let i = 0; i < Next; i++) {
      const Item = this.Items[i];
      const Const = this.ParentString.AppendToLastConstString(Item.Value, Item);
      if (i === 0) {
        Const.TrySignIn(Item);
      }
    }
    this.ParentString.AddToMounted(new InterpolationString(this.Owner, this.Template)).SignIn(this.Items[0]);
    context.Messages.push(ReloadMessage.WithoutProcessOwner(this.Owner, this, source));
    return;
  } else {
    //不满足情况
    this.RemoveSelf();
    for (const i of this.Items) {
      this.ParentString.AppendToLastConstString(i.Value, i).TrySignIn(i);
    }
    context.Messages.push(ReloadMessage.WithoutProcessOwner(this.Owner, this, source));
  }
} else {
  this.BracketCount++;
}

this.Items.push(source);
```

## method Clone:()=>Token

克隆自身。

原 C# 是 `public override Token<char> Clone()`，体里直接抛 `NotImplementedException`——这个向导是一次性的。ts 侧照抄成抛错。

```ts
throw new Error("NotImplementedException");
```
