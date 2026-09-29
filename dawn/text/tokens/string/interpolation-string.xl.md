# dependencies
```xl
import { IOwner } from "../../../../owners/i-owner.xl.md"
import { UnitToken } from "../../../../core/syntax/unit-token.xl.md"
import { BranchStates } from "../../../../core/syntax/branch-states.xl.md"
import { Source } from "../../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { ReloadMessage } from "../../../../core/syntax/messages/reload-message.xl.md"
import { InterpolationExitGuide } from "./interpolation-exit-guide.xl.md"
import { String } from "./string.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

插值字符串：`{ … }` 这一段本身。它是**单元**（不是向导），括号里的内容由挂载的子单元自己啃；只有那个 `}` 归它管——它把 `}` 转交给 `InterpolationExitGuide` 去数。

它的 XML 由基类 `Token.ToXmlString` 产出：`<InterpolationString>子单元</InterpolationString>`（它没有覆写 `ToXmlString`），所以 ts 类名必须与 C# 完全一致。

# class InterpolationString extends UnitToken

插值字符串。

原 C# 侧是 `public class InterpolationString : UnitToken<char>`。按 M31，C# 的 `char` 在规范里写 `string`（单字符）。

## constructor:(owner:IOwner, template:Template)=>void

创建时按自己的运行时类型取跳转队列与重组队列。

原 C# 是 `public InterpolationString(IOwner owner, Template<char> template) : base(owner, template)`，体里两句 `ProcessQueue = template.BranchTemplate.Get(GetType());` 与 `ReorganizationQueue = template.ReorganizationTemplate.Get(GetType());`。按 M17，`GetType()` 在 ts 侧写成 `this.constructor`。

```ts
super(owner, template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## property ParentString:String

插值所属的那层字符串——`Parent` 直接就是 `String`。

原 C# 是 `public String ParentString => (Parent as String)!;`。类名 `String` 与 C# 完全一致（M17）。

### get

```ts
return (this.Parent as String)!;
```

## protected method Close:()=>void

关闭：只把自己标记为已关闭。

原 C# 是 `protected override void Close()`。

```ts
this.Closed = true;
```

## protected method Default:(context:SyntaxContext, source:Source)=>void

兜底：碰上空白字符（`\r` / `\n` / 空格 / `\t`）直接忽略。

原 C# 是 `protected override void Default(SyntaxContext<char> context, in Source<char> source)`：空白就 `return`，否则 `Console.WriteLine($"Unknown Branch: `{source.Value}`({(int)source.Value})")`。按手册 §3.9，这类调试输出**不移植**（ts 侧不打印），所以 ts 体到此为止——只留那个空白判断，行为与 C# 一致（非空白时同样什么都不做）。

```ts
const Value = source.Value;
if (Value === "\r" || Value === "\n" || Value === " " || Value === "\t") {
  return;
}
```

## method ForceExit:(context:SyntaxContext, source:Source)=>void

强制退出：签出到 `source`，尝试关闭（关自己并跑重组），再从父单元卸载自己。

原 C# 是 `public void ForceExit(SyntaxContext<char> context, in Source<char> source)`；注意它**没有**用 `context`，参数只是为了给 `InterpolationExitGuide` 一个统一调用形态。同名的 `String.ForceExit` 只收一个参数，别混。

```ts
this.SignOut(source);
this.TryToClose();
this.Quit();
```

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

遇到 `}` 就把退出向导挂到自己身上，并把当前 `}` 重新插回队首，让向导拿到它。

原 C# 是 `protected override BranchStates ExitOrPre(SyntaxContext<char> context, in Source<char> source)`。注意 `AddToMounted` 之后**没有** `SignIn`（与 `String.Default` 里的用法不同）——照抄。

`ReloadMessage` 的三参构造器在 xl 里对应静态工厂 `ReloadMessage.WithoutProcessOwner`（M14(b)）。

```ts
if (source.Value === "}") {
  this.AddToMounted(new InterpolationExitGuide(this.Owner, this.Template));
  context.Messages.push(ReloadMessage.WithoutProcessOwner(this.Owner, this, source));
  return BranchStates.Done;
}
return BranchStates.Undo;
```

## method Clone:()=>Token

克隆自身。

原 C# 的顺序是 `Sign(this)` → `Add(Data.Select(item => item.Clone()))` → `TryToClose()`。`Add` 传的是一批克隆出来的子单元，所以 ts 侧用 `AddRange`（M14(c)：C# 的 `Add<T>(IEnumerable<T>)` 重载改名 `AddRange`）。

```ts
const result = new InterpolationString(this.Owner, this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
