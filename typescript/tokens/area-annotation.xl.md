# dependencies
```xl
import { Branch } from "../../core/syntax/branch.xl.md"
import { BranchConditionResult } from "../../core/syntax/branch-condition-result.xl.md"
import { BranchStates } from "../../core/syntax/branch-states.xl.md"
import { CommonUtil } from "../../core/common-util.xl.md"
import { Source } from "../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../core/syntax/syntax-context.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

区域注释 `/* … */`：从 `/*` 吃到 `*/`，正文攒进 `Tmp`。注释单元**留在树里、会进 XML**：原本负责把它从父单元 `Data` 里删掉的 `AreaAnnotation.CloseRule` 已经随 `../parse-pipeline.xl.md` 的 `GeneralCloseRule` 一起移除，所以产出里能看到 `<AreaAnnotation>正文</AreaAnnotation>`。

`AreaAnnotationBranch` 写在 `AreaAnnotation` **之前**：后者的静态字段 `JumpIn` 会在类定义时立即 `new AreaAnnotationBranch()`，写反了会命中 ts 的暂时性死区（TDZ）。

# class AreaAnnotationBranch extends Branch

它永远不进 `Data`、不进 XML。

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

判据：前一个字符是 `/`、它还能被回退（`unit.IsUndo`）、且当前字符是 `*`——也就是 `/*` 的开头。

`Pre()` 返回 `Source | null`，判定直接用它；判定结果不是 `bool` 而是 `BranchConditionResult`，所以展开成「建结果、赋 `Success`」两步。

```ts
const pre = source.Pre();
const result = new BranchConditionResult();
result.Success = pre !== null && pre.Value === "/" && unit.IsUndo(pre) && source.Value === "*";
return result;
```

## method Success:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

认下 `/*`：先回退已吃掉的那个 `/`（它归本单元所有），再挂一个新的 `AreaAnnotation` 并用同一个 `/` 签入。

取前一个字符两处都写 `source.Pre()!`——`Condition` 已经确认过它非空。

```ts
unit.Undo(source.Pre()!);
unit.AddToMounted(new AreaAnnotation(unit.Template)).SignIn(source.Pre()!);
```

# class AreaAnnotation extends UnitToken

区域注释单元。

单元值类型是单字符的 `string`。

它覆写了 `ToXmlString`（`<AreaAnnotation>正文</AreaAnnotation>`，内容过 `CommonUtil.XmlDecode`）；由于摘除注释的那个重组已经移除，这个覆写就是注释在 XML 里的最终形态。

## static readonly field JumpIn:AreaAnnotationBranch = new AreaAnnotationBranch()

把 `AreaAnnotationBranch` 注册进 `Root` 的通用跳转队列用的实例。

## constructor:(template:Template)=>void

以模板创建，并把本类型的跳转队列取出来；本类不设规则队列——原先靠通用规则队列把注释从 `Data` 里摘掉，那个重组已经移除，所以注释单元就这样留在父单元里。

取运行时类型用 `this.constructor`。

```ts
super(template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor, null);
```

## field Tmp:string = ""

注释正文。两个 `*` 都不在内：开头的 `*` 由 `Branch.Success` 消费掉却不回填（`Success` 只签入），结尾的 `*` 由 `ExitOrPre` 里的 `Undo` 从末尾删掉。摘除注释的重组已经移除，所以 `Tmp` 会原样进 XML。

`Tmp` 写成 `string`：它只被本类读写，没有被别处当容器用，所以拼接与截尾就是 `this.Tmp += c` 与 `this.Tmp.slice(0, this.Tmp.length - 1)`，换成字符串不失语义。

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

遇到 `*/` 就退出：前一个字符是 `*` 且当前字符是 `/` 时，签出到当前字符、把那个 `*` 回退掉（`*` 是结束标记，不该进正文）、关闭自己并跑重组、从父单元卸载，返回 `Done`；否则返回 `Undo`。

与 `LineAnnotation.ExitOrPre` 有一处**刻意的不对称**：这里**不插 `ReloadMessage`**——结束的 `/` 已经被吃掉且不再重处理。

`Pre()` 返回的是 `Source | null`，所以判定写成普通的 `pre !== null && pre.Value === "*"`。

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

产出 XML：`<AreaAnnotation>注释正文</AreaAnnotation>`。

标签名取 `this.constructor.name`；内容过 `CommonUtil.XmlDecode`——块注释同样是任意文本，
JSDoc 里的 `@type {Array<T>}` 这类写法必须转义，否则产物不是合法 XML（与 `LineAnnotation` 同一处理）。

```ts
const name = this.constructor.name;
return `<${name} range="${this.RangeOf()}">${CommonUtil.XmlDecode(this.Tmp)}</${name}>`;
```

## property value:any

`ToDictionary` 的 `value` 键**由这一页自己承担**（第 1018 轮）：值取这一页自己那一格事实。

### get

```ts
return this.Tmp;
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 把 `Tmp` 追加到自身 → `TryToClose()`。

```ts
const result = new AreaAnnotation(this.Template);
result.Sign(this);
result.Tmp += this.Tmp;
result.TryToClose();
return result;
```
