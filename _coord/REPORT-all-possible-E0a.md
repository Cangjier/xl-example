# REPORT-all-possible-E0a — 表达式地基（ShapeOperatorStack / ExpressionShapeCatalog / OperatorShapeMap / 探针工具）

## 0. 身份与环境

| 项 | 值 |
| --- | --- |
| 任务 | `task-5` — WP-E0a：表达式地基（`_coord/PLAN-all-possible.md` §1.3/§1.4/§7） |
| 分支 | `feat/e0a`（只提交本地分支，**未 push origin**） |
| 克隆 | `C:\Users\Admin\Documents\GitHub\xl-example-set\e0a-foundation`（`node_modules` 是指向 canonical 的 junction） |
| base | `base-int` = `_integration/integration/all-possible`，HEAD `42153469`（祖先含 `7c2401b0` 双开关 + 45 条迁移） |
| 检查点 commit | `ee9d9f0b`（`feat(e0a): expression foundation - ...`） |
| 构建产物 | `dist/ts/**`（`xl_build` 默认 out）+ `build/ts/**`（`tsc`），均 gitignored |

**own 文件（只有新增，未改任何既有文件）**

1. `typescript/tokens/expressions/shape-operator-stack.xl.md` — `ShapeOperatorStack`
2. `typescript/tokens/expressions/expression-shape-catalog.xl.md` — `ExpressionShapeCatalog`
3. `typescript/tokens/expressions/operator-shape-map.xl.md` — `OperatorShapeMap`
4. `typescript/cases/tts/tools/expr-probe.mjs` — 逐字符 + EOF shape 树快照（legacy/incremental 双模式）
5. `typescript/cases/tts/tools/diff-report.mjs` — 两份 `--json` 的回归差异闸门
6. 本报告 `_coord/REPORT-all-possible-E0a.md`

**没有碰**：`statement-route-util` / `statement-shape` / `root-expression-statement-possible-shape` /
`expression-catalog-factory` / `variable-declaration-shape` / `direct-*` / `operator-table`（`IsRightAssociative` 已存在，
按 §5.1「若已存在则不加」**未改该文件**）/ `core/**`。`git status` 只有 `??`（新增），零 `M`，所以既有行为逐字节不变。

## 1. 验收读数（可复算）

| # | 命令 | 读数 |
| --- | --- | --- |
| 1 | `xl_build {cwd=<克隆>, paths:["core","typescript"], targets:["ts"]}`（不传 out） | **0 error**，3 warning（`E1107` 三条 `class-|-|get-accessor-possible-shape` 重名，与基线逐条相同，非本 WP 引入）；569 文件 up-to-date + 3 新增 |
| 2 | `node node_modules/typescript/bin/tsc -p .` | **exit 0** |
| 3 | `node typescript/cases/tts/run.mjs` | **PASS 380 / FAIL 0 / 380**；`throw 期望125/实测125 · atomic 202/202 · partial 53/53 · incremental 0/0`；EOF 分类**零漂移**（证据见下） |
| 4 | `node typescript/cases/tts-impl/run.mjs --quiet` | **PASS 45 / FAIL 0 / 45** |
| 5 | `node .../tools/expr-probe.mjs <expr> --eof-only --both --json <f>` × 25 形态 | **25/25** 退出 0 且 JSON 同时含 `legacy,incremental` 两份快照 |
| 6 | `node .../tools/diff-report.mjs a b`（两份相同 JSON） | `380 个 id：一致 380 / 允许 0 / 不允许 0` → **PASS exit 0** |
| 7 | 同上，改一条 record（`atomic/declarations/class-abstract.ts`）后 | `不允许变化 1` → **FAIL exit 1** |
| 8 | 同上 + `--allow atomic/declarations/class-abstract.ts` | `允许变化 1` → **PASS exit 0**（`--help` 也 exit 0） |
| 9 | `node tmp/stack-probe.mjs`（tmp，gitignored，直接 require `build/ts` 产物） | **28 个表达式形态，断言 1307 条，失败 0 条；legacy EOF 结构对照 28/28 通过，exit 0** |

**零漂移的证据链**：本 WP 全部改动是**新增文件**（`git status --porcelain` 只有 `??`，无 `M`），
两个开关默认值也未动（`statement-route-util` 里 `EnableIncrementalShapes = false` 实读），因此 380 条判定的输入
逐字节未变；`diff-report` 的两份 `--json` 逐条相同的读数（380/380）把这一点钉成可复算的数字。

## 2. 实际 API 签名清单（从 `build/ts/**` 实读，form WP 直接照抄）

### 2.1 `ShapeOperatorStack`（`typescript/tokens/expressions/shape-operator-stack.xl.md`）

```ts
class ShapeOperatorStack {
  static ConditionalPrecedence: number = 1;   // 条件帧的栈内优先级（= StatementOperatorBody.CondPrecedence）
  Template: Template;
  Nodes: Token[] = [];                        // 值栈：已完整、还没有运算符来吃的表达式根
  Frames: Token[] = [];                       // 运算符帧：已左右齐全、还在爬升的 Binary/Conditional 节点
  FramePrecs: number[] = [];                  // 与 Frames 同下标
  FramePending: boolean[] = [];               // true = 该帧还在等右操作数
  Open: Token | null = null;                  // 最近入栈、尚未被归约消费的操作数（中间态探针）

  constructor(template: Template);

  Top(): Token | null;                        // 栈顶帧节点（Frames[last]）
  IsPending(): boolean;                       // 栈顶帧是否等右操作数（无帧 = false）
  IsEmpty(): boolean;                         // Frames 与 Nodes 都空
  NodeCount(): number;                        // Nodes.length（Drain 成功前应为 0 或 1）
  Root(): Token | null;                       // 不归约的当前根：Frames[0]（栈底=最外层），否则 Nodes 顶

  PushOperand(shape: Token): void;            // 操作数入栈；栈顶 pending 时立即作为右操作数挂上
  PushOperator(opShape: Token, text: string): void; // 唯一运算符入口：`?`/`:` 分支、Reduce、摘右操作数、建 Binary、Mount、压帧
  AttachRight(shape: Token): void;            // 右侧操作数挂到栈顶节点（Binary 第 3 格 / 条件真·假分支格）
  Reduce(precedence: number, rightAssoc: boolean): Token | null; // 爬升归约；返最后一个被归约节点
  Drain(): Token | null;                      // 收口到唯一根；残留 = throw
}
```

内部辅助（form WP 不直接调）：`StartConditional(question)`、`CloseConditional(colon)`、`NextLeft(text)`、
`ReduceTop()`、`Mount(node,left,leftHost,operator,operatorHost)`、`MoveInto(node,shape)`、
`PosOf(shape)`、`CheckOperatorPos(operator,previous,text)`、`Seal(node)`。

### 2.2 `OperatorShapeMap`（`typescript/tokens/expressions/operator-shape-map.xl.md`）

```ts
class OperatorShapeMap {
  static KindBinary / KindAssignment / KindPrefix / KindPostfix / KindUpdate
       / KindConditionalQuestion / KindConditionalColon / KindTypeAssert: string;
  static PositionBinary / PositionPrefix / PositionPostfix / PositionTypeAssert: string;

  static KindOf(text: string): string;             // 类别；不是运算符 = ""
  static IsOperator(text: string): boolean;
  static IsBinary(text: string): boolean;          // 只读 OperatorTable.IsBinaryOperator（含 in / instanceof）
  static IsAssignment(text: string): boolean;
  static IsPrefix(text: string): boolean;
  static IsPostfix(text: string): boolean;         // 仅 ++ / --
  static IsConditional(text: string): boolean;     // ? 或 :
  static IsTypeAssert(text: string): boolean;      // as / satisfies
  static PrecedenceOf(text: string): number;       // 赋值 → 0，其余 OperatorTable.Precedence；非二元 -1
  static IsRightAssociative(text: string): boolean;// OperatorTable.AssociationOf === "right"（** 与全部赋值）

  // 唯一分支点：text × position → 形状实例
  static Create(text: string, position: string, template: Template,
                start: number, end: number, context: SyntaxContext | null): Token;
}
```

`Create` 的四类语义（**deliberately 不统一**，legacy EOF 树实测决定）：

| position | 返回 | 签名/关闭 | `Pos` |
| --- | --- | --- | --- |
| `PositionBinary` | 运算符**形状**（`AsteriskTokenShape` / `FirstBinaryOperatorShape` / `InKeywordShape` / `EqualsTokenShape` / `QuestionTokenShape` …） | `start>=0` 签入、`end>=0` 签出，`context!=null` 再 `TryToClose` | 不赋（归约栈按 C1 赋左操作数 `EndIndex`） |
| `PositionPrefix` | 表达式**节点**（`PrefixUnaryExpressionShape` / `TypeOfExpressionShape` / `VoidExpressionShape` / `DeleteExpressionShape`） | 不签、不关（范围 = 运算符起点 ~ 操作数终点，调用方签） | 调用方赋 |
| `PositionPostfix` | `PostfixUnaryExpressionShape` | 不签、不关（范围从**操作数**起点起） | 调用方赋 |
| `PositionTypeAssert` | `AsExpressionShape` / `SatisfiesExpressionShape` | 不签、不关（范围从表达式起点起） | 调用方赋 |

`<` 特殊：legacy 对二元 `<` 用 `FirstBinaryOperatorShape`（`a<b` / `a<b&&c>d` 实测），不是 `LessThanTokenShape`——
`Create` 照抄该口径（类名即账本 identity）。

### 2.3 `ExpressionShapeCatalog`（`typescript/tokens/expressions/expression-shape-catalog.xl.md`）

```ts
class ExpressionShapeCatalog {
  static CreatePrimary(): PossibleShape[];              // [new NumericLiteralPossibleShape()]
  static CreateOperators(): PossibleShape[];            // [new BinaryExpressionPossibleShape(), ...AppendFragments]
  static CreateStatement(): PossibleShape[];            // CreatePrimary() + CreateOperators()（B2 用）
  static CreateDeclarationInitializer(): PossibleShape[]; // 同装配（E0b 用）
  static AppendFragments(shapes: PossibleShape[]): void;  // 注册区 `// [E-CAT:FRAGMENTS]`
}
```

- 每次调用返回**新实例**；`endPossible` 不在目录里（宿主传）。
- **注册区只在 `CreateOperators` 调一次**，`CreateStatement` / `CreateDeclarationInitializer` 转调组合，
  所以片段只出现一次、不会在同一个 `CatalogGuide` 里重复占两个 `Candidates` 下标。

## 3. 归约不变量自测读数（§7.3 六条）

`tmp/stack-probe.mjs`（gitignored）用 `ShapeOperatorStack` + `OperatorShapeMap` 合成 28 个表达式形态的树，
逐节点断言 1307 条，**失败 0**；同时用交付的 `expr-probe.mjs` 取同一表达式 legacy EOF 树，按
「非 basic 节点类名 + 相对深度」逐条比对，**28/28 一致**。

| §7.3 不变量 | 断言内容（1307 条里的一部分） | 读数 |
| --- | --- | --- |
| 1. Binary 左右操作数挂进 `Data`、`Parent` 正确 | 每个 `BinaryExpressionShape`：`Data.length===3`、三子 `Parent===node`、无重复节点、每个子 `src` 两端已签 | 全部通过（28 形态） |
| 2. 新运算符更紧：先 Reduce，再在**右操作数位置**建新 Binary | `a+b*c` → `Binary(+)[a, +, Binary(*)[b,*,c]]`（结构对照 28/28 含此形态） | 通过 |
| 3. 同优先级左结合先归约；右结合不先归约 | `a-b-c` → `(a-b)-c`；`a**b**c` / `a=b=c` → `a**(b**c)` / `a=(b=c)`；另有 `a*b/c`、`a<<b>>c`、`a>=b!==c`、`a|b^c&d` | 通过 |
| 4. 归约产出的 Binary 原位替换「左操作数 + 运算符」两格 | `Mount`：摘运算符格 → 摘左操作数格 → Binary 插回左格；`a+b*c` 的 `*` 把 `b` 摘成左操作数并挂回 `+` 的右格 | 通过 |
| 5. `Pos` / `src`（C1） | 每个 Binary：`node.Pos===left.Pos`、`node.src.Start===left.src.Start`、`node.src.End===right.src.End`、`operator.Pos===left.src.End`；Conditional 同口径（`?` 的 Pos = 条件 End、`:` 的 Pos = 真分支 End、src 终点 = 假分支 End） | 全部通过（逐节点断言） |
| 6. `Drain` 后无残留；残留 = 显式 throw | `a+` → `Drain` 抛「归约时栈顶运算符缺少右操作数」；`a b` → 抛「归约后残留 2 个操作数」；`a+*b` → 抛「缺少右操作数」；正常形态 `Drain` 后 `Frames.length===0 && Nodes.length===1` | 4 条 throw 用例全通过 |

补充：结构对照覆盖 `1*2+3`、`a+b*c`、`a-b-c`、`a**b**c`、`a<b&&c>d`、`(a+b)*c`、`-a+b`、`a=b=c`、`a?b:c`、
`a?b:c?d:e`、`a?b+c:d`、`a?b:c+d`、`a&&b?c:d`、`a=b?c:d`、`a?b:c?d:e?f:g`、`a&&b||c`、`a||b&&c`、`a|b^c&d`、
`a+b-c`、`a*b/c`、`a<<b>>c`、`a>=b!==c`、`a??b`、`a + b * c - d`（含 trivia/空格）、`(a?b:c)+d`、`a+b**c`、
`a=b+c*d`、`(a+b)*(c+d)`。

## 4. `StatementOperatorBody` 复用性结论（实现前先评估，二选一）

**结论：搬算法、不搬类。** `ShapeOperatorStack` 的爬升 / 归约部分**照搬** `StatementOperatorBody` 的已验证算法，
但不实例化 / 不继承 `StatementOperatorBody`，也不复用它的 `StatementOperandShape` 表示。

依据（逐项实读 `statement-operator-body.xl.md`）：

1. **同构的部分（直接搬）**：`Frames` / `FramePrecs` / `FramePending` 三平行数组 + while 爬升条件
   `!pending && prec !== CondPrecedence && (topPrec > prec || (topPrec === prec && !rightAssoc))`
   （`PushOperator` :952-978），条件表达式 `CondPrecedence = 1` 且不进 Reduce（`StartConditional`/`CloseConditional`
   :980-1034），`CompleteTop` = 出栈（:1054-1060）。这些正是「优先级爬升」的全部判据，已验证过 90% 表达式形态。
2. **不能搬的部分（表示层）**：它的帧是 `StatementOperandShape`（`Kind` 判型、`Text()`/`Render` 拼字符串、
   操作数通过 `ShapeInsertUtil.InsertBetween(parent, child, wrapper)` 嵌进运算符节点、`Data` 顺序是
   `[left, right]` 式嵌套）；它**从不设 `Pos`/`SourceRange`**，也**从不把形状挂进可见 `Data`**（这正是账本判 atomic
   的根因，§1.3）。而 E-base 的节点必须是 legacy 类名 `BinaryExpressionShape`（`Data=[左,运算符,右]`、
   `Pos`/`src` 按 C1）、`ConditionalExpressionShape`（`Data=[条件,?,真,:,假]`），且要**当场原位替换**进宿主可见树。
3. **语义缺口**：它没有 `Reduce` / `AttachRight` / `Drain` 这组形状级 API，也没有「残留即 throw」（C10）；
   它的 `CompleteTop` 只出栈，错误用 `Fail(...)` 记在 `Incomplete` 上、由 legacy 兜底——E-base 不许兜底。
4. **成本对比**：改造它 = 重写它的帧表示 + 补 Pos/src + 补可见挂载 + 补 throw，且会与 S3c 的 AST 桥共用同一个类，
   风险高于照搬算法（约 80 行）新写一个类。

所以：**算法（爬升循环 + 三数组 + CondPrecedence 口径）复用，类与形状表示不复用**；`shape-operator-stack.xl.md`
类头注释里写明了同一结论与逐项差异，避免后来者误以为可以合并。

## 5. 注册区 / 文件命名 / 接入示例

### 5.1 注册区（§5.1 的锚点）

`typescript/tokens/expressions/expression-shape-catalog.xl.md` 文件末尾的
`ExpressionShapeCatalog.AppendFragments` 方法体里：

```ts
// [E-CAT:FRAGMENTS] 以下是各形态片段，每行一个，按 WP id 排序（form WP 只在本行之后追加，不重排）：
```

form WP 只追加行（**一行一个片段、按 WP id 排序**）：

```ts
  TemplateLiteralPossibleShape.AppendTo(shapes); // [A3]
```

`AppendTo(shapes)` 自己 `shapes.push(new XxxPossibleShape())`（只追加自己那一个候选、新实例）。

### 5.2 新文件命名（§5.2，form WP 照此建文件）

```text
typescript/tokens/expressions/forms/<类别>/<形态>-possible-shape.xl.md   # 候选
typescript/tokens/expressions/forms/<类别>/<形态>-shape.xl.md            # legacy 没有可复用形状类时才建
typescript/tokens/expressions/forms/shared/<判据>.xl.md                  # 跨形态共享判据（E0a 拥有，form WP 只读）
```

一个文件一个形态；形状类名**必须与 legacy 一致**（账本按 `(类名,pos)` 判等）。

### 5.3 接入示例

**B2（裸表达式语句，`root-expression-statement-possible-shape.xl.md`，`// [E-STMT:CATALOG]`）**

```ts
shell.CatalogGuide = new CatalogGuide(ExpressionShapeCatalog.CreateStatement(), endShape);
```

**E0b（声明初始化器，`variable-declaration-shape.xl.md`）**

```ts
const catalog = new CatalogGuide(ExpressionShapeCatalog.CreateDeclarationInitializer(), this.EndPossible);
```

**form 候选的 `BuildByIndex`（只造形状，归约交给栈）**

```ts
const shape = OperatorShapeMap.Create(text, OperatorShapeMap.PositionBinary, host.Template, start, end, context);
shape.Replace(token);              // 或 host.Add(...)，按该 form 的既有惯用法
host.MountedUnit = shape;          // 需要「下一格进它」时
stack.PushOperator(shape as ShapeToken, text);   // 不要自己写优先级表
```

操作数候选同理：造好操作数形状并挂进宿主后 `stack.PushOperand(shape)`；栈顶 pending 时它会挂成右操作数。

**收口（宿主终结候选 / B6）**：`const root = stack.Drain();`（残留 = throw，不要 catch 后回退 legacy）。

## 6. 给并行 form agent 的 API 摘要（≤30 行）

```text
1) 运算符文本 → 形状：只用 OperatorShapeMap.Create(text, position, template, start, end, context)。
   position ∈ PositionBinary(二元/赋值/条件 ? :，返回运算符形状，已签入/签出)
            | PositionPrefix(前缀，返回表达式节点，未签；调用方 SignIn/SignOut + 赋 Pos)
            | PositionPostfix(后缀，同上) | PositionTypeAssert(as/satisfies，同上)。
   类别判定用 KindOf / IsBinary / IsAssignment / IsPrefix / IsPostfix / IsConditional / IsTypeAssert；
   优先级只读 PrecedenceOf / OperatorTable；结合性用 IsRightAssociative（= AssociationOf==="right"，覆盖 ** 与赋值）。
2) 归约：只调 ShapeOperatorStack，禁止自己写优先级表 / 自己 splice 兄弟节点。
   PushOperand(操作数形状) | PushOperator(运算符形状, text) | AttachRight(右操作数) | Drain() → 根。
   `?` / `:` 也走 PushOperator（栈内部分派 Start/CloseConditional）；条件表达式节点由栈建，不归 form 管。
3) `ShapeOperatorStack.Root()` 可在每个字符后取当前根（中间态物化）；Open 是最右未消费操作数；
   Frames/FramePrecs/FramePending 是栈内状态，form 不要直接改。
4) 顺序：建形状 → 挂进宿主(Replace/Add) → PushOperand/PushOperator；形状的 Pos 交给栈按 C1 补
   （运算符 Pos = 左操作数 EndIndex；栈会校验，错了直接 throw）。
5) 执行器：Drain 时残留运算符/操作数 = 显式 throw（C10），不要 catch 后静默回退。
6) 目录：ExpressionShapeCatalog.CreateStatement() / CreateDeclarationInitializer() 已是
   primary+operators+注册区片段；片段只加在 AppendFragments 的锚点之后（一行一个，按 WP id 排序）。
7) 探针：node typescript/cases/tts/tools/expr-probe.mjs --eof-only --both -- "<源码>"
   看逐字符/EOF 树（basic 行也在，适合和 legacy 逐字符 diff）。
8) 回归：node .../tools/diff-report.mjs base.json new.json --allow <你的 id>，只允许自己 id 分类变化。
9) 形状类名必须与 legacy 一致；`<` 是 FirstBinaryOperatorShape；前缀/后缀/as/satisfies 在 legacy 树里
   没有运算符子节点，别挂 *TokenShape。
```

## 7. 风险与未竟项

1. **`CheckOperatorPos` 是强校验**（运算符 Pos 必须 = 左操作数 EndIndex，错即 throw）：C1 正确，但若某个 form 的
   左操作数 `SourceRange.End` 尚未签出（中间态），检查会跳过；若某 form 自己先赋了不一致的 Pos 会当场炸——
   这是有意的「早失败」，接线时按报错改 form，不要放宽栈。
2. **条件表达式 `?:` 已实现但只在自测里验证**：`a?b:c` 系列结构对照通过；接线时 `?`/`:` 必须走
   `PushOperator`，且 `:` 之前真分支内的二元帧会被 `CloseConditional` 收掉。
3. **前缀 / 后缀 / update / `as`·`satisfies` 只到「形状分支」层**：`OperatorShapeMap` 返回节点实例（未签范围、未挂操作数），
   form 候选要自己 `SignIn/SignOut/Add/Pos`。这四类的结构规则（legacy 只有节点、没有运算符子节点）写进了类头注释。
4. **栈不负责：调用/成员/下标/new/箭头/模板/括号外提升**——这些是 form 候选自己的节点（`CallExpressionShape` 等），
   栈只做「二元/赋值/条件 + 操作数/右操作数/收口」。`(a+b)*c` 的括号由 form 候选（`ParenthesizedExpressionShape`）提供，
   栈只把它当操作数。
5. **`operator-table.IsRightAssociative` 只覆盖 `**`**（既有实现，未改）：赋值右结合在 `AssociationOf` 里；
   `ShapeOperatorStack` 与 `OperatorShapeMap` 都用 `AssociationOf`。若后续有人扩展 `IsRightAssociative`，需同步检查两处。
6. **`expr-probe` 的选项解析**：源码以 `-` 开头时必须用 `--` 分隔（如 `-a+b;`），已在用法里说明；
   `--both` 会跑两遍完整驱动，形态多时按需只跑 `--legacy` / `--incremental`。
7. **未 push、未跑既有 gates**（按纪律：不跑 gates/samples/coverage/ast:*）；`tmp/stack-probe.mjs`、
   `tmp/*.json` 是 gitignored 证据，复算命令：`node tmp/stack-probe.mjs`。
8. **后续建议**：E0b/B2 接线后先用 `expr-probe` 对 20+ 形态做 legacy/incremental 逐字符 diff，再用
   `diff-report` 做全量 380 条回归；form WP 的验收同一条 `--allow` 口径。
