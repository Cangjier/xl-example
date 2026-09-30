# dependencies
```xl
import { Branch } from "../../../core/syntax/branch.xl.md"
import { BranchConditionResult } from "../../../core/syntax/branch-condition-result.xl.md"
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { CommonUtil } from "../../../core/common-util.xl.md"
import { ReloadMessage } from "../../../core/syntax/messages/reload-message.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

行注释 `// …`：从 `//` 一直吃到行尾（含被 `ReloadMessage` 重新处理的 `\n`），正文攒进 `Tmp`。注释单元**留在树里、会进 XML**：原本负责把它从父单元 `Data` 里删掉的 `LineAnnotation.Reorganization` 已经随 `../parse-pipeline.xl.md` 的 `GeneralReorganize` 一起移除，所以产出里能看到 `<LineAnnotation>正文</LineAnnotation>`。

`LineAnnotationBranch` 写在 `LineAnnotation` **之前**：后者的静态字段 `JumpIn` 会在类定义时立即 `new LineAnnotationBranch()`，写反了会命中 ts 的暂时性死区（TDZ）。

# class LineAnnotationBranch extends Branch

它永远不进 `Data`、不进 XML。

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

判据：前一个字符是 `/`、它还能被回退（`unit.IsUndo`）、且当前字符也是 `/`——也就是 `//` 的开头。

`Pre()` 返回 `Source | null`，判定里直接用它的结果；判定结果不是 `bool` 而是 `BranchConditionResult`，所以展开成「建结果、赋 `Success`」两步。

```ts
const preUnit = source.Pre();
const result = new BranchConditionResult();
result.Success = preUnit !== null && preUnit.Value === "/" && unit.IsUndo(preUnit) && source.Value === "/";
return result;
```

## method Success:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

认下 `//`：先回退已吃掉的那个 `/`（它归本单元所有），再挂一个新的 `LineAnnotation` 并用同一个 `/` 签入。

取前一个字符用 `source.Pre()!`——`Condition` 已经确认过它非空。

```ts
const preUnit = source.Pre()!;
unit.Undo(preUnit);
unit.AddToMounted(new LineAnnotation(unit.Template)).SignIn(preUnit);
```

# class LineAnnotation extends UnitToken

行注释单元。

单元值类型是单字符的 `string`。

它覆写了 `ToXmlString`（`<LineAnnotation>正文</LineAnnotation>`，内容过一遍 `CommonUtil.XmlDecode`）；由于摘除注释的那个重组已经移除，这个覆写就是注释在 XML 里的最终形态，不再有单元在它之前把它删掉。

**转义是必须的**：注释正文是任意文本，`// a < b` 里的 `<` 直接写进文本节点会产出**不合法的 XML**
（原来这一处刻意不转义，理由是「注释不该被改写」，但产物是 XML，合法性优先）。
转义走 `CommonUtil.XmlDecode`，与 `ConstString` 用的是同一张表（换行变 `\n`、`< > &` 变实体）。

## static readonly field JumpIn:LineAnnotationBranch = new LineAnnotationBranch()

把 `LineAnnotationBranch` 注册进 `Root` 的通用跳转队列用的实例。

## constructor:(template:Template)=>void

以模板创建，并把本类型的跳转队列取出来；本类不设重组队列——原先靠通用重组队列把注释从 `Data` 里摘掉，那个重组已经移除，所以注释单元就这样留在父单元里。

取运行时类型用 `this.constructor`。

```ts
super(template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor, null);
```

## field Tmp:string = ""

注释正文（`//` 之后的字符逐个攒进来）。

`Tmp` 写成 `string`：它只被本类读写，没有被别处当容器用，所以拼接与截尾就是 `this.Tmp += c` 与 `this.Tmp.slice(0, this.Tmp.length - 1)`，换成字符串不失语义。

## method ToXmlString:()=>string

产出 XML：`<LineAnnotation>注释正文</LineAnnotation>`。

标签名取 `this.constructor.name`；内容过 `CommonUtil.XmlDecode`——注释是任意文本，
里面的 `<` / `>` / `&` 必须转义，否则产物不是合法 XML。

```ts
const name = this.constructor.name;
return `<${name}>${CommonUtil.XmlDecode(this.Tmp)}</${name}>`;
```

## method Undo:(source:Source)=>void

回退一个字符。

覆盖该位置的子单元非空就转交给它，否则从 `Tmp` 末尾删掉一个字符。注意这里的签名模式是 `Token`（基类同款），与 `PreprocessorDirectives.Undo` 的 `UnitToken` 不同——两边各自保持原样，不要「统一」。

```ts
const undoUnit = this.WhichUnitRangeContains(source);
if (undoUnit !== null) {
  undoUnit.Undo(source);
} else {
  this.Tmp = this.Tmp.slice(0, this.Tmp.length - 1);
}
```

## method IsUndo:(source:Source)=>bool

能不能回退。范围已经签出（`SourceRange.End` 非空）就不能；否则看覆盖该位置的子单元，没有子单元时返回 `true`。

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

## protected method Close:()=>void

关闭：只把自己标记为已关闭。

```ts
this.Closed = true;
```

## protected method Default:(context:SyntaxContext, source:Source)=>void

跳转队列没接手时，把字符并进 `Tmp`。

```ts
this.Tmp += source.Value;
```

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

遇到换行就退出，并且**要处理 CRLF**：前一个字符是 `\r` 时先把 `\r` 回退掉（`\r` 不该进注释正文），再签出到 `\r` 的**前一个**字符；否则直接签出到前一个字符。然后关闭自己并跑重组、从父单元卸载，再插一条 `ReloadMessage` 让当前换行重新处理一遍（换行本身不属于注释），返回 `Done`；其余情况返回 `Undo`。

两处取前一个字符都用 `source.Pre()!` / `preSource.Pre()!`；插消息走静态工厂 `ReloadMessage.WithoutProcessOwner`。

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

克隆自身。

顺序是 `Sign(this)` → 把 `Tmp` 追加到自身 → `TryToClose()`。

```ts
const result = new LineAnnotation(this.Template);
result.Sign(this);
result.Tmp += this.Tmp;
result.TryToClose();
return result;
```
