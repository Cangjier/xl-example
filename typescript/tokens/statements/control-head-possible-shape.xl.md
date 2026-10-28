# dependencies
```xl
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { NumericLiteralShape } from "../literals/numeric-literal-shape.xl.md"
import { ShapePosition } from "../positions/shape-position.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { BracketRole } from "./bracket-role-resolver.xl.md"
import { BracketRoleCatalog } from "./bracket-role-resolver.xl.md"
import { BracketRoleResolver } from "./bracket-role-resolver.xl.md"
import { StatementRouteUtil } from "./statement-route-util.xl.md"
```

# namespace cangjie

# class ControlHeadScan

## field Host:Array<Token> | null = null

## field Keyword:string = ""

## field Enabled:bool = false

## field Atoms:int = 0

# class ControlHeadPossibleShape extends PossibleShape

## static field States:Array<ControlHeadScan> = []

## static field Atoms:Set<any> = new Set()

## static field CatalogRegistered:bool = false

## static field CreatePossibleShapesCache:Array<PossibleShape> | null = null

## static field Keywords:Array<string> = ["if", "for", "while", "switch", "with"]

## static field Reserved:Array<string> = ["new", "delete", "typeof", "void", "this", "super", "null", "true", "false", "function", "class", "async", "await", "yield", "in", "of", "instanceof", "import", "export", "let", "const", "var", "using", "static", "get", "set", "type", "declare", "abstract", "extends", "implements", "as", "satisfies", "keyof", "is", "infer", "asserts", "unique", "readonly", "namespace", "module", "enum", "interface"]

## static method Shapes:()=>Array<PossibleShape>

```ts
if (ControlHeadPossibleShape.CreatePossibleShapesCache === null) {
  ControlHeadPossibleShape.CreatePossibleShapesCache = [new ControlHeadPossibleShape()];
}
return ControlHeadPossibleShape.CreatePossibleShapesCache;
```

## static method EnsureRegistered:()=>void

```ts
if (ControlHeadPossibleShape.CatalogRegistered) {
  return;
}
ControlHeadPossibleShape.CatalogRegistered = true;
const catalog = new BracketRoleCatalog(BracketRole.ControlHead, ControlHeadPossibleShape.Shapes(), null);
catalog.FlushOnClose = true;
BracketRoleResolver.RegisterCatalog(catalog);
```

## static method ResetAtoms:()=>void

```ts
ControlHeadPossibleShape.Atoms = new Set();
ControlHeadPossibleShape.States = [];
```

## static method IsAtom:(unit:Token)=>bool

```ts
if (unit === null) {
  return false;
}
// [B3b:LEGACY] 这里**不**再读模式开关：原子只由 `ControlHeadPossibleShape.BuildByIndex`
// 写入，而目录只在 `SourceFileShape` 的增量装配点注册；干净 legacy 解析里登记表每次
// 构造器都被 `ResetAtoms()` 清空，`IsAtom` 恒为 `false`，本分支一个字节都不改。
// 反过来在这里读 `IsIncrementalShapesEnabled()` 是错的：整文件兜底
// （`ParseCore(shell=false)`）会把开关临时压 false，而兜底这一趟目录仍然挂着、原子照样建，
// 加了闸就变成「原子建了但没人消费」→ `ParsePrimary` 抛「不支持的表达式起点」
// （B3b 实测：`tts/run.mjs` PASS 429 → FAIL 20）。模式闸只加在装配套一处。
return ControlHeadPossibleShape.Atoms.has(unit);
```

## static method FindState:(units:Array<Token>)=>ControlHeadScan | null

```ts
for (const state of ControlHeadPossibleShape.States) {
  if (state.Host === units) {
    return state;
  }
}
return null;
```

## static method IsPlainIdentifier:(text:string)=>bool

```ts
if (text.length === 0) {
  return false;
}
const first = text.charAt(0);
if (!((first >= "a" && first <= "z") || (first >= "A" && first <= "Z")
  || first === "_" || first === "$")) {
  return false;
}
for (let at = 1; at < text.length; at++) {
  const ch = text.charAt(at);
  if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || (ch >= "0" && ch <= "9")
    || ch === "_" || ch === "$") {
    continue;
  }
  return false;
}
return true;
```

## static method FirstCode:(units:Array<Token>)=>Token | null

```ts
for (const unit of units) {
  if (!unit.IsTriviaToken) {
    return unit;
  }
}
return null;
```

## static method HeadKeyword:(bracket:Token)=>string

```ts
const parent = bracket.Parent;
if (parent === null) {
  return "";
}
const at = parent.Data.indexOf(bracket);
const from = at < 0 ? parent.Data.length - 1 : at - 1;
for (let index = from; index >= 0; index--) {
  const unit = parent.Data[index];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof Common) {
    return (unit as Common).TempToString();
  }
  return "";
}
return "";
```

## static method Decide:(bracket:Token)=>ControlHeadScan

```ts
const units = bracket.Data;
const known = ControlHeadPossibleShape.FindState(units);
if (known !== null) {
  return known;
}
const state = new ControlHeadScan();
state.Host = units;
state.Keyword = ControlHeadPossibleShape.HeadKeyword(bracket);
state.Enabled = false;
if (ControlHeadPossibleShape.Keywords.indexOf(state.Keyword) >= 0) {
  state.Enabled = true;
}
if (state.Enabled && state.Keyword === "for") {
  const first = ControlHeadPossibleShape.FirstCode(units);
  if (first !== null && first instanceof Common) {
    const text = (first as Common).TempToString();
    if (text === "let" || text === "const" || text === "var" || text === "using" || text === "await") {
      state.Enabled = false;
    }
  }
}
ControlHeadPossibleShape.States.push(state);
if (state.Enabled) {
  StatementRouteUtil.ControlHeadGuideCount += 1;
}
return state;
```

## static method IsMemberName:(unit:Token)=>bool

```ts
const parent = unit.Parent;
if (parent === null) {
  return false;
}
const at = parent.Data.indexOf(unit);
for (let index = at - 1; index >= 0; index--) {
  const previous = parent.Data[index];
  if (previous.IsTriviaToken) {
    continue;
  }
  if (!(previous instanceof Symbol)) {
    return false;
  }
  const text = (previous as Symbol).TempToString();
  return text === "." || text === "?.";
}
return false;
```

## static method AtomKind:(unit:Token)=>string

```ts
if (unit === null || unit.IsTriviaToken) {
  return "";
}
if (!(unit instanceof Common)) {
  return "";
}
const common = unit as Common;
if (StatementRouteUtil.EnableBracketCreatePossible && ControlHeadPossibleShape.IsMemberName(common)) {
  return "";
}
if (common.IsNumber()) {
  if (common.IsBigInt()) {
    return "";
  }
  return "number";
}
const text = common.TempToString();
if (StatementRouteUtil.IsLegacyKeyword(text)) {
  return "";
}
if (ControlHeadPossibleShape.Reserved.indexOf(text) >= 0) {
  return "";
}
if (!ControlHeadPossibleShape.IsPlainIdentifier(text)) {
  return "";
}
return "identifier";
```

## static method PosAt:(host:Token, units:Array<Token>, tokenIndex:int)=>int

```ts
return ShapePosition.PosAt(host, units, tokenIndex);
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
return ControlHeadPossibleShape.AtomKind(units[tokenIndex]) !== "";
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const token = host.Data[tokenIndex];
if (token === undefined) {
  return token;
}
const state = ControlHeadPossibleShape.Decide(host);
if (!state.Enabled) {
  return token;
}
const kind = ControlHeadPossibleShape.AtomKind(token);
if (kind === "") {
  return token;
}
const common = token as Common;
let built:ShapeToken;
if (kind === "number") {
  built = NumericLiteralShape.FromBasicToken(common, context);
} else {
  built = IdentifierShape.FromBasicToken(common, context);
}
built.Pos = ControlHeadPossibleShape.PosAt(host, host.Data, tokenIndex);
ControlHeadPossibleShape.Atoms.add(built);
state.Atoms += 1;
StatementRouteUtil.ControlHeadAtomCount += 1;
common.Replace(built);
return built;
```
