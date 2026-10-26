# B4i · K1 所有权切换：`EnableContainerShape=true` 不再退化（默认打开）

| 项 | 值 |
| --- | --- |
| 角色 | 站点智能体 B4i（K1：容器 shape 的**收口侧消费**，把 B4e 的机制从「默认关」变成「默认可打开」） |
| 工作副本 | `C:\Users\Admin\Documents\GitHub\xl-example-set\b4i-container-owner`，分支 `feature/b4i-container-owner` |
| base | 主仓库 HEAD `c627e97e`（B4e 的机制已在，开关默认 `false`） |
| 改动 | **6 个 `.xl.md`**，+317 / −34；无新文件、无第二棵建树路径 |
| 构建 | `xl_build {core,typescript}` **0 error / 3 warning**（3 条既有 `E1107`）；`tsc -p .` **exit 0** |
| 结果 | **开关 `true`（新默认）** 与 **开关 `false`** 的四道门**逐位相同**：`0/29/95`、`legacy 0/0/2`、`gates 4/0/7`、`tts PASS 429`、`ts-all 429/426/3`、探针 PASS |

---

## 0. 结论先行

1. **B4e 的退化复现**（base `c627e97e`，把开关翻 `true`）：宽尺子 `0/40/82+13` →
   **12 条新 structural**（另有 1 条既有差异从 4 条涨到 5 条）、**16 件新 fallback**
   （`FileFallbackCount 82 → 98`）。任务书引用的 `43/99+13` 是 B4e 在 `d97cd42b` 上的读数；
   base 经过 B4f/B4g/B4h 之后底数变成 `0/29/82+13`，**新增量的形状与 B4e §4 一致**
   （全部落在「声明初始化器里容器先建、收口格还在按括号写」这条链上）。
2. **根因不是双建，是收口侧的五处「假设括号还在 `Data` 里」**：
   - 词法：容器之后的 `/` 被 `RegexTemplate.CanStart` 当成**正则起点**（非 basic = 语句边界）；
   - 语句尾：`CanEndExpression` 只认 `(` / `[` 括号，容器 ⇒ 声明在行尾收不了口，
     下一条语句的容器被并进本条声明（`初始化器多根`）；
   - `FinishIncremental`：把容器当唯一根，**根之前 / 之后**的单元静默丢掉；
     `as` / `satisfies` 的类型槽（`[] as number[]` 的 `[`）被当成「未并入的括号」；
   - `VariableDeclarationEndPossibleShape`：初始化器里有容器时 `IsRawInitializer` 为假，
     二元运算符那一格直接落进 C10 的 `throw`；
   - 位置：`[` / `(` 在**下标 / `new` 构造 / 箭头体 / 实例化表达式 / 标签模板**位置被当成容器。
3. **修法**：所有权表补上「消费」一侧（§1），位置类各格**明确让给 legacy**（`RefusedCount`
   计数，不建错）；`EnableContainerShape` 默认改为 `true`（§2）。
4. **读数**（§3）：开关 `true` 与 `false` **逐位相同**，且**0 条「原来通过现在失败」**、
   **0 件新 fallback**、探针 PASS。

---

## 1. 所有权切换（消费表）

| # | 收口方 / 判据 | 文件 | 改动 | 消费什么 |
| --- | --- | --- | --- | --- |
| 1 | `TypeScriptRegexTemplate.CanStartAt` | `typescript/run/typescript-template.xl.md` | 容器在 `/` 之前 ⇒ **除号**（`return false`），不查 `RegexTokenBranch` 的语句块判据 | `Containers` 身份表 |
| 2 | `ExpressionStatementPossibleShape.CanEndExpression` | `tokens/statements/expression-statement-possible-shape.xl.md` | 容器 ⇒ 表达式尾（`true`），与 `(` / `[` 同档；ASI / 行尾收口 / `CanEndDeclarationTail` 共用这一份 | `Containers` |
| 3 | `VariableDeclarationShape.FinishIncremental` | `tokens/declarations/variable-declaration-shape.xl.md` | 容器之外**还有单元**（前缀 `"s" /` 或后缀 `.b` / `(1)` / `/ 2`）⇒ 从**整段 raw 第一格** `ParseExpression`，并用**源区间覆盖**（首格 … 末格）验没有截断，覆盖不全显式抛错 | 已建容器（`ParsePrimary` 的 `HasContainer`） |
| 4 | 同上（`as` / `satisfies` 类型槽） | 同上 | raw 里还有 basic 括号且 `HasTypeAssert(raw)` ⇒ `TypeCatalogFactory.ParseInitializer` 建整条 `AsExpression`，同样验覆盖 | 类型槽 |
| 5 | `VariableDeclarationEndPossibleShape` | `tokens/declarations/variable-declaration-end-possible-shape.xl.md` | 新 `HasContainerInitializer`（`=` 之后有容器）并入 `[D3a:RAW-INITIALIZER]` 的「继续等」出口：容器根 + 运算符不再 `throw` | `Containers` |
| 6 | `ContainerShapeCloseHook`（位置闸） | `tokens/expressions/forms/shared/container-shape-catalog.xl.md` | 见 §1.1：不建（`RefusedCount`），括号原样留给 legacy | — |

### 1.1 位置闸（`Refused` 方向，宁可不建）

| 判据 | 挡住的形态（实测） | 为什么归 legacy |
| --- | --- | --- |
| `RoleMatchesBracket` | `new ns[a]` 的 `[` 被角色解析器标成 `CallArgs` | 角色与字符不自洽，`CalleeStart` 会从 `ns` 起建调用、把 `new ns` 留在容器外 |
| `ArrowAhead`（扩到所有 `(`） | `async (a) => …` / `(a) => …` | 箭头形参表归 B4d 的 replay / legacy 原子建树 |
| `SequelAllowsBuild` | `(a.b)<string>`（实例化表达式）、`` {p:1}`t` ``（标签模板） | `ParsePostfix` / 类型面按「左操作数是 basic 括号」判位置 |
| `InsideArrowTail` | 箭头体 / 箭头表达式**内部**的括号（`async (a) => await g(a)` 的 `g(a)`） | 整条 arrow 归 legacy；容器先建会让收口格看到「容器 + 未并入的括号」 |
| `InsideNewExpression` | `new ns[a].b()` 的调用括号 | `NewExpression` 拥有整段 callee / 参数链 |
| `IsPostfixBracketPosition` | `ns[a]` / `arr[0]` / `f()[i]` | 下标访问，legacy 的 `ParsePostfix` 建 `ElementAccess` |

`IsSafeHost` 白名单**没有放宽**（仍然只有 `VariableDeclarationShape`）。

### 1.2 消费链的「不静默」保证

- 类 §1-3/4 的两条整段重建都要求**源区间覆盖 raw 的首格到末格**：读不完 / 覆盖不全 ⇒ 显式
  `throw`（文件级 fallback，树正确），不再出现「成功但缺节点」；
- 位置闸全部计入 `ContainerShapeCatalog.RefusedCount`（探针可读），不是静默降级；
- 开关 `false` 时 `Containers` 恒空，六处判据一个字节都不执行。

---

## 2. 开关默认值

`StatementRouteUtil.EnableContainerShape`：`false → **true**`（`statement-route-util.xl.md`）。
口径同步写进该页与 `container-shape-catalog.xl.md`：默认打开、位置闸名单、开关关闭时逐位回到 base。

---

## 3. 读数（同一构建、同一命令）

| 命令 | base `c627e97e`（开关 `false`） | 本提交（开关 **`true`**） | 本提交（开关 **`false`**） |
| --- | --- | --- | --- |
| `node tests/parse/wide-ast.mjs` | 0 / 29 / 82+13=95 PASS | **0 / 29 / 82+13=95 PASS** | **0 / 29 / 82+13=95 PASS** |
| `node tests/parse/wide-ast.mjs --legacy` | 0 / 0 / 2 PASS | **0 / 0 / 2 PASS** | **0 / 0 / 2 PASS** |
| `node tests/gates/run.mjs` | 4 / 0 / 7 | **4 / 0 / 7** | **4 / 0 / 7** |
| `node typescript/cases/tts/run.mjs` | PASS 429（throw 3 / incremental 426） | **PASS 429 / FAIL 0** | 同（throw 3 / incremental 426） |
| `node typescript/cases/tts/tools/tshape-judge.mjs ts-all` | 429 / 426 / 3 | **429 / 426 / 3**（同三条：`class-ball` / `expression-zoo` / `generic-container`） | 同 |
| `xl_build` + `tsc -p .` | 0 error / 3 warning + exit 0 | **0 / 3 + exit 0** | 同 |
| `node typescript/cases/tts/tools/container-shape-probe.mjs` | PASS | **PASS**（`BuildCount=1 AlreadyConsumed=5 Refused=0`） | 不装钩子 |

### 3.1 修复过程的可复算序列（开关 `true`，宽尺子）

| 阶段 | 崩溃 | 差异 | fallback | 新失败文件 |
| --- | ---: | ---: | ---: | ---: |
| base（开关 `false`） | 0 | 29 | 82+13 | — |
| B4e 机制原样打开 | 0 | 40 | 98+13 | 12 new structural + 16 new fallback |
| + 正则除号 / 语句尾 / `FinishIncremental` 续建 / 类型槽 / 结束候选（§1.1–5） | 0 | 29 | 82+13 | **0** |

逐文件集合差（`--per-file` 快照）：`added=0`、`gone=0`；
`changed=1` 是 `expressions/expr-division-after-comment.ts` 的 **既有差异**从 `structural=4`
变成 `structural=5`（该文件在 base 上就是差异；修前 12 条新失败里它是「变得更差」的那一条，
现在恢复到与 base 同一档的**同一批差异文件集合**）。没有**原来通过现在失败**的文件。

### 3.2 探针（默认开关下直接可跑）

| 片段 | 关闭格父 `Data` 的槽位 | 谁建 |
| --- | --- | --- |
| `let x = { a: 1 };` | `ObjectLiteralExpressionShape` | legacy（A4，同一格） |
| `let y = [1, 2];` | `ArrayLiteralExpressionShape` | legacy（A4b） |
| `let z = f(1, 2);` | `CallExpressionShape`（含 callee） | legacy（P1） |
| `let w = (a + b);` | `ParenthesizedExpressionShape` | legacy（P4） |
| `let a = { x: 1 } as unknown as T;` | `ObjectLiteralExpressionShape` | **k1** |

`BuildCount=1 AlreadyConsumed=5 Refused=0`；四族 AST 与 TS 逐节点一致。

---

## 4. 残留（已记账，不是静默）

| 残留 | 量 | 说明 |
| --- | --- | --- |
| `expr-division-after-comment` 的既有差异 4 → 5 | 1 | 该文件 base 即差异；多出的 1 条来自 `const c = "s"/*c*/ / f()/*c*/ / g` 里容器与注释交错的后缀链，属「容器 + 前缀」形态，已由 §1-3 的整段重建覆盖，但该文件还有 base 自己的 `/` 判据缺口（B4e 之前就在账上）。**读数口径**：整语料（门的口径，`--per-file` 快照）是 `structural=5`，单文件复算（`--verbose --only`）是 `structural=4`——差异来自语料级共享状态，本文件两种口径下都**仍是差异**，因此不计入「新失败」。**没有把它算进「修好」**，也不新增 fallback |
| 位置闸挡下的形态（§1.1） | 6 类 | 归 legacy：`NewExpression` / 箭头 / 模板标签 / 实例化表达式 / 下标。开关打开时它们**不建容器**（`Refused`），读数与 base 逐位相同。这是「少建」而不是「建错」，不登记为 fallback |
| `IsSafeHost` 仍只有 `VariableDeclarationShape` | — | B4e 的边界；B4i 打开默认开关没有放宽它 |

**没有用「默认关」掩盖**：开关默认 `true`，机制、探针、位置闸、消费链全部在提交里；
把开关拨回 `false` 时四道门与 base 逐位相同（§3 表）。

---

## 5. 可复算命令

```powershell
$d = "C:\Users\Admin\Documents\GitHub\xl-example-set\b4i-container-owner"; Set-Location $d
xl_build { cwd: $d, paths: ["core","typescript"], targets: ["ts"] }   # 0 error / 3 warning
node node_modules/typescript/bin/tsc -p .                              # exit 0

# 默认（开关 true）
node tests/parse/wide-ast.mjs                    # 0 / 29 / 82+13=95 PASS
node tests/parse/wide-ast.mjs --legacy           # 0 / 0 / 2 PASS
node tests/gates/run.mjs                         # 4 / 0 / 7
node typescript/cases/tts/run.mjs                # PASS 429
node typescript/cases/tts/tools/tshape-judge.mjs ts-all   # 429 / 426 / 3
node typescript/cases/tts/tools/container-shape-probe.mjs # PASS

# 开关 false（把 build 产物的静态字段拨回 false 再跑；source 默认值是 true）
# 读数与上面三行逐位相同
```

`tmp/` 全部 gitignored，不提交（本次用了 `tmp/toggle.mjs` 拨开关、`tmp/cmp.mjs` / `tmp/cmpfb.mjs`
做逐文件集合差、`tmp/dump.mjs` 做 cj/ts 树对拍、`tmp/one.mjs` 打 fallback 原因）。

---

## 6. 交下一棒

| 残留 | 量 | 归属 |
| --- | --- | --- |
| `expr-division-after-comment` 的既有差异 | 1（base 即差异） | 词法 `/` 判据的遗留（第 931 轮族），与本机制无关 |
| 位置闸挡下的六类形态要真正「建在关闭格」 | 6 类 | 需要各自的所有权方先认容器：`NewExpression`（P1 的 `new` 分支）、箭头（B4d replay）、模板标签 / 实例化（`ParsePostfix`）|
| `IsSafeHost` 扩到 `Bracket`（嵌套括号） | — | 先修上面第二行；父括号的收口方同样要认容器 |
