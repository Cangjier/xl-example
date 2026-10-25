#!/usr/bin/env node
// 目标 case 验证 harness（R1 T14/M4 交付 → R2 / R3 / R4 / R5 扩展）—— tests/direct-build/target-cases.mjs
//
// 规格来源（只读）：
//   _coord/CONTRACT.md §6             —— R1：CASES 10 条 / A1–A8 断言 / CLI / 输出 / 退出码
//   _coord/R2-CONTRACT.md §5          —— R2：目标 case 的 CLI、A9/A10/A11、
//                                        --group / --only=<case id> / --decline-stats / --baseline / --fault-inject
//   _coord/R2-TARGET-CASES.md         —— R2 逐条 ID 与期望（R2 中期口径）
//   _coord/REPORT-r2-verify-fix.md    —— 收口校正：60 条（43 → 60 的追加与改判逐条在报告 §2）
//   _coord/R3-CONTRACT.md §5/§6.1     —— R3：分组语义修正（r2 改 id.startsWith("R2-")，否则会吞掉 R3 造假绿）、
//                                        KNOWN_GROUPS + b1/b2/d7/s/r3、noBaseline（A10 SKIP）、
//                                        strict 全量化（--strict-all / case.strictAll + A12）、guard 类别
//   _coord/R3-TARGET-CASES.md         —— R3 32 条逐条 ID / 期望 / 断言差异（唯一权威编号表）
//   Lead 裁决 R3-Q1                   —— R2-SAFE-04/05 从 safe 改判 pos；--q1=pos|auto|safe（默认 auto）
//   Lead 裁决 R3-Q2 + A-1             —— D7 组 noBaseline=true（A10 SKIP），判据 = A1（AST==tsc）+ 计数证据
//   _coord/R4-CONTRACT.md §5/§6.1/§6.2 —— R4：40 条目标 case（B3 16 / B4 12 / C2 5 / D7 4 / S 3）、
//                                        分组 b3/b4/c2/d7/s/r4、A12 对 invalid/incomplete 的口径修正（R4-Q2）、
//                                        `--strict-all` 隐含 `--strict`（D6）
//   _coord/R4-TARGET-CASES.md         —— R4 40 条逐条 ID / 期望 / expectBuilt（唯一权威编号表）
//   Lead 裁决 R4-Q1                   —— R3-B1-neg-01/02/03 + R3-B2-neg-03 从 neg 改判 pos（--q4=pos|auto|legacy）
//   Lead 裁决 R4-Q2                   —— invalid / incomplete 的 A12 由「Parse 不抛」改为「两侧拒绝文案同源」
//   Lead 裁决 R4-Q3                   —— `async (a) => …` 本轮仍 neg（归 R5）
//   _coord/DECISIONS.md + Lead 裁决   —— D1（`let x = f()` 翻正例）、D3（逗号本轮做，`a, b` 等正例）、
//                                        C2（跨行 ASI 本轮保持 Decline，不作验收门）
//   _coord/DESIGN-all-possible.md §8  —— 三件套（AST 逐字段、XML、直建计数）
//   _coord/R5-CONTRACT.md §5/§6.1/§6.2 —— R5：57 条目标 case（TY 20 / DC 20 / RS 12 / CL 5）、
//                                        分组 ty/dc/rs/cl/r5、R5-A2 的 as/satisfies 行首（CL-pos-02/03 的 noBaseline）、
//                                        A6 的 `TypeBuilder` 不计口径（R2 的 `as` 起就成立）
//   _coord/R5-TARGET-CASES.md         —— R5 57 条逐条 ID / 期望 / expectBuilt（唯一权威编号表）
//   Lead 裁决 R5-Q1                   —— 8 条候选改判：3 条 expectBuilt 1→2 且删 a6Skip、3 条 neg→pos
//                                        （含 Q1 遗漏的 R3-B2-neg-04）、2 条 safe→pos（R2-SAFE-01/03）；
//   Lead 裁决 R5-Fix5-1（选 a）        —— R2-SAFE-01/03 **撤回 pos 改判、保持 safe**（实测 sessions=0 / built=0：
//                                        顶层 await/yield 的语句壳要求父是 `{` 块，顶层父是 SourceFileShape ⇒ 首格
//                                        Reject；根表达式路线又被 StatementRouteUtil.IsLegacyKeyword 判 Legacy。要直建
//                                        须改 statement-route-util.xl.md，留 R6）⇒ 生效 6 条，旧 pos 读数只作历史留存；
//                                        落盘为「新口径在 case 主字段 + 旧读数在 case.q5.legacy」
//                                        （**R6-A4 起 case.q5.legacy 与 --q5 一起删除**，见下）
//                                        `--q5=pos|auto|legacy`（默认 auto）按 build/ts 的实现痕迹逐条决定，
//                                        未合入窗口不造假红（与 R4-Q1 的 --q4 同构）
//   Lead 裁决 R5-Q2                   —— 条件类型 / 映射类型 / 模板字面量类型**收为 pos**（不写类型节点白名单）
//   Lead 裁决 R5-Q3                   —— `--q1` / `--q4` R5 保留、R6 一次性移除（R5 只同步注释）
//   Lead 裁决 R5-Q5                   —— 不做 `yield` / `await` 的上下文判定（壳存在即建）
//   _coord/HARNESS.md                 —— 构建链与已知坑（build/ts 入口、EOF 口径）
//   _coord/R6-CONTRACT.md §2.3/§5.2/§5.4 —— R6：55 条目标 case（CLS 24 / MOD 25 / HD 6）、分组 cls/mod/hd/r6、
//                                        **A6 三档**（0 / 精确值 / SKIP）、`--q1/--q4/--q5` **退役**（R6-A4）、
//                                        IMPLEMENTATION-ABSENT 口径（R6 实现未合入时 R6 组只报读数、不崩）
//   _coord/R6-TARGET-CASES.md         —— R6 55 条逐条 ID / 期望 / expectBuilt / A6 期望（唯一权威编号表）
//   Lead 裁决 R6-Q1                   —— 6 条改判：R2-SAFE-02 + R5-DC-neg-02/03/04/05 safe/neg→pos（按实测落盘）
//   Lead 裁决 R6-Q2                   —— A6 精确值档：新字段 a6ExpectExprLoads（精确相等，不等即红，不是 SKIP）
//   Lead 裁决 R6-A4                   —— --q1/--q4/--q5 兼容开关退役（合并态全 pos；保留 deprecated 读取并打印）
//
//   期望类别（expect；R1 10 + R2 50 + R3 32 + R4 40 + R5 57 = 189 条 + R6 55 条 = **244 条**）：
//     pos         正例：直建必须接管（built>=1 / declined==0 / incomplete==0 / errors==0）
//     guard       【R3】同 pos，但 expectBuilt 是**不变的 1**（D7 防过度收缩：`let x = a⏎+ b` 仍是一条）
//     neg         负例：显式 Decline（declined>=1 / built==0 / errors==0）+ AST 仍与 tsc 一致（旧路径保证）
//                 【R3/D2】expectBodyBuilt 的 neg：built 必须等于**体内语句自己的壳**的读数（不是 0），
//                 因为该负例的体里有已经实现的语句族（`for (let …) { b; }`：b; 本来 built=1）
//     safe        无 session 构造（await / class / yield / if / return）：只断言 built==0 + AST 一致，
//                 **不断言 declined>=1**（这些语句根本不进 DirectSession，R1 语义是「没调用」不是「Decline」）
//     invalid     语法非法输入（`a ? b, c : d`）：直建显式 Decline，且本侧与基线同源拒绝同一文案；
//                 AST 无法与 tsc 比对（两侧 Parse 都抛），所以 A1/A10 改判「拒绝一致性」
//     incomplete  收口期失败（`a as` / `a +`）：R1 语义记 IncompleteFallback，不是 Declined；
//                 断言 built==0 + incomplete>=1 + errors==0，并与基线比对拒绝文案
//   【R3】case 新字段：
//     noBaseline  true = A10 改判 SKIP（旧基线 8456ec3c 自身错，见 R3-CONTRACT §1.3），判据 = A1 + 计数
//     strictAll   true = 即使 expect != pos，也在 --strict 下解析（strict 全量化的证明 case → A12）
//     markerScope "boundary" = 构造标记只看 statement-boundary-util 产物（D7 的唯一修改点）
//     q1          true = R2-SAFE-04/05，R3-Q1 改判 pos，--q1=auto|safe 时可回退 safe
//     expectBodyBuilt 【R3，REPORT-r3-control §6-D2】负例的 built 读数**来自体内语句自己的壳**（不是本条语句的壳）时，
//                 用它代替 built==0：A4 断言 declined>=1 && built==expectBodyBuilt && errors==0，
//                 分类 verdict 同 neg（A9 仍判该族的 category）。`for (let …) { b; }` / `for (const k in o) { b; }` 用它。
//     incompleteOk 【R4】`invalid` 的直建拒绝机制是 IncompleteFallback 时用（R4-S-01/02，R4-CONTRACT §5.3）：
//                 A4 的 invalid 判定从「declined>=1」放宽成「declined>=1 **或** incompleteFallback>=1」，
//                 built==0 / errors==0 不变。`a +` 的实测就是 incomplete=1 declined=0。
//     q4           【R4】R4-Q1 的 4 条改判位：{ probe, legacyExpect, legacyBodyBuilt }。
//                 `--q4=auto`（默认）按 probe（build/ts 直建产物里的实现痕迹）逐条决定：
//                 痕迹出现 → 按 pos 验收；没出现（R4 实现尚未合入）→ 退回 R3 口径的 neg + expectBodyBuilt，
//                 避免「实现没到」被 4 条改判记成回归。`--q4=pos` 强制新口径（合并后验收用），`--q4=legacy` 强制旧口径。
//                 安全的失败方向：痕迹没命中而实现其实已在 → 退回的 neg 断言 built 精确值，仍会**红**（不会假绿）。
//
// 本脚本只读：不改产品源码、不改仓库文件、不跑任何全量门（gates / ast-json 6171 / coverage / samples）。
// 唯一的「进程内修改」是 --fault-inject=finish-throw：给 session 的 Finish 包一层一次性抛错（R2-CONTRACT §5.1，
// 注入发生在 harness 进程内，不改源码），用来证明 C4 的 H2 try/catch 计数路径真的被走到。
//
// 用法（在克隆根目录）：
//   node tests/direct-build/target-cases.mjs
//   node tests/direct-build/target-cases.mjs --group=r1
//   node tests/direct-build/target-cases.mjs --group=A1,A2 --expect-direct --strict --trace
//   node tests/direct-build/target-cases.mjs --only=R2-C1-01,R2-A4-04 --expect-direct --baseline=<8456ec3c 克隆>
//   node tests/direct-build/target-cases.mjs --only=R2-C4-01 --fault-inject=finish-throw --expect-direct
//   node tests/direct-build/target-cases.mjs --expect-direct --strict --decline-stats --json > r2-readings.json
//
// 断言（R1 A1–A8 + R2 A9–A11 + R3 A12）：
//   A1  cjAst(root.Data) JSON === sf.statements.map(tsAst) JSON（唯一归一表 ast-compare.mjs）  —— 全部 case
//   A2  同源解析两次 ToXmlString() 逐字节相同（C4 注入 case：注入那次 vs 不注入那次）
//   A3  XML 非空且根下节点数 == TS 顶层语句数（`{ let x = 1; }` 是 1；built 是 2 —— 两层口径不同）
//   A4  正例 / guard built>=1 && declined==0 && incomplete==0 && errors==0 && strictViolations==0
//       负例 declined>=1 && built==0 && errors==0（C4 之后也不许走异常兜底）
//                 【R3/D2】带 expectBodyBuilt 的负例：built 必须等于该值（体内语句自己的壳），仍要 declined>=1
//       safe built==0 && errors==0（**不**断言 declined：这类语句不进 DirectSession）
//       invalid / incomplete built==0 && errors==0，且 invalid 要 declined>=1、incomplete 要 incomplete>=1
//                 【R4】invalid 带 incompleteOk：declined>=1 **或** incompleteFallback>=1 均可（R4-S-01/02）
//       C4  注入后 errors==1 且 LastError 含 inject 且 declined==0；第二次解析（Reset 后、不注入）errors==0
//   A5  --strict 时计数器仍全 0（只看计数器，不看是否抛；非正例 SKIP）
//   A6  【R6-Q2】三档（同一份读数，期望不同；非正例 SKIP）：
//       ① 默认档（不写字段）：stmtLoads + exprOtherDirect + exprLegacy == 0（旧路径零次事后 Build/reparse）
//       ② 精确值档（R6 新增）：case.a6ExpectStmtLoads / case.a6ExpectExprLoads 任给一个即启用（缺省 0）——
//          `stmtLoads === N && exprOtherDirect + exprLegacy === M`，**不等即红**（--expect-direct 下 FAIL，
//          不是 SKIP；默认模式记 READING）。class 成员体 wrapper / namespace 体语句的固有 Load 用它钉住（R6-CONTRACT §2.1/§2.3）
//       ③ SKIP 档（R4-Q5/Q6 遗留 3 条）：case.a6Skip 只记读数、不判（switch 子句 2 条 + C4 注入 1 条）
//       口径补充：TypeBuilder 内部走 direct-token-util 的 ExpressionBuilder.Load 不计入（R2 起）；只有
//       exprOtherDirect + exprLegacy 进精确值档的 M。
//       C4 注入 case 的口径：A6 量**第二次（不注入）解析**——注入那次必然回落旧路径，量它没有意义（见 REPORT §4）
//       【R4-Q5/Q6】带 case.a6Skip 的 case 只**记读数**、不判 0（--expect-direct 也不强制）：
//         - Q6 switch：子句语句由 CaseClauseStatementPossibleShape 建壳、不接 Attach ⇒ stmtLoads == 子句语句数。
//       【R5-Q1】Q5 的 body-legacy 三条（R4-B4-pos-01/02/04）在 R5 已按改判落盘（expectBuilt 1→2、a6Skip 删除）；
//         【R6-A4】起 `--q5` 已退役，旧读数（case.q5.legacy / 旧 a6Skip）**整体删除**，不存在运行时回退。
//         【R5-Fix5-1】R2-SAFE-01/03 保持 safe（顶层 await/yield 没有壳，留 R7）。
//   A7  --trace 时 Traces 含 `insert(`（仅 expectInsert 的 case；非正例 SKIP）
//   A8  --expect-direct 时 A4/A6 强制（--strict 时再加 A5/A12；A9/A11 同口径）
//   A9  【R2】负例（含 invalid）的 DeclineReasons 里期望 category 计数 >=1（无分类能力 → SKIP）
//   A10 【R2】XML == 基线（另一个已构建的 8456ec3c 克隆）；未给 --baseline → SKIP；
//        invalid / incomplete 改比「两侧 Parse 拒绝文案一致」；**noBaseline 的 case 恒 SKIP**（R3）
//   A11 【R2】正例 / guard 的 DeclineReasons 全空（declined==0 的强形式；无分类能力 → SKIP）
//   A12 【R3】strict 全量化：在该 case 真的以 Strict=true 解析时 —— Parse 不抛（neg / safe）、errors==0、
//        正例 strictViolations==0 / 非正例 strictViolations>=1（safe 不要求）。没在 strict 下解析 → SKIP
//        【R4-Q2】invalid / incomplete **不再要求 Parse 不抛**（定义就是两侧 Parse 都抛）：改为
//        errors==0 && strictViolations>=1 && **两侧拒绝文案同源**（PARSE-REJECT-PARITY，与 A10 的 invalid 规则同口径）
//   A13 无（R4 不新增断言）；R4 只用 A1–A12，新增的只是负例 category 键与 `--strict-all` 的隐含 strict
//
// 「没实现 / 实现错了 / 未接线」三态区分（R1 起就有的口径，R2 扩到构造级）：
//   - DirectBuildMetrics 缺失 → A4=SKIP（默认）/ FAIL IMPLEMENTATION-ABSENT（--expect-direct）
//   - 模块在但导出/字段/方法不合法 → FAIL IMPLEMENTATION-BROKEN（这是「实现错了」）
//   - 有 metrics 但 statement-shape 没接 hook → --expect-direct 时 FAIL IMPLEMENTATION-UNWIRED
//   - 单条正例 built=0 && declined>=1 && 该构造的形状类在直建模块里根本没出现 → IMPLEMENTATION-ABSENT（未实现）
//     同一读数但形状类已出现 → IMPLEMENTATION-PRESENT-BUT-DECLINED（实现错了 / 被覆盖校验回退）
//   - 【R3】单条正例 built=0 && declined==0（该族根本没有 session 接进来）&& 形状类没出现 → IMPLEMENTATION-ABSENT
//     （R3 新族的基线形态：B1/B2 的壳不进 DirectSession，所以既没建也没 Decline）
//
// 退出码：任一断言 FAIL → 1；全过（含只有 SKIP/READING）→ 0。

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const REPO = path.resolve(import.meta.dirname, "..", "..");
const SEP = "=".repeat(72);

// ---------------------------------------------------------------------------
// CASES —— 目标 case（244 条：R1 10 + R2 50 + R3 32 + R4 40 + R5 57 + R6 55）
//   id           唯一编号；--only=<id> 精确匹配、--group=<组> 分组
//   expect       pos（直建必须接管）| guard（同 pos，built 恒 1）| neg（显式 Decline）| safe（无 session，built==0）
//                | invalid（语法非法：Decline + 两侧同源拒绝）| incomplete（收口期失败：IncompleteFallback）
//   markers      该 case 依赖的构造分支在直建产物里应该出现的形状/工厂名（只用于区分
//                「没实现（absent）」与「实现错了」；不参与 PASS/FAIL 判定）
//   markerScope  缺省 "direct"（build/ts/.../direct/*.js）；"statementShape" 只看 statement-shape 产物；
//                【R3】"boundary" 只看 statement-boundary-util 产物（D7 的唯一修改点）
//   categories   负例期望的 DeclineReasons category（A9；R2-CONTRACT §3.1 + R3-CONTRACT §4.6 闭集）
//   expectInsert case 含二元/赋值/逗号运算符插入 → --trace 时期望 Traces 有 insert(
//   expectBuilt  多语句 case 的 StatementsBuilt 精确值（**含体内语句**；R1-08 = 2，R3-B1-pos-03 = 2）
//   expectBodyBuilt 【R3】负例的 built 来自**体内语句自己的壳**时的精确值（代替 built==0；详见上方 case 新字段）
//   injection    C4：由 --fault-inject=finish-throw 注入，而不是源码 case
//   d1           该 case 的期望因 Lead 裁决 D1 翻转（`let x = f()` 由负例改正例）
//   noBaseline   【R3】A10 改判 SKIP（旧基线 8456ec3c 自身错；D7 组）
//   strictAll    【R3】即使 expect != pos 也在 --strict 下解析（R3-S；A12 判 strictViolations）
//   incompleteOk 【R4】invalid 的直建拒绝机制是 IncompleteFallback（R4-S-01/02）：A4 允许 incomplete>=1 代替 declined>=1
//   a6Skip       【R4-Q5/Q6】A6 只记读数不判的 reason（写进 A6 detail）：只剩 switch 的子句语句 2 条 + C4 注入 1 条
//                （stmtLoads 必然 >0，与 switch 自己是否直建无关）
//   a6ExpectStmtLoads 【R4-Q6】switch 类 case 的 stmtLoads 读数（配 a6Skip 时只记录）
//   a6ExpectStmtLoads / a6ExpectExprLoads 【R6-Q2】**A6 精确值档**（两者同给，缺省 0）：
//                `stmtLoads === N && exprOtherDirect + exprLegacy === M`；--expect-direct 下**不等即红**（不是 SKIP），
//                默认模式记 READING（读数为 --expect-direct 门准备）。R6 的 class / namespace / `export <声明>` 用它
//                钉住「成员体 wrapper / 体语句 wrapper」的固有 Load（R6-CONTRACT §2.1/§2.2）；数字来源见每条的 note。
//   【R6-A4】--q1 / --q4 / --q5 已退役：case 的 q1 / q4 / q5 字段**全部删除**，旧读数（legacy）不再保留；
//                相关 case（R2-SAFE-04/05、R3-B1-neg-01/02/03、R3-B2-neg-03/04、R4-B4-pos-01/02/04、
//                R4-B4-neg-01/03）的期望直接落 expect / expectBuilt 主字段（合并态即 pos）。
// ---------------------------------------------------------------------------
const CASES = [
  // ---- R1 原 10 条（不回归；R1-10 按 D1 翻为正例） ----
  { id: "R1-01", src: "let x = 2*3+1", expect: "pos", expectInsert: true,
    note: "变量语句 + 二元优先级（* 先于 +）+ 无分号（ASI）" },
  { id: "R1-02", src: "let x = 1;", expect: "pos", expectInsert: false,
    note: "最简 let + 分号" },
  { id: "R1-03", src: "const a = 2*3;", expect: "pos", expectInsert: true,
    note: "const 声明 + 乘法" },
  { id: "R1-04", src: "2*3+1", expect: "pos", expectInsert: true,
    note: "表达式语句（裸表达式根）" },
  { id: "R1-05", src: "let a=1,b=2", expect: "pos", expectInsert: false,
    note: "多声明（逗号不是 AST 子节点）" },
  { id: "R1-06", src: "2*(3+1)", expect: "pos", expectInsert: true,
    note: "括号递归 + 二元优先级" },
  { id: "R1-07", src: "-a*+b", expect: "pos", expectInsert: true,
    note: "前缀一元（运算符 token 不进 Data）" },
  { id: "R1-08", src: "let x = 2*3+1; let y=4*5+6;", expect: "pos", expectInsert: true, expectBuilt: 2,
    note: "两条语句（StatementsBuilt=2）" },
  { id: "R1-09", src: "let x = 1", expect: "pos", expectInsert: false,
    note: "ASI：end 停在末代码单元，无 ; 节点" },
  { id: "R1-10", src: "let x = f()", expect: "pos", expectInsert: false, d1: true,
    note: "Lead 裁决 D1：调用被直建覆盖 → 本轮起是正例",
    markers: ["CallExpressionShape", "call-expression-shape"] },

  // ---- A1 字面量与关键字操作数（4） ----
  { id: "R2-A1-pos-01", src: '"s"', expect: "pos", expectInsert: false,
    note: "StringLiteral 操作数（单引号 't' 同路径）",
    markers: ["StringLiteralShape", "string-literal-shape", "LiteralOperand"] },
  { id: "R2-A1-pos-02", src: "`a${b}c`", expect: "pos", expectInsert: false,
    note: "TemplateExpression：插值内必须用嵌套直建引擎（A6）",
    markers: ["TemplateExpressionShape", "template-expression-shape"] },
  { id: "R2-A1-pos-03", src: "1n", expect: "pos", expectInsert: false,
    note: "BigIntLiteral（0x1fn 见扩展项）",
    markers: ["BigIntLiteralShape", "big-int-literal-shape"] },
  { id: "R2-A1-pos-04", src: "let t = true && false", expect: "pos", expectInsert: true,
    note: "关键字叶子 + 二元 + 变量 session 初始化器（this / null 同路径）",
    markers: ["TrueKeywordShape", "FalseKeywordShape", "true-keyword-shape", "IsKeywordLiteral"] },

  // ---- A2 数组 / 对象字面量（5） ----
  { id: "R2-A2-pos-01", src: "[1,2]", expect: "pos", expectInsert: false,
    note: "数组字面量（, 不进 Data）",
    markers: ["ArrayLiteralExpressionShape", "array-literal-expression-shape"] },
  { id: "R2-A2-pos-02", src: "[a, ...b]", expect: "pos", expectInsert: false,
    note: "数组里的 spread 是正例（与调用参数 spread 相反）",
    markers: ["SpreadElementShape", "spread-element-shape"] },
  { id: "R2-A2-pos-03", src: "({a: 1})", expect: "pos", expectInsert: false,
    note: "语句首 { 属块族，必须括号包住才是值位",
    markers: ["ObjectLiteralExpressionShape", "object-literal-expression-shape"] },
  { id: "R2-A2-pos-04", src: "({a, b})", expect: "pos", expectInsert: false,
    note: "shorthand 属性",
    markers: ["ShorthandPropertyAssignmentShape", "shorthand-property-assignment-shape"] },
  { id: "R2-A2-pos-05", src: "({[k]: 1})", expect: "pos", expectInsert: false,
    note: "computed 属性名（ComputedPropertyNameShape 区间含 [ ]）",
    markers: ["ComputedPropertyNameShape", "computed-property-name-shape"] },

  // ---- A3 调用 / 成员 / 下标 / new / 可选链（6） ----
  { id: "R2-A3-pos-01", src: "f()", expect: "pos", expectInsert: false,
    note: "空实参：没有 args 子节点",
    markers: ["CallExpressionShape", "call-expression-shape"] },
  { id: "R2-A3-pos-02", src: "f(1,2)", expect: "pos", expectInsert: false,
    note: "实参逐个交给嵌套引擎；, 不进 Data",
    markers: ["CallExpressionShape", "call-expression-shape"] },
  { id: "R2-A3-pos-03", src: "a.b", expect: "pos", expectInsert: false,
    note: "成员访问（. 不进 Data）",
    markers: ["PropertyAccessExpressionShape", "property-access-expression-shape"] },
  { id: "R2-A3-pos-04", src: "a[0]", expect: "pos", expectInsert: false,
    note: "下标访问（与数组字面量同形不同位）",
    markers: ["ElementAccessExpressionShape", "element-access-expression-shape"] },
  { id: "R2-A3-pos-05", src: "a?.b?.(1)", expect: "pos", expectInsert: false,
    note: "两个 ?. 都是 QuestionDotToken 子节点",
    markers: ["QuestionDotToken", "question-dot-token"] },
  { id: "R2-A3-pos-06", src: "new a.b()", expect: "pos", expectInsert: false,
    note: "被构造者的后缀链整体进 NewExpression",
    markers: ["NewExpressionShape", "new-expression-shape"] },

  // ---- A4 赋值 / 复合赋值 / 条件 / 逗号 / as / 非空断言（6；D3：逗号本轮做） ----
  { id: "R2-A4-pos-01", src: "a = 1", expect: "pos", expectInsert: true,
    note: "简单赋值：运算符节点是 EqualsTokenShape（不是 Symbol）",
    markers: ["IsAssignmentOperator", "AssignmentPrecedence", "EqualsTokenShape"] },
  { id: "R2-A4-pos-02", src: "a = b = c", expect: "pos", expectInsert: true,
    note: "赋值右结合（AssignmentPrecedence=0 + IsRightAssociative）",
    markers: ["IsAssignmentOperator", "AssignmentPrecedence"] },
  { id: "R2-A4-pos-03", src: "a ? b : c", expect: "pos", expectInsert: false,
    note: "条件表达式（FrameStages 三个槽位；? / : 不进 Data）",
    markers: ["ConditionalExpressionShape", "FrameStages", "conditional-expression-shape"] },
  { id: "R2-A4-pos-04", src: "a, b", expect: "pos", expectInsert: true,
    note: "逗号表达式（Lead 裁决 D3：本轮做；不做时它是「静默错建」）",
    markers: ["CommaPrecedence", "IsCommaOperator"] },
  { id: "R2-A4-pos-05", src: "x as A[]", expect: "pos", expectInsert: false,
    note: "as + 类型子树（TypeBuilder.Load + ParseType，不经过 ExpressionBuilder）",
    // 注意：`IsAsOperator` 不能当 marker —— R1 的引擎就用它来显式 Decline（"类型断言不在本轮范围: as"），
    // 拿它判「已实现」会把未实现误标成 PRESENT-BUT-DECLINED。
    markers: ["AsExpressionShape", "as-expression-shape", "type-builder"] },
  { id: "R2-A4-pos-06", src: "a.b!", expect: "pos", expectInsert: false,
    note: "非空断言（! 不进 Data；必须同时有 C1 行终止符守卫）",
    markers: ["NonNullExpressionShape", "non-null-expression-shape"] },
  { id: "R2-A4-pos-07", src: "a ? (b, c) : d", expect: "pos", expectInsert: true,
    note: "真分支里的括号逗号：**合法 TS 正例**（R2-CONTRACT §1.1 原文误列为负例；Engine-A 实测 built=1 / AST MATCH / XML IDENTICAL）",
    markers: ["ConditionalExpressionShape", "CommaPrecedence", "ParenthesizedExpressionShape"] },

  // ---- A5 typeof / void / delete（3） ----
  { id: "R2-A5-pos-01", src: "typeof a", expect: "pos", expectInsert: false,
    note: "前缀一元同构：关键字 token 不进 Data",
    markers: ["TypeOfExpressionShape", "type-of-expression-shape"] },
  { id: "R2-A5-pos-02", src: "void 0", expect: "pos", expectInsert: false,
    note: "void 前缀一元",
    markers: ["VoidExpressionShape", "void-expression-shape"] },
  { id: "R2-A5-pos-03", src: "delete a.b", expect: "pos", expectInsert: false,
    note: "前缀 + 后缀链组合（A5 × A3）",
    markers: ["DeleteExpressionShape", "delete-expression-shape"] },

  // ---- A 负例（4）：显式 Decline，AST 仍 MATCH；A9 期望 category ----
  { id: "R2-A1-neg-01", src: "/a/g", expect: "neg", expectInsert: false,
    note: "正则字面量本轮不做",
    categories: ["expr.decline"] },
  { id: "R2-A2-neg-01", src: "({m(){}})", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "【R4-Q4 改判 neg→pos】B4-c 对象方法落地后必然翻转（R4-CONTRACT §5.2 未列，REPORT-r4-func §6）：" +
      "与 R4-B4-guard-02（`({ m() {} })`）**同源代码**，built=1（表达式语句；空方法体没有别的壳）。" +
      "旧口径（neg + expr.decline）只在 B4-c 未合入时成立",
    markers: ["DirectObjectMemberAssembly"] },
  { id: "R2-A3-neg-01", src: "f(...a)", expect: "neg", expectInsert: false,
    note: "调用参数 spread 本轮不做（数组里的 spread 是正例 A2-02）",
    categories: ["expr.decline"] },
  { id: "R2-A4-neg-01", src: "x satisfies T", expect: "neg", expectInsert: false,
    note: "as 做、satisfies 不做（同一条 IsAsOperator 上只放行 as）",
    categories: ["expr.decline"] },
  { id: "R2-A4-neg-02", src: "a ? b, c : d", expect: "invalid", expectInsert: false,
    note: "**真正的**非法输入（R2-CONTRACT §1.1 原先把 `a ? (b, c) : d` 误列为负例）：真分支不能是逗号表达式；" +
      "直建显式 Decline，旧路径与基线同源拒绝同一文案（AST 无法比对，因为两侧 Parse 都抛）",
    categories: ["expr.decline"], syntaxInvalid: true },

  // ---- X 泛型实参（8）：A3 覆盖调用后引入的静默错建回归，Engine-A 27ac618e 已改为显式 Decline ----
  // 负例 5：旧路径兜住（AST MATCH + XML IDENTICAL），直建必须 declined>=1
  { id: "R2-GEN-neg-01", src: "f<T>(1)", expect: "neg", expectInsert: false,
    note: "泛型实参调用：不得建成比较链 f < T > (1)",
    categories: ["expr.decline"], markers: ["AngleDepth", "PrevAngleClose"] },
  { id: "R2-GEN-neg-02", src: "f<string, number>(1)", expect: "neg", expectInsert: false,
    note: "多类型实参（, 不串层）",
    categories: ["expr.decline"], markers: ["AngleDepth", "PrevAngleClose"] },
  { id: "R2-GEN-neg-03", src: "a<b>(c)", expect: "neg", expectInsert: false,
    note: "单类型实参调用（与 x<y>z 只差紧邻的 `(`）",
    categories: ["expr.decline"], markers: ["AngleDepth", "PrevAngleClose"] },
  { id: "R2-GEN-neg-04", src: "new A<T>()", expect: "neg", expectInsert: false,
    note: "泛型实参 new（本轮范围外）",
    categories: ["expr.decline"], markers: ["AngleDepth", "PrevAngleClose"] },
  { id: "R2-GEN-neg-05", src: "f<A<B>>(1)", expect: "neg", expectInsert: false,
    note: "嵌套泛型实参 / `>>` 拆分：不得错建",
    categories: ["expr.decline"], markers: ["AngleDepth", "PrevAngleClose"] },
  // 正例对照 3：比较链本身不能被误伤（built>=1 + AST MATCH）
  { id: "R2-GEN-pos-01", src: "x<y>z", expect: "pos", expectInsert: true,
    note: "比较链正例对照（`<` `>` 之间不是类型实参）" },
  { id: "R2-GEN-pos-02", src: "a<b>c", expect: "pos", expectInsert: true,
    note: "比较链正例对照（与 a<b>(c) 只差紧邻的 `(`）" },
  { id: "R2-GEN-pos-03", src: "a<<b>(c)", expect: "pos", expectInsert: true,
    note: "位移 + 比较 + 调用：角括号不闭合时也必须不误 Decline" },

  // ---- SAFE 无 session 构造（5）：不能断言 declined>=1（根本不进 DirectSession） ----
  // 期望统一：built==0 && AST MATCH && XML==baseline，A4 只断言「没被直建接管」。
  { id: "R2-SAFE-01", src: "await a", expect: "safe", expectInsert: false,
    note: "【R5-Fix5-1 裁决 1(a)：pos 改判**撤回**，保持 safe】顶层 `await` 实测 built=0 declined=0 **sessions=0**" +
      "（AwaitStatementPossibleShape 要求父是 `{` 块，顶层父是 SourceFileShape ⇒ 首格 Reject；根表达式路线被 " +
      "StatementRouteUtil.IsLegacyKeyword 判 Legacy）⇒ 没有壳可直建，要落地须改 statement-route-util.xl.md，" +
      "留 R6。历史读数：R5-Q1 曾改判 pos/expectBuilt=1，实测未达成，故撤回",
    markers: ["BuildAwait"] },
  { id: "R2-SAFE-02", src: "class {}", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 0,
    note: "**【R6-Q1 改判】safe → pos**（R5 起就是 R6 占位）：`class {}` 在 tsc 是 ClassDeclaration（无名），" +
      "D1 的 ClassDeclarationDirectSession 用 HasNoName ⇒ allowAnonymous=true 直建；`--reg-class` 实测 built=1、" +
      "A1=YES、XML==基线、A6 精确 0/0",
    markers: ["ClassDeclarationDirectSession"] },
  { id: "R2-SAFE-03", src: "yield a", expect: "safe", expectInsert: false,
    note: "【R5-Fix5-1 裁决 1(a)：pos 改判**撤回**，保持 safe】同 R2-SAFE-01：顶层 `yield` sessions=0 / built=0，" +
      "壳的宿主必须是 `{` 块；且顶层还缺引擎的 `yield` 前缀分支。要直建须改 statement-route-util.xl.md，留 R6",
    markers: ["BuildYield"] },
  { id: "R2-SAFE-04", src: "if (a) b", expect: "pos", expectInsert: false,
    note: "**R3-Q1 改判 pos**：B1 注册后 if 不再 safe（safe 的定义是「该族没有 session」）。依赖 B1-2 单语句体（RawStatement）。" +
      "【R6-A4】--q1 已退役，期望直接落主字段（合并态即 pos；不再有运行时回退）",
    markers: ["IfStatementShape"] },
  { id: "R2-SAFE-05", src: "return a?b:c", expect: "pos", expectInsert: false,
    note: "**R3-Q1 改判 pos**：只依赖 B1-d 的 return 分支（不依赖 RawStatement）。【R6-A4】--q1 已退役，期望直接落主字段",
    markers: ["ReturnStatementShape"] },

  // ---- INC 收口期失败（2）：R1 语义记 IncompleteFallback，不是 Declined ----
  // 实测：built=0 / declined=0 / incomplete=1 / errors=0；旧路径与基线同源拒绝同一文案。
  { id: "R2-INC-01", src: "a as", expect: "incomplete", expectInsert: false,
    note: "类型不完整：引擎收口期失败 → Incomplete（R1 语义），不是 Decline；旧路径拒绝「类型意外结束」" },
  { id: "R2-INC-02", src: "a +", expect: "incomplete", expectInsert: false,
    note: "二元右操作数缺失：收口期失败 → Incomplete；旧路径拒绝「表达式意外结束」" },

  // ---- C 硬化（5） ----
  { id: "R2-C1-01", src: "a\n++b", expect: "pos", expectInsert: false,
    note: "C1 行终止符守卫：a⏎++b = a; ++b（AST MATCH + XML 与基线一致；现状是静默错建）",
    markers: ["PreviousUnit", "IsRestrictedPostfix", "IsRestrictedPostfixOperator"] },
  { id: "R2-C1-02", src: "a\n!b", expect: "pos", expectInsert: false,
    note: "C1 守卫对 ! 同判据：a⏎!b = a; !b（A4 落地后没有守卫就会回归）",
    markers: ["PreviousUnit", "IsRestrictedPostfix", "IsRestrictedPostfixOperator"] },
  { id: "R2-C3-01", src: "let {a} = b", expect: "neg", expectInsert: false,
    note: "C3 分类：解构绑定属范围外 → var.binding（--decline-stats 期望 total=1）",
    categories: ["var.binding"] },
  { id: "R2-C4-01", src: "2*3+1", expect: "pos", expectInsert: true, injection: "finish-throw",
    note: "C4 H2 异常计数：注入一次 Finish 抛错 → Errors=1 + LastError 含 inject + AST 仍 MATCH；第二次 errors=0",
    markerScope: "statementShape",
    markers: ["direct-build-metrics", "DirectBuildMetrics", "direct finish error"] },
  { id: "R2-C2-01", src: "a\nb", expect: "pos", expectInsert: false, expectBuilt: 2,
    note: "**R4 改判 neg→pos（本 case 原 note 已预告：R3 直建化时改 pos + built=2）**：" +
      "C2 跨行 ASI 落地后 `a; b;` 两条语句均直建（两条 ExpressionStatement(Identifier)）；" +
      "与 R4-C2-pos-01 同源码；A10 仍强制 XML==基线（**不设 noBaseline**，基线可比）" },

  // ===========================================================================
  // R3 目标 case（32 条；_coord/R3-TARGET-CASES.md 是唯一权威编号表）
  //   B1 15 = pos 12 + neg 3；B2 11 = pos 7 + neg 4；D7 4 = pos 3 + guard 1；S 2
  //   `built` 是 StatementsBuilt（**含体内语句**），与 A3 的「根下节点数」是两个口径：
  //     `{ let x = 1; }` → built=2（Block + VariableStatement），A3 根下节点数=1
  //   D7 组 noBaseline=true：A10 改判 SKIP（旧基线 8456ec3c 自身错），判据 = A1 + A4 计数 + A11
  // ===========================================================================

  // ---- B1 控制流语句（15：pos 12 + neg 3） ----
  { id: "R3-B1-pos-01", src: ";", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "空语句：EmptyStatementEndCode 在 `;` 那一格就 Accept，壳 endIndex = `;`",
    markers: ["EmptyStatementShape"] },
  { id: "R3-B1-pos-02", src: "{}", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "空块：ShellBlock → BlockPossibleShape.BuildByIndex 的 Attach；built=1（块自身）",
    markers: ["BlockFrom", "DirectStatementAssembly"] },
  { id: "R3-B1-pos-03", src: "{ let x = 1; }", expect: "pos", expectInsert: false, expectBuilt: 2,
    note: "**嵌套直建的核心**：体内变量语句由它自己的 session 建（built=2），外层只 BuiltChildren 收集；" +
      "A3 根下节点数=1（两层口径不同，不要混用）",
    markers: ["BlockFrom", "DirectStatementAssembly"] },
  { id: "R3-B1-pos-04", src: "if (a) { b; }", expect: "pos", expectInsert: false, expectBuilt: 2,
    note: "if + 体内已建语句（built=2：IfStatement + ExpressionStatement）；条件走 DirectExpressionEngine" +
      "（basePos = `(`.StartIndex+1）",
    markers: ["IfStatementShape"] },
  { id: "R3-B1-pos-05", src: "if (a) { b; } else { c; }", expect: "pos", expectInsert: false, expectBuilt: 3,
    note: "then / else 体各是一条已建语句（built=3）",
    markers: ["IfStatementShape"] },
  { id: "R3-B1-pos-06", src: "if (a) { b; } else if (c) { d; }", expect: "pos", expectInsert: false, expectBuilt: 3,
    note: "else-if 不是特殊语法：else 后面就是一条 if 语句（built=3）。**口径修正（REPORT-r3-control §6-D1，control 实测）**：" +
      "里层 if **没有自己的壳** —— 外层 if 壳的 Data 里就是 raw `if / (c) / {d}`（probe-r3-shells 实测外层壳 endIndex 覆盖整条链），" +
      "由外层 session 的 BuildRange 递归建、只计外层一次；写成 4 与 `if (a) { b; }`（then 块不计数）自相矛盾。" +
      "判据仍是 A1（AST==tsc 逐字段）+ A10（XML 与基线逐字节），两者在这条上都实测一致",
    markers: ["IfStatementShape"] },
  { id: "R3-B1-pos-07", src: "while (a) { b; }", expect: "pos", expectInsert: false, expectBuilt: 2,
    note: "while + 体内已建语句",
    markers: ["WhileStatementShape"] },
  { id: "R3-B1-pos-08", src: "do { b; } while (a);", expect: "pos", expectInsert: false, expectBuilt: 2,
    note: "do-while：结尾 `;` 属本语句（DoStatementEndCode）",
    markers: ["DoStatementShape"] },
  { id: "R3-B1-pos-09", src: "for (i = 0; i < n; i++) { b; }", expect: "pos", expectInsert: true, expectBuilt: 2,
    note: "**表达式 init**（声明 init 是 neg #13）；头里的 i++ 有运算符插入（A7）",
    markers: ["ForStatementShape"] },
  { id: "R3-B1-pos-10", src: "for (;;) { b; }", expect: "pos", expectInsert: false, expectBuilt: 2,
    note: "空槽 for：Data 里只有 body",
    markers: ["ForStatementShape"] },
  { id: "R3-B1-pos-11", src: "for (k in o) { b; }", expect: "pos", expectInsert: false, expectBuilt: 2,
    note: "for-in（绑定是**表达式**；const k 是 neg #14）",
    markers: ["ForInStatementShape"] },
  { id: "R3-B1-pos-12", src: "for (v of xs) { b; }", expect: "pos", expectInsert: false, expectBuilt: 2,
    note: "for-of",
    markers: ["ForOfStatementShape"] },
  // 【R4-Q1，Lead 已批准】R3-B1-neg-01/02/03 改判 pos（R4-TARGET-CASES §7.2 / R4-CONTRACT §5.2）：
  //   字段 expect 已经是 pos + expectBuilt；【R6-A4】--q4 已退役，旧口径（neg + expectBodyBuilt / stmt.head）**不再保留**。
  { id: "R3-B1-neg-01", src: "for (let i = 0; i < n; i++) { b; }", expect: "pos", expectInsert: true, expectBuilt: 2,
    note: "【R4-Q1 改判 neg→pos】for 头的声明列表由 DirectDeclarationAssembly 直建（R4-CONTRACT §4.3）：" +
      "built=2 = for 自己 + 体内 `b;` 自己的壳；头里的 `i++` 有运算符插入（A7）。R6-A4 起 --q4 退役，期望直接落主字段",
    categories: ["stmt.head"], markers: ["DirectDeclarationAssembly", "ForStatementShape"] },
  { id: "R3-B1-neg-02", src: "for (const k in o) { b; }", expect: "pos", expectInsert: false, expectBuilt: 2,
    note: "【R4-Q1 改判 neg→pos】for-in 的绑定是整个声明 list（R4-CONTRACT §4.3/§2.2）：built=2 = for-in 自己 + 体内 `b;`",
    categories: ["stmt.head"], markers: ["DirectDeclarationAssembly", "ForInStatementShape"] },
  { id: "R3-B1-neg-03", src: "switch (a) { case 1: b; }", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6Skip: "switch 子句语句由 CaseClauseStatementPossibleShape 建壳、不接 Attach（R4-CONTRACT §2.4）⇒ legacy 收口" +
      "（R4-Q6，与 switch 自己是否直建无关）",
    a6ExpectStmtLoads: 1,
    note: "【R4-Q1 改判 neg→pos】switch 自身直建（R4-CONTRACT §4.4）；子句语句的壳**不挂 session**（§2.4）" +
      "⇒ built=1（只有 switch 自己）、stmtLoads=1（=子句语句数，A6 SKIP）",
    categories: ["stmt.head"], markers: ["BuildSwitch", "SwitchStatementShape"] },

  // ---- B2 函数 / 箭头（11：pos 7 + neg 4） ----
  { id: "R3-B2-pos-01", src: "function f() {}", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "function 声明：走 FunctionDeclarationShape.FromUnits（静态工厂，**不是** builder）",
    markers: ["FunctionDeclarationDirectSession", "FromUnits"] },
  { id: "R3-B2-pos-02", src: "function f(a) {}", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "Identifier 参数由 FromUnits → BuildParameters 建（唯一正例参数形态）",
    markers: ["FunctionDeclarationDirectSession"] },
  { id: "R3-B2-pos-03", src: "function f(a) { return a; }", expect: "pos", expectInsert: false, expectBuilt: 2,
    note: "return 由 B1 的 return 分支建（built=2：FunctionDeclaration + ReturnStatement）",
    markers: ["FunctionDeclarationDirectSession", "ReturnStatementShape"] },
  { id: "R3-B2-pos-04", src: "function f() { let x = 1; }", expect: "pos", expectInsert: false, expectBuilt: 2,
    note: "与 R3-B1-pos-03 同一条嵌套通道（built=2：FunctionDeclaration + VariableStatement）",
    markers: ["FunctionDeclarationDirectSession"] },
  { id: "R3-B2-pos-05", src: "() => {}", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "B2-2（引擎）：体是块，BlockFrom 收集（空块）",
    markers: ["ArrowFunction", "EqualsGreaterThanToken"] },
  { id: "R3-B2-pos-06", src: "(a) => a", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "括号参数表（尽力项）",
    markers: ["ArrowFunction"] },
  { id: "R3-B2-pos-07", src: "a => a + 1", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "裸参数 + 表达式体（尽力项）",
    markers: ["ArrowFunction"] },
  { id: "R3-B2-neg-01", src: "function f(a = 1) {}", expect: "neg", expectInsert: false,
    note: "默认参数：TakeParameterInitializer 走表达式解析（A6 风险 R3-R3）",
    categories: ["stmt.func"], markers: ["FunctionDeclarationDirectSession"] },
  { id: "R3-B2-neg-02", src: "function f(...a) {}", expect: "neg", expectInsert: false,
    note: "rest 参数",
    categories: ["stmt.func"], markers: ["FunctionDeclarationDirectSession"] },
  { id: "R3-B2-neg-03", src: "function* g() {}", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "【R4-Q1 改判 neg→pos】生成器形态：Data=[AsteriskToken, Identifier g, Block]（R4-CONTRACT §4.5）；" +
      "built=1（函数自己；空体没有别的壳）",
    categories: ["stmt.func"], markers: ["FunctionDeclarationDirectSession", "AsteriskToken"] },
  { id: "R3-B2-neg-04", src: "async (a) => a", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "【R5-Fix5-2（Q1 第 8 条改判）neg→pos】与 R5-RS-pos-06 同一份源码：residual 的 `async` 箭头头落地后" +
      "built=1 declined=0 A6=0 A1=YES / XML=IDENTICAL（REPORT-r5-residual §5.2 实测）⇒ 再按 neg（built==0 + " +
      "expr.decline）判必然假红。【R6-A4】--q5 已退役，期望直接落主字段",
    categories: ["expr.decline"], markers: ["AsyncPending"] },

  // ---- D7 语句边界（4：pos 3 + guard 1）—— 全部 noBaseline，A10 改判 SKIP ----
  { id: "R3-D7-01", src: "let x = a\n++b", expect: "pos", expectInsert: false, expectBuilt: 2, noBaseline: true,
    note: "D7：AST 必须与 tsc 一致（`let x = a;` + `++b;`）。旧基线（8456ec3c）此处是错的（根下 6 个 raw token），" +
      "所以 A10 必须 SKIP 而不是红",
    markerScope: "boundary", markers: ["IsRestrictedPostfixUnit", "IsRestrictedPostfixText", "StatementTokenSets"] },
  { id: "R3-D7-02", src: "let x = a + b\n++c", expect: "pos", expectInsert: true, expectBuilt: 2, noBaseline: true,
    note: "初始器是二元表达式也要断在 b（A7：`a + b` 有运算符插入）",
    markerScope: "boundary", markers: ["IsRestrictedPostfixUnit", "IsRestrictedPostfixText", "StatementTokenSets"] },
  { id: "R3-D7-03", src: "let x = a\n!b", expect: "pos", expectInsert: false, expectBuilt: 2, noBaseline: true,
    note: "`!` 与 `++`/`--` 同一族（IsRestrictedPostfixUnit）",
    markerScope: "boundary", markers: ["IsRestrictedPostfixUnit", "IsRestrictedPostfixText", "StatementTokenSets"] },
  { id: "R3-D7-guard-01", src: "let x = a\n+ b", expect: "guard", expectInsert: false, expectBuilt: 1,
    note: "**防过度收缩**：`+` 能跨行接续，声明必须仍是**一条**（guard：built 恒为 1；这一条 A10 仍要求 XML==基线）",
    markerScope: "boundary", markers: ["IsRestrictedPostfixUnit", "IsRestrictedPostfixText", "StatementTokenSets"] },

  // ---- S strict 全量化（2；expect=neg，但 strictAll：在 --strict 下解析，靠 A12 判） ----
  { id: "R3-S-01", src: "let {a} = b", expect: "neg", expectInsert: false, strictAll: true,
    note: "R2 审计 §7 的原样缺陷：Strict 下 Decline 在 Ingest 抛穿 Parse。**Parse 不抛** + errors=0 + " +
      "strictViolations>=1 才是本轮修复（与 R2-C3-01 同源码、不同口径：R2 那条以 Strict=false 跑）",
    categories: ["var.binding"] },
  { id: "R3-S-02", src: "f(...a)", expect: "neg", expectInsert: false, strictAll: true,
    note: "走另一个 H3 站点（表达式 session），证明 H1′ 的 try/catch 对两条 H3 路径都成立",
    categories: ["expr.decline"] },

  // ===========================================================================
  // R4 目标 case（40 条；_coord/R4-TARGET-CASES.md 是唯一权威编号表）
  //   B3 16 = pos 12 + neg 3 + guard 1；B4 12 = pos 7 + neg 3 + guard 2；
  //   C2 5 = pos 2 + guard 3；D7 4 = pos 2 + guard 2；S 3 = invalid 2 + pos 1
  //   `built` 仍是 StatementsBuilt（**含各壳自己建的**），所以 try/catch 是 3、for 头声明是 2、
  //   switch 只有 1（子句语句的壳不挂 session，R4-CONTRACT §2.4）；
  //   D7 两条 pos 必须 noBaseline（旧基线把错 AST 逐字节复制了，A10 判 SKIP），判据 = A1 + expectBuilt + A11。
  // ===========================================================================

  // ---- B3 剩余语句族（16：pos 12 + neg 3 + guard 1） ----
  { id: "R4-B3-pos-01", src: "debugger;", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "DebuggerStatementShape，Data=[]；区间含 `;`（R4-CONTRACT §4.4 配方表）",
    markers: ["BuildDebugger"] },
  { id: "R4-B3-pos-02", src: "try { a; } catch (e) { b; }", expect: "pos", expectInsert: false, expectBuilt: 3,
    note: "built=3 = try 自己 + 体内 `a;` `b;` 各自的壳；CatchClause[VariableDeclaration[Identifier e], Block]" +
      "（catch 绑定是 VariableDeclaration，R4-CONTRACT §4.4）",
    markers: ["BuildTry", "BuildCatchClause"] },
  { id: "R4-B3-pos-03", src: "try { a; } finally { c; }", expect: "pos", expectInsert: false, expectBuilt: 3,
    note: "TryStatement[Block, Block]：**不许**补一个空 CatchClause；built=3 = try + `a;` + `c;`",
    markers: ["BuildTry"] },
  { id: "R4-B3-pos-04", src: "try { a; } catch (e) { b; } finally { c; }", expect: "pos", expectInsert: false, expectBuilt: 4,
    note: "Data=[Block, CatchClause, Block] 顺序固定；built=4 = try + a; + b; + c;",
    markers: ["BuildTry", "BuildCatchClause"] },
  { id: "R4-B3-pos-05", src: "try { a; } catch { b; }", expect: "pos", expectInsert: false, expectBuilt: 3,
    note: "无绑定 catch：CatchClause 只有 Block 子节点（TS 亦然）；built=3",
    markers: ["BuildTry", "BuildCatchClause"] },
  { id: "R4-B3-pos-06", src: "with (a) b;", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "单语句体走 RawStatement（B1-2 通道）⇒ 只有 with 自己计数；WithStatement[condition, ExpressionStatement]",
    markers: ["BuildWith"] },
  { id: "R4-B3-pos-07", src: "with (a) { b; }", expect: "pos", expectInsert: false, expectBuilt: 2,
    note: "块体已由 TryMountControlFlowBody 挂好 ⇒ `b;` 自己的壳建（built=2 = with + b;）",
    markers: ["BuildWith"] },
  { id: "R4-B3-pos-08", src: "switch (a) { case 1: b; default: c; }", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6Skip: "switch 子句语句由 CaseClauseStatementPossibleShape 建壳、不接 Attach（R4-CONTRACT §2.4）⇒ 它们由 legacy " +
      "收口，stmtLoads 必然 == 子句语句数（本 case 2；空 switch 0、1 子句 1、2 子句 2），与 switch 自己是否直建无关（R4-Q6）",
    a6ExpectStmtLoads: 2,
    note: "只有 switch 自己被计数（built=1）：CaseClauseStatementPossibleShape **不调 Attach**（R4-CONTRACT §2.4）；" +
      "CaseBlock[CaseClause[1, b;], DefaultClause[c;]]。A6 **SKIP**（Q6）：只记 stmtLoads/exprOther 读数，" +
      "stmtLoads=2（=子句语句数），不判 0",
    markers: ["BuildSwitch", "BuildCaseBlock"] },
  { id: "R4-B3-pos-09", src: "lbl: { a; }", expect: "pos", expectInsert: false, expectBuilt: 2,
    note: "标签(1) + `a;`(1)；LabeledStatement[Identifier lbl, Block]（ShellLabel(6) 注册 + BuildLabeled）",
    markers: ["BuildLabeled"] },
  { id: "R4-B3-pos-10", src: "lbl: for (;;) { break lbl; }", expect: "pos", expectInsert: false, expectBuilt: 2,
    note: "标签(1) + `break lbl;`(1)：标签体是**同一个** BuildRange 递归建的 ForStatement（不另计数）；" +
      "break 的标签操作数 Data=[Identifier]（R4-CONTRACT §4.4）",
    markers: ["BuildLabeled"] },
  { id: "R4-B3-pos-11", src: "for (let i = 0; ; ) { b; }", expect: "pos", expectInsert: false, expectBuilt: 2,
    note: "for(1) + `b;`(1)；ForStatement[VariableDeclarationList[…], Block]（空 cond / incr 槽**不装**）",
    markers: ["DirectDeclarationAssembly"] },
  { id: "R4-B3-pos-12", src: "for (let v of xs) { b; }", expect: "pos", expectInsert: false, expectBuilt: 2,
    note: "ForOfStatement[VariableDeclarationList[…], Identifier xs, Block]（`of` 不进 Data）；built=2",
    markers: ["DirectDeclarationAssembly"] },
  { id: "R4-B3-neg-01", src: "try { a; } catch (e: T) { b; }", expect: "neg", expectInsert: false,
    expectBodyBuilt: 2,
    note: "catch 绑定的**类型注解**本轮不做 ⇒ stmt.catch；built=2 来自体内 `a;` `b;` 自己的壳（expectBodyBuilt，" +
      "不是本条语句建树）；A1/A10 仍须 PASS（旧路径建树）",
    categories: ["stmt.catch"], markers: ["BuildTry", "BuildCatchClause"] },
  { id: "R4-B3-neg-02", src: "for (let {a} = b; ; ) { c; }", expect: "neg", expectInsert: false,
    expectBodyBuilt: 1,
    note: "for 头**解构绑定** ⇒ stmt.binding；built=1 来自体内 `c;` 自己的壳（expectBodyBuilt）",
    categories: ["stmt.binding"], markers: ["DirectDeclarationAssembly"] },
  { id: "R4-B3-neg-03", src: "switch (a) { case 1: case 2: b; }", expect: "neg", expectInsert: false,
    note: "空子句体（`case 1:` 后直接 `case 2:`）⇒ stmt.case；子句语句的壳不挂 session ⇒ built=0",
    categories: ["stmt.case"], markers: ["BuildSwitch"] },
  { id: "R4-B3-guard-01", src: "lbl: a;", expect: "guard", expectInsert: false, expectBuilt: 1,
    note: "**防过度建树**：标签不得把体内表达式语句再包一层（built 恒为 1）；现状零直建（kind 6 未注册）、" +
      "A1/A10 已 PASS，修完必须 built=1 且 A10 PASS",
    markers: ["BuildLabeled"] },

  // ---- B4 生成器 · async · 对象方法（12：pos 7 + neg 3 + guard 2） ----
  { id: "R4-B4-pos-01", src: "function* g() { yield 1; }", expect: "pos", expectInsert: false, expectBuilt: 2,
    note: "【R5-Q1 改判】expectBuilt 1→2 且删 a6Skip：`yield 1;` 由自己的壳直建（R5-CONTRACT §2.3）⇒ " +
      "函数(1) + `yield 1;`(1) = 2；A6 恢复强制 0。【R6-A4】--q5 已退役，旧的 expectBuilt=1 + a6Skip 不再保留。" +
      "Data=[AsteriskToken, Identifier g, Block]",
    markers: ["AsteriskToken"] },
  { id: "R4-B4-pos-02", src: "function* g(a) { yield a; }", expect: "pos", expectInsert: false, expectBuilt: 2,
    note: "【R5-Q1 改判】expectBuilt 1→2 且删 a6Skip（同 pos-01）；参数表仍是纯 Identifier" +
      "（ParametersAreIdentifiers 判据不变）。AST==tsc / XML==基线 / expectBuilt 精确仍强制",
    markers: ["AsteriskToken"] },
  { id: "R4-B4-pos-03", src: "async function f() {}", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "Data=[AsyncKeyword, Identifier f, Block]；AsyncKeyword.Pos=BasePos、区间= `async` 自己",
    markers: ["AsyncKeyword"] },
  { id: "R4-B4-pos-04", src: "async function f(a) { await g(a); }", expect: "pos", expectInsert: false, expectBuilt: 2,
    note: "【R5-Q1 改判】expectBuilt 1→2 且删 a6Skip：体内 `await g(a);` 由自己的壳直建 ⇒ " +
      "async function(1) + await 语句(1) = 2；A6 恢复强制 0。AST==tsc / XML==基线仍强制",
    markers: ["AsyncKeyword"] },
  { id: "R4-B4-pos-05", src: "({ m(a) { return a; } })", expect: "pos", expectInsert: false, expectBuilt: 2,
    note: "表达式语句(1) + 方法体 `return a;`(1)；ObjectLiteralExpression[MethodDeclaration[Identifier m, Parameter a, " +
      "Block[ReturnStatement]]]（对象方法体目录由 EnableObjectMethodBodyCatalog 挂好）",
    markers: ["DirectObjectMemberAssembly", "MethodDeclaration"] },
  { id: "R4-B4-pos-06", src: "({ get x() { return 1; } })", expect: "pos", expectInsert: false, expectBuilt: 2,
    note: "GetAccessor[Identifier x, Block[ReturnStatement]]；get 必须 0 参；built=2 = 表达式语句 + 体内 return",
    markers: ["DirectObjectMemberAssembly", "GetAccessor"] },
  { id: "R4-B4-pos-07", src: "({ m(a) { return a; }, n: 1 })", expect: "pos", expectInsert: false, expectBuilt: 2,
    note: "方法 + PropertyAssignment 混排（R2 的既有成员分支不许回归）；built=2 = 表达式语句 + 体内 return",
    markers: ["DirectObjectMemberAssembly"] },
  { id: "R4-B4-neg-01", src: "async (a) => await g(a)", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "【R5-Q1 改判 neg→pos】引擎补 `await` 前缀操作数 + `async` 箭头头（R5-CONTRACT §4.6）⇒ built=1；" +
      "tsc 形态 ArrowFunction[AsyncKeyword(0,5), Parameter(a), =>(9,12), AwaitExpression(12,23)]。" +
      "【R6-A4】--q5 已退役，期望直接落主字段",
    categories: ["expr.decline"] },
  { id: "R4-B4-neg-02", src: "function* g<T>() {}", expect: "neg", expectInsert: false,
    note: "泛型生成器头 ⇒ stmt.func（参数表/泛型头仍不在本轮）；built=0",
    categories: ["stmt.func"], markers: ["AsteriskToken"] },
  { id: "R4-B4-neg-03", src: "({ async m() {} })", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "【R5-Q1 改判 neg→pos】对象成员方法前缀扩到 `async` / `*`（R5-CONTRACT §4.7）⇒ " +
      "MethodDeclaration[AsyncKeyword, Identifier m, Block]，built=1（空体不多计）。【R6-A4】--q5 已退役，期望直接落主字段",
    categories: ["expr.member"], markers: ["DirectObjectMemberAssembly"] },
  { id: "R4-B4-guard-01", src: "({ x, y: 1 })", expect: "guard", expectInsert: false, expectBuilt: 1,
    note: "**防误判**：没有 `(` 的成员仍走 PropertyAssignment / ShorthandPropertyAssignment（R2 读数不变）；built 恒 1",
    markers: ["PropertyAssignment"] },
  { id: "R4-B4-guard-02", src: "({ m() {} })", expect: "guard", expectInsert: false, expectBuilt: 1,
    note: "**防空体多计**：空方法体不得计成 2（BuiltChildren 收集到 0 条）；built 恒 1 = 表达式语句",
    markers: ["DirectObjectMemberAssembly"] },

  // ---- C2 跨行 ASI（5：pos 2 + guard 3）—— 真修复点是 statement-shape 的 TryToClose / ShellPlainExpression ----
  //   【R5-C1/C2】statement-boundary-util 的 `IsAsiBoundary` 死分支（IsLineStartOperandBoundary / IsContinuationToken，
  //   R5-CONTRACT §1.4）在 R5 被删除 ⇒ markers 改看 statement-shape 产物 ["TryToClose","ShellPlainExpression"]；
  //   markers 只影响「没实现 / 实现错了」的诊断分类，不参与 PASS/FAIL 判定（R5-CONTRACT §6.2 第 3 条）。
  { id: "R4-C2-pos-01", src: "a\nb", expect: "pos", expectInsert: false, expectBuilt: 2,
    note: "两条 ExpressionStatement(Identifier)；A10 要求 XML==基线（legacy 的 2 条与直建的 2 条必须逐字节同形）；" +
      "与 R2-C2-01 同源码（该条已随本轮改判 pos + built=2）",
    markerScope: "statementShape", markers: ["TryToClose", "ShellPlainExpression"] },
  { id: "R4-C2-pos-02", src: "2\n3", expect: "pos", expectInsert: false, expectBuilt: 2,
    note: "两条 ExpressionStatement(NumericLiteral)；built=2",
    markerScope: "statementShape", markers: ["TryToClose", "ShellPlainExpression"] },
  { id: "R4-C2-guard-01", src: "a\n+ b", expect: "guard", expectInsert: false, expectBuilt: 1,
    note: "**二元续接必须仍是一条**（`+` 在 IsContinuationToken 里）；built 恒 1",
    markerScope: "statementShape", markers: ["TryToClose", "ShellPlainExpression"] },
  { id: "R4-C2-guard-02", src: "a\n(b)", expect: "guard", expectInsert: false, expectBuilt: 1,
    note: "调用位续接（`(`）；built 恒 1",
    markerScope: "statementShape", markers: ["TryToClose", "ShellPlainExpression"] },
  { id: "R4-C2-guard-03", src: "a\n[b]", expect: "guard", expectInsert: false, expectBuilt: 1,
    note: "下标位续接（`[`）；built 恒 1。同类 guard 还有 R3-D7-guard-01（声明里的 `+` 续接）",
    markerScope: "statementShape", markers: ["TryToClose", "ShellPlainExpression"] },

  // ---- D7 边界残留（4：pos 2 + guard 2）—— pos 两条 noBaseline（旧基线自身错，A10 SKIP） ----
  { id: "R4-D7-pos-01", src: "let x = a\n~b", expect: "pos", expectInsert: false, expectBuilt: 2, noBaseline: true,
    note: "`~` 进受限集合（IsRestrictedPostfixUnit）；现状 declined=2 var.init、A1 **NO**、根下 6 个 raw、XML=IDENTICAL" +
      "（旧路径把错 AST 逐字节复制进基线）⇒ noBaseline；判据 = A1 + expectBuilt + A11",
    markerScope: "boundary", markers: ["IsRestrictedPostfixUnit", "IsRestrictedPostfixText", "StatementTokenSets"] },
  { id: "R4-D7-pos-02", src: "let x = a\ntypeof b", expect: "pos", expectInsert: false, expectBuilt: 2, noBaseline: true,
    note: "`typeof` 是 Common（不是 Symbol）⇒ IsRestrictedPostfixUnit 的类型判别要一起改；现状 declined=2 var.stopped、" +
      "A1 **NO**、XML=IDENTICAL ⇒ noBaseline",
    markerScope: "boundary", markers: ["IsRestrictedPostfixUnit", "IsRestrictedPostfixText", "StatementTokenSets"] },
  { id: "R4-D7-guard-01", src: "let x = \n~b", expect: "guard", expectInsert: false, expectBuilt: 1,
    note: "前缀形态：`=` 收不住表达式（EndsExpression=false）⇒ **一条**；A10 照比 XML（这一条本来就是对的）",
    markerScope: "boundary", markers: ["IsRestrictedPostfixUnit", "IsRestrictedPostfixText", "StatementTokenSets"] },
  { id: "R4-D7-guard-02", src: "let x = \ntypeof b", expect: "guard", expectInsert: false, expectBuilt: 1,
    note: "同上；这条同时钉住「`typeof` 进了受限集合但没把前缀位误伤」`=` 之后仍是同一条声明",
    markerScope: "boundary", markers: ["IsRestrictedPostfixUnit", "IsRestrictedPostfixText", "StatementTokenSets"] },

  // ---- S strict-all 收口（3：invalid 2 + pos 1）—— A12 按 R4-Q2 的 PARSE-REJECT-PARITY 判 ----
  { id: "R4-S-01", src: "a +", expect: "invalid", expectInsert: false, expectBuilt: 0, strictAll: true,
    incompleteOk: true,
    note: "与 R2-INC-02 同源码：直建记 IncompleteFallback（declined=0）⇒ A4 用 incompleteOk；" +
      "目标 = errors==0 + strictViolations>=1 + 两侧拒绝文案同源（现状 errors=1 把 `DirectBuild strict(incomplete)` 穿出去了）" },
  { id: "R4-S-02", src: "a as", expect: "invalid", expectInsert: false, expectBuilt: 0, strictAll: true,
    incompleteOk: true,
    note: "与 R2-INC-01 同源码：走 `as` 的类型位，证明两条 H3 路径都被包住；口径同 R4-S-01" },
  { id: "R4-S-pos-01", src: "if (a) { b; }", expect: "pos", expectInsert: false, expectBuilt: 2, strictAll: true,
    note: "strictAll: true（在 --strict 下解析）：全量化**不许误伤正例**（strictViolations==0、errors==0、A1/A10 PASS）",
    markers: ["IfStatementShape"] },

  // ===========================================================================
  // R5 目标 case（57 条；_coord/R5-TARGET-CASES.md 是唯一权威编号表）
  //   TY 20 = pos 17（含 1 条尽力）+ neg 2 + guard 1；
  //   DC 20 = pos 13（含 1 条尽力）+ neg 5 + safe 1 + guard 1；
  //   RS 12 = pos 10 + neg 1 + guard 1；
  //   CL 5  = pos 3 + guard 2（pos 的 2 条依赖审批 R5-A2，不批则整条删除）。
  //   **R5 的 A6 口径**：`TypeBuilder` 的 `Load` **不计入 A6**（R2 的 `as` 分支起就如此，
  //   R5-CONTRACT §2.1.1）；R5 的 pos 仍要求 stmtLoads + exprOtherDirect + exprLegacy == 0。
  //   `built` 仍是 StatementsBuilt（**含体内语句 / 自己的壳**）：例如
  //   `function f(a: number) { return a; }` 是 1(函数) + 1(体内 return) = 2，
  //   与 R3-B2-pos-03 的 `function f(a) { return a; }` 同口径（tsc 顶层语句数仍是 1，A3 用另一个口径）。
  //   `--expect-direct` 未实现时红、默认模式报 IMPLEMENTATION-ABSENT（不崩）——
  //   这是 R5 的「先写红」，不是回归。
  // ===========================================================================

  // ---- TY 类型注解与类型节点（20：pos 17 + neg 2 + guard 1；feat-r5-types） ----
  //   变量注解：`VariableStatementDirectSession` 的 ExpectType 态（R5-CONTRACT §4.2）
  { id: "R5-TY-pos-01", src: "let x: number = 1;", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "变量注解的最简形态：VariableDeclaration[Identifier x(3,5), NumberKeyword(6,13), NumericLiteral 1(15,17)]；" +
      "**关键字类型是独立形状（NumberKeyword），不是 TypeReference**（R5-CONTRACT §4.2）",
    markers: ["DirectTypeAssembly", "ExpectType"] },
  { id: "R5-TY-pos-02", src: "let x: Array<T>;", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "**无初始化器**：`[Identifier, TypeReference]`；走 Finish 的 ExpectType 收口" +
      "（`let x: number;` 同路径）",
    markers: ["DirectTypeAssembly", "ExpectType"] },
  { id: "R5-TY-pos-03", src: "let x: number = 1", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "ASI（无 `;`）：类型 + 初始化器 + 壳在 EOF 收口；类型后遇 `=` 必须先把类型 flush 掉",
    markers: ["DirectTypeAssembly", "ExpectType"] },
  { id: "R5-TY-pos-04", src: "let a: number = 1, b: string = s;", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "多声明：`,` 之后回 ExpectBinding，两个声明各自带 Type；子节点顺序仍是 [Identifier, Type, Initializer]",
    markers: ["DirectTypeAssembly", "ExpectType"] },
  { id: "R5-TY-pos-05", src: "let x: A | B = a;", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "UnionType[A, B]",
    markers: ["DirectTypeAssembly", "ExpectType"] },
  { id: "R5-TY-pos-06", src: "let x: Array<Array<T>> = a;", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "**`>>` 是 ONE Symbol**：TypeBuilder.Load 内部拆成两个 `>`；覆盖校验必须用 `OriginalConsumed()`" +
      "（`At` 是虚拟单元数）—— R5-R10",
    markers: ["DirectTypeAssembly", "ExpectType"] },
  { id: "R5-TY-pos-07", src: "let x: [A, B] = t;", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "TupleType[A, B]（`[` `,` `]` 不进 children）",
    markers: ["DirectTypeAssembly", "ExpectType"] },
  { id: "R5-TY-pos-08", src: "let x: typeof a = a;", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "TypeQuery[Identifier a]；**类型位的 `typeof` 与 D7 行首的 `typeof` 是两件事**（不许互相干扰）",
    markers: ["DirectTypeAssembly", "ExpectType"] },
  { id: "R5-TY-pos-09", src: "let x: keyof A = k;", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "TypeOperator(keyof)[TypeReference A]",
    markers: ["DirectTypeAssembly", "ExpectType"] },
  { id: "R5-TY-pos-10", src: "let x: A[B] = c;", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "IndexedAccessType[TypeReference A, TypeReference B]",
    markers: ["DirectTypeAssembly", "ExpectType"] },
  //   函数参数 / 返回类型：ParametersAreTypeAnnotated 门 + 形态表扩「返回类型可选」（§4.3）
  { id: "R5-TY-pos-11", src: "function f(a: number) { return a; }", expect: "pos", expectInsert: false, expectBuilt: 2,
    note: "Parameter[Identifier a, NumberKeyword]；参数表**复用** FunctionDeclarationShape.BuildParameters" +
      "（A6 安全：只有默认值才走 ExpressionBuilder，已被新门拒掉）。built=2 = 函数 + 体内 return" +
      "（与 R3-B2-pos-03 同口径；R5-TARGET-CASES §1.2 写的 1 只数了语句本身）",
    markers: ["ParametersAreTypeAnnotated"] },
  { id: "R5-TY-pos-12", src: "function f(): number { return 1; }", expect: "pos", expectInsert: false, expectBuilt: 2,
    note: "FunctionDeclaration[Identifier f, NumberKeyword, Block]：返回类型在**参数之后、体之前**；built=2",
    markers: ["ParametersAreTypeAnnotated"] },
  { id: "R5-TY-pos-13", src: "function f(a: number): number { return a; }", expect: "pos", expectInsert: false, expectBuilt: 2,
    note: "参数注解 + 返回类型同时存在（形态表不再只数 code.length，要按位置扫描 `:`）；built=2",
    markers: ["ParametersAreTypeAnnotated"] },
  { id: "R5-TY-pos-14", src: "function f(a?: number) {}", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "Parameter[Identifier, QuestionToken, NumberKeyword]：`?` 是**子节点**；空体 ⇒ built=1",
    markers: ["ParametersAreTypeAnnotated"] },
  { id: "R5-TY-pos-15", src: "function f(...a: Array<number>) {}", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "Parameter[DotDotDotToken, Identifier, ArrayType[...]]：rest 是**首子节点**",
    markers: ["ParametersAreTypeAnnotated"] },
  { id: "R5-TY-pos-16", src: "function f(cb: (a: A) => B): void {}", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "参数里是 FunctionType、返回是 VoidKeyword（关键字类型 + 函数类型的组合）",
    markers: ["ParametersAreTypeAnnotated"] },
  { id: "R5-TY-pos-17", src: "for (let i: number = 0; ; ) { b; }", expect: "pos", expectInsert: false, expectBuilt: 2,
    note: "**尽力项**：DirectDeclarationAssembly 的 `:` 分支改为缓冲类型（原先 Decline stmt.type）⇒ " +
      "for(1) + 体内 `b;`(1) = 2。**不实现 ⇒ 整条删除**（不是改 neg）",
    markers: ["DirectDeclarationAssembly", "DirectTypeAssembly"] },
  { id: "R5-TY-neg-01", src: "let x!: number = 1;", expect: "neg", expectInsert: false,
    note: "**确定赋值断言 `!` 不在 R5**（R5-CONTRACT §1.1 D1-e）⇒ 仍是 var.type；A1/A10 由旧路径保证",
    categories: ["var.type"], markers: ["DirectTypeAssembly", "ExpectType"] },
  { id: "R5-TY-neg-02", src: "function f(a = 1) {}", expect: "neg", expectInsert: false,
    note: "**默认值必须继续拒**：`=` 会走 TakeParameterInitializer → ExpressionBuilder（A6 必然 >0）；" +
      "现状 exprLoads=1 就是证据 ⇒ ParametersAreTypeAnnotated 遇 `=` 必须 false",
    categories: ["stmt.func"], markers: ["ParametersAreTypeAnnotated"] },
  { id: "R5-TY-guard-01", src: "function f(a, b) { return a; }", expect: "guard", expectInsert: false, expectBuilt: 2,
    note: "**防误伤**：纯标识符参数表仍走 R3 的 ParametersAreIdentifiers 门（新门必须与旧门**并存**，不许替换）；" +
      "R3-B2-pos-03 的读数必须不变（built=2 = 函数 + 体内 return）",
    markers: ["FunctionDeclarationDirectSession"] },

  // ---- DC 声明族（20：pos 13 + neg 5 + safe 1 + guard 1；feat-r5-decl） ----
  //   声明壳已存在、DirectStatementHook.Attach 已调用 ⇒ 缺的只有 3 行 Register + 一个 session（§2.2）；
  //   `shape.Pos = this.BasePos` 是必需的（FromUnits 内部 start=0 会算出 0，R5-R2）。
  { id: "R5-DC-pos-01", src: "interface X { a: number; }", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "InterfaceDeclaration[Identifier X, PropertySignature(a, NumberKeyword)]；成员已闭合 ⇒ CollectBodyMembers 直接取",
    markers: ["DeclarationFamilyDirectSession"] },
  { id: "R5-DC-pos-02", src: "interface X { m(a: number): void; }", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "MethodSignature[Identifier m, Parameter(a, NumberKeyword), VoidKeyword]（`interface` 内只有 TypeBuilder ⇒ A6=0）",
    markers: ["DeclarationFamilyDirectSession"] },
  { id: "R5-DC-pos-03", src: "interface X {}", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "**空体**：覆盖校验不能把「体只有 `{}`」判成不完整（R5-R3）",
    markers: ["DeclarationFamilyDirectSession"] },
  { id: "R5-DC-pos-04", src: "interface X<T> { a: T; }", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "TypeParameter[Identifier T] 走 ParseTypeParameterList；`>>` 拆分同 TY-pos-06",
    markers: ["DeclarationFamilyDirectSession"] },
  { id: "R5-DC-pos-05", src: "type T = A;", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "TypeAliasDeclaration[Identifier T, TypeReference A]：**类型节点的免费载体**（RHS 由 TypeBuilder 全量读）",
    markers: ["DeclarationFamilyDirectSession"] },
  { id: "R5-DC-pos-06", src: "type T = Array<number>;", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "泛型实参",
    markers: ["DeclarationFamilyDirectSession"] },
  { id: "R5-DC-pos-07", src: "type T = A | B;", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "UnionType",
    markers: ["DeclarationFamilyDirectSession"] },
  { id: "R5-DC-pos-08", src: "type T = { a: number; };", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "TypeLiteral[PropertySignature]；**与 enum 的体括号要区分**（IsBodyBrace 判据）",
    markers: ["DeclarationFamilyDirectSession"] },
  { id: "R5-DC-pos-09", src: "type T<U> = U;", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "类型参数表 + 引用",
    markers: ["DeclarationFamilyDirectSession"] },
  { id: "R5-DC-pos-10", src: "type T = A extends B ? C : D;", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "ConditionalType —— **R5-Q2 裁决：收为 pos，不 Decline**（TypeBuilder 本来就会读，A1 是硬判据；" +
      "写白名单去拒反而是新增风险，R5-CONTRACT §2.1.3）",
    markers: ["DeclarationFamilyDirectSession"] },
  { id: "R5-DC-pos-11", src: "type T = { [K in A]: B };", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "MappedType（同 R5-Q2 的口径）",
    markers: ["DeclarationFamilyDirectSession"] },
  { id: "R5-DC-pos-12", src: "enum E { A, B }", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "EnumDeclaration[Identifier E, EnumMember(A), EnumMember(B)]；**成员门**：体括号内不得有顶格 `=`",
    markers: ["DeclarationFamilyDirectSession"] },
  { id: "R5-DC-pos-13", src: "type T = (x: A) => x is B;", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "**尽力项**：TypePredicate（ParseReturnType 分流）。**不实现 ⇒ 整条删除**",
    markers: ["DeclarationFamilyDirectSession"] },
  { id: "R5-DC-neg-01", src: "enum E { A = 1 }", expect: "neg", expectInsert: false,
    note: "成员初始值会调 ExpressionBuilder.Load（现状 exprLoads=2 就是证据）⇒ 必须 Decline，A6 才能为 0（R5-R4）",
    categories: ["decl.enum"], markers: ["DeclarationFamilyDirectSession"] },
  { id: "R5-DC-neg-02", src: "class C {}", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 0,
    note: "**【R6-Q1 改判】neg → pos**（R5 的占位）：kind 9 现在由 ClassDeclarationDirectSession 直建" +
      "（ClassDeclarationShape.BuildFromCode），空体 ⇒ A6 精确 0/0；`--reg-class` 实测 green",
    markers: ["ClassDeclarationDirectSession"] },
  { id: "R5-DC-neg-03", src: "@dec class C {}", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 1,
    note: "**【R6-Q1 改判】neg → pos**：kind 10（装饰器声明）随 D1 一起直建（BuildFromCode 自带装饰器循环）⇒ " +
      "A6 精确 0/1（装饰器表达式走 ExpressionBuilder）",
    markers: ["ClassDeclarationDirectSession"] },
  { id: "R5-DC-neg-04", src: "namespace N { const a = 1; }", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 2, a6ExpectExprLoads: 1,
    note: "**【R6-Q1 改判】neg → pos**：namespace 归 D2（ModuleFamilyDirectSession + ModuleBlockShape）⇒ " +
      "体语句 wrapper 1 + 变量声明 1 = 2，初始值 expr 1（A6 实测 2/1）",
    markers: ["ModuleFamilyDirectSession"] },
  { id: "R5-DC-neg-05", src: "declare const x: number;", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 0,
    note: "**【R6-Q1 改判】neg → pos**（D2 的 declare 分支：变量声明 + 前插 DeclareKeywordShape）。" +
      "A6 **实现期钉**：类型注解走 TypeBuilder（不计 A6）、无初始值 ⇒ 按 0/0 落盘（R6-TARGET-CASES §7.6）；" +
      "若实现期实测不同，**只改这两个数**，不许退回 a6Skip",
    markers: ["ModuleFamilyDirectSession"] },
  { id: "R5-DC-safe-01", src: "const enum E { A, B }", expect: "safe", expectInsert: false, expectBuilt: 0,
    note: "**不建壳**（根层 Decide 把 `const enum` 让给 legacy，实测 sessions=0 stmtLoads=0）；" +
      "注册声明族 session **不许**改变它。safe = 该族没有 session，不断言 declined（R5-Q4：不进 R5）" },
  { id: "R5-DC-guard-01", src: "type T = A;\nconst a = 1;", expect: "guard", expectInsert: false, expectBuilt: 2,
    note: "**防过度建树 / 防吞下一条**：type 的壳在 `;` 收口，`const` 走自己的变量 session ⇒ 两条各 +1（built=2，" +
      "tsc 顶层也是 2）；A10 必须 PASS（R5-R2 的 Pos 陷阱专用钉子）",
    markers: ["DeclarationFamilyDirectSession"] },

  // ---- RS 残余表达式 / 语句（12：pos 10 + neg 1 + guard 1；feat-r5-residual） ----
  //   yield / await 的壳已存在但不调 Attach（block-possible-shape 两处）⇒ 各加 1 行即可送到 session（§2.3）；
  //   **不做上下文判定**（R5-Q5）：壳存在即建 YieldExpression / AwaitExpression。
  { id: "R5-RS-pos-01", src: "function* g() { yield 1; }", expect: "pos", expectInsert: false, expectBuilt: 2,
    note: "函数(1) + `yield 1;`(1)；ExpressionStatement[YieldExpression[NumericLiteral]]；**A6 必须 0**" +
      "（与 R4 的 a6Skip 相反，R5-Q1 已改判）",
    markers: ["BuildYield"] },
  { id: "R5-RS-pos-02", src: "function* g() { yield* a; }", expect: "pos", expectInsert: false, expectBuilt: 2,
    note: "YieldExpression[AsteriskToken(21,22), Identifier a]：`*` **是子节点**（不是 Data 之外的标记）",
    markers: ["BuildYield"] },
  { id: "R5-RS-pos-03", src: "async function f() { await g(); }", expect: "pos", expectInsert: false, expectBuilt: 2,
    note: "ExpressionStatement[AwaitExpression[CallExpression]]；`await` token **不进 Data**；built=2",
    markers: ["BuildAwait"] },
  { id: "R5-RS-pos-04", src: "async function f() { await g() + 1; }", expect: "pos", expectInsert: true, expectBuilt: 2,
    note: "**优先级硬证据**：`(await g()) + 1`（不是 `await (g() + 1)`）⇒ await 必须进引擎的「前缀操作数」那一格，" +
      "优先级 = 一元前缀（R5-R5）；语句内 `+` 有运算符插入（A7）",
    markers: ["BuildAwait"] },
  { id: "R5-RS-pos-05", src: "async (a) => await g(a)", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "ArrowFunction[AsyncKeyword(0,5), Parameter(a), EqualsGreaterThanToken(9,12), AwaitExpression(12,23)]" +
      "（R4-B4-neg-01 的改判源，R5-Q1）",
    markers: ["AwaitExpression"] },
  { id: "R5-RS-pos-06", src: "async (a) => a", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "**没有 await 的 async 箭头**：证明 `async` 头本身已认（不靠 await 兜）；" +
      "不是箭头（`async(...)` 调用 / `async [x]` 下标）必须回退成 Identifier + 后缀链（R5-R6）",
    markers: ["AsyncPending"] },
  { id: "R5-RS-pos-07", src: "for await (const x of xs) { b; }", expect: "pos", expectInsert: false, expectBuilt: 2,
    note: "ForOfStatement[AwaitKeyword(3,9), VariableDeclarationList, Identifier xs, Block]：" +
      "`AwaitKeyword` **是子节点**（R5-R11）；built=2 = for + 体内 `b;`",
    markers: ["BuildFor"] },
  { id: "R5-RS-pos-08", src: "({ async m() { return 1; } })", expect: "pos", expectInsert: false, expectBuilt: 2,
    note: "MethodDeclaration[AsyncKeyword, Identifier m, Block[ReturnStatement]]；built=2 = 表达式语句 + 体内 return" +
      "（R4-B4-neg-03 的改判源）",
    markers: ["DirectObjectMemberAssembly"] },
  { id: "R5-RS-pos-09", src: "({ *m() { yield 1; } })", expect: "pos", expectInsert: false, expectBuilt: 2,
    note: "MethodDeclaration[AsteriskToken, Identifier m, Block[ExpressionStatement[YieldExpression]]]；built=2",
    markers: ["DirectObjectMemberAssembly"] },
  { id: "R5-RS-pos-10", src: "({ m(a: number) {} })", expect: "pos", expectInsert: false, expectBuilt: 1,
    note: "方法参数注解走**同一个** ParametersAreTypeAnnotated 门（直接引用，不复制第二份判据）；空体 ⇒ built=1",
    markers: ["DirectObjectMemberAssembly"] },
  { id: "R5-RS-neg-01", src: "({ m(a = 1) {} })", expect: "neg", expectInsert: false,
    note: "默认值 ⇒ ExpressionBuilder（现状 exprLoads=4）⇒ expr.member；成员门不许把 `=` 放过",
    categories: ["expr.member"], markers: ["DirectObjectMemberAssembly"] },
  { id: "R5-RS-guard-01", src: "({ set x(v) { } })", expect: "guard", expectInsert: false, expectBuilt: 1,
    note: "**防误伤**：R4 的 setter 分支读数必须不变（SetAccessor[Identifier x, Parameter(v), Block]；" +
      "现状 built=1 stmtLoads=0）",
    markers: ["DirectObjectMemberAssembly"] },

  // ---- CL 清理回归（5：pos 3 + guard 2；feat-r5-harden + R5-A2） ----
  //   本节不是「修 bug」，是给 C-1（删死分支）/ C-3（D7 单一来源）/ R5-A2（as·satisfies 行首）留可复跑的钉子。
  { id: "R5-CL-pos-01", src: "a\nb\nc", expect: "pos", expectInsert: false, expectBuilt: 3,
    note: "C-1 删除后 ASI 判据必须仍按行切 3 条（现状 built=3 A1=YES）；`IsAsiBoundary` 的 fallback 一行不动",
    markerScope: "statementShape", markers: ["TryToClose", "ShellPlainExpression"] },
  { id: "R5-CL-pos-02", src: "let x = a\nas;\nb;", expect: "pos", expectInsert: false, expectBuilt: 3, noBaseline: true,
    note: "**审批 R5-A2**：`as` 进受限后缀闭集 ⇒ 行首 `as` 另起语句。源为**合法等价输入** `let x = a` ⏎ `as;` ⏎ `b;`：" +
      "原 `let x = a` ⏎ `as b` 在 TS 里是**非法输入**（两个操作数相邻、缺分号），tsc 的 3 条是 missing-semicolon " +
      "**recovery** 的结果，R5 不引入该恢复语义（语句层 `CanEndStatement`/`TryToClose`，**R6**）；" +
      "改用合法源后 A2 已能验证「行首 `as` 不能跨行续接」⇒ built=3、A1=MATCH（harden §5.4 实测）。" +
      "**noBaseline**：旧基线把错 AST 逐字节复制进了 8456ec3c，修好后必然 DIFF（与 R4-D7 同构）；判据 = A1 + expectBuilt + A11",
    markerScope: "boundary", markers: ["IsRestrictedPostfixText", "StatementTokenSets"] },
  { id: "R5-CL-pos-03", src: "let x = a\nsatisfies;\nb;", expect: "pos", expectInsert: false, expectBuilt: 3, noBaseline: true,
    note: "同上（`satisfies` 与 `as` 同族，**审批 R5-A2**），源同样是合法等价输入 `let x = a` ⏎ `satisfies;` ⏎ `b;`：" +
      "`satisfies` 单条语句与 `as` 同构（harden §5.4：built=3、A1=MATCH），原非法源留给 R6 的恢复语义；noBaseline 口径同 CL-pos-02",
    markerScope: "boundary", markers: ["IsRestrictedPostfixText", "StatementTokenSets"] },
  { id: "R5-CL-guard-01", src: "a\n+ b\n+ c", expect: "guard", expectInsert: false, expectBuilt: 1,
    note: "**防过度收缩**：`+` 是合法续接，删死分支后仍必须是 **1** 条（现状 built=1 A1=YES）；" +
      "这一条 A10 仍照比 XML（基线本来就是对的）",
    markerScope: "boundary", markers: ["IsContinuation"] },
  { id: "R5-CL-guard-02", src: "for (const x of xs) { b; }", expect: "guard", expectInsert: false, expectBuilt: 2,
    note: "**防 `of` 误伤**：`of` 出现在 for 头（不是行首表达式位）时必须是正常的 for-of（built=2 = for + 体内 `b;`）",
    markers: ["DirectDeclarationAssembly"] },

  // ---- R6 目标 case（55 条：CLS 24 + MOD 25 + HD 6；R6-CONTRACT §5.1 / R6-TARGET-CASES 唯一编号表） ----
  //   A6 = **精确值档**（R6-Q2）：`a6ExpectStmtLoads` + `a6ExpectExprLoads` 同时给出即启用；
  //   `stmtLoads === N && exprOtherDirect + exprLegacy === M`，**不等即红**（--expect-direct 下 FAIL，不是 SKIP）。
  //   数字来源：R6-CONTRACT §2.1（class 的成员体 wrapper / 空体再 +1）、§2.2（namespace 体语句 ×1 + 1）。
  //   原先标 **[推断]** 的 10 条 `export <声明>` / `export default <expr>` 形态，**已按 class+module 合入树实测钉正**
  //   （R6-MOD §2 + R6 实测：pos-11/12 = 0/0、pos-13/19 = built 1 + stmtLoads 2、pos-14..18/20 = 0/0；
  //   见 REPORT-r6-verify-fix7）。数字为硬断言，--expect-direct 下不等即红。
  //   markers = 新会话 / 新装配的类名（build/ts 里没有它们 ⇒ IMPLEMENTATION-ABSENT，而不是「实现错了」）。
  //   R6 无新增 invalid / incomplete；`--expect-direct` 未开时 R6 组只报读数（IMPLEMENTATION-ABSENT 不崩）。

  // ---- CLS class 声明（24：pos 20 + guard 2 + neg 2；feat-r6-class） ----
  { id: "R6-CLS-pos-01", src: "class C {}", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 0,
    note: "空体：ClassDeclaration[Identifier C]，没有任何成员 ⇒ 无成员体 wrapper Load（A6 精确 0/0）",
    markers: ["ClassDeclarationDirectSession"] },
  { id: "R6-CLS-pos-02", src: "class C extends B {}", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 0,
    note: "HeritageClause[extends, TypeReference B]：类型走 TypeBuilder（不计 A6）⇒ 0/0",
    markers: ["ClassDeclarationDirectSession"] },
  { id: "R6-CLS-pos-03", src: "class C extends B implements I {}", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 0,
    note: "两个 clause 的**顺序**：extends 在前、implements 在后",
    markers: ["ClassDeclarationDirectSession"] },
  { id: "R6-CLS-pos-04", src: "class C { x = 1; }", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 1,
    note: "属性初始值走 ExpressionBuilder ⇒ exprOther=1（**精确值钉住**，不是 SKIP）",
    markers: ["ClassDeclarationDirectSession"] },
  { id: "R6-CLS-pos-05", src: "class C { x: number = 1; }", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 1,
    note: "类型注解走 TypeBuilder（不计 A6，R5 口径）；初始值仍 1 次",
    markers: ["ClassDeclarationDirectSession"] },
  { id: "R6-CLS-pos-06", src: "class C { protected x; }", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 0,
    note: "修饰词 + 无初始值 ⇒ 0/0",
    markers: ["ClassDeclarationDirectSession"] },
  { id: "R6-CLS-pos-07", src: "class C { readonly x = 1; }", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 1,
    note: "修饰词顺序 [readonly, Identifier x]",
    markers: ["ClassDeclarationDirectSession"] },
  { id: "R6-CLS-pos-08", src: "class C { accessor x = 1; }", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 1,
    note: "TS 4.9 `accessor` 修饰词（AccessorKeyword）",
    markers: ["ClassDeclarationDirectSession"] },
  { id: "R6-CLS-pos-09", src: "class C { m(a) { return a; } }", expect: "pos", expectInsert: false, expectBuilt: 2,
    a6ExpectStmtLoads: 1, a6ExpectExprLoads: 0,
    note: "类(1) + 体内块(1)；成员体 wrapper stmtLoads=1（**旧路径是 2**，直建后少 1）",
    markers: ["ClassDeclarationDirectSession"] },
  { id: "R6-CLS-pos-10", src: "class C { m() {} }", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 2, a6ExpectExprLoads: 0,
    note: "**空体**：只有类本身 +1（体内没有语句，块壳不建）；wrapper 2（成员体 + BuildBlock 的 raw 通道）",
    markers: ["ClassDeclarationDirectSession"] },
  { id: "R6-CLS-pos-11", src: "class C { m(a: number): number { return a; } }", expect: "pos", expectInsert: false, expectBuilt: 2,
    a6ExpectStmtLoads: 1, a6ExpectExprLoads: 0,
    note: "参数注解 + 返回类型都走 TypeBuilder（不计 A6）",
    markers: ["ClassDeclarationDirectSession"] },
  { id: "R6-CLS-pos-12", src: "class C { static s() {} }", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 2, a6ExpectExprLoads: 0,
    note: "StaticKeyword 是子节点；空体同 pos-10 ⇒ 2/0",
    markers: ["ClassDeclarationDirectSession"] },
  { id: "R6-CLS-pos-13", src: "class C { get g() { return 1; } set g(v) { } }", expect: "pos", expectInsert: false, expectBuilt: 2,
    a6ExpectStmtLoads: 3, a6ExpectExprLoads: 0,
    note: "两个访问器：get 非空(1) + set 空体(2) = **3**",
    markers: ["ClassDeclarationDirectSession"] },
  { id: "R6-CLS-pos-14", src: "class C { constructor(a) { this.a = a; } }", expect: "pos", expectInsert: false, expectBuilt: 2,
    a6ExpectStmtLoads: 1, a6ExpectExprLoads: 0,
    note: "Constructor[Parameter a, Block]；`this.a = a` 的赋值引擎接受（exprOther=0）",
    markers: ["ClassDeclarationDirectSession"] },
  { id: "R6-CLS-pos-15", src: "class C { static { a; } }", expect: "pos", expectInsert: false, expectBuilt: 2,
    a6ExpectStmtLoads: 1, a6ExpectExprLoads: 0,
    note: "ClassStaticBlockDeclaration[Block[ExpressionStatement a]]；`static` 本身不是子节点",
    markers: ["ClassDeclarationDirectSession"] },
  { id: "R6-CLS-pos-16", src: "class C { #p = 1; }", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 1,
    note: "PrivateIdentifier 是名字（`#` 不是独立子节点）",
    markers: ["ClassDeclarationDirectSession"] },
  { id: "R6-CLS-pos-17", src: "class C { [k: string]: number; }", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 0,
    note: "索引签名：IndexSignature[Parameter(Identifier k, StringKeyword), NumberKeyword]（走 TypeBuilder.ParseIndexParameter）",
    markers: ["ClassDeclarationDirectSession"] },
  { id: "R6-CLS-pos-18", src: "class C<T> { x: T; }", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 0,
    note: "TypeParameter T 在 Identifier 之后、HeritageClause 之前",
    markers: ["ClassDeclarationDirectSession"] },
  { id: "R6-CLS-pos-19", src: "class C { m?() {} }", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 2, a6ExpectExprLoads: 0,
    note: "QuestionToken 是子节点；`m?` 不能空格；空体 ⇒ 2/0",
    markers: ["ClassDeclarationDirectSession"] },
  { id: "R6-CLS-pos-20", src: "abstract class C { abstract m(): void; }", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 0,
    note: "声明修饰 `abstract` + 成员修饰 `abstract` + 无体方法 ⇒ 0/0",
    markers: ["ClassDeclarationDirectSession"] },
  { id: "R6-CLS-guard-01", src: "class C {}\nconst a = 1;", expect: "guard", expectInsert: false, expectBuilt: 2,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 0,
    note: "**防吞下一条**：class 壳在体 `}` 收口，`const` 走自己的变量 session ⇒ 两条各 +1；A10 必须 PASS",
    markers: ["ClassDeclarationDirectSession"] },
  { id: "R6-CLS-guard-02", src: "interface I {}\nclass C implements I {}", expect: "guard", expectInsert: false, expectBuilt: 2,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 0,
    note: "**跨族邻接**：声明族 session（kind 7）后紧跟 class 壳（kind 9），两条各 +1",
    markers: ["ClassDeclarationDirectSession"] },
  { id: "R6-CLS-neg-01", src: "const C = class {};", expect: "neg", expectInsert: false,
    categories: ["var.init"],
    note: "**类表达式本轮不做（R6-Q5 / 留 R7）**：要动引擎的操作数分支（`class` 作 primary）；旧路径建树正确 ⇒ 保持显式 Decline；现状 A1=YES XML==基线",
    markers: ["var.init"] },
  { id: "R6-CLS-neg-02", src: "let c = class X { m() {} };", expect: "neg", expectInsert: false,
    categories: ["var.init"],
    note: "有名类表达式同理（`var.init`）；旧路径建树正确 ⇒ 显式 Decline",
    markers: ["var.init"] },

  // ---- MOD 声明族 module / import / export / declare（25：pos 22 + safe 1 + neg 1 + guard 1；feat-r6-module） ----
  //   import 6 / export 子句 4：实测 A6 全 0；`export <声明>` 6 + `export default` 4：需一层 DirectExportAssembly。
  { id: "R6-MOD-pos-01", src: "import x from \"m\";", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 0,
    note: "ImportDeclaration[ImportClause, StringLiteral]；A6 实测 0/0",
    markers: ["ModuleFamilyDirectSession"] },
  { id: "R6-MOD-pos-02", src: "import { a, b as c } from \"m\";", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 0,
    note: "NamedImports + ImportSpecifier（`b as c` 的 as 不是子节点）",
    markers: ["ModuleFamilyDirectSession"] },
  { id: "R6-MOD-pos-03", src: "import * as ns from \"m\";", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 0,
    note: "NamespaceImport[AsteriskToken, Identifier ns, as]",
    markers: ["ModuleFamilyDirectSession"] },
  { id: "R6-MOD-pos-04", src: "import \"m\";", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 0,
    note: "**没有 ImportClause**：只有 moduleSpecifier",
    markers: ["ModuleFamilyDirectSession"] },
  { id: "R6-MOD-pos-05", src: "import x, { a } from \"m\";", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 0,
    note: "default 在前、NamedImports 在后",
    markers: ["ModuleFamilyDirectSession"] },
  { id: "R6-MOD-pos-06", src: "import type { a } from \"m\";", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 0,
    note: "TypeKeyword 是子节点",
    markers: ["ModuleFamilyDirectSession"] },
  { id: "R6-MOD-pos-07", src: "export { a };", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 0,
    note: "ExportDeclaration[NamedExports]；ExportDeclarationShape.FromUnits 直建",
    markers: ["ModuleFamilyDirectSession"] },
  { id: "R6-MOD-pos-08", src: "export { a as b } from \"m\";", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 0,
    note: "ExportSpecifier[a, as, b] + moduleSpecifier",
    markers: ["ModuleFamilyDirectSession"] },
  { id: "R6-MOD-pos-09", src: "export * from \"m\";", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 0,
    note: "AsteriskToken + `from`",
    markers: ["ModuleFamilyDirectSession"] },
  { id: "R6-MOD-pos-10", src: "export * as ns from \"m\";", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 0,
    note: "NamespaceExport[*, as, Identifier ns]",
    markers: ["ModuleFamilyDirectSession"] },
  { id: "R6-MOD-pos-11", src: "export const x = 1;", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 0,
    note: "**实测钉正**：变量声明（R1 直建）+ 前插 ExportKeyword ⇒ 0/0" +
      "（初始化器走 DirectExpressionEngine，**不计 A6**；旧路径才是 1/1）",
    markers: ["ModuleFamilyDirectSession", "DirectExportAssembly"] },
  { id: "R6-MOD-pos-12", src: "export let y = 2;", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 0,
    note: "**实测钉正**：同 pos-11（`let` 同为变量声明 + ExportKeyword，初始化器走引擎）⇒ 0/0",
    markers: ["ModuleFamilyDirectSession", "DirectExportAssembly"] },
  { id: "R6-MOD-pos-13", src: "export function f() {}", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 2, a6ExpectExprLoads: 0,
    note: "**实测钉正**：空体函数的体 wrapper 2（BuildBlock + 空体再 1）⇒ stmtLoads=2；" +
      "体内块**不计** StatementsBuilt ⇒ built=1（不是 2）",
    markers: ["ModuleFamilyDirectSession", "DirectExportAssembly"] },
  { id: "R6-MOD-pos-14", src: "export interface X { a: number; }", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 0,
    note: "**实测**：声明族（R5 直建）+ ExportKeyword ⇒ 全 0（成员类型走 TypeBuilder）",
    markers: ["ModuleFamilyDirectSession", "DirectExportAssembly"] },
  { id: "R6-MOD-pos-15", src: "export type T = A;", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 0,
    note: "**实测**：同上（type alias + ExportKeyword）",
    markers: ["ModuleFamilyDirectSession", "DirectExportAssembly"] },
  { id: "R6-MOD-pos-16", src: "export class C { m() {} }", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 2, a6ExpectExprLoads: 0,
    note: "**实测（class 合入后复跑确认）**：class（R6 D1）+ ExportKeyword；`m() {}` 空体 ⇒ built=1、2/0",
    markers: ["ModuleFamilyDirectSession", "DirectExportAssembly", "ClassDeclarationDirectSession"] },
  { id: "R6-MOD-pos-17", src: "export default class C {}", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 0,
    note: "**实测**：ClassDeclarationShape.BuildFromCode **自带** export/default 修饰词循环 ⇒ 零装配 0/0",
    markers: ["ModuleFamilyDirectSession", "DirectExportAssembly", "ClassDeclarationDirectSession"] },
  { id: "R6-MOD-pos-18", src: "export default class {}", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 0,
    note: "**实测**：无名：HasNoName ⇒ allowAnonymous=true（R6-CONTRACT §4.1 第 3 条）",
    markers: ["ModuleFamilyDirectSession", "DirectExportAssembly", "ClassDeclarationDirectSession"] },
  { id: "R6-MOD-pos-19", src: "export default function f() {}", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 2, a6ExpectExprLoads: 0,
    note: "**实测钉正**：FunctionDeclarationShape.FromUnits 不自带 export/default ⇒ 需装配（与 pos-17 的差别）；" +
      "空体体 wrapper 2 ⇒ stmtLoads=2、built=1（同 pos-13）",
    markers: ["ModuleFamilyDirectSession", "DirectExportAssembly"] },
  { id: "R6-MOD-pos-20", src: "export default 1;", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 0,
    note: "**实测**：ExportAssignment[ExportKeyword, DefaultKeyword, 1]：表达式走**引擎**（DirectStatementAssembly.ExpressionOf）⇒ exprOther=0",
    markers: ["ModuleFamilyDirectSession", "DirectExportAssembly"] },
  { id: "R6-MOD-pos-21", src: "namespace N {}", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 1, a6ExpectExprLoads: 0,
    note: "ModuleBlockShape 建体一次 wrapper，**空体也是 1**（A6 实测 1/0）",
    markers: ["ModuleFamilyDirectSession"] },
  { id: "R6-MOD-pos-22", src: "namespace N { const a = 1; }", expect: "pos", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 2, a6ExpectExprLoads: 1,
    note: "体语句 wrapper 1 + 变量声明再 1 = 2；初始值 expr 1（A6 实测 2/1）",
    markers: ["ModuleFamilyDirectSession"] },
  { id: "R6-MOD-safe-01", src: "import x = require(\"m\");", expect: "safe", expectInsert: false, expectBuilt: 0,
    note: "**实测 sessions=0 built=0**（根层候选直接建，走不到声明壳）⇒ 注册 module 分派**不许**改变它；" +
      "safe = 该族没有 session，不断言 declined（A1 MATCH + XML==基线）",
    markers: ["ModuleFamilyDirectSession"] },
  { id: "R6-MOD-neg-01", src: "using x = a;", expect: "neg", expectInsert: false,
    categories: ["decl.head"],
    note: "`using` 是 TS 5.2 的变量声明变体（tsc：VariableStatement[VariableDeclarationList, SemicolonToken]），" +
      "本轮不做（R6-Q5）⇒ `decl.head` 保持",
    markers: ["ModuleFamilyDirectSession"] },
  { id: "R6-MOD-guard-01", src: "import x from \"m\";\nconst a = 1;", expect: "guard", expectInsert: false, expectBuilt: 2,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 0,
    note: "**防吞下一条**：import 壳在 `;` 收口，`const` 走变量 session（--reg-module 实测 2 green）；A10 必须 PASS",
    markers: ["ModuleFamilyDirectSession"] },

  // ---- HD 收尾清理回归（6：neg 3 + guard 3；feat-r6-harden + feat-r6-verify） ----
  //   本节不是「修 bug」，而是给 R6 的三条清理留可复跑的钉子：
  //   ① 47 语料唯一差异的真因（`f<T>\`t\``）；② --q1/--q4/--q5 退役后 ASI 仍按行切；③ 角括号判据不回退。
  { id: "R6-HD-neg-01", src: "f<T>`t`;", expect: "neg", expectInsert: false,
    categories: ["expr.decline"],
    note: "**47 语料唯一差异的真因**（不是 `x<y>z` 角括号歧义）：引擎把 `f<T>` 当二元链 ⇒ " +
      "BinaryExpression(BinaryExpression(f<T)) > Template，tsc 是 TaggedTemplateExpression[Identifier f, TypeReference T, " +
      "NoSubstitutionTemplateLiteral]。R6-A3 修法 = `>` 后紧跟模板单元时 **Decline** ⇒ 回落旧路径（基线是对的）、" +
      "A9 命中 expr.decline。**现状红（A1=NO + XML DIFF 335 vs 425）**，harden 合入后转绿",
    markers: ["direct-expression-engine"] },
  { id: "R6-HD-neg-02", src: "f`t`;", expect: "neg", expectInsert: false,
    categories: ["expr.stopped"],
    note: "**不带的类型实参的 tagged template** 引擎本来就不建（旧路径正确）⇒ 钉住它，防 HD-neg-01 的修法顺手把它也接了",
    markers: ["direct-expression-engine"] },
  { id: "R6-HD-guard-01", src: "let x = a < b > c;", expect: "guard", expectInsert: false, expectBuilt: 1,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 0,
    note: "角括号歧义的**基准形**（`x<y>z` 类）：修 HD-neg-01 **不许**把它变 Decline（现状已绿，A10 PASS）",
    markers: ["AngleDepth", "PrevAngleClose"] },
  { id: "R6-HD-neg-03", src: "f<A>(x) < y;", expect: "neg", expectInsert: false,
    categories: ["expr.decline"],
    note: "`angle.ts:21` 的那一行（实测与基线 SAME）：泛型调用后接 `<` ⇒ 引擎必须继续 Decline（旧路径对）",
    markers: ["AngleDepth", "PrevAngleClose"] },
  { id: "R6-HD-guard-03", src: "a\nb\nc", expect: "guard", expectInsert: false, expectBuilt: 3,
    a6ExpectStmtLoads: 0, a6ExpectExprLoads: 0,
    note: "**--q1/--q4/--q5 退役的唯一行为证据**：开关删掉后 ASI 仍按行切 3 条（R5-CL-pos-01 同源，现绿）",
    markerScope: "statementShape", markers: ["TryToClose", "ShellPlainExpression"] },
  { id: "R6-HD-guard-04", src: "class C {}\nnamespace N {}", expect: "guard", expectInsert: false, expectBuilt: 2,
    a6ExpectStmtLoads: 1, a6ExpectExprLoads: 0,
    note: "**跨两个新族**的邻接：D1 与 D2 各自收口后不许互相吞（class 外壳 + namespace 外壳）。" +
      "A6 = 1/0：class 空体 0 + 空 namespace 体的 wrapper 1（R6-CONTRACT §2.2 实测 `namespace N {}` = 1/0；" +
      "R6-TARGET-CASES §3 表里写作 0/0 是笔误，见 REPORT 的口径更正）",
    markers: ["ClassDeclarationDirectSession", "ModuleFamilyDirectSession"] },
];

// ---------------------------------------------------------------------------
// 分组（R2-CONTRACT §5.1 + R3-CONTRACT §6.1 + R4-CONTRACT §6.2 第 1/6 条）：
//   r1 = R1-*，r2 = **R2-***（R3 修正：旧实现是「非 R1」，加 R3 后会把 R3 case 吞进 --group=r2 造成假绿），
//   r3 = R3-*，r4 = R4-*（三者互不吞：都是**前缀**判定）；
//   另按 ID 前缀取 A1…A5 / C1…C4 / GEN / SAFE / INC / B1 / B2 / D7 / S，以及 neg / pos 两个语义组。
//   【R4】b3/b4/c2/d7/s 是 **R4 的组名**，但 d7/s 与 R3-D7/R3-S 同名、c2 与 R2-C2 同名 ⇒ 裸名**只取 R4**
//   （R4-CONTRACT §5.1 的 16/12/5/4/3 是唯一口径）；旧轮的子组用带轮次的别名 `r2-c2` / `r3-d7` / `r3-s` 显式选取，
//   旧轮的「整轮」口径 --group=r1|r2|r3 不受影响。
// ---------------------------------------------------------------------------
function groupOf(id) {
  if (id.startsWith("R1-")) return "R1";
  // 【R2…R5】按「R<轮>-<组>-」取组名（R2-CONTRACT §5.1 + R3-CONTRACT §6.1）
  // 【R6】扩到 6：R6 的组名是 CLS / MOD / HD（`^R([23456])-`），与 R1–R5 的组名互不吞
  const m = /^R([23456])-([A-Z]\d|[A-Z]+)-/.exec(id);
  return m ? m[2] : "?";
}

const R4_GROUP_NAMES = ["b3", "b4", "c2", "d7", "s"];
// 【R5】ty/dc/rs/cl 是 R5 的组名（R5 前缀判定，与 R1–R4 互不吞；裸名本身不与任何旧组重名）
const R5_GROUP_NAMES = ["ty", "dc", "rs", "cl"];
// 【R6】cls/mod/hd 是 R6 的组名（R6- 前缀判定；`cls` 与 R5 的 `cl` 不同名，两者都不吞对方）
const R6_GROUP_NAMES = ["cls", "mod", "hd"];

const KNOWN_GROUPS = [
  "r1", "r2", "r3", "r4", "r5", "r6", "all", "a1", "a2", "a3", "a4", "a5", "c1", "c2", "c3", "c4",
  "gen", "safe", "inc", "b1", "b2", "b3", "b4", "d7", "s", "neg", "pos",
  // R5 的四个子组（裸名；也接受 r5-ty 这种带轮次的写法）
  "ty", "dc", "rs", "cl", "r5-ty", "r5-dc", "r5-rs", "r5-cl",
  // R6 的三个子组（裸名；也接受 r6-cls 这种带轮次的写法）
  "cls", "mod", "hd", "r6-cls", "r6-mod", "r6-hd",
  // 旧轮同名子组的显式别名（R4 起裸名 c2/d7/s 归 R4；R5 起 r5-* 与 r1-*/r2-*/r3-* 同构）
  "r2-c2", "r3-d7", "r3-s",
];

function groupMatches(c, token) {
  const t = token.toLowerCase();
  if (t === "all") return true;
  if (t === "neg") return c.neg;
  if (t === "pos") return !c.neg;
  if (t === "r1") return c.id.startsWith("R1-");
  // R3-CONTRACT §6.1 第 1 条：必须是前缀判定，不能是「非 R1」——否则 R3 case 会混进 R2 组
  if (t === "r2") return c.id.startsWith("R2-");
  if (t === "r3") return c.id.startsWith("R3-");
  if (t === "r4") return c.id.startsWith("R4-");
  if (t === "r5") return c.id.startsWith("R5-");
  if (t === "r6") return c.id.startsWith("R6-");
  if (R4_GROUP_NAMES.includes(t)) return c.id.startsWith("R4-") && c.group.toLowerCase() === t;
  if (R5_GROUP_NAMES.includes(t)) return c.id.startsWith("R5-") && c.group.toLowerCase() === t;
  if (R6_GROUP_NAMES.includes(t)) return c.id.startsWith("R6-") && c.group.toLowerCase() === t;
  const legacy = /^r([1-6])-([a-z]\d|[a-z]+)$/.exec(t);
  if (legacy) return c.id.startsWith(`R${legacy[1]}-`) && c.group.toLowerCase() === legacy[2];
  return c.group.toLowerCase() === t;
}

// ---------------------------------------------------------------------------
// 【R6-A4】--q1 / --q4 / --q5 兼容开关**已退役**（Lead 批准；R6-CONTRACT §5.4 第 5 条）：
//   - 合并态下 R2-SAFE-04/05、R3-B1-neg-01/02/03、R3-B2-neg-03/04、R4-B4-pos-01/02/04、
//     R4-B4-neg-01/03 的期望全部直接落主字段（pos / expectBuilt），**不再有运行时回退**；
//   - 旧读数的兼容读取（case.q1 / case.q4 / case.q5、resolveQ1/4/5、Q1:/Q4:/Q5: 行、MODE 的 q1=/q5= 段）
//     **整体删除**；CLI 仍接受这三个开关，但只打印一行 DEPRECATED 提示（不改变任何期望）；
//   - 行为钉子：R6-HD-guard-03（ ⏎  ⏎ c 仍按行切 3 条）与 R2-SAFE-04/05 的 pos 落盘。
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function usage() {
  return [
    "用法: node tests/direct-build/target-cases.mjs [--group=<g1,g2>] [--only=<id|序号|source>,...] [--trace] [--strict]",
    "                                            [--strict-all] [--expect-direct] [--json] [--decline-stats]",
    "                                            [--baseline=<repo>] [--fault-inject=finish-throw] [--help]",
    "",
    "  --group=...      逗号分隔的组：r1 | r2 | r3 | r4 | r5 | r6 | all | A1…A5 | C1…C4 | GEN | SAFE | INC",
    "                   | B1 | B2 | B3 | B4 | C2 | D7 | S | NEG | POS | TY | DC | RS | CL | CLS | MOD | HD",
    "                   （大小写不敏感；未给 = all。r1…r6 都是**前缀**判定、互不吞：r2 = R2-* … r6 = R6-*）",
    "                   【R4】b3/b4/c2/d7/s 是 **R4 的组名**（R4-CONTRACT §5.1 的 16/12/5/4/3）；",
    "                   旧轮的同名子组用 r2-c2 / r3-d7 / r3-s 显式选取（--group=r3 仍是 R3 全 32 条）",
    "                   【R5】ty/dc/rs/cl = R5-* 的四个子组；【R6】cls/mod/hd = R6-* 的三个子组（24/25/6）",
    "  --only=...       逗号分隔，先按 case ID 精确匹配（R6-CLS-pos-01），再退回 R1 语义：",
    "                   全数字 = 1 基序号（按 CASES 全表编号） / 精确 source / 子串 source",
    "  --trace          打开 DirectBuildMetrics.TraceEnabled，并断言 Traces 含 insert(（A7）",
    "  --strict         打开 DirectBuildMetrics.Strict，并断言计数器仍全 0（A5）+ strict 全量化（A12）",
    "  --strict-all     【R3/R4】把 Strict=true 也用到非正例（否则只对正例生效，H1 未捕获的 Decline 会遮断 AST）；",
    "                   【R4-D6】**隐含 --strict**（strictForParse = strict || strict-all），MODE 行打印",
    "                   `strict=on (implied by --strict-all)`；单独给它的旧行为是 no-op 陷阱，不可依赖",
    "  --expect-direct  断言直建确实被使用：A4/A6（及 --strict 的 A5/A12、A9/A11）强制（A8）；",
    "                   【R6】A6 的**精确值档**（a6ExpectStmtLoads / a6ExpectExprLoads）也在此模式下强制",
    "  --json           stdout 只输出一份 JSON 读数（供存盘/报告）",
    "  --decline-stats  打印 DECLINE-STATS 段（按 category 计数 + 最近 reason；无分类能力时打印 SKIP）",
    "  --baseline=<repo> 用另一个已构建的克隆（8456ec3c 的 build/ts）同源解析同一 case，比对 XML（A10）",
    "  --q1 / --q4 / --q5  **【R6-A4】已退役（deprecated）**：仍可传入（不报错），但**不改变任何期望**，",
    "                   只打印一行 DEPRECATED 提示；合并态下相关 case 的期望已直接落主字段。",
    "                   对应行为钉子：R6-HD-guard-03（ASI 仍按行切 3 条）/ R2-SAFE-04/05 的 pos。",
    "  --fault-inject=finish-throw  C4 专用：在 session 的 Finish 上熔断一次（进程内注入，不改源码）",
    "  --help           显示本帮助",
  ].join("\n");
}

function parseArgs(argv) {
  const flags = {
    only: null, group: null, trace: false, strict: false, strictAll: false, expectDirect: false,
    json: false, declineStats: false, baseline: null, faultInject: null,
    // 【R6-A4】--q1/--q4/--q5 已退役：只记录「传了但被忽略」，不参与任何期望
    deprecated: [],
    strictImplied: false, help: false,
  };
  const readValue = (i, inline, name) => {
    if (inline !== undefined) return { value: inline, next: i };
    const v = argv[i + 1];
    if (v === undefined || v.startsWith("--")) throw new Error(`参数 --${name} 缺少值`);
    return { value: v, next: i + 1 };
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) throw new Error(`无法识别的参数: ${arg}`);
    const eq = arg.indexOf("=");
    const name = eq >= 0 ? arg.slice(2, eq) : arg.slice(2);
    const inline = eq >= 0 ? arg.slice(eq + 1) : undefined;
    switch (name) {
      case "only": { const r = readValue(i, inline, name); flags.only = r.value; i = r.next; break; }
      case "group": { const r = readValue(i, inline, name); flags.group = r.value; i = r.next; break; }
      case "baseline": { const r = readValue(i, inline, name); flags.baseline = r.value; i = r.next; break; }
      case "fault-inject": { const r = readValue(i, inline, name); flags.faultInject = r.value; i = r.next; break; }
      case "q1":
      case "q4":
      case "q5": {
        const r = readValue(i, inline, name);
        flags.deprecated.push(`--${name}=${r.value}`);
        i = r.next;
        break;
      }
      case "trace": flags.trace = true; break;
      case "strict": flags.strict = true; break;
      case "strict-all": flags.strictAll = true; break;
      case "expect-direct": flags.expectDirect = true; break;
      case "json": flags.json = true; break;
      case "decline-stats": flags.declineStats = true; break;
      case "help": case "h": flags.help = true; break;
      default: throw new Error(`未知参数: --${name}`);
    }
  }
  if (flags.faultInject !== null && flags.faultInject !== "finish-throw") {
    throw new Error(`--fault-inject 只支持 finish-throw（收到 ${JSON.stringify(flags.faultInject)}）`);
  }
  // 【R6-A4】deprecated 读取：开关存在但已被忽略（不报错、不改变期望）；真正接得住它们的是主字段。
  if (flags.deprecated.length > 0) {
    console.error(
      `DEPRECATED: ${flags.deprecated.join(" ")} 已退役（R6-A4）—— 值被**忽略**，期望已直接落 case 主字段；` +
        `行为钉子见 R6-HD-guard-03 / R2-SAFE-04/05。`,
    );
  }
  // 【R4 / D6】--strict-all 隐含 --strict（R4-CONTRACT §6.2 第 3 条、DECISIONS D6）：
  //   单独给 --strict-all 在 R3 里是 **no-op**（实测 strict=off，与不加任何开关逐字段相同），留着就是陷阱。
  //   从 R4 起它 = strict=true + 非正例也在 strict 下解析；MODE 行打印 `strict=on (implied by --strict-all)`。
  if (flags.strictAll && !flags.strict) {
    flags.strict = true;
    flags.strictImplied = true;
  }
  return flags;
}

/** 先把全表标注（index/group/neg），再按 --group 过滤，再按 --only 选择（R2-CONTRACT §5.1）。
 *  neg = 「非正例」：NEG 组覆盖 neg / invalid / incomplete / safe（safe 也不该被当正例口径断言）；
 *  【R3】guard 是 pos 的强形式，**不算** neg；R3-Q1 的 SAFE-04/05 在这里按 --q1 决定 pos / safe。 */
function selectCases(all, flags) {
  // 【R6-A4】--q1/--q4/--q5 退役后不再有运行时改判：expect / expectBuilt / a6Skip 一律直接取 case 主字段。
  const annotated = all.map((c, i) => ({
    ...c,
    note: c.note,
    expect: c.expect,
    expectBuilt: c.expectBuilt,
    expectBodyBuilt: c.expectBodyBuilt,
    a6Skip: c.a6Skip,
    index: i + 1,
    group: groupOf(c.id),
    neg: c.expect !== "pos" && c.expect !== "guard",
  }));
  let pool = annotated;
  if (flags.group !== null && String(flags.group).trim() !== "") {
    const tokens = String(flags.group).split(",").map((s) => s.trim()).filter(Boolean);
    for (const token of tokens) {
      if (!KNOWN_GROUPS.includes(token.toLowerCase())) {
        throw new Error(`--group=${token} 不是已知组；可用：${KNOWN_GROUPS.join(",")}`);
      }
    }
    pool = annotated.filter((c) => tokens.some((t) => groupMatches(c, t)));
    if (pool.length === 0) throw new Error(`--group=${flags.group} 没有匹配任何 case`);
  }
  if (flags.only === null || String(flags.only).trim() === "") return pool;

  const tokens = String(flags.only).split(",").map((s) => s.trim()).filter(Boolean);
  const picked = new Set();
  for (const token of tokens) {
    const byId = annotated.filter((c) => c.id.toLowerCase() === token.toLowerCase());
    if (byId.length > 0) { for (const c of byId) picked.add(c.index); continue; }
    if (/^\d+$/.test(token)) {
      const n = Number(token);
      if (n >= 1 && n <= annotated.length) { picked.add(n); continue; }
      throw new Error(`--only=${token} 的序号超出范围（1…${annotated.length}）`);
    }
    const exact = annotated.filter((c) => c.src === token);
    if (exact.length > 0) { for (const c of exact) picked.add(c.index); continue; }
    const partial = annotated.filter((c) => c.src.includes(token));
    if (partial.length > 0) { for (const c of partial) picked.add(c.index); continue; }
    const ids = annotated.map((c) => `${String(c.index).padStart(2)}. ${c.id}  ${JSON.stringify(c.src)}`).join("\n");
    throw new Error(`--only=${token} 没有匹配任何 case（ID / 序号 / source 都不匹配）；全表：\n${ids}`);
  }
  const chosen = pool.filter((c) => picked.has(c.index));
  const excluded = [...picked].filter((n) => !chosen.some((c) => c.index === n));
  if (excluded.length > 0) {
    const text = excluded.map((n) => `#${n} ${annotated[n - 1].id}`).join(", ");
    throw new Error(`--only 命中的 case 被 --group=${flags.group} 排除：${text}`);
  }
  return chosen;
}

// ---------------------------------------------------------------------------
// 小工具
// ---------------------------------------------------------------------------
const num = (v, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

function readTextSafe(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

function walkFiles(dir, name, depth = 0, acc = []) {
  if (depth > 8) return acc;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, name, depth + 1, acc);
    else if (entry.name === name) acc.push(full);
  }
  return acc;
}

function firstDiff(ours, ts, trail = "$") {
  if (ours === ts) return null;
  if (ours === null || ts === null || typeof ours !== "object" || typeof ts !== "object") {
    return { trail, ours, ts };
  }
  const oursArr = Array.isArray(ours);
  const tsArr = Array.isArray(ts);
  if (oursArr !== tsArr) return { trail, ours, ts };
  if (oursArr) {
    if (ours.length !== ts.length) return { trail: `${trail}.length`, ours: ours.length, ts: ts.length };
    for (let i = 0; i < ours.length; i += 1) {
      const d = firstDiff(ours[i], ts[i], `${trail}[${i}]`);
      if (d) return d;
    }
    return null;
  }
  const keys = new Set([...Object.keys(ours), ...Object.keys(ts)]);
  for (const key of keys) {
    const d = firstDiff(ours[key], ts[key], `${trail}.${key}`);
    if (d) return d;
  }
  return null;
}

function firstXmlDiff(left, right) {
  let at = 0;
  while (at < left.length && at < right.length && left[at] === right[at]) at += 1;
  return at;
}

const short = (value, limit = 160) => {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (text === undefined) return String(value);
  return text.length > limit ? `${text.slice(0, limit - 3)}...` : text;
};

// ---------------------------------------------------------------------------
// 实现探测：DirectBuildMetrics / router / session 产物 / hooks / 构造标记
// ---------------------------------------------------------------------------
const buildDir = path.join(REPO, "build", "ts");
const directDir = path.join(buildDir, "typescript", "tokens", "direct");
const PATHS = {
  runner: path.join(buildDir, "typescript", "run", "source-file-runner.js"),
  statementShape: path.join(buildDir, "typescript", "tokens", "statements", "statement-shape.js"),
  // 【R3】D7 的唯一修改点（A-1 批准）：statement-boundary-util 的 ScanToSemicolonIncremental
  statementBoundary: path.join(buildDir, "typescript", "tokens", "statements", "statement-boundary-util.js"),
  statementBuilder: path.join(buildDir, "typescript", "tokens", "statements", "statement-builder.js"),
  expressionBuilder: path.join(buildDir, "typescript", "tokens", "expressions", "expression-builder.js"),
  directDir,
};

function discoverImplementation() {
  const metricsCandidate = path.join(directDir, "direct-build-metrics.js");
  let metricsFile = fs.existsSync(metricsCandidate) ? metricsCandidate : null;
  if (metricsFile === null) {
    const found = walkFiles(buildDir, "direct-build-metrics.js");
    if (found.length > 0) metricsFile = found[0];
  }

  const metrics = { state: "absent", file: metricsCandidate, Class: null, reason: "" };
  if (metricsFile !== null) {
    metrics.file = metricsFile;
    try {
      const require = createRequire(path.join(REPO, "package.json"));
      const mod = require(metricsFile);
      const Class =
        (mod && mod.DirectBuildMetrics) ||
        (mod && mod.default && mod.default.DirectBuildMetrics) ||
        (mod && typeof mod.Reset === "function" ? mod : null);
      if (!Class) {
        metrics.state = "broken";
        metrics.reason = "模块存在但没有导出 DirectBuildMetrics";
      } else {
        const requiredFields = [
          "Sessions", "StatementsBuilt", "Declined", "IncompleteFallback",
          "Errors", "StrictViolations", "LastDeclineReason", "LastError",
          "Strict", "TraceEnabled", "Traces",
        ];
        const missingFields = requiredFields.filter((key) => !(key in Class));
        const missingMethods = ["Reset", "Trace"].filter((key) => typeof Class[key] !== "function");
        if (missingFields.length > 0 || missingMethods.length > 0) {
          metrics.state = "broken";
          metrics.reason = [
            missingFields.length ? `缺字段 ${missingFields.join(",")}` : "",
            missingMethods.length ? `缺方法 ${missingMethods.join(",")}` : "",
          ].filter(Boolean).join("；");
        } else {
          metrics.state = "present";
          metrics.Class = Class;
        }
      }
    } catch (error) {
      metrics.state = "broken";
      metrics.reason = `require 失败: ${error && error.message ? error.message : String(error)}`;
    }
  }

  const statementShapeText = readTextSafe(PATHS.statementShape) || "";
  const hooks = statementShapeText.includes("DirectSession");
  const routerPresent = fs.existsSync(path.join(directDir, "direct-build-router.js"));
  let sessionFiles = [];
  try {
    // direct-build-session.js 是 DirectSession 接口（编译后无类），不算「某个族的 session」
    sessionFiles = fs
      .readdirSync(directDir)
      .filter((name) => name.endsWith("-session.js") && name !== "direct-build-session.js");
  } catch {
    sessionFiles = [];
  }

  let state;
  if (metrics.state === "broken") state = "broken";
  else if (metrics.state === "present" && hooks) state = "wired";
  else if (metrics.state === "present") state = "partial-metrics-only";
  else if (hooks || routerPresent) state = "partial-hooks-only";
  else state = "absent";

  return {
    state,
    metrics,
    hooks,
    routerPresent,
    sessionFiles,
    runners: {
      runner: fs.existsSync(PATHS.runner),
      statementBuilder: fs.existsSync(PATHS.statementBuilder),
      expressionBuilder: fs.existsSync(PATHS.expressionBuilder),
    },
  };
}

function describeImpl(impl) {
  const bits = [
    `state=${impl.state}`,
    `metrics=${impl.metrics.state}`,
    `hooks=${impl.hooks ? "present" : "absent"}`,
    `router=${impl.routerPresent ? "present" : "absent"}`,
    `sessions=${impl.sessionFiles.length}`,
  ];
  if (impl.metrics.state === "broken") bits.push(`metrics-error="${impl.metrics.reason}"`);
  return `IMPL: ${bits.join(" ")}`;
}

/** 直建产物全文（engine / token-util / sessions）与 statement-shape / statement-boundary 的 hook 文件，
 *  用于「该构造有没有被引用」。R3 的 D7 修改点在 statement-boundary-util，所以多收一份 boundaryText。 */
function loadDirectText() {
  const parts = [];
  try {
    for (const name of fs.readdirSync(directDir)) {
      if (!name.endsWith(".js")) continue;
      const text = readTextSafe(path.join(directDir, name));
      if (text) parts.push(text);
    }
  } catch {
    /* 产物缺失：全文为空 → 所有 marker 都算「未出现」 */
  }
  return {
    directText: parts.join("\n"),
    statementShapeText: readTextSafe(PATHS.statementShape) || "",
    boundaryText: readTextSafe(PATHS.statementBoundary) || "",
  };
}

/**
 * 构造标记探测：只用于区分「没实现（absent）」与「实现错了」。
 * markerScope = "statementShape" 时只看 statement-shape 的 hook 文件（C4 的 H2 计数代码在这里，
 * 而 `DirectBuildMetrics.Errors` 在 metrics 自己的 Reset 里就有，用全局文本会假阳）。
 * 【R3】markerScope = "boundary" 时只看 statement-boundary-util 产物（D7 的 A-1 修改点；
 *  direct-expression-engine 里的 IsRestrictedPostfixOperator 是 C1 守卫，不能当 D7 的依据）。
 */
function probeFeature(c, texts) {
  const markers = Array.isArray(c.markers) ? c.markers : [];
  if (markers.length === 0) return { present: null, matched: null, markers, scope: c.markerScope || "direct" };
  const scope = c.markerScope === "statementShape"
    ? "statementShape"
    : c.markerScope === "boundary"
      ? "boundary"
      : "direct";
  const text = scope === "statementShape"
    ? texts.statementShapeText
    : scope === "boundary"
      ? texts.boundaryText
      : texts.directText;
  if (!text) return { present: false, matched: null, markers, scope };
  for (const marker of markers) {
    if (text.includes(marker)) return { present: true, matched: marker, markers, scope };
  }
  return { present: false, matched: null, markers, scope };
}

/** DeclineReasons 读取：Map 或普通对象都支持；不存在（C3 未实现）→ null。 */
function declineReasonsOf(Class) {
  if (!Class) return null;
  const value = Class.DeclineReasons;
  if (value === undefined || value === null) return null;
  try {
    if (typeof value.forEach === "function" && typeof value.get === "function") {
      const obj = {};
      value.forEach((count, key) => { obj[String(key)] = num(count); });
      return obj;
    }
    if (typeof value === "object") {
      const obj = {};
      for (const [key, count] of Object.entries(value)) obj[key] = num(count);
      return obj;
    }
  } catch {
    return null;
  }
  return null;
}

function hasDeclineReasons(Class) {
  return Boolean(Class) && "DeclineReasons" in Class;
}

// ---------------------------------------------------------------------------
// 计数器：StatementBuilder.Load / ExpressionBuilder.Load（原型计数，不改源码）
// CONTRACT §6 A6 的「零次事后 Build」证据；R2-D5：exprOtherDirect 单独打印并强制 0
// ---------------------------------------------------------------------------
function setupLoadCounters() {
  const counts = { stmt: 0, expr: 0, exprDirectTokenUtil: 0, exprOtherDirect: 0, exprLegacy: 0, unknownSamples: [] };
  const require = createRequire(path.join(REPO, "package.json"));
  let stmtClass = null;
  let exprClass = null;
  let error = null;
  try {
    ({ StatementBuilder: stmtClass } = require(PATHS.statementBuilder));
  } catch (e) {
    error = `StatementBuilder 加载失败: ${e.message}`;
  }
  try {
    ({ ExpressionBuilder: exprClass } = require(PATHS.expressionBuilder));
  } catch (e) {
    error = `${error ? `${error}；` : ""}ExpressionBuilder 加载失败: ${e.message}`;
  }

  const describeFrame = (stack) =>
    stack
      .split("\n")
      .slice(2, 5)
      .map((line) => line.trim())
      .join(" <- ");

  let stmtPatched = false;
  let exprPatched = false;
  if (stmtClass && typeof stmtClass.prototype.Load === "function") {
    const original = stmtClass.prototype.Load;
    stmtClass.prototype.Load = function patchedStatementLoad(...args) {
      counts.stmt += 1;
      return original.apply(this, args);
    };
    stmtPatched = true;
  } else if (!error) {
    error = "StatementBuilder.prototype.Load 不存在";
  }

  if (exprClass && typeof exprClass.prototype.Load === "function") {
    const original = exprClass.prototype.Load;
    exprClass.prototype.Load = function patchedExpressionLoad(...args) {
      counts.expr += 1;
      const stack = new Error().stack || "";
      if (stack.includes("direct-token-util")) {
        counts.exprDirectTokenUtil += 1;
      } else if (stack.includes(`${path.sep}direct${path.sep}`)) {
        counts.exprOtherDirect += 1;
        if (counts.unknownSamples.length < 3) counts.unknownSamples.push(describeFrame(stack));
      } else {
        counts.exprLegacy += 1;
      }
      return original.apply(this, args);
    };
    exprPatched = true;
  } else if (!error) {
    error = "ExpressionBuilder.prototype.Load 不存在";
  }

  const reset = () => {
    counts.stmt = 0;
    counts.expr = 0;
    counts.exprDirectTokenUtil = 0;
    counts.exprOtherDirect = 0;
    counts.exprLegacy = 0;
    counts.unknownSamples = [];
  };
  const snapshot = () => ({ ...counts, unknownSamples: [...counts.unknownSamples] });
  /** 旧路径事后 reparse 次数：StatementBuilder.Load + 非 DirectTokenUtil 的 ExpressionBuilder.Load。 */
  const effectiveLegacy = (snap) => snap.stmt + snap.exprOtherDirect + snap.exprLegacy;

  return { patched: stmtPatched && exprPatched, error, counts, reset, snapshot, effectiveLegacy };
}

// ---------------------------------------------------------------------------
// metrics 快照
// ---------------------------------------------------------------------------
function snapshotMetrics(Class) {
  const read = (key) => Class[key];
  return {
    sessions: num(read("Sessions")),
    statementsBuilt: num(read("StatementsBuilt")),
    declined: num(read("Declined")),
    incompleteFallback: num(read("IncompleteFallback")),
    errors: num(read("Errors")),
    strictViolations: num(read("StrictViolations")),
    lastDeclineReason: typeof read("LastDeclineReason") === "string" ? read("LastDeclineReason") : "",
    lastError: typeof read("LastError") === "string" ? read("LastError") : "",
    traces: Array.isArray(read("Traces")) ? read("Traces").slice(0, 256).map(String) : [],
    strict: Boolean(read("Strict")),
    traceEnabled: Boolean(read("TraceEnabled")),
    declineReasons: declineReasonsOf(Class),
  };
}

// ---------------------------------------------------------------------------
// C4 故障注入（进程内；不改源码）
// R2-CONTRACT §5.1：给 session 的 Finish 包一层「第一次调用抛 Error("inject")」。
// 编译产物的类名在 R1/R2 之间可能变化（R1 是 ExpressionStatementDirectSession，
// 契约正文写的是 DirectExpressionDirectSession），所以按「导出且 prototype.Finish 是函数」自动收集。
// ---------------------------------------------------------------------------
function createFinishInjection() {
  const state = { available: false, targets: [], error: "", armed: false, fired: 0 };
  if (!fs.existsSync(directDir)) {
    state.error = `没有直建产物目录 ${directDir}`;
    return state;
  }
  const require = createRequire(path.join(REPO, "package.json"));
  for (const name of ["direct-expression-session.js", "direct-variable-session.js"]) {
    const file = path.join(directDir, name);
    if (!fs.existsSync(file)) continue;
    let mod;
    try {
      mod = require(file);
    } catch (error) {
      state.error = `${name} require 失败: ${error && error.message ? error.message : String(error)}`;
      continue;
    }
    for (const [exportName, value] of Object.entries(mod)) {
      if (typeof value !== "function" || !value.prototype) continue;
      if (typeof value.prototype.Finish !== "function") continue;
      if (state.targets.some((t) => t.Class === value)) continue;
      state.targets.push({ name: `${name}:${exportName}.Finish`, Class: value });
    }
  }
  for (const target of state.targets) {
    const original = target.Class.prototype.Finish;
    target.original = original;
    target.Class.prototype.Finish = function injectedFinish(...args) {
      if (state.armed && state.fired === 0) {
        state.fired += 1;
        throw new Error("inject: finish-throw (harness fault injection)");
      }
      return original.apply(this, args);
    };
  }
  state.available = state.targets.length > 0;
  if (!state.available && state.error === "") {
    state.error = "direct-expression-session.js / direct-variable-session.js 里没有可注入的 Finish（C4 未实现？）";
  }
  state.arm = () => { state.armed = true; state.fired = 0; };
  state.disarm = () => { state.armed = false; };
  return state;
}

// ---------------------------------------------------------------------------
// 基线（A10）：另一个已构建克隆的 build/ts 同源解析
// ---------------------------------------------------------------------------
function loadBaseline(repo) {
  const root = path.resolve(repo);
  const runnerFile = path.join(root, "build", "ts", "typescript", "run", "source-file-runner.js");
  if (!fs.existsSync(runnerFile)) {
    throw new Error(
      `--baseline=${repo} 不可用：${runnerFile} 不存在。需要一个已构建（xl_build + tsc）的 8456ec3c 克隆，` +
        `例如 C:\\Users\\Admin\\Documents\\GitHub\\xl-example-set\\chore-all-possible-setup`,
    );
  }
  const require = createRequire(path.join(root, "package.json"));
  const { SourceFileRunner } = require(runnerFile);
  return { root, runnerFile, SourceFileRunner, xml: new Map(), errors: new Map() };
}

function baselineXmlOf(baseline, c) {
  if (baseline.xml.has(c.id)) return baseline.xml.get(c.id);
  let xml = null;
  let error = null;
  try {
    const root = baseline.SourceFileRunner.Parse(c.src, "case.ts");
    xml = root && typeof root.ToXmlString === "function" ? root.ToXmlString() : null;
    if (xml === null) error = "基线侧 SourceFileShape 没有 ToXmlString()";
  } catch (e) {
    error = e && e.message ? e.message : String(e);
  }
  baseline.xml.set(c.id, xml);
  baseline.errors.set(c.id, error);
  return xml;
}

// ---------------------------------------------------------------------------
// 单次解析
// ---------------------------------------------------------------------------
function parseOnce(SourceFileRunner, src) {
  const started = process.hrtime.bigint();
  try {
    const root = SourceFileRunner.Parse(src, "case.ts");
    const xml = root && typeof root.ToXmlString === "function" ? root.ToXmlString() : null;
    return { root, xml, error: null, ms: Number(process.hrtime.bigint() - started) / 1e6 };
  } catch (error) {
    return { root: null, xml: null, error, ms: Number(process.hrtime.bigint() - started) / 1e6 };
  }
}

// ---------------------------------------------------------------------------
// 断言求值
// ---------------------------------------------------------------------------
function evaluateCase(ctx, c) {
  const {
    flags, impl, metricsOk, M, loads, SourceFileRunner, ts, tsAst, cjAst,
    baseline, markerTexts, injection,
  } = ctx;
  const kind = c.expect;
  const isGuard = kind === "guard";                 // 【R3】同 pos，但 expectBuilt 是「不变的 1」
  const isPosLike = kind === "pos" || isGuard;      // A4/A5/A6/A7/A11 都按正例口径处理
  const isInjection = c.injection === "finish-throw";
  const isRejected = kind === "invalid" || kind === "incomplete";
  const injectionEnabled = isInjection && flags.faultInject === "finish-throw" && injection.available;
  const a = {};
  const add = (id, status, detail, extra = {}) => { a[id] = { status, detail, ...extra }; };

  // --- 解析（C4：第一次注入，第二次不注入；其余：同源两次） ---
  // Strict 默认只对正例（含 guard）Parse 生效：负例/非法/不完整 case 本身就以 Decline 为期望，Strict 的「Decline 抛错」
  // 只会在 Ingest（statement-shape H1，R3 之前未包 try/catch）里遮断整条语句的 AST，让本该 PASS 的负例变成假红。
  // 这不是放宽：负例的 A5 本来就不按正例计数断言（见 A5 SKIP）。
  // 【R3】case.strictAll / --strict-all 打开时**不再抑制**：那是「strict 全量化」的验收口径（R3-S / A12），
  // 前提是 harden 已给 H1 加 try/catch —— 否则 A1 会以 PARSE-ERROR 显式变红，而不是静默转绿。
  const strictForParse = flags.strict && (isPosLike || c.strictAll || flags.strictAll);
  loads.reset();
  let metricsError = null;
  if (metricsOk) {
    try {
      M.Strict = strictForParse;
      M.TraceEnabled = flags.trace || flags.declineStats;
      M.Reset();
    } catch (error) {
      metricsError = error && error.message ? error.message : String(error);
    }
  }
  if (injectionEnabled) injection.arm();
  const first = parseOnce(SourceFileRunner, c.src);
  if (injectionEnabled) injection.disarm();
  const m1 = metricsOk && metricsError === null ? snapshotMetrics(M) : null;
  const snap1 = loads.snapshot();

  if (injectionEnabled) {
    // C4：Reset 后第二次解析（不注入）→ 证明计数不是粘的、Reset 清得掉
    if (metricsOk) {
      try { M.Reset(); } catch { /* 已在 m1 记录 metricsError */ }
    }
    loads.reset();
  }
  const second = parseOnce(SourceFileRunner, c.src);
  const m2 = metricsOk && metricsError === null ? snapshotMetrics(M) : null;
  const snap2 = loads.snapshot();

  const loadSnap = isInjection ? snap2 : snap1;
  const reasonsCapable = hasDeclineReasons(M);
  const reasons = m1 === null ? null : m1.declineReasons;
  const feature = probeFeature(c, markerTexts);
  // 基线侧读数（A10 用；rejected case 的 A1 也要用它的拒绝文案，先取一次，内部按 id 缓存）
  const baseXml = baseline === null ? null : baselineXmlOf(baseline, c);
  const baseError = baseline === null ? null : (baseline.errors.get(c.id) || null);

  const ours = first.root && Array.isArray(first.root.Data) ? first.root.Data.map(cjAst) : [];
  const sf = ts.createSourceFile("case.ts", c.src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const tsSide = sf.statements.map(tsAst);
  const oursText = JSON.stringify(ours);
  const tsText = JSON.stringify(tsSide);

  // 构造标记：只用于区分「没实现（absent）」与「实现错了」；不参与 PASS/FAIL
  const featureHint = () => {
    if (feature.present !== true) {
      return feature.present === false && Array.isArray(c.markers) && c.markers.length > 0
        ? `（该构造在直建产物里没有任何实现痕迹：markers ${c.markers.join(" / ")} 都没出现 → 更像「未实现」而不是「实现错了」）`
        : "";
    }
    return "";
  };

  // A1 —— AST 逐字段（唯一归一表 ast-compare.mjs）
  // invalid / incomplete：两侧 Parse 都拒绝（同一个失败分支），AST 无可比 → 改判「拒绝一致性」
  if (first.error) {
    if (isRejected) {
      if (baseline === null) {
        add("A1", "PASS", `PARSE-REJECT: 本侧拒绝「${first.error.message}」（${kind}：非法/不完整输入；未启用 --baseline，拒绝文案未比对）`);
      } else if (baseError !== null && String(baseError) === String(first.error.message)) {
        add("A1", "PASS", `PARSE-REJECT-PARITY: 两侧同源拒绝「${first.error.message}」（${kind}：AST 无从比对，行为与基线一致）`);
      } else {
        add(
          "A1",
          "FAIL",
          `拒绝文案与基线不一致：ours="${first.error.message}" baseline=${baseError === null ? "<基线 Parse 成功>" : `"${baseError}"`}`,
        );
      }
    } else {
      add("A1", "FAIL", `PARSE-ERROR: ${first.error.message}`);
    }
  } else if (isRejected) {
    add("A1", "FAIL", `期望 Parse 拒绝（${kind}），但本侧 Parse 成功：非法/不完整输入被接受了`);
  } else if (oursText === tsText) {
    add("A1", "PASS", "AST 与 tsc 逐字段一致");
  } else {
    const diff = firstDiff(ours, tsSide);
    add(
      "A1",
      "FAIL",
      (diff
        ? `AST 不一致 @ ${diff.trail}: ours=${short(diff.ours)} ts=${short(diff.ts)}`
        : "AST 不一致（JSON 文本不同但结构化 diff 为空）") + featureHint(),
    );
  }

  // A2 —— XML 确定性（C4：注入那次 vs 不注入那次，等于「回落旧路径的树 == 直建的树」）
  const xml1 = first.xml;
  const xml2 = second.xml;
  if (isRejected) {
    add("A2", "SKIP", `${kind}：非法/不完整输入，两侧 Parse 都抛，没有 XML 可比`);
  } else if (first.error) {
    add("A2", "FAIL", `PARSE-ERROR: ${first.error.message}`);
  } else if (xml1 === null || xml2 === null) {
    add("A2", "FAIL", "SourceFileShape 没有 ToXmlString()，无法做 XML 指纹");
  } else if (xml1 === xml2) {
    add("A2", "PASS", isInjection
      ? `XML 一致：注入（回落旧路径）那次 == 不注入（直建）那次（len=${xml1.length}）`
      : `XML 两次逐字节一致（len=${xml1.length}）`);
  } else {
    const at = firstXmlDiff(xml1, xml2);
    add(
      "A2",
      "FAIL",
      `两次 XML 不同（首次差异 @ char ${at}；len ${xml1.length} vs ${xml2.length}）: ` +
        `ours="${short(xml1.slice(at, at + 40))}" retry="${short(xml2.slice(at, at + 40))}"`,
    );
  }

  // A3 —— XML 非空 + 根下节点数 == TS 顶层语句数
  const nodeCount = first.root && Array.isArray(first.root.Data) ? first.root.Data.length : 0;
  if (isRejected) {
    add("A3", "SKIP", `${kind}：非法/不完整输入，两侧 Parse 都抛，没有根节点可比`);
  } else if (first.error) {
    add("A3", "FAIL", `PARSE-ERROR: ${first.error.message}`);
  } else if (xml1 === null || xml1.length === 0) {
    add("A3", "FAIL", "XML 为空");
  } else if (nodeCount !== tsSide.length) {
    add("A3", "FAIL", `根下节点数 ${nodeCount} != TS 顶层语句数 ${tsSide.length}`);
  } else {
    add("A3", "PASS", `根下节点数=${nodeCount} == TS 顶层语句数=${tsSide.length}`);
  }

  // A4 —— 直建计数
  const posCountersOk = (m) =>
    m.statementsBuilt >= 1 &&
    m.declined === 0 &&
    m.incompleteFallback === 0 &&
    m.errors === 0 &&
    m.strictViolations === 0;
  // 【R3/D2】expectBodyBuilt：负例的 built 读数来自**体内语句自己的壳**（例如 `for (let …) { b; }` 的 `b;`），
  // 此时不能断言 built==0；改成断言「恰好是那个体内读数」+ declined>=1（该族确实 Decline 了本条语句）。
  const negBuiltWant = (c) => (typeof c.expectBodyBuilt === "number" ? c.expectBodyBuilt : 0);
  const negCountersOk = (m) => m.declined >= 1 && m.statementsBuilt === negBuiltWant(c) && m.errors === 0;
  const builtOk = (m) => (typeof c.expectBuilt === "number" ? m.statementsBuilt === c.expectBuilt : true);
  const countersText = (m) =>
    `built=${m.statementsBuilt} declined=${m.declined} incomplete=${m.incompleteFallback} ` +
    `errors=${m.errors} strictViolations=${m.strictViolations}` +
    (m.lastDeclineReason ? ` lastDeclineReason=${JSON.stringify(m.lastDeclineReason)}` : "") +
    (m.lastError ? ` lastError=${JSON.stringify(m.lastError)}` : "");
  const missingBits = (m) => {
    const bits = [];
    if (m.statementsBuilt < 1) bits.push("StatementsBuilt<1");
    if (typeof c.expectBuilt === "number" && m.statementsBuilt !== c.expectBuilt) {
      bits.push(`StatementsBuilt!=${c.expectBuilt}`);
    }
    if (m.declined !== 0) bits.push("Declined!=0");
    if (m.incompleteFallback !== 0) bits.push("IncompleteFallback!=0");
    if (m.errors !== 0) bits.push("Errors!=0");
    if (m.strictViolations !== 0) bits.push("StrictViolations!=0");
    return bits;
  };
  const absentHint = (feature) => {
    if (feature.present === null) return "";
    if (feature.present) return `（构造标记已出现：${feature.matched} → 不当作「未实现」）`;
    const where = feature.scope === "statementShape"
      ? "statement-shape 产物"
      : feature.scope === "boundary"
        ? "statement-boundary-util 产物"
        : "直建产物";
    return `（构造标记 ${feature.markers.join(" / ")} 在 ${where} 里都没出现）`;
  };

  if (!metricsOk) {
    const broken = impl.metrics.state === "broken";
    const label = broken ? "IMPLEMENTATION-BROKEN" : "IMPLEMENTATION-ABSENT";
    const why = impl.metrics.reason ? `: ${impl.metrics.reason}` : "";
    if (flags.expectDirect) {
      add(
        "A4",
        "FAIL",
        `${label}: DirectBuildMetrics 不可用（state=${impl.metrics.state}${why}），--expect-direct 无法成立`,
        { enforced: true },
      );
    } else if (broken) {
      add(
        "A4",
        "FAIL",
        `${label}: DirectBuildMetrics 模块存在但不可用（state=broken${why}）——这是「实现错了」，不是「没实现」`,
      );
    } else {
      add("A4", "SKIP", `DirectBuildMetrics 未实现（state=absent）：只报读数，A4 暂不可判`);
    }
  } else if (metricsError) {
    add("A4", "FAIL", `DirectBuildMetrics.Reset() 抛错: ${metricsError}`);
  } else if (flags.expectDirect && impl.state !== "wired") {
    add(
      "A4",
      "FAIL",
      `IMPLEMENTATION-UNWIRED: DirectBuildMetrics 已存在（state=${impl.state}），但 statement-shape 里没有 ` +
        `DirectSession hook（hooks=${impl.hooks}）——直建没有被接进语句壳，A4 无法成立`,
      { enforced: true },
    );
  } else if (isInjection && !injectionEnabled) {
    const why = flags.faultInject !== "finish-throw"
      ? "未给 --fault-inject=finish-throw"
      : `注入点不可用（${injection.error}）`;
    add(
      "A4",
      "SKIP",
      `C4 故障注入未启用（${why}）：H2 的异常路径无法触发，A4 只报控制读数 ${countersText(m1)}。` +
        `用 --fault-inject=finish-throw 打开断言。`,
    );
  } else if (isInjection) {
    const escaped = first.error !== null && String(first.error.message).includes("inject");
    const secondErrors = m2 === null ? null : m2.errors;
    const ok =
      !escaped &&
      m1.errors === 1 &&
      m1.lastError.includes("inject") &&
      m1.declined === 0 &&
      secondErrors === 0;
    let label;
    let detail;
    if (escaped) {
      label = "IMPLEMENTATION-ABSENT";
      detail =
        `${label}: 注入的 Error("inject") 从 session 的 Finish 逃到了 Parse（statement-shape H2 还没有 try/catch）` +
        `，C4 未实现。读数 ${countersText(m1)}`;
    } else if (!ok && feature.present === false && m1.errors === 0) {
      // 现状（R1 实现）：H2 的 direct.Finish 外层已有 `try { BuildFromShell } catch { built = null }`
      // （statement-shape 的 TryToClose / FinishShell 两处），所以注入的异常被**静默吞掉**、回落旧路径，
      // AST 仍然对，但 `Errors` 一次都没 +1 —— 这正是 C4 要补的「不许静默」缺口。
      label = "IMPLEMENTATION-ABSENT";
      detail =
        `${label}: 注入的 Error("inject") 被 statement-shape 外层的 try/catch 静默吞掉（回落旧路径、AST 仍 MATCH），` +
        `Errors 未 +1、LastError 未写 → C4 未实现${absentHint(feature)}。` +
        `读数 ${countersText(m1)}`;
    } else if (ok) {
      label = "C4";
      detail =
        `C4 OK：注入后 errors=1、lastError 含 inject、declined=0；第二次（Reset 后、不注入）errors=${secondErrors}；` +
        `AST 仍 MATCH（回落旧路径）。读数 ${countersText(m1)}`;
    } else {
      label = "IMPLEMENTATION-BROKEN";
      detail =
        `${label}: 注入后 errors=${m1.errors} lastError=${JSON.stringify(m1.lastError)} declined=${m1.declined}；` +
        `第二次（Reset 后）errors=${secondErrors}（须为 0）。读数 ${countersText(m1)}`;
    }
    if (flags.expectDirect) {
      add("A4", ok ? "PASS" : "FAIL", detail, { enforced: true, label });
    } else if (ok) {
      add("A4", "READING", `${detail}（只报读数；--expect-direct 时强制）`, { enforced: false, readingPass: true, label });
    } else if (label === "IMPLEMENTATION-ABSENT") {
      add("A4", "SKIP", `${detail}（未实现，默认模式记 SKIP；--expect-direct 时红）`, { label });
    } else {
      add("A4", "READING", `${detail}（只报读数；--expect-direct 时强制）`, { enforced: false, readingPass: false, label });
    }
  } else if (kind === "neg") {
    const ok = negCountersOk(m1);
    // 【R3】该族的 session 还没注册/未挂载时，「既没建也没 Decline」是「没实现」的形态，不是实现错了。
    // （built 可能来自体内已实现的族，例如 `for (let …) { b; }` 里的 `b;` 由 R2 的表达式 session 建。）
    const familyAbsent = feature.present === false;
    const wantBuilt = negBuiltWant(c);
    // D2：expectBodyBuilt 的 case 把「built 来自体内语句自己的壳」写明，避免读者以为断言放宽
    const builtClause = typeof c.expectBodyBuilt === "number"
      ? `bodyBuilt=${c.expectBodyBuilt}（体内语句自己的壳；本条语句本身不建）`
      : "built=0";
    let detail = `${countersText(m1)}（负例期望 declined>=1 ${builtClause} errors=0${c.expectBodyBuilt ? "，A9 判该族 category" : ""}）`;
    if (!ok && familyAbsent) {
      detail +=
        `  ← IMPLEMENTATION-ABSENT：该族的 session 还没注册 / 未挂载到壳上${absentHint(feature)}；` +
        `「没 Decline」是「没实现」的形态，不是实现错了`;
    } else if (m1.statementsBuilt !== wantBuilt) {
      detail += `  ← IMPLEMENTATION-MISBUILT：该构造本轮应显式 Decline，但被直建接管/误建` +
        (typeof c.expectBodyBuilt === "number"
          ? `（built=${m1.statementsBuilt} != 体内自有壳的期望 ${wantBuilt}）`
          : "");
    } else if (m1.errors !== 0) {
      detail += `  ← IMPLEMENTATION-ERROR-FALLBACK：异常兜底，C4 明令不许（Errors 必须 0）`;
    } else if (m1.declined === 0) {
      detail += `  ← IMPLEMENTATION-NO-DECLINE：既没建也没 Decline（incomplete=${m1.incompleteFallback}）`;
    } else {
      detail += `（跳过旧路径，AST 由旧路径保证）`;
    }
    if (flags.expectDirect) {
      add("A4", ok ? "PASS" : "FAIL", detail, { enforced: true });
    } else {
      add("A4", "READING", `${detail}（只报读数；--expect-direct 时强制）`, { enforced: false, readingPass: ok });
    }
  } else if (kind === "safe") {
    // 无 session 构造：只断言「没被直建接管」。**不能**断言 declined>=1 —— 这些语句根本不创建 DirectSession，
    // declined 恒 0（误读成「没 Decline 就是红」会造出假红，见 REPORT-r2-verify-fix §2.3）。
    const ok = m1.statementsBuilt === 0 && m1.errors === 0;
    let detail = `${countersText(m1)}（safe：无 session 构造，期望 built=0 && errors=0；不断言 declined>=1）`;
    if (m1.statementsBuilt !== 0) {
      detail += `  ← IMPLEMENTATION-MISBUILT：无 session 构造不应被直建接管`;
    } else if (m1.errors !== 0) {
      detail += `  ← IMPLEMENTATION-ERROR-FALLBACK：异常兜底，Errors 必须 0`;
    } else {
      detail += `（旧路径保证 AST）`;
    }
    if (flags.expectDirect) {
      add("A4", ok ? "PASS" : "FAIL", detail, { enforced: true });
    } else {
      add("A4", "READING", `${detail}（只报读数；--expect-direct 时强制）`, { enforced: false, readingPass: ok });
    }
  } else if (kind === "invalid") {
    // 语法非法输入：直建必须**拒绝**（不许静默建成别的树），之后旧路径同源拒绝。
    // 【R4】incompleteOk：R4-S-01/02 的直建拒绝机制是 IncompleteFallback（实测 incomplete=1 declined=0），
    //   R4-CONTRACT §5.3 的 invalid 口径只要求 built==0 && errors==0（strictViolations>=1 与拒绝同源归 A12）。
    const rejected = c.incompleteOk ? m1.declined >= 1 || m1.incompleteFallback >= 1 : m1.declined >= 1;
    const ok = m1.statementsBuilt === 0 && rejected && m1.errors === 0;
    const howMany = c.incompleteOk
      ? "declined>=1 或 incomplete>=1（R4-S 的实测是 incomplete=1 declined=0）"
      : "declined>=1";
    let detail = `${countersText(m1)}（invalid：语法非法输入，期望 built=0 errors=0、${howMany}）`;
    if (m1.statementsBuilt !== 0) {
      detail += `  ← IMPLEMENTATION-MISBUILT：非法输入被直建接管`;
    } else if (m1.errors !== 0) {
      detail += `  ← IMPLEMENTATION-ERROR-FALLBACK：异常兜底，Errors 必须 0`;
    } else if (!rejected) {
      detail += `  ← IMPLEMENTATION-NO-DECLINE：既没建也没 Decline / Incomplete`;
    } else {
      detail += `（拒绝后旧路径同源拒绝）`;
    }
    if (flags.expectDirect) {
      add("A4", ok ? "PASS" : "FAIL", detail, { enforced: true });
    } else {
      add("A4", "READING", `${detail}（只报读数；--expect-direct 时强制）`, { enforced: false, readingPass: ok });
    }
  } else if (kind === "incomplete") {
    // 收口期失败：R1 语义记 IncompleteFallback（不是 Declined）。declined==1 反而是「分类错了」。
    const ok = m1.statementsBuilt === 0 && m1.incompleteFallback >= 1 && m1.errors === 0;
    let detail = `${countersText(m1)}（incomplete：收口期失败，期望 incomplete>=1 built=0 errors=0，Declined 不作要求）`;
    if (m1.statementsBuilt !== 0) {
      detail += `  ← IMPLEMENTATION-MISBUILT：不完整输入被直建接管`;
    } else if (m1.incompleteFallback === 0) {
      detail += `  ← INCOMPLETE-MISCLASSIFIED：应记 IncompleteFallback（R1 收口期语义），实际 declined=${m1.declined}`;
    } else if (m1.errors !== 0) {
      detail += `  ← IMPLEMENTATION-ERROR-FALLBACK：异常兜底，Errors 必须 0`;
    } else {
      detail += `（旧路径同源拒绝）`;
    }
    if (flags.expectDirect) {
      add("A4", ok ? "PASS" : "FAIL", detail, { enforced: true });
    } else {
      add("A4", "READING", `${detail}（只报读数；--expect-direct 时强制）`, { enforced: false, readingPass: ok });
    }
  } else {
    const ok = posCountersOk(m1) && builtOk(m1);
    let label = null;
    let detail = countersText(m1) + (typeof c.expectBuilt === "number" ? ` expectBuilt=${c.expectBuilt}` : "");
    if (isGuard) detail += `（guard：built 必须恒为 ${c.expectBuilt}，防过度收缩）`;
    if (!ok) {
      detail += `  违反: ${missingBits(m1).join(",")}`;
      if (feature.present === false) {
        // 【R3】该构造在产物里一点痕迹都没有 → 这是「没实现」，不是「实现错了」。
        // 读数里的 built 可能来自体内已实现的族（例如 `{ let x = 1; }` 的变量语句由 R2 的 session 建，
        // 但 Block 本身没建 → StatementsBuilt=1 != 2），所以不能拿 built>0 就当 PRESENT-BUT-DECLINED。
        label = "IMPLEMENTATION-ABSENT";
        detail +=
          `  ← ${label}：该构造在直建产物里没有任何实现痕迹${absentHint(feature)}；` +
          `读数里的 built 来自**已实现的其它族**（不是本条期望的语句本身）`;
      } else if (m1.statementsBuilt === 0 && m1.declined >= 1) {
        if (feature.present === true) {
          label = "IMPLEMENTATION-PRESENT-BUT-DECLINED";
          detail += `  ← ${label}：构造标记已出现（${feature.matched}），但仍 Decline → 实现错了或被覆盖校验回退`;
        } else {
          label = "IMPLEMENTATION-PRESENT-BUT-DECLINED";
          detail += `  ← ${label}：直建没接管（未登记构造标记，无法区分「没实现」与「实现错了」）`;
        }
      } else if (m1.statementsBuilt >= 1 && m1.declined >= 1) {
        label = "IMPLEMENTATION-PARTIAL";
        detail += `  ← ${label}：部分语句直建、部分回落（见 declined / lastDeclineReason）`;
      } else if (m1.statementsBuilt === 0 && m1.declined === 0) {
        label = "IMPLEMENTATION-NOT-INVOKED";
        detail +=
          `  ← ${label}：Sessions=${m1.sessions}、StatementsBuilt=0 且没有 Decline → 直建没被调用` +
          `（plugins 未注册 / router 未接上 / session 未创建）`;
      } else {
        label = "IMPLEMENTATION-BAD-COUNTERS";
        detail += `  ← ${label}`;
      }
    }
    if (flags.expectDirect) {
      add("A4", ok ? "PASS" : "FAIL", detail, { enforced: true, label });
    } else if (ok) {
      add("A4", "READING", `${detail}（只报读数；--expect-direct 时强制）`, { enforced: false, readingPass: true, label });
    } else if (label === "IMPLEMENTATION-ABSENT") {
      add("A4", "SKIP", `${detail}（未实现，默认模式记 SKIP 不判失败；--expect-direct 时红）`, { label });
    } else {
      add("A4", "READING", `${detail}（只报读数；--expect-direct 时强制）`, { enforced: false, readingPass: false, label });
    }
  }

  // A5 —— --strict 时计数器仍全 0（负例 SKIP：strict 下 Decline 抛错是设计行为；C4 注入 SKIP）
  if (!flags.strict) {
    add("A5", "SKIP", "未开 --strict");
  } else if (!metricsOk) {
    add("A5", "SKIP", "--strict 已开，但 DirectBuildMetrics 未实现，无法看计数器");
  } else if (metricsError) {
    add("A5", "FAIL", `DirectBuildMetrics.Reset() 抛错: ${metricsError}`);
  } else if (!isPosLike) {
    add(
      "A5",
      "SKIP",
      (strictForParse
        ? `--strict 已对该 case 生效（strictAll / --strict-all）：非正例的 strict 口径见 A12；读数：${countersText(m1)}`
        : `--strict 只作用于正例 Parse（Decline 类在 Strict 下抛错会遮断 AST 比对，故本 case 以 Strict=false 解析；` +
          `strict 全量化见 A12 / --strict-all）；读数：${countersText(m1)}`),
    );
  } else if (isInjection) {
    add("A5", "SKIP", "C4 注入 case 的 strict 口径不适用（注入本身要抛）");
  } else {
    const ok = posCountersOk(m1) && builtOk(m1);
    add("A5", ok ? "PASS" : "FAIL", `strict 下计数器 ${countersText(m1)}`, { enforced: true });
  }

  // A6 —— 旧路径 Load 调用计数（负例 SKIP；C4 量第二次「不注入」解析）
  const legacy = loads.effectiveLegacy(loadSnap);
  const literalZero = loadSnap.stmt === 0 && loadSnap.expr === 0;
  const loadDetail =
    `${isInjection ? "（第二次/不注入那次）" : ""}stmtLoads=${loadSnap.stmt} exprLoads=${loadSnap.expr} ` +
    `(exprDirectTokenUtil=${loadSnap.exprDirectTokenUtil} exprOtherDirect=${loadSnap.exprOtherDirect} ` +
    `exprLegacy=${loadSnap.exprLegacy}) effectiveLoads=${legacy}`;
  if (!loads.patched) {
    add("A6", "SKIP", `Load 计数不可用：${loads.error || "产物缺失"}`);
  } else if (!isPosLike) {
    add("A6", "SKIP", `${kind} 不断言（不走直建 session 或必然回落旧路径，Load >0）`);
  } else if (c.a6Skip) {
    // 【R4-Q5/Q6】只记读数、不判 0：body-legacy（yield/await 语句待 R5 直建）与 switch 子句语句的 legacy 收口
    const expectNote = typeof c.a6ExpectStmtLoads === "number"
      ? `；期望 stmtLoads=${c.a6ExpectStmtLoads}（=子句语句数）`
      : "";
    add("A6", "SKIP", `${loadDetail}${expectNote}（A6 SKIP：${c.a6Skip}；读数仅记录，--expect-direct 也不强制 0）`, {
      enforced: false,
      a6Skip: c.a6Skip,
      a6ExpectStmtLoads: typeof c.a6ExpectStmtLoads === "number" ? c.a6ExpectStmtLoads : null,
      loadSnap: { ...loadSnap, effectiveLoads: legacy },
    });
  } else if (typeof c.a6ExpectStmtLoads === "number" || typeof c.a6ExpectExprLoads === "number") {
    // 【R6-Q2】**A6 精确值档**（新；比 a6Skip 更严）：a6ExpectStmtLoads / a6ExpectExprLoads 任给一个即启用（缺省 0）。
    //   判据：`stmtLoads === N` **且** `exprOtherDirect + exprLegacy === M`（exprDirectTokenUtil 不计：TypeBuilder 走它）。
    //   不等即红 —— --expect-direct 下 FAIL（**不是 SKIP**）；默认模式记 READING（只报读数）。
    //   implementation-absent 且 built==0 时默认模式记 SKIP（避免「实现没到」被当回归），--expect-direct 照样红。
    const wantStmt = num(c.a6ExpectStmtLoads);
    const wantExpr = num(c.a6ExpectExprLoads);
    const gotExpr = loadSnap.exprOtherDirect + loadSnap.exprLegacy;
    const exactOk = loadSnap.stmt === wantStmt && gotExpr === wantExpr;
    const exactDetail =
      `${loadDetail}（**A6 精确值档 R6-Q2**：期望 stmtLoads=${wantStmt}、exprOtherDirect+exprLegacy=${wantExpr}；` +
      `实测 ${loadSnap.stmt}/${gotExpr}${exactOk ? "" : " ≠ 期望"}；不等即红，不是 SKIP）`;
    const exactExtra = {
      a6Expect: { stmtLoads: wantStmt, exprLoads: wantExpr },
      literalZero,
      loadSnap: { ...loadSnap, effectiveLoads: legacy },
    };
    if (flags.expectDirect) {
      add("A6", exactOk ? "PASS" : "FAIL", exactDetail, { enforced: true, ...exactExtra });
    } else if (!exactOk && feature.present === false && m1.statementsBuilt === 0) {
      add(
        "A6",
        "SKIP",
        `${exactDetail}  ← IMPLEMENTATION-ABSENT：构造标记在直建产物里没出现${absentHint(feature)}；` +
          `默认模式只报读数，--expect-direct 时红`,
        exactExtra,
      );
    } else {
      add("A6", "READING", `${exactDetail}（只报读数；--expect-direct 时强制精确相等）`, {
        enforced: false,
        readingPass: exactOk,
        ...exactExtra,
      });
    }
  } else if (flags.expectDirect) {
    const ok = legacy === 0 && loadSnap.exprOtherDirect === 0;
    add("A6", ok ? "PASS" : "FAIL", `${loadDetail}（A6 口径：旧路径事后 Build/reparse 次数须为 0；R2-D5 要求 exprOtherDirect==0）`, {
      enforced: true,
      literalZero,
      loadSnap: { ...loadSnap, effectiveLoads: legacy },
    });
  } else {
    add("A6", "READING", `${loadDetail}（只报读数；--expect-direct 时强制 0）`, {
      enforced: false,
      readingPass: legacy === 0,
      literalZero,
      loadSnap: { ...loadSnap, effectiveLoads: legacy },
    });
  }

  // A7 —— --trace 时 Traces 含 insert(（负例 SKIP）
  const traceMetrics = isInjection ? m2 : m1;
  if (!flags.trace) {
    add("A7", "SKIP", "未开 --trace");
  } else if (!metricsOk || traceMetrics === null) {
    add("A7", "SKIP", "--trace 已开，但 DirectBuildMetrics 未实现，无 Traces 可看");
  } else if (!isPosLike) {
    add("A7", "SKIP", `${kind} 不期望 insert( 条目（不建树）`);
  } else if (!c.expectInsert) {
    add("A7", "SKIP", "该 case 不含二元/赋值/逗号插入，不期望 insert( 条目");
  } else {
    const inserts = traceMetrics.traces.filter((line) => line.includes("insert("));
    add(
      "A7",
      inserts.length > 0 ? "PASS" : "FAIL",
      inserts.length > 0
        ? `Traces 含 insert(: ${short(inserts[0])}`
        : `Traces 无 insert( 条目（traces=${traceMetrics.traces.length}）`,
      { enforced: true, inserts },
    );
  }

  // A9 —— 负例（含 invalid）的 DeclineReasons 归属到期望 category
  if (kind !== "neg" && kind !== "invalid") {
    add("A9", "SKIP", `${kind} 不适用（pos 看 A11：DeclineReasons 必须为空；incomplete 走 IncompleteFallback 而非分类表）`);
  } else if (!reasonsCapable) {
    add("A9", "SKIP", "DirectBuildMetrics.DeclineReasons 不存在（C3 分类未实现），A9 无法判定");
  } else if (!Array.isArray(c.categories) || c.categories.length === 0) {
    add("A9", "SKIP", "该 case 未登记期望 category，A9 无法判定");
  } else {
    const want = Array.isArray(c.categories) ? c.categories : [];
    const observed = reasons === null ? {} : reasons;
    const hits = want.filter((key) => num(observed[key]) >= 1);
    const ok = want.length > 0 && hits.length === want.length;
    const detail =
      `期望 category${want.length > 1 ? "（全部命中）" : ""} ${JSON.stringify(want)}；` +
      `DeclineReasons=${JSON.stringify(observed)}；lastDeclineReason=${JSON.stringify(m1.lastDeclineReason)}`;
    if (flags.expectDirect) {
      add("A9", ok ? "PASS" : "FAIL", detail, { enforced: true, observed, want });
    } else if (ok) {
      add("A9", "READING", `${detail}（只报读数；--expect-direct 时强制）`, { enforced: false, readingPass: true, observed, want });
    } else {
      add("A9", "READING", `${detail}（只报读数；--expect-direct 时强制）`, { enforced: false, readingPass: false, observed, want });
    }
  }

  // A10 —— XML == 基线；invalid / incomplete 改比「两侧 Parse 拒绝文案一致」
  // 【R3】noBaseline 的 case 恒 SKIP：旧基线（8456ec3c）本身是错的，A10 不能当判据（R3-CONTRACT §1.3）
  if (c.noBaseline) {
    add(
      "A10",
      "SKIP",
      "XML-BASELINE: SKIP (noBaseline: 旧基线 8456ec3c 自身错，见 R3-CONTRACT §1.3 / R4-CONTRACT §5.4)；" +
        `判据 = A1(AST==tsc) + A4 计数 + A11${baseline === null ? "" : `（--baseline=${baseline.root} 已给也不比）`}`,
      { noBaseline: true },
    );
  } else if (baseline === null) {
    add("A10", "SKIP", "未给 --baseline=<8456ec3c 克隆>：A10 未启用");
  } else if (isRejected) {
    if (baseError !== null && first.error && String(baseError) === String(first.error.message)) {
      add("A10", "PASS", `${kind}：两侧同源拒绝「${first.error.message}」（baseline=${baseline.root}）`, { enforced: true });
    } else {
      add(
        "A10",
        "FAIL",
        `${kind}：拒绝行为与基线不同 —— ours=${first.error ? `"${first.error.message}"` : "<Parse 成功>"} ` +
          `baseline=${baseError === null ? "<Parse 成功>" : `"${baseError}"`}（baseline=${baseline.root}）`,
        { enforced: true },
      );
    }
  } else if (baseXml === null) {
    add("A10", "FAIL", `基线侧解析失败：${baseError || "没有 XML"}（baseline=${baseline.root}）`);
  } else if (xml1 === null) {
    add("A10", "FAIL", `本侧没有 XML，无法比对（baseline=${baseline.root}）`);
  } else if (xml1 === baseXml) {
    add("A10", "PASS", `XML 与基线逐字节一致（len=${xml1.length}，baseline=${baseline.root}）`, { enforced: true });
  } else {
    const at = firstXmlDiff(xml1, baseXml);
    add(
      "A10",
      "FAIL",
      `XML 与基线不同（首次差异 @ char ${at}；len ${xml1.length} vs 基线 ${baseXml.length}）: ` +
        `ours="${short(xml1.slice(at, at + 40))}" baseline="${short(baseXml.slice(at, at + 40))}"`,
      { enforced: true },
    );
  }

  // A11 —— 正例 / guard 的 DeclineReasons 全空
  if (!isPosLike) {
    add("A11", "SKIP", `${kind} 不适用（负例看 A9：期望 category 计数 >=1）`);
  } else if (!reasonsCapable) {
    add("A11", "SKIP", "DirectBuildMetrics.DeclineReasons 不存在（C3 分类未实现），A11 无法判定");
  } else {
    const observed = reasons === null ? {} : reasons;
    const keys = Object.keys(observed).filter((key) => num(observed[key]) > 0);
    const ok = keys.length === 0;
    const detail = ok
      ? `DeclineReasons 为空（${countersText(m1)}）`
      : `DeclineReasons 非空 ${JSON.stringify(observed)} ← 正例上任何 decline 都不允许（A11 是 declined==0 的强形式）`;
    if (flags.expectDirect) {
      add("A11", ok ? "PASS" : "FAIL", detail, { enforced: true, observed });
    } else {
      add("A11", "READING", `${detail}（只报读数；--expect-direct 时强制）`, { enforced: false, readingPass: ok, observed });
    }
  }

  // A12 —— 【R3】strict 全量化（R3-CONTRACT §4.4 / R3-TARGET-CASES §5）
  //   只在「该 case 真的以 Strict=true 解析」时判定（pos/guard 恒是；非正例要 strictAll 或 --strict-all）。
  //   「Parse 不抛」是 R3-S 的唯一必改行为：H1 的 Ingest 期异常必须被 H1′ 的 try/catch 接住，
  //   已计数的 Decline 不再重复计 Errors，接着仍走旧路径建树（AST 不变）。
  const parseThrew = first.error !== null;
  if (!flags.strict) {
    add("A12", "SKIP", "未开 --strict");
  } else if (!metricsOk) {
    add("A12", "SKIP", "--strict 已开，但 DirectBuildMetrics 未实现，无法看 StrictViolations");
  } else if (!strictForParse) {
    add(
      "A12",
      "SKIP",
      `--strict 未对该 case 生效（R2 抑制：expect=${kind} 默认以 Strict=false 解析；` +
        `strict 全量化的验收用 --strict-all，前提是 H1′ try/catch 已落地）；读数：${countersText(m1)}`,
    );
  } else if (kind === "safe") {
    add("A12", "SKIP", `safe 不进 DirectSession，不要求 strictViolations（读数：${countersText(m1)}）`);
  } else if (isPosLike) {
    const ok = m1.strictViolations === 0 && m1.errors === 0;
    const detail =
      `strict 全量化：正例 strictViolations=${m1.strictViolations}（须 0）、errors=${m1.errors}（须 0）、` +
      `parse=${parseThrew ? "THREW" : "ok"}`;
    if (flags.expectDirect) {
      add("A12", ok ? "PASS" : "FAIL", detail, { enforced: true });
    } else if (ok) {
      add("A12", "READING", `${detail}（只报读数；--expect-direct 时强制）`, { enforced: false, readingPass: true });
    } else {
      add("A12", "READING", `${detail}（只报读数；--expect-direct 时强制）`, { enforced: false, readingPass: false });
    }
  } else {
    // 非正例：strict 下每次 Decline 都 +1（具体 1 还是 2 由壳是否重放决定，只断言 >=1）；errors 必须 0。
    // 【R4-Q2】invalid / incomplete：**不再要求 Parse 不抛**（它们本来就是两侧 Parse 都抛），改判
    //   「两侧拒绝文案同源」（PARSE-REJECT-PARITY，与 A10 的 invalid 规则同口径）：给 --baseline 时比文案，
    //   没给时只要求本侧仍以拒绝收场（A1 已判「本侧必须拒绝」）。neg / safe 仍要求 Parse 不抛（R3-S 读数不变）。
    let parseOk;
    let parseNote;
    if (isRejected) {
      const oursReject = first.error ? String(first.error.message) : null;
      if (baseline === null) {
        parseOk = true;
        parseNote = `PARSE-REJECT：${kind} 的 Parse 拒绝就是定义（未给 --baseline，拒绝文案未比对；A1 已判本侧必须拒绝）`;
      } else {
        parseOk = oursReject !== null && baseError !== null && String(baseError) === oursReject;
        parseNote = parseOk
          ? `PARSE-REJECT-PARITY：两侧同源拒绝「${oursReject}」`
          : `拒绝文案与基线不同：ours=${oursReject === null ? "<Parse 成功>" : `"${oursReject}"`} ` +
            `baseline=${baseError === null ? "<Parse 成功>" : `"${baseError}"`}`;
      }
    } else {
      parseOk = !parseThrew;
      parseNote = parseThrew
        ? "  ← P0：H1′ 未落地，Decline 从 Ingest 抛穿 Parse（R3-S 的唯一必改行为）"
        : "；Parse 不抛（该路径的 Decline 没有穿出 Parse）";
    }
    const ok = m1.strictViolations >= 1 && m1.errors === 0 && parseOk;
    let detail =
      `strict 全量化：非正例 strictViolations=${m1.strictViolations}（须 >=1）、errors=${m1.errors}（须 0）、` +
      `parse=${parseThrew ? "THREW" : "ok"}；${parseNote}`;
    if (flags.expectDirect) {
      add("A12", ok ? "PASS" : "FAIL", detail, { enforced: true });
    } else if (ok) {
      add("A12", "READING", `${detail}（只报读数；--expect-direct 时强制）`, { enforced: false, readingPass: true });
    } else {
      add("A12", "READING", `${detail}（只报读数；--expect-direct 时强制）`, { enforced: false, readingPass: false });
    }
  }

  return {
    case: c,
    tsAst: tsSide,
    cjAst: ours,
    assertions: a,
    readings: {
      parseError: first.error ? String(first.error.message) : null,
      parseMs: Number(first.ms.toFixed(2)),
      nodeCount,
      statementCount: tsSide.length,
      topKinds: ours.map((node) => node.kind),
      xml: xml1,
      xmlLength: xml1 === null ? null : xml1.length,
      metrics: m1,
      secondMetrics: m2 === null ? null : { statementsBuilt: m2.statementsBuilt, declined: m2.declined, errors: m2.errors },
      loads: { ...loadSnap, effectiveLoads: legacy },
      determinism: { xmlEqual: xml1 !== null && xml1 === xml2 },
      feature,
      declineReasons: reasons,
      reasonsCapable,
      baseline: baseline === null ? null : (() => {
        const baseXml = baselineXmlOf(baseline, c);
        return {
          repo: baseline.root,
          xmlLength: baseXml === null ? null : baseXml.length,
          equal: baseXml !== null && xml1 !== null ? baseXml === xml1 : null,
        };
      })(),
      tsAstLength: tsText.length,
      cjAstLength: oursText.length,
    },
  };
}

// ---------------------------------------------------------------------------
// 输出
// ---------------------------------------------------------------------------
function aggregate(results, id) {
  const statuses = results.map((r) => (r.assertions[id] ? r.assertions[id].status : null)).filter(Boolean);
  if (statuses.length === 0) return null;
  if (statuses.includes("FAIL")) return "FAIL";
  if (statuses.includes("PASS")) return "PASS";
  if (statuses.includes("READING")) return "READING";
  return "SKIP";
}

function renderCaseHuman(result, flags) {
  const { case: c, assertions: a, readings } = result;
  const lines = [];
  lines.push(SEP);
  lines.push(`SOURCE: ${JSON.stringify(c.src)}`);
  if (readings.parseError) {
    lines.push(`PARSE-ERROR: ${readings.parseError}`);
  } else {
    lines.push(`TS-AST:  ${JSON.stringify(result.tsAst)}`);
    lines.push(`CJ-AST:  ${JSON.stringify(result.cjAst)}`);
    lines.push(`AST-MATCH(ts): ${a.A1.status === "PASS" ? "YES" : "NO"}`);
    if (readings.xml === null) lines.push("XML: <none: SourceFileShape 没有 ToXmlString()>");
    else lines.push(`XML: ${readings.xml}`);
  }
  for (const id of ["A1", "A2", "A3"]) {
    const item = a[id];
    lines.push(`${id}: ${item.status}  ${item.detail}`);
  }
  // DIRECT 读数行（R1 CONTRACT §6：每条 case 之后）
  const m = readings.metrics;
  const built = m ? String(m.statementsBuilt) : "NA";
  const declined = m ? String(m.declined) : "NA";
  lines.push(
    `DIRECT: built=${built} declined=${declined} loads=${readings.loads.effectiveLoads}` +
      (c.injection === "finish-throw" ? "（C4：loads 量第二次「不注入」解析）" : ""),
  );
  // A4/A6 具体读数
  const a4 = a.A4;
  const a6 = a.A6;
  lines.push(`A4: ${a4.status}  ${a4.detail}`);
  if (flags.strict) lines.push(`A5: ${a.A5.status}  ${a.A5.detail}`);
  lines.push(`A6: ${a6.status}  ${a6.detail}`);
  if (flags.trace) lines.push(`A7: ${a.A7.status}  ${a.A7.detail}`);
  if (flags.strict) lines.push(`A12: ${a.A12.status}  ${a.A12.detail}`);

  // ---- R2 新增行（R2-CONTRACT §5.4：只能追加在每条 case 之后） ----
  if (c.d1) {
    lines.push("NOTE: Lead 裁决 D1 — `let x = f()` 本轮起是正例（调用被 A3 直建覆盖）；R1 历史期望是 Declined>=1。");
  }
  lines.push(
    `CATEGORY: ${c.id} group=${c.group} expect=${c.expect} declineReasons=${JSON.stringify(readings.declineReasons)}`,
  );
  /** 选中 case 的分组构成（证据行：--group=r3 必须恰好是 32 条 = B1 15 + B2 11 + D7 4 + S 2）。 */
  // ---- R3/R4 追加行（只对 R3/R4/R5 的 case 打印，R1/R2 的输出行保持 R2 的形状） ----
  if (/^R[3456]-/.test(String(c.id))) {
    if (typeof c.expectBuilt === "number") {
      lines.push(
        `EXPECT-BUILT: ${c.expectBuilt}（StatementsBuilt 精确值；**含体内语句**。A3 的根下节点数口径不同：` +
          `例如 \`{ let x = 1; }\` built=2 而根下节点数=1）`,
      );
    }
    if (typeof c.expectBodyBuilt === "number") {
      lines.push(
        `EXPECT-BODY-BUILT: ${c.expectBodyBuilt}（负例：built 读数来自**体内语句自己的壳**，不是本条语句；` +
          `本条断言 declined>=1 + category）`,
      );
    }
    if (c.noBaseline) {
      lines.push(
        "NO-BASELINE: A10 改判 SKIP（旧基线 8456ec3c 自身错，R3-CONTRACT §1.3 / R4-CONTRACT §5.4）；" +
          "判据 = A1（AST==tsc）+ A4 计数 + A11",
      );
    }
    if (c.strictAll) {
      lines.push(
        "STRICT-ALL: 该 case 在 --strict 下解析（A12 判 strictViolations；neg/safe 还要 Parse 不抛，" +
          "invalid/incomplete 按 R4-Q2 改判「两侧拒绝文案同源」）",
      );
    }
  }
  if (a.A9.status !== "SKIP") lines.push(`A9: ${a.A9.status}  ${a.A9.detail}`);
  if (a.A10.status !== "SKIP" || c.expect === "pos" || c.expect === "guard" || c.noBaseline) {
    lines.push(`A10: ${a.A10.status}  ${a.A10.detail}`);
  }
  if (c.expect === "pos" || c.expect === "guard") lines.push(`A11: ${a.A11.status}  ${a.A11.detail}`);
  return lines;
}

function printDeclineStats(stats) {
  if (!stats.capable) {
    console.log("DECLINE-STATS: SKIP (DirectBuildMetrics.DeclineReasons 不存在)");
    return;
  }
  const entries = Object.entries(stats.totals).filter(([, count]) => count > 0);
  // R2-CONTRACT §5.3：count 降序、同数按 category 字典序
  entries.sort((left, right) => (right[1] - left[1]) || (left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0));
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  console.log(`DECLINE-STATS: total=${total} categories=${entries.length}`);
  for (const [category, count] of entries) {
    const last = stats.last[category] === undefined ? "" : stats.last[category];
    console.log(`  ${category.padEnd(20)}${count}  last=${JSON.stringify(last)}`);
  }
}

/** R2-CONTRACT §3.1 的 trace 格式：`decline[<category>] <reason>`。 */
function lastReasonFromTraces(traces, category) {
  let last = null;
  for (const line of traces) {
    const match = /^decline\[([^\]]+)\] (.*)$/.exec(String(line));
    if (match && match[1] === category) last = match[2];
  }
  return last;
}

function accumulateDeclineStats(stats, result) {
  const m = result.readings.metrics;
  const reasons = m === null ? null : m.declineReasons;
  if (reasons === null || reasons === undefined) return;
  stats.capable = true;
  const keys = Object.keys(reasons).filter((key) => num(reasons[key]) > 0);
  for (const key of keys) {
    stats.totals[key] = num(stats.totals[key]) + num(reasons[key]);
    const fromTrace = lastReasonFromTraces(m.traces, key);
    if (fromTrace !== null) stats.last[key] = fromTrace;
    else if (keys.length === 1) stats.last[key] = m.lastDeclineReason || "";
  }
}

/** 选中 case 的分组构成（证据行：--group=r3 必须恰好是 32 条 = B1 15 + B2 11 + D7 4 + S 2）。 */
function groupTally(cases) {
  const tally = new Map();
  for (const c of cases) tally.set(c.group, (tally.get(c.group) || 0) + 1);
  return [...tally.keys()].sort().map((g) => `${g}=${tally.get(g)}`).join(" ");
}

function printSummaryHuman(results, impl, flags, totals, baseline, injection) {
  console.log(SEP);
  console.log(describeImpl(impl));
  const assertionIds = ["A1", "A2", "A3", "A4"];
  if (flags.strict) assertionIds.push("A5");
  assertionIds.push("A6");
  if (flags.trace) assertionIds.push("A7");
  assertionIds.push("A9", "A10", "A11");
  if (flags.strict) assertionIds.push("A12");
  const agg = assertionIds
    .map((id) => {
      const status = aggregate(results, id);
      return status === null ? null : `${id}=${status}`;
    })
    .filter(Boolean)
    .join(" ");
  console.log(`ASSERT: ${agg}`);
  const totalLine =
    `CASES=${totals.evaluated} FAILED=${totals.failedCases}` +
    (totals.skipped > 0 ? ` SKIPPED=${totals.skipped}` : "") +
    (totals.readingFailures > 0 ? ` READING-FAIL=${totals.readingFailures}` : "") +
    (totals.absentCases > 0 ? ` IMPLEMENTATION-ABSENT=${totals.absentCases}` : "");
  console.log(`DIRECT-TOTAL: builtCases=${totals.builtCases}/${totals.evaluated} loads=${totals.totalLoads}`);
  console.log(totalLine);
  if (!flags.expectDirect && totals.readingFailures > 0) {
    console.log(
      "NOTE: READING-FAIL 只是「读数未达标」，默认模式不作为失败；final 验收请加 --expect-direct（A4/A6 强制）。",
    );
  }
  if (totals.absentCases > 0) {
    console.log(
      `NOTE: IMPLEMENTATION-ABSENT=${totals.absentCases} 条 case 的构造在 build/ts 里没有任何实现痕迹 —— ` +
        "这是「没实现」不是「实现错了」；默认模式只报读数（不崩），--expect-direct 时红（R6-CONTRACT §5.3 的未合入窗口）。",
    );
  }
  if (flags.expectDirect && impl.metrics.state !== "present") {
    const broken = impl.metrics.state === "broken";
    console.log(
      `EXPECT-DIRECT: FAIL — DirectBuildMetrics ${broken ? "模块存在但不可用（实现错了）" : "不可用（实现未合入或构建过期）"}；` +
        (broken
          ? `原因：${impl.metrics.reason}`
          : "这属于「没实现」，不是「实现错了」。先合入 M1–M3 并重建 dist/build，再跑 --expect-direct。"),
    );
  } else if (flags.expectDirect) {
    console.log("EXPECT-DIRECT: 已强制 A4/A6（及 --strict 时的 A5、A9/A11）");
  }
  if (baseline === null) {
    console.log("BASELINE: 未启用（--baseline=<8456ec3c 克隆> 时启用 A10：XML 与基线逐字节一致）");
  } else {
    console.log(`BASELINE: ${baseline.root}（A10 已启用：XML 与基线逐字节一致）`);
  }
  // ---- 【R6-A4】--q1/--q4/--q5 已退役：不再打印 Q1:/Q4:/Q5: 行 ----
  console.log(
    "Q-SWITCHES: retired（R6-A4）—— --q1/--q4/--q5 已退役，期望直接落 case 主字段；" +
      "行为钉子 = R6-HD-guard-03 / R2-SAFE-04/05",
  );
  console.log(
    `STRICT-ALL: ${flags.strictAll
      ? `on（非正例也在 --strict 下解析，A12 判定${flags.strictImplied ? "；并**隐含 --strict**：MODE 行 strict=on (implied by --strict-all)" : ""}）`
      : "off（--strict 只作用于正例 Parse 与 strictAll case）"}`,
  );
  const injectionCases = results.filter((r) => r.case.injection === "finish-throw");
  if (injectionCases.length > 0 && flags.faultInject !== "finish-throw") {
    console.log(
      "NOTE: R2-C4-01 需要 --fault-inject=finish-throw 才能触发 H2 的异常路径；本次 A4 只有控制读数（SKIP）。",
    );
  }
  if (flags.declineStats) printDeclineStats(totals.declineStats);
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  let flags;
  try {
    flags = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`USAGE-ERROR: ${error.message}`);
    console.error(usage());
    process.exitCode = 1;
    return;
  }
  if (flags.help) {
    console.log(usage());
    return;
  }

  // 0) 依赖检查：build/ts 必须先构建（R1 CONTRACT §1 / HARNESS §1）
  if (!fs.existsSync(PATHS.runner)) {
    console.error(`BUILD-MISSING: ${PATHS.runner} 不存在。`);
    console.error('先构建：xl_build(cwd=<clone>, paths=["core","typescript"], targets=["ts"], out="dist")');
    console.error("        node node_modules/typescript/bin/tsc -p tsconfig.json");
    process.exitCode = 1;
    return;
  }

  let selected;
  try {
    selected = selectCases(CASES, flags);
  } catch (error) {
    console.error(`USAGE-ERROR: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  let baseline = null;
  if (flags.baseline !== null && String(flags.baseline).trim() !== "") {
    try {
      baseline = loadBaseline(flags.baseline);
    } catch (error) {
      console.error(`BASELINE-ERROR: ${error.message}`);
      process.exitCode = 1;
      return;
    }
  }

  const require = createRequire(path.join(REPO, "package.json"));
  const ts = require(path.join(REPO, "node_modules", "typescript"));
  const { SourceFileRunner } = require(PATHS.runner);
  const astCompare = await import(pathToFileURL(path.join(REPO, "typescript", "cases", "ast-compare.mjs")).href);
  const { cjAst } = astCompare;
  const { tsAst } = astCompare.createAstCore(ts);

  const impl = discoverImplementation();
  const metricsOk = impl.metrics.state === "present" && impl.metrics.Class !== null;
  const M = metricsOk ? impl.metrics.Class : null;
  const loads = setupLoadCounters();
  if (!loads.patched) {
    console.error(`WARN: Load 计数不可用（${loads.error}）——A6 会记 SKIP`);
  }
  const injection = flags.faultInject === "finish-throw" ? createFinishInjection() : null;
  if (injection !== null && !injection.available) {
    console.error(`WARN: --fault-inject=finish-throw 的注入点不可用（${injection.error}）——C4 会记 IMPLEMENTATION-ABSENT`);
  }
  const markerTexts = loadDirectText();

  const ctx = {
    flags, impl, metricsOk, M, loads, SourceFileRunner, ts, tsAst, cjAst,
    baseline, markerTexts, injection: injection || { available: false, error: "", arm() {}, disarm() {} },
  };
  const results = [];
  let skippedCounterexample = 0;

  if (!flags.json) {
    console.log(`REPO: ${REPO}`);
    console.log(
      `MODE: only=${flags.only === null ? "<all>" : flags.only} trace=${flags.trace ? "on" : "off"} ` +
        `strict=${flags.strict ? (flags.strictImplied ? "on (implied by --strict-all)" : "on") : "off"} ` +
        `strict-all=${flags.strictAll ? "on" : "off"} ` +
        `expect-direct=${flags.expectDirect ? "on" : "off"} ` +
        `group=${flags.group === null ? "<all>" : flags.group} q-switches=retired ` +
        `baseline=${baseline === null ? "<none>" : baseline.root} ` +
        `fault-inject=${flags.faultInject === null ? "<none>" : flags.faultInject} ` +
        `decline-stats=${flags.declineStats ? "on" : "off"}`,
    );
    console.log(`CASES-SELECTED: ${selected.length}/${CASES.length}`);
    console.log(`GROUPS: ${groupTally(selected)}`);
    console.log(describeImpl(impl));
  }

  for (const c of selected) {
    if (flags.expectDirect && c.counterexample) {
      skippedCounterexample += 1;
      if (!flags.json) {
        console.log(SEP);
        console.log(`SOURCE: ${JSON.stringify(c.src)}`);
        console.log("SKIP: 反例（范围外输入）在 --expect-direct 模式下跳过");
      }
      continue;
    }
    const result = evaluateCase(ctx, c);
    results.push(result);
    if (!flags.json) {
      for (const line of renderCaseHuman(result, flags)) console.log(line);
    }
  }

  // 汇总：FAILED 按「有任一断言失败的 case 数」计（与 probe 的 FAILED 同口径），断言失败数另记
  let failedCases = 0;
  let failedAssertions = 0;
  let readingFailures = 0;
  let builtCases = 0;
  let absentCases = 0;
  let totalLoads = 0;
  const declineStats = { capable: false, totals: {}, last: {} };
  for (const result of results) {
    let caseFailed = false;
    for (const item of Object.values(result.assertions)) {
      if (item.status === "FAIL") {
        failedAssertions += 1;
        caseFailed = true;
      }
      if (item.status === "READING" && item.readingPass === false) readingFailures += 1;
    }
    // 【R6】IMPLEMENTATION-ABSENT 计数：A4 的 label 就是「没实现」的判定（A6 同源只报读数）
    if (result.assertions.A4 && result.assertions.A4.label === "IMPLEMENTATION-ABSENT") absentCases += 1;
    if (caseFailed) failedCases += 1;
    if (result.readings.metrics && result.readings.metrics.statementsBuilt >= 1) builtCases += 1;
    totalLoads += result.readings.loads.effectiveLoads;
    accumulateDeclineStats(declineStats, result);
  }
  const totals = {
    evaluated: results.length,
    failedCases,
    failedAssertions,
    skipped: skippedCounterexample,
    readingFailures,
    builtCases,
    absentCases,
    totalLoads,
    declineStats,
  };

  if (flags.json) {
    const output = {
      schema: "dsh/xl-example/target-cases@6",
      contract:
        "R6-CONTRACT §5/§6.1/§6.2 / R6-TARGET-CASES（CASES=244 = R1 10 + R2 50 + R3 32 + R4 40 + R5 57 + R6 55；" +
        "R6 55 = CLS 24 + MOD 25 + HD 6；R6-Q1 的 6 条改判不增数；R6-Q2 的 A6 精确值档 hard 断言；" +
        "R6-A4 的 --q1/--q4/--q5 已退役，期望全部直接落主字段）",
      generatedAt: new Date().toISOString(),
      repo: REPO,
      baseline: baseline === null ? null : baseline.root,
      modes: {
        only: flags.only,
        group: flags.group,
        trace: flags.trace,
        strict: flags.strict,
        strictAll: flags.strictAll,
        expectDirect: flags.expectDirect,
        declineStats: flags.declineStats,
        faultInject: flags.faultInject,
        // 【R6-A4】--q1/--q4/--q5 退役：只记录「被忽略的 deprecated 输入」，不再有 effective 口径
        qSwitches: "retired",
        deprecatedQSwitches: flags.deprecated,
        strictImplied: Boolean(flags.strictImplied),
      },
      implementation: {
        state: impl.state,
        metrics: {
          state: impl.metrics.state,
          file: impl.metrics.file,
          reason: impl.metrics.reason,
          declineReasons: hasDeclineReasons(M),
        },
        hooks: impl.hooks,
        router: impl.routerPresent,
        sessionFiles: impl.sessionFiles,
        loadCountersPatched: loads.patched,
        loadCounterError: loads.error,
        finishInjection: injection === null
          ? null
          : { available: injection.available, targets: injection.targets.map((t) => t.name), error: injection.error },
      },
      summary: {
        cases: results.length,
        casesTotal: CASES.length,
        skipped: skippedCounterexample,
        failed: failedCases,
        failedAssertions,
        readingFailures,
        builtCases,
        implementationAbsent: absentCases,
        totalLoads,
        exitCode: failedCases > 0 ? 1 : 0,
        groups: results.reduce((acc, r) => {
          acc[r.case.group] = (acc[r.case.group] || 0) + 1;
          return acc;
        }, {}),
        assertions: ["A1", "A2", "A3", "A4", "A6", "A9", "A10", "A11",
          ...(flags.strict ? ["A5", "A12"] : []), ...(flags.trace ? ["A7"] : [])]
          .map((id) => ({ id, status: aggregate(results, id) }))
          .filter((entry) => entry.status !== null),
      },
      declineStats: declineStats.capable
        ? {
          capable: true,
          total: Object.values(declineStats.totals).reduce((sum, n) => sum + num(n), 0),
          totals: declineStats.totals,
          last: declineStats.last,
        }
        : { capable: false },
      cases: results.map((result) => ({
        index: result.case.index,
        id: result.case.id,
        group: result.case.group,
        source: result.case.src,
        note: result.case.note,
        expect: result.case.expect,
        expectBuilt: typeof result.case.expectBuilt === "number" ? result.case.expectBuilt : null,
        expectBodyBuilt: typeof result.case.expectBodyBuilt === "number" ? result.case.expectBodyBuilt : null,
        noBaseline: Boolean(result.case.noBaseline),
        strictAll: Boolean(result.case.strictAll),
        incompleteOk: Boolean(result.case.incompleteOk),
        a6Skip: result.case.a6Skip || null,
        a6ExpectStmtLoads: typeof result.case.a6ExpectStmtLoads === "number"
          ? result.case.a6ExpectStmtLoads
          : null,
        // 【R6-Q2】精确值档：两个字段成对出现（缺省 0）；两者都没有 ⇒ null（走 0 档）
        a6Expect: typeof result.case.a6ExpectStmtLoads === "number" || typeof result.case.a6ExpectExprLoads === "number"
          ? {
            stmtLoads: typeof result.case.a6ExpectStmtLoads === "number" ? result.case.a6ExpectStmtLoads : 0,
            exprLoads: typeof result.case.a6ExpectExprLoads === "number" ? result.case.a6ExpectExprLoads : 0,
          }
          : null,
        implementationAbsent: Boolean(
          result.assertions.A4 && result.assertions.A4.label === "IMPLEMENTATION-ABSENT",
        ),
        categories: result.case.categories || null,
        injection: result.case.injection || null,
        assertions: result.assertions,
        readings: result.readings,
      })),
    };
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  } else {
    printSummaryHuman(results, impl, flags, totals, baseline, injection);
  }

  process.exitCode = failedCases > 0 ? 1 : 0;
}

main().catch((error) => {
  console.error(`HARNESS-ERROR: ${error && error.stack ? error.stack : String(error)}`);
  process.exitCode = 1;
});
