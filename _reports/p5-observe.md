# P5 观测基线：哪些用例还在走「Close 全量解析」

- 分支：`feat/p5-observe`（从 `feature/all-possible-1101` @ `4a0f3505` 拉出）
- 工作树：`C:\Users\Admin\Documents\GitHub\xl-example-set\p5-observe`；主仓库未改动
- 观测范围：`typescript/cases/tts/success`（302 个 `.ts`，逐字符推进，单进程）

## 1. 计数点（行为不变）

`typescript/shapes/types/type-parser-api.xl.md` 新增两个静态计数器和读/清方法：

```ts
static AliasFallbackCount = 0;         // ParseAlias 调用次数
static ReturnTypeFallbackCount = 0;    // ParseCompleteReturnType 调用次数
static ResetFallbackCounts() { ... }   // 用例之间归零
static FallbackCount(): int            // 两者之和
```

自增放在 `ParseAlias` / `ParseCompleteReturnType` 内部（调用点不动），因此**所有**走整段解析的调用都会被计入，
不区分调用来自哪个 shape。计数器不打印日志，只被 `type-coverage.mjs` 读取。

## 2. 两条兜底路径的归属

| 位置 | 归属 |
| --- | --- |
| `type-alias-declaration-shape.xl.md:51` | `Close` 里 `HasBuiltType()` 为假 → **兜底**（整段 `ParseAlias`） |
| `type-alias-end-possible-shape.xl.md:92` | `BuildByIndex` 里 `if (alias.HasBuiltType()) { TryToClose } else { ParseAlias }` 的 **else 分支** → 同类**兜底**，不是正常收口：是 PossibleShape 提前收口（语句起点/分号）时发现类型没建出来，退化成整段解析 |
| `type-function-incremental.xl.md:60` | `ReturnTypeContextShape.Finish` 的 else 分支 → 函数返回类型**兜底** |

实测（success 302）：`ParseAlias` 的 22 次命中**全部**来自 `type-alias-declaration-shape` 的 `Close`；
`type-alias-end-possible-shape:92` 这条 else 分支命中 **0 次**（当前语料没有触发「PossibleShape 提前收口 + 类型未建」的组合），
所以它是"已存在但未被基线覆盖"的兜底路径。

## 3. 基线数字（success 302）

| 指标 | 数值 |
| --- | --- |
| 用例数 | 302（失败 0） |
| 走兜底的用例数 | **23** |
| 兜底总次数 | **23**（`ParseAlias` 22 + `ParseCompleteReturnType` 1） |
| IdentifierShape 总数 | **677** |
| 迟到标识符（`CreatedAt - SourceRange.Start > 2`） | **58**（分布在 30 个用例；兜底用例里 31 个，非兜底用例 27 个） |
| 单例最大迟到 | **+43**（`types/alias-object-call-construct.ts`，标识符 `a`） |

兜底用例名单（全部在 `types/`，每个 1 次）：

- `alias-object-*`（5）：`alias-object`, `alias-object-method`, `alias-object-call-construct`, `alias-object-index-readonly`, `alias-object-optional-readonly`
- `alias-tuple-*`（4）：`alias-tuple`, `alias-tuple-named`, `alias-tuple-optional`, `alias-tuple-rest`
- `alias-mapped-*`（3）：`alias-mapped`, `alias-mapped-modifiers`, `alias-mapped-remap`
- `alias-fn-type*`（2）：`alias-fn-type`（走 `ParseCompleteReturnType`），`alias-fn-type-generic`
- 其余（9）：`alias-ctor-type-abstract`, `alias-import-type`, `alias-keyof`, `alias-literal-string`, `alias-parenthesized`, `alias-readonly-array`, `alias-recursive`, `alias-template-literal`, `alias-typeof-query`

注意：23 个兜底用例里 22 个是类型别名整段解析，唯一一个 `alias-fn-type` 是**函数返回类型**兜底
（别名的类型建出来了，但别名内部的函数类型返回类型上下文退化成整段解析）。

### 与主报告 60 的差异

我测到 **58**，你测到 60；`IdentifierShape 677` 和 `最多 +43` 完全一致，说明标识符全集相同，
差异只在边界/测量时刻上（差 2）。同一次运行的其它口径对比：最终树（含 EOF 步）`>2` = 58；
不含 EOF 步 = 26；用 `Pos` 代替 `SourceRange.Start` = 73；用 `CreatedRevisionAt` = 7。
`>2` 边界上恰好有 6 个标识符差值为 3，口径或时刻略变就会挪动 1~2 个，故 58/60 属同一基线的测量抖动，不是树不同。
本工具的规则固定为：最终树、`CreatedAt >= 0`、`SourceRange.Start >= 0`、差值严格 `> 2`。

## 4. 工具输出样例

`node typescript/tools/type-coverage.mjs`（前 10 行 + 汇总）：

```text
  typescript/cases/tts/success/controls/cond-element.ts fallback=0 lateIdentifiers=0
  typescript/cases/tts/success/controls/cond-member.ts fallback=0 lateIdentifiers=0
  typescript/cases/tts/success/controls/cond-postfix.ts fallback=0 lateIdentifiers=0
  typescript/cases/tts/success/controls/cond-ternary.ts fallback=0 lateIdentifiers=0
  typescript/cases/tts/success/controls/for-member-bare-body.ts fallback=0 lateIdentifiers=0
  typescript/cases/tts/success/controls/for-member-clause.ts fallback=0 lateIdentifiers=0
  typescript/cases/tts/success/controls/if-binary-member-condition.ts fallback=0 lateIdentifiers=0
  typescript/cases/tts/success/controls/if-call-body.ts fallback=0 lateIdentifiers=0
  typescript/cases/tts/success/controls/if-call-condition.ts fallback=0 lateIdentifiers=0
  typescript/cases/tts/success/controls/if-member-bare-body.ts fallback=0 lateIdentifiers=0
```

```text
汇总: 用例 302 / 兜底用例 23 / 兜底总次数 23 / 迟到标识符 58 (IdentifierShape 677, 最多 +43 a @ typescript/cases/tts/success/types/alias-object-call-construct.ts)
```

`--json` 的结构（summary 部分）：

```json
{"dir":"typescript/cases/tts/success","cases":302,"failed":0,"fallbackCases":23,"fallbackTotal":23,
 "aliasFallbackTotal":22,"returnTypeFallbackTotal":1,"identifiers":677,"lateIdentifiers":58,
 "lateThreshold":2,"maxLate":43,"maxLateCase":"typescript/cases/tts/success/types/alias-object-call-construct.ts","maxLateText":"a"}
```

## 5. 回归证据

`node typescript/cases/tts/run.mjs`（原文）：

```text
[tts] success: 302 case, PASS 302 / FAIL 0
[tts] TOTAL 302 case, FAIL 0
```

构建（`node C:\Users\Admin\Documents\GitHub\xl-example-set\_tools\xl-build.mjs`，等价 `xl build`）：

```text
xl build: ok=true errors=0 warnings=0
```

`node node_modules\typescript\bin\tsc -p tsconfig.json` exit code 0。

302/302 通过即逐字树与 HEAD 一致（run.mjs 逐节点比对解析树），计数器没有改变任何解析行为。
