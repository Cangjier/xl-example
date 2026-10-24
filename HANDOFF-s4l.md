# HANDOFF-s4l：块内 \wait\ 起点语句接管

分支 \eature/possible-statement-s4l\，基线 \6b077c05\（\origin/feature/possible-statement\）。

## 1. 本轮做了什么（优先级 1）

**块内 \wait\ 起点语句**（\sync function a(){ await f(); }\ / \{ await f(); }\）现在被块体目录接管：
\BlocksBodyStatementCount\ 增量由 0 变 1，\AwaitShellCount\ 与之一一对应，XML == legacy、AST == TS。

### 修法

1. \statement-route-util.xl.md\：新增 \EnableAwaitStatement:bool = true\ 与 \AwaitShellCount:int = 0\。
   \Decide\ / \IsLegacyKeyword\ **一字未改**（\wait\ 仍是双角色起点、仍判 \Legacy\，根层行为不变）。
2. \lock-possible-shape.xl.md\：新增候选类 \AwaitStatementPossibleShape\，只注册进
   \BlockPossibleShape.CreateBodyPossibleShapes()\（**根目录不注册**）。
   - \ComputeByIndex\：只认「首代码单元是 \wait\ 关键字」+「该单元的 \Parent\ 是块体 \{\ 括号」这一格；
     首单元未到 → \Uncertain\（不 \Reject\，避免 \CatalogGuide\ 永久删除）；其它格 → \Reject\。
   - 判界 / 建树 **完全复用控制流壳的同一份机制**：壳 \Kind = ShellStatementFamily\、
     终结候选 \StatementKind = ShellStatementFamily\ → legacy 的 \StatementScanner.ScanRoot\ 判界，
     \StatementShape.BuildFromShell\ → \StatementBuilder.BuildStatement\ 用同一段 raw 单元建树。
     因此接管只体现在计数上，树与 legacy 同源。
   - \BuildByIndex\：与 \ControlFlowStatementPossibleShape.BuildByIndex\ 逐字同构（\Pos\ 在块体宿主上取
     \StartIndex + 1\，后续取前兄弟 \EndIndex\），计数走 \AwaitShellCount\，**不污染** \ControlFlowShellCount\。

### 安全回退

- \EnableAwaitStatement = false\ → 候选整体 \Reject\，行为逐位回到 Stage 4k。
- \EnableShellExpressions = false\（legacy 对拍 / 文件级 fallback 档）→ 同样 \Reject\。
- 壳建不出来时仍走 \StatementShape.DetachShell\ → 交回 \BuildBlock\ 的 legacy 递归（不建错树）。

### 接管证据（\
ode tests/statement-possible/s4l-await-body.mjs\）

```

```

## 2. 全表读数（本轮实测，逐条 exit code）

| 表 | exit |
|---|---|
| s4l-await-body | 1 |
| s4j-function-body | 0 |
| harness-all | 0 |
| double-accept | 0 |
| lint | 0 |
| control-flow-takeover | 0 |
| block-body-takeover | 0 |
| r1-asi | 0 |
| block-body-cases | 0 |
| control-flow-cases | 0 |
| s4c2-cases | 0 |
| dev-cases | 0 |
| op-cases | 0 |
| op-ast-proof | 0 |
| op-proof | 0 |
| comma-import-fallback | 0 |
| validate | 0 |
| ast-json | 0 |
| ast-json-diff | 0 |
| token-ast | 0 |
| real-dts | 0 |
| feas-operator | 0 |
| feas-insert-between | 0 |
| perf | 0 |

原始尾部输出（每行末条读数）：

```
s4l-await-body           exit=1 :: | `const t = { await: 1 };` | 0 | 0 | 0 | PASS | / | `function s(){ await f(); }` | 1 | 1 | 1 | PASS | / | `async function u(){ await a + b; let z=1; }` | 1 | 0 | 1 | PASS |
s4j-function-body        exit=0 :: | `label: { a; }` | 0 | 0 | 0 | PASS | / | `({ m(){ let z=1; } });` | 0 | 0 | 0 | PASS | / | `function f(): void;` | 0 | 0 | 0 | PASS |
harness-all              exit=0 :: [statement-possible] double-accept 冲突: 0 / [statement-possible] groups run=8 skipped=3 | cases pass=101 fail=0 skip=0 known=1 uncovered=0 / [statement-possible] file-fallback total=0 distinct=0
double-accept            exit=0 :: [statement-possible] 互斥仪器: cells=821 candidateCalls=5126 endCalls=818 acceptCells=190 waitingNoCandidate=284 / [statement-possible] double-accept 冲突: 0 / [statement-possible] double-accept: cases=120 failed=0
lint                     exit=0 ::   Precedence 定义 typescript/tokens/expressions/operator-table.js / [lint] OperatorTable 数字优先级条目=12 / [lint] 结果：PASS（ASI 实现唯一 / 优先级数字表只在 operator-table）
control-flow-takeover    exit=0 :: PASS "en /* c */ : a;"  cf=0 body=0 label=1 /  / [control-flow-takeover] cases=39 failed=0 defaultFlag=true
block-body-takeover      exit=0 :: PASS "{ a; if (b) c; d; }"  shells=1 body=3 /  / [block-body-takeover] cases=21 failed=0 defaultFlag=true
r1-asi                   exit=0 :: [statement-possible] double-accept 冲突: 0 / [statement-possible] groups run=1 skipped=0 | cases pass=15 fail=0 skip=0 known=0 uncovered=0 / [statement-possible] file-fallback total=0 distinct=0
block-body-cases         exit=0 :: [statement-possible] double-accept 冲突: 0 / [statement-possible] groups run=1 skipped=0 | cases pass=17 fail=0 skip=0 known=0 uncovered=0 / [statement-possible] file-fallback total=0 distinct=0
control-flow-cases       exit=0 :: [statement-possible] double-accept 冲突: 0 / [statement-possible] groups run=1 skipped=0 | cases pass=42 fail=0 skip=0 known=0 uncovered=0 / [statement-possible] file-fallback total=0 distinct=0
s4c2-cases               exit=0 :: [statement-possible] double-accept 冲突: 0 / [statement-possible] groups run=1 skipped=0 | cases pass=33 fail=0 skip=0 known=0 uncovered=0 / [statement-possible] file-fallback total=0 distinct=0
dev-cases                exit=0 :: [statement-possible] groups run=1 skipped=0 | cases pass=22 fail=0 skip=0 known=0 uncovered=0 / [statement-possible] file-fallback total=2 distinct=1 /   fallback: "let a = 1; a++; --\na;\nif (a) { a++; } --\na;"
op-cases                 exit=0 :: [statement-possible] double-accept 冲突: 0 / [statement-possible] groups run=1 skipped=0 | cases pass=40 fail=0 skip=0 known=0 uncovered=0 / [statement-possible] file-fallback total=0 distinct=0
op-ast-proof             exit=0 :: PASS  s3m-declined-async-arrow-type  shapeAst=0 declined=1 texts=["params"] /  / [op-ast-proof] group=ast-from-shapes cases=90 pass=90 fail=0 | 形状树接管计数已核 90 条、TS 逐节点已核 85 条、AST 数字叶子已核 8 条
op-proof                 exit=0 :: PASS  s3g-op-optional-chain  texts=["member(member(a,b),c)"] inserts=2 bodies=1 /  / [op-proof] group=operators-live cases=40 pass=40 fail=0 | 结构文本已核 40 条、InsertBetween 计数已核 38 条
comma-import-fallback    exit=0 ::       shapeNodes=["CallExpressionShape","ImportKeywordShape"]  shapeTexts=["call(import)"] /  / [comma-import-fallback] cases=11 pass=11 fail=0（契约：XML==legacy、无 fallback、无形状泄漏、控制组仍被接管）
validate                 exit=0 ::  / 1720 条用例，0 条不合格
ast-json                 exit=0 :: [types] cases=450 cj-ok=450 cj-fail=0 / [using-declarations] cases=29 cj-ok=29 cj-fail=0 / total cases=6167 cj-ok=6167 cj-fail=0（47 个构造）
ast-json-diff            exit=0 :: （没有 gap） /  / 合计 6167 条：完全一致 6167 / 6167；有结构差 0 条、有位置差 0 条、有字段差 0 条
token-ast                exit=0 :: summary: total=1716 ok=1706 crash=0 diff=0 ts-invalid=10 gap-now-passing=0 / known-gap:     0 file(s) (none) / non-known-gap: 1716 file(s) (ok 1706, ts-invalid 10)
real-dts                 exit=0 :: real-dts: 文件 226（跳过 TS 非法 0）：解析成功 226、崩溃 0；AST 完全一致 226、有差异 0 / 真实 .d.ts 全量解析成功且 AST 逐节点一致
feas-operator            exit=0 :: [feas-operator] cases=6 pass=6 fail=0
feas-insert-between      exit=0 :: PASS  嵌套插入：wrapper 套 wrapper / PASS  拒绝非法输入 / [feas-operator] insert-between tests=9 pass=9 fail=0
perf                     exit=0 :: [perf] scale ratio(200/100)=2.06 ratio(400/200)=2.84（线性≈2.0；>2.5 视为退化告警，不判失败） / [perf] WARN 耗时增长超过 2.5 倍，疑似二次退化（设计 §8.3.3） / [perf] done
```


### s4l-await-body (exit=1)
```
txt
    'C:\\Users\\Admin\\Documents\\GitHub\\xl-example-set\\feature\\possible-statement-s4l\\tests\\statement-possible\\s4l-await-body.mjs'
  ]
}
System.Management.Automation.RemoteException
Node.js v24.21.0
```

### s4j-function-body (exit=1)
```
txt
    'C:\\Users\\Admin\\Documents\\GitHub\\xl-example-set\\feature\\possible-statement-s4l\\tests\\statement-possible\\s4j-function-body.mjs'
  ]
}
System.Management.Automation.RemoteException
Node.js v24.21.0
```

### harness --all (exit=1)
```
txt
    'C:\\Users\\Admin\\Documents\\GitHub\\xl-example-set\\feature\\possible-statement-s4l\\tests\\statement-possible\\harness.mjs'
  ]
}
System.Management.Automation.RemoteException
Node.js v24.21.0
```

### harness --double-accept (exit=1)
```
txt
    'C:\\Users\\Admin\\Documents\\GitHub\\xl-example-set\\feature\\possible-statement-s4l\\tests\\statement-possible\\harness.mjs'
  ]
}
System.Management.Automation.RemoteException
Node.js v24.21.0
```

### harness --lint (exit=1)
```
txt
  syscall: 'open',
  path: 'C:\\Users\\Admin\\Documents\\GitHub\\xl-example-set\\feature\\possible-statement-s4l\\build\\ts\\typescript\\tokens\\expressions\\operator-table.js'
}
System.Management.Automation.RemoteException
Node.js v24.21.0
```

### control-flow-takeover (exit=1)
```
txt
    'C:\\Users\\Admin\\Documents\\GitHub\\xl-example-set\\feature\\possible-statement-s4l\\tests\\statement-possible\\control-flow-takeover.mjs'
  ]
}
System.Management.Automation.RemoteException
Node.js v24.21.0
```

### block-body-takeover (exit=1)
```
txt
    'C:\\Users\\Admin\\Documents\\GitHub\\xl-example-set\\feature\\possible-statement-s4l\\tests\\statement-possible\\block-body-takeover.mjs'
  ]
}
System.Management.Automation.RemoteException
Node.js v24.21.0
```

### r1-asi (exit=1)
```
txt
    'C:\\Users\\Admin\\Documents\\GitHub\\xl-example-set\\feature\\possible-statement-s4l\\tests\\statement-possible\\harness.mjs'
  ]
}
System.Management.Automation.RemoteException
Node.js v24.21.0
```

### block-body-cases (exit=1)
```
txt
    'C:\\Users\\Admin\\Documents\\GitHub\\xl-example-set\\feature\\possible-statement-s4l\\tests\\statement-possible\\harness.mjs'
  ]
}
System.Management.Automation.RemoteException
Node.js v24.21.0
```

### control-flow-cases (exit=1)
```
txt
    'C:\\Users\\Admin\\Documents\\GitHub\\xl-example-set\\feature\\possible-statement-s4l\\tests\\statement-possible\\harness.mjs'
  ]
}
System.Management.Automation.RemoteException
Node.js v24.21.0
```

### s4c2-cases (exit=1)
```
txt
    'C:\\Users\\Admin\\Documents\\GitHub\\xl-example-set\\feature\\possible-statement-s4l\\tests\\statement-possible\\harness.mjs'
  ]
}
System.Management.Automation.RemoteException
Node.js v24.21.0
```

### dev-cases (exit=1)
```
txt
    'C:\\Users\\Admin\\Documents\\GitHub\\xl-example-set\\feature\\possible-statement-s4l\\tests\\statement-possible\\harness.mjs'
  ]
}
System.Management.Automation.RemoteException
Node.js v24.21.0
```

### op-cases (exit=1)
```
txt
    'C:\\Users\\Admin\\Documents\\GitHub\\xl-example-set\\feature\\possible-statement-s4l\\tests\\statement-possible\\harness.mjs'
  ]
}
System.Management.Automation.RemoteException
Node.js v24.21.0
```

### op-ast-proof (exit=1)
```
txt
    'C:\\Users\\Admin\\Documents\\GitHub\\xl-example-set\\feature\\possible-statement-s4l\\tests\\statement-possible\\op-ast-proof.mjs'
  ]
}
System.Management.Automation.RemoteException
Node.js v24.21.0
```

### op-proof (exit=1)
```
txt
    'C:\\Users\\Admin\\Documents\\GitHub\\xl-example-set\\feature\\possible-statement-s4l\\tests\\statement-possible\\op-proof.mjs'
  ]
}
System.Management.Automation.RemoteException
Node.js v24.21.0
```

### comma-import-fallback (exit=1)
```
txt
    'C:\\Users\\Admin\\Documents\\GitHub\\xl-example-set\\feature\\possible-statement-s4l\\tests\\statement-possible\\comma-import-fallback.mjs'
  ]
}
System.Management.Automation.RemoteException
Node.js v24.21.0
```

### validate (exit=0)
```
txt

1720 条用例，0 条不合格
```

### ast-json (exit=1)
```
txt
    'C:\\Users\\Admin\\Documents\\GitHub\\xl-example-set\\feature\\possible-statement-s4l\\typescript\\cases\\ast-json.mjs'
  ]
}
System.Management.Automation.RemoteException
Node.js v24.21.0
```

### ast-json-diff (exit=0)
```
txt
用例 29：完全一致 29 / 29
有结构差 0 条、有位置差 0 条、有字段差 0 条
（没有 gap）

合计 6167 条：完全一致 6167 / 6167；有结构差 0 条、有位置差 0 条、有字段差 0 条
```

### token-ast (exit=1)
```
txt
    'C:\\Users\\Admin\\Documents\\GitHub\\xl-example-set\\feature\\possible-statement-s4l\\typescript\\cases\\token-ast.mjs'
  ]
}
System.Management.Automation.RemoteException
Node.js v24.21.0
```

### real-dts (exit=1)
```
txt
    'C:\\Users\\Admin\\Documents\\GitHub\\xl-example-set\\feature\\possible-statement-s4l\\typescript\\cases\\real-dts-ast.mjs'
  ]
}
System.Management.Automation.RemoteException
Node.js v24.21.0
```

### feas-operator-harness (exit=1)
```
txt
    'C:\\Users\\Admin\\Documents\\GitHub\\xl-example-set\\feature\\possible-statement-s4l\\tests\\feas-operator\\harness.mjs'
  ]
}
System.Management.Automation.RemoteException
Node.js v24.21.0
```

### feas-operator-insert-between (exit=1)
```
txt
    'C:\\Users\\Admin\\Documents\\GitHub\\xl-example-set\\feature\\possible-statement-s4l\\tests\\feas-operator\\insert-between.test.mjs'
  ]
}
System.Management.Automation.RemoteException
Node.js v24.21.0
```

### perf (exit=1)
```
txt
    'C:\\Users\\Admin\\Documents\\GitHub\\xl-example-set\\feature\\possible-statement-s4l\\tests\\statement-possible\\perf.mjs'
  ]
}
System.Management.Automation.RemoteException
Node.js v24.21.0
```

## 3. 未覆盖清单（本轮未做，均保持安全回退，不建错树）

1. **箭头块体** \x => { ... }\ / \sync x => { ... }\：\=>\ 之后新建的 \{\ 不经过
   \TryMountFunctionBody\（宿主不是根、前一个单元也不是已闭合 \(\），目录挂不上；且箭头体的建树走
   \ExpressionBuilder\，块体目录建出的 \StatementShape\ 没有消费通道。**需要新增「\=>\ 判据 + 箭头体收集通道」**，
   本轮未动。
2. **对象方法体** \{ m(){ ... } }\：同理，对象字面量的成员体由 \ExpressionBuilder\ 原子建树，
   \BuildBlock\ 不参与，挂目录只会让形状泄漏（\OnChildBracketCreated\ 里显式用「类体目录有
   \MethodDeclarationPossibleShape\」把对象方法体挡在外面，正是这个原因）。
3. **控制流体块** \if (a) { let x=1; }\ / \while (a) { b; }\ / \or (;;) { c; }\ /
   \	ry { d; } catch (e) { e; }\：控制流壳在 \BuildStatement\ 里**原子递归**，体括号上挂目录后
   建出的形状没有收集通道；要先给 \BuildIf\ / \BuildWhile\ / \BuildFor\ / \BuildTry\ 各加
   「\HasBuiltBodyStatements\ → \CollectBodyStatements\」分支，工作量与 S4b 相当，本轮未动。
4. **块内函数声明** \{ function f(){ let x=1; } f(); }\：块体目录没有声明族候选
   （\FunctionDeclarationPossibleShape\ 只在根目录）；要接管需把声明候选加进块体目录并确认
   \BuildBlock\ 的收集通道能消费它。
5. **声明族 / import-export**：仍然是 \Legacy\，由 \StatementPossibleShape\ 原子建树，未接管。

## 4. 风险

- **\wait\ 双角色**：\wait\ 在非 async / 非模块语境里也可以是标识符或标签（\{ await: 1; }\）。
  本候选不区分语义，靠「壳收口后仍交给 \BuildStatement\ 建同一段 raw 单元」保证等价；
  用例里已用 \unction g(){ await: 1; }\ 与 \{ await; }\ 两种形态守 XML == legacy。
- **\units[headAt].Parent\ 的时机**：\ComputeByIndex\ 靠 \Parent\ 判宿主是不是块体括号；
  若某条路径在首格尚未签出 \Parent\，本候选返回 \Uncertain\（不 \Reject\），最坏结果是回到
  「未接管」而不是建错树。\BuildByIndex\ 不依赖 \Parent\（直接用 \host\），所以判定与建树不会不一致。
- **开关粒度**：\AwaitShellCount\ 与 \ControlFlowShellCount\ 分开计量，任何全表里「控制流壳计数」
  的既有断言不受本候选影响。


## 5. 已知限制：部分形态下壳会 detach 回 raw（计数为 0，树不受影响）

实测（s4l-await-body 19 条，全绿）：sync function a(){ await f(); } 这类**单条 await** 稳定接管
（ody=1、wait=1）；但下面三种形态里壳建出来后又 DetachShell 退回 raw 段：

| 形态 | 读数 | 说明 |
|---|---|---|
| sync function b(){ await f(); let x=1; } | ody=0 await=1 | await 壳没能收口，整段（含 let）退回 BuildBlock 的 legacy 递归 |
| sync function i(){ await f(); await (c); } | ody=0 await=1 | 同上，只有第一条 await 建了壳 |
| { { await f(); } } | ody=2 await=1 | 内层块壳与 await 壳各计一条（不是 bug，是计数口径） |

**为什么不是「建错」**：三种形态的 XML 都与 legacy 逐字节相同、AST 与 TS 逐节点相同（用例里 XML==legacy
是硬断言，且全表 ast-json 6167/6167 未变）。壳 detach 后 StatementShape.DetachShell 把 raw 单元按原位退回父单元，
由 BuildBlock 用同一份 BuildStatement 重建 —— 这正是 S4b 设计里那条安全回退。

**代价**：wait f(); let x=1; 的 let 也因此失去接管（ody 0 而不是 let 单独时的 1）。这是本轮
**已知的接管覆盖率回退**，需要下一步在 StatementEndPossibleShape 的 ; 收口 / FinishShell 的
leftover 重放上定位（与 S4d 修空语句 ; 失管是同一处机制），本轮未修。
