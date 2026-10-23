# dependencies
```xl
import { BranchStates } from "../branch-states.xl.md"
import { CloseStates } from "../close-states.xl.md"
import { ComputePossibleShapesStates } from "../compute-possible-shapes-states.xl.md"
import { IComputePossibleShapes } from "../i-compute-possible-shapes.xl.md"
import { SourceRange } from "../source-range.xl.md"
import { SyntaxContext } from "../syntax-context.xl.md"
import { Token } from "../token.xl.md"
import { Template } from "../templates/template.xl.md"
import { UnitToken } from "../unit-token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

区域注释 `/* … */`：从 `/*` 吃到 `*/`，正文攒进 `Tmp`。注释单元留在树里、会进 XML，产出里能看到 `<AreaAnnotation>正文</AreaAnnotation>`。

# class AreaAnnotation extends UnitToken

区域注释单元。

单元值类型是单字符的 `string`。

覆写了 `ToXmlString`（`<AreaAnnotation>正文</AreaAnnotation>`，不转义），这是注释在 XML 里的最终形态。

## field IsBasicToken:bool = true

basic 单元：由 `Template.BasicBranchQueue()` 收出来。

## field IsAnnotationToken:bool = true

注释单元：`/* */` 是 trivia。

## field IsTriviaToken:bool = true

trivia 单元：判形状时跳过。

## constructor:(template:Template)=>void

以模板创建，并把本类型的跳转队列取出来；本类不设重组队列。

```ts
super(template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor, null);
```

## field Tmp:string = ""

注释正文，两个 `*` 都不在内：开头的 `*` 由 `Success` 消费掉，结尾的 `*` 由 `ExitOrPre` 回退掉。

## method Undo:(index:int)=>void

回退一个字符：覆盖 `index` 的子单元非空就转交给它，否则从 `Tmp` 末尾删掉一个字符。

```ts
const undoUnit = this.WhichUnitRangeContains(index);
if (undoUnit !== null) {
  undoUnit.Undo(index);
} else {
  this.Tmp = this.Tmp.slice(0, this.Tmp.length - 1);
}
```

## method IsUndo:(index:int)=>bool

能不能回退：范围已经签出（`SourceRange.End >= 0`）就不能；否则看覆盖 `index` 的子单元，没有子单元时返回 `true`。

```ts
if (this.SourceRange.End >= 0) {
  return false;
}
const undoUnit = this.WhichUnitRangeContains(index);
if (undoUnit !== null) {
  return undoUnit.IsUndo(index);
}
return true;
```

## protected method Close:(context:SyntaxContext)=>CloseStates

关闭：只把自己标记为已关闭，然后**只问父单元**要不要重算候选——父单元没实现 `IComputePossibleShapes` 就不问，也不再往上找。

父单元是不是宿主由它自己的 `CatalogGuide` 说了算：为空就等于没挂向导，被问到也不做任何事。

重算的返回值原样带上去：建出了形状时，正在收尾的这个 token 要让当前字符重放。

```ts
this.Closed = true;
const parent = this.Parent;
if (parent !== null && "ComputePossibleShapes" in parent) {
  const state = (parent as unknown as IComputePossibleShapes).ComputePossibleShapes(context);
  if (state === ComputePossibleShapesStates.Built) {
    return CloseStates.Built;
  }
}
return CloseStates.Nothing;
```

## protected method Default:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

跳转队列没接手时，把字符并进 `Tmp`。

```ts
this.Tmp += buffer.At(index);
```

## protected method ExitOrPre:(context:SyntaxContext, buffer:SourceRange, index:int)=>BranchStates

遇到 `*/` 就退出：前一个字符是 `*` 且当前字符是 `/` 时，签出到当前字符之后、把那个 `*` 回退掉、关闭自己并跑重组、从父单元卸载，返回 `Done`；否则返回 `Undo`。

前一个字符可能落在上一个窗口（`*` 在窗口末尾、`/` 在下一个窗口开头），所以窗口内取不到时要经 `SourceRange.Whole(buffer.Document!)` 取。

```ts
const preIndex = index - 1;
let pre: string | null = null;
if (preIndex >= 0) {
  pre = buffer.Has(preIndex) ? buffer.At(preIndex) : SourceRange.Whole(buffer.Document!).At(preIndex);
}
if (pre === "*" && buffer.At(index) === "/") {
  this.SignOut(index + 1);
  this.Undo(preIndex);
  this.TryToClose(context);
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

## static method Transit:(context:SyntaxContext, unit:Token, buffer:SourceRange, index:int, value:string)=>BranchStates

判据：前一个字符是 `/`、它还能被回退（`unit.IsUndo`）、且当前字符是 `*`。

认下就回退已吃掉的那个 `/`（它归本单元所有），再挂一个新的 `AreaAnnotation` 并用同一个 `/` 签入；挂的时候若关闭上一个 token 建出了形状，返回 `Reload`。

前一个字符可能在上一个窗口，窗口内取不到时经 `SourceRange.Whole(buffer.Document!)` 取。

```ts
const preIndex = index - 1;
if (preIndex < 0) {
  return BranchStates.Undo;
}
const pre = buffer.Has(preIndex) ? buffer.At(preIndex) : SourceRange.Whole(buffer.Document!).At(preIndex);
if (pre !== "/" || !unit.IsUndo(preIndex) || value !== "*") {
  return BranchStates.Undo;
}
unit.Undo(preIndex);
const lastOfMounted = unit.Last();
if (lastOfMounted !== null && !lastOfMounted.Closed && lastOfMounted.TryToClose(context) === CloseStates.Built) {
  return BranchStates.Reload;
}
const mounted = new AreaAnnotation(unit.Template);
unit.Add(mounted);
unit.MountedUnit = mounted;
(unit.MountedUnit as AreaAnnotation)!.SignIn(preIndex);
return BranchStates.Done;
```
