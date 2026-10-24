# HANDOFF — impl-wp3-13（WP-3 第十三波：解析健壮性 + 空声明列收口）

STATUS: PARTIAL（**AST 6127 / 6167**，起点 6125；**cj-fail 8 → 0**；buffer ERROR 53 → 52）
BRANCH: impl-wp3-13 @ 4e30f941
BASE: impl-wp3-12 @ ebf00810（6125 态）

## 0. 一句话结论（给 Lead）

本波把「**解析绝不能抛**」这条做成硬保证的一部分：尾巴兜底建不出时**留 raw 而不是抛错**，
`[possible-build]` 的 8 条 cj-fail 与 `[missing-possible]` 的 5 条装饰器语料从「抛异常」变成
「建出（可能与 TS 不同）」——**全量 6167 条语料现在 cj-fail = 0**（这是 buffer ERROR 的分子之一）。
AST 从 6125 → **6127**（+2：`var y` / `var y\f`）。buffer ERROR 53 → **52**：剩下的 52 条不是
「我们抛错」，而是**基线自己也抛**、两边**错误文案不同**的 gap 语料（§3 有逐条证据）。

## 1. 本波改了什么（2 个文件，54+/13-）

### A. `typescript/tokens/items/source-file-tail-builder.xl.md` · `BuildTrailingItems` 的表达式兜底

兜底那次 `ExpressionStatementShape.FromUnits` 原来**没有 try/catch**：段首是装饰器前缀
（`@dec` ⏎ `const x = 1;`）时它抛「不支持的表达式起点」，整个 `Parse` 就失败。
现在包住：建不出就**留 raw**、不 splice、不抛。
- 效果：`cj-fail 13 → 0`（`possible-build` 8 条 + `missing-possible` 5 条装饰器）。
- 副作用（记录在案）：这 13 条从「抛错」变成「结构差」，所以结构差/位置差的口径会动，
  但**解析成功率 6167/6167**——这是本波用户口径里更硬的一条。

### B. `typescript/tokens/items/root-item-rule.xl.md` · 三处

1. **`Analyze` 的 `Alive.size === 0` 且 `at === 0` 分支**：原来直接 raw 收口
   （`Complete + Winner=-1`）。这会把第一格换成 raw token，尾巴只能看到剩下的 ` y`，
   `var y` 永远拼不回一条 `VariableStatement`。改成 `at = at + 1; continue;`（继续扫描）。
   **只影响「第一格就建不出」的段**，实测 +2（`missing-end #92 var y` / `#93 var y\f`），零回归。
2. **新增 `IsEmptyVariableStatement(code, shape)`**：形状里只要有 `VariableDeclarationListShape`
   且它 `Data` 为空，就是「空声明列表的变量语句」——不是一条完整语句，**不许用来收口**
   （否则 `var` 单独一格就被建掉，剩下的 ` y` 变成 `ExpressionStatement`）。
   判据按结构读（`constructor.name` + `Data.length`），不按 type/kind；
   **装饰器开头的段显式跳过这个判据**（`code[0]` 是 `@` 时返回 false）——装饰器的收口点
   是另一条路（F 类，没修），别在这里抢。
3. ① / ② 两个 accept 点都接上这个判据（`before` / `over`）。

> 注：**不要**在 `StatementBuilder.BuildVariableStatement` 里对空声明列表抛错——实测
> `cj-fail 8 → 18`（块内 / 标签位的变量关键字被连带打死）。判据只能在 root 的 accept 点。

## 2. 门禁读数（本分支实测，2026-10-24）

| 项 | 命令 | 读数 | 判定 |
|---|---|---|---|
| xl_build | core+typescript → dist | 0 error / 2414 warning | PASS |
| tsc | `tsc -p tsconfig.json` | exit 0 | PASS |
| AST 全量 | `ast-json.mjs` + `ast-json-diff.mjs` | **6127 / 6167**；结构差 **34**、位置差 **33**、字段差 0；**cj-fail 0** | 6125 → +2 |
| real-dts | `real-dts-ast.mjs` | 解析成功 **226** / 崩溃 0 / AST 一致 **226** | PASS |
| buffer-equivalence | `--mode both --base ..\baseline-build\build --new build --dts 8` | xml PASS 4481 / FAIL 23 / **ERROR 52**；digest PASS 4373 / FAIL 131 / ERROR 52 | ERROR 53 → 52 |

## 3. buffer ERROR 52 的构成（逐条已核，别再把它当「我们抛错」）

用 `SourceFileRunner.Parse` 对 50 个 parse 失败文件逐条对比（基线 vs 本分支）：

| 类 | 条数 | 现象 |
|---|---|---|
| 两边都抛、**文案不同** | 43 | 基线抛 `SyntaxException.FromInner`（文案 = `throw by line 0 ---> \r\n<range 摘录>`，**不含内层消息**），我们抛的是内层原文（`缺少标识符` / `表达式语句没有读完` / …）。文案是「位置摘录」，位置不同就不等。 |
| 基线抛、我们**解析成功** | 3 | `lex-string-dollar-prefix-intact.ts` 等：我们是**更好**的一侧，但 buffer 判 ERROR。 |
| 基线成功、我们抛 | 4 | `decl-instantiation-line-end.ts`、`gap-instantiation-line-end.ts`、`ex-new-variants.ts`、`prefix-operand-newline.ts` —— 这 4 条是真回归，见 §4。 |

要把 ERROR 清零，只有两条路（**都需要 Lead 裁决**）：
1. 让我们的错误文案与基线**逐字符相同**：基线在 `UnitToken.Process` 的 catch 里
   `SyntaxException.FromInner(range, e)`，range = `[index-1, index+1]`；我们的失败发生在
   **batch 的 Build\* 路径**（`ItemListEngine` 之外），没有这层包装。要一致就得让 batch 路径
   用**同一套 range 口径**重抛——那 43 条的失败位置本来就未必相同（gap 语料的失败点不同），
   所以**大概率仍然对不上**。
2. 改 `tests/bench/buffer-equivalence.mjs` 的判据（把「两边都抛」算 PASS、不管文案）——
   这是**测试口径变更**，不在实现成员的权限内。

**本波的判断**：ERROR 52 里 47 条是 gap 语料（基线自己就解析不了），只有 4 条是我们比基线差。
把这 4 条修掉可以把 ERROR 降到 48，但**到不了 0**。

## 4. 未完成项（精确到文件 / 方法）

1. **C 类 4 条**（`end-build #33/#37`、`end-import-export #20`、`possible-compute #126`）：
   `;` 在 item 收口那一刻还没进 `code`。真正可行的是在 `ItemListEngine.Feed` 里
   **建成功后再向前看一格 `;`**（`core/syntax/batch/item-list.xl.md` 的 `RecordBuild`，
   本波时间不够）。注意 wp3-12 试过「等下一格再收口」= 净负，别重试。
2. **D 类 4 条**（`end-compute #184`、`statements #290`、`end-export-assignment #37/#38`）：
   `StatementBuilder` / `ExportAssignmentShape.BuildDirect` 的**表达式终点**，`(` 续接判据。
3. **F 类 5 条**（`missing-possible #146..#150`）：装饰器变量声明的收口点。本波把它们的
   **抛错**变成了**结构差**（§1-A），但 AST 仍不对：根上在 `const` 那一格就收口了
   （`VariableStatement[0,10)` 空声明列表 + `ExpressionStatement`）。可用的判据是
   `IsEmptyVariableStatement`（本波已加）——**去掉 `code[0] === "@"` 的豁免**再配一条
   「装饰器段的建必须吃到 `;` 或行尾」就能收口，但会连锁影响候选判定，需要一整轮。
4. **G 类 2 条**（`end-declarations #71/#72`）：`module N` ⏎ `{}`，`{` 在下一格时体没被吸进
   声明（`ModuleDeclaration[0,8)` + `Block[8,11)`）。属 `module-item-rule` / 时序，本波没动。
5. **H 类剩余 3 条**：`missing-end #48/#49`（无体模块 End +1，含尾部换行）、
   `missing-end #95`（`export as namespace` End +1）、`end-build #155`（ExportKeyword Pos）。
   `#92/#93` 已修。
6. **buffer 的 4 条真回归**（§3 表）：`decl-instantiation-line-end`、`gap-instantiation-line-end`
   （「不支持的表达式起点」）、`ex-new-variants`（「括号内没有表达式」）、
   `prefix-operand-newline`（「表达式语句没有读完」）——都在表达式建造（WP-4 范围）。
7. **I 类 13 条**：`possible-build` 的表达式建造 9 条 + `yield` 3 条 + `interface I5 extends {...}`
   1 条，全在 `tokens/expressions/**` / `tokens/declarations/interface-*`，**本波写范围外**。

## 5. 下一步的精确命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp3-14 -From impl-wp3-13 -Base impl-wp3-13
cd impl-wp3-14
# 起点 6127 / cj-fail 0 / buffer ERROR 52
# 优先级：C 类（core/syntax/batch/item-list.xl.md 的 RecordBuild 向前看 `;`）
#         → F 类（root-item-rule 的 IsEmptyVariableStatement 去掉 @ 豁免 + 装饰器段必须吃到 `;`）
#         → H 类剩余 3 条（source-file-tail-builder 的 End 重锚）
```

## 6. 踩过的坑（新增）

1. **改了 `.xl.md` 只跑 `tsc` 是白跑**：`tsc` 编的是 `dist/ts/**`，必须**先 `xl_build`**（本波在
   tail 上踩了一次：改了源、只 tsc，读数纹丝不动）。
2. **`build/ts/*.js` 可以直接改来试**（生成物、不进 git），验证想法后再回写 `.xl.md`——
   比每次都 `xl_build` 快一倍。回写后**务必 `xl_build` + `tsc` 再测**。
3. **PowerShell 里往 `node -e` 传带引号的 JS 极容易炸**（`"@"` / `'` / `\n`），
   改成写一个 `patch-tmp.mjs` 再 `node patch-tmp.mjs`。
4. **`ExpressionStatementShape.FromUnits` 抛错会一路冒到 `Parse`**：尾巴里所有兜底调用都要
   `try/catch`（本波修了一处，`BuildStatementSegments` 里已有）。
5. **`StatementBuilder.BuildVariableStatement` 加「空声明列表就抛」= 净负**（cj-fail 8→18）。
6. `ast-json.mjs` 之后**必须紧跟** `ast-json-diff.mjs` 再 `git checkout -- typescript/cases`；
   顺序反了会读到还原后的绿快照（wp3-12 已记，本波复核）。

## 7. 交付状态

- `impl-wp3-13` tip = **6127 态**（`4e30f941`），**cj-fail 0**、real-dts 226/226、AST 结构差 34。
- 2 个文件改动：`typescript/tokens/items/root-item-rule.xl.md`、
  `typescript/tokens/items/source-file-tail-builder.xl.md`。
- 未 merge、未 push。
