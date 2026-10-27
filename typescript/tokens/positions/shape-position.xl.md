# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class ShapePosition

**增量形状的 `Pos` 唯一口径（R3）。** `Pos` 是 AST 要求的「前对 trivia 起点」，即
`ts.createSourceFile` 里节点的 `pos`：**该节点第一个字符之前、上一个 token 结束之后**的位置。
所以它不是「节点自己的 `SourceRange.Start`」——前者包含前置空白 / 注释，后者只含代码。

`src`（`SourceRange`）永远由 `*Shape.FromBasicToken` 从 basic 单元照抄，**本工具不碰**。
本类只回答一件事：某个容器里新造出来的那个单元，`Pos` 该填几。

## static method PosAt:(host:Token, units:Array<Token>, index:int)=>int

给定 `host`（新单元要挂进的容器）、`units`（`host.Data`）、`index`（新单元在 `units` 里的下标）：

1. 从 `index - 1` 往前跳过 `IsTriviaToken`，找到**第一个 code 单元** ⇒ 返回它的 `SourceRange.End`。
   这正是 TS 的「full start」：上一个 token 一结束，本节点的 `pos` 就定了，中间的空白 / 注释全算进来。
2. 找不到 code 单元（新单元是容器里的**第一个**代码单元）：
   - `host instanceof Bracket` ⇒ 返回 host **开启符的 End**，即 `host.SourceRange.Start + 1`。
     开启符是单个字符（`(` / `[` / `{`），所以「开启符 End」= 开启符 Start + 1。
     **不能读 `host.SourceRange.End`**：Bracket 的 `End` 指的是**闭合**符之后（`[3,17)`），
     对还没闭合的括号它甚至是 `-1`；第一个子单元的 `pos` 与闭合符无关。
   - 其它宿主（`StatementShape` / 各类 `DeclarationShape` / `SourceFileShape`）⇒ 返回
     `host.SourceRange.Start`；宿主自己还没签入（`< 0`）时返回 `0`。
3. 上一个 code 单元的 `End` 还没签出（`< 0`）时继续往前找，找不到就退回第 2 条。

**为什么不按文档字符重扫**：`ExpressionBracketPossibleShape.PosAt` 与 legacy 的
`ExpressionBuilder.Load` 都是「从开启符 +1 往后逐格走、遇到非 trivia 就记一次 End」，
与本类第 1 条对同一个 `index` 给出同一个答案（走的格子集合不同，命中的「上一个 code 单元」相同）。
本类只往**后**看一格，不做整段重扫，所以接在增量装配里也一样便宜。

**迁移台账（R3）**——谁已经改走这一份，谁保留自己的口径：

| 站点 | 处置 | 理由 |
|---|---|---|
| `ControlHeadPossibleShape.PosAt` | **改走本类** | 原来「没有前一个 code 单元」时退到单元自己的 `Start`，漏了括号开启符，`if (\n  a\n)` 差 3 |
| `ExpressionBracketPossibleShape.PosAt` | **改走本类**（签名留壳） | 逐位等价：`{`/`[`/`(` 里第一格 = 开启符 End |
| `NamedImportsPossibleShape` / `NamedExportsPossibleShape` / `ObjectBindingPatternPossibleShape` 的 `BuildByIndex` | **改走本类** | 原来手抄同一套循环，且 fallback 写 `bracket.Start`（不含前导 trivia） |
| `ImportAttributesPossibleShape.BuildByIndex` | **改走本类**（下标传 `at`） | 该形状从关键字 `with`/`assert` 起替换，起点是 `at` 不是括号那一格 |
| `ParameterListPossibleShape.PreviousParamPos` | 保留 | 顺序是「先壳、后 `Data`」：`...` / `:` 已被吃进壳、不在 `Data` 里，只看 `Data` 会退成逗号的 End（R1 已修一条漂移）。它的括号 fallback 本来也是 `Start + 1` |
| `IncrementalItemPosition.AfterPreviousCode` | 保留 | 没有 `host` 形参，fallback 固定 `0`；它的调用点宿主都是变量 / 二元 / 右操作数这类**从 0 开始**的声明形状，`0` 与 `host.Start` 同值。改成带 `host` 要动五个调用面，收益为 0 |
| `BodyGuideUtil.BasePos` / `MemberShellCatalog` / `StatementBuilder` 的 `Positions[...]` | 保留 | 那是 legacy `ExpressionBuilder.Positions` 的**同一口径镜像**（rule 4 的「已有 legacy shape 的 Pos 保持原口径」）：它们必须与 legacy 逐字节相同，不能换成通用规则 |
| `AbstractKeywordShape` / `DeclareKeywordShape` / `ExportKeywordShape` 的 `FromBasicToken` | 保留 | 那里填的是**占位**，宿主（`ClassDeclarationShape` 等）随后按含前导 trivia 的口径覆盖 |

```ts
if (index < 0 || index > units.length) {
  return ShapePosition.HostStart(host);
}
for (let at = index - 1; at >= 0; at--) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  const end = unit.SourceRange.End;
  if (end >= 0) {
    return end;
  }
}
return ShapePosition.HostStart(host);
```

## static method HostStart:(host:Token)=>int

容器里没有更早的 code 单元时，`pos` 落回容器自己的起点：括号容器是**开启符 End**，
其它容器是**容器 Start**。两条都按「开启符 / 容器尚未签入」退回 `0`。

```ts
if (host instanceof Bracket) {
  const start = host.SourceRange.Start;
  if (start >= 0) {
    return start + 1;
  }
  return 0;
}
const start = host.SourceRange.Start;
if (start >= 0) {
  return start;
}
return 0;
```

## static method PreviousCode:(units:Array<Token>, index:int)=>int

`units` 里 `index` 之前（含 `index`）最近的 code 单元下标；没有就 `-1`。
只给「本单元已经是第一个 code 单元」这类判断用，不参与 `Pos` 计算。

```ts
for (let at = index; at >= 0; at--) {
  if (!units[at].IsTriviaToken) {
    return at;
  }
}
return -1;
```
