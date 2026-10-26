# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { CompositeInitializerJudge } from "../expressions/forms/primary/composite-initializer-judge.xl.md"
import { CompositeInitializerFormsJudge } from "../expressions/forms/primary/composite-initializer-forms-judge.xl.md"
import { CompositeInitializerTailJudge } from "../expressions/forms/primary/composite-initializer-tail-judge.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { OperatorTable } from "../expressions/operator-table.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
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
  // `=`：等初始化值。
  if (text === "=") {
    return ShapeStates.Reject;
  }
  // 二元运算符：**只有当它确实有可归约的左操作数**（左操作数已是形状，或是紧跟 `=` 的首个标识符）
  // 才让给 `BinaryOperatorPossibleShape`（WP-A2）。其余格（例如 `let x = a as T & U` 的 `&`）
  // 保持原来的显式拒绝——那是类型上下文的运算符，物化成二元会建出与 legacy 不同的树（divergent）。
  if (OperatorTable.IsBinaryOperator(text) && VariableDeclarationEndPossibleShape.HasReducibleLeft(units, tokenIndex)) {
    return ShapeStates.Reject;
  }
  // [A4b:COMPOSITE-FORMS] 箭头 `=>`、三元 `?` / `:`：本 WP 认领的形态（`Family` 命中）里它们是**中间单元**，
  // 交给 `CompositeInitializerFormsPossibleShape` 继续等（它会一直等到表达式长完）。
  // 不放行的话，`let x = y => y` / `let x = a ? b : c` 会在 `=>` / `?` 那一格被显式拒绝。
  if (text === "=>" || text === "?" || text === ":") {
    if (CompositeInitializerFormsJudge.Family(units) !== "") {
      return ShapeStates.Reject;
    }
  }
  // [A4c:TAIL] 尖括号断言 / 泛型箭头的前缀符号（`<T>y` / `<T>(a: T) => a`）：族命中时继续等，
  // 由 `CompositeInitializerTailPossibleShape` 在整条长完那一格建出。
  if ((text === "<" || text === ">") && CompositeInitializerTailJudge.Family(units) !== "") {
    return ShapeStates.Reject;
  }
  throw new Error("增量变量形状未支持：declaration 符号 " + text);
}
if (current instanceof Common) {
  // 初始化器里的标识符 / 数字基本单元：WP-C 建出字面量之前保持等待。
  return ShapeStates.Reject;
}
if (current instanceof Bracket) {
  // [A4:COMPOSITE] 复合字面量初始化器（`= [...]` / `= {...}`）：交给 A4 的
  // `CompositeInitializerPossibleShape` 在「括号关闭」那一格整棵建树，这里只等（Reject），
  // 不再显式拒绝。其它括号形态仍按 C10 显式抛错（A6 的解构 / 多声明等由各自 WP 接管）。
  if (CompositeInitializerJudge.Claims(units)) {
    return ShapeStates.Reject;
  }
  // [A4b:COMPOSITE-FORMS] 数组 / 括号 / 箭头 / 函数 / 类 / 三元：只在「初始化器真的长完」那一格放行
  // （`CanBuild` = 形态命中 + legacy `ExpressionBuilder` 整段吃完 + 之后只剩输入结束），
  // 让 `CompositeInitializerFormsPossibleShape` 整棵建出。其余格子（还有 `as` 续接、`;` 收口、
  // 半截括号）逐字保持原样：要么继续等，要么仍按 C10 显式抛错。
  if (CompositeInitializerFormsJudge.ClaimsForEndPossible(units)) {
    return ShapeStates.Reject;
  }
  // [A4b:COMPOSITE-FORMS] 还没长完、但括号之后仍是本族合法续接（`(...)` 后的 `=>`、`function (...)` 后的
  // 函数体 `{`）：继续等，不要按 C10 抛「declaration 括号」。`as`/`satisfies` 等其它续接不在此列。
  if (CompositeInitializerFormsJudge.ContinuationAllowed(units)) {
    return ShapeStates.Reject;
  }
  // [A4c:TAIL] 尖括号断言的类型参数表 / 泛型箭头的参数括号 / `[1] as const` 的数组括号：族命中就继续等，
  // 整条由 `CompositeInitializerTailPossibleShape` 建（完成性由它的 `CanBuild` 判）。
  if (CompositeInitializerTailJudge.CanWait(units)) {
    return ShapeStates.Reject;
  }
  throw new Error("增量变量形状未支持：declaration 括号");
}
// WP-C 之后可能已经是表达式形状：等它自己长完更内层的单元，不在这里收口。
return ShapeStates.Reject;
```

## static method HasReducibleLeft:(units:Array<Token>, tokenIndex:int)=>bool

这个二元运算符格上有没有「`BinaryOperatorPossibleShape` 能用的左操作数」：

- 前一个非 trivia 单元已经是**形状**（`1 && 2` 的 `1`、`a/b` 建完 `a` 之后）⇒ 有；
- 前一个单元是**标识符 / 数字基本单元**，且它的前一个是 `=`（`let x = a < b` 的 `a`）⇒ 有；
- 其余（`as T & U` 的 `T`、`(` 之后的 `?` 等）⇒ 没有，保持既有显式拒绝。

```ts
const leftIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (leftIndex < 0) {
  return false;
}
if (units[leftIndex] instanceof ShapeToken) {
  return true;
}
const headIndex = ItemUtil.PreviousCode(units, leftIndex - 1);
if (headIndex < 0) {
  return false;
}
const head = units[headIndex];
if (!(head instanceof Symbol)) {
  return false;
}
return (head as Symbol).Is("=");
```
