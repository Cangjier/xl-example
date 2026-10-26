# REPORT-astline-core：`Token.ToXmlString` → `Token.ToAstLine(indent)`

- **状态**：完成（14/14 探针 PASS、EOF 段与文档逐字节一致、解析零回归）。
- **分支**：`astline-core`（自 `feature/all-possible` @ `633d22ed` 建），仓库 `xl-example-set/astline-core`。
- **提交**：本次提交（`astline-core` HEAD；`git log -1 --format=%h`）。未 push。
- **契约**：`_coord/CONTRACT-astline.md`（格式规格 + 钩子表 + 验收口径）。
- **目标形态**：`docs/expected-token-time-shapes.md`（14 节：char 0–12 + EOF）。

## 1. 改动文件清单（13 个源文件 + 2 个 `_coord` 新文件）

| 文件 | 改动 |
| --- | --- |
| `core/syntax/token.xl.md` | **核心**：删 `ToXmlString`，新增 `ToAstLine` / `AstLabel` / `AstPos` / `AstText` / `AstOperator` / `AstEscape`；`ToString` → `ToAstLine(0)` |
| `core/syntax/shape-token.xl.md` | 新增 `AstPos`（`this.Pos`）/ `AstText`（`Text` 探测）/ `AstOperator`（`Op` 探测） |
| `core/syntax/block-token.xl.md` | 删 `ToXmlString`，新增 `AstText` = `Temp`；去掉只被它用到的 `CommonUtil` import |
| `core/syntax/basic-tokens/area-annotation.xl.md` | 删 `ToXmlString`，新增 `AstText` = `Tmp` |
| `core/syntax/basic-tokens/line-annotation.xl.md` | 同上（`AstText` = `Tmp`） |
| `core/syntax/basic-tokens/bracket.xl.md` | 删 `ToXmlString`（子节点交给基类；括号字符不再印） |
| `core/syntax/basic-tokens/regex-token.xl.md` | 新增 `AstText` = `ToText()`；散文改口径 |
| `core/syntax/basic-tokens/common.xl.md` | 仅散文（`AstText` 由 `BlockToken` 给） |
| `core/syntax/basic-tokens/string/string.xl.md` | 删 `ToXmlString`（五个属性不再印）；散文改口径 |
| `core/syntax/basic-tokens/string/const-string.xl.md` | 删 `ToXmlString`（含 13 字符转义表），新增 `AstText` = `Temp` |
| `core/syntax/basic-tokens/string/interpolation-string.xl.md` | 仅散文（改 `ToAstLine` 口径） |
| `typescript/tokens/names/identifier-shape.xl.md` | 只加 `AstText` = `EscapedText` |
| `core/common-util.xl.md` | **仅 1 行散文**（`XmlDecode` 的说明改过去时，方法保留不删）——见 §7 偏离 |
| `_coord/CONTRACT-astline.md` | 新增：输出契约 |
| `_coord/REPORT-astline-core.md` | 新增：本报告 |

未改：`typescript/IMPORTANCE.md`、`typescript/tokens/**`（除白名单 `identifier-shape`）、`tests/**`、其它任何文件。
临时探针 `tmp/astline-probe.mjs`（+ `tmp/probe-*.txt`）**不提交**（`tmp` 已 gitignore）。

## 2. 构建读数

| 步骤 | 读数 |
| --- | --- |
| `xl_build`（冷，改前基线） | **566 written**, 0 skipped, 0 planned, **0 error**, **3 warning**（3 条既有 E1107 重复类型） |
| `xl_build`（改后，增量缓存） | 13 written, 553 skipped, 0 error, 3 warning |
| `xl_build`（改后，`force` 全量，最终读数） | **566 written**, 0 skipped, 0 planned, **0 error**, **3 warning** |
| `node node_modules/typescript/bin/tsc -p .` | **exit 0** |

3 条 warning 与基线**同文同位置**（`class-get-accessor-possible-shape` / `class-index-signature-possible-shape` /
`class-set-accessor-possible-shape`，均为 `E1107` 重复声明），无新增告警。

## 3. 实现要点

- `pad = " ".repeat(depth * 3)`、`cut = (depth + 1) * 3`，子串 `slice(cut)` 后由父级换成 `├─ ` / `└─ ` / `│  ` / 三个空格。
- label 字段顺序固定 `pos → src → text → op`，字段间两个空格；`pos` 只由 `AstPos()` 决定（`Token` = `null`，
  `ShapeToken` = `Pos`），所以 `Common` 这类 basic token 没有 `pos`、`SourceFileShape` 印 `pos=-`。
- 转义只留 5 条（`\` `"` CR LF TAB），由 `Token.AstEscape` 统一承担；老 XML 的 13 字符表 + 实体表随方法一起删除。
- `ShapeToken` 用字段探测覆盖约七十个 `*TokenShape`（`Text` / `Op`），只有 `IdentifierShape` 需要再覆写一层。

## 4. 临时探针读数（`tmp/astline-probe.mjs`，增量模式）

驱动方式与 `tests/parse/token-time-shapes.mjs` 相同（`TypescriptTemplate.Create()` + `SourceFileShape` +
`SyntaxContext` + 逐字符 `ProcessRange(Root, [i,i+1), i)` + 手工 EOF 收尾），解析前把
`StatementRouteUtil.EnableIncrementalVariableShapes` 置 `true`，每步打印 `root.ToAstLine(0)`，
再与 `tests/parse/token-time-shapes/let-x.expected.txt` 的 14 节逐行比对（char 11 沿用 annotation-only 容错）。

**结果：PASS 14 / FAIL 0 / 14 步**（其中 char 11 仅差期望侧行尾 `← 3 关闭即封口` 注解，计 PASS）。

逐步：`char 0=PASS | char 1=PASS | char 2=PASS | char 3=PASS | char 4=PASS | char 5=PASS | char 6=PASS |
char 7=PASS | char 8=PASS | char 9=PASS | char 10=PASS | char 11=PASS(annotation-only) | char 12=PASS | EOF=PASS`

### 实测 14 步全文（探针原始输出，`ToAstLine(0)` 逐字）

```text
源码: let-x.ts（13 字符），步数 14（期望 14 节），中断=否
模式: StatementRouteUtil.EnableIncrementalVariableShapes = true

## [char 0] "l"
SourceFileShape  pos=-  src=[0,未封)
└─ Common  src=[0,1)  text="l"

[PASS] char 0 "l"

## [char 1] "e"
SourceFileShape  pos=-  src=[0,未封)
└─ Common  src=[0,2)  text="le"

[PASS] char 1 "e"

## [char 2] "t"
SourceFileShape  pos=-  src=[0,未封)
└─ Common  src=[0,3)  text="let"

[PASS] char 2 "t"

## [char 3] " "
SourceFileShape  pos=-  src=[0,未封)
├─ Common  src=[0,3)  text="let"
└─ WrapSymbol  src=[3,4)  text=" "

[PASS] char 3 " "

## [char 4] "x"
SourceFileShape  pos=-  src=[0,未封)
├─ Common  src=[0,3)  text="let"
├─ WrapSymbol  src=[3,4)  text=" "
└─ Common  src=[4,5)  text="x"

[PASS] char 4 "x"

## [char 5] " "
SourceFileShape  pos=-  src=[0,未封)
└─ VariableStatementShape  pos=0  src=[0,未封)
   └─ VariableDeclarationListShape  pos=0  src=[0,未封)
      └─ VariableDeclarationShape  pos=3  src=[4,未封)
         ├─ IdentifierShape  pos=3  src=[4,5)  text="x"
         └─ WrapSymbol  src=[5,6)  text=" "

[PASS] char 5 " "

## [char 6] "="
SourceFileShape  pos=-  src=[0,未封)
└─ VariableStatementShape  pos=0  src=[0,未封)
   └─ VariableDeclarationListShape  pos=0  src=[0,未封)
      └─ VariableDeclarationShape  pos=3  src=[4,未封)
         ├─ IdentifierShape  pos=3  src=[4,5)  text="x"
         ├─ WrapSymbol  src=[5,6)  text=" "
         └─ Symbol  src=[6,7)  text="="

[PASS] char 6 "="

## [char 7] " "
SourceFileShape  pos=-  src=[0,未封)
└─ VariableStatementShape  pos=0  src=[0,未封)
   └─ VariableDeclarationListShape  pos=0  src=[0,未封)
      └─ VariableDeclarationShape  pos=3  src=[4,未封)
         ├─ IdentifierShape  pos=3  src=[4,5)  text="x"
         ├─ WrapSymbol  src=[5,6)  text=" "
         ├─ Symbol  src=[6,7)  text="="
         └─ WrapSymbol  src=[7,8)  text=" "

[PASS] char 7 " "

## [char 8] "2"
SourceFileShape  pos=-  src=[0,未封)
└─ VariableStatementShape  pos=0  src=[0,未封)
   └─ VariableDeclarationListShape  pos=0  src=[0,未封)
      └─ VariableDeclarationShape  pos=3  src=[4,未封)
         ├─ IdentifierShape  pos=3  src=[4,5)  text="x"
         ├─ WrapSymbol  src=[5,6)  text=" "
         ├─ Symbol  src=[6,7)  text="="
         ├─ WrapSymbol  src=[7,8)  text=" "
         └─ Common  src=[8,9)  text="2"

[PASS] char 8 "2"

## [char 9] "*"
SourceFileShape  pos=-  src=[0,未封)
└─ VariableStatementShape  pos=0  src=[0,未封)
   └─ VariableDeclarationListShape  pos=0  src=[0,未封)
      └─ VariableDeclarationShape  pos=3  src=[4,未封)
         ├─ IdentifierShape  pos=3  src=[4,5)  text="x"
         ├─ WrapSymbol  src=[5,6)  text=" "
         ├─ Symbol  src=[6,7)  text="="
         ├─ WrapSymbol  src=[7,8)  text=" "
         ├─ NumericLiteralShape  pos=7  src=[8,9)  text="2"
         └─ Symbol  src=[9,10)  text="*"

[PASS] char 9 "*"

## [char 10] "3"
SourceFileShape  pos=-  src=[0,未封)
└─ VariableStatementShape  pos=0  src=[0,未封)
   └─ VariableDeclarationListShape  pos=0  src=[0,未封)
      └─ VariableDeclarationShape  pos=3  src=[4,未封)
         ├─ IdentifierShape  pos=3  src=[4,5)  text="x"
         ├─ WrapSymbol  src=[5,6)  text=" "
         ├─ Symbol  src=[6,7)  text="="
         ├─ WrapSymbol  src=[7,8)  text=" "
         └─ BinaryExpressionShape  pos=7  src=[8,未封)
            ├─ NumericLiteralShape  pos=7  src=[8,9)  text="2"
            ├─ AsteriskTokenShape  pos=9  src=[9,10)  op="*"
            └─ Common  src=[10,11)  text="3"

[PASS] char 10 "3"

## [char 11] "+"
SourceFileShape  pos=-  src=[0,未封)
└─ VariableStatementShape  pos=0  src=[0,未封)
   └─ VariableDeclarationListShape  pos=0  src=[0,未封)
      └─ VariableDeclarationShape  pos=3  src=[4,未封)
         ├─ IdentifierShape  pos=3  src=[4,5)  text="x"
         ├─ WrapSymbol  src=[5,6)  text=" "
         ├─ Symbol  src=[6,7)  text="="
         ├─ WrapSymbol  src=[7,8)  text=" "
         ├─ BinaryExpressionShape  pos=7  src=[8,11)
         │  ├─ NumericLiteralShape  pos=7  src=[8,9)  text="2"
         │  ├─ AsteriskTokenShape  pos=9  src=[9,10)  op="*"
         │  └─ NumericLiteralShape  pos=10  src=[10,11)  text="3"
         └─ Symbol  src=[11,12)  text="+"

[PASS(annotation-only)] char 11 "+"
    （仅差期望侧行尾注解：行 9）

## [char 12] "1"
SourceFileShape  pos=-  src=[0,未封)
└─ VariableStatementShape  pos=0  src=[0,未封)
   └─ VariableDeclarationListShape  pos=0  src=[0,未封)
      └─ VariableDeclarationShape  pos=3  src=[4,未封)
         ├─ IdentifierShape  pos=3  src=[4,5)  text="x"
         ├─ WrapSymbol  src=[5,6)  text=" "
         ├─ Symbol  src=[6,7)  text="="
         ├─ WrapSymbol  src=[7,8)  text=" "
         └─ BinaryExpressionShape  pos=7  src=[8,未封)
            ├─ BinaryExpressionShape  pos=7  src=[8,11)
            │  ├─ NumericLiteralShape  pos=7  src=[8,9)  text="2"
            │  ├─ AsteriskTokenShape  pos=9  src=[9,10)  op="*"
            │  └─ NumericLiteralShape  pos=10  src=[10,11)  text="3"
            ├─ PlusTokenShape  pos=11  src=[11,12)  op="+"
            └─ Common  src=[12,13)  text="1"

[PASS] char 12 "1"

## [EOF]
SourceFileShape  pos=-  src=[0,13)
└─ VariableStatementShape  pos=0  src=[0,13)
   └─ VariableDeclarationListShape  pos=0  src=[0,13)
      └─ VariableDeclarationShape  pos=3  src=[4,13)
         ├─ IdentifierShape  pos=3  src=[4,5)  text="x"
         └─ BinaryExpressionShape  pos=7  src=[8,13)
            ├─ BinaryExpressionShape  pos=7  src=[8,11)
            │  ├─ NumericLiteralShape  pos=7  src=[8,9)  text="2"
            │  ├─ AsteriskTokenShape  pos=9  src=[9,10)  op="*"
            │  └─ NumericLiteralShape  pos=10  src=[10,11)  text="3"
            ├─ PlusTokenShape  pos=11  src=[11,12)  op="+"
            └─ NumericLiteralShape  pos=12  src=[12,13)  text="1"

[PASS] EOF

EOF 段与 docs 文档逐字节一致：YES（期望 675 字符 / 实际 675 字符，行数 12 vs 12）

合计: PASS 14 / FAIL 0 / 14 步（其中 1 步仅差文档内嵌注释，计 PASS）
```

### EOF 段逐字节证据

探针把 `docs/expected-token-time-shapes.md` 里 `## [EOF]` 的 ```text 围栏块整段抽出，与实测
`root.ToAstLine(0)` 字符串做 `===` 比较（**不经过 annotation 容错、不 trim、不重排**）：
`YES（期望 675 字符 / 实际 675 字符，行数 12 vs 12）`。即 EOF 段 12 行逐字节相同，末尾无换行。

## 5. 回归（解析行为零回归）

| 命令 | 读数 | 退出码 |
| --- | --- | --- |
| `npm run tts`（legacy，`--diff`） | **PASS 6 / FAIL 8 / 14**（既有基线 6/8/14） | 1 |
| `node tests/parse/token-time-shapes.mjs tests/parse/token-time-shapes/let-x.ts --diff --incremental` | **PASS 14 / FAIL 0 / 14**（1 步 annotation-only） | 0 |

两读数与重构前逐项一致 ⇒ 本次只换了**输出方法**，没有动解析路径。
（`tests/parse/token-time-shapes.mjs --diff` 走的是自己的 `dumpNode` 树打印，不调用 `ToXmlString`，
所以测试工具本身不需要改也能照常跑。）

## 6. 验收清单

- [x] `xl_build` 0 error、3 个既有 E1107 warning 不变（566 文件）
- [x] `tsc -p .` exit 0
- [x] 探针 14/14 PASS，EOF 段逐字节一致
- [x] `npm run tts` 6/8/14、`--incremental` 14/14
- [x] `git status --porcelain` 干净、单提交、未 push、未跑 gates

## 7. 偏离规格与已知遗留

1. **改了白名单外的 `core/common-util.xl.md`（仅 1 行散文）**：任务第 7 条明确要求把该文件里「XML 输出都要用
   `XmlDecode`」的说明改成过去时，但第三步白名单没列出它。按「更具体的指令优先」处理：只改这 1 行注释文字，
   方法 `XmlDecode` 保留不删、签名与实现未动，对构建与解析零影响。
2. **`block-token.xl.md` 去掉了 `CommonUtil` 的 import**：`ToXmlString` 是它的唯一使用者，留着就是无用依赖。
3. **`ShapeToken.AstText` 用 `(this as any).Text` 字段探测**：这会让所有带 `Text` 字段的形状（包括
   `StringLiteralShape` / `TemplateHead` 等）自动获得 `text`，是规格第 4 条「文本兜底」的直接结果；
   本仓 `Text` 与 `Op` 同时存在的形状不存在，所以不会出现两个字段一起印的情况。
4. **`cjcli.xl.md` 的散文仍说 XML**（`Root.ToString()` 已改印 AST 行）：该文件不在白名单，未改。行为变化是本次
   重构的必然结果（`ToString` → `ToAstLine(0)`），散文留给后续包处理。
5. **仍调用 `ToXmlString()` 的测试脚本会失效**（HANDOFF，见下）——本次按约束不改 tests。
6. 老的 XML 输出口径（`String` 的五个属性、`Bracket` 的两个属性、注释不转义）**有意丢失**：规格要求输出对齐
   `docs/expected-token-time-shapes.md`，这些属性不在行文本规格里。

## 8. HANDOFF（交给后续包 / Lead）

1. **tests 侧仍引用 `ToXmlString()`**（约 30 个文件，需要后续包统一切到 `ToString()` 或 `ToAstLine(0)`）：
   - `tests/parse/token-time-shapes.mjs` 的 `--legacy-corpus`（`corpusFingerprint` 里的 `shape.ToXmlString()`）
     ⇒ 现在 `npm run tts:corpus` 会抛 `shape.ToXmlString is not a function`；
   - `tests/statement-possible/*.mjs`（harness + 约 25 个 case 脚本）；
   - `tests/feas-operator/harness.mjs`、`tests/direct-build/target-cases.mjs`、`tests/bench/buffer-equivalence.mjs`（注释）。
   这不是本次回归（`npm run tts` / `--incremental` 都不走 `ToXmlString`），但下一包必须先修它们再跑语料基线。
   `tests/parse/token-time-shapes/legacy-corpus-baseline.json` 的指纹口径（XML）因此也需要重新采集。
2. **`cjcli.xl.md` 与 `typescript/tokens/**` 里若干注释仍以 XML 描述产物**；`typescript/IMPORTANCE.md` 未动（硬约束）。
3. **`CommonUtil.XmlDecode` 现在无调用者**：保留是按规格；若后续确认全仓无引用，可另开一包删除。
4. 合并时注意：本次 commit 只包含 13 个源文件 + 2 个 `_coord` 新文件，`tmp/` 与 `build/`、`dist/`、`.xl` 均未入库。
