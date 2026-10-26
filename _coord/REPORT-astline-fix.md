# REPORT-astline-fix：ToAstLine 重构暴露的两个问题

工作区：`C:\Users\Admin\Documents\GitHub\xl-example-set\astline-fix`（canonical `633d22ed` 的独立克隆，
`node_modules` 从 canonical 复制；主仓库全程未改）。**本目录保留**，后续合并成员从这里 fetch `astline-sites`。

## 1. 修了什么

### 问题 1（阻塞）：legacy EOF 丢 `op="*"` / `op="+"`

- 期望（`docs/expected-token-time-shapes.md` 的 `## [EOF]` 段）：
  ```
  │  ├─ AsteriskTokenShape  pos=9  src=[9,10)  op="*"
  ├─ PlusTokenShape  pos=11  src=[11,12)  op="+"
  ```
- 根因：`ShapeToken.AstOperator()` 只读 `(this as any).Op`；`Op` 只在增量工厂 `FromSymbol` 里赋值，
  legacy 建树路径不赋 `Op`（旧工具是按 `src` 切原文补的）⇒ legacy 行文本只剩 `AsteriskTokenShape  pos=9  src=[9,10)`。
- 修复（`core/syntax/shape-token.xl.md` 的 `## method AstOperator:()=>string`）：`Op` 非空直接用；否则
  **只对类名以 `TokenShape` 结尾的形状**，在 `SourceRange.Start/End >= 0` 时按源码切片兜底；文档顺序
  `this.SourceRange.Document` → `SourceRange.CurrentDocument` → `""`；范围未签入返回 `""`，不抛。

  ```ts
  const op = (this as any).Op;
  if (typeof op === "string" && op.length > 0) {
    return op;
  }
  if (!this.constructor.name.endsWith("TokenShape")) {
    return "";
  }
  const range = this.SourceRange;
  if (range.Start < 0 || range.End < 0) {
    return "";
  }
  let document = range.Document;
  if (document === null) {
    document = SourceRange.CurrentDocument;
  }
  if (document === null) {
    return "";
  }
  return document.GetRaw(range.Start, range.End);
  ```

  生成的 `dist/ts/core/syntax/shape-token.ts` 已核对：`AstOperator()` 与上面逐行一致，`tsc` exit 0。
  增量路径不受影响（`Op` 有值，第一分支直接返回），所以 `--incremental` 不会退步。

### 问题 2（收尾）：`*.xl.md` 里 `ToXmlString` 归零

`core/common-util.xl.md:5` 的散文改为 ToAstLine 口径：

> 本文件只包含解析路径需要的那一个方法：过去块级 token 与各 token 的 XML 输出都要用 `XmlDecode`；AST 行输出统一改走 `Token.ToAstLine` 之后，解析路径已不再调用它，方法保留不删（可能仍有引用）。

`XmlDecode` 方法本身保留未删、签名与实现未动。`*.xl.md` 命中 **0**。

## 2. 两个分支与 commit

| 分支 | commit | 说明 |
| --- | --- | --- |
| `astline-core` | `84b2cf15` → **`325dbaa0`** | `fix(astline): AstOperator 对 legacy 运算符按 src 切片兜底`（2 文件，+26/−2） |
| `astline-sites` | `28c72439` → **`7a48baa4`** | `merge(astline): 引入 AstOperator 兜底修复`（`--no-ff` 合并 `astline-core`） |
| `astline-sites` | `7a48baa4` → **本文件所在提交**（`astline-sites` tip，父提交 `7a48baa4`；sha 见 `git log --oneline -1`） | `fix(astline): op 兜底后重算语料基线 + 修复报告`（基线 JSON + 本报告） |

未 push；未跑任何既有 gate（`npm run gates` 未执行）。

## 3. 合并冲突与解法

`git merge --no-ff astline-core` 有 4 处冲突，全部取 **astline-core 侧**：

| 文件 | 冲突 | 为什么取 astline-core 侧 |
| --- | --- | --- |
| `core/syntax/shape-token.xl.md` | content | 两分支各自的 W1 副本内容相同，唯一差别就是本报告问题 1 的 `AstOperator` 兜底（已核对：`325dbaa0` 与 `28c72439` 的同名文件 diff 只有这一段） |
| `core/common-util.xl.md` | content | sites 侧写的是 `Token.AstEscape`；ToAstLine 之后正确名字是 `Token.ToAstLine`，且两侧都已无 `ToXmlString` |
| `core/syntax/basic-tokens/string/string.xl.md` | content | 正文逐字相同，仅文件末尾空行不同（sites 侧删 `ToXmlString` 方法后多/少一个空行） |
| `_coord/REPORT-astline-core.md` | add/add | 两份 W1 报告并存；取 astline-core 版（多了「冒烟」小节，是更完整的那一份） |

## 4. 全部读数

命令与验收口径同任务书；`xl_build` 均以 `cwd=<克隆>`、`paths=["core","typescript"]`、`targets=["ts"]` 执行。

### 构建

| 步骤 | 读数 |
| --- | --- |
| `xl_build`（astline-core，含修复） | 566 written / 0 skipped / **0 error** / 3 warning（3 个既有 `E1107` 重复类型告警，与 canonical 相同） |
| `tsc -p .`（astline-core） | exit 0 |
| `xl_build`（合并后 astline-sites） | 0 written / 566 skipped / 0 error / 3 warning —— 合并后 `*.xl.md` 集合与 `astline-core` tip **逐字节相同**，产物无需重写 |
| `tsc -p .`（合并后） | exit 0 |

### 解析读数

| 命令 | 修前（`astline-sites@28c72439`，W2 报告/任务书） | 修后（`7a48baa4`，本工作区实测） |
| --- | --- | --- |
| `npm run tts`（legacy，`--diff`） | **PASS 5 / FAIL 9 / 14**（EOF 一步红，exit 1） | **PASS 6 / FAIL 8 / 14**（EOF **PASS**，exit 1 = 既有基线） |
| `npm run tts:incremental`（`--diff --incremental`） | 14/14（exit 0） | **PASS 14 / FAIL 0 / 14**（char 11 annotation-only，exit 0） |
| `npm run tts:corpus`（`--legacy-corpus tests/cases/token`） | 基线本身是在 op 缺陷下采集的 | **1723 一致 / 0 差异**（变化 0 / 缺失 0 / 新增 0，1723 文件，解析异常 7，exit 0） |

legacy 修后逐项（8 个 FAIL 是既有 legacy 差异基线，全部是 `StatementShape` vs `VariableStatementShape`
这一类已知 legacy 树形差异，与 EOF 无关）：

```
[PASS] char 0 "l"   [PASS] char 1 "e"   [PASS] char 2 "t"   [PASS] char 3 " "
[PASS] char 4 "x"   [FAIL] char 5 " "   [FAIL] char 6 "="   [FAIL] char 7 " "
[FAIL] char 8 "2"   [FAIL] char 9 "*"   [FAIL] char 10 "3"  [FAIL] char 11 "+"
[FAIL] char 12 "1"  [PASS] EOF
```

EOF PASS 的含义：实测 `root.ToAstLine(0)` 与 `docs/expected-token-time-shapes.md` 的 `## [EOF]` 段
逐字节相同，即 `op="*"`（`pos=9  src=[9,10)`）与 `op="+"`（`pos=11  src=[11,12)`）都已回来。

### 语料基线

```
# legacy-corpus --write-baseline
模式: legacy（EnableIncrementalVariableShapes = false）
文件数: 1723（解析异常 7）
已写入: tests/parse/token-time-shapes/legacy-corpus-baseline.json
```

- 新基线 vs W2 旧基线（`28c72439`）：**435 条指纹变化 / 1723**（`435 insertions, 435 deletions`）。
  这 435 条正是含运算符 token 的文件——op 兜底后 legacy 行文本里多了 `op="..."`，指纹随之变化，
  说明新基线确实建立在「legacy 运算符不再丢 op」之上，而不是把旧读数原样抄一遍。
- 重算后复查：1723 / 0，两次运行（写基线、比对）耗时均 1.26s，确定性一致。

## 5. ToXmlString 归零

| 范围 | 命中 |
| --- | --- |
| `*.xl.md`（`core/`、`typescript/`，排除 `node_modules`/`dist`/`build`） | **0** |
| `*.mjs`（排除 `node_modules`/`dist`/`build`/`_coord`） | **0** |
| `_coord/**` 历史报告 | 仅在历史报告里作为「过去有过这个方法」的叙述保留，未改（本任务明确排除） |

生成的 `dist/**`、`build/**` 里也搜不到 `ToXmlString`。

## 6. 交接（给合并成员）

1. **从这里 fetch**（目录保留，不要删）：
   ```
   git fetch C:\Users\Admin\Documents\GitHub\xl-example-set\astline-fix astline-sites
   ```
   `astline-sites` 的合并基线 = 本报告最后一节记录的 commit（`7a48baa4` + 基线/报告提交）。
2. **`astline-core` 也在这个克隆里**（`325dbaa0`），但它已被 `7a48baa4` 合并进 `astline-sites`；
   只需要拿 `astline-sites` 一条分支即可，不要重复合并 `astline-core`（会二次冲突）。
3. **合并后必须重建再跑**：`dist/`、`build/`、`.xl` 都未入库（`git status` 干净）；语料基线
   `tests/parse/token-time-shapes/legacy-corpus-baseline.json` 已入库，是**修后新口径**，
   合并进 canonical 后 `npm run tts:corpus` 应直接 1723/0。
4. **`ShapeToken.AstOperator` 的兜底依赖源码文档**：`SourceRange.Document` 为 null 时用
   `SourceRange.CurrentDocument`（由 `SyntaxContext` 登记）。若有别的入口绕过 `SyntaxContext`
   直接建 token，那边要自行登记 `SourceRange.CurrentDocument`，否则 op 仍会是空串。
5. 未跑 gates；`typescript/IMPORTANCE.md`、`docs/expected-token-time-shapes.md`、
   `tests/parse/token-time-shapes/let-x.expected.txt` 三个硬约束文件**未改**。

## 7. 偏离与风险

1. 合并冲突按「取 astline-core 侧」解决（4 个文件，理由见第 3 节）；这不是内容取舍，而是两侧
   W1 改动本就同源，astline-core 侧更新且带修复。
2. `core/common-util.xl.md` 的散文现在写 `Token.ToAstLine`（任务书要求的口径）；sites 侧原写
   `Token.AstEscape`，合并后以 ToAstLine 为准——若后续发现 `AstEscape` 才是最终方法名，只需改这一句散文。
3. `AstOperator` 的类名判断用 `this.constructor.name.endsWith("TokenShape")`：压缩/混淆构建下类名会变，
   本仓的构建链（tsc → Node）不混淆，风险为零；若将来上打包器，需要换成一个显式标记。
4. 语料基线的 435 条变化全部来自 op 兜底，**没有手工编辑过 JSON**。
