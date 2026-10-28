# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { ArrayBindingPatternShape } from "../bindings/array-binding-pattern-shape.xl.md"
import { ObjectBindingPatternShape } from "../bindings/object-binding-pattern-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { DeclareKeywordShape } from "../keywords/declare-keyword-shape.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { StatementRouteUtil } from "../statements/statement-route-util.xl.md"
import { VariableStatementShape } from "../statements/variable-statement-shape.xl.md"
import { IncrementalVariableDeclarationListBuilder, VariableDeclarationListEndPossibleShape } from "./variable-declaration-list-possible-shape.xl.md"
import { VariableDeclarationListShape } from "./variable-declaration-list-shape.xl.md"
import { VariableDeclarationShape } from "./variable-declaration-shape.xl.md"
```

# namespace cangjie

# class IncrementalVariableStatementBuilder

## static method Build:(host:Token, tokenIndex:int, context:SyntaxContext, declared?:bool)=>Token

```ts
const data = host.Data;
const start = ItemUtil.ItemStart(data);
if (start > tokenIndex) {
  throw new Error("增量变量形状未支持：statement 没有可搬的单元");
}
const moved:Array<Token> = data.slice(start, tokenIndex + 1);
let headAt = ItemUtil.NextCode(moved, 0);
if (headAt >= moved.length) {
  throw new Error("增量变量形状未支持：statement 缺少声明关键字");
}
// [A2-D3] ambient 变量声明（`declare const|let|var …`）：`declare` 是修饰词，不是三层之一的头。
// 先跳过它再取声明关键字；`declare` 自己单独建 `DeclareKeywordShape` 挂到语句最前（legacy
// `StatementBuilder.BuildDeclareVariableStatement` 的同一形状、同一 `Pos`）。
// 旧调用点（`VariableStatementPossibleShape`）不传 `declared`，下面整段不执行，逐字节不变。
let declareAt = -1;
let declareEnd = -1;
if (declared === true) {
  const prefix = moved[headAt];
  if (!(prefix instanceof Common) || (prefix as Common).TempToString() !== "declare") {
    throw new Error("增量变量形状未支持：statement 缺少 declare 前缀");
  }
  const prefixEnd = prefix.SourceRange.EndIndex;
  declareAt = headAt;
  declareEnd = prefixEnd >= 0 ? prefixEnd : prefix.SourceRange.StartIndex + 7;
  headAt = ItemUtil.NextCode(moved, headAt + 1);
  if (headAt >= moved.length) {
    throw new Error("增量变量形状未支持：statement declare 缺少变量关键字");
  }
}
const head = moved[headAt];
if (!(head instanceof Common)) {
  throw new Error("增量变量形状未支持：statement 声明关键字");
}
const headText = (head as Common).TempToString();
if (headText !== "let" && headText !== "const" && headText !== "var") {
  throw new Error("增量变量形状未支持：statement " + headText);
}
const bindingAt = ItemUtil.NextCode(moved, headAt + 1);
if (bindingAt >= moved.length) {
  throw new Error("增量变量形状未支持：statement 缺少绑定");
}
const binding = moved[bindingAt];
// WP-A6b：绑定位允许「单个标识符」或「解构括号」；解构整棵绑定模式在这里一次建出（括号已闭合）。
let pattern:Token | null = null;
if (binding instanceof Common) {
  const bindingText = (binding as Common).TempToString();
  // [A2-D3] `declare const enum E {}` 归 enum 声明族，不进变量三层；本候选在 `Owns` 里已经排除该形态，
  // 这一条只是 C10 的最后一道显式拒绝（非 declare 的 `const enum` 仍是原有的 throw）。
  if (declared !== true && headText === "const" && bindingText === "enum") {
    throw new Error("增量变量形状未支持：statement const enum");
  }
} else if (binding instanceof Bracket) {
  const bracket = binding as Bracket;
  if (bracket.StartBracketChar === "[") {
    pattern = ArrayBindingPatternShape.FromBracket(bracket, context);
  } else if (bracket.StartBracketChar === "{") {
    pattern = ObjectBindingPatternShape.FromBracket(bracket, context);
  } else {
    throw new Error("增量变量形状未支持：declaration 解构绑定");
  }
} else {
  throw new Error("增量变量形状未支持：declaration 解构绑定");
}
// [A2-D3] 绑定之后这一次 build 里只允许 `:` / `;`：`:` 由 A5 的 `TypeCatalogFactory` 在字符流里
// 提前建注解、`;` 由列表层终结候选收口，两者都在本形状 `Data` 里接管，不能在这里判死。
// 其余代码单元（`=` / `,` / `!` / 第二个绑定）仍是 C10 显式拒绝，绝不静默产出错树。
const afterBinding = ItemUtil.NextCode(moved, bindingAt + 1);
let trailing = -1;
if (afterBinding < moved.length) {
  const after = moved[afterBinding];
  let allowed = false;
  if (after instanceof Symbol) {
    const afterText = (after as Symbol).TempToString();
    allowed = afterText === ":" || afterText === ";";
  }
  if (!allowed) {
    throw new Error("增量变量形状未支持：declaration 绑定后紧跟代码");
  }
  trailing = afterBinding;
}
// 语句首位置：根层 0；块体里第一条语句取 `{` 之后第一个字符（与 legacy `BuildBlock` 的
// `bracket.StartIndex + 1` 同口径），否则取前一个非 trivia 兄弟的 `EndIndex`。
// 与 `VariableStatementPossibleShape.BuildByIndex` 的旧算术同一份，只是搬到增量路径。
let pos = 0;
if (host instanceof Bracket && (host as Bracket).StartBracketChar === "{") {
  let previous = -1;
  for (let at = start - 1; at >= 0; at--) {
    if (!data[at].IsTriviaToken) {
      previous = at;
      break;
    }
  }
  if (previous < 0) {
    if (host.SourceRange.StartIndex >= 0) {
      pos = host.SourceRange.StartIndex + 1;
    }
  } else {
    const previousEnd = data[previous].SourceRange.EndIndex;
    if (previousEnd >= 0) {
      pos = previousEnd;
    }
  }
} else {
  for (let at = start - 1; at >= 0; at--) {
    if (!data[at].IsTriviaToken) {
      const previousEnd = data[at].SourceRange.EndIndex;
      if (previousEnd >= 0) {
        pos = previousEnd;
      }
      break;
    }
  }
}
data.splice(start, moved.length);
const statement = new VariableStatementShape(host.Template);
statement.Incremental = true;
statement.Pos = pos;
// [A2-D3] declare 时语句 / 列表的 `src` 从**变量关键字**起（legacy `Finish(shape, keywordStart, …)`
// 的 `SignIn(head.StartIndex)`），而 `Pos` 仍是语句首（legacy `Positions[declare]`）；非 declare 的
// 旧路径继续用 `pos`，一个字节都不变。
const headStart = head.SourceRange.StartIndex;
const signInStart = declared === true
  ? (headStart >= 0 ? headStart : pos)
  : pos;
statement.SignIn(signInStart);
const list = new VariableDeclarationListShape(host.Template);
// [A2-D3] legacy `list.Pos = Positions[listHeadIndex]`：declare 时 listHeadIndex 仍是变量关键字，
// 所以它的 Pos 是 `declare` 词的 `EndIndex`；非 declare 时与语句同 `pos`。
list.Pos = declared === true ? declareEnd : pos;
list.SignIn(signInStart);
const declaration = new VariableDeclarationShape(host.Template);
declaration.Incremental = true;
const headEnd = (head as Common).SourceRange.EndIndex;
declaration.Pos = headEnd >= 0 ? headEnd : pos;
if (pattern !== null) {
  const patternShape = pattern as ShapeToken;
  const patternStart = patternShape.SourceRange.StartIndex;
  declaration.SignIn(patternStart >= 0 ? patternStart : declaration.Pos);
  patternShape.Pos = declaration.Pos;
  declaration.Add(patternShape);
} else {
  const bindingStart = binding.SourceRange.StartIndex;
  declaration.SignIn(bindingStart >= 0 ? bindingStart : declaration.Pos);
  const identifier = IdentifierShape.FromBasicToken(binding as Common, context);
  identifier.Pos = declaration.Pos;
  declaration.Add(identifier);
}
// [A2-D3] 绑定之后已经到达的 `:` / `;` 原样留在本形状 `Data` 里，交给 A5 的类型目录 / 列表层收口
// （不丢单元 = 不丢 `:`）；只有这两个符号会走到这里（其余形态在上面已显式拒绝）。
if (trailing >= 0) {
  for (let at = trailing; at < moved.length; at++) {
    declaration.Add(moved[at]);
  }
}
// C8：新增 possible 用 cache（`CatalogGuide` 自带）；终结候选是本模式自己的声明收口候选。
// WP-A6b：终结候选继承 A2/A4 扩过的 `VariableDeclarationEndPossibleShape`（只多认 `;` / `,`），
// 表达式候选目录逐个套 `DeclarationCellGuard`（`;` / `,` 格留给终结候选）。
declaration.CatalogGuide = new CatalogGuide(IncrementalVariableDeclarationListBuilder.GuardedCatalog(),
  new VariableDeclarationListEndPossibleShape());
list.Add(declaration);
// [A2-D3] `declare` 修饰词挂在语句最前（legacy `BuildDeclareVariableStatement` 的
// `ambient.Data.splice(0, 0, modifier)`，形状 / `Pos` / `src` 都同源），子节点顺序 [DeclareKeyword, list]。
if (declared === true) {
  const declareUnit = moved[declareAt];
  const modifier = DeclareKeywordShape.FromBasicToken(declareUnit as Common, context);
  modifier.Pos = pos;
  statement.Add(modifier);
}
statement.Add(list);
data.splice(start, 0, statement);
statement.Parent = host;
host.MountedUnit = statement;
statement.MountedUnit = list;
list.MountedUnit = declaration;
if (binding instanceof Bracket) {
  // [WP-A6c] Build runs at the closing bracket tick; Bracket.ExitOrPre calls Quit() right after
  // TryToClose, and Quit() clears Parent.MountedUnit - that would detach the statement we just
  // mounted. Re-parenting the bracket onto its own binding-pattern shape makes that Quit() write to
  // the pattern (whose `MountedUnit` is always null) instead of to the host, so the mount chain
  // survives until '=' / initializer / ';'.
  //
  // **[W1:BRACKET-LOOP] 不能写成 `Parent = null`**：`UnitToken.Process` 的在飞循环退出守卫是
  // 「`parent !== null && parent.MountedUnit !== this`」。`Parent = null` 让这条守卫**永远不成立**，
  // 而 Build 是在括号自己的 `Process` 循环里被调用的（`}` 那一格 → `TryToClose` → 根目录 Accept），
  // 于是括号的循环继续吃下一行的字符：`let { a } = obj` ⏎ `let { ["k"]: kk } = obj` 的后一条整条被
  // `Add` 进**已经关闭**的括号（实测 `bracket.Data` 多出 `= obj ⏎ let ...`），根层只剩一条语句。
  // 改挂到 pattern 上：`Quit()` 仍然无害（pattern.MountedUnit 恒为 null），而循环顶部的守卫看到
  // `pattern.MountedUnit !== bracket` 立刻退出，字符回到父单元，由刚挂好的 statement → list →
  // declaration 链接手（`=` / 初始化器 / `;` 因此正常到达）。
  const bracketBinding = binding as Bracket;
  if (pattern !== null) {
    bracketBinding.Parent = pattern;
  } else {
    bracketBinding.Parent = null;
  }
}
return statement;
```
