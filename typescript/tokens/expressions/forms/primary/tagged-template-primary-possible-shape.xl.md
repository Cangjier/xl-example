# dependencies
```xl
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../../../core/syntax/shape-token.xl.md"
import { String } from "../../../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { IncrementalItemPosition } from "../../numeric-literal-possible-shape.xl.md"
import { TaggedTemplateExpressionShape } from "../../tagged-template-expression-shape.xl.md"
import { ItemUtil } from "../../../item-util.xl.md"
import { ExpressionAtomRegistry } from "../shared/expression-atom-registry.xl.md"
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

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

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
// [R15:NESTED-TAG] `allowTemplate`：模板后面紧跟**另一个反引号**时，本模板是下一条模板的**标签**，
// 不是这条初始化器的收口格（`` a`x``x` `` 在 TS 里是 `TaggedTemplate(TaggedTemplate(a, x), x)`）。
// 判据不新写：`IsTerminalAfter` 本来就有一个 `allowTemplate` 档（标识符候选开它就是为了 `` a`x` `` 里的
// `a`），这里把同一档开到模板候选上——`IsBuildable` 的另两道闸门（初始化器首格 + 标签非 basic）不变。
//
// `MemberFollows` 是同一条判据的第二个入口：模板之后**紧跟 `.`** 时它不是收口格，但整条标签模板
// 已经是一个完整的操作数（TS：`a`x`.b` 是 `PropertyAccess(TaggedTemplate, b)`）。收口格会把它当
// 「已建根」原子重建（`FinishIncremental` → `ExpressionBuilder.ParsePrimary` 的 `HasNode` 分支），
// `.b` 由 legacy 的成员访问面接在它后面。不建的话根会停在 `IdentifierShape(a)`，
// 模板 `String` + `.` + `b` 就整段被静默清掉（R8 #18 的 12 个节点）。
return PrimaryAtomGuard.IsTerminalAfter(unit, context, true)
  || TaggedTemplatePrimaryPossibleShape.MemberFollows(unit, context);
```

## static method MemberFollows:(unit:Token, context:SyntaxContext)=>bool

`unit`（一条已关闭的模板）之后第一个显著字符是不是成员访问的 `.`。

只做**字符级**前瞻，口径与 `PrimaryAtomGuard.IsTerminalAfter` 的空白跳过完全一致（不跳注释：
`IsTerminalAfter` 同样不跳，保持一致），所以两条判据不会对同一段源码给出互相矛盾的答案。
文档不可用（探针）时答 `false`：保守，交下一次收口。

```ts
const document = context.CurrentDocument;
if (document === null) {
  return false;
}
const end = unit.SourceRange.EndIndex;
if (end < 0) {
  return false;
}
const count = document.GetCount();
let at = end;
while (at < count) {
  const ch = document.GetRaw(at, at + 1);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\u2028" || ch === "\u2029") {
    at += 1;
    continue;
  }
  return ch === ".";
}
return false;
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
// [R15:NESTED-TAG] 登记身份：收口格（`FinishIncremental`）在「根之后还有 `.b`」这一族上会把整条
// 初始化器交给 `ExpressionBuilder` 原子重建，`ParsePrimary` 只有认得出这个已建好的根才会当操作数
// 收下再继续接 `.b`；不登记就会退化成「初始化器多根」/静默截断。
ExpressionAtomRegistry.RegisterNode(tagged);
return tagged;
```
