# token-time-shapes：逐字符 shape 树目标用例

「basic tokens → shape」重构阶段的目标用例目录。**本阶段禁用所有既有 gates**，
验收口径只有一份：`docs/expected-token-time-shapes.md` 里逐字符的 shape 树。

## 文件

| 文件 | 说明 |
| --- | --- |
| `let-x.ts` | 样本源码 `let x = 2*3+1`，**正好 13 字节、无尾随换行**（文档 EOF 节 `src=[0,13)` 可自证） |
| `let-x.expected.txt` | 文档期望的稳定抽取件：按 `## [char N]` / `## [EOF]` 分节，内容与文档 `text` 围栏块逐字节一致；由 `--sync-expected` 生成，**不要为让 diff 变绿而手改** |

工具本身在上一级：`tests/parse/token-time-shapes.mjs`。

## 前提：构建

本机没有 `xl` CLI，用 DSH 的 `xl_build` 工具 + 仓库内 tsc：

```powershell
# 1) xl_build 工具：cwd=<repo 根>，paths=["core","typescript"]，targets=["ts"]
#    （不要传 cjcli.xl.md：它依赖已删除的 ./dawn/text/*，根级全量 build 会 E1006）
# 2) 编译
node node_modules/typescript/bin/tsc -p .
```

产物：`dist/ts/**/*.ts` → `build/ts/**/*.js`（各 560 个；`dist` / `build` 都在 `.gitignore` 里）。

## 用法

```powershell
# 打印整棵逐字符树（格式同文档）
node tests/parse/token-time-shapes.mjs tests/parse/token-time-shapes/let-x.ts

# 与稳定期望文件逐节比对（本目录的验收命令，也挂成 npm run tts）
npm run tts

# 直接与 docs/expected-token-time-shapes.md 比对（检测文档漂移）
node tests/parse/token-time-shapes.mjs tests/parse/token-time-shapes/let-x.ts --diff --from-doc

# JSON（逐字符树 + 比对结果，便于脚本消费）
node tests/parse/token-time-shapes.mjs tests/parse/token-time-shapes/let-x.ts --diff --json

# 从文档重新抽取稳定期望文件（自检：抽出的文件必须能原样读回）
node tests/parse/token-time-shapes.mjs --sync-expected
```

退出码：`0` 全部一致 / `1` 有差异 / `2` 工具或环境错误。

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
  工具**不裁剪期望**；若某步仅差这行注释，会额外标注「仅差文档行尾内嵌注释」。
- 工具只 dump `Root.Data` 的 shape 树；「同一段源码两次跑结果逐字节相同」已实测。
- 当前基线（`feature/all-possible` @ 3a0623c3）：**PASS 6 / FAIL 8 / 14 步**（char 0–4 与 EOF 通过，char 5–12 未通过）。
