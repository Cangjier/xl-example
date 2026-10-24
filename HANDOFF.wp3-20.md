# HANDOFF — impl-wp3-20（WP-3 第二十波：F 类豁免的实测否决；读数与起点持平）

STATUS: **NO-CHANGE / 持平（AST 未前进也未倒退）**。AST **6136 / 6167**（结构差 25 / 位置差 24 /
字段差 0 / cj-fail 0）、real-dts 226/226、buffer xml **4487 / 17 / 52**、digest 4379 / 125 / 52 ——
与起点 `impl-wp3-19 @ 26789e28` **逐项相同**。tsc 0；源码零改动（唯一试过的一处已回滚并重建）。

BRANCH: impl-wp3-20
BASE: impl-wp3-19 @ 26789e28

## 0. 一句话结论（给 Lead）

本波只够做完一件事：**把 F 类「去掉 `@` 豁免」这条假设证伪**（它读数是死的，见 §1）。
D / G / H / I 四类一步没动。树与起点等价，可安全合入或由下一波继续。

## 1. F 类：`IsEmptyVariableStatement` 的 `@` 豁免不是病灶（实测否决，已回滚）

- 落点：`typescript/tokens/items/root-item-rule.xl.md` §`IsEmptyVariableStatement`（第 499 行起）。
- 做法：删掉第 516–518 行的 `if (code[0] is "@") return false;` 豁免（注释自称「F 类还没修」），
  改成只保留 `code.length === 0` 的空表守卫（同时保证 `code` 形参仍被使用）。
- 复核（xl_build 窄路径 → tsc exit 0 → 全量 `ast-json` + `ast-json-diff`）：
  **6136 / 6167，结构差 25、位置差 24、字段差 0 —— 与改动前逐位相同**，
  `missing-possible #146 "@dec\nconst x = 1;"` 照样红。
- 根因（本波新增证据）：`IsEmptyVariableStatement` 全文只有 **3 个调用点**，
  `root-item-rule.xl.md:261 / 287 / 309`，都在 **angle / before / over** 那三个分支里。
  `@dec` ⏎ `const x = 1;` 的差异落在 **`missing-possible` 构造**（possible-shape 集合），
  说明分歧在「这段能构成的形状集合」阶段就发生了，**根本走不到 root 的收口判据**。
  ⇒ 下一波若要修 F，应从 possible-shape 侧进（`@` + `const` 两格能构成哪些 shape），
  而不是从 accept 点进。HANDOFF.wp3-19 §4.2 的落点判断需要修正。
- 该改动 **已 `git checkout` 回滚，并对该文件重新 `xl_build` + `tsc`**（遵守「回滚后必须重建
  dist」的坑），因此当前 dist 与源码一致、读数真实。

## 2. 当前红项清单（本波实测，按构造，附首条 id）

| 构造 | 完全一致 | 结构差条数 | 首条样例 |
|---|---|---|---|
| basic-token | 220/221 | 1 | `#86 const﻿b8 = 3;`（BOM） |
| dts-recovery | 20/22 | 2 | `#14 class<T> {}` |
| dts-types | 102/103 | 1 | `#81 import x from "m"\ntype T = A;` |
| end-build | 248/251 | 3 | `#33 type T = A \| B // c\n;` |
| end-compute | 317/318 | 1 | `#184 const f = () => 1\n(y)` ← D 类 |
| end-declarations | 214/216 | 2 | `#71 module N\n{}` ← G 类 |
| end-import-export | 44/46 | 2 | `#20 import x from "m"\na;` |
| missing-possible | 152/157 | 5 | `#146 @dec\nconst x = 1;` ← F 类 |
| possible-build | 192/198 | 6 | `#13 const t1 = f<T>`t`` |
| possible-compute | 203/205 | 2 | `#25 interface I5 extends { a: 1 } { }` |
| statements | 411/412 | 1 | `#290 const x = a\n(b)` ← D 类 |

（合计 25 条结构差、24 条位置差，与 wp3-19 完全一致。复现命令见 §4。）

## 3. 未完成项与下一步（按性价比排序）

1. **D 类 2（#290 / #184，收益最高且落点已收窄到一处）**：
   `typescript/tokens/items/source-file-tail-builder.xl.md` 的
   `BuildTrailingDeclaration`（第 440–1547 行，**1100 行，是下一波的主要阅读成本**）。
   已证明：有 `;` 的 `const x = a\n(b);` 正确；只有**无 `;` 的 EOF 尾巴**裂成
   `VariableStatement[0,11] + ExpressionStatement[11,15]`。`IsUncontinuableTailBoundary` 已排除，
   第 665 行那条 `IsExpressionTail(prev) && !IsContinuation(unit)` 对 `(` 返回的是「不是边界」（正确）
   ⇒ 切点在更上面的可变语句/装饰器分支，或 `BuildStatementSegments`（第 346 行起）。
   建议先写 20 行 tmp 探针（`require("build/ts/typescript/run/source-file-runner.js")` 直接 Parse 单例），
   每改一处只跑探针，几秒一轮，别直接跑全量。
2. **G 类 2（#71 `module N` ⏎ `{}`）**：`module-declaration-shape.xl.md` 的体边界——换行后的 `{`
   必须并进声明（现在停在 `N`，多出一个 `Block`，应为 `ModuleBlock` 子节点）。
3. **H 类 3（无体模块 `End+1` / namespace-export `End+1` / `ExportKeyword Pos`）**：同一文件
   `BuildTrailingDeclaration` 的重锚口径（`Finish`/`End` 取最后一个**代码**单元而不是最后一个单元；
   `ExportKeyword` 的 Pos 用 export token 的 `StartIndex`）。
4. **F 类 5**：改从 possible-shape 侧进，见 §1。
5. **I 类 13**：清单见 HANDOFF.wp3-19 §4.5，本波未动。
6. buffer 的 1 个 PASS 未补（本波无源码改动，读数原样继承 4487/17/52）。

## 4. 复现命令（一字不差）

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set\impl-wp3-20
# xl_build(cwd="...\impl-wp3-20", paths=["core","typescript"], targets=["ts"], out="dist")
node .\node_modules\typescript\bin\tsc -p tsconfig.json
node .\typescript\cases\ast-json.mjs; node .\typescript\cases\ast-json-diff.mjs
git checkout -- typescript/cases
node .\typescript\cases\real-dts-ast.mjs
node .\tests\bench\buffer-equivalence.mjs --mode both --base ..\baseline-build\build --new build --dts 8 --quiet
```

## 5. 本波新增的坑

1. **`xl_build` 全仓（`paths=["core","typescript"]`）的输出约 370 KB**，会直接吃掉上下文。
   改单个 `.xl.md` 时一律 `paths=["<那个文件>"]`（1 written / 0 warning），只有接手第一波才全仓建。
2. **首次 `tsc` 报 `TS18003: No inputs were found`** 是「还没 `xl_build`」的必然结果，
   此时紧跟着跑 `ast-json` + `ast-json-diff` 会打印 **6167/6167 全一致**的假读数
   （仓库里的 `.cj-ast.json` 是全对快照，diff 拿它跟 `.ts-ast.json` 比）。顺序恒为
   **`xl_build` → `tsc` → `ast-json` → `ast-json-diff` → `git checkout -- typescript/cases`**。
3. **改一个「看起来是病灶」的分支后读数是死的**，先查它**有几个调用点**（`Select-String -Path
   .\typescript\tokens\items\*.xl.md -Pattern "<方法名>"`）：只有 3 个调用点且都在 angle/before/over
   分支里，就说明这条路径根本没被该用例走到——比继续调参快得多。
4. `ast-json-diff` 的完整输出按构造分组，用 `"^=== "` + `"有结构差 [1-9]"` 两段正则扫一遍，
   就能拿到「每个构造红了几条 + 首条 id」，比逐行读省一个数量级的上下文。

## 6. 阻塞点

无。
