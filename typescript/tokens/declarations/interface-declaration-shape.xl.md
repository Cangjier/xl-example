# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { DeclareKeywordShape } from "../keywords/declare-keyword-shape.xl.md"
import { ExportKeywordShape } from "../keywords/export-keyword-shape.xl.md"
import { DecoratorShape } from "../types/decorator-shape.xl.md"
import { ExpressionBuilder } from "../expressions/expression-builder.xl.md"
import { HeritageClauseShape } from "../members/heritage-clause-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { TypeBuilder } from "../types/type-builder.xl.md"
import { AngleJudge } from "../types/angle-judge.xl.md"
import { CallSignaturePossibleShape } from "../types/call-signature-possible-shape.xl.md"
import { ConstructSignaturePossibleShape } from "../types/construct-signature-possible-shape.xl.md"
import { GetAccessorPossibleShape } from "../types/get-accessor-possible-shape.xl.md"
import { IndexSignaturePossibleShape } from "../types/index-signature-possible-shape.xl.md"
import { MethodSignaturePossibleShape } from "../types/method-signature-possible-shape.xl.md"
import { PropertySignaturePossibleShape } from "../types/property-signature-possible-shape.xl.md"
import { SetAccessorPossibleShape } from "../types/set-accessor-possible-shape.xl.md"
import { InterfaceDeclarationEndPossibleShape } from "./interface-declaration-end-possible-shape.xl.md"
```

# namespace cangjie

# class InterfaceDeclarationShape extends ShapeToken

```txt
interface I { a: number; }
interface I { a?: number; readonly b: string; }
interface I { m(): void; }
interface I { [k: string]: A; }
```

TS 的 children 顺序：名字 → 每个成员。成员就是**对象类型成员**的同一套语法
（PropertySignature / MethodSignature / IndexSignature / CallSignature / 可选的 readonly 修饰符），
所以这里直接复用 `TypeBuilder.ParseTypeMember()`：接口体 `Bracket.Data` 与类型字面量 `{…}` 的内容同口径，
成员区间（含其后的 `;` / `,`）与 `Pos` 都由 TypeBuilder 算好。

区间：从修饰符（没有就从 `interface`）的起点到 `}`；`Pos` 与名字 `Pos` 的口径同 ClassDeclarationShape。

## field NameToken:Token | null = null

## field DeclareKeyword:Token | null = null

## field HeritageClauses:Array<Token> = []

## field Members:Array<Token> = []

## field BodyBracket:Bracket | null = null

根层的接口声明是**提前挂载的壳**：`interface` 关键字关闭时 `InterfaceDeclarationPossibleShape` 就把本形状建出来、挂到父单元上；本形状随后吃名字 / 类型参数 / heritage / 接口体括号。拿到自己的接口体后，`Close` 之外由终结候选 `InterfaceDeclarationEndPossibleShape` 在接口体括号闭合时收口。

`BodyBracket` 记「已经认定的接口体括号」：`null` 表示还没认定。认定之后，**后续括号创建事件一律忽略**（接口体里的嵌套括号父级是接口体，不会回到本形状）。

## constructor:(template:Template)=>void

```ts
super(template);
```

## method OnBracketCreatedEvent:(bracket:Token, context:SyntaxContext)=>void

监听括号创建：如果新括号**肯定是接口体**，就把接口体目录向导装到这个括号上，并给自己装上终结向导（接口体括号关闭时由它收口）。

- 不是 `{`：不是接口体（类型参数 / heritage 里的 `(` / `[`）；
- 已经认定过接口体：忽略；
- 尖括号深度不为 0：是类型参数里的类型字面量，不是接口体；
- 前一个代码单元是 `extends` / `implements` / `,`：`{` 处在「类型从这里开始」的位置，是 heritage 里的类型字面量，不是接口体。

「肯定是 Body」就落在这里：只有上面四条都排除掉，才给括号初始化 `CatalogGuide`。**本形状自己的目录向导也在这一刻才装**——头部阶段不需要判候选，装早了只是一遍空转。

```ts
if (this.BodyBracket !== null) {
  return;
}
if (!(bracket instanceof Bracket)) {
  return;
}
if ((bracket as Bracket).StartBracketChar !== "{") {
  return;
}
if (!this.IsDefinitelyBodyBracket(bracket as Bracket)) {
  return;
}
const body = bracket as Bracket;
this.BodyBracket = body;
body.CatalogGuide = new CatalogGuide(InterfaceDeclarationShape.CreateBodyPossibleShapes());
this.CatalogGuide = new CatalogGuide([], new InterfaceDeclarationEndPossibleShape());
```

## method IsDefinitelyBodyBracket:(bracket:Bracket)=>bool

新括号已经在 `Data` 末尾；只看它前面的头部：尖括号深度回到 0，且最后一个代码单元不在「后面还能接类型字面量」的位置上。

尖括号用 `AngleJudge.ScanDepth` 数：`>>` / `>>>` 是 basic token 的合符号，必须按层拆开；深度夹在 0 以上。

```ts
let depth = 0;
let previous:Token | null = null;
for (const unit of this.Data) {
  if (unit === bracket) {
    continue;
  }
  if (unit.IsTriviaToken) {
    continue;
  }
  depth = AngleJudge.ScanDepth(unit, depth);
  previous = unit;
}
if (depth !== 0 || previous === null) {
  return false;
}
let text = "";
if (previous instanceof Common) {
  text = (previous as Common).TempToString();
} else if (previous instanceof Symbol) {
  text = (previous as Symbol).TempToString();
}
return text !== "extends" && text !== "implements" && text !== ",";
```

## private static field CreateBodyPossibleShapesCache:Array<PossibleShape> | null = null

## static method CreateBodyPossibleShapes:()=>Array<PossibleShape>

接口体括号的候选目录：接口体成员与类型字面量的对象类型成员同口径（属性 / 方法 / 索引 / 调用 / 构造签名 / get / set 访问器）。目录只建一份，所有接口体括号共用；判定状态在各自的 `CatalogGuide` 缓存里。

七类成员各有一个候选，`BuildFromCode` 收口时把括号 `Data` 里**已经建好的成员形状**按序收进 `Members`；仍留 raw basic token 的路径（导出 / 模块体 / 语句位置的 `FromUnits`、以及最后一个没来得及增量建出的成员）走 `BuildMembers` 兜底。

```ts
if (InterfaceDeclarationShape.CreateBodyPossibleShapesCache === null) {
  InterfaceDeclarationShape.CreateBodyPossibleShapesCache = [
    new PropertySignaturePossibleShape(),
    new MethodSignaturePossibleShape(),
    new IndexSignaturePossibleShape(),
    new CallSignaturePossibleShape(),
    new ConstructSignaturePossibleShape(),
    new GetAccessorPossibleShape(),
    new SetAccessorPossibleShape(),
  ];
}
return InterfaceDeclarationShape.CreateBodyPossibleShapesCache;
```

## static method FromUnits:(host:Token, start:int, tokenIndex:int, context:SyntaxContext)=>InterfaceDeclarationShape

```ts
const code:Array<Token> = [];
for (let at = start; at <= tokenIndex; at++) {
  if (!host.Data[at].IsTriviaToken) {
    code.push(host.Data[at]);
  }
}
let pos = 0;
for (let at = start - 1; at >= 0; at--) {
  if (!host.Data[at].IsTriviaToken) {
    const end = host.Data[at].SourceRange.End;
    if (end >= 0) {
      pos = end;
    }
    break;
  }
}
return InterfaceDeclarationShape.BuildFromCode(host, code, pos, context);
```

## static method BuildFromCode:(host:Token, code:Array<Token>, pos:int, context:SyntaxContext)=>InterfaceDeclarationShape

从「已经按 AST 顺序排好的非 trivia 代码单元」建接口声明。两个入口共用：`FromUnits`（导出 / 模块体 / 语句位置等一次性建形状）与本形状壳的收口（`InterfaceDeclarationEndPossibleShape` 把壳换成完整形状）。

`pos` 是第一个代码单元前一个非 trivia 单元的 `EndIndex`（没有就是 `0`），也是装饰器的区间起点。

```ts
const decoratorBase = pos;

const decorators:Array<Token> = [];
let decoratorEnd = decoratorBase;
let decoratorCount = 0;
while (decoratorCount < code.length
  && code[decoratorCount] instanceof Symbol && (code[decoratorCount] as Symbol).Is("@")) {
  const atUnit = code[decoratorCount];
  const decoratorPos = decoratorEnd;
  const expressionBase = atUnit.SourceRange.End < 0 ? decoratorPos : atUnit.SourceRange.EndIndex;
  let decoratorExpression:Token;
  {
    const builder = new ExpressionBuilder(host.Template, context);
    builder.Load(code.slice(decoratorCount + 1), expressionBase);
    if (builder.Units.length === 0) {
      throw new Error("decorator expression is empty");
    }
    decoratorExpression = builder.ParseExpression();
    if (builder.At === 0) {
      throw new Error("decorator expression was not read");
    }
    const consumed = builder.At;
    for (let cursor = decoratorCount + 1; cursor < decoratorCount + 1 + consumed; cursor++) {
      const cursorEnd = code[cursor].SourceRange.End;
      if (cursorEnd >= 0) {
        decoratorEnd = cursorEnd;
      }
    }
    decoratorCount += 1 + consumed;
  }
  decorators.push(DecoratorShape.FromParts(atUnit, decoratorExpression, decoratorPos, context));
}
let index = decoratorCount;
let exportUnit:Token | null = null;
if (index < code.length && code[index] instanceof Common && (code[index] as Common).Is("export")) {
  exportUnit = code[index];
  index++;
}
let declareUnit:Token | null = null;
if (index < code.length && code[index] instanceof Common && (code[index] as Common).Is("declare")) {
  declareUnit = code[index];
  index++;
}
if (index >= code.length) {
  throw new Error("接口声明不完整");
}
const keyword = code[index];
index++;
if (!(keyword instanceof Common) || !(keyword as Common).Is("interface")) {
  throw new Error("接口声明缺少 interface 关键字");
}
if (index >= code.length) {
  throw new Error("接口声明缺少名字");
}
const nameUnit = code[index];
index++;
if (!(nameUnit instanceof Common)) {
  throw new Error("接口声明的名字不是标识符");
}
if (index >= code.length) {
  throw new Error("接口声明缺少接口体");
}
let heritageBasePos = nameUnit.SourceRange.End < 0 ? 0 : nameUnit.SourceRange.EndIndex;
const typeParameters:Array<Token> = [];
if (index < code.length && code[index] instanceof Symbol && (code[index] as Symbol).Is("<")) {
  const typeParameterBuilder = new TypeBuilder(host.Template, context);
  typeParameterBuilder.LoadFrom(code, index, code.length, heritageBasePos);
  const parsedTypeParameters = typeParameterBuilder.ParseTypeParameterList();
  for (const parsedTypeParameter of parsedTypeParameters) {
    typeParameters.push(parsedTypeParameter);
  }
  // Load 会把 `>>` / `>>>` 拆成多个只含 `>` 的虚拟单元：At 是虚拟单元数，要按原 code 还原宽度
  // （`>>` 计 2、`>>>` 计 3）再映射回原始下标。
  let consumedUnits = 0;
  let mappedIndex = index;
  while (consumedUnits < typeParameterBuilder.At && mappedIndex < code.length) {
    const mappedUnit = code[mappedIndex];
    let width = 1;
    if (mappedUnit instanceof Symbol) {
      const mappedText = (mappedUnit as Symbol).TempToString();
      if (mappedText.length > 1) {
        let allClose = true;
        for (let ci = 0; ci < mappedText.length; ci++) {
          if (mappedText[ci] !== ">") {
            allClose = false;
            break;
          }
        }
        if (allClose) {
          width = mappedText.length;
        }
      }
    }
    consumedUnits += width;
    mappedIndex++;
  }
  index = mappedIndex;
  if (index > 0) {
    const lastTypeUnit = code[index - 1];
    const lastTypeEnd = lastTypeUnit.SourceRange.End;
    if (lastTypeEnd >= 0) {
      heritageBasePos = lastTypeEnd;
    }
  }
}
const heritageUnits:Array<Token> = code.slice(index, code.length - 1);
const bodyUnit = code[code.length - 1];
if (!(bodyUnit instanceof Bracket) || (bodyUnit as Bracket).StartBracketChar !== "{") {
  throw new Error("接口声明的接口体不是花括号");
}
const name = IdentifierShape.FromBasicToken(nameUnit as Common, context);
name.Pos = keyword.SourceRange.End < 0 ? pos : keyword.SourceRange.EndIndex;
const heritageBase = heritageBasePos;
const clauses:Array<Token> = heritageUnits.length === 0
  ? []
  : HeritageClauseShape.BuildClauses(host, heritageUnits, heritageBase, context);
const members = InterfaceDeclarationShape.CollectBodyMembers(host, bodyUnit as Bracket, context);
const shape = new InterfaceDeclarationShape(host.Template);
shape.NameToken = name;
shape.HeritageClauses = clauses;
shape.Members = members;
let modifierPos = decoratorCount === 0 ? pos : decoratorEnd;
for (const decorator of decorators) {
  shape.Add(decorator);
}
if (exportUnit !== null) {
  const exportModifier = new ExportKeywordShape(host.Template);
  exportModifier.SignInToken(exportUnit);
  exportModifier.SignOutToken(exportUnit);
  exportModifier.Pos = modifierPos;
  exportModifier.TryToClose(context);
  shape.Add(exportModifier);
  if (exportUnit.SourceRange.End >= 0) {
    modifierPos = exportUnit.SourceRange.EndIndex;
  }
}
if (declareUnit !== null) {
  const modifier = DeclareKeywordShape.FromBasicToken(declareUnit as Common, context);
  modifier.Pos = modifierPos;
  shape.DeclareKeyword = modifier;
  shape.Add(modifier);
}
shape.Add(name);
for (const typeParameter of typeParameters) {
  shape.Add(typeParameter);
}
for (const clause of clauses) {
  shape.Add(clause);
}
for (const member of members) {
  shape.Add(member);
}
if (decoratorCount > 0) {
  shape.SignInToken(code[0]);
} else if (exportUnit !== null) {
  shape.SignInToken(exportUnit);
} else if (declareUnit !== null) {
  shape.SignInToken(declareUnit);
} else {
  shape.SignInToken(keyword);
}
shape.SignOutToken(bodyUnit);
shape.Pos = pos;
shape.TryToClose(context);
return shape;
```

## static method BuildMembers:(host:Token, bracket:Bracket, context:SyntaxContext)=>Array<Token>

接口体成员逐个交给 `TypeBuilder.ParseTypeMember()`（`readonly` / 可选 `?` / 方法签名 / 索引签名 / 调用签名都覆盖）。

```ts
const members:Array<Token> = [];
const builder = new TypeBuilder(host.Template, context);
let base = 0;
if (bracket.SourceRange.Start >= 0) {
  base = bracket.SourceRange.StartIndex + 1;
}
builder.Load(bracket.Data, base);
while (builder.At < builder.Units.length) {
  members.push(builder.ParseTypeMember());
}
return members;
```

## static method CollectBodyMembers:(host:Token, bracket:Bracket, context:SyntaxContext)=>Array<Token>

收口时取接口体成员。两条路径必须产出同一棵 AST：

- 括号 `Data` 里**没有已建好的成员形状**（导出 / 模块体 / 语句位置的一次性构建）：整段还是 raw basic token，原样交给 `BuildMembers`，与重构前逐字一致；
- 已经由接口体 `CatalogGuide` 增量建出了成员形状：按序收集 `Members`，丢弃 trivia 与残留的 `;` / `,`；如果后面还留着一截没有增量建出的 raw 代码（例如最后一条成员在容器收口时才确定、或七类里还没有候选的类型），只用 `TypeBuilder` 解析这一截 raw 尾巴。

两种情况成员顺序都是源码顺序，成员形状都由同一个 `TypeBuilder.ParseTypeMember()` 建，区间口径不变。

```ts
// 单趟：按序收集已建成员，同时记住第一段 raw 代码的位置；成员次序即 XML 次序，不得改动。
const members:Array<Token> = [];
let hasBuiltMember = false;
let at = 0;
for (; at < bracket.Data.length; at++) {
  const unit = bracket.Data[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit.IsBasicToken) {
    if (unit instanceof Symbol && ((unit as Symbol).Is(";") || (unit as Symbol).Is(","))) {
      continue;
    }
    break;
  }
  hasBuiltMember = true;
  members.push(unit);
}
// raw 尾巴上可能还有已建成员（异常摆放时才出现）：补齐探测，保持「整段有无已建成员」的原判据。
if (at < bracket.Data.length) {
  for (let probe = at + 1; probe < bracket.Data.length; probe++) {
    const probeUnit = bracket.Data[probe];
    if (probeUnit.IsTriviaToken) {
      continue;
    }
    if (!probeUnit.IsBasicToken) {
      hasBuiltMember = true;
      break;
    }
  }
}
if (!hasBuiltMember) {
  return InterfaceDeclarationShape.BuildMembers(host, bracket, context);
}
if (at >= bracket.Data.length) {
  return members;
}
let base = 0;
if (bracket.SourceRange.Start >= 0) {
  base = bracket.SourceRange.StartIndex + 1;
}
for (let previous = at - 1; previous >= 0; previous--) {
  if (!bracket.Data[previous].IsTriviaToken) {
    const previousEnd = bracket.Data[previous].SourceRange.End;
    if (previousEnd >= 0) {
      base = previousEnd;
    }
    break;
  }
}
const builder = new TypeBuilder(host.Template, context);
builder.LoadFrom(bracket.Data, at, bracket.Data.length, base);
while (builder.At < builder.Units.length) {
  const codeUnit = builder.Units[builder.At];
  if (codeUnit.IsTriviaToken) {
    builder.At++;
    continue;
  }
  if (codeUnit instanceof Symbol && ((codeUnit as Symbol).Is(";") || (codeUnit as Symbol).Is(","))) {
    builder.At++;
    continue;
  }
  members.push(builder.ParseTypeMember());
}
return members;
```
