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
| `legacy-corpus-baseline.json` | legacy（默认）模式的语料 XML 指纹基线：`tests/cases/token/**/*.ts` + `samples/*.ts` 共 **1723** 个文件，逐文件 sha256。WP-E 用它证明默认模式零回归；由 `--legacy-corpus --write-baseline` 生成 |

工具本身在上一级：`tests/parse/token-time-shapes.mjs`。

## 前提：构建

本机没有 `xl` CLI，用 DSH 的 `xl_build` 工具 + 仓库内 tsc：

```powershell
# 1) xl_build 工具：cwd=<repo 根>，paths=["core","typescript"]，targets=["ts"]
#    （不要传 cjcli.xl.md：它依赖已删除的 ./dawn/text/*，根级全量 build 会 E1006）
# 2) 编译
node node_modules/typescript/bin/tsc -p .
```

产物：`dist/ts/**/*.ts` → `build/ts/**/*.js`（各 **561** 个：560 基线 + 新增
`typescript/tokens/expressions/expression-catalog-factory.xl.md`；`dist` / `build` 都在 `.gitignore` 里）。

## 用法

```powershell
# 打印整棵逐字符树（格式同文档）
node tests/parse/token-time-shapes.mjs tests/parse/token-time-shapes/let-x.ts

# 与稳定期望文件逐节比对（本目录的验收命令，也挂成 npm run tts）
npm run tts

# 直接与 docs/expected-token-time-shapes.md 比对（检测文档漂移）
node tests/parse/token-time-shapes.mjs tests/parse/token-time-shapes/let-x.ts --diff --from-doc

# JSON（逐字符树 + 比对结果，便于脚本消费；含 mode / modeField / modeApplied）
node tests/parse/token-time-shapes.mjs tests/parse/token-time-shapes/let-x.ts --diff --json

# 从文档重新抽取稳定期望文件（自检：抽出的文件必须能原样读回）
node tests/parse/token-time-shapes.mjs --sync-expected
```

退出码：`0` 全部一致 / `1` 有差异 / `2` 工具 / 环境错误。

## 两种模式（增量开关）

增量重构的唯一静态开关是 `StatementRouteUtil.EnableIncrementalVariableShapes`（**默认 `false`**，
契约见 `_coord/CONTRACT-tts-incremental.md` C4）。本工具是它唯一的「打开」入口：

```powershell
# legacy（默认）：开关保持 false，默认解析路径逐字节不变
npm run tts

# incremental：解析前把开关置 true（目前还没有形状接它，读数应与 legacy 相同）
node tests/parse/token-time-shapes.mjs tests/parse/token-time-shapes/let-x.ts --diff --incremental
# 等价写法
node tests/parse/token-time-shapes.mjs tests/parse/token-time-shapes/let-x.ts --diff --mode incremental
```

- 开关字段名可用环境变量 `TTS_MODE_FIELD` 覆盖（形状文件改名时不必改工具）。
- 字段不存在（构建产物是旧版 / 被重命名）时：**stderr 一行提示，然后按 legacy 继续**，不算环境错误。
- 模式写进输出头部（`模式: legacy（…）`）与 `--json` 的 `mode` 字段。

## legacy 语料基线（默认模式零回归）

```powershell
# 采集（写入本目录 legacy-corpus-baseline.json）
node tests/parse/token-time-shapes.mjs --legacy-corpus --write-baseline

# 比对（0 差异 ⇒ 退出码 0）
node tests/parse/token-time-shapes.mjs --legacy-corpus
node tests/parse/token-time-shapes.mjs --legacy-corpus --quiet     # 一行汇总
node tests/parse/token-time-shapes.mjs --legacy-corpus tests/cases/token
```

- 语料根缺省 `tests/cases/token`（另加 `samples/*.ts`），逐文件跑**整文档**解析
  （`context.Process(document)` → `Root.ToXmlString()`），按仓库相对路径（`/` 分隔）排序后算 sha256。
- 语料基线**固定 legacy 模式**：它的用途就是证明默认模式的 XML 逐字节不变；即使同时给
  `--incremental` 也按 legacy 采集 / 比对（输出会写明）。
- 解析抛异常的文件也进基线（指纹 = `sha256("ERROR\n" + 错误描述)`）：错误文案同样是行为的一部分。
- 基线文件是**确定性产物**（无时间戳），重跑 `--write-baseline` 应得到逐字节相同的文件。

## 驱动口径

- 建一次 `TypescriptTemplate.Create()` + `SourceFileShape` + `SyntaxContext(shape, 32)`；
- `for i in [0, count)`：`context.ProcessRange(context.Root, new SourceRange(document, i, i+1), i)`，随后 dump；
- 循环结束后模拟 `SyntaxContext.Process` 的 EOF 收尾：`Index = count` → `Root.SignOut(count)`
  → `Root.Process(context, new SourceRange(document, count, count), count)` → `DrainMessages()`，再 dump 最后一步。

## 格式（与文档一致）

- 每层缩进：子行 `├─ `（非末子）/ `└─ `（末子），子层前缀 `│  ` / `   `；根行无前缀。
- 形状节点：`<ClassName>  pos=<Pos>  src=[<Start>,<End>)`；`End < 0` → `未封`；`Pos < 0` / 缺省 → `pos=-`（basic token 无 `Pos` 字段，故不打印 `pos`）。
- 文本字段：basic token（`Common` / `WrapSymbol` / `Symbol`）`text="..."`（来自 `TempToString()`）；
  `IdentifierShape` 取 `EscapedText`、`NumericLiteralShape` 取 `Text`；
  运算符形状（`AsteriskTokenShape` / `PlusTokenShape` …）`op="..."`，由 `src` 区间原文切片。

## 注意

- 文档第 11 节期望块里有一行行尾注释（`src=[8,11)   ← 3 关闭即封口`），它不是 shape 字段。
  比对时**只容错期望侧的尾部注解**：期望行去掉 `/\s+←.*$/` 后与实际行相等 ⇒ 该行算一致，
  本步计 PASS 并在输出里标注 `[annotation-only]`；实际行的其它差异照旧 FAIL。
  工具不改文档、不改稳定期望文件。
- 工具只 dump `Root.Data` 的 shape 树；「同一段源码两次跑结果逐字节相同」已实测。
- 当前基线（暂存分支 `refactor/token-time-shapes` @ `5ced7ace`）：**PASS 6 / FAIL 8 / 14 步**
  （char 0–4 与 EOF 通过，char 5–12 未通过；char 11 的失败是结构差异，不是那行注解）。
