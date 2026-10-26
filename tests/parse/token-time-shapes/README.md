# token-time-shapes：逐字符 shape 树目标用例

「basic tokens → shape」重构阶段的目标用例目录。**本阶段禁用所有既有 gates**，
验收口径只有一份：`docs/expected-token-time-shapes.md` 里逐字符的 shape 树。

口径更正：样本 `let x = 2*3+1` 是 **13** 个字符，所以目标是 **14 步 = 13 char + EOF**
（不是 15 步）。文档里正好 13 个 `## [char N]` 小节 + 1 个 `## [EOF]`。

## 文件

| 文件 | 说明 |
| --- | --- |
| `let-x.ts` | 样本源码 `let x = 2*3+1`，**正好 13 字节、无尾随换行**（文档 EOF 节 `src=[0,13)` 可自证） |
| `let-x.expected.txt` | 文档期望的稳定抽取件：按 `## [char N]` / `## [EOF]` 分节，内容与文档 `text` 围栏块逐字节一致；由 `--sync-expected` 生成，**不要为让 diff 变绿而手改** |
| `legacy-corpus-baseline.json` | legacy（默认）模式的语料 AST 线指纹基线：`tests/cases/token/**/*.ts(x)` + `samples/*.ts` 共 **1723** 个文件，逐文件 sha256。WP-E 用它证明默认模式零回归；由 `--legacy-corpus --write-baseline` 生成。**渲染器切到 `Token.ToAstLine(0)` 后旧哈希全部失效，本基线已按新渲染器重算**；解析行为是否回归由最终 gates 把关（重构期不跑 gates） |

工具本身在上一级：`tests/parse/token-time-shapes.mjs`。

## 前提：构建

本机没有 `xl` CLI，用 DSH 的 `xl_build` 工具 + 仓库内 tsc：

```powershell
# 1) xl_build 工具：cwd=<repo 根>，paths=["core","typescript"]，targets=["ts"]
#    （不要传 cjcli.xl.md：它依赖已删除的 ./dawn/text/*，根级全量 build 会 E1006）
# 2) 编译
node node_modules/typescript/bin/tsc -p .
```

产物：`dist/ts/**/*.ts` → `build/ts/**/*.js`（当前各 **566** 个：560 基线 + WP-A 新增
`expressions/expression-catalog-factory`（1）+ WP-B 新增 `variable-declaration-possible-shape` /
`variable-declaration-end-possible-shape`（2）+ WP-C 新增 `binary-expression-possible-shape` /
`numeric-literal-possible-shape` / `right-operand-possible-shape`（3）；`dist` / `build` 都在 `.gitignore` 里）。

## 用法

```powershell
# 打印整棵逐字符树（格式同文档）
node tests/parse/token-time-shapes.mjs tests/parse/token-time-shapes/let-x.ts

# 与稳定期望文件逐节比对（本目录的验收命令，也挂成 npm run tts）
npm run tts

# 增量模式（打开 StatementRouteUtil.EnableIncrementalVariableShapes；也挂成 npm run tts:incremental）
npm run tts:incremental

# legacy 语料基线比对（也挂成 npm run tts:corpus）
npm run tts:corpus
```

| 选项 | 作用 |
| --- | --- |
| `--diff` | 与稳定期望文件 `let-x.expected.txt` 逐节比对，打印 PASS/FAIL 明细与合计 |
| `--from-doc` | `--diff` 的期望源改成 `docs/expected-token-time-shapes.md`（检测文档与稳定文件漂移） |
| `--expected <路径>` | `--diff` 的期望源改为指定文件（合成 / 探针用；也可写 `--expected=<路径>`） |
| `--json` | 输出 JSON（逐字符树（`tree` 是 `ToAstLine(0)` 的字符串）+ 比对结果；含 `mode` / `modeField` / `modeApplied`） |
| `--quiet` | diff / dump / 语料模式都只打一行汇总 |
| `--incremental` | 解析前把 `StatementRouteUtil.EnableIncrementalVariableShapes` 置 `true` |
| `--mode legacy\|incremental` | 与上一条等价；显式给 `legacy` 即强制默认路径（`--mode=incremental` 也可） |
| `--legacy-corpus [dir]` | 对目录下所有 `.ts` / `.tsx` + `samples/*.ts` 做整文档解析并比对 sha256；缺省 dir = `tests/cases/token` |
| `--write-baseline` | 采集并写入 `tests/parse/token-time-shapes/legacy-corpus-baseline.json`（单独给也隐含语料模式） |
| `--sync-expected` | 从 `docs/` 文档重新抽取稳定期望文件（无源码参数；抽取结果必须能原样读回） |

退出码：`0` 全部一致 / `1` 有差异（含 legacy 基线的 8 个 FAIL）/ `2` 工具 / 环境错误。

## 退出码与「什么算失败」

- `--diff`：某一步有任何一行不一致 ⇒ 该步 FAIL；全部一致 ⇒ 退出码 0。
- legacy 目标用例**天生是 6/8/14**（char 0–4 与 EOF PASS，char 5–12 是重构前的既有差距），
  所以 `npm run tts` 的退出码**正常就是 1**——它是基线，不是本次改动的失败信号。
- 增量模式的验收读数是 **14/14、退出码 0**（见下）。
- 语料模式：差异 0 ⇒ 退出码 0；任何文件指纹变化 / 缺失 / 新增都算差异。

## 两种模式（增量开关）

增量重构的唯一静态开关是 `StatementRouteUtil.EnableIncrementalVariableShapes`（**默认 `false`**，
契约见 `_coord/CONTRACT-tts-incremental.md` C4）。本工具是它唯一的「打开」入口：

```powershell
# legacy（默认）：开关保持 false，默认解析路径逐字节不变
npm run tts

# incremental：解析前把开关置 true
npm run tts:incremental
# 等价写法
node tests/parse/token-time-shapes.mjs tests/parse/token-time-shapes/let-x.ts --diff --incremental
node tests/parse/token-time-shapes.mjs tests/parse/token-time-shapes/let-x.ts --diff --mode incremental
```

- 开关字段名可用环境变量 `TTS_MODE_FIELD` 覆盖（形状文件改名时不必改工具）。
- 字段不存在（构建产物是旧版 / 被重命名）时：**stderr 一行提示，然后按 legacy 继续**，不算环境错误。
- 模式写进输出头部（`模式: legacy（…）`）与 `--json` 的 `mode` 字段。

### 增量模式的覆盖与验收口径

- **覆盖**：`let` / `const` / `var` + 单个 `Common` 标识符绑定 + 初始化器为数字字面量或 `*` / `+` 二元表达式
  （即 `let x = 2*3+1` 的 14 步路径）。其它形态按契约 C10 **显式抛错**，不会静默产出错误的树；
  开关为 `false` 时这些代码一步都不走。
- **验收**：`--diff --incremental` 必须 **PASS 14 / FAIL 0 / 14 步、退出码 0**；char 11 因文档期望块里的
  行尾注释而标 `[annotation-only]`，属允许项（容错规则见文末「注意」）。
- 两次独立进程跑同一条增量命令，stdout 应**逐字节相同**（验收时实测 sha256 一致）。
- 文档与实现的关系见 `docs/token-time-shapes-incremental.md`（开关、逐字符时序、覆盖边界、验证方法）。

## legacy 语料基线（默认模式零回归）

```powershell
# 采集（写入本目录 legacy-corpus-baseline.json）
node tests/parse/token-time-shapes.mjs --legacy-corpus --write-baseline

# 比对（0 差异 ⇒ 退出码 0）
npm run tts:corpus
node tests/parse/token-time-shapes.mjs --legacy-corpus --quiet     # 一行汇总
node tests/parse/token-time-shapes.mjs --legacy-corpus tests/cases/token
```

- 语料根缺省 `tests/cases/token`（另加 `samples/*.ts`），逐文件跑**整文档**解析
  （`context.Process(document)` → `Root.ToAstLine(0)`），按仓库相对路径（`/` 分隔）排序后算 sha256。
- 语料基线**固定 legacy 模式**：它的用途就是证明默认模式渲染出的 AST 线逐字节不变；即使同时给
  `--incremental` 也按 legacy 采集 / 比对（输出会写明）。
- 解析抛异常的文件也进基线（指纹 = `sha256("ERROR\n" + 错误描述)`）：错误文案同样是行为的一部分。
- 基线文件是**确定性产物**（无时间戳），重跑 `--write-baseline` 应得到逐字节相同的文件。

## 驱动口径

- 建一次 `TypescriptTemplate.Create()` + `SourceFileShape` + `SyntaxContext(shape, 32)`；
- `for i in [0, count)`：`context.ProcessRange(context.Root, new SourceRange(document, i, i+1), i)`，随后 dump；
- 循环结束后模拟 `SyntaxContext.Process` 的 EOF 收尾：`Index = count` → `Root.SignOut(count)`
  → `Root.Process(context, new SourceRange(document, count, count), count)` → `DrainMessages()`，再 dump 最后一步。

## 格式（与文档一致）

树**不由本工具自绘**：每一步直接取 `Token.ToAstLine(0)`（W1 的渲染器，实现在 `core/syntax/token.xl.md`）。
原先的 `dumpNode` / `formatNodeFields` / `appendChildren` / `treeLines` 已删除，格式只有那一处实现；
工具只保留「逐字符推进 + 与期望逐行比对」。下面是渲染器约定的输出格式：

- 每层缩进：子行 `├─ `（非末子）/ `└─ `（末子），子层前缀 `│  ` / `   `；根行无前缀。
- 形状节点：`<ClassName>  pos=<Pos>  src=[<Start>,<End>)`；`End < 0` → `未封`；`Pos < 0` / 缺省 → `pos=-`（basic token 无 `Pos` 字段，故不打印 `pos`）。
- 文本字段：basic token（`Common` / `WrapSymbol` / `Symbol`）`text="..."`（来自 `TempToString()`）；
  `IdentifierShape` 取 `EscapedText`、`NumericLiteralShape` 取 `Text`；
  运算符形状（`AsteriskTokenShape` / `PlusTokenShape` …）`op="..."`，由 `src` 区间原文切片。

## 注意

- 文档第 11 节期望块里有一行行尾注释（`src=[8,11)   ← 3 关闭即封口`），它不是 shape 字段。
  比对时**只容错期望侧的尾部注解**：期望行去掉 `/\s+←.*$/` 后与实际行相等 ⇒ 该行算一致，
  本步计 PASS 并在输出里标注 `[annotation-only]`；实际行的其它差异照旧 FAIL。
  工具不改文档、不改稳定期望文件。增量模式下 char 11 正是这样以 `[annotation-only]` 计 PASS。
- 工具只渲染 `Root` 的 shape 树（`Root.ToAstLine(0)`）；「同一段源码两次跑结果逐字节相同」已实测。
- **语料基线随渲染器重算**：旧渲染器（XML 时代）的哈希在 `ToAstLine(0)` 下必然全部不同，
  所以 `legacy-corpus-baseline.json` 是用同一条 `--legacy-corpus --write-baseline` 按新渲染器重算并提交的
  （1723 文件、解析异常 0）。它只保证「同一渲染器下解析行为逐字节不变」；解析行为的回归由最终 gates 把关，
  重构期按约定不跑 gates。
- 当前读数（暂存分支 `refactor/token-time-shapes` @ `b9b47f21`，本目录验收口径）：

  | 命令 | 读数 | exit |
  | --- | --- | --- |
  | `npm run tts`（legacy） | **PASS 6 / FAIL 8 / 14 步** | 1 |
  | `npm run tts:incremental` | **PASS 14 / FAIL 0 / 14 步**（char 11 `[annotation-only]`） | **0** |
  | `npm run tts:corpus` | **1723 文件 / 差异 0**（变化 0 / 缺失 0 / 新增 0；基线已按 `ToAstLine(0)` 重算） | 0 |

  6/8/14 是重构前的 legacy 基线（char 5–12 未通过），不是回归；增量模式的 14/14 是本轮重构的验收结论。
