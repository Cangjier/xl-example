# HANDOFF — integration/member-possible (merger-two)

STATUS: PARTIAL — 6 个分支全部无冲突合并并 push；7 道门禁中 5 道全绿，
real-dts（223/226）与 token-ast（1701 ok / 4 crash）未达目标，残留候选级缺陷，需 fixer 处理。

BRANCH: integration/member-possible @ 33cfb647（已 push 到 origin）

## MERGES (顺序 / merge commit)
1. origin/fix/member-boundary  dddb2ddf -> dfe99647
2. origin/feat/method-signature 0039524c -> 565a292a
3. origin/feat/index-signature 4a80d795 -> 4478ad03
4. origin/feat/call-signature 54d03275 -> c286661d
5. origin/feat/construct-signature 7bde57a2 -> ef8ddd61
6. origin/feat/accessor-signatures e132ba88 -> 33cfb647
CONFLICTS: none（文件集互不重叠，全部 ort 干净合并）

## 门禁读数
| # | 门禁 | 结果 | 判定 |
|---|------|------|------|
| 1 | xl check (core,typescript,target ts) | 865 files / 0 error / 2444 warning | PASS |
| 2 | xl_build + tsc -p tsconfig.json | 865 written / 0 error；tsc exit 0 | PASS |
| 3 | harness.mjs --all | cases 35/35；generic-boundary 25/25；skipped 0 | PASS (60/60) |
| 4 | ast-json + ast-json-diff | 6167/6167；结构差 0 / 位置差 0 / 字段差 0 | PASS |
| 5 | real-dts-ast | 226 文件：解析成功 223，CRASH 3，AST 差异 0 | FAIL (223/226) |
| 6 | token-ast --quiet | total 1715 / ok 1701 / crash 4 / diff 0 / ts-invalid 10 | FAIL (1701 ok, 4 crash) |
| 7 | tests/parse/validate.mjs | 1719 条 / 0 不合格 | PASS |

N.B. 门禁 3 必须带 --all 才是"7 候选全启用"的全量口径；不带时默认只跑
PropertySignature（35/35 + 10/10，skip 15），那是有意的裁剪，不是失败。

## FAILURES（逐条）
real-dts（3，归 PropertySignaturePossibleShape）
- node_modules/typescript/lib/lib.decorators.d.ts
- node_modules/typescript/lib/lib.es2015.proxy.d.ts
- node_modules/typescript/lib/lib.es5.d.ts
  错误文本：PropertySignaturePossibleShape.BuildByIndex: 产出不是 PropertySignatureShape

token-ast（4，归 MethodSignaturePossibleShape / 解析异常）
- tests/cases/token/declarations/method-generic-params-newline.ts
- tests/cases/token/types/gap-sweep-linecomment-iface-03.ts
- tests/cases/token/types/gap-sweep-newline-iface-02.ts
  错误文本：MethodSignaturePossibleShape.BuildByIndex: 产出不是 MethodSignatureShape
- tests/cases/token/types/typeof-import-newline.ts
  错误文本：SyntaxException: throw by line 0（与上面三条不同类，需单独定位）

## 归因判断
- 合并本身无冲突、无文件重叠，dts/token-ast 的失败均为「某候选 BuildByIndex 产出的节点
  类型与其自身断言不符 / 解析抛异常」，属于候选实现内部缺陷，不是合并引入的集成问题。
- docs/member-possible-design.md:260 记录基线为 dts 148/226、token-ast 1602 ok / 103 crash；
  当前 223/226、1701 ok / 4 crash 已大幅收敛，但仍未达 226/226 与 1705 ok / 0 crash。
- 未在基线单独构建复跑这两道门禁（预算用于门禁与推送），故「是否基线既有」未实测，
  仅按上述基线记录与失败形态判断为既有残留 + 候选缺陷。

## NEXT
- verifier: 从 origin/integration/member-possible (33cfb647) 拉分支复跑门禁。
- fixer: 修 PropertySignaturePossibleShape.BuildByIndex 的 kind 断言（3 个 lib d.ts）；
  修 MethodSignaturePossibleShape.BuildByIndex（3 条 token 用例）；单独定位 typeof-import-newline.ts 的 SyntaxException。
- 修复后只需重新 merge 对应分支到 integration/member-possible，其余 5 道门禁已验证为绿。
