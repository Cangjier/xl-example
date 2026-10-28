# dependencies
```xl
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ArrayTypeShape } from "./array-type-shape.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { DotDotDotTokenShape } from "../punctuation/dot-dot-dot-token-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { ParameterShape } from "./parameter-shape.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { QuestionTokenShape } from "../punctuation/question-token-shape.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SourceRange } from "../../../core/syntax/source-range.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { TypeBuilder } from "./type-builder.xl.md"
import { ExpressionBuilder } from "../expressions/expression-builder.xl.md"
import { BracketRole } from "../statements/bracket-role-resolver.xl.md"
import { BracketRoleCatalog } from "../statements/bracket-role-resolver.xl.md"
import { BracketRoleResolver } from "../statements/bracket-role-resolver.xl.md"
import { BracketCatalogInstaller } from "../statements/bracket-catalog-installer.xl.md"
```

# namespace cangjie

# class ParameterScan

## field Host:Array<Token> = []

## field Bracket:Bracket | null = null

## field Open:Token | null = null

## field Opened:Array<Token> = []

## field Separator:int = -1

## field LastColonEnd:int = -1

## field PendingArray:ArrayTypeShape | null = null

## field Finalized:bool = false

## field FinalizeDone:bool = false

## field AllowQuestion:bool = false

# class ParameterListPossibleShape

## static field Enabled:bool = true

## static field MountCount:int = 0

## static field PromotedNameCount:int = 0

## static field SimpleRejectCount:int = 0

## static field LegacyFallbackCount:int = 0

## static field FinalizeCount:int = 0

## static field BuildActionCount:int = 0

## static field DefaultValueCount:int = 0

## static field States:Array<ParameterScan> = []

## private static field CatalogRegistered:bool = false

## private static field FunctionTypeCatalogRegistered:bool = false

## static field FunctionTypeMountCount:int = 0

## private static field CreatePossibleShapesCache:Array<PossibleShape> | null = null

## static method Shapes:()=>Array<PossibleShape>

```ts
if (ParameterListPossibleShape.CreatePossibleShapesCache === null) {
  ParameterListPossibleShape.CreatePossibleShapesCache = [new ParameterPossibleShape()];
}
return ParameterListPossibleShape.CreatePossibleShapesCache;
```

## static method EnsureRegistered:()=>void

```ts
if (ParameterListPossibleShape.CatalogRegistered) {
  return;
}
ParameterListPossibleShape.CatalogRegistered = true;
BracketRoleResolver.RegisterCatalog(
  new BracketRoleCatalog(BracketRole.ParameterList, ParameterListPossibleShape.Shapes(), null));
```

## static method EnsureRegisteredForFunctionType:()=>void

```ts
if (ParameterListPossibleShape.FunctionTypeCatalogRegistered) {
  return;
}
ParameterListPossibleShape.FunctionTypeCatalogRegistered = true;
BracketRoleResolver.RegisterCatalog(
  new BracketRoleCatalog(BracketRole.FunctionTypeParams, ParameterListPossibleShape.Shapes(), null));
```

## static method InstallForFunctionType:(bracket:Bracket)=>bool

```ts
if (!ParameterListPossibleShape.Enabled) {
  return false;
}
if (!BracketRoleResolver.IsSimpleFunctionTypeParams(bracket)) {
  return false;
}
const state = ParameterListPossibleShape.EnsureState(bracket.Data);
state.Bracket = bracket;
state.AllowQuestion = true;
ParameterListPossibleShape.FunctionTypeMountCount += 1;
return true;
```

## static method FindState:(units:Array<Token>)=>ParameterScan | null

```ts
for (const state of ParameterListPossibleShape.States) {
  if (state.Host === units) {
    return state;
  }
}
return null;
```

## static method EnsureState:(units:Array<Token>)=>ParameterScan

```ts
let state = ParameterListPossibleShape.FindState(units);
if (state === null) {
  state = new ParameterScan();
  state.Host = units;
  ParameterListPossibleShape.States.push(state);
}
return state;
```

## static method DropState:(units:Array<Token>)=>void

```ts
for (let at = ParameterListPossibleShape.States.length - 1; at >= 0; at--) {
  if (ParameterListPossibleShape.States[at].Host === units) {
    ParameterListPossibleShape.States.splice(at, 1);
  }
}
```

## static method TextBetween:(bracket:Bracket)=>string

```ts
const start = bracket.SourceRange.Start;
if (start < 0) {
  return "";
}
const document = bracket.SourceRange.Document;
if (document === null) {
  return "";
}
const count = document.GetCount();
const whole = SourceRange.Whole(document);
let text = "";
let at = start + 1;
while (at < count) {
  const ch = whole.At(at);
  if (ch === ")") {
    break;
  }
  if (ch === "{" || ch === "}" || ch === ";" || ch === "(") {
    return "";
  }
  text += ch;
  at++;
}
return text;
```

## static method IsSimpleParameter:(text:string)=>bool

```ts
const trimmed = text.trim();
if (trimmed === "") {
  return false;
}
return /^(\.\.\.)?\s*[A-Za-z_$][A-Za-z0-9_$]*\s*(:\s*[A-Za-z_$][A-Za-z0-9_$]*(\[\])*\s*)?$/.test(trimmed);
```

## static method IsSimpleList:(bracket:Bracket)=>bool

```ts
const text = ParameterListPossibleShape.TextBetween(bracket);
if (text === "") {
  return false;
}
const parts = text.split(",");
for (const part of parts) {
  if (!ParameterListPossibleShape.IsSimpleParameter(part)) {
    return false;
  }
}
return true;
```

## static method IsSimpleArrowList:(bracket:Bracket)=>bool

```ts
const data = bracket.Data;
let phase = 0;
let parameters = 0;
let defaultUnits = 0;
for (const unit of data) {
  if (unit.IsTriviaToken) {
    continue;
  }
  const isSymbol = unit instanceof Symbol;
  const text = isSymbol ? (unit as Symbol).TempToString() : "";
  if (phase === 0) {
    if (isSymbol && text === "...") {
      continue;
    }
    if (!(unit instanceof Common) || (unit as Common).CanStartNumber()) {
      // 解构 `{a}` / `[a]`、字符串、数字开头的参数名：都不是简单形参 ⇒ 整份交 legacy。
      return false;
    }
    phase = 1;
    parameters += 1;
    continue;
  }
  if (phase === 1) {
    if (isSymbol && text === ":") {
      phase = 2;
      continue;
    }
    if (isSymbol && text === "=") {
      phase = 3;
      defaultUnits = 0;
      continue;
    }
    if (isSymbol && text === ",") {
      phase = 0;
      continue;
    }
    return false;
  }
  if (phase === 2) {
    if (isSymbol && text === "=") {
      phase = 3;
      defaultUnits = 0;
      continue;
    }
    if (isSymbol && text === ",") {
      phase = 0;
      continue;
    }
    // 类型位只认「标识符 + 零或多个 `[]`」——与 `IsSimpleParameter` 的正则同一口径。
    if (unit instanceof Common) {
      continue;
    }
    if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "[") {
      continue;
    }
    return false;
  }
  // phase 3：默认值位。嵌套括号是一个单元，里面的 `,` 看不见；顶层的 `,` 才是下一个参数。
  if (isSymbol && text === ",") {
    phase = 0;
    continue;
  }
  if (isSymbol && (text === ";" || text === "=>" || text === ")")) {
    // 默认值里出现箭头 / 分号：交 legacy（`ExpressionBuilder.ParseAssign` 能读，但判据面先不放大）。
    return false;
  }
  defaultUnits += 1;
}
if (parameters === 0 || phase === 0) {
  // 空表 / 尾随 `,`：没东西可整份建。
  return false;
}
if (phase === 3 && defaultUnits === 0) {
  return false;
}
return true;
```

## static method DefaultValueEnd:(data:Array<Token>, at:int)=>int

```ts
for (let index = at + 1; index < data.length; index++) {
  const unit = data[index];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is(",")) {
    return index;
  }
}
return data.length;
```

## static method BuildDefaultValue:(data:Array<Token>, at:int, end:int, context:SyntaxContext)=>Token | null

```ts
if (end <= at + 1) {
  return null;
}
const unit = data[at];
let base = 0;
if (unit.SourceRange.EndIndex >= 0) {
  base = unit.SourceRange.EndIndex;
}
const builder = new ExpressionBuilder(unit.Template, context);
builder.Load(data.slice(at + 1, end), base);
let value:Token | null = null;
try {
  value = builder.ParseAssign();
} catch (error) {
  return null;
}
if (value === null) {
  return null;
}
if (builder.At !== builder.Units.length) {
  return null;
}
return value;
```

## static method CanBuildDefaults:(bracket:Bracket, context:SyntaxContext)=>bool

```ts
for (let at = 0; at < bracket.Data.length; at++) {
  const unit = bracket.Data[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (!(unit instanceof Symbol) || !(unit as Symbol).Is("=")) {
    continue;
  }
  const end = ParameterListPossibleShape.DefaultValueEnd(bracket.Data, at);
  if (ParameterListPossibleShape.BuildDefaultValue(bracket.Data, at, end, context) === null) {
    return false;
  }
}
return true;
```

## static method PreviousParamPos:(data:Array<Token>, at:int, bracket:Bracket, shell:ParameterShape | null)=>int

```ts
let pos = 0;
if (bracket.SourceRange.Start >= 0) {
  pos = bracket.SourceRange.StartIndex + 1;
}
if (shell !== null) {
  const last = shell.Last();
  if (last !== null && last.SourceRange.End >= 0) {
    // 壳里已有子单元：它才是「紧挨着本子节点的那个单元」（`...` / `:` 已被吃进壳，`Data` 里看不到）。
    return last.SourceRange.EndIndex;
  }
}
for (let back = at - 1; back >= 0; back--) {
  const unit = data[back];
  if (unit.IsTriviaToken || unit === shell) {
    continue;
  }
  if (unit.SourceRange.End >= 0) {
    pos = unit.SourceRange.EndIndex;
  }
  break;
}
return pos;
```

## static method NextChar:(last:SourceRange | null)=>string

```ts
if (last === null) {
  return "";
}
const document = last.Document;
if (document === null || last.EndIndex < 0) {
  return "";
}
const count = document.GetCount();
const whole = SourceRange.Whole(document);
let at = last.EndIndex;
while (at < count) {
  const ch = whole.At(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\v"
    || ch === "\f" || ch === "\u2028" || ch === "\u2029") {
    at++;
    continue;
  }
  return ch;
}
return "";
```

## static method IsTerminator:(ch:string)=>bool

```ts
return ch === "" || ch === ")" || ch === "," || ch === "]" || ch === ";";
```

## static method CloseShell:(state:ParameterScan, shell:ParameterShape, context:SyntaxContext)=>void

```ts
const last = shell.Last();
if (last !== null && last.SourceRange.End >= 0) {
  shell.SourceRange.End = last.SourceRange.End;
}
shell.TryToClose(context);
state.Open = null;
state.Finalized = true;
ParameterListPossibleShape.FinalizeCount += 1;
```

## static method Probe:(state:ParameterScan, units:Array<Token>, context:SyntaxContext | null)=>int

```ts
const data = units;
const bracket = state.Bracket;
if (bracket === null) {
  return 0;
}
let shell:ParameterShape | null = null;
if (state.Open !== null && state.Open instanceof ParameterShape) {
  shell = state.Open as ParameterShape;
}
if (shell === null) {
  let start = state.Separator + 1;
  while (start < data.length && data[start].IsTriviaToken) {
    start++;
  }
  if (start >= data.length) {
    return 0;
  }
  const first = data[start];
  if (first instanceof Symbol && (first as Symbol).Is(",")) {
    if (context === null) {
      return 7;
    }
    state.Separator = start;
    return 7;
  }
  if (context === null) {
    return 1;
  }
  const opened = new ParameterShape(first.Template);
  opened.Pos = ParameterListPossibleShape.PreviousParamPos(data, start, bracket, null);
  if (first.SourceRange.Start >= 0) {
    opened.SignIn(first.SourceRange.Start);
  }
  opened.Parent = bracket;
  data.splice(start, 0, opened);
  state.Open = opened;
  state.Opened.push(opened);
  ParameterListPossibleShape.BuildActionCount += 1;
  return 1;
}
const shellIndex = data.indexOf(shell);
if (shellIndex < 0) {
  return 0;
}
let at = shellIndex + 1;
while (at < data.length && data[at].IsTriviaToken) {
  at++;
}
if (at >= data.length) {
  return 0;
}
const unit = data[at];
// [B1b] 数组类型的第二格：`[` 已经包出 `ArrayTypeShape`（动作 6），这一格只等 `]` 闭合补终点。
// 未闭合期间只认这一只括号，别的词一个都不建（否则会重复包裹 / 把 `]` 前的内容再啃一遍）。
if (state.PendingArray !== null) {
  if (!(unit instanceof Bracket) || (unit as Bracket).StartBracketChar !== "["
    || !(unit as Bracket).Closed) {
    return 0;
  }
  if (context === null) {
    return 8;
  }
  const pending = state.PendingArray as ArrayTypeShape;
  const closing = unit as Bracket;
  if (pending.SourceRange.End < 0 && closing.SourceRange.End >= 0) {
    pending.SourceRange.End = closing.SourceRange.End;
  }
  pending.TryToClose(context);
  shell.Type = pending;
  state.PendingArray = null;
  data.splice(at, 1);
  ParameterListPossibleShape.BuildActionCount += 1;
  return 8;
}
if (unit instanceof Symbol && (unit as Symbol).Is(",")) {
  if (context === null) {
    return 7;
  }
  ParameterListPossibleShape.CloseShell(state, shell, context);
  state.Separator = at;
  ParameterListPossibleShape.BuildActionCount += 1;
  return 7;
}
if (unit instanceof Symbol && (unit as Symbol).Is(":")) {
  if (context === null) {
    return 4;
  }
  if (unit.SourceRange.End >= 0) {
    state.LastColonEnd = unit.SourceRange.EndIndex;
  }
  data.splice(at, 1);
  ParameterListPossibleShape.BuildActionCount += 1;
  return 4;
}
// [B4h] 可选形参 `?`（只给函数类型参数表：`type G = (b?: number) => …`）。
// `state.AllowQuestion` 为假时**不进这一支**——B1 的 function 形参表 / B4f 的箭头形参表读数逐字节不变。
// 位置 / 字段与 legacy `ParseParameter` 完全同口径：`QuestionToken.Pos = 名字的终点`（= `PreviousParamPos`），
// 区间只盖 `?` 一个字符，child 顺序是 Identifier → QuestionToken → Type。
if (unit instanceof Symbol && (unit as Symbol).Is("?") && state.AllowQuestion
  && shell.ParameterName !== null && shell.QuestionToken === null) {
  if (context === null) {
    return 10;
  }
  const question = new QuestionTokenShape(unit.Template);
  if (unit.SourceRange.Start >= 0) {
    question.SignIn(unit.SourceRange.StartIndex);
    question.SignOut(unit.SourceRange.StartIndex + 1);
  }
  question.Pos = ParameterListPossibleShape.PreviousParamPos(data, at, bracket, shell);
  question.TryToClose(context);
  shell.QuestionToken = question;
  shell.Add(question);
  question.Parent = shell;
  data.splice(at, 1);
  ParameterListPossibleShape.BuildActionCount += 1;
  return 10;
}
// [B4f] 默认值：`=` + 默认值表达式**逐字吃掉**（`(a: number, b = 1) =>` / `(a = {x:1}) =>`）。
// 默认值内部的对象 / 数组 / 括号是**一个已建括号单元**，所以这一层永远看不到它们里面的 `,`，
// 不可能被误当形参表的分隔；顶层 `,` 才是下一个参数（`DefaultValueEnd`）。
if (unit instanceof Symbol && (unit as Symbol).Is("=") && shell.ParameterName !== null) {
  if (context === null) {
    return 9;
  }
  const valueEnd = ParameterListPossibleShape.DefaultValueEnd(data, at);
  const value = ParameterListPossibleShape.BuildDefaultValue(data, at, valueEnd, context);
  if (value === null) {
    return 0;
  }
  shell.Add(value);
  value.Parent = shell;
  data.splice(at, valueEnd - at);
  ParameterListPossibleShape.DefaultValueCount += 1;
  ParameterListPossibleShape.BuildActionCount += 1;
  return 9;
}
if (unit instanceof Symbol && (unit as Symbol).Is("...") && shell.RestToken === null) {
  if (context === null) {
    return 2;
  }  const rest = new DotDotDotTokenShape(unit.Template);
  rest.SignInToken(unit);
  rest.SignOutToken(unit);
  rest.Pos = ParameterListPossibleShape.PreviousParamPos(data, at, bracket, shell);
  rest.TryToClose(context);
  shell.RestToken = rest;
  shell.Add(rest);
  rest.Parent = shell;
  data.splice(at, 1);
  ParameterListPossibleShape.BuildActionCount += 1;
  return 2;
}
if (unit instanceof Common && shell.ParameterName === null
  && (unit.Closed || ParameterListPossibleShape.IsTerminator(ParameterListPossibleShape.NextChar(unit.SourceRange)))) {
  if (context === null) {
    return 3;
  }
  const name = IdentifierShape.FromBasicToken(unit as Common, context);
  name.Pos = ParameterListPossibleShape.PreviousParamPos(data, at, bracket, shell);
  shell.ParameterName = name;
  shell.Add(name);
  name.Parent = shell;
  data.splice(at, 1);
  ParameterListPossibleShape.BuildActionCount += 1;
  return 3;
}
if (unit instanceof Common && shell.ParameterName !== null && shell.Type === null
  && (unit.Closed || ParameterListPossibleShape.IsTerminator(ParameterListPossibleShape.NextChar(unit.SourceRange)))) {
  if (context === null) {
    return 5;
  }
  const builder = new TypeBuilder(unit.Template, context);
  const basePos = state.LastColonEnd >= 0 ? state.LastColonEnd : 0;
  builder.Load([unit], basePos);
  const built = builder.ParseType();
  if (builder.At !== builder.Units.length) {
    return 0;
  }
  shell.Type = built;
  shell.Add(built);
  built.Parent = shell;
  data.splice(at, 1);
  ParameterListPossibleShape.BuildActionCount += 1;
  return 5;
}
if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "[" && shell.Type !== null) {
  const arrayBracket = unit as Bracket;
  const element = shell.Type as ShapeToken;
  // [B1b] `[` **创建格**就包壳：元素已经建好（`number` 在上一格成了 `NumberKeywordShape`），
  // `]` 那一格只补终点（动作 8）。目标：`ArrayTypeShape` / `NumberKeywordShape` 都在 26 格出现。
  if (!arrayBracket.Closed) {
    if (context === null) {
      return 6;
    }
    const openShape = new ArrayTypeShape(unit.Template);
    openShape.ElementType = element;
    openShape.Add(element);
    if (element.SourceRange.Start >= 0) {
      openShape.SignIn(element.SourceRange.StartIndex);
    }
    openShape.Pos = element.Pos;
    shell.Data.splice(shell.Data.indexOf(element), 1, openShape);
    openShape.Parent = shell;
    shell.Type = openShape;
    state.PendingArray = openShape;
    ParameterListPossibleShape.BuildActionCount += 1;
    return 6;
  }
  if (context === null) {
    return 6;
  }
  const arrayShape = new ArrayTypeShape(unit.Template);
  arrayShape.ElementType = element;
  arrayShape.Add(element);
  if (element.SourceRange.Start >= 0) {
    arrayShape.SignIn(element.SourceRange.StartIndex);
  }
  if (arrayBracket.SourceRange.End >= 0) {
    arrayShape.SignOut(arrayBracket.SourceRange.EndIndex);
  }
  arrayShape.Pos = element.Pos;
  arrayShape.TryToClose(context);
  shell.Data.splice(shell.Data.indexOf(element), 1, arrayShape);
  arrayShape.Parent = shell;
  shell.Type = arrayShape;
  data.splice(at, 1);
  ParameterListPossibleShape.BuildActionCount += 1;
  return 6;
}
return 0;
```

## static method Step:(state:ParameterScan, bracket:Bracket, context:SyntaxContext)=>bool

```ts
state.Bracket = bracket;
const action = ParameterListPossibleShape.Probe(state, bracket.Data, context);
return action !== 0;
```

## static method StepAtBracketCreated:(parent:Bracket, bracket:Bracket, context:SyntaxContext)=>void

```ts
if (!(bracket as Bracket).Is("[", "]")) {
  return;
}
const state = ParameterListPossibleShape.FindState(parent.Data);
if (state === null) {
  return;
}
state.Bracket = parent;
let guard = 0;
while (guard < 8 && ParameterListPossibleShape.Step(state, parent, context)) {
  guard++;
}
```

## static method NextActionFor:(state:ParameterScan, bracket:Bracket)=>int

```ts
state.Bracket = bracket;
return ParameterListPossibleShape.Probe(state, bracket.Data, null);
```

## static method Finalize:(host:Token, context:SyntaxContext)=>void

```ts
const data = host.Data;
let last = -1;
for (let at = data.length - 1; at >= 0; at--) {
  if (!data[at].IsTriviaToken) {
    last = at;
    break;
  }
}
if (last < 0) {
  return;
}
const unit = data[last];
if (!(unit instanceof Bracket) || (unit as Bracket).StartBracketChar !== "("
  || !(unit as Bracket).Closed) {
  return;
}
const bracket = unit as Bracket;
const state = ParameterListPossibleShape.FindState(bracket.Data);
if (state === null || state.FinalizeDone) {
  // [B4h] 幂等：`Finalize` 可能被同一只括号问到不止一次（括号关格之后它仍可能是宿主的末单元，
  // 注释 / `=>` 到达之前还会再算一格）。已经收过口就不再推进——再进一次 `Probe` 的
  // 「没有开壳」分支会为空壳另建一只 `ParameterShape`。
  // **不看 `Finalized`**：那个标志在第一个 `,` 收壳时就置真了（B1 的既有语义），
  // 拿它当「收口已做完」会让多参数函数声明最后一个参数永远建不出来。
  return;
}
state.Bracket = bracket;
let guard = 0;
while (guard < 64 && ParameterListPossibleShape.Step(state, bracket, context)) {
  guard++;
}
if (state.Open !== null && state.Open instanceof ParameterShape) {
  ParameterListPossibleShape.CloseShell(state, state.Open as ParameterShape, context);
}
state.FinalizeDone = true;
```

## static method CollectBuiltParameters:(bracket:Bracket)=>Array<Token> | null

```ts
const state = ParameterListPossibleShape.FindState(bracket.Data);
if (state === null || !state.Finalized) {
  return null;
}
const parameters:Array<Token> = [];
const residue:Array<Token> = [];
for (const unit of bracket.Data) {
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof ParameterShape) {
    parameters.push(unit);
    continue;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is(",")) {
    continue;
  }
  residue.push(unit);
}
if (parameters.length === 0 || residue.length !== 0) {
  return null;
}
ParameterListPossibleShape.DropState(bracket.Data);
return parameters;
```

## static method InstallIfSimple:(host:Token, bracket:Bracket, context:SyntaxContext)=>bool

```ts
if (!ParameterListPossibleShape.Enabled) {
  return false;
}
if (!ParameterListPossibleShape.IsSimpleList(bracket)) {
  ParameterListPossibleShape.SimpleRejectCount += 1;
  return false;
}
const state = ParameterListPossibleShape.EnsureState(bracket.Data);
state.Bracket = bracket;
ParameterListPossibleShape.MountCount += 1;
return true;
```

## static method InstallAtBracketCreated:(host:Token, bracket:Bracket, context:SyntaxContext)=>bool

```ts
if (!(bracket instanceof Bracket)) {
  return false;
}
const shape = bracket as Bracket;
if (shape.StartBracketChar === "[") {
  if (!(host instanceof Bracket)) {
    return false;
  }
  ParameterListPossibleShape.StepAtBracketCreated(host as Bracket, shape, context);
  return true;
}
if (shape.StartBracketChar !== "(") {
  return false;
}
ParameterListPossibleShape.EnsureRegistered();
const plan = BracketRoleResolver.Resolve(host, shape, context);
if (!plan.IsKnown() || plan.Role !== BracketRole.ParameterList) {
  return false;
}
BracketCatalogInstaller.Install(shape, plan, context);
return true;
```

# class ParameterPossibleShape extends PossibleShape

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const state = ParameterListPossibleShape.FindState(units);
if (state === null) {
  return false;
}
const bracket = state.Bracket;
if (bracket === null) {
  return false;
}
return ParameterListPossibleShape.NextActionFor(state, bracket) !== 0;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
if (!(host instanceof Bracket)) {
  return host;
}
const bracket = host as Bracket;
const state = ParameterListPossibleShape.EnsureState(bracket.Data);
state.Bracket = bracket;
let guard = 0;
while (guard < 64 && ParameterListPossibleShape.Step(state, bracket, context)) {
  guard++;
}
return host;
```
