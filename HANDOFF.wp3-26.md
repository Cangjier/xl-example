# HANDOFF — impl-wp3-26（WP-3 第二十六波：六条 EOF 尾巴共因的第一次落点实验，净零）

STATUS: **NO-CODE / 净零**。基线完整复现 **6151 / 6167**（结构 16 / 位置 9 / 字段 0 / cj-fail 0），
real-dts 226/226，quick/standard PASS，xl_check 0 error。源码**一行未改**（唯一新增文件是本 HANDOFF）；
本波唯一的源码实验（`BuildTrailingItems` 的 `at` 右界扩到尾巴 `;`）实测**零影响**，已回滚。

BRANCH: impl-wp3-26
BASE: impl-wp3-25 @ 7259f0b8（wp3-25 无源码改动）

## 0. 一句话结论（给 Lead）

wp3-25 §2.3 的主推荐（“在 `BuildStatementSegments`/`BuildTrailingItems` 的 slice 终点把尾 `;` 收进来”）
本波**实测不成立**：把 `SourceFileTailBuilder.BuildTrailingItems` 的 `at` 在“中间只隔 trivia 的下一格是 `;`”
时扩到 `;` 上，重跑全量 AST 得到**逐条相同**的 6151/6167（16/9/0），六条一条都没动。
→ 六条（#20/#22/#33/#37/#81/#126）**不是**在该函数的 `at+1` 边界上丢 `;`：要么它们根本不经过
`BuildTrailingItems`，要么 `at` 早已覆盖 `;` 而各 `FromUnits` 自己没把它计入 End。下一波必须**先测量**
（见 §3），不要再按“扩 slice 终点”改。

## 1. 本波实测（2026-10-24，impl-wp3-26）

| 项 | 命令 | 读数 | 判定 |
|---|---|---|---|
| xl_build | core+typescript → dist | 875 written / 0 error / 2414 warning | PASS |
| tsc | `tsc -p tsconfig.json` | exit 0 | PASS |
| xl_check | core+typescript | **0 error / 2414 warning** | PASS |
| ast-json | 全量 | total 6167 / cj-ok 6167 / **cj-fail 0**（47 构造） | PASS |
| ast-json-diff | 全量（严格先 ast-json 再 diff） | **6151 / 6167**；结构 16 / 位置 9 / 字段 0 | 与 wp3-25 逐项相同 |
| real-dts | `real-dts-ast.mjs` | 226：成功 226、崩溃 0、一致 226 | PASS |
| buffer | `--mode both --base ..\baseline-build\build --new build --dts 8 --quiet` | xml **4487 / 17 / 52**、digest **4383 / 121 / 52** | 与 wp3-23 记录逐项相同（未倒退） |
| quick | `..\tools\gates.ps1 -Tier quick` | **PASS** 5.7s | PASS |
| standard | `..\tools\gates.ps1 -Tier standard` | **PASS** 10.5s（tests/gates 1/8 = 基线 KNOWN-RED） | PASS |

## 2. 本波做过的那一次实验（已回滚）

改 `typescript/tokens/items/source-file-tail-builder.xl.md` 的 `BuildTrailingItems` 开头：

```ts
let semiAt = at + 1;
while (semiAt < host.Data.length && host.Data[semiAt].IsTriviaToken) { semiAt++; }
if (semiAt < host.Data.length && host.Data[semiAt] instanceof Symbol
  && (host.Data[semiAt] as Symbol).Is(";")) { at = semiAt; }
```

xl_build 0 error、tsc 0，但 `ast-json-diff` 全量仍是 **6151 / 6167，结构 16 / 位置 9**，
`end-import-export` / `dts-types` / `end-build` / `possible-compute` 四组过滤后逐条**一字不差**：

```
#20 "import x from \"m\"\na;"            ExpressionStatement ts[17,20] cj[17,19] + EmptyStatement
#33 "type T = A | B // c\n;"            TypeAliasDeclaration ts[0,21] cj[0,14] + EmptyStatement
#81 "import x from \"m\"\ntype T = A;"   TypeAlias -> 被建成 ExpressionStatement（同 wp3-23）
#126 "import type from 'm'\nimport type from 'n';"  ImportDeclaration ts[20,42] cj[20,41]
```

→ 结论：**该点不是落点**，已 `git checkout --` 回滚，并用回滚后的源码重新 xl_build（1 written）+ tsc + 全量 AST
复核仍是 6151，所以本分支交付的是**净零**，不是“未验证的改动”。

## 3. 下一波必须先做的测量（本波时间不够，价值最高）

1. **给 `dist/ts` 打点，确认六个用例到底走哪个 builder**：在
   `BuildStatementSegments` / `BuildTrailingItems` / `BuildTrailingDeclaration` /
   `ExpressionStatementShape.FromUnits` 入口 `console.error` 打印 `start/at/requireSemicolon/单元文本`，
   跑 `node typescript/cases/ast-json.mjs end-import-export dts-types end-build possible-compute`，
   看 #20 的 `a` 到底是哪个入口建的、`at` 停在哪一格。
2. **打点方式有坑**：不要用 PowerShell `Get-Content -Raw` + `String.Replace` + `Set-Content` 去改 `dist/**/*.ts`
   ——本波这样做把生成文件写坏（tsc 报出上百条 TS1128/TS1002），而且 **xl_build 会认为文件“up to date”不再重写**，
   必须 `Remove-Item` 掉那两个生成文件再 xl_build（本波已验证这条恢复路径有效）。
   用 `edit` 工具改、或在 `.xl.md` 里临时加打点再 xl_build。
3. **重点看两件事**：
   - `at` 是否本来就等于 `;` 的下标（若是，则落点在 `ImportDeclarationShape.FromUnits` /
     `TypeAliasDeclarationShape.FromUnits` 的 End：它们可能只签到类型/模块说明符，不把 `;` 计入）；
   - `requireSemicolon` 传的是 true 还是 false（#20 的 fallback 若在“最后一个非 trivia 是 `a`”时传 false，
     就会得到 [17,19]——这与实测吻合，说明 `at` 的**上界**不包含 `;`，但那不是 `BuildTrailingItems` 的 `at`）。

## 4. 未完成项

- 六条（#20/#22/#33/#37/#81/#126）一条未修，AST 仍 6151/6167。
- I 类剩余项（模板标签 #13/#15/#61、yield #169/#171/#179、`class<T>` #14/#15、interface #25、#86 BOM）本波未动。
- 本波**超出轮次预算**（定位与打点尝试用掉 12+ 轮，计划 8 轮），所以主动收尾为净零交付 + 精确定位交接。

## 5. 下一步的精确命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp3-27 -From impl-wp3-26 -Base impl-wp3-26
cd impl-wp3-27
# xl_build(cwd="...\impl-wp3-27", paths=["core","typescript"], targets=["ts"], out="dist")
node .\node_modules\typescript\bin\tsc -p tsconfig.json
node .\typescript\cases\ast-json.mjs; node .\typescript\cases\ast-json-diff.mjs; git checkout -- typescript/cases
# 先按 §3 打点，再改；每改一处：xl_build → tsc → ast-json → diff（过滤用
#   node .\typescript\cases\ast-json-diff.mjs end-import-export dts-types end-build possible-compute）
```

## 6. 阻塞点

无（xl_build / tsc / 各门禁全部可用）。唯一“失败”是本波选的落点被实测否定。

## 7. 踩过的坑

1. `git checkout -- typescript/cases` 必须在**读 diff 之后**做；`gates.ps1` 也会重写这些 tracked 快照。
2. `xl_build` 的增量缓存按源码指纹：直接改 `dist/` 后再 build 不会覆盖（“up to date”），要删掉对应 `.ts` 再 build。
3. 严格顺序：`ast-json.mjs` → `ast-json-diff.mjs` → `git checkout -- typescript/cases`；反过来就是假绿 6167。
