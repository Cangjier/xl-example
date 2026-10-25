#!/usr/bin/env node
// 目标 case 验证 harness（R1 T14/M4 交付 → R2 扩展 → R3 扩展）—— tests/direct-build/target-cases.mjs
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
//   _coord/DECISIONS.md + Lead 裁决   —— D1（`let x = f()` 翻正例）、D3（逗号本轮做，`a, b` 等正例）、
//                                        C2（跨行 ASI 本轮保持 Decline，不作验收门）
//   _coord/DESIGN-all-possible.md §8  —— 三件套（AST 逐字段、XML、直建计数）
//   _coord/HARNESS.md                 —— 构建链与已知坑（build/ts 入口、EOF 口径）
//
//   期望类别（expect；R1 10 + R2 50 + R3 32 = 92 条）：
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
//       C4  注入后 errors==1 且 LastError 含 inject 且 declined==0；第二次解析（Reset 后、不注入）errors==0
//   A5  --strict 时计数器仍全 0（只看计数器，不看是否抛；非正例 SKIP）
//   A6  stmtLoads + exprOtherDirect + exprLegacy == 0（旧路径零次事后 Build/reparse；非正例 SKIP）
//       C4 注入 case 的口径：A6 量**第二次（不注入）解析**——注入那次必然回落旧路径，量它没有意义（见 REPORT §4）
//   A7  --trace 时 Traces 含 `insert(`（仅 expectInsert 的 case；非正例 SKIP）
//   A8  --expect-direct 时 A4/A6 强制（--strict 时再加 A5/A12；A9/A11 同口径）
//   A9  【R2】负例（含 invalid）的 DeclineReasons 里期望 category 计数 >=1（无分类能力 → SKIP）
//   A10 【R2】XML == 基线（另一个已构建的 8456ec3c 克隆）；未给 --baseline → SKIP；
//        invalid / incomplete 改比「两侧 Parse 拒绝文案一致」；**noBaseline 的 case 恒 SKIP**（R3）
//   A11 【R2】正例 / guard 的 DeclineReasons 全空（declined==0 的强形式；无分类能力 → SKIP）
//   A12 【R3】strict 全量化：在该 case 真的以 Strict=true 解析时 —— Parse 不抛（负例）、errors==0、
//        正例 strictViolations==0 / 非正例 strictViolations>=1（safe 不要求）。没在 strict 下解析 → SKIP
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
// CASES —— 目标 case（92 条：R1 10 + R2 50 + R3 32）
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
//   q1           【R3】R3-Q1 改判位（R2-SAFE-04/05）：--q1=auto|safe 时可回退成 safe
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
  { id: "R2-A2-neg-01", src: "({m(){}})", expect: "neg", expectInsert: false,
    note: "对象方法体（函数体属语句族）；不得因「对象字面量已支持」而误建",
    categories: ["expr.decline"] },
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
    note: "await 需 async 上下文：语句壳不进直建 session（旧路径保证 AST）" },
  { id: "R2-SAFE-02", src: "class {}", expect: "safe", expectInsert: false,
    note: "class 声明属语句族其它分支，不经 Variable/Expression session" },
  { id: "R2-SAFE-03", src: "yield a", expect: "safe", expectInsert: false,
    note: "yield 需 generator 上下文" },
  { id: "R2-SAFE-04", src: "if (a) b", expect: "pos", expectInsert: false, q1: true,
    note: "**R3-Q1 改判 pos**：B1 注册后 if 不再 safe（safe 的定义是「该族没有 session」）。依赖 B1-2 单语句体（RawStatement）；" +
      "B1-2 未落地时用 --q1=safe 回退（默认 --q1=auto 会按 build/ts 里有无控制流 session 自动回退，基线不造假红）",
    markers: ["IfStatementShape"] },
  { id: "R2-SAFE-05", src: "return a?b:c", expect: "pos", expectInsert: false, q1: true,
    note: "**R3-Q1 改判 pos**：只依赖 B1-d 的 return 分支（不依赖 RawStatement）；--q1=safe 可回退到 R2 口径",
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
  { id: "R2-C2-01", src: "a\nb", expect: "neg", expectInsert: false,
    note: "C2 跨行 ASI 本轮保持 Decline（R2-D4：不作验收门；R3 直建化时改 pos + built=2）",
    categories: ["expr.stopped"] },

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
  { id: "R3-B1-neg-01", src: "for (let i = 0; i < n; i++) { b; }", expect: "neg", expectInsert: false,
    expectBodyBuilt: 1,
    note: "**声明 init**：头部 VariableDeclarationList 属声明建造器，不代建（代建 = A6 红或静默错建）。" +
      "**口径修正（REPORT-r3-control §6-D2，control 实测）**：不能用 built==0 —— 体内的 `b;` 是**它自己的**表达式语句壳建的正例" +
      "（基线 422a5e6f 上本来就 built=1），本 session 只 Decline 这条 for 自身。断言 = declined>=1 && 体内壳 built==1 && " +
      "category==stmt.head（A9）+ AST MATCH（A1）",
    categories: ["stmt.head"], markers: ["ForStatementShape"] },
  { id: "R3-B1-neg-02", src: "for (const k in o) { b; }", expect: "neg", expectInsert: false,
    expectBodyBuilt: 1,
    note: "同上：const 是声明关键字（for-in 头）。built=1 来自体内 `b;` 自己的壳（D2 同口径），断言 = declined>=1 + " +
      "expectBodyBuilt=1 + stmt.head（A9）+ AST MATCH（A1）",
    categories: ["stmt.head"], markers: ["ForInStatementShape"] },
  { id: "R3-B1-neg-03", src: "switch (a) { case 1: b; }", expect: "neg", expectInsert: false,
    note: "switch 在 IsControlFlowHead 里（所以会建壳、会进 session），但子句结构本轮不做",
    categories: ["stmt.head"], markers: ["SwitchStatementShape"] },

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
  { id: "R3-B2-neg-03", src: "function* g() {}", expect: "neg", expectInsert: false,
    note: "生成器 → R4",
    categories: ["stmt.func"], markers: ["FunctionDeclarationDirectSession"] },
  { id: "R3-B2-neg-04", src: "async (a) => a", expect: "neg", expectInsert: false,
    note: "async 箭头 → R4（Decide 已判 ShellPlainExpression，负例落在表达式引擎）",
    categories: ["expr.decline"] },

  // ---- D7 语句边界（4：pos 3 + guard 1）—— 全部 noBaseline，A10 改判 SKIP ----
  { id: "R3-D7-01", src: "let x = a\n++b", expect: "pos", expectInsert: false, expectBuilt: 2, noBaseline: true,
    note: "D7：AST 必须与 tsc 一致（`let x = a;` + `++b;`）。旧基线（8456ec3c）此处是错的（根下 6 个 raw token），" +
      "所以 A10 必须 SKIP 而不是红",
    markerScope: "boundary", markers: ["IsRestrictedPostfixUnit", "IsRestrictedPostfixText"] },
  { id: "R3-D7-02", src: "let x = a + b\n++c", expect: "pos", expectInsert: true, expectBuilt: 2, noBaseline: true,
    note: "初始器是二元表达式也要断在 b（A7：`a + b` 有运算符插入）",
    markerScope: "boundary", markers: ["IsRestrictedPostfixUnit", "IsRestrictedPostfixText"] },
  { id: "R3-D7-03", src: "let x = a\n!b", expect: "pos", expectInsert: false, expectBuilt: 2, noBaseline: true,
    note: "`!` 与 `++`/`--` 同一族（IsRestrictedPostfixUnit）",
    markerScope: "boundary", markers: ["IsRestrictedPostfixUnit", "IsRestrictedPostfixText"] },
  { id: "R3-D7-guard-01", src: "let x = a\n+ b", expect: "guard", expectInsert: false, expectBuilt: 1,
    note: "**防过度收缩**：`+` 能跨行接续，声明必须仍是**一条**（guard：built 恒为 1；这一条 A10 仍要求 XML==基线）",
    markerScope: "boundary", markers: ["IsRestrictedPostfixUnit", "IsRestrictedPostfixText"] },

  // ---- S strict 全量化（2；expect=neg，但 strictAll：在 --strict 下解析，靠 A12 判） ----
  { id: "R3-S-01", src: "let {a} = b", expect: "neg", expectInsert: false, strictAll: true,
    note: "R2 审计 §7 的原样缺陷：Strict 下 Decline 在 Ingest 抛穿 Parse。**Parse 不抛** + errors=0 + " +
      "strictViolations>=1 才是本轮修复（与 R2-C3-01 同源码、不同口径：R2 那条以 Strict=false 跑）",
    categories: ["var.binding"] },
  { id: "R3-S-02", src: "f(...a)", expect: "neg", expectInsert: false, strictAll: true,
    note: "走另一个 H3 站点（表达式 session），证明 H1′ 的 try/catch 对两条 H3 路径都成立",
    categories: ["expr.decline"] },
];

// ---------------------------------------------------------------------------
// 分组（R2-CONTRACT §5.1 + R3-CONTRACT §6.1）：
//   r1 = R1-*，r2 = **R2-***（R3 修正：旧实现是「非 R1」，加 R3 后会把 R3 case 吞进 --group=r2 造成假绿），
//   r3 = R3-*，另按 ID 前缀取 A1…A5 / C1…C4 / GEN / SAFE / INC / B1 / B2 / D7 / S，以及 neg / pos 两个语义组。
// ---------------------------------------------------------------------------
function groupOf(id) {
  if (id.startsWith("R1-")) return "R1";
  const m = /^R([23])-([A-Z]\d|[A-Z]+)-/.exec(id);
  return m ? m[2] : "?";
}

const KNOWN_GROUPS = [
  "r1", "r2", "r3", "all", "a1", "a2", "a3", "a4", "a5", "c1", "c2", "c3", "c4",
  "gen", "safe", "inc", "b1", "b2", "d7", "s", "neg", "pos",
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
  return c.group.toLowerCase() === t;
}

// ---------------------------------------------------------------------------
// R3-Q1（Lead 已批准）：R2-SAFE-04/05 从 safe 改判 pos。
//   默认 --q1=auto：build/ts 里存在 R3 控制流 session → 按 pos；不存在（R1+R2 基线）→ 回退 safe，
//   让「R1/R2 组在基线上不回归」与「R3 落地后按 pos 验收」两件事同时成立，且不制造已知假红。
//   --q1=pos 强制按 R3 口径（最终验收用）；--q1=safe 强制回退（B1-2 单语句体滑出本轮时用）。
// ---------------------------------------------------------------------------
function controlFlowSessionPresent() {
  const dir = path.join(REPO, "build", "ts", "typescript", "tokens", "direct");
  for (const name of ["direct-control-session.js", "direct-function-session.js"]) {
    if (fs.existsSync(path.join(dir, name))) return true;
  }
  return false;
}

function resolveQ1(flags) {
  const requested = String(flags.q1 || "auto").toLowerCase();
  if (requested === "pos") {
    return { mode: "pos", effective: "pos", why: "--q1=pos（强制 R3 口径：B1 已落地）" };
  }
  if (requested === "safe") {
    return {
      mode: "safe", effective: "safe",
      why: "--q1=safe（回退 R2 口径：B1-2 单语句体未落地 / 只验 R1+R2 基线）",
    };
  }
  const present = controlFlowSessionPresent();
  return present
    ? { mode: "auto", effective: "pos", why: "auto：build/ts 里已有 R3 控制流 session → SAFE-04/05 按 pos" }
    : {
      mode: "auto", effective: "safe",
      why: "auto：build/ts 里没有 R3 控制流 session（R1+R2 基线）→ SAFE-04/05 回退 safe（不制造已知假红；" +
        "R3 合入后自动变 pos，或用 --q1=pos 强制）",
    };
}


// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function usage() {
  return [
    "用法: node tests/direct-build/target-cases.mjs [--group=<g1,g2>] [--only=<id|序号|source>,...] [--trace] [--strict]",
    "                                            [--strict-all] [--expect-direct] [--json] [--decline-stats]",
    "                                            [--baseline=<repo>] [--q1=pos|auto|safe]",
    "                                            [--fault-inject=finish-throw] [--help]",
    "",
    "  --group=...      逗号分隔的组：r1 | r2 | r3 | all | A1…A5 | C1…C4 | GEN | SAFE | INC | B1 | B2 | D7 | S | NEG | POS",
    "                   （大小写不敏感；未给 = all。r2 = R2-* 前缀，r3 = R3-* 前缀，二者不重叠）",
    "  --only=...       逗号分隔，先按 case ID 精确匹配（R3-B1-pos-04），再退回 R1 语义：",
    "                   全数字 = 1 基序号（按 CASES 全表编号） / 精确 source / 子串 source",
    "  --trace          打开 DirectBuildMetrics.TraceEnabled，并断言 Traces 含 insert(（A7）",
    "  --strict         打开 DirectBuildMetrics.Strict，并断言计数器仍全 0（A5）+ strict 全量化（A12）",
    "  --strict-all     【R3】把 Strict=true 也用到非正例（默认只对正例生效，避免 H1 未捕获的 Decline 遮断 AST）；",
    "                   用于 R3-harden 的 H1′ try/catch 落地后做「整套 case 全 strict」验收",
    "  --expect-direct  断言直建确实被使用：A4/A6（及 --strict 的 A5/A12、A9/A11）强制（A8）",
    "  --json           stdout 只输出一份 JSON 读数（供存盘/报告）",
    "  --decline-stats  打印 DECLINE-STATS 段（按 category 计数 + 最近 reason；无分类能力时打印 SKIP）",
    "  --baseline=<repo> 用另一个已构建的克隆（8456ec3c 的 build/ts）同源解析同一 case，比对 XML（A10）",
    "  --q1=pos|auto|safe  【R3-Q1】R2-SAFE-04/05 的期望：pos=强制改判后口径；auto=按 build/ts 里有无 R3",
    "                   控制流 session 自动决定（默认）；safe=回退 R2 口径（B1-2 单语句体滑出本轮时用）",
    "  --fault-inject=finish-throw  C4 专用：在 session 的 Finish 上熔断一次（进程内注入，不改源码）",
    "  --help           显示本帮助",
  ].join("\n");
}

function parseArgs(argv) {
  const flags = {
    only: null, group: null, trace: false, strict: false, strictAll: false, expectDirect: false,
    json: false, declineStats: false, baseline: null, faultInject: null, q1: "auto", help: false,
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
      case "q1": { const r = readValue(i, inline, name); flags.q1 = r.value; i = r.next; break; }
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
  if (!["pos", "auto", "safe"].includes(String(flags.q1).toLowerCase())) {
    throw new Error(`--q1 只支持 pos|auto|safe（收到 ${JSON.stringify(flags.q1)}）`);
  }
  return flags;
}

/** 先把全表标注（index/group/neg），再按 --group 过滤，再按 --only 选择（R2-CONTRACT §5.1）。
 *  neg = 「非正例」：NEG 组覆盖 neg / invalid / incomplete / safe（safe 也不该被当正例口径断言）；
 *  【R3】guard 是 pos 的强形式，**不算** neg；R3-Q1 的 SAFE-04/05 在这里按 --q1 决定 pos / safe。 */
function selectCases(all, flags) {
  const q1 = resolveQ1(flags);
  flags.q1Resolution = q1;
  const annotated = all.map((c, i) => {
    let expect = c.expect;
    let note = c.note;
    if (c.q1 && q1.effective === "safe") {
      expect = "safe";
      note = `${note}  [R3-Q1 回退 safe：${q1.why}]`;
    }
    return {
      ...c,
      note,
      expect,
      index: i + 1,
      group: groupOf(c.id),
      neg: expect !== "pos" && expect !== "guard",
      q1Reverted: Boolean(c.q1 && q1.effective === "safe"),
    };
  });
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
    // 语法非法输入：直建必须显式 Decline（不许静默建成别的树），之后旧路径同源拒绝。
    const ok = m1.statementsBuilt === 0 && m1.declined >= 1 && m1.errors === 0;
    let detail = `${countersText(m1)}（invalid：语法非法输入，期望 declined>=1 built=0 errors=0）`;
    if (m1.statementsBuilt !== 0) {
      detail += `  ← IMPLEMENTATION-MISBUILT：非法输入被直建接管`;
    } else if (m1.errors !== 0) {
      detail += `  ← IMPLEMENTATION-ERROR-FALLBACK：异常兜底，Errors 必须 0`;
    } else if (m1.declined === 0) {
      detail += `  ← IMPLEMENTATION-NO-DECLINE：既没建也没 Decline`;
    } else {
      detail += `（Decline 后旧路径同源拒绝）`;
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
      "XML-BASELINE: SKIP (noBaseline: 旧基线 8456ec3c 自身错，见 R3-CONTRACT §1.3)；" +
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
    // 非正例：strict 下每次 Decline 都 +1（具体 1 还是 2 由壳是否重放决定，只断言 >=1）；
    // errors 必须 0（「先计数再抛」）；非 invalid/incomplete 的输入 Parse 必须不抛。
    const parseOk = isRejected ? parseThrew : !parseThrew;
    const ok = m1.strictViolations >= 1 && m1.errors === 0 && parseOk;
    let detail =
      `strict 全量化：非正例 strictViolations=${m1.strictViolations}（须 >=1）、errors=${m1.errors}（须 0）、` +
      `parse=${parseThrew ? "THREW" : "ok"}`;
    if (!parseThrew && !isRejected) detail += "；Parse 不抛（该路径的 Decline 没有穿出 Parse）";
    else if (parseThrew && !isRejected) {
      detail += "  ← P0：H1′ 未落地，Decline 从 Ingest 抛穿 Parse（R3-S 的唯一必改行为）";
    }
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
  // ---- R3 追加行（只对 R3 的 case 打印，R1/R2 的输出行保持 R2 的形状） ----
  if (String(c.id).startsWith("R3-")) {
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
      lines.push("NO-BASELINE: A10 改判 SKIP（旧基线 8456ec3c 自身错，R3-CONTRACT §1.3）；判据 = A1 + A4 计数 + A11");
    }
    if (c.strictAll) {
      lines.push("STRICT-ALL: 该 case 在 --strict 下解析（A12 判 strictViolations；R3-S 的唯一必改行为是 Parse 不抛）");
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
    (totals.readingFailures > 0 ? ` READING-FAIL=${totals.readingFailures}` : "");
  console.log(`DIRECT-TOTAL: builtCases=${totals.builtCases}/${totals.evaluated} loads=${totals.totalLoads}`);
  console.log(totalLine);
  if (!flags.expectDirect && totals.readingFailures > 0) {
    console.log(
      "NOTE: READING-FAIL 只是「读数未达标」，默认模式不作为失败；final 验收请加 --expect-direct（A4/A6 强制）。",
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
  // ---- R3 新增：Q1 裁决落地状态 + strict 全量化状态（都不是断言，是口径声明） ----
  const q1r = flags.q1Resolution || { mode: "auto", effective: "pos", why: "" };
  console.log(`Q1: mode=${q1r.mode} → SAFE-04/05 expect=${q1r.effective}（${q1r.why}）`);
  console.log(
    `STRICT-ALL: ${flags.strictAll ? "on（非正例也在 --strict 下解析，A12 判定）" : "off（--strict 只作用于正例 Parse 与 strictAll case）"}`,
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
        `strict=${flags.strict ? "on" : "off"} strict-all=${flags.strictAll ? "on" : "off"} ` +
        `expect-direct=${flags.expectDirect ? "on" : "off"} ` +
        `group=${flags.group === null ? "<all>" : flags.group} q1=${flags.q1} ` +
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
    totalLoads,
    declineStats,
  };

  if (flags.json) {
    const output = {
      schema: "dsh/xl-example/target-cases@3",
      contract: "R3-CONTRACT §5/§6.1 / R3-TARGET-CASES（CASES=92 = R1 10 + R2 50 + R3 32；R3 32 = B1 15 + B2 11 + D7 4 + S 2）",
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
        q1: flags.q1Resolution || { mode: flags.q1, effective: flags.q1 },
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
        q1Reverted: Boolean(result.case.q1Reverted),
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
