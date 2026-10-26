# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ExpressionBuilder } from "../expressions/expression-builder.xl.md"
```

# namespace cangjie

按契约 C2：增量模式下 `Data` 里的 basic 单元（`=` / 空格 / 未消费的 `2*3+1`）是**正确中间态**；
本形状在 `TryToClose` 里**先提取字段**（标识符、初始化器），**再丢弃** trivia + `=` + 未消费 basic token，
使关闭之后 `Data` 等价于 AST children。

`WP-C` 接管表达式增量之前，初始化器还是 raw basic 单元，这里**降级**成现有 `ExpressionBuilder` 原子建树
（与 legacy `StatementBuilder` 读同一批单元、同一个 `Positions` 口径），所以 EOF 树与 legacy 逐字节一致；
WP-C 建出表达式形状之后，同一段逻辑自动改走「已建好的形状直接收下」那一支，fallback 保留（C6）。

**WP-E0b：初始化器目录已切到 E-base 目录，本文件只负责 EOF 收口。**

- 候选从哪来：`IncrementalVariableStatementBuilder.Build`（`variable-declaration-possible-shape.xl.md`）给本形状挂
  `new CatalogGuide(ExpressionCatalogFactory.Create(), new VariableDeclarationEndPossibleShape())`，而
  `ExpressionCatalogFactory.Create()` 自 WP-E0b 起是
  `ExpressionShapeCatalog.CreateDeclarationInitializer()` 的纯转调（唯一注册入口，锚点 `// [E-CAT:FRAGMENTS]`）。
  所以 A1–A4 注册进来的形态片段会直接出现在本形状的 `Data` 里，本文件**不新增候选、不复制目录**。
- 门控点在上游，**不在本文件**：`VariableStatementPossibleShape.BuildByIndex` 只在
  `StatementRouteUtil.IsIncrementalVariableShapesEnabled()` 为真时调 `IncrementalVariableStatementBuilder.Build`；
  开关为 `false` 时本形状的 `Incremental` 永不为真，`FinishIncremental` 一次都不执行，
  legacy 建树（`StatementBuilder` 原子建树）逐字节不变（C4）——这就是「新路径一步不走」的机械保证。
- EOF 收口契约（本文件唯一职责）：初始化器里必须只剩**唯一**一个非 basic 的表达式根；它在 EOF 被
  `TryToClose` 封口，并作为本形状唯一的表达式子节点收下。多根 = 某个候选把运算符 / 操作数形状漏在了父层，
  属于会静默产出与 legacy 不同树的形态（divergent），按 C10 显式拒绝，**不**降级、**不**吞掉。

# class VariableDeclarationShape extends ShapeToken

```txt
let x = 1;
```

## field Incremental:bool = false

是不是增量模式建出来的形状。`false` = legacy `StatementBuilder` 建的 AST 节点，本类新旧逻辑一个字都不碰它。

## method TryToClose:(context:SyntaxContext)=>CloseStates

```ts
// C2：收口前先提取字段（`FinishIncremental` 内部先读 `this.Data`，再替换）。之后交回基类做
// 「终点补全 → Close」，所以 `Close` 里看到的 `Data` 已经是 AST children。
if (this.Incremental && !this.Closed) {
  this.FinishIncremental(context);
}
return super.TryToClose(context);
```

## method FinishIncremental:(context:SyntaxContext)=>void

```ts
// 1) 先提取：第一个非 trivia 单元是标识符，之后要么没有、要么是 `=` + 初始化器。
//    `:`（类型注解）/ `,`（多声明）/ `!`（确定赋值）/ 括号（解构 / 初始值表达式）都不在本模式支持范围，
//    显式抛错（C10），绝不静默产出错树。
let identifier:Token | null = null;
let equalAt = -1;
for (let at = 0; at < this.Data.length; at++) {
  const unit = this.Data[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (identifier === null) {
    identifier = unit;
    continue;
  }
  if (unit instanceof Symbol) {
    const text = (unit as Symbol).TempToString();
    if (text === "=") {
      equalAt = at;
      break;
    }
    throw new Error("增量变量形状未支持：declaration " + text);
  }
  if (unit instanceof Bracket) {
    throw new Error("增量变量形状未支持：declaration 括号");
  }
  throw new Error("增量变量形状未支持：declaration 声明体");
}
if (identifier === null) {
  throw new Error("增量变量形状未支持：declaration 空声明");
}
const kept:Array<Token> = [identifier];
if (equalAt >= 0) {
  const equalUnit = this.Data[equalAt];
  // 初始化器首单元的 `Pos` = `=` 的 `EndIndex`（C1：前一个非 trivia 单元的终点）。
  let basePos = equalUnit.SourceRange.EndIndex;
  if (basePos < 0) {
    basePos = equalUnit.SourceRange.StartIndex;
  }
  const raw:Array<Token> = this.Data.slice(equalAt + 1);
  // [E0B:INIT-ROOT] 初始化器的表达式形状由 E-base 目录逐字符建出（A1–A4 的片段注册在那个目录里，
  // 本文件不持有候选），EOF 这里只做一件事：找到**唯一**的表达式根。
  // 旧实现把 `raw` 里所有非 basic 单元都收下；一旦某个候选把运算符形状 / 第二个操作数留在父层，
  // 那会静默产出多子节点的错树（divergent，C10 禁止）。改成「唯一根 + 多根显式拒绝」。
  let builtShape:Token | null = null;
  let codeCount = 0;
  for (const unit of raw) {
    if (unit.IsTriviaToken) {
      continue;
    }
    codeCount += 1;
    if (unit.IsBasicToken) {
      continue;
    }
    if (builtShape !== null) {
      throw new Error("增量变量形状未支持：declaration 初始化器多根");
    }
    builtShape = unit;
  }
  if (builtShape !== null) {
    // 跨包最小补丁（WP-C，Lead 授权）：表达式形状可能还挂着未关闭的尾单元——EOF 没有下一个字符来关它。
    // 它自己的 `Close` 才是「问父单元目录」的触发点，会就地换成 NumericLiteral 并替宿主封口。
    // [E0B:INIT-ROOT] 新目录的候选沿用同一个收口点：根形状在这里封口，再作为唯一子节点收下。
    builtShape.TryToClose(context);
    // WP-C 已接管：表达式形状已经在 `Data` 里，直接收下那个唯一的 shape（丢弃基本单元 / trivia）。
    kept.push(builtShape);
  } else if (codeCount === 0) {
    throw new Error("增量变量形状未支持：declaration 初始化器为空");
  } else {
    // WP-C 接管前的降级：用现有 `ExpressionBuilder` 原子建表达式。`Load` 自己跳过 trivia，
    // `basePos` 与本形状的 `Positions` 口径一致，所以建出来的 Pos / 区间与 legacy AST 逐位相同。
    const builder = new ExpressionBuilder(this.Template, context);
    builder.Load(raw, basePos < 0 ? 0 : basePos);
    const expression = builder.ParseExpression();
    if (builder.At !== builder.Units.length) {
      throw new Error("增量变量形状未支持：declaration 初始化器未读完");
    }
    kept.push(expression);
  }
}
// 2) 提取完毕，再丢弃 trivia / `=` / 未消费 basic token：`Data` 现在等价 AST children。
this.Data.length = 0;
for (const item of kept) {
  this.Add(item);
}
```
