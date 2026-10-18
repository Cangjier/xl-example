# dependencies
```xl
import { Branch } from "../branch.xl.md"
import { BranchConditionResult } from "../branch-condition-result.xl.md"
import { BranchStates } from "../branch-states.xl.md"
import { CloseStates } from "../close-states.xl.md"
import { ComputePossibleShapesStates } from "../compute-possible-shapes-states.xl.md"
import { ReloadMessage } from "../messages/reload-message.xl.md"
import { Source } from "../source.xl.md"
import { SyntaxContext } from "../syntax-context.xl.md"
import { Token } from "../token.xl.md"
import { Template } from "../templates/template.xl.md"
import { UnitToken } from "../unit-token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

行注释 `// …`：从 `//` 吃到行尾，正文攒进 `Tmp`。换行本身不属于注释，处理完由 `ReloadMessage` 重新插回队列。注释单元留在树里、会进 XML，产出里能看到 `<LineAnnotation>正文</LineAnnotation>`。

# class LineAnnotationBranch extends Branch

行注释的跳转规则：认出 `//` 的开头，并把已经落树的第一个 `/` 回退给 `LineAnnotation`。

它永远不进 `Data`、不进 XML。

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

判据：前一个字符是 `/`、它还能被回退（`unit.IsUndo`）、且当前字符也是 `/`。

```ts
const preUnit = source.Pre();
const result = new BranchConditionResult();
result.Success = preUnit !== null && preUnit.Value === "/" && unit.IsUndo(preUnit) && source.Value === "/";
return result;
```

## method Success:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

认下 `//`：先回退已吃掉的那个 `/`（它归本单元所有），再挂一个新的 `LineAnnotation` 并用同一个 `/` 签入。

```ts
const preUnit = source.Pre()!;
unit.Undo(preUnit);
const created = unit.AddToMounted(new LineAnnotation(unit.Template));
if (created.State === CloseStates.Built) {
  context.Messages.push(new ReloadMessage(unit, unit, source));
  return;
}
created.Created!.SignIn(preUnit);
```

# class LineAnnotation extends UnitToken

行注释单元。

单元值类型是单字符的 `string`。

覆写了 `ToXmlString`（`<LineAnnotation>正文</LineAnnotation>`，不转义），这是注释在 XML 里的最终形态。

## field IsBasicToken:bool = true

basic 单元：由 `Template.BasicBranchQueue()` 收出来。

## field IsAnnotationToken:bool = true

注释单元：`//` 是 trivia。

## static readonly field JumpIn:LineAnnotationBranch = new LineAnnotationBranch()

把 `LineAnnotationBranch` 注册进 `Root` 的通用跳转队列用的实例。

## constructor:(template:Template)=>void

以模板创建，并把本类型的跳转队列取出来；本类不设重组队列。

```ts
super(template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor, null);
```

## field Tmp:string = ""

注释正文（`//` 之后的字符逐个攒进来）。

## method ToXmlString:()=>string

产出 XML：`<LineAnnotation>注释正文</LineAnnotation>`。标签名取运行时类型名；内容不做 XML 转义。

```ts
const name = this.constructor.name;
return `<${name}>${this.Tmp}</${name}>`;
```

## method Undo:(source:Source)=>void

回退一个字符：覆盖该位置的子单元非空就转交给它，否则从 `Tmp` 末尾删掉一个字符。

```ts
const undoUnit = this.WhichUnitRangeContains(source);
if (undoUnit !== null) {
  undoUnit.Undo(source);
} else {
  this.Tmp = this.Tmp.slice(0, this.Tmp.length - 1);
}
```

## method IsUndo:(source:Source)=>bool

能不能回退：范围已经签出（`SourceRange.End` 非空）就不能；否则看覆盖该位置的子单元，没有子单元时返回 `true`。

```ts
if (this.SourceRange.End !== null) {
  return false;
}
const undoUnit = this.WhichUnitRangeContains(source);
if (undoUnit !== null) {
  return undoUnit.IsUndo(source);
}
return true;
```

## protected method Close:()=>CloseStates

关闭：只把自己标记为已关闭，然后**只问父单元**要不要重算候选——父单元没实现 `IComputePossibleShapes` 就不问，也不再往上找。

父单元是不是宿主由它自己的 `CatalogGuide` 说了算：为空就等于没挂向导，被问到也不做任何事。

重算的返回值原样带上去：建出了形状时，正在收尾的这个 token 要让当前字符重放。

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

## protected method Default:(context:SyntaxContext, source:Source)=>void

跳转队列没接手时，把字符并进 `Tmp`。

```ts
this.Tmp += source.Value;
```

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

遇到换行就退出，并处理 CRLF：前一个字符是 `\r` 时先把它回退掉，再签出到 `\r` 的前一个字符；否则直接签出到前一个字符。然后关闭自己并跑重组、从父单元卸载，再插一条 `ReloadMessage` 让当前换行重新处理一遍，返回 `Done`；其余情况返回 `Undo`。

```ts
if (source.Value !== "\n") {
  return BranchStates.Undo;
}
const preSource = source.Pre();
if (preSource !== null && preSource.Value === "\r") {
  this.Undo(preSource);
  this.SignOut(preSource.Pre()!);
} else {
  this.SignOut(source.Pre()!);
}
this.TryToClose();
this.Quit();
context.Messages.push(ReloadMessage.WithoutProcessOwner(this, source));
return BranchStates.Done;
```

## method Clone:()=>Token

克隆自身。顺序是 `Sign(this)` → 把 `Tmp` 追加到自身 → `TryToClose()`。

```ts
const result = new LineAnnotation(this.Template);
result.Sign(this);
result.Tmp += this.Tmp;
result.TryToClose();
return result;
```
