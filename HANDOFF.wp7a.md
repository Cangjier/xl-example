# HANDOFF — impl-wp7a（WP-7 删除包 A 组：零引用死桩）

STATUS: COMPLETE
BRANCH: impl-wp7a @ cadd3fb0
BASE: refactor-integration @ 2c6e87bd

## 做了什么
- 起点实测（2c6e87bd）：`*possible*.xl.md` **380**（spec 的 383 是旧基点 5603f776 的数）。
- 筛选器（全部机械判据，可复现）：
  1. 零 `throw new Error` 的真实实现 **26** 个 → 白名单硬排除（清单 `deletion-A-whitelist.txt`）；
  2. `≤30 行 且 throw new Error ≥2` → **347** 个候选；
  3. 名字白名单再排除 **3** 个（class-expression / jsdoc-class-tag / class-keyword 的 possible-shape）；
  4. basename 零外部引用证明 `git grep -l -E '(^|[^A-Za-z0-9_-])<stem>($|[^A-Za-z0-9_-])' -- '*.xl.md' ':(exclude)<self>'` → 剔除 19 个仍被 `typescript/tokens/files/source-file-shape.xl.md`（C 组）引用的语句桩。
- 结果：**A 组 325 个文件 / 8450 行**，5 批（80/80/80/80/5）删除，每批独立 commit：
  `fd9126e3`(b1 80) `6401a107`(b2 80) `a77c6d0b`(b3 80) `33017787`(b4 80) `cadd3fb0`(b5 5)。
- 每批验证手法：`git rm` 同时删掉 `dist/ts/<同名>.ts`（否则残留产物让 tsc/AST 假绿），再 tsc + ast-json + ast-json-diff + body-guide。
- 删后全量重建：xl_build **545 写 / 0 error**；xl_check **545 文件 / 0 error**（E2004 只是 cache 里已删产物的记录，warning 级）。

## 门禁读数（本分支实测）
| 项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| xl_build | core+typescript → dist | 545 written / 0 error | PASS |
| xl_check | core+typescript | 545 files / 0 error / 1750 warning | PASS |
| tsc | node node_modules/typescript/bin/tsc -p tsconfig.json | exit 0 / 870 个 js | PASS |
| AST | node typescript/cases/ast-json.mjs | total cases=6167 cj-ok=6167 cj-fail=0（47 个构造） | PASS |
| AST diff | node typescript/cases/ast-json-diff.mjs | 合计 6167 条：完全一致 6167 / 6167；有结构差 0 条、有位置差 0 条、有字段差 0 条 | PASS |
| body-guide | --target=all --all | exit 0：[body-guide] target=interface candidates=all cases=35 pass=35 fail=0 ; [body-guide] target=interface generic-boundary cases=25 pass=25 fail=0 skipped=0 ; [body-guide] target=interface member-start cases=23 pass=23 fail=0 skipped=0 ; [body-guide] target=interface recovery cases=16 pass=16 fail=0 skipped=0 ; [body-guide] target=enum candidates=all cases=46 pass=46 fail=0 ; [body-guide] target=enum generic-boundary cases=19 pass=19 fail=0 skipped=0 ; [body-guide] target=enum member-start cases=10 pass=10 fail=0 skipped=0 ; [body-guide] target=enum recovery cases=5 pass=5 fail=0 skipped=0 ; [body-guide] target=class candidates=all cases=54 pass=54 fail=0 ; [body-guide] target=class generic-boundary cases=6 pass=6 fail=0 skipped=0 ; [body-guide] target=class member-start cases=21 pass=21 fail=0 skipped=0 ; [body-guide] target=class recovery cases=0 pass=0 fail=0 skipped=0 ; [body-guide] util cases=10 pass=10 fail=0 | PASS |
| real-dts | node typescript/cases/real-dts-ast.mjs | exit 0 / real-dts: 文件 226（跳过 TS 非法 0）：解析成功 226、崩溃 0；AST 完全一致 226、有差异 0 / 真实 .d.ts 全量解析成功且 AST 逐节点一致 | PASS |
| body-drive | batch-split / item-oracle / stream-proof | 0 / 0 / 0 | PASS |

## 未完成项
- 剩余 `*possible*.xl.md` **55** 个 = 26 个零 throw 真实实现 + 19 个仍被 source-file-shape 引用的语句桩（C 组）+ 3 个 class-* 名白名单 + 其余非死桩。
- B/C/D/E 组全线未动：B-1 依赖重指（items/*-item-util 的 PossibleShape 类型）、C 组 source-file-shape 79 处引用与 BodyGuideUtil.MountBodyGuide、D 组协议收口（BatchMode 默认仍 0）、E 组 tests/cache-share 与 tests/member-possible 未删。
- xl_orphans 的 cache 残记录未 prune（仅 warning，不影响构建）。

## 下一步的精确命令
```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp7b -From impl-wp7a -Base impl-wp7a
cd impl-wp7b
# B-1：git grep -n 'PossibleShape' -- 'typescript/tokens/items/*.xl.md' 'typescript/tokens/statements/statement-*.xl.md'
#      逐处重指新 util 类型 → xl_build → tsc 0 error 后，才 B-2 逐族删 possible
```

## 阻塞点
无。

## 踩过的坑
- **dist 残留 = 假绿**：xl_build 与 tsc 都不清已删源文件的产物；只 `git rm` 不删 `dist/ts/<同名>.ts`，tsc 仍能编译旧文件、AST 仍 6167，验证没有意义。
- **git grep 用含 .xl.md 的 basename 查不到 import 引用**：源码引用的是无扩展名路径，必须用去扩展名的 stem + 边界正则。
- PowerShell 里 `$ok = Verify ...` 会把日志和返回值一起吞进变量，验证失败也会静默通过；验证函数必须 Write-Host，失败状态用 `$global:` 标志。
- `tests/body-guide/harness.mjs` 的 `required` 只是 --only 过滤标签，不是断言；A 组删除不会让它变红（实测 --target=all --all 全绿）。
