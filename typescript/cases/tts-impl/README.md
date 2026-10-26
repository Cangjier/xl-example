# tts-impl — 已支持增量形状回归 cases

这个目录是**「已支持」的回归基线**：一条 case 能放在这里，唯一条件是它在增量模式下
分类为 `incremental`（标的 shape 首次出现严格早于 legacy）。判据与 `typescript/cases/tts`
同源，但验收口径收紧成一条——**不是 incremental 就 FAIL**。

它和 `tts` 是一枚硬币的两面：

| 目录 | 回答的问题 | 允许的分类 |
| --- | --- | --- |
| [`typescript/cases/tts`](../tts/) | 覆盖边界在哪里？哪些形态**还不支持**？ | `throw` / `atomic` / `partial` / `incremental`（账本已于 2026-10 清空，保留分类定义） |
| `typescript/cases/tts-impl`（本目录） | **已经支持**的形态有没有退化？ | 只有 `incremental`（其余一律 FAIL） |

支持工作做完后，把 case 从 `tts` **单向**迁进来（见下文「迁移流程」）；本目录的 case
一旦被判成非 `incremental`，就是回归信号，要么修增量实现，要么按上游明确降级把 case 退回
`tts` 并同步改那边的分类目录。**不允许**在两个目录各留一份。

## 与 tts 的关系（实现上）

- 判定算法**复制改造**自 [`typescript/cases/tts/run.mjs`](../tts/run.mjs)，不 import 它的私有函数：
  两个工具各自独立，改一个不会悄悄影响另一个。
- 同一套驱动：同一份源码**在同一进程内跑两遍**，唯一变量是静态开关
  `StatementRouteUtil.EnableIncrementalVariableShapes`（`false` = legacy，`true` = incremental），
  都按「一次吃一个字符 + EOF 收尾」推进，每步取 `Root.ToAstLine(0)`。
- 同一套 identity：shape 节点 identity = `(类名, pos)`（`pos` 是 AST 起点、含前导 trivia，两模式一致）；
  basic token 不参与比较；比较 EOF 树时忽略 `src` 区间。
- 同一套分类名：`throw` / `atomic` / `partial` / `incremental`，外加结构异常 `invalid` / `divergent`。
- 保留的统计：提前出现的 shape 节点数、其中标的关键节点（`earlier`）、骨架节点数、
  两模式 EOF 的残留 basic 行差（`residualBasicLines`）、是否只有 `src` 区间不同（`rangeOnlyDifference`）。

## 验收口径

一条 case **PASS** 当且仅当：

1. 增量模式下分类为 `incremental`；`throw` / `atomic` / `partial` 一律 FAIL；
2. 两模式 EOF shape 树一致；`divergent` 即 FAIL（结构异常，不是「未支持」）；
3. 两种模式都不解析抛错；`invalid` 即 FAIL；
4. 源码是合法 TS（`typescript` 的 `parseDiagnostics` 为空）。

FAIL 行会给出 `actual=<实际分类>` 与判定依据 / `reason`，例如：

```text
FAIL  expressions/bin-add  actual=partial —— 只有变量声明骨架增量 —— 仅外层增量，不该在 tts-impl
      reason: 只有 3 个骨架节点提前
```

退出码与 `tts` 一致：`0` 全部 incremental；`1` 有 FAIL；`2` 环境错误（构建产物缺失、参数错误等）。

## 目录约定

```text
typescript/cases/tts-impl/
  run.mjs                     # 判定器（同 tts 的解析/判定逻辑，判定口径收紧）
  README.md                   # 本文件
  cases/<area>/<name>.ts      # 每条 case 一个最小可复现片段
  INDEX.md                    # 全部 case + 分类 + 判定依据（--write-index 生成，不要手改）
```

`area` 与 `tts` 历史的 `cases/incremental/<area>/` 一一对应，迁移时**只去掉 `incremental` 这一层**：
`declarations` / `expressions` / `lexical` / `statements` / `types` / `controls`。

### case 写法约定

- 最小可复现片段、合法 TS、**以换行结尾**（让最后一个 token 有机会在 EOF 前关闭；
  唯一例外可参考 `tts` 里的 `controls/let-mul-add.ts`）。
- 一条 case 只放一个语法构造；不加说明性注释、不写多段无关代码——**逐字符时序是判据的一部分**，
  任何多余字符都会改变步号（注释本身是被测词法形态时，注释写在被测位置）。
- **迁移时文件内容逐字节不变**（只用 `git mv`，不顺手格式化），否则判定步号会变，
  本来 `incremental` 的 case 可能变成别的分类。
- case 的 `id` = `<area>/<name>.ts`（在 `tts` 里是 `incremental/<area>/<name>.ts`）。

## 用法

前提：先有 `build/ts/**`（构建链见根目录 README）：

```powershell
# 本机没有 xl CLI 时用 DSH 的 xl_build 工具：
#   xl_build { cwd: <repo>, paths: ["core","typescript"], targets: ["ts"] }    # 不传 out
node node_modules/typescript/bin/tsc -p .
```

```powershell
node typescript/cases/tts-impl/run.mjs                        # 全量：逐条 PASS/FAIL + 汇总
node typescript/cases/tts-impl/run.mjs --quiet                # 只留一行 PASS/FAIL 汇总
node typescript/cases/tts-impl/run.mjs --filter expressions   # 只跑某个 area
node typescript/cases/tts-impl/run.mjs --show expressions/bin-add
node typescript/cases/tts-impl/run.mjs --json tmp/tts-impl-report.json
node typescript/cases/tts-impl/run.mjs --write-index          # 重写 INDEX.md
npm run tts:impl                                             # 等价于 node ./typescript/cases/tts-impl/run.mjs
```

输出是确定性的：无时间戳、无随机序，两次独立进程的 `--json` 输出**逐字节相同**，
可以直接进 CI 做字节比对。

## 迁移流程（历史契约，迁移已完成）

迁移已完成，以下流程不再需要执行；保留供追溯。

前提：该形态在 `tts` 里已经从 `throw` / `atomic` / `partial` 升到 `incremental`。

```powershell
# 1) 在 tts 里确认实测分类（actual 必须是 incremental）
node typescript/cases/tts/run.mjs --show incremental/statements/let-number-statement

# 2) 只用 git mv 迁入（去掉 incremental 这一层，内容不改）
git mv typescript/cases/tts/cases/incremental/<area>/<name>.ts `
       typescript/cases/tts-impl/cases/<area>/<name>.ts

# 3) 重生成两处 INDEX
node typescript/cases/tts/run.mjs --write-index
node typescript/cases/tts-impl/run.mjs --write-index

# 4) 验收：tts 剩余条数 PASS / FAIL 0，tts-impl 累计迁入条数 PASS / FAIL 0
node typescript/cases/tts/run.mjs --quiet
node typescript/cases/tts-impl/run.mjs --quiet
npm run tts:impl --silent
```

规则：

- **只迁 `incremental`**：`throw` / `atomic` / `partial` 不迁（它们还不是「已支持」）。
- **只迁一次**：迁移后 `tts` 里不应再有同一条 case。
- `git mv` 后必须重生成两处 INDEX —— 两个 INDEX 都是自动生成的，不手改。
- 支持范围往往一次迁多条；一个功能智能体迁入的条数 = `tts-impl` PASS 数相对基线的增量。

## 现状

累计 **425 条**，全部 `incremental`。构成：原 `tts` 账本的 **56 条剩余缺口** + 历史 **369 条** = **425**。

| area | 条数 |
| --- | ---: |
| controls | 5 |
| declarations | 90 |
| expressions | 110 |
| lexical | 60 |
| statements | 80 |
| types | 80 |
| 合计 | **425** |

验收读数：

```powershell
node typescript/cases/tts-impl/run.mjs --quiet   # PASS 425 / FAIL 0
node typescript/cases/tts/run.mjs --quiet        # PASS 0 / FAIL 0（空账本，exit 0）
```

迁移叙事：基线 `feature/all-possible` @ `980edc1d` 起首批迁入 45 条；其后各 WP 持续迁入，
至 `tts` 清空时历史累计 369 条。最后 56 条剩余缺口（原 `throw` / `atomic` / `partial` 账本）
在 2026-10 收尾中全部实现增量支持并迁入，`tts` 账本归零，本目录成为唯一回归基线。

## FAIL 的含义与处理

| FAIL 的 actual | 含义 | 处理 |
| --- | --- | --- |
| `throw` | 增量路径开始显式拒绝该形态 | 增量实现回归：修实现（这是本目录要拦住的回归） |
| `atomic` | 开关对该形态不再有任何时序影响 | 同上：增量路径不再接管该形态 |
| `partial` | 只剩骨架增量 | 同上：标的（初始化器 / 子语句）退化回原子建树 |
| `divergent` / `invalid` | 两模式 EOF 树不同 / 解析抛错 | 结构异常，先查实现与 case 内容 |
| （TS 语法不合法） | case 本身不合法 | 修 case；合法 TS 是写 case 的硬约定 |

**不要**为了让 `tts-impl` 变绿而把 case 挪回 `tts`：那会同时掩盖回归和账本口径。
确属上游明确降级时，先改 `tts` 的分类目录与 README 现状表，再从 `tts-impl` 删掉/退回，并在提交说明里写清。
