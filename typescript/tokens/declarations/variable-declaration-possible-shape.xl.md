# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { ArrayBindingPatternShape } from "../bindings/array-binding-pattern-shape.xl.md"
import { ObjectBindingPatternShape } from "../bindings/object-binding-pattern-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { StatementRouteUtil } from "../statements/statement-route-util.xl.md"
import { VariableStatementShape } from "../statements/variable-statement-shape.xl.md"
import { IncrementalVariableDeclarationListBuilder, VariableDeclarationListEndPossibleShape } from "./variable-declaration-list-possible-shape.xl.md"
import { VariableDeclarationListShape } from "./variable-declaration-list-shape.xl.md"
import { VariableDeclarationShape } from "./variable-declaration-shape.xl.md"
```

# namespace cangjie

**增量模式（`StatementRouteUtil.EnableIncrementalVariableShapes`）下变量声明三层的唯一建造点。**

开关默认 `false` 时本类一次都不会被调用；`VariableStatementPossibleShape.BuildByIndex` 在开关打开时
把整条建造交给 `Build`，默认路径（旧壳 + `StatementBuilder` 原子建树）逐字节不变（C4）。

**签入口径（C1）**：三层都在**同一个** `BuildByIndex` 调用里建出来，一次把已经是 basic 单元的前缀
按归属搬好：

- `VariableStatementShape`：`Pos` = 语句首（根层 `0`），`src` 从同一位置起；吃掉声明关键字 `let`/`const`/`var`
  与前导 trivia（它们不进任何 `Data`）。
- `VariableDeclarationListShape`：`Pos` / `src` 与语句相同，直接吃掉语句的关键字前缀。
- `VariableDeclarationShape`：`Pos` = 前一个非 trivia 单元（关键字）的 `EndIndex`；`src` 从首个绑定
  （标识符 / 解构括号）的起点起，跳过前导 trivia。
- `IdentifierShape`：`Pos` 与 declaration 相同（C1），`SourceRange` 由 `IdentifierShape.FromBasicToken` 从
  basic token 取（工厂不设 `Pos`，必须由调用方补）。
- **WP-A6b 解构绑定**：绑定位是 `Bracket`（`[` / `{`）时，直接复用 legacy 的
  `ArrayBindingPatternShape.FromBracket` / `ObjectBindingPatternShape.FromBracket` 把**整棵绑定模式**
  从已闭合的括号单元建出来（与 legacy `BindingElementShape.ParseName` 同一条工厂、同一套 Pos/src），
  `Pos` = declaration 的 `Pos`，作为 declaration 的第一个子节点挂上。初始化器仍由 E-base 表达式目录
  （A1 primary 已合入）逐字符建、`FinishIncremental` 在 EOF / `;` 收口——与 legacy 同树。

**挂载链**：`host.MountedUnit = statement`、`statement.MountedUnit = list`、`list.MountedUnit = declaration`。
之后到达的字符由最内层 declaration 直接吃（char 6/7/8 的 `=` / 空格 / `2` 因此自然落进它的 `Data`），
不需要任何 `Process` / `ExitOrPre` 覆写。

# class IncrementalVariableStatementBuilder

## static method Build:(host:Token, tokenIndex:int, context:SyntaxContext)=>Token

```ts
const data = host.Data;
const start = ItemUtil.ItemStart(data);
if (start > tokenIndex) {
  throw new Error("增量变量形状未支持：statement 没有可搬的单元");
}
const moved:Array<Token> = data.slice(start, tokenIndex + 1);
const headAt = ItemUtil.NextCode(moved, 0);
if (headAt >= moved.length) {
  throw new Error("增量变量形状未支持：statement 缺少声明关键字");
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
  if (headText === "const" && bindingText === "enum") {
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
// 绑定之后这一次 build 里不允许还有别的代码单元（`!` / `:` / `,` 都不行）。
const afterBinding = ItemUtil.NextCode(moved, bindingAt + 1);
if (afterBinding < moved.length) {
  throw new Error("增量变量形状未支持：declaration 绑定后紧跟代码");
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
statement.SignIn(pos);
const list = new VariableDeclarationListShape(host.Template);
list.Pos = pos;
list.SignIn(pos);
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
// C8：新增 possible 用 cache（`CatalogGuide` 自带）；终结候选是本模式自己的声明收口候选。
// WP-A6b：终结候选继承 A2/A4 扩过的 `VariableDeclarationEndPossibleShape`（只多认 `;` / `,`），
// 表达式候选目录逐个套 `DeclarationCellGuard`（`;` / `,` 格留给终结候选）。
declaration.CatalogGuide = new CatalogGuide(IncrementalVariableDeclarationListBuilder.GuardedCatalog(),
  new VariableDeclarationListEndPossibleShape());
list.Add(declaration);
statement.Add(list);
data.splice(start, 0, statement);
statement.Parent = host;
host.MountedUnit = statement;
statement.MountedUnit = list;
list.MountedUnit = declaration;
if (binding instanceof Bracket) {
  // [WP-A6c] Build runs at the closing bracket tick; Bracket.ExitOrPre calls Quit() right after
  // TryToClose, and Quit() clears Parent.MountedUnit - that would detach the statement we just
  // mounted. Nulling the bracket's Parent makes that Quit() a no-op so the mount chain survives
  // until '=' / initializer / ';'.
  (binding as Bracket).Parent = null;
}
return statement;
```
