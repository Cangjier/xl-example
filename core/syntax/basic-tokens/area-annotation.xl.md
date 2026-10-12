# dependencies
```xl
import { Branch } from "../branch.xl.md"
import { BranchConditionResult } from "../branch-condition-result.xl.md"
import { BranchStates } from "../branch-states.xl.md"
import { Source } from "../source.xl.md"
import { SyntaxContext } from "../syntax-context.xl.md"
import { Token } from "../token.xl.md"
import { Template } from "../templates/template.xl.md"
import { UnitToken } from "../unit-token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

区域注释 `/* … */`：从 `/*` 吃到 `*/`，正文攒进 `Tmp`。注释单元留在树里、会进 XML，产出里能看到 `<AreaAnnotation>正文</AreaAnnotation>`。

# class AreaAnnotationBranch extends Branch

区域注释的跳转规则：认出 `/*` 的开头，并把已经落树的那个 `/` 回退给 `AreaAnnotation`。

它永远不进 `Data`、不进 XML。

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

判据：前一个字符是 `/`、它还能被回退（`unit.IsUndo`）、且当前字符是 `*`。

```ts
const pre = source.Pre();
const result = new BranchConditionResult();
result.Success = pre !== null && pre.Value === "/" && unit.IsUndo(pre) && source.Value === "*";
return result;
```

## method Success:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

认下 `/*`：先回退已吃掉的那个 `/`（它归本单元所有），再挂一个新的 `AreaAnnotation` 并用同一个 `/` 签入。

```ts
unit.Undo(source.Pre()!);
unit.AddToMounted(new AreaAnnotation(unit.Template)).SignIn(source.Pre()!);
```

# class AreaAnnotation extends UnitToken

区域注释单元。

单元值类型是单字符的 `string`。

覆写了 `ToXmlString`（`<AreaAnnotation>正文</AreaAnnotation>`，不转义），这是注释在 XML 里的最终形态。

## static readonly field JumpIn:AreaAnnotationBranch = new AreaAnnotationBranch()

把 `AreaAnnotationBranch` 注册进 `Root` 的通用跳转队列用的实例。

## constructor:(template:Template)=>void

以模板创建，并把本类型的跳转队列取出来；本类不设重组队列。

```ts
super(template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor, null);
```

## field Tmp:string = ""

注释正文，两个 `*` 都不在内：开头的 `*` 由 `Success` 消费掉，结尾的 `*` 由 `ExitOrPre` 回退掉。

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

## protected method Close:()=>void

关闭：只把自己标记为已关闭，并向上通知一次。

```ts
this.Closed = true;
this.NotifyClosed();
```

## protected method Default:(context:SyntaxContext, source:Source)=>void

跳转队列没接手时，把字符并进 `Tmp`。

```ts
this.Tmp += source.Value;
```

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

遇到 `*/` 就退出：前一个字符是 `*` 且当前字符是 `/` 时，签出到当前字符、把那个 `*` 回退掉、关闭自己并跑重组、从父单元卸载，返回 `Done`；否则返回 `Undo`。

```ts
const pre = source.Pre();
if (pre !== null && pre.Value === "*" && source.Value === "/") {
  this.SignOut(source);
  this.Undo(pre);
  this.TryToClose();
  this.Quit();
  return BranchStates.Done;
}
return BranchStates.Undo;
```

## method ToXmlString:()=>string

产出 XML：`<AreaAnnotation>注释正文</AreaAnnotation>`。标签名取运行时类型名；内容不做 XML 转义。

```ts
const name = this.constructor.name;
return `<${name}>${this.Tmp}</${name}>`;
```

## method Clone:()=>Token

克隆自身。顺序是 `Sign(this)` → 把 `Tmp` 追加到自身 → `TryToClose()`。

```ts
const result = new AreaAnnotation(this.Template);
result.Sign(this);
result.Tmp += this.Tmp;
result.TryToClose();
return result;
```
