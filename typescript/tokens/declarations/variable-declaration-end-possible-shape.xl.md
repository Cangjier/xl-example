# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
```

# namespace cangjie

`VariableDeclarationShape` 的**终结候选**（契约 C8：`CatalogGuide` 的 `EndPossible`）。

它只回答「这条声明到这里算不算结束」，**不建任何形状**：真正的收口（字段提取 + 初始值原子建树）由
`VariableDeclarationShape.FinishIncremental` 在 `TryToClose` 里完成——EOF 那条路根本不经过本候选
（`SourceFileShape.Process` 直接对挂载单元 `TryToClose`），所以这里不做 `Accept` 之外的副作用。

**C10（全有或全无）**：只认识目标路径上的符号。`=` / 二元运算符 / 数字与标识符基本单元都是
「WP-C 接管前的中间态」，返回 `Reject` 让 `CatalogGuide` 继续等；其它符号（`:` 类型注解、`,` 多声明、
`;` 分号收口、`!` 确定赋值…）是本模式**未支持**的后续形态，显式抛错，绝不静默产出错树。

# class VariableDeclarationEndPossibleShape extends PossibleShape

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
const current = units[tokenIndex];
if (current instanceof EndOfFileTokenShape) {
  return ShapeStates.Accept;
}
if (current.IsTriviaToken) {
  return ShapeStates.Reject;
}
if (current instanceof Symbol) {
  const text = (current as Symbol).TempToString();
  // 目标路径上的中间态：`=`（等初始化值）、`*` / `+`（二元运算符）。WP-C 接管前一律等待。
  // `<` / `>` / `-` / `/` / `%` / `**` 也按运算符放行（同样的中间态，不改变任何结论）。
  if (text === "="
    || text === "*" || text === "+" || text === "-" || text === "/" || text === "%" || text === "**"
    || text === "<" || text === ">") {
    return ShapeStates.Reject;
  }
  throw new Error("增量变量形状未支持：declaration 符号 " + text);
}
if (current instanceof Common) {
  // 初始化器里的标识符 / 数字基本单元：WP-C 建出字面量之前保持等待。
  return ShapeStates.Reject;
}
if (current instanceof Bracket) {
  throw new Error("增量变量形状未支持：declaration 括号");
}
// WP-C 之后可能已经是表达式形状：等它自己长完更内层的单元，不在这里收口。
return ShapeStates.Reject;
```
