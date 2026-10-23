# DTS-PERF：源码层优化清单（调研轮）

> 状态：研究稿，**不含任何业务源码改动**。所有条目都是「可执行改动提案」，core 改动需用户批准后才能落地。
> 计量口径与 `tests/bench/parse-perf.mjs` 的 `--dts` 档一致：`SourceFileRunner.Parse(text, filePath)`，
> 即「字符流 → 形状树」，**不含 AST 投影**。

---

## 1. 方法

### 1.1 读了哪些代码

| 段 | 文件 |
| --- | --- |
| 字符主循环 | `core/syntax/unit-token.xl.md`（`Process` 88-135）、`core/syntax/token.xl.md`（`Add` 135-143、`SignIn` 178-188、`SignOut` 201-229、`TryToClose` 111-122）、`core/syntax/block-token.xl.md`（`Process` 89-102、`AppendAndSignOut` 51-62、`Undo` 104-125） |
| 队列/上下文 | `core/syntax/syntax-context.xl.md`（`Process` 108-123、`ProcessSingle` 125-132、`DrainQueue` 143-156、`DrainMessages` 164-184）、`core/syntax/process-source.xl.md`、`core/syntax/shape-token.xl.md` |
| 每字符分发 | `core/syntax/templates/template.xl.md`（`BasicBranchQueue` 99-129）、`core/syntax/basic-tokens/{common,symbol,wrap-symbol,bracket,area-annotation,line-annotation,regex-token}.xl.md`、`core/syntax/basic-tokens/string/string-guide.xl.md` |
| 源文档访问 | `core/syntax/document.xl.md`（`At` 51-59）、`core/syntax/source.xl.md`（`Value` 41-54、`Pre` 66-89）、`core/syntax/source-range.xl.md`、`typescript/run/text-document.xl.md` |
| 候选/目录 | `core/syntax/catalog-guide.xl.md`（`ComputePossibleShapesByIndex` 61-121）、`core/syntax/possible-shape.xl.md`、`core/syntax/possible-shape-cache.xl.md`、`typescript/tokens/files/source-file-shape.xl.md`、`typescript/tokens/files/source-file-end-possible-shape.xl.md` |
| 建造层 | `typescript/tokens/item-util.xl.md`、`typescript/tokens/types/type-builder.xl.md`（`Load` 153-197）、`typescript/tokens/statements/statement-builder.xl.md`（`Load` 97-116、`BuildExpressionRange` 180-199）、`typescript/tokens/expressions/expression-builder.xl.md`（`Load` 151） |
| 运行入口 | `typescript/run/source-file-runner.xl.md`（`Parse` 26-38）、`tests/bench/parse-perf.mjs` |

### 1.2 怎么取证（两份探针，都在 `tests/bench/`，不改业务源码）

1. `tests/bench/dts-cost-probe.mjs --count`：require `build/ts` 后**包装原型方法**做调用计数（不写源码），
   给出「每字符/每 token 调用几次」；`--micro` 给出单次操作成本（ns）。
2. `tests/bench/dts-ab.mjs`：把 `build/ts` 复制成 `build/ts-exp`，在**副本**上打一个最小补丁
   （注释整段预扫描 + 驱动层跳读），A/B 同进程交替计时，并用「形状树逐节点摘要」
   （`构造器名[StartIndex,EndIndex]` + 每个 `Tmp` 文本，lib.dom 摘要长 3,771,589 字符）证明结构等价。

命令（在 `dts-survey` 克隆里，`node_modules` / `build` 已镜像）：

```powershell
node tests/bench/parse-perf.mjs --dts 8 --repeat 3
node tests/bench/dts-cost-probe.mjs --count --files 1
node tests/bench/dts-cost-probe.mjs --micro
node tests/bench/dts-ab.mjs
```

### 1.3 基线（本机，node v24.21.0，repeat=3，warmup=1）

```
lib.dom.d.ts                     2349483 B   stmts=2805   median 1104.4 ms   (54% 的总时间)
lib.webworker.d.ts                787076 B   stmts=1149   median  404.3 ms
typescript.d.ts                   588452 B   stmts=   2   median  388.9 ms
lib.es5.d.ts                      218972 B   stmts= 147   median   88.4 ms
lib.es2023.array.d.ts              40197 B   stmts=  13   median   13.6 ms
lib.es2020.bigint.d.ts             38258 B   stmts=  12   median   14.2 ms
lib.es2015.core.d.ts               22824 B   stmts=  21   median    8.1 ms
lib.es2015.symbol.wellknown.d.ts   10971 B   stmts=  33   median    5.3 ms
TOTAL median 2027.1 ms
```

### 1.4 每字符成本（lib.dom，2,349,323 字符，计数为**稳定测量值**）

| 计数项 | 次数 | 每字符 | 含义 |
| --- | ---: | ---: | --- |
| `UnitToken.Process` | 8,074,274 | **3.44** | 每字符平均穿越 3.44 层单元调度（try/catch + MountedUnit 递归） |
| `Document.At` | 7,202,876 | **3.07** | 每字符新建 3.07 个 `Source` 对象 |
| `ProcessSource.Process` | 2,361,684 | 1.005 | 每字符一条队列条目（含 ~1.2 万次 Reload 重放） |
| `SyntaxContext.DrainMessages` | 2,361,684 | 1.005 | 每字符空转一次消息队列 |
| `AreaAnnotation.Default` | 1,542,377 | **0.657** | 65.7% 的字符在「区域注释正文」里逐字符走 `Tmp +=` |
| 10 个 basic `Transit` | 各 ~785,000 | 0.334 × 10 | 代码字符每字符跑满 10 个跳转 |
| `Token.Add` | 313,490 | 0.133 | 全文件 31.3 万个 token（**7.5 字符/token**） |
| `Token.TryToClose` | 298,222 | 0.127 | |
| `PossibleShapeCache.GetState` | 293,815 | 0.125 | 每次都用 `this.constructor.name` 做 Map 键 |
| `CatalogGuide.ComputePossibleShapesByIndex` | 69,267 | 0.029 | 每次遍历 `Candidates:Set<int>` |
| `PropertySignature/MethodSignature.ComputeByIndex` | 41,697 / 41,380 | 0.018 | d.ts 的成员候选是判定的主体 |
| `WhichUnitRangeContains` / `IsInRange` | 43,140 / 30,821 | 0.018 / 0.013 | |

**注释字符占比（正则统计原文，含 `/* */` 与 `//`）**：
`lib.dom` 区块 66.4% + 行 16.2% = **82.6%**；`lib.es5` 71.4% + 0.4%；`lib.es2015.core` 74.3% + 0.2%。

### 1.5 单次操作成本（`--micro`，2,000,000 次取均值）

| 操作 | ns/次 |
| --- | ---: |
| `new Source(doc, i)` | 20.6 |
| `doc.GetValue(i)`（`content[i]`） | 8.8 |
| `s.Value`（getter + GetValue） | 7.7 |
| 队列 `push` + `splice(0,1)` | **50.2** |
| `cache.GetState(this.constructor.name)` | **38.8** |
| `obj[Symbol]` 直接取 | 4.5 |
| `this.constructor.name` 单次 | 24.1 |
| `Tmp += 单字符` | 14.9 |

### 1.6 收益估算方式

`收益 ≈ profile 份额 × 可消除比例`，全部用上面的**实测计数 × 实测单次成本**落地成 ms；
能直接 A/B 的（注释跳过）给出实测值而不是估算。凡标「估算」的都写了算式。

### 1.7 已实测的 A/B 结论（P01 的证据）

| 文件 | 基线 | 实验 | Δ | 结构摘要 |
| --- | ---: | ---: | ---: | --- |
| lib.dom.d.ts | 1101.2 ms | 947.7 ms | **−13.9%** | 完全相同 |
| lib.es5.d.ts | 105.3 ms | 59.7 ms | **−43.3%** | 完全相同 |
| lib.es2015.core.d.ts | 8.9 ms | 5.6 ms | −37.1% | 完全相同 |

---

## 2. 优化清单

排序 = 预期收益 × 风险 × 改动面（收益大的在前；同收益时改动面小的在前）。
「必须改 core」= 需要用户批准的 core 改动；本轮只研究，不落地。

---

### P01 注释整段预扫描 + 驱动层跳读（**最大单项**）

- **位置**：`core/syntax/basic-tokens/area-annotation.xl.md:101-155`（`Default` 105-107、`ExitOrPre` 109-123、`Transit` 134-155）；`core/syntax/syntax-context.xl.md:108-123`（`Process` 的逐字符 `for`）
- **现状机制**：`AreaAnnotation.Transit` 认出 `/*` 后 `unit.MountedUnit = mounted`（:150-153），此后**父单元把每个字符直接转给注释单元**；注释单元 `Default` 每字符 `this.Tmp += source.Value`（:105-107），直到 `ExitOrPre` 看到 `*/`（:113-121）。驱动层仍按 `i++` 逐字符喂。
- **为什么贵**：`lib.dom` 有 **154 万**字符（65.7%）在注释正文里，每个字符要付：`Document.At`（20.6ns，新建 `Source`）+ `ProcessSource` 入队/出队（50.2ns）+ `UnitToken.Process` 一帧（try/catch）+ `Tmp +=`（14.9ns）≈ **100-150ns/字符**。
- **改法**（已在副本上验证，约 40 行）：
  1. `SyntaxContext` 增加 `SkipTo:int = -1`，`Process` 循环开头 `if (this.SkipTo > i) { i = this.SkipTo - 1; continue; }`；
  2. `AreaAnnotation` 覆写 `Process`：首个正文字符到来时，从 `Document` 的原文里 `indexOf("*/", i)`，命中就一次算出 `Tmp = raw.substring(i, close)`、`SourceRange.End = doc.At(close - 1)`，然后 `TryToClose` + `Quit`，并 `context.SkipTo = close + 2`；未命中或文档不支持原文访问时落回 `super.Process`。
  3. 需要 `Document` 提供一个可选的原文访问口（`GetRaw`/`Content`）——`TextDocument` 已有 `Content`（`typescript/run/text-document.xl.md:19-56`），core 侧只加一个可空接口即可。
- **预期收益**：实测 **lib.dom −154 ms（−13.9%）、lib.es5 −45.6 ms（−43.3%）、es2015.core −3.3 ms**；按注释占比外推 8 份合计 **−250 ~ −350 ms（−12 ~ −17%）**。
- **成本/风险**：中。风险点三处：`Tmp` 的 `HasBackslash` 语义（`block-token.xl.md:24-31`，注释不走 `AppendAndSignOut`，不受影响）；`Reload` 与 `SkipTo` 的交互（跳读只发生在「注释已整段确定」之后，不再有候选判定）；未闭合注释必须落回逐字符（EOF 边界）。
- **不变量**：形状树逐节点 `构造器名[Start,End]` + `Tmp` 文本完全一致（已用 3,771,589 字符摘要验证）；`SourceRange`、`Pos`、XML、AST 投影、错误消息、7 项门禁全绿。
- **必须改 core**：是（`SyntaxContext` + `AreaAnnotation`）。
- **验证**：`dts-ab.mjs`（已有）→ `parse-perf.mjs --dts 8` 同会话 A/B → `tests/gates/run.mjs`。

---

### P02 行注释同样整段预扫描

- **位置**：`core/syntax/basic-tokens/line-annotation.xl.md:50-175`（`Tmp` 50-52、`Default` 111-114、`Close` 91-109）、`core/syntax/syntax-context.xl.md:108-123`
- **现状机制**：与 P01 同构，只是终止符是行终止符（`Template.LineTerminatorChars`，`templates/template.xl.md:74-89`），没有 `ExitOrPre`，行尾由「遇到非本注释字符」触发关闭。
- **为什么贵**：`lib.dom` 有 **16.2%**（38 万）字符是行注释；P01 的实验没有覆盖它（只改了 `AreaAnnotation`），所以 `lib.dom` 的 −13.9% 里**不含**这部分。
- **改法**：同 P01：`indexOf("\n")` 一次切片，`SkipTo = 行终止符下标`（行终止符本身仍交给根单元当 trivia 处理，保持 `WrapSymbol` 的行为）。
- **预期收益**：估算 `lib.dom` −35 ~ −55 ms（−3 ~ −5%）；`typescript.d.ts` / `lib.webworker` 同比例。**与 P01 叠加后注释类字符 100% 覆盖**。
- **成本/风险**：低（与 P01 共用同一套 `SkipTo`）；CRLF 要按 `\r` 先断（模板 74-81 已有约定）。
- **不变量**：同上；行注释 `Tmp` 不含行终止符。
- **必须改 core**：是（与 P01 同一批）。
- **验证**：同 P01。

---

### P03 驱动层去分配：`ProcessSource` + 队列 + 每字符 `At`

- **位置**：`core/syntax/syntax-context.xl.md:125-132`（`ProcessSingle` 每字符 `new ProcessSource` + `push` + `DrainQueue`）、`:143-156`（`DrainQueue` 的 `splice(0,1)`）、`core/syntax/process-source.xl.md:28-43`
- **现状机制**：每个字符都 `push(new ProcessSource(root, documents.At(i)))`，然后 `while` 取 `[0]` 再 `splice(0, 1)`。
- **为什么贵**：`lib.dom` 236 万字符 → 236 万个 `ProcessSource` + 236 万次 `splice`；micro 实测 `push + splice(0,1)` = **50.2 ns**，合计 **118 ms**；再加每字符一次的 `At`（外层已经拿了 `Source`，`ProcessSingle` 又包一层）。
- **改法**（保持可重入语义）：
  ```ts
  // 快路径：队列为空时直接处理，不进队列
  ProcessSingle(item) {
    if (this.SourceQueue.length === 0) {
      this.Root.Process(this, item);   // 原有 ProcessSource.Process 就是这一句
      this.DrainMessages();
      return;
    }
    this.SourceQueue.push(new ProcessSource(this.Root, item));
    this.DrainQueue();
  }
  // DrainQueue 改成头指针，避免每字符一次 splice
  DrainQueue() {
    let head = 0;
    while (head < this.SourceQueue.length) {
      const item = this.SourceQueue[head++];
      item.Process(this);
      this.DrainMessages();
      if (this.SourceQueue.length === 0) break;
      // 只有 Reload 插队首时，才把剩余元素搬回前面（罕见）
      if (head > 0 && head === this.SourceQueue.length) break;
    }
    this.SourceQueue.length = 0;
  }
  ```
  （`ReloadMessage` 会 `splice(0, 0, …)` 插队首，所以头指针版本要么在插入时回退 `head`，要么在插入后把已消费前缀 `shift` 掉——两种都可以，插入是 O(控制结构数) 的罕见事件。）
- **预期收益**：直接省掉 50.2 ns/字符 → **~118 ms（lib.dom −10%）**；再加 `ProcessSource` 对象分配的 GC 压力。
- **成本/风险**：中低。风险在于「处理过程中新位置进队列」的语义（`DrainQueue` 的注释 :147 明确说要 `while`）——头指针版必须保证插入后仍从队首消费，`Reload` 的 12k 次重放是唯一会走慢路径的场景。
- **不变量**：`SourceQueue` 的 **LIFO 队首语义**（`ReloadMessage` 插队首）；处理顺序完全一致；形状树摘要一致；门禁全绿。
- **必须改 core**：是。
- **验证**：`dts-ab.mjs` 加一组「P03 only」副本；再跑 `parse-perf` 确认总时间；并用计数探针确认 `ProcessSource.Process` 计数不变（2,361,684）。

---

### P04 `Transit` 按首字符分派（10 → 2~3）

- **位置**：`core/syntax/templates/template.xl.md:99-129`（`BasicBranchQueue` 的 10 个函数）；各 `Transit` 入口：`area-annotation.xl.md:134-138`、`line-annotation.xl.md`（`Transit`）、`regex-token.xl.md:170-182`、`bracket.xl.md:146-150`、`wrap-symbol.xl.md:67-78`、`symbol.xl.md:146-171`、`common.xl.md:624-668`
- **现状机制**：`UnitToken.Process` 的 `for (const item of this.ProcessQueue.Data)`（`unit-token.xl.md:114-127`）**无条件依次调用 10 个 Transit**，每个 Transit 自己先判字符。
- **为什么贵**：`lib.dom` 代码字符 78.5 万，**每个字符 10 次调用 = 785 万次**（计数表每项 ~785k）；每次 Transit 还要 `source.Value`（7.7ns）+ 多数要 `source.Pre()`（另建一个 `Source`）+ `unit.Last()`。
- **改法**：模板层建一张**首字符分派表**（拉丁字符 128 项数组，其余落 `other`）：
  ```ts
  // Template: class SymbolClass = 0..N（空白 / 引号 / 斜杠 / 开括号 / 符号 / 其他）
  static BasicBranchTable: Array<Array<BranchTransiter>>   // 128 项 + other
  ```
  分派时只跑「该字符类可能接手」的 transit（例如空白 → `WrapSymbol`；`"`/`'`/`` ` `` → `StringGuide`；`(`/`{`/`[` → `Bracket`；字母数字 → `Common`；`/` → `Area/Line/Regex/Symbol`；其余符号 → `Symbol`）。
  这需要先把「字符一次分类」做成 `SymbolTemplate.ClassOf(value)`（见 P13），否则分派表自身就要重新分类。
- **预期收益**：调用数从 785 万降到约 220 万 → 省 560 万 × ~25 ns ≈ **140 ms（lib.dom −12%）**。
- **成本/风险**：中。**必须保持「先收掉非结构字符、再让结构字符认领」的顺序**（`template.xl.md:99-111` 的裁定），且 `StringGuide` 必须在 `Symbol` 前、`WrapSymbol` 在 `Symbol`/`Common` 前、`Symbol` 在 `Common` 前；分派表只是把「不可能的」提前排除，不改变顺序。另 `Common.IsInUnicodeBraceEscape`（`common.xl.md:207-225`）会让 `{`/`}`/十六进制位让位——`other` 桶必须仍包含这些。
- **不变量**：每个字符最终由**同一个** Transit 认领；`Transit` 的调用顺序在同类内不变；形状树摘要一致。
- **必须改 core**：是（`Template` + `UnitToken.Process`）。
- **验证**：计数探针里 `static:*.Transit` 的计数和必须与基线**逐字符一一对应**（先证明「认领者不变」，再比时间）。

---

### P05 去掉 `Source.Pre()` 里的 `GetCount()` 与重复 `At`

- **位置**：`core/syntax/source.xl.md:66-89`（`Pre`：`skip.length === 0` 分支里 **两次** `this.Document.GetCount()`，每次都是闭包调用）、各 Transit 的 `source.Pre()`（`area-annotation.xl.md:141`、`symbol.xl.md:165`、`regex-token.xl.md:181`、`bracket.xl.md` 等）
- **现状机制**：`Pre()` 无参时判越界用 `Index - 1 < 0 || Index - 1 >= GetCount()`，`GetCount` 是 `() => content.length` 的闭包字段。
- **为什么贵**：越界上界可以省：`Source` 的 `Index` 只由 `Document.At` 产生，`At` 的调用方保证 `0 <= index < count`（`syntax-context.xl.md:112` 的注释也说明 `At` 每次新建）。保留 `Index - 1 < 0` 就够，`GetCount` 两次调用可删。`lib.dom` 里 `Pre()` 被调 ~157 万次。
- **改法**：
  ```ts
  if (skip.length === 0) {
    if (this.Index - 1 < 0) return null;
    return this.Document.At(this.Index - 1);
  }
  ```
  同时让 Transit 复用同一个 `pre`（现在 `AreaAnnotation.Transit` / `Symbol.Transit` / `RegexToken.Transit` 各自再算一次）。
- **预期收益**：估算 157 万 × ~15 ns ≈ **24 ms（−1.2%）**；零风险。
- **成本/风险**：极低（一个判断删除 + 注释说明不变量的理由）。
- **不变量**：`Pre()` 在 `Index === 0` 时仍返回 `null`；`EOF`（`Index === -1`）不变；无任何 `At` 越界。
- **必须改 core**：是（但属于 trivial 级）。
- **验证**：单测/门禁 + 计数探针（`Document.At` 计数应下降）。

---

### P06 `DrainMessages` 空队列快路径

- **位置**：`core/syntax/syntax-context.xl.md:164-184`
- **现状机制**：每字符调用一次，`while (this.Messages.length > 0)`；绝大多数时候队列为空，但仍要读两次 `length` 并进 `while`。
- **为什么贵**：`lib.dom` 236 万次调用（计数表 1.005/字符），每次 ~5-10 ns（`Messages.length` 是数组属性读 + 循环建立）。
- **改法**：函数首行 `if (this.Messages.length === 0) return;`；消息取出改 `const item = this.Messages[0]; this.Messages.length = 0;`（只有 Reload 会重排，见 P03 的说明）。
- **预期收益**：估算 **10 ~ 20 ms**（−0.5 ~ −1%）。
- **成本/风险**：极低。
- **不变量**：消息消费顺序（队首优先、Reload 插回 `SourceQueue` 队首）。
- **必须改 core**：是。
- **验证**：门禁 + 计数探针。

---

### P07 `UnitToken.Process` 热路径整形（try/catch、for-of、重复 `LastSource` 写）

- **位置**：`core/syntax/unit-token.xl.md:98-134`
- **现状机制**：
  ```ts
  try {
    if (this.MountedUnit !== null) { this.MountedUnit.Process(context, source); return; }
    const exitState = this.ExitOrPre(context, source);
    … if (this.ProcessQueue !== null) { for (const item of this.ProcessQueue.Data) { … } }
    this.Default(context, source);
    this.LastSource = source;
  } catch (e) { const previous = source.Pre(); … throw SyntaxException.FromInner(…) }
  ```
- **为什么贵**：每字符 3.44 帧 × 236 万 = **807 万次** `Process`。其中：(a) `for…of` 迭代数组会走迭代器协议（V8 多能优化掉，但这里是热函数里套热函数）；(b) `LastSource = source` 在 4 个出口各写一次；(c) `try/catch` 覆盖整个函数，妨碍部分内联（V8 对 try 内的调用不做某些优化）。
- **改法**：
  1. `for (let i = 0; i < queue.length; i++) { const state = queue[i](context, this, source); … }`；
  2. 把 `LastSource = source` 收成**单出口**（`const done = …; this.LastSource = source; return;` 用一个 `finally` 不行——`finally` 也压优化；用 `switch` 生成单一赋值点）；
  3. `try/catch` 上移：只在 `Root.Process`（`SourceFileShape.Process` 的 `super.Process` 外层）包一次，内部抛错时用**异常携带的位置**（`SourceException`/`SyntaxException.FromInner` 需要 `source.Pre()`）——这需要把 `source` 放进一个上下文字段（`context.CurrentSource`），异常时由最外层补范围。**这是行为可见的改动（异常构造点变了），风险中等，建议单独一步做、单独跑门禁。**
- **预期收益**：估算 807 万 × 8-15 ns ≈ **65 ~ 120 ms（−3 ~ −6%）**；其中 (1)(2) 几乎零风险，(3) 风险集中在异常路径。
- **成本/风险**：低（1、2）/ 中（3）。建议 1、2 先做，(3) 后评估。
- **不变量**：`Reload`/`Done`/`Undo` 三种返回的处理顺序；`LastSource` 在所有出口都被更新；异常类型与消息文本不变；7 项门禁。
- **必须改 core**：是。
- **验证**：门禁里如果有异常用例（`SyntaxException` 的范围断言），必须先跑通；再 `parse-perf` A/B。

---

### P08 `Temp` 延迟化：块 token 只记区间，取文本时一次切片

- **位置**：`core/syntax/block-token.xl.md:20-77`（`Temp` 20-22、`TempToString` 41-49、`AppendAndSignOut` 51-62、`Undo` 104-125）、`core/syntax/basic-tokens/common.xl.md`（`IsAppend` 41-69 与 `TempToString` 的十余处读取）
- **现状机制**：每收一个字符 `this.Temp += source.Value`（`block-token.xl.md:57`），每字符一次字符串拼接；`Undo` 用 `substring` 回退。
- **为什么贵**：micro 实测 **14.9 ns/字符**；`lib.dom` 里除注释外仍有 ~78 万字符进 `Tmp`（`Common`/`Symbol`/`WrapSymbol`），≈ **12 ms** 直接成本 + 每次 `+=` 产生的中间字符串垃圾（对 GC 压力更大，可能是隐藏的 2-3 倍成本）。`Token.Add` 计数 31.3 万，平均每 token 7.5 字符，说明拼接次数 ≈ 字符数。
- **改法**：块 token 增加 `TempStart:Source` 与 `TempDirty:bool`；`AppendAndSignOut` 只 `SignOut(source)` 并置 `dirty`；`TempToString()` 首次读时用 `Start.Document.GetRaw(Start.Index, End.Index)` 切片并缓存。`IsAppend`/`Is`/`IsAny`/`IsNumber*` 都经 `TempToString()`，所以**读侧零改动**。
  - `Undo` 只需把 `End` 退回前一个 `Source` 并置 `dirty`（不再 `substring`）。
  - `HasBackslash`（:24-31）改为惰性：`TempToString().indexOf("\\") >= 0` 一次判定并缓存。
- **预期收益**：估算 **12 ~ 35 ms**（−0.6 ~ −1.7%）+ 显著的分配率下降（GC 次数减少，长文件收益更大）。
- **成本/风险**：中。`Temp` 被 `Common.IsUnicodeEscapeStart` 等**逐字符语义**读取（`common.xl.md:137-205`），必须保证延迟切片后的文本与逐字符拼接**逐字节相同**（闭区间口径：`GetRaw(start, end)` 含两端，`typescript/run/text-document.xl.md:74-80`）。
- **不变量**：`Temp` 文本完全一致（形状树摘要里的 `Tmp` 段已覆盖）；`Undo` 后的区间与文本一致；`HasBackslash` 语义不变（单调 true）。
- **必须改 core**：是。
- **验证**：`dts-ab.mjs` 的摘要（含每个 `Tmp`）；`tests/gates`。

---

### P09 `CatalogGuide` 的 `Candidates:Set<int>` 与 `Array.from`

- **位置**：`core/syntax/catalog-guide.xl.md:27-28`（`Candidates`）、`:45-51`（构造时填满）、`:85-89`（`for (const index of this.Candidates)` 里 `delete`）、`:114`（`Array.from(this.Candidates)[0]` 分配一个新数组）、`:129-134`（`Reset` 清空再逐个 `add`）
- **现状机制**：候选存活集是 `Set<int>`，每轮判定遍历并 `delete`；建之前 `Array.from(...)[0]`；建之后 `Reset` 清空并重新 `add` 一遍。
- **为什么贵**：`lib.dom` 69,267 次 `ComputePossibleShapesByIndex`，每次 12 个候选 → 约 83 万次 `Set` 迭代 + 8.3 万次 `Array.from`（每次分配一个数组）+ `Reset` 里 12 次 `add`。估算每次判定 ~200 ns 的**与真实解析无关**的开销。
- **改法**：`Candidates` 改成 `Alive:Uint8Array`（长度 = 候选数）+ `AliveCount:int`；遍历 `for (let i = 0; i < n; i++) if (alive[i]) { … alive[i] = 0; aliveCount--; }`；唯一候选用 `onlyIndex`（遍历时顺手记）而不是 `Array.from`；`Reset` 用 `Alive.fill(1)`。
- **预期收益**：估算 **10 ~ 20 ms**（−0.5 ~ −1%），且**零行为风险**（纯数据结构替换）。
- **成本/风险**：低。注意 `Candidates` 是 `public field`，若有形状/测试直接读它，需要保留一个只读视图或改调用点（全仓 `Candidates` 引用只有 catalog-guide 自己，已确认）。
- **不变量**：候选淘汰顺序、`size === 0/1/>1` 三态语义、`Reset` 后「从零开始」的语义。
- **必须改 core**：是。
- **验证**：门禁 + 计数探针（`ComputeByIndex` 调用次数应完全不变）。

---

### P10 候选缓存键：`constructor.name` → 静态槽位

- **位置**：`core/syntax/possible-shape-cache.xl.md:27-55`（`GetState`/`SetState`，`Map<string, any>`）、调用点 `typescript/tokens/**/*-possible-shape.xl.md` 的 `cache.GetState(this.constructor.name)`（生成代码里 20 处，例如 `statement-possible-shape.js:78`、`property-signature-possible-shape`）
- **现状机制**：每次判定用**运行时类名**做 Map 键：`this.constructor.name`（24.1 ns）+ `Map.get` 字符串哈希（14.7 ns）= **38.8 ns**；micro 里换成 `obj[Symbol]` 是 **4.5 ns**。
- **为什么贵**：`lib.dom` 29.4 万次 `GetState` → **11.4 ms**；另外 `constructor.name` 会阻止 V8 把访问内联成常量。
- **改法**：`PossibleShape` 基类持 `private static SlotTable: Map<Function, int>`，`SlotOf(ctor)` 首次分配一个整数槽（`0..n-1`）；`PossibleShapeCache` 用 `Array<any>`（按槽位下标）取代 `Map<string, any>`。调用点改成 `cache.GetState<X>(this.Slot())`，`Slot()` 在基类里 `return PossibleShape.SlotOf(this.constructor)`。
- **预期收益**：估算 **8 ~ 12 ms**（−0.5%）；改动面 20+ 文件（每个文件一行），但机械。
- **成本/风险**：低。必须保证**同一个形状类**在不同 `CatalogGuide` 实例里拿到同一个槽（静态表是全局的，天然满足）；`Values`/`Share` 两层都要换。
- **不变量**：缓存键的**等价类**不变（一个形状类一个槽）；`Reset` 只清 `Values` 不清 `Share`。
- **必须改 core**：是（`possible-shape-cache.xl.md` + `possible-shape.xl.md`），调用点 20 处属 typescript 层。
- **验证**：门禁（形状判定结果逐条一致）+ 计数探针。

---

### P11 `SourceFileShape.Close` 的三次遍历 + `Data.slice()` + `filter`

- **位置**：`typescript/tokens/files/source-file-shape.xl.md:68-90`
- **现状机制**：EOF 时先把 `Data.slice()`（复制 31.3 万元素的数组）遍历一遍关单元，再遍历一遍，再遍历一遍断言，最后 `filter` 又分配一个新数组。
- **为什么贵**：一次 `slice` + 一次 `filter` = 两个 31.3 万元素数组（约 2.5 MB）的分配与复制；只在文件末尾发生一次，但代价是 **5 ~ 15 ms**，且对大文件（`typescript.d.ts`、`lib.dom`）是白给。
- **改法**：单遍「写指针压缩」：
  ```ts
  let write = 0;
  for (let i = 0; i < this.Data.length; i++) {
    const item = this.Data[i];
    if (!item.Closed) item.TryToClose(context);
    if (!item.IsTriviaToken && !(item instanceof EndOfFileTokenShape)) this.Data[write++] = item;
  }
  this.Data.length = write;
  ```
  第一遍（`slice()` 的那一遍，注释说「关闭过程中可能往 `Data` 里加东西」）保留为「先按原长度关一遍」的 `for`——不需要 `slice` 副本，只需记住 `const n = this.Data.length` 并在循环里用 `i < n`。
- **预期收益**：估算 **5 ~ 15 ms**（大文件更明显）；零行为风险。
- **成本/风险**：低。`Close` 期间 `Data` 增长的方向是**追加**（形状只会 `Add` 到末尾），所以固定上界 `n` 安全；若将来有插入，需要保留副本语义（注释 :72 的 `slice()` 就是为此）。
- **不变量**：关闭顺序、`Data` 的最终内容（不含 trivia / EOF 形状）、异常文本「有子单元无法关闭」。
- **必须改 core**：否（typescript 层）。
- **验证**：门禁 + 摘要。

---

### P12 `TypeBuilder.Load` 的数组重建与 `>>` 虚拟符号

- **位置**：`typescript/tokens/types/type-builder.xl.md:153-197`（`Load`）、`:259-274`（`SpanLeaf`）、`:199-209`（`OriginalConsumed`）
- **现状机制**：每次 `Load` 都 `this.Units = []` / `Positions = []` / `SourceIndexes = []` 重新分配并逐个 push；遇到 `>>`/`>>>` 还要**按字符拆成虚拟 `Symbol` 单元**（:173-189，每个 `>` 一次 `Document.At` + `new Symbol` + `AppendAndSignOut` + `SignIn` + 3 次 push）。
- **为什么贵**：d.ts 里 `Array<Array<T>>` / `Promise<ReadonlyArray<T>>` 极常见；每拆一个 `>` 就是 1 个对象 + 1 个 `Source` + 4 次数组写。`Load` 本身是 O(段长) 复制——外层 `StatementBuilder.BuildExpressionRange`（`statement-builder.xl.md:180-199`）已经把同一段 `push` 复制过一次，`TypeBuilder.Load` 是**第二次**复制（第三次是 `ExpressionBuilder.Load`，`expression-builder.xl.md:151`）。
- **改法**：
  1. 三个数组改成**复用**（`builder.Reset()` 只 `length = 0`，不重新 `new`）；
  2. `Load` 接受 `(units, basePos, from, to)` 视图，调用方不再 `units.push(...)` 复制；
  3. `>>` 不拆对象：记 `AngleSplit:Array<{unitIndex, offset, count}>`，`Peek`/`At` 走一个「虚拟下标 → (单元, 偏移)」映射；`SpanLeaf` 用 `head.Index + offset` 现算 `Source`。
- **预期收益**：估算 **10 ~ 30 ms**（−0.5 ~ −1.5%），主要省分配与 GC；对 `typescript.d.ts`（588 KB、只有 2 条语句、类型极长）可能更高。
- **成本/风险**：中。`Positions`/`SourceIndexes` 的**下标语义**被 `OriginalConsumed()`（:199-209）和调用方依赖，虚拟化后必须逐位对齐；建议先做 (1)(2)，(3) 单独评估。
- **不变量**：`At` 的推进语义、`OriginalConsumed` 折算、`Pos`/`SourceRange` 逐单元一致。
- **必须改 core**：否（typescript 层）。
- **验证**：门禁（AST/形状树摘要）优先于时间；`single-4000` 合成档（长类型链）专门覆盖。

---

### P13 字符分类一次算清（`SymbolTemplate` 的热判定合并）

- **位置**：`core/syntax/templates/symbol-template.xl.md:71-116`（`IsSymbol`：先 `BanedSymbol.includes`，再 30 分支 `switch`）、`:235-251`（`IsWhiteSpace`）、`:217-225`（`IsNumber`）、`core/syntax/basic-tokens/common.xl.md:41-69`（`IsAppend` 里连调 `IsSymbol` + `IsWhiteSpace` + `IsUnicodeEscapeStart`）、`symbol.xl.md:45-70`（`IsAppend` 里 `this.Temp + Src.Value` **每次拼接一个新字符串**再查表）
- **现状机制**：每个字符要被分类 2~4 次，每次都是一次虚调用 + `includes`（数组线性扫）+ `switch`；`Symbol.IsAppend` 还每字符构造 `Temp + value` 临时字符串。
- **为什么贵**：`Common.IsAppend` 49.5 万次、`Symbol.Transit` 61 万次，每次 2~4 次分类 ≈ 150~250 万次分类调用；`Temp + value` 每次分配一个 2~4 字符字符串。合计估算 20 ~ 40 ms。
- **改法**：
  1. `SymbolTemplate` 增加 `ClassOf(item):int`（0=空白、1=字母、2=数字、3=引号、4=斜杠、5=开括号、6=符号、7=其他），实现为**一次 `switch` + 256 项缓存数组**（`Cache:Int8Array(256)`，`-1` = 未算）；
  2. `Common.IsAppend` / `Symbol.IsAppend` / `WrapSymbol.IsAppend` 都改读 `ClassOf`；`Symbol.IsAppend` 的组合符号判定改成「先查 `Temp` 末字符 + 当前字符的两位组合表」（`CombinedTable:Map<int, bool>` 或直接 `switch` 两字符），不再拼字符串。
- **预期收益**：估算 **15 ~ 35 ms**（−1 ~ −2%）；同时是 P04 分派表的**前置条件**。
- **成本/风险**：中。分类必须与现有 `IsSymbol`/`IsWhiteSpace`/`IsNumber` 的**每一分支**一致（`BanedSymbol`/`AllowedSymbol`/`BanedCombinedSymbol`/`AllowedCombinedSymbol` 是可配置数组，缓存要在这四个数组变更时失效——`Ban`/`Allow` 方法里清缓存即可）。语言模板可覆写，缓存必须在 `Template` 实例上而不是静态。
- **不变量**：对任意字符，`ClassOf` 的判定与旧 `IsSymbol`/`IsWhiteSpace`/`IsNumber` 组合**逐字符等价**（建议加一个穷举 0..0x10FFFF 的等价性单测，只跑一次）。
- **必须改 core**：是。
- **验证**：穷举等价性测试 + 门禁 + `dts-ab`。

---

### P14 `Source.Value` 的 getter + 闭包调用链

- **位置**：`core/syntax/source.xl.md:41-54`（`Value` getter）、`core/syntax/document.xl.md:27-29`（`GetValue:ValueGetter` 字段）、`typescript/run/text-document.xl.md:36`（`super((index) => content[index], …)`）
- **现状机制**：每次读字符：`source.Value`（getter）→ 判 `Index === -1` → `this.Document.GetValue(this.Index)`（**字段里的闭包**）→ `content[index]`。
- **为什么贵**：micro 实测 7.7 ns/次；`Transit` 每字符读 1~2 次、`IsAppend` 再读，`lib.dom` 估计 500 万次 ≈ **38 ms**。
- **改法**：`Document` 增加可选 `CharCodeAt(index):int`，`TextDocument` 覆写为 `this.Content.charCodeAt(index)`；热判定（空白/符号/数字/引号）改比 `charCode` 常量，不再产生单字符字符串。保留 `Value` 给需要字符串的地方（`Tmp` 追加、诊断）。
- **预期收益**：估算 **20 ~ 35 ms**（−1 ~ −1.7%）；顺带把单字符字符串的产生点集中到一处。
- **成本/风险**：中。`Value` 的 EOF 语义（`"\0"`）要保留；所有比较点都要从 `=== "x"` 改成 `=== 120`，**漏一处就是静默行为差异**——建议只改 P13 的 `ClassOf` 与 `IsSymbol/IsWhiteSpace` 三处，其余保持。
- **不变量**：任何字符位置的 `Value` 与 `CharCodeAt` 一一对应（`Value === String.fromCharCode(CharCodeAt)`，EOF 除外）。
- **必须改 core**：是。
- **验证**：等价性单测（逐字符比对）+ 门禁。

---

### P15 `SourceFileEndPossibleShape` 的 ASI 判定：每 token 一次全段扫描

- **位置**：`typescript/tokens/files/source-file-end-possible-shape.xl.md:57-82`（`ComputeByIndex` 调 `ExpressionStatementPossibleShape.IsAsiBoundary`）、`:84-120`（`HasLabelPrefix`：`ItemUtil.ItemStart` + 两段回扫）、`:122-156`（`HasDecoratorPrefix`：从 `tokenIndex - 1` 一路回扫到 `ItemStart`）
- **现状机制**：每来一个单元（token）就问一次「这里是不是 ASI 边界」，两个辅助函数**各自从 `tokenIndex` 回扫到条目起点**；`ItemStart` 本身又从 `units` 尾部往前扫一遍（`item-util.xl.md:10-19`）。
- **为什么贵**：`lib.dom` 31.3 万 token → 每次 O(当前条目长度) 的回扫；对 `typescript.d.ts`（588 KB、**只有 2 条语句**）就是典型的 **O(n²)**：条目长度 ≈ 全文，token 数 ≈ 10 万量级 → 每个 token 回扫数万单元。这**可能解释**为什么 `typescript.d.ts` 的 ns/char（660）比 `lib.dom`（470）高 40%。
- **改法**：在 `SyntaxContext`（或 `SourceFileShape` 的字段）里维护**当前条目的头下标** `ItemStartIndex`：条目在 `end` 处建完形状时重置为 `host.Data.length`；这样 `ItemStart` 变 O(1)。`HasDecoratorPrefix`/`HasLabelPrefix` 再各自加一个「上次结果 + 上次 tokenIndex」的单调缓存（同一 tokenIndex 只问一次）。
- **预期收益**：估算 **20 ~ 60 ms**（`lib.dom`）；`typescript.d.ts` 上可能 **50 ~ 120 ms**（需 dts-profile 确认，见 §5 H3）。**零行为风险**（只是把同一判据的重复扫描去掉）。
- **成本/风险**：低。`ItemStart` 的语义是「最后一个非 basic 单元之后」，条目头必须与 `BuildByIndex` 建形状的时机严格同步（建完必须重置）。
- **不变量**：`ItemStart` 的返回值逐 tokenIndex 相同；ASI 判定结果逐 tokenIndex 相同（建议加一个「缓存命中与不命中结果一致」的断言）。
- **必须改 core**：否（typescript 层 + 一个 `ItemUtil` 静态缓存）。
- **验证**：门禁 + 对 `typescript.d.ts` 单独跑 `--single`-style 计时；计数探针里 `ItemStart`/`IsAsiBoundary` 的调用次数不变、但总扫描长度可用一个临时计数器证明下降。

---

### P16 建造器对象池（`ExpressionBuilder` / `TypeBuilder` / `StatementBuilder`）

- **位置**：`typescript/tokens/statements/statement-builder.xl.md:192`（每个表达式 `new ExpressionBuilder`）、`:206`（每个括号 `new ExpressionBuilder`）、`typescript/tokens/types/type-builder.xl.md:104`（约定「造：`new TypeBuilder(...)`」）、`expression-builder.xl.md:151`（`Load`）
- **现状机制**：每个成员/每个表达式都 `new` 一个建造器（各自带 3 个数组字段），用完即弃。
- **为什么贵**：`lib.dom` 2805 条语句、数万成员；每个建造器 1 对象 + 3 空数组 = 4 次分配。估算 5 ~ 15 ms + GC。
- **改法**：在 `SyntaxContext` 里挂一个**两级池**（按建造器类型），`Borrow`/`Return`：`Load` 时 `length = 0` 复用数组。池只在单次 `Parse` 内有效（`SourceFileRunner.Parse` 每次新建 context，`source-file-runner.xl.md:32-37`），天然无跨次状态。
- **预期收益**：估算 **5 ~ 15 ms**（−0.3 ~ −0.7%）；与 P12 的「数组复用」是同一份改动的两半。
- **成本/风险**：低-中：建造器有可变的 `AllowAnonymousClass`（`statement-builder.xl.md:84`）等标志位，`Return` 时必须复位；漏一个就是**跨条目状态泄漏**（最坏情况是静默 AST 差异）。建议只在 `Load` 里重置**全部**字段，而不是依赖 `Return`。
- **不变量**：每次 `Load` 后建造器状态与 `new` 出来的完全相同（可用一个 `assertFresh()` 在开发构建里跑门禁）。
- **必须改 core**：否。
- **验证**：门禁 + 一个「池化开关」对比跑（同进程内 A/B）。

---

### P17 `BuildExpressionRange` 的数组复制

- **位置**：`typescript/tokens/statements/statement-builder.xl.md:180-199`
- **现状机制**：
  ```ts
  const units:Array<Token> = [];
  for (let at = first; at <= last; at++) units.push(this.Units[at]);
  const builder = new ExpressionBuilder(...); builder.Load(units, this.Positions[first]);
  ```
  每个表达式复制一遍单元数组。
- **为什么贵**：O(段长) 复制 + 一次数组分配；`lib.dom` 里表达式语句与成员初始化器数量级在 1 万以上。
- **改法**：`Load(units, basePos, from, to)`（与 P12 同一个签名扩展），`BuildExpressionRange` 直接把 `this.Units` 与区间传下去。
- **预期收益**：估算 **3 ~ 10 ms**；与 P12/P16 合并落地时几乎零边际成本。
- **成本/风险**：低（纯调用约定扩展）。
- **不变量**：`Load` 后 `Units` 的内容与长度逐项相同；`Positions` 起点相同。
- **必须改 core**：否。
- **验证**：门禁。

---

### P18 `Token.Add` + `unit.Last()` 的双取

- **位置**：`core/syntax/basic-tokens/common.xl.md:665-666`、`symbol.xl.md:186-187`、`wrap-symbol.xl.md:86-87`、`bracket.xl.md:158-161`（`Add` 之后立刻 `unit.Last() as X` 再 `AppendAndSignOut`）
- **现状机制**：`Add` 返回 `item`（`token.xl.md:135-143`），但调用点丢弃返回值，改用 `unit.Last()` 再取一次（`token.xl.md:79-89`：`Data.length - 1` + 边界判断）。
- **为什么贵**：31.3 万 token，每个 1 次多余的方法调用 + 2 次数组访问 + 2 次比较；估算 3 ~ 5 ms。**纯顺手，零风险**。
- **改法**：`const created = unit.Add(new Common(unit.Template)); created.AppendAndSignOut(source).SignIn(source);`
- **预期收益**：**3 ~ 5 ms**（−0.2%）。
- **成本/风险**：极低。
- **不变量**：无（同一对象）。
- **必须改 core**：是（4 处一行）。
- **验证**：门禁。

---

### P19 空白块（`WrapSymbol`）的整段预扫描

- **位置**：`core/syntax/basic-tokens/wrap-symbol.xl.md:67-89`、`core/syntax/syntax-context.xl.md:108-123`
- **现状机制**：空白也是逐字符进 `Tmp`（`IsAppend` :48-54），与注释同构，只是段通常很短（1~4 字符）。
- **为什么贵**：`lib.dom` 代码字符里空白约 **20 ~ 25%**（缩进 + 换行），每字符仍付 `At` + 队列 + `Process` + `Tmp +=` ≈ 100 ns → 估算 **40 ~ 60 ms**。
- **改法**：与 P01 同一套 `SkipTo`：`WrapSymbol` 首个空白字符进来时，用 `CharCodeAt` 往后扫到第一个非空白（32/9/13/10），一次算 `Tmp` 与 `End`，`SkipTo = 终止下标`。与注释不同的是它**很短**，所以「扫描」本身代价低（平均 2~3 次比较），收益来自省掉 3~4 个字符的整个管道。
- **预期收益**：估算 **30 ~ 50 ms**（−1.5 ~ −2.5%）。
- **成本/风险**：中低；空白是 trivia，不参与形状判定（`token.xl.md:65-69`），所以语义面小。
- **不变量**：`Tmp` 逐字节一致；`IsTriviaToken` 行为不变。
- **必须改 core**：是。
- **验证**：摘要（含 `Tmp`）+ 门禁。

---

### P20 `RegexToken.Transit` 的回扫（d.ts 里通常用不上，但每次 `/` 都付）

- **位置**：`core/syntax/basic-tokens/regex-token.xl.md:180-227`（`Transit` 里三段 trivia 回扫 + `unit.IsUndo(pre)`）
- **现状机制**：`Transit` 先 `source.Pre()`，再 `unit.IsUndo(pre)`（→ `WhichUnitRangeContains` 从 `Data` 尾部线性找，`token.xl.md:276-287`），然后两段 `while (data[at].IsTriviaToken) at--`。
- **为什么贵**：`lib.dom` 里 `/` 只有几万个（注释占大头），但每次 `IsUndo` 是从 `Data` 末尾往前找**覆盖该位置的子单元**，在根单元上可能扫过整段 `Data`（`WhichUnitRangeContains` 43,140 次 / `IsInRange` 30,821 次）。
- **改法**：`IsUndo(pre)` 只在「前一个字符是 `/`」时才调（现在就是），可进一步用「上一次处理的单元」缓存：`unit.LastSource` 已经记了最后处理的 `Source`，`WhichUnitRangeContains` 可以先比 `LastSource` 所在单元。或者给 `Token` 加 `LastChild:Token | null`（`Add` 时维护），`WhichUnitRangeContains` 从 `LastChild` 起。
- **预期收益**：估算 **3 ~ 8 ms**（`lib.dom`）；`typescript.d.ts` 更低。**收益/改动比一般，排在最后。**
- **成本/风险**：低-中（`LastChild` 要在 `Add`/`Replace`/`RemoveSelf`/`MoveDataTo` 四处维护）。
- **不变量**：`WhichUnitRangeContains` 的「从后往前第一个命中」语义。
- **必须改 core**：是。
- **验证**：门禁 + 计数探针。

---

### P21 `ItemUtil` 三个跳读函数的边界缓存

- **位置**：`typescript/tokens/item-util.xl.md:10-53`（`ItemStart`/`NextCode`/`PreviousCode`/`LastCodeInItem`）
- **现状机制**：每次从 `units` 的尾部/头部线性扫 `IsTriviaToken`；`LastCodeInItem` 还先调一次 `ItemStart`。
- **为什么贵**：被形状判定大量调用（每个候选的 `ComputeByIndex` 都可能调）；在「条目很长」（`typescript.d.ts`）时退化为 O(n²)。
- **改法**：`ItemStart` 结果缓存到 `SourceFileShape`（与 P15 同一份缓存）；`NextCode`/`PreviousCode` 在结尾常是 trivia 时才有收益，建议只在 P15 落地后观察。
- **预期收益**：与 P15 合计估算 **20 ~ 70 ms**（重叠，不叠加计）。
- **成本/风险**：低。
- **不变量**：四个函数的返回值逐下标不变。
- **必须改 core**：否。
- **验证**：门禁。

---

### P22 `AngleJudge.IsSplitClose` 的虚拟 `Symbol`（并入 P12）

- **位置**：`typescript/tokens/types/type-builder.xl.md:173-189`
- **现状**：见 P12 的 (3)。单列出来是因为它是**唯一在建造层里「用对象表达字符」**的地方：`new Symbol(unit.Template)` + `AppendAndSignOut` + `SignIn`，每个 `>` 一个。
- **预期收益**：单独看 **3 ~ 8 ms**；与 P12 一起做才有意义。
- **必须改 core**：否。

---

## 3. Top 5 推荐路线

按「阶段 → 最小验证集 → 预计终点」组织。终点以本机 `--dts 8` 的 2027 ms 为基准。

### 阶段 1：注释/空白整段跳过（P01 + P02 + P19）——**已有一半实测**

- **最小验证集**：`lib.dom` + `lib.es5` + `lib.es2015.core`（三档注释占比 82.6% / 71.4% / 74.3%），以及 `typescript.d.ts`（长类型、少注释，用来确认没有回归）。
- **做法**：`SyntaxContext.SkipTo` + 三个 basic token 的 `Process` 覆写（区域注释 / 行注释 / 空白）。
- **预计终点**：P01 实测 **lib.dom −154 ms、lib.es5 −46 ms、es2015.core −3.3 ms**；P02 + P19 再补 **−70 ~ −110 ms（lib.dom）**。合计 **8 份 ≈ 1900 → 1600~1660 ms（−16 ~ −21%）**，其中 `lib.es5` 类文件 **−45% 左右**。
- **前置**：`Document` 需要一个可选原文访问口（core 一处接口 + `TextDocument` 已有 `Content`）。
- **风险**：低-中；结构摘要已证等价。

### 阶段 2：驱动层去分配（P03 + P05 + P06 + P07 的 (1)(2)）

- **最小验证集**：`lib.dom` + `lib.webworker`（合计 74% 的基线时间）；再跑 `--single 4000` 确认长类型没有退化。
- **预计终点**：**−120 ~ −180 ms（−6 ~ −9%）**。与阶段 1 叠加后 **≈ 1450~1520 ms**。
- **风险**：中（`DrainQueue` 的队首语义、`Reload` 重放）。必须用计数探针确认 `ProcessSource.Process` 计数不变。

### 阶段 3：每字符分派（P13 + P04 + P14 的 `ClassOf` 部分）

- **最小验证集**：全 8 份 + `--multi 1000`（成员多、符号多）。
- **预计终点**：**−140 ~ −200 ms（−8 ~ −12%）**。叠加后 **≈ 1250~1350 ms**。
- **风险**：中（分类等价性）。必须先落地**穷举等价性单测**再改分派表。

### 阶段 4：候选/缓存/收尾（P09 + P10 + P15 + P11 + P18）

- **最小验证集**：`typescript.d.ts`（O(n²) 的 ASI 回扫在这里最明显）+ 全 8 份。
- **预计终点**：**−50 ~ −90 ms（−3 ~ −5%）**。叠加后 **≈ 1160~1300 ms**。

### 阶段 5：建造层（P12 + P16 + P17 + P08）

- **最小验证集**：`--single 4000`（长类型链）+ `--multi 1000`（成员多）+ 全 8 份。
- **预计终点**：**−30 ~ −70 ms（−2 ~ −4%）**。叠加后 **≈ 1100~1270 ms**。
- **说明**：这一层单条收益都不大，但它们是**唯一随成员数线性增长**的部分；如果 `dts-profile` 显示建造层占比高于本轮的估算（见 §5 H2），优先级要整体上移。

**总体**：在不改架构、不改语义的前提下，源码层可达 **2027 → 1100~1300 ms（−35 ~ −45%）**；其中 **阶段 1 一条就值 −16 ~ −21%**，且已有实测支撑。

---

## 4. 不建议做的清单

| 想法 | 为什么不做 |
| --- | --- |
| **优化 AST 投影（`typescript/ast/**` 的 `ParseFromShape`、`Array.map`、对象字面量）** | **不在计量路径上**：`parse-perf.mjs` 只调 `SourceFileRunner.Parse`（`parse-perf.mjs:136-144`），返回的是**形状树**；AST 层多处还是「未实现」桩（`typescript/ast/declarations/import-declaration-ast-node.xl.md:28-31`）。优化它对本轮数字**零收益**。 |
| 用 `Worker` / 子进程并行解析 | 单文件是纯串行状态机（`SyntaxContext` 有 `SourceQueue`、`Messages`、`VariableMap` 全部可变），并行只能跨文件；而 `--dts` 是**逐份串行计时并取中位**，跨文件并行不改变任何一份的延迟。收益 0，复杂度高。 |
| 把 `Source` 池化成可变对象 | `SourceRange.Start/End` **长期持有 `Source` 引用**（`source-range.xl.md:21-27`，注释明确「Source 事实不可变…直接持有引用」）。复用同一个 `Source` 实例会让所有已签出的范围串味。要减只能减少 `At` **调用次数**（P05/P03），不能池化对象。 |
| 缓存「上一次 parse 的形状树」 | 真实场景每份 `.d.ts` 只解析一次（`SourceFileRunner.Parse` 注释：一个实例只跑一次，`source-file-runner.xl.md:24`）；缓存只对基准的 repeat 循环有效，是**自欺**。 |
| 把 `constructor.name` 全仓替换成静态字面量 | 只有 20 处 `GetState(constructor.name)` 在热路径（P10 已覆盖，收益 ~10 ms）；其余 50 处都在**异常消息**里（`catalog-guide.xl.md:79/94/104/112` 等），改了没有收益还增加维护面。 |
| 用 `Map` → 对象字面量 / `Set` → 数组 做全局替换 | 只有 `Candidates:Set<int>`（P09）和 `PossibleShapeCache:Map`（P10）在热路径；`VariableMap` / `RegexStartAfter` 的调用频次是 O(控制结构) 级，改了收益 <1 ms。 |
| 把 `SymbolTemplate.IsSymbol` 的 `switch` 改成查表但**不做字符分类统一** | 单做这一条要改 30 个 case + 4 个可配置数组的失效逻辑，收益 <5 ms；只有和 P13/P04 合并（一次分类喂三处）才值得。 |
| 给 `Token` 加 `Clone` 支持 / 形状模板预建 | `Clone` 在 `token.xl.md` 只有约定（`SourceRange` 才需要 `Clone()`），形状是**每文件新建**的（`SourceFileShape` 构造器 `:55-66` 每次 `new CatalogGuide`），预建会带来跨文件状态，门禁风险远大于收益。 |
| 关掉 `try/catch`（不做位置补偿） | P07 的 (3) 必须保留 `SyntaxException` 的范围语义（`unit-token.xl.md:130-134` + `source-range.xl.md:112-121` 的 `^` 指示）；直接删掉会让所有语法错误失去位置，**违反门禁**。 |
| 改 `.d.ts` 专用的「只解析 declare」入口 | 见 P23：按**扩展名**裁剪候选会改变 AST（`.d.ts` 里也允许表达式、`export =` 等）；正确做法是**按条目首 token 动态裁剪**候选，而不是按文件名开岔路。 |

### P23（可选，收益不确定）按条目首 token 裁剪候选目录

- **位置**：`typescript/tokens/files/source-file-shape.xl.md:131-178`（12 个候选，其中 5 个语句类已注释掉但 `ExpressionStatementPossibleShape` 仍在）
- **想法**：`SourceFileShape.CreatePossibleShapes()` 是**全文件共用**的一份（静态缓存 :129-131）；`.d.ts` 的条目几乎都以 `declare`/`interface`/`type`/`export`/`import`/`namespace`/`class`/`enum` 开头，表达式语句极少。
- **为什么不建议按扩展名做**：`context` 不知道文件名（`SyntaxContext` 没有 `FilePath` 字段），且 `.d.ts` 里 `export = foo;`、`declare const x: typeof import("m")` 仍需要完整候选。**按扩展名开岔路会改变 AST**（门禁风险）。
- **可以做的最小版本**：`CatalogGuide` 在**条目开头**（`host.Data.length` 刚被重置时）用首 token 把明显不可能的候选从 `Alive` 里剔掉（例如首 token 是 `interface` 就不可能同时是 `ImportDeclaration`），**只减候选数、不换候选表**。预期 **5 ~ 15 ms**，风险中（每个候选的「首 token 必要条件」要逐条写对，写错就是「没有候选形状可以构成」的硬失败）。**建议在阶段 4 之后再评估。**

---

## 5. 与 dts-profile 的配合（待画像确认的 5 个假设）

| # | 假设 | 本轮的间接证据 | 需要 dts-profile 给什么 |
| --- | --- | --- | --- |
| **H1** | 注释字符的**单位成本**（~100 ns）与代码字符（~1.5~2 µs）差 15~20 倍，因此「按字符占比」估收益会高估 | A/B：跳过 65.7% 的字符只换来 −13.9%（`lib.dom`），而 `lib.es5` 跳过 71.4% 换来 −43.3% | 火焰图里 `AreaAnnotation.Default` / `UnitToken.Process` / `Document.At` 的**自身时间**（self time）占比，以及注释字符与代码字符的 per-sample 成本 |
| **H2** | 建造层（`TypeBuilder` / `StatementBuilder` / `ExpressionBuilder`）在 `lib.dom` 里占比 **< 15%**，但在 `typescript.d.ts` 里 **> 40%** | `typescript.d.ts` 588 KB / 2 条语句 / 389 ms（660 ns/char），比 `lib.dom`（470 ns/char）高 40%，而注释占比更低 | 按文件分别给 `TypeBuilder.*` vs `Transit`/`Process` 的采样占比；确认 `typescript.d.ts` 的 389 ms 落在哪个函数簇 |
| **H3** | `SourceFileEndPossibleShape` 的 ASI 回扫在**条目很长**时是 O(n²) | `source-file-end-possible-shape.xl.md:84-156` 两段回扫 + `ItemUtil.ItemStart` 每 token 一次；`typescript.d.ts` 只有 2 条语句 | 对 `typescript.d.ts` 采一次火焰图，看 `IsAsiBoundary` / `HasDecoratorPrefix` / `HasLabelPrefix` / `ItemStart` 是否成簇出现（P15 的收益上限） |
| **H4** | GC / 分配占 **15 ~ 25%**，主要来自 `Source`（720 万/lib.dom）+ `ProcessSource`（236 万）+ `Tmp +=` 的中间字符串 | micro：`new Source` 20.6 ns、队列 50.2 ns、`Temp+=` 14.9 ns；这些 sum 起来只有 ~300 ms，但实测 1104 ms | V8 的 GC 时间与分配率（`--trace-gc` 或采样器的 GC 栈）；确认「减少分配」的边际收益是否高于「减少调用」 |
| **H5** | `CatalogGuide` 的候选判定（12 个候选 × 每 token）**不是**主热点（< 10%） | `ComputePossibleShapesByIndex` 只有 69,267 次，`GetState` 293,815 次 → 直接成本 ~30 ms | 采样里 `ComputeByIndex` / `BuildByIndex` 及其被调者的总占比；若 > 20%，P09/P10/P23 的优先级要上移，P12/P16 下移 |

---

## 6. 复现与门禁

```powershell
# 基线
node tests/bench/parse-perf.mjs --dts 8 --repeat 3

# 每字符成本（包装原型，不改源码）
node tests/bench/dts-cost-probe.mjs --count --files 1
node tests/bench/dts-cost-probe.mjs --micro

# A/B（P01 的实测值来自这里；在 build/ts-exp 副本上打补丁，不动 build/ts）
node tests/bench/dts-ab.mjs

# 门禁（任何一条改动落地后必跑）
node tests/gates/run.mjs
```

**「7 项门禁逐项不变」的口径**：每条改动的验证都要求 `tests/gates/run.mjs` 全绿，且形状树逐节点摘要
（`构造器名[Start,End]` + `Tmp`，见 `dts-ab.mjs` 的 `digest`）与基线**逐字节相同**。
摘要覆盖了 XML 产出、`SourceRange`、`Pos`、block 文本、`Data` 顺序与父子关系；
AST 投影在此基础上另由门禁覆盖。异常用例（错误范围、`^` 指示）单独用 `SyntaxException` 的现有测试兜底。
