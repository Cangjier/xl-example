# dependencies
```xl
import { Bracket } from "../../../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { ExpressionBuilder } from "../../expression-builder.xl.md"
import { BracketRole } from "../../../statements/bracket-role-resolver.xl.md"
import { BracketRoleState } from "../../../statements/bracket-role-resolver.xl.md"
import { StatementRouteUtil } from "../../../statements/statement-route-util.xl.md"
import { ExpressionAtomRegistry } from "./expression-atom-registry.xl.md"
```

# namespace cangjie

# class ContainerShapeCatalog

## static field BuildCount:int = 0

## static field RefusedCount:int = 0

## static field AlreadyConsumedCount:int = 0

## static method IsExpressionRole:(role:string)=>bool

```ts
return role === BracketRole.ObjectLiteral || role === BracketRole.ArrayLiteral
  || role === BracketRole.CallArgs || role === BracketRole.ParenExpression;
```

## static method ArrowAhead:(bracket:Bracket)=>bool

```ts
const text = ContainerShapeCatalog.NextCodeText(bracket, 2);
if (text === "") {
  return false;
}
return text === "=>" || text[0] === ":";
```

## static method NextCodeText:(bracket:Bracket, length:int)=>string

```ts
const range = bracket.SourceRange;
if (range.Document === null || range.End < 0) {
  return "";
}
let at = range.End;
const count = range.Document.GetCount();
while (at < count) {
  const ch = range.Document.GetValue(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
    at++;
    continue;
  }
  if (ch === "/" && at + 1 < count) {
    const next = range.Document.GetValue(at + 1);
    if (next === "/") {
      at += 2;
      while (at < count && range.Document.GetValue(at) !== "\n") {
        at++;
      }
      continue;
    }
    if (next === "*") {
      at += 2;
      while (at + 1 < count) {
        if (range.Document.GetValue(at) === "*" && range.Document.GetValue(at + 1) === "/") {
          at += 2;
          break;
        }
        at++;
      }
      continue;
    }
  }
  break;
}
let text = "";
for (let index = at; index < count && text.length < length; index++) {
  text += range.Document.GetValue(index);
}
return text;
```

## static method SequelAllowsBuild:(bracket:Bracket)=>bool

```ts
const head = ContainerShapeCatalog.NextCodeText(bracket, 1);
if (head === "<" || head === "`") {
  return false;
}
return true;
```

## static method RoleMatchesBracket:(bracket:Bracket, role:string)=>bool

```ts
if (role === BracketRole.ObjectLiteral) {
  return bracket.StartBracketChar === "{";
}
if (role === BracketRole.ArrayLiteral) {
  return bracket.StartBracketChar === "[";
}
if (role === BracketRole.CallArgs || role === BracketRole.ParenExpression) {
  return bracket.StartBracketChar === "(";
}
return false;
```

## static method InsideArrowTail:(units:Array<Token>, at:int)=>bool

```ts
for (let index = at - 1; index >= 0; index--) {
  const unit = units[index];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is("=>")) {
    return true;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is("=")) {
    return false;
  }
}
return false;
```

## static method InsideNewExpression:(units:Array<Token>, at:int)=>bool

```ts
for (let index = at - 1; index >= 0; index--) {
  const unit = units[index];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof Symbol) {
    const text = (unit as Symbol).TempToString();
    if (text === "=" || text === ";" || text === ",") {
      return false;
    }
  }
  if (unit instanceof Common && (unit as Common).TempToString() === "new") {
    return true;
  }
}
return false;
```

## static method PreviousCodeIndex:(units:Array<Token>, tokenIndex:int)=>int

```ts
for (let index = tokenIndex - 1; index >= 0; index--) {
  if (!units[index].IsTriviaToken) {
    return index;
  }
}
return -1;
```

## static method SymbolText:(unit:Token)=>string

```ts
if (unit instanceof Symbol) {
  return (unit as Symbol).TempToString();
}
return "";
```

## static method BasePos:(bracket:Bracket, units:Array<Token>, at:int)=>int

```ts
const previous = ContainerShapeCatalog.PreviousCodeIndex(units, at);
if (previous >= 0) {
  if (units[previous].SourceRange.EndIndex >= 0) {
    return units[previous].SourceRange.EndIndex;
  }
  if (units[previous].SourceRange.StartIndex >= 0) {
    return units[previous].SourceRange.StartIndex;
  }
  return -1;
}
const parent = bracket.Parent;
if (parent !== null && parent instanceof Bracket) {
  if ((parent as Bracket).SourceRange.StartIndex >= 0) {
    return (parent as Bracket).SourceRange.StartIndex + 1;
  }
  return -1;
}
if (parent !== null && parent instanceof ShapeToken) {
  const pos = (parent as ShapeToken).Pos;
  if (pos >= 0) {
    return pos;
  }
}
if (bracket.SourceRange.StartIndex >= 0) {
  return bracket.SourceRange.StartIndex;
}
return -1;
```

## static method CalleeStart:(units:Array<Token>, bracketIndex:int)=>int

```ts
let start = ContainerShapeCatalog.PreviousCodeIndex(units, bracketIndex);
if (start < 0) {
  return -1;
}
const mark = ContainerShapeCatalog.SymbolText(units[start]);
if (mark === ">" || mark === "?." || mark === "??") {
  return -1;
}
while (true) {
  const before = ContainerShapeCatalog.PreviousCodeIndex(units, start);
  if (before < 0) {
    break;
  }
  const beforeMark = ContainerShapeCatalog.SymbolText(units[before]);
  if (beforeMark !== "." && beforeMark !== "?.") {
    break;
  }
  const nameAt = ContainerShapeCatalog.PreviousCodeIndex(units, before);
  if (nameAt < 0) {
    break;
  }
  start = nameAt;
}
const beforeStart = ContainerShapeCatalog.PreviousCodeIndex(units, start);
if (beforeStart >= 0) {
  const head = units[beforeStart];
  if (head instanceof Common && (head as Common).TempToString() === "new") {
    return -1;
  }
}
return start;
```

## static method IsPostfixBracketPosition:(bracket:Bracket, units:Array<Token>, at:int)=>bool

```ts
if (at <= 0) {
  return false;
}
const previous = ContainerShapeCatalog.PreviousCodeIndex(units, at);
if (previous < 0) {
  return false;
}
const before = units[previous];
if (ExpressionAtomRegistry.HasContainer(before)) {
  return true;
}
return bracket.Template.RegexTemplate.IsOperandEnd(before);
```

## static method IsSafeHost:(host:Token)=>bool

```ts
if (host instanceof Bracket) {
  return false;
}
return host.constructor.name === "VariableDeclarationShape";
```

# class ContainerClosePossibleShape extends PossibleShape

```
Bracket.Close
  → 自己的 FlushOnClose（Close 来源）
  → parent.ComputePossibleShapes(Close)        ← 父候选先手（A4 / A4b / P1 / P4 …）
      → VariableDeclarationShape.ComputePossibleShapes 内部：
          super.ComputePossibleShapes(...)      ← 既有目录，父候选该建什么建什么
          this.ContainerCloseGuide.ComputePossibleShapes(this, Close)
              → ContainerClosePossibleShape.ComputeByIndex   ← 只认「关闭拍 + 可建的位置」
              → ContainerClosePossibleShape.IsBuildable
              → ContainerClosePossibleShape.BuildByIndex    ← ExpressionBuilder 建容器并原位顶替
```

## static method NormalizeRole:(shape:Bracket)=>string

```ts
let role = shape.Role;
if (shape.RoleState === BracketRoleState.Deferred && role === BracketRole.ArrowParams) {
  // [B4e:K1] **Deferred `ArrowParams` 的分组那一半**：初始化器 / 元素位 / 实参位的 `(` 在创建格
  // 分不出「分组」与「箭头形参表」，B4b 因此登记 Deferred（`_reports/B4b.md` §5.2）。关闭格是
  // **最后一次**能分开的时机：`ArrowAhead` 为假 ⇒ 分组括号；为真 ⇒ 原样让给 B4d 的 replay。
  if (ContainerShapeCatalog.ArrowAhead(shape)) {
    return "";
  }
  role = BracketRole.ParenExpression;
} else if (shape.RoleState !== BracketRoleState.Known) {
  return "";
}
if (!ContainerShapeCatalog.IsExpressionRole(role)) {
  return "";
}
return role;
```

## static method CanBuild:(shape:Bracket, units:Array<Token>)=>bool

```ts
if (!StatementRouteUtil.EnableContainerShape) {
  return false;
}
if (!StatementRouteUtil.IsIncrementalShapesEnabled()) {
  return false;
}
if (!shape.Closed) {
  return false;
}
const role = ContainerClosePossibleShape.NormalizeRole(shape);
if (role === "") {
  return false;
}
const parent = shape.Parent;
if (parent === null) {
  return false;
}
// 宿主白名单：只有 `VariableDeclarationShape`（本候选只挂在它身上，这里再判一次是防御）。
if (!ContainerShapeCatalog.IsSafeHost(parent)) {
  return false;
}
const at = units.indexOf(shape);
// 父单元先手：A4 / A4b / P1 / P4 已经在关闭那一拍把括号换成自己的形状。
if (at < 0) {
  return false;
}
// [B4i] 三条位置闸：角色与括号字符自洽 / `(` 后是 `=>` / 闭括号后是 `<` 或反引号。
if (!ContainerShapeCatalog.RoleMatchesBracket(shape, role)) {
  return false;
}
if (shape.StartBracketChar === "(" && ContainerShapeCatalog.ArrowAhead(shape)) {
  return false;
}
if (!ContainerShapeCatalog.SequelAllowsBuild(shape)) {
  return false;
}
// [B4i:POSTFIX-INDEX] `[` 在前一个操作数之后是下标访问，不是数组字面量。
if (role === BracketRole.ArrayLiteral && ContainerShapeCatalog.IsPostfixBracketPosition(shape, units, at)) {
  return false;
}
// [B4i:ARROW-TAIL] 已经在箭头体 / 箭头表达式内部：整条 arrow 归 legacy 的原子建树。
if (ContainerShapeCatalog.InsideArrowTail(units, at)) {
  return false;
}
// [B4i:NEW-CALLEE] `new` 构造的 callee / 参数链归 `NewExpression`。
if (role === BracketRole.CallArgs && ContainerShapeCatalog.InsideNewExpression(units, at)) {
  return false;
}
if (ContainerShapeCatalog.BasePos(shape, units, at) < 0) {
  return false;
}
if (role === BracketRole.CallArgs && ContainerShapeCatalog.CalleeStart(units, at) < 0) {
  return false;
}
return true;
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
// 先清标记：同一份缓存在本目录里只服务本候选，`Reset()` 之后自然也是 false。
cache.SetState(this.Slot(), false);
if (source !== PossibleSource.Close) {
  return ShapeStates.Uncertain;
}
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (!(unit instanceof Bracket)) {
  return ShapeStates.Uncertain;
}
const shape = unit as Bracket;
if (!shape.Closed) {
  return ShapeStates.Uncertain;
}
if (!ContainerClosePossibleShape.CanBuild(shape, units)) {
  return ShapeStates.Uncertain;
}
cache.SetState(this.Slot(), true);
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return cache.GetState<boolean>(this.Slot()) === true;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
if (!(host instanceof ShapeToken)) {
  return host;
}
const parent = host;
const units = parent.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  ContainerShapeCatalog.RefusedCount += 1;
  return host;
}
const current = units[tokenIndex];
if (!(current instanceof Bracket)) {
  ContainerShapeCatalog.RefusedCount += 1;
  return host;
}
const shape = current as Bracket;
if (!ContainerClosePossibleShape.CanBuild(shape, units)) {
  return host;
}
const role = ContainerClosePossibleShape.NormalizeRole(shape);
if (role === "") {
  return host;
}
const at = units.indexOf(shape);
const basePos = ContainerShapeCatalog.BasePos(shape, units, at);
if (basePos < 0) {
  ContainerShapeCatalog.RefusedCount += 1;
  return host;
}
const builder = new ExpressionBuilder(shape.Template, context);
builder.Load(units, basePos);
const index = builder.Units.indexOf(shape);
if (index < 0) {
  ContainerShapeCatalog.RefusedCount += 1;
  return host;
}
let start = index;
if (role === BracketRole.CallArgs) {
  start = ContainerShapeCatalog.CalleeStart(builder.Units, index);
  if (start < 0) {
    ContainerShapeCatalog.RefusedCount += 1;
    return host;
  }
}
builder.At = start;
let built:Token | null = null;
try {
  if (role === BracketRole.CallArgs) {
    built = builder.ParsePostfix();
  } else {
    built = builder.ParsePrimary();
  }
} catch (error) {
  ContainerShapeCatalog.RefusedCount += 1;
  return host;
}
if (built === null || builder.At !== index + 1) {
  ContainerShapeCatalog.RefusedCount += 1;
  return host;
}
if (built === shape || built.IsBasicToken) {
  ContainerShapeCatalog.RefusedCount += 1;
  return host;
}
const slot = units.indexOf(builder.Units[start]);
if (slot < 0 || slot > at) {
  ContainerShapeCatalog.RefusedCount += 1;
  return host;
}
ExpressionAtomRegistry.RegisterContainer(built);
built.Parent = parent;
if (parent.MountedUnit === shape) {
  parent.MountedUnit = built;
}
units.splice(slot, at - slot + 1, built);
ContainerShapeCatalog.BuildCount += 1;
StatementRouteUtil.ContainerShapeBuildCount += 1;
return built;
```
