# P5 收尾门禁（`feat/p5-gates`）
主仓库 `xl-example`（`feature/all-possible-1101`@`7769ddbd`）未改动；基准 `4a0f3505`；工作树 `xl-example-set/p5-gates`。

## 1. P5 台账：23 → 0
- T3 3：fn-type、fn-type-generic、ctor-type-abstract
- T1 6：keyof、readonly-array、typeof-query、literal-string、import-type、parenthesized
- T2 9：object、object-method、object-call-construct、object-index-readonly、object-optional-readonly、tuple、tuple-named、tuple-optional、tuple-rest
- T4 4：mapped、mapped-modifiers、mapped-remap、template-literal
- T5 1：recursive
- 合计 **23 条 → 兜底用例 0 / 兜底总次数 0**（基线 23/23）

## 2. 八条门禁（原文）
1. `xl build: ok=true errors=0 warnings=0`；`tsc -p tsconfig.json` exit 0
2. `[tts] success: 302 case, PASS 302 / FAIL 0` / `[tts] TOTAL 302 case, FAIL 0`
3. `[tts] todo: 285 case, PASS 40 / FAIL 245`；对 `4a0f3505` 同命令实测 PASS 40，**LOST 0 / GAINED 0**（逐条集合相同）；todo 探针 285/兜底 0/clean 142/ident 228/over2 21 与 `report-todo.json` 全等
4. `汇总: 用例 302 / 兜底用例 0 / 兜底总次数 0 / 迟到标识符 58 (IdentifierShape 677, 最多 +33 K @ .../alias-mapped-remap.ts)`
5. `[rules:check] 83 file(s) scanned, 0 violation(s)`
6. `--compare fp-base fp-P5-final` → `changed=22 added=0 removed=0 same=280`
7. 22 个 `.md` 重生成后复跑 `[tts] success: 302 case, PASS 302 / FAIL 0`；`.ast` 改动 0（`git status` 无 `.ast`，逐字节相同）
8. `xl build — 0 written, 239 skipped, 0 planned, 0 error(s), 0 warning(s)`

## 3. changed vs 23 目标（22 变 / 1 不变）
- T3：`ctor-type-abstract@26(6)`、`fn-type-generic@20(4)`；**未变 `fn-type`**
- T1：`import-type@22(1)`、`keyof@18(1)`、`literal-string@11(2)`、`parenthesized@16(2)`、`readonly-array@25(2)`、`typeof-query@17(1)`
- T2：`object@21(2)`、`object-method@30(2)`、`object-call-construct@30(25)`、`object-index-readonly@40(2)`、`object-optional-readonly@31(2)`、`tuple@16(10)`、`tuple-named@19(13)`、`tuple-optional@17(2)`、`tuple-rest@21(2)`
- T4：`mapped@35(2)`、`mapped-modifiers@47(2)`、`mapped-remap@48(2)`、`template-literal@21(2)`
- T5：`recursive@26(2)`
- `alias-fn-type` 未变原因：`perChar` 逐字符 sha1 与 `eofText` 与基线全等（fp `4f5274f4`），T3 只拆调用、最终树逐字符一致 ⇒ 不应有快照变化。任务书「恰好 14 个」与实测 22 个不符，以实测为准。

## 4. 重生成快照（22 个，均在 `success/types/`）
`alias-{ctor-type-abstract,fn-type-generic,import-type,keyof,literal-string,mapped,mapped-modifiers,mapped-remap,object,object-call-construct,object-index-readonly,object-method,object-optional-readonly,parenthesized,readonly-array,recursive,template-literal,tuple,tuple-named,tuple-optional,tuple-rest,typeof-query}.md`，diff +713/−1115

## 5. 遗留清单
1. chain / function-arrow 粘性候选债：非己形态恒 `Uncertain`，靠 T1/T2/T4 `Claim`/`ReleaseSticky` 让路。
2. mapped 子树仍在 `}` 才成型（`IsReady` 要求 `tokenIndex === units.length-1`），嵌套/未闭合映射会落兜底；迟到标识符仍 58（最大迟到 +43 → +33）。
3. `ParseTypeParameterOnly` / `ParseParameterPrefix` 仍在用，未逐字化。
4. 兜底报错形态名只到 body 首单元。
5. 23 条目标的 `.infer` 均未重生成（`.md` 已重生成）。

**结论：P5 判定 done**；唯一阻塞项：无（`alias-fn-type` 树未变属预期，`.infer` 为已知遗留、非门禁项）。
