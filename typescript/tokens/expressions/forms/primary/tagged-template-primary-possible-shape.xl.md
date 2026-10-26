# dependencies
```xl
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../../../core/syntax/shape-token.xl.md"
import { String } from "../../../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { IncrementalItemPosition } from "../../numeric-literal-possible-shape.xl.md"
import { TaggedTemplateExpressionShape } from "../../tagged-template-expression-shape.xl.md"
import { ItemUtil } from "../../../item-util.xl.md"
import { TemplatePrimaryPossibleShape } from "./template-primary-possible-shape.xl.md"
import { PrimaryAtomGuard } from "./primary-atom-guard.xl.md"
```

# namespace cangjie

# class TaggedTemplatePrimaryPossibleShape extends PossibleShape

WP-A1：声明初始化器位置的**带标签模板**（`let x = tag`a``）。

legacy EOF 口径（`expr-probe` 实测）：

```text
TaggedTemplateExpressionShape  pos=7  src=[8,14)
├─ IdentifierShape  pos=7  src=[8,11)  text="tag"
└─ NoSubstitutionTemplateLiteralShape  pos=11  src=[11,14)  text="a"
```

建法：模板 `String` 单元关闭时，把**前一个代码单元**（此时已是 `IdentifierShape`）摘出来，与模板节点一起装进
`TaggedTemplateExpressionShape`，原位替换「标签 + 模板」两格（与二元候选的原位替换同一惯用法）。
模板节点由 `TemplatePrimaryPossibleShape.BuildTemplateNode` 建（与无标签模板同一份实现）。

**与无标签模板互斥**：`TemplatePrimaryPossibleShape` 在前一个代码单元是形状时 `Reject`，本候选接管。

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

```ts
shapes.push(new TaggedTemplatePrimaryPossibleShape());
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

判据：当前格是已关闭的模板 `String`，且前一个代码单元是**非 basic 形状**（标签表达式）。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
const start = ItemUtil.ItemStartCached(units, cache);
if (tokenIndex < start) {
  return ShapeStates.Reject;
}
if (unit instanceof Symbol) {
  if ((unit as Symbol).Is("=")) {
    return ShapeStates.Uncertain;
  }
  return ShapeStates.Reject;
}
if (!(unit instanceof String)) {
  return ShapeStates.Reject;
}
if (!(unit as String).IsSupportInterpolation) {
  return ShapeStates.Reject;
}
const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (previous < 0) {
  return ShapeStates.Reject;
}
if (units[previous].IsBasicToken) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

只对「初始化器 = 单个带标签模板」放行：**标签**必须是初始化器第一个代码单元（`PrimaryAtomGuard.IsInitializerStart`），
模板之后只剩收口（`IsTerminalAfter`）。这里不能直接用 `IsLoneAtom`——本格（模板）前面是标签形状，
按「前面必须是 `=`」会永远判否。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken || !(unit instanceof String)) {
  return false;
}
if (!(unit as String).IsSupportInterpolation) {
  return false;
}
const tagIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (tagIndex < 0 || units[tagIndex].IsBasicToken) {
  return false;
}
if (!PrimaryAtomGuard.IsInitializerStart(units, tagIndex)) {
  return false;
}
return PrimaryAtomGuard.IsTerminalAfter(unit, context, false);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const token = host.Data[tokenIndex];
if (!(token instanceof String)) {
  throw new Error("增量变量形状未支持：expression 带标签模板");
}
const previous = ItemUtil.PreviousCode(host.Data, tokenIndex - 1);
if (previous < 0 || host.Data[previous].IsBasicToken) {
  throw new Error("增量变量形状未支持：expression 带标签模板缺标签");
}
const tag = host.Data[previous];
if (!(tag instanceof ShapeToken)) {
  throw new Error("增量变量形状未支持：expression 带标签模板的标签不是形状");
}
const templatePos = IncrementalItemPosition.AfterPreviousCode(host.Data, tokenIndex);
const template = TemplatePrimaryPossibleShape.BuildTemplateNode(token as String, templatePos, context);
const tagged = new TaggedTemplateExpressionShape(host.Template);
tagged.Add(tag);
tagged.Add(template);
if (tag.SourceRange.StartIndex >= 0) {
  tagged.SignIn(tag.SourceRange.StartIndex);
}
if (template.SourceRange.EndIndex >= 0) {
  tagged.SignOut(template.SourceRange.EndIndex);
}
tagged.Pos = (tag as ShapeToken).Pos;
tagged.TryToClose(context);
host.Data.splice(tokenIndex, 1);
const tagIndex = host.Data.indexOf(tag);
if (tagIndex < 0) {
  throw new Error("增量变量形状未支持：expression 带标签模板的标签不在宿主里");
}
host.Data.splice(tagIndex, 1);
host.Data.splice(tagIndex, 0, tagged);
tagged.Parent = host;
if (host.MountedUnit === tag) {
  host.MountedUnit = tagged;
}
return tagged;
```
