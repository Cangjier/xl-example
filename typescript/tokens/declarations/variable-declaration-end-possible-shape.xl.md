# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { CompositeInitializerJudge } from "../expressions/forms/primary/composite-initializer-judge.xl.md"
import { CompositeInitializerFormsJudge } from "../expressions/forms/primary/composite-initializer-forms-judge.xl.md"
import { CompositeInitializerTailJudge } from "../expressions/forms/primary/composite-initializer-tail-judge.xl.md"
import { DeclarationAsiBoundary } from "./forms/declaration-asi-boundary.xl.md"
import { ExpressionContinuationCatalog } from "../expressions/expression-continuation-catalog.xl.md"
import { ExpressionAtomRegistry } from "../expressions/forms/shared/expression-atom-registry.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { OperatorTable } from "../expressions/operator-table.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { StatementLegacyMetrics } from "../statements/statement-legacy-metrics.xl.md"
import { AngleJudge } from "../types/angle-judge.xl.md"
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

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
const current = units[tokenIndex];
if (current instanceof EndOfFileTokenShape) {
  return ShapeStates.Accept;
}
if (current.IsTriviaToken) {
  // [A2-D1:ASI] trivia 格上的两条边界判据：
  //   ① `CanCloseAtLineBreak`——**换行这一格**就是收口点（下一行第一个显著字符起一个不续接的单词时成立）；
  //      比「下一条语句首代码单元」早一拍，因此声明尾部的原子建树严格早于 legacy（分类靠这一拍）。
  //   ② `CanClose`——对 trivia 恒 false（`IsAsiBoundary` 只在**代码单元**那一格判换行），
  //      放在这里只是让「收口判据」在两类格子上的入口只有一个，块体宿主（D2）加分支时不至于漏掉 trivia 一路。
  // [D3c:ANGLE] 两条都要加「尖括号组已经关完」这一条：`const f = <T` ⏎ `,>(a: T) => a` 在换行那一格
  // 两条判据都会说「可以收」，可组还开着——收下去就是把 `<T` 半个尖括号交给原子建树，
  // `ExpressionBuilder.ParseAngleStart` 抛「尖括号断言/泛型箭头缺少配对的 >」（实测 7 条的另一半）。
  const angleOpen = AngleJudge.IsOpenGroup(units, tokenIndex);
  if (!angleOpen && DeclarationAsiBoundary.CanCloseAtLineBreak(units, tokenIndex)) {
    return ShapeStates.Accept;
  }
  if (!angleOpen && DeclarationAsiBoundary.CanClose(units, tokenIndex, false)) {
    return ShapeStates.Accept;
  }
  return ShapeStates.Reject;
}
if (current instanceof Symbol) {
  const text = (current as Symbol).TempToString();
  // [R12:BLOCK-CLOSE] 裸的 `}` 是**外层块体括号的收口符**，不是本声明的续接：初始化器里的对象字面量
  // 是 `Bracket`（`StartBracketChar === "{"`），`}` 符号不可能出现在这条表达式里。语句停在块末尾且
  // 没有 `;` 时（`function* gen() {` ⏎ `  const c = yield` ⏎ `}`），逐字符驱动会先把 `}` 当普通单元
  // 送进最内层挂载的形状；这里必须**先收口**，`}` 才能回到块体括号上（否则块体的终点会多吞掉 `}` 之后
  // 那个换行——实测 `Block` / `FunctionDeclaration` 各多 1 字节）。判据只看这一个符号：其余格子一个字不改。
  if (text === "}") {
    return ShapeStates.Accept;
  }
  // [D0:CONTINUATION] 任何已注册形态认领这一格 ⇒ 继续等，不再逐形态手写白名单。
  // 这是「初始化器位置上的未知 token 交给表达式目录」的唯一通用入口（`ExpressionContinuationCatalog`）；
  // 认领 = `PossibleShape.ContinuationClaim` 为真，语义是「继续等」，不是「支持」。
  // 没认领 ⇒ 逐字落到下面的既有分支 / 最终 throw（C10 不变）。
  if (ExpressionContinuationCatalog.Claims(units, tokenIndex)) {
    return ShapeStates.Reject;
  }
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
  // [S5:TERNARY] 三目进行中的 `?` / `:`（`const key = typeof id === "number" ? id : Number(id)`）。
  // `A4b` 的 `Family` 只认「标识符 / 数字起首、后面紧跟 `?`」那一种条件位（`:162` 的注释写明
  // 「复合条件的三元本 WP 不认领」），所以复合条件位的三目在 `?` / `:` 那一格会落到本文件的兜底 `throw`。
  // 处理放在兜底 `throw` 之前那一条 `[S5:TERNARY]` 守卫里（同一份判据，只此一处）——这里不再单独分支。
  // [A4c:TAIL] 尖括号断言 / 泛型箭头的前缀符号（`<T>y` / `<T>(a: T) => a`）：族命中时继续等，
  // 由 `CompositeInitializerTailPossibleShape` 在整条长完那一格建出。
  if ((text === "<" || text === ">") && CompositeInitializerTailJudge.Family(units) !== "") {
    return ShapeStates.Reject;
  }
  // [D3c:ANGLE] 本格是**尖括号组的一员**（开括号那一格 / 组内任何一格 / 配对的 `>`），且初始化器还是纯 raw
  // ⇒ 继续等，把整条交给收口格的原子建树（legacy `ExpressionBuilder`：类型实参 / 实例化表达式 /
  // 泛型箭头 / 尖括号断言 / 标签模板都由它建，与 legacy 同源）。
  //
  // 为什么必须在这里放行（实测 9 条 `declaration 符号 <` 的全部成因，见 `_reports/D3c.md` §1）：
  //   `new A<T>` 的 `<` 前驱是 `Common("A")`、`a.b.c<string>` 的 `<` 前驱是 `Common("c")`、`async(): Promise<void> => …`
  //   的 `<` 前驱是返回类型里的 `Common("Promise")`——三种都不是「形状」也不是「紧跟 `=` 的标识符」，
  //   `HasReducibleLeft` 判否、`OperatorTable.IsBinaryOperator("<")` 那条分支不响，于是落到兜底 `throw`。
  //   它们也不是 A4c 的 `angle` 族（那一族要求 `=` 之后**第一个**单元是 `<`），所以上面那条不覆盖。
  //   同一格里还有一半是**真比较链**（`x == y < z`）：`<` 是二元运算符，可左操作数 `x == y` 还没成形状，
  //   `HasReducibleLeft` 同样判否——这一半也要走原子建树，且 legacy 建出来的就是左结合的比较链。
  //
  // 反向边界（C10 不变）：
  //   ① 初始化器里已经有形状落地（`IsRawInitializer` 为假）⇒ 原子重建不可能，逐字落回 `throw`
  //      （`const y = f()<T>` 这种在形状之后再出现尖括号的形态不归本判据）；
  //   ② 带类型注解的声明（`HasAnnotationColon`）⇒ 由 `TypeMode` 接管，不放行；
  //   ③ 只有**组员**才放行：裸的 `<` / `>`（`AngleJudge` 配不上对的比较运算符，`a < b` ⏎ `c`）逐字落回
  //      下面的既有分支——它们的左操作数判据没变，行为一个字不改。
  if ((text === "<" || text === ">" || text === ">>" || text === ">>>")
    && AngleJudge.IsGroupMember(units, tokenIndex)
    && !VariableDeclarationEndPossibleShape.HasAnnotationColon(units)
    && VariableDeclarationEndPossibleShape.IsRawInitializer(units)) {
    StatementLegacyMetrics.DeclarationAngleWaitCount += 1;
    return ShapeStates.Uncertain;
  }
  // [A5c] 类型实参调用 `f<string>()`：`<` 比 `>` 多时正处在类型实参列表内部，`>` / `>>` / `>>>`
  // 是列表的收口符，不是本模式未支持的符号 —— 让给 A5 的类型面（`VariableDeclarationShape` 的 TypeMode /
  // `TypeCatalogFactory.HasTypeArgumentCall`）继续等。不放行会在 `>` 那一格显式抛错，
  // 让 `tts-impl/types/generic-call-type-args` 从 incremental 退化成 throw。
  if ((text === ">" || text === ">>" || text === ">>>")
    && VariableDeclarationEndPossibleShape.HasOpenTypeArgument(units, tokenIndex)) {
    return ShapeStates.Reject;
  }
  // **[WP-S1] `new.target` / `new . target`**：`new` 是前缀运算符，`.` 是它的成员访问 —— 初始化器里的
  // `.` 只可能是属性访问，本格**必须继续等**，由表达式目录在闭合格建出。不加这一条，
  // `function f() { let x = new.target }` 会在 `.` 那一格抛「declaration 符号 .」；
  // legacy 建树一直支持这条形态，根层函数体挂上控制流目录之后它第一次被走到（`ref-new-target`）。
  if (text === ".") {
    return ShapeStates.Reject;
  }
  // [T9:ATOM-POSTFIX] `const a = 1 ?.toString()`：`?.` 紧跟在**已建原子**（登记过身份的
  // `NumericLiteralShape`）之后是可选链后缀，属于同一个 postfix 面，本格继续等。
  //
  // 只认「初始化器里已经有登记过的原子根」这一种（`HasAtomInitializer`）：raw 初始化器的
  // `?.` / `??` 一个字节不改——`CanDeferToAtomicInitializer` 的显式账本（`throw/composite/class-ball` /
  // `throw/composite/expression-zoo` 依赖它们保持抛错）也因此不受影响：`const a = b?.c` 的 `b`
  // 被 `PrimaryAtomGuard` 挡住、根本没有形状落地，`HasAtomInitializer` 为假。
  if (text === "?." && VariableDeclarationEndPossibleShape.HasAtomInitializer(units)) {
    return ShapeStates.Reject;
  }
  // [S5:TERNARY] **条件位是复合表达式的三目**（`const key = typeof id === "number" ? id : Number(id)`）：
  // 初始化器还是纯 raw 基本单元、且这条初始化器里「顶层先有二元运算符、后有 `?`」⇒ 本格**等**，不抛。
  //
  // 为什么这里会有未知符号：`[S5:TERNARY]` 的守卫（`DeclarationCellGuard`）在三目族上一开始就拒掉
  // 表达式目录的全部候选，于是本条声明从第一格起就没有任何候选能建形状——`typeof` / `1` / `===` / `?` /
  // `:` / 分支操作数全部按 basic 单元流进来，逐个都要在这里过一遍。它们不该各自撞一条 `throw`：
  // 收口格（`;` / EOF）的原子建树（`VariableDeclarationShape.FinishIncremental` 的
  // `builtShape === null` 分支 → legacy `ExpressionBuilder`）会把整条初始化器建成与 legacy 逐节点同源的树。
  //
  // 反向边界（C10 不变）：`IsRawInitializer` 为假（初始化器里已有表达式形状，原子重建不可能）或
  // `HasCompoundTernary` 为假（不是复合条件位三目）时，逐字落回下面的 `throw`。
  if (VariableDeclarationEndPossibleShape.IsRawInitializer(units)
    && VariableDeclarationEndPossibleShape.HasCompoundTernary(units)) {
    return ShapeStates.Uncertain;
  }
  // [D3a:RAW-INITIALIZER] 初始化器仍是**纯 raw 基本单元**（`=` 之后没有任何候选建出形状）时，这一格上的
  // 运算符 / 后缀符号既不是「本模式未支持的形态」，也不该由本候选回答：收口格（`;` / EOF / 换行 ASI）的
  // 原子建树会用 legacy `ExpressionBuilder` 从 `=` 之后整段重建（`VariableDeclarationShape.FinishIncremental`
  // 的 `builtShape === null` 分支），读完不齐就显式抛「初始化器未读完」——两个出口都自证（legacy 同源 /
  // 显式错误），没有静默错树。所以这里**继续等**，把这一格交给收口格。
  //
  // 为什么必须等而不是抛（D3a 的最大一族，实测）：`const g = o["f"]().v + 1` 的左操作数是**还没建形状的
  // raw 后缀链**——`BinaryOperatorPossibleShape` 拿不到已建形状就永远不认领，上面那条 `HasReducibleLeft`
  // 又只认「紧跟 `=` 的标识符」，于是 `+` 这一格既没有候选认领、又被 C10 判成未支持。同族的
  // `-` `*` `/` `===` `|` `!` `?` 与「后缀 `!` 落在 raw 标签模板 / 下标链之后」全走这一个出口。
  //
  // 反向边界（C10 不变，四条）：
  //   ① 初始化器里已经落地**既不是容器、也不是登记过的原子根**的形状（`const z = a as T`）⇒
  //      三条判据都为假，逐字落回下面的 `throw`——那一类要形状面自己认领（P1 的后缀格），不在本判据的写域；
  //      [T9:ATOM-POSTFIX] 容器 / 原子根（容器 + R15 标签模板 + T9 数字字面量）例外：它们在收口格能被
  //      `ParsePrimary` 当操作数消费，与 raw 初始化器是同一个等待出口（`HasAtomInitializer`）。
  //   ② 收口 / 列表符号（`;` `,`）不是本候选的格子，逐字落回 `throw`；
  //   ③ 类型侧符号（`<` `>` 家族）与既有显式拒绝账本里的 `?.` `??` 不在本判据内，行为一个字都不改；
  //   ④ **带类型注解的声明不在本判据内**（`HasAnnotationColon`）：它的初始化器由 `TypeMode` 接管，
  //      收口走 `CanFinishTypedDeclaration` / `AdvanceTypeMode`，与本判据假设的「`FinishIncremental`
  //      的 `builtShape === null` 原子重建」不是同一个出口。实测反例（D3a）：
  //      `let effective:any = plan === undefined ? null : plan;` ——旧行为是 `===` 抛错 → 文件级
  //      fallback → 树正确；放行 `===` 之后声明在 `;` 收口，`=== undefined ? null : plan` 整段被
  //      静默丢掉（structural=7、声明区间拉到 EOF），即「崩溃 + legacy 兜底（对）」变成「增量路径
  //      静默错树」。C10 不允许，所以这一族原样留给 S5 / A5。
  if (!VariableDeclarationEndPossibleShape.HasAnnotationColon(units)
    && (VariableDeclarationEndPossibleShape.IsRawInitializer(units)
      || VariableDeclarationEndPossibleShape.HasContainerInitializer(units)
      // [T9:ATOM-POSTFIX] 已建原子根 + **后缀**符号（在这条分支上只剩 `!`：`.` / `?.` 各有自己的
      // 原子分支，`(` / `[` 走下面的 `Bracket` 分支）——收口格能把它当操作数消费，继续等。
      //
      // **只认后缀，不认二元运算符**：`tag`x` + y` 这一族在收口格重建会把标签模板链重排
      // （实测 `expr-template-tagged-in-operator`：`TaggedTemplateExpression` 区间 178-206 vs 178-190，
      // 判据 status=diff）——那是静默错树。宁可让它继续显式失败、由文件级 legacy 给出正确树（C10）。
      || (VariableDeclarationEndPossibleShape.HasAtomInitializer(units) && text === "!"))
    && VariableDeclarationEndPossibleShape.CanDeferToAtomicInitializer(text)) {
    return ShapeStates.Uncertain;
  }
  throw new Error("增量变量形状未支持：declaration 符号 " + text);
}
if (current instanceof Common) {
  // [A2-D1:ASI] 两条收口判据，**行尾格优先**：
  //   ① `CanCloseAtLineBreak`——本格是声明最后一个代码单元、后面换行、下一行起一个不续接的单词
  //      ⇒ 在**这一格**收口（比下一条语句首代码单元早一拍，分类靠这一拍）；
  //   ② `CanClose`——本格是下一条语句的首代码单元（`let x = 1` ⏎ `let y = 2` 的第二个 `let`）。
  // 两条都转发给 `DeclarationAsiBoundary`（同一份 `CanEndStatement` / `CanEndDeclarationTail` +
  // 「已有可结束形状」），本条文件不新写 ASI 词法；都不成立时逐字回到原来的「继续等」。
  // [D3c:ANGLE] 与 trivia 分支同一条附加条件：尖括号组还开着就不能收口。
  const angleOpen = AngleJudge.IsOpenGroup(units, tokenIndex);
  if (!angleOpen && DeclarationAsiBoundary.CanCloseAtLineBreak(units, tokenIndex)) {
    return ShapeStates.Accept;
  }
  if (!angleOpen && DeclarationAsiBoundary.CanClose(units, tokenIndex, false)) {
    return ShapeStates.Accept;
  }
  // 初始化器里的标识符 / 数字基本单元：WP-C 建出字面量之前保持等待。
  return ShapeStates.Reject;
}
if (current instanceof Bracket) {
  // [D0:CONTINUATION] 与 `Symbol` 分支同一条通用委派：已注册形态认领这一格 ⇒ 继续等。
  // 认领之前 `(` / `[` 只能靠逐形态手写分支放行，新形态每加一个就要来改这里一行。
  if (ExpressionContinuationCatalog.Claims(units, tokenIndex)) {
    return ShapeStates.Reject;
  }
  // [A5c] 类型实参调用的调用括号：`f<string>(…)` 的 `(` 括号由 A5 的类型面整体接管
  //（`VariableDeclarationShape.ComputePossibleShapes` → TypeMode → `TypeCatalogFactory.ParseInitializer`），
  // 这里只等（Reject），不再按 C10 抛「declaration 括号」。
  if ((current as Bracket).StartBracketChar === "("
    && VariableDeclarationEndPossibleShape.HasTypeArgumentCall(units)) {
    return ShapeStates.Reject;
  }
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
  // [D1:RAW-INITIALIZER] 初始化器里还有**未建的括号**（对象 / 数组 / 括号字面量、调用链的括号、
  // `as`·`satisfies` 之前的对象字面量、类 / 函数表达式的体）：这一格**继续等**，不按 C10 抛错。
  //
  // 为什么等是对的，而不是「静默退回错树」：这条声明此后只有两个收口出口，两个都会**显式验证**——
  //   ① 下一格起是 `as` / `satisfies` / 参数类型注解时，`VariableDeclarationShape` 的 TypeMode 接管，
  //      `TypeCatalogFactory.ParseInitializer` 把整条（含括号）用 legacy `ExpressionBuilder` 建出，
  //      再用 `CanEndInitializer` 判「后面不能再长」才落地；
  //   ② 其余形态在声明收口格（`;` / EOF / ASI）由 `FinishIncremental` 的原子建树分支处理：
  //      `ExpressionBuilder.Load(raw, = 的 EndIndex)` + `ParseExpression`，并要求
  //      `builder.At === builder.Units.length`（读不完就抛「初始化器未读完」，不会产出半棵树）。
  // 也就是说：括号不会留在 AST 里，要么整条建对，要么显式报错。
  //
  // 反向边界（C10 不变）：`=` 之前（解构绑定等）或初始化器里**已经落地了形状**（原子重建不可能）时，
  // 逐字落回下面的 `throw`。计数器见 `StatementLegacyMetrics.DeclarationBracketWaitCount`。
  if (VariableDeclarationEndPossibleShape.IsRawInitializer(units)) {
    StatementLegacyMetrics.DeclarationBracketWaitCount += 1;
    return ShapeStates.Reject;
  }
  // [D1:POSTFIX-BRACKET] 括号紧跟在**已建表达式形状**之后（`o["f"]` / `a.b[c]` / 调用括号）：
  // 这是元素访问 / 调用 / 非空后缀候选的专属格，继续等，由它们在括号关闭这一格建出。
  // 旧行为在这一格按 C10 抛错，等于把「后缀括号」整类形态挡死（D1 残项里的 7 条成员链 / 下标族）。
  if (VariableDeclarationEndPossibleShape.PreviousIsShape(units, tokenIndex)) {
    StatementLegacyMetrics.DeclarationBracketWaitCount += 1;
    return ShapeStates.Reject;
  }
  // [T9:ATOM-POSTFIX] 下标括号挂在**已建原子**的成员链之后：`const a = 1 .toString[0]`。
  // `1` 已在数字格建成 `NumericLiteralShape`，`.toString` 还是 raw 基本单元，所以紧邻判据
  // （`PreviousIsShape`，只看前一格是不是形状）看不见链头。这里补的是**链头**条件：
  // 初始化器里有登记过的原子根（`HasAtomInitializer`）+ 本括号是那条成员链的下一节
  // （`FollowsMemberSegment`：前一格是属性名、它前面是 `.` / `?.`）。两条都成立才继续等。
  //
  // 收口格的两个出口都会自证，不存在静默错树：`FinishIncremental` 在这里等到 EOF 后走
  // 「根 + 根之后还有代码」分支，`ParsePrimary` 消费已建原子、`ParsePostfixSuffix` 接 `[0]`，
  // 读不完就显式抛「初始化器未读完」。
  if (VariableDeclarationEndPossibleShape.HasAtomInitializer(units)
    && VariableDeclarationEndPossibleShape.FollowsMemberSegment(units, tokenIndex)) {
    StatementLegacyMetrics.DeclarationBracketWaitCount += 1;
    return ShapeStates.Reject;
  }
  throw new Error("增量变量形状未支持：declaration 括号");
}
// WP-C 之后可能已经是表达式形状：等它自己长完更内层的单元，不在这里收口。
return ShapeStates.Reject;
```

## static method HasOpenTypeArgument:(units:Array<Token>, tokenIndex:int)=>bool

`=` 之后的初始化器里 `Symbol("<")` 比 `>` 家族多 ⇒ 正处在**类型实参列表内部**（`f<string` 停在 `string`）。

**只数到当前格之前**（`at < tokenIndex`）：当前格正是那个 `>` 时它还没闭合，`<` 仍然比 `>` 多。

字符口径与 `TypeCatalogFactory.HasTypeArgumentCall` 的深度计算一致（`>>` 记 2、`>>>` 记 3）。

```ts
const equalAt = VariableDeclarationEndPossibleShape.EqualIndex(units);
if (equalAt < 0) {
  return false;
}
let depth = 0;
for (let at = equalAt + 1; at < tokenIndex; at++) {
  const unit = units[at];
  if (!(unit instanceof Symbol)) {
    continue;
  }
  const text = (unit as Symbol).TempToString();
  if (text === "<") {
    depth += 1;
    continue;
  }
  if (text === ">") {
    depth -= 1;
    continue;
  }
  if (text === ">>") {
    depth -= 2;
    continue;
  }
  if (text === ">>>") {
    depth -= 3;
    continue;
  }
}
return depth > 0;
```

## static method HasTypeArgumentCall:(units:Array<Token>)=>bool

这段单元里是否有「标识符（或已建形状）+ `<` … 配对 `>` + 紧跟 `(` 括号」的**类型实参调用**形态。

与 `TypeCatalogFactory.HasTypeArgumentCall` 同一判据（本文件单独实现一份是为了避免
`types/type-catalog-factory` ↔ `declarations/*` 的导入环；两处判据必须保持一致）。

```ts
for (let at = 0; at < units.length; at++) {
  const unit = units[at];
  if (!(unit instanceof Symbol) || !(unit as Symbol).Is("<")) {
    continue;
  }
  let depth = 0;
  for (let scan = at; scan < units.length; scan++) {
    const inner = units[scan];
    if (inner.IsTriviaToken) {
      continue;
    }
    if (!(inner instanceof Symbol)) {
      continue;
    }
    const text = (inner as Symbol).TempToString();
    if (text === "<") {
      depth += 1;
      continue;
    }
    let closeCount = 0;
    if (text === ">") {
      closeCount = 1;
    } else if (text === ">>") {
      closeCount = 2;
    } else if (text === ">>>") {
      closeCount = 3;
    }
    if (closeCount === 0) {
      continue;
    }
    depth -= closeCount;
    if (depth > 0) {
      continue;
    }
    for (let next = scan + 1; next < units.length; next++) {
      if (units[next].IsTriviaToken) {
        continue;
      }
      return units[next] instanceof Bracket && (units[next] as Bracket).StartBracketChar === "(";
    }
    return false;
  }
}
return false;
```

## static method EqualIndex:(units:Array<Token>)=>int

宿主 `Data` 里第一个 `Symbol("=")` 的下标（跳过前导 trivia）；没有返回 `-1`。

```ts
for (let at = 0; at < units.length; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is("=")) {
    return at;
  }
}
return -1;
```

## static method HasCompoundTernary:(units:Array<Token>)=>bool

这条声明的初始化器里是不是「**条件位为复合表达式的三目**」：从 `=` 之后往前看（`ItemUtil.IsCompoundTernaryAhead`），
顶层先有二元运算符、之后有 `?`。

只用作 `[S5:TERNARY]` 守卫的一半（另一半是 `IsRawInitializer`），没有 `=` 时返回 false。

```ts
const equalAt = VariableDeclarationEndPossibleShape.EqualIndex(units);
if (equalAt < 0) {
  return false;
}
return ItemUtil.IsCompoundTernaryAhead(units[equalAt]);
```

## static method IsRawInitializer:(units:Array<Token>)=>bool

`=` 之后的初始化器是否**还是纯 raw 基本单元**——没有任何候选把它建成形状。

这是 `[S5:TERNARY]` 分支唯一的判据：只有纯 raw 的初始化器才能在收口格被 legacy `ExpressionBuilder`
整段原子重建（`VariableDeclarationShape.FinishIncremental` 的 `builtShape === null` 分支）；
一旦有形状落地，那条分支不可达（`FinishIncremental` 会「只收唯一根、丢弃其余 basic」），
本判据为 false，调用点保持原样的 C10 显式抛错。

`=` 之前的部分（标识符 / 类型注解形状 / `!`）不参与判定；`=` 本身也不算。
没有 `=`（还在声明头）⇒ false（不看 `=` 之前的 `:`，那是类型注解的格，与三目无关）。

```ts
const equalAt = VariableDeclarationEndPossibleShape.EqualIndex(units);
if (equalAt < 0) {
  return false;
}
for (let at = equalAt + 1; at < units.length; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (!unit.IsBasicToken) {
    return false;
  }
}
return true;
```

## static method HasContainerInitializer:(units:Array<Token>)=>bool

[B4i:K1-ROOT] `=` 之后的初始化器里是否已经有**本机制在括号关闭格建出的容器根**
（`ExpressionAtomRegistry.Containers` 的身份，不认任意形状）。

与 `IsRawInitializer` 互补：容器落地之后 raw 原子重建那条分支不可达，但**收口格仍然能建出整条**——
`FinishIncremental` 现在从那个已建容器继续 `ParseExpression`（`.b` / `(1)` / `/ 2` / `as` 都在里面），
读不完就显式抛错。所以「容器根 + 运算符」与「raw 初始化器 + 运算符」是同一个等待出口，
不再落进 C10 的 `throw`（否则 `const v = { p: 1 }` ⏎ `/re/g` 会整条 fallback）。

```ts
const equalAt = VariableDeclarationEndPossibleShape.EqualIndex(units);
if (equalAt < 0) {
  return false;
}
for (let at = equalAt + 1; at < units.length; at++) {
  if (ExpressionAtomRegistry.HasContainer(units[at])) {
    return true;
  }
}
return false;
```

## static method HasAnnotationColon:(units:Array<Token>)=>bool

[D3a:RAW-INITIALIZER] 本条声明**带类型注解**。两条**互补**的判据，缺一不可：

- `=` 之前有 `Symbol(":")`——注解**还没落地**时成立；
- `=` 之前已有第二个非 basic 单元——注解**已经落地**之后成立（那时 `:` 已被 `TryBuildAnnotation`
  消费掉，`Data` 变成 `[IdentifierShape, TypeNode, (=) …]`）。

为什么要两条：只看「第二个非 basic 单元」时，注解还停在一串 basic 单元（`any` / `BracketRoleResult` /
`|` / `null` 都是 basic）就看不见它；只看 `:` 时，注解落地之后的声明全被漏掉。实测两条各漏一半。

只用于 `[D3a:RAW-INITIALIZER]` 的反向边界 ④，不参与建树。

```ts
let code = 0;
let colonSeen = false;
for (let at = 0; at < units.length; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is("=")) {
    return colonSeen;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is(":")) {
    colonSeen = true;
  }
  code += 1;
  if (code >= 2 && !unit.IsBasicToken) {
    return true;
  }
}
return colonSeen;
```

## static method CanDeferToAtomicInitializer:(text:string)=>bool

[D3a:RAW-INITIALIZER] 这一格的符号是不是「可以整体交给收口格原子建树」的**运算符 / 后缀符号**。

只有两类：

1. 二元运算符（`OperatorTable.IsBinaryOperator`）——`+ - * / % ** && || & | ^ == === != !== << >>`；
2. 后缀 / 条件位的非收口符号：`!`（非空断言）、`?`（三目条件位）、`:`（三目分支位）。

**闭集之外的三种一律 `false`**（各自的账本不能被本判据改写）：

| 符号 | 为什么不在这里 |
| --- | --- |
| `;` `,` | 列表层 / 语句层的收口格（`VariableDeclarationListEndPossibleShape`），不是初始化器内部的续接 |
| `<` `>` `>>` `>>>` | 类型面（尖括号配对 / 类型实参），归 D3c；本判据放行会让 `尖括号断言…缺少配对的 >` 从 throw 变 partial |
| `?.` `??` | 有既有显式拒绝账本（tts `throw/composite/class-ball`、`throw/composite/expression-zoo` 依赖它们保持抛错），行为一个字都不改 |

判据只读符号文本（C2 口径），不读源码字符、不看候选状态。

```ts
if (text === "!" || text === "?" || text === ":") {
  return true;
}
if (text === "<" || text === ">" || text === ">>" || text === ">>>") {
  return false;
}
if (text === "?." || text === "??") {
  return false;
}
return OperatorTable.IsBinaryOperator(text);
```

## static method PreviousIsShape:(units:Array<Token>, tokenIndex:int)=>bool

[D1:POSTFIX-BRACKET] 本括号格的前一个非 trivia 单元是不是**已经建出来的表达式形状**（或一只已闭合的括号 /
模板字面量）——即本括号是不是「后缀括号」。

是 ⇒ 这一格是元素访问 `o["f"]` / 调用 `f(x)` / `(a)(b)` / 标签模板后的后缀，归 P1 的后缀候选，
终结候选只继续等，不抛 C10。只认「紧邻」：中间隔着运算符时仍走原有分支。

为什么 `Bracket` / `String` 也算：`o["f"]()` 的**调用括号**紧跟在 `["f"]` 括号之后，这时下标格由
元素访问候选接手（它建完，`(` 的左边就是这个候选），而终结候选在 `(` 这一格只该等；
模板字面量同样是合法的后缀接收者（`` obj.tag`x`[0] ``）。误判的代价被 `FinishIncremental` 的
「未并入的括号」显式错误兜住（不会静默丢括号）。

```ts
const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (previous < 0) {
  return false;
}
const unit = units[previous];
if (unit instanceof ShapeToken) {
  return true;
}
if (unit instanceof Bracket) {
  return true;
}
return unit instanceof String;
```

## static method HasAtomInitializer:(units:Array<Token>)=>bool

[T9:ATOM-POSTFIX] `=` 之后的初始化器里是否已经有一个**登记过身份的原子根**
（`ExpressionAtomRegistry.Nodes` / `Containers` 的身份，不认任意形状）。

与 `HasContainerInitializer` 同一条纪律、多认一张表：`Nodes` 那一张是「增量主候选建出、收口格还能在
其后接续」的表达式根（R15 标签模板，T9 起加数字字面量）。它只用来判「这一格该不该等」，不参与建树。

```ts
const equalAt = VariableDeclarationEndPossibleShape.EqualIndex(units);
if (equalAt < 0) {
  return false;
}
for (let at = equalAt + 1; at < units.length; at++) {
  const unit = units[at];
  if (ExpressionAtomRegistry.HasNode(unit) || ExpressionAtomRegistry.HasContainer(unit)) {
    return true;
  }
}
return false;
```

## static method FollowsMemberSegment:(units:Array<Token>, tokenIndex:int)=>bool

[T9:ATOM-POSTFIX] 本格是不是**成员链的下一节**：前一格是属性名（`Common`），它前面（跳过 trivia）是
`.` / `?.` / `!` 之一。

`const a = 1 .toString[0]` 的 `[` 命中（`toString` 前面是 `.`）；`const a = f()[0]` 不命中
（前一格是已闭合的括号，走 `PreviousIsShape`）；`const a = 1 + 2[0]` 也不命中（`2` 前面是 `+`）。

```ts
const nameAt = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (nameAt < 0) {
  return false;
}
if (!(units[nameAt] instanceof Common)) {
  return false;
}
const dotAt = ItemUtil.PreviousCode(units, nameAt - 1);
if (dotAt < 0) {
  return false;
}
const unit = units[dotAt];
if (!(unit instanceof Symbol)) {
  return false;
}
const text = (unit as Symbol).TempToString();
return text === "." || text === "?." || text === "!";
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
