# D2b · 声明体 4 条 + `EndsWithClosingBracket` 保守闸：字符闸 → 词级闸，外加「在飞循环」的挂载链收口

| 项 | 值 |
| --- | --- |
| 状态 | **完成**。ON 崩溃 **24 → 20（−4）**、差异 **103 → 88（−15）**、**原来通过现在失败 = 0**、fallback **143 → 143**（不增）；4 条目标文件**全部 PASS**。 |
| 分支 / 目录 | `feature/d2b-asi` · `C:\Users\Admin\Documents\GitHub\xl-example-set\d2b-asi` |
| base | 主仓库 HEAD `2747993a`（D4b 合入之后） |
| 改动 | 2 个 `.xl.md`，**+100 / −13**，全部在增量路径；默认开关一个都没动 |
| 构建 | `xl_build` 628 页 / **0 error**（3 条既有 E1107）；`tsc -p .` **exit 0** |

---

## 1. 结论先行

D3d §3 的根因判断正确且可复现：4 条 `declaration 声明体` 的**首跳**都在 D2 的
`DeclarationAsiBoundary.CanCloseAtLineBreak` 的 `[D2:TYPED-TAIL]` 分支上，被
`EndsWithClosingBracket`（`}` / `)` / `]` 收尾的注解一律不早收）挡住。把这条**字符级闸**换成
**词级闸**（下一行起什么词）之后，4 条全部转 PASS。

但只换闸不够：换完出现 3 条 `CRASH → 差异`（`structural=8/9/4`）。逐条 dump 后发现第二条根因——
**行尾格的收口是在逐字符循环里发生的**：`SourceFileShape → statement → list → declaration` 四层
`UnitToken.Process` 的 while 循环此刻都还挂着，每层只问「我还是不是我父单元的 `MountedUnit`」。
`CloseAtLineBreak` 原来只清宿主与 list 两只指针，于是 list 的在飞循环继续吃下一行的字符，把它们
`Add` 进**已经关闭**的列表 ⇒ 根层少一整条 `TypeAliasDeclaration`（实测 `structural=4`）。
补上链条内部指针的清空后，3 条差异全部转 PASS，并且**顺带**救回 15 条同类差异（见 §5）。

## 2. 改动一：`[D2b:TYPED-TAIL-WORD]`（`declaration-asi-boundary.xl.md`）

`[D2:TYPED-TAIL]` 的四道条件里，`!EndsWithClosingBracket(current)` 换成
`!BlocksTypedTailClose(current)`：

```ts
const shapeTail = !current.IsBasicToken
  && HasAnnotationShape(units)
  && !BlocksTypedTailClose(current)      // ← 原 !EndsWithClosingBracket(current)
  && StartsNewStatementLine(current);
```

**`BlocksTypedTailClose` 回答的是「这一格收不收」**：

- 不是闭括号收尾 ⇒ `false`（D2 之前的行为一个字都不变）；
- 是闭括号收尾 ⇒ 看**下一行的第一个单词**：
  - 拿不到词（EOF / 没跨行 / 下一行是符号 / 文档不可用）⇒ `true`（保守，不早收）；
  - 命中续接词闭集（`in` / `instanceof` / `as` / `satisfies`）⇒ `true`；
  - 命中 `BlockedAfterTypeClose = ["export"]` ⇒ `true`；
  - 其余（任意标识符 / 语句关键字：`o` / `if` / `while` / `for` / `type` / `const` / `function` …）⇒ `false`。

**为什么只挡 `export`**：危险不是「文本上能不能续接类型」，而是**下一行会不会被这条声明的收口吞掉**。
`export … from` 的 `export` 在 `VariableDeclarationEndPossibleShape` 的 `Common` 格上过不了
`CanEndStatement`（上一个代码单元是非 basic 类型节点），早收之后这一格由重放交给父单元：实测
`undici-types/index.d.ts` 的 `declare const cacheStores: { … }` ⏎ `export * from './util'` 在早收后
**不再抛错、也不再走文件级 fallback**，树少 14 个节点（D2 §3 的 structural=14）。其余词不会把注解
继续写下去，收口安全。

**没有第二套字符前瞻**：原 `StartsNewStatementLine` 的扫描 / 取词抽成 `NextLineWord`
（`unit` 跨过行终止符 / 空白 / 注释后下一行的第一个单词，拿不到返回 `""`），
`StartsNewStatementLine` 变成「`NextLineWord` ≠ `""` 且不在续接词表」；`BlocksTypedTailClose`
读同一份。`EndsWithClosingBracket` 保留为**事实判据**（只答「最后一个字符是不是闭括号」），
不再自己决定收不收。

## 3. 改动二：`[D2b:UNMOUNT]`（`variable-declaration-list-possible-shape.xl.md`）

`CloseAtLineBreak` 收口后，除宿主指针外，**root 宿主**上连 `statement.MountedUnit` 一起清掉：

```ts
if (statement.Parent !== null) {
  const host = statement.Parent;
  host.MountedUnit = null;
  if (!(host instanceof Bracket)) {   // root 宿主才清链条内部
    statement.MountedUnit = null;
  }
}
list.MountedUnit = null;
```

- **为什么 root 才清**：块体宿主里同一手法今天走的是另一条账——被吞的字符与块体收口相撞，
  由文件级 fallback 兜住（`samples/declarations.ts`：base 就是 `FALLBACK` 通过的）。
  在块体宿主上放开会把这类文件从「fallback → 树正确」变成「增量静默少语句」，暴露的是**另一处
  不属于本 WP 的缺口**（§6：`declare function …` 无分号时不收口，把下一条 `class` 吞进壳里）。
  C10 要求宁可显式失败，所以块体宿主保持原样，等那条缺口自己修好再一并放开。
- 该分支只在 `CloseAtLineBreak` 里，而它只由 `CanCloseAtLineBreak`（已带增量开关门控）调用；
  默认开关 false 时一个字节都没执行。

## 4. 四条目标逐条（`tmp/wide-on.mjs`，同一构建、同一命令）

| 文件 | 修前 | 修后 |
| --- | --- | --- |
| `expressions/ex-call-comment-before-args.ts` | CRASH `终结候选与其它候选同时成立（SourceFileShape,25）` | **PASS**（AST 完全一致） |
| `statements/stmt-empty-blocks.ts` | CRASH `…（SourceFileShape,59）` | **PASS** |
| `statements/stmt-header-body-next-line.ts` | CRASH `…（SourceFileShape,63）` | **PASS** |
| `types/type-op-keyof-typeof.ts` | CRASH `…（SourceFileShape,25）` | **PASS** |

一条最小复现（`tmp/dump.mjs` / `tmp/probe-one.mjs`）：

```ts
declare const obj: { a: number }
type X = keyof typeof obj
```

修前：`ParseCore(shell=true)` 抛 `增量变量形状未支持：declaration 声明体`（注解以 `}` 收尾 →
`EndsWithClosingBracket` 挡死 → 下一行 `type` 进 `Data` → `FinishIncremental` 看到第二个形状）。
修后：`VariableStatementShape` 在 `}` 后的行尾格收口，`TypeAliasDeclarationShape [33,58)` 正常挂在根上。

## 5. 前后读数

| 指标 | base `2747993a` + ON | 本 WP | 变化 |
| --- | --- | --- | --- |
| 崩溃 | **24** | **20** | **−4** |
| 差异 | **103** | **88** | **−15** |
| 解析成功 | 2538 | 2542 | +4 |
| AST 完全一致 | 2435 | 2454 | +19 |
| `FileFallbackCount` | 143 | **143** | 0（不增） |
| `FileFallbackAttempts` | 167 | 163 | −4 |
| 缺 range / 越界 / 字段名 | 0 / 0 / 0 | 0 / 0 / 0 | 0 |
| 原来通过现在失败 | — | **0** | — |

逐文件集合差（`tmp/cmp.mjs`）：`gone=19`（= 4 崩溃 + 15 差异，全部转 PASS）、`added=0`、
`changed=2`（都是**变好**：`am-import-type-call` 7→2、`decl-obj-destructure-computed-key` 17→11）。

15 条被 `[D2b:UNMOUNT]` 顺带救回的差异（全部 `structural`）：`am-call-type-args`、
`am-generic-arrow-call`、`am-nested-generics`、`am-type-arg-in-new`、`decl-class-computed-member`、
`decl-instantiation-followers`、`ex-array-holes`、`ex-await-yield`、`ex-comma`、`ex-new-variants`、
`ex-spread`、`ex-strings`、`expr-satisfies-type-queue`、`lx-string-continuation`、`im-dynamic`、
`stmt-asi-long-chain`。

**回测 `undici-types` / `lib.*.d.ts`**（逐行比对两份日志）：`undici-types` 5 条差异与
`lib.*.d.ts` 5 条 `SourceRange is not set` 崩溃**逐字不变**；`undici-types/index.d.ts` 仍在
`FileFallbackByFamily` 里（`export` 仍被挡，structural=14 未复发）。

## 6. 未完成项 / 交下一棒

| 残留 | 量 | 最小复现 | 归属 |
| --- | --- | --- | --- |
| 块体宿主的同一只挂载指针（`[D2b:UNMOUNT]` 只放开 root） | — | `samples/declarations.ts`：`base` 靠 `FALLBACK` 通过；放开块体后它会变成「增量静默少语句」 | 前置缺口在下面 |
| **`declare function …` 无分号不收口**（吞下一条 `class` / `const`） | — | `declare function f(): void` ⏎ `class W {}` → 根层只剩 `FunctionDeclarationShape`（`class` 被吞）；写成 `…;` 就正确。base 与本 WP **同病**（`tmp/dump.mjs` 两侧一致） | `function-declaration-end-possible-shape`（不在本 WP ownership）：终点判据只有「闭合体 / `;` / EOF」，**没有行尾 ASI 分支** |
| 其余 20 条崩溃 | 20 | 表达式族 / 类型面 / `lib.*.d.ts` 的 `SourceRange` | 各自的 WP（D3b / D3c / D3e 残项） |

**目标差距的诚实说明**：本 WP 的目标是「4 条 + 闸」，4 条达成、差异还多修了 15 条。上表第一条
不是新债，是**本 WP 故意不碰的既存缺口**：块体宿主上放开挂载修正会把它从「fallback 兜住」变成
「静默错树」，而修它需要的 `declare function` ASI 不在本 WP 的写域。measurement 上
`FileFallbackCount` 与 base 完全相等，`samples/declarations.ts` 仍是 `FALLBACK`（与 base 同）。

## 7. 默认开关 false 的四道门（与 base 逐项一致）

| 命令 | 读数 |
| --- | --- |
| `node typescript/cases/tts/tools/tshape-judge.mjs ts-all` | **429 / ok 426 / failures 3**（3 条既有 throw） |
| `node typescript/cases/tts/run.mjs` | **exit 0**；`PASS 429 / FAIL 0`；`throw 3 / atomic 0 / partial 0 / incremental 426` |
| `node tests/gates/run.mjs` | **4 PASS / 0 FAIL / 7 N/A**（`wide-ast` PASS、`real-dts-ast` ok、`cases:check` 1720/0、`direct:lint` ok） |
| `xl_build { paths:["core","typescript"] }` + `tsc -p .` | **628 页 / 0 error**（3 条既有 E1107）+ **exit 0** |

## 8. 可复算命令

```powershell
$d="C:\Users\Admin\Documents\GitHub\xl-example-set\d2b-asi"; Set-Location $d
xl_build { cwd:$d, paths:["core","typescript"], targets:["ts"] }   # 628 / 0 error
node node_modules/typescript/bin/tsc -p .                          # exit 0

node tmp/wide-on.mjs --top 0 | Out-File tmp/on-v5.log -Encoding utf8   # 20 / 88 / 143
node tmp/cmp.mjs tmp/on-base.u8.log tmp/on-v5.log                     # gone=19 added=0 changed=2
node tmp/probe-one.mjs tmp/q1.ts                                      # 最小复现：修前 FAIL / 修后 PASS
node tmp/dump.mjs tmp/q1.ts                                           # 形状树（TypeAliasDeclaration 在根上）
node tmp/fallback-of.mjs "$d\samples"                                  # samples/declarations.ts = FALLBACK（与 base 同）
node typescript/cases/tts/tools/tshape-judge.mjs ts-all
node typescript/cases/tts/run.mjs
node tests/gates/run.mjs
```

`tmp/` 全部 gitignored，不提交。**改 `.xl.md` 只用编辑工具**：本机 PS 5.1 的 `Get-Content -Raw`
+ `[System.IO.File]::WriteAllText` 往返会把文件变成 CRLF / 损坏编码（`xl_build` 报
`E0005 source file contains a carriage return`）。`>` 重定向在 PS 5.1 是 UTF-16，日志要
`Out-File -Encoding utf8` 再比。
