# IMPORTANCE 规则清单（审计判据）

本文件把 `docs/IMPORTANCE.md` 拆成可逐项对照的判据 `R01…R26`。**IMPORTANCE.md 是用户文档，本次审计一个字都不改。**

出处一律写 `IMPORTANCE.md:行号`。审计只做「读代码 → 对照判据 → 记录偏离」，**不跑 gates**（用户明确要求忽略 gates 验证）。

## 一、文档规范

| # | 判据 | 出处 |
| --- | --- | --- |
| R01 | `*.xl.md` 禁止散文：代码围栏之外、标题之外的说明文字一律不允许（`txt` 围栏内的示例与中文注释不算） | IMPORTANCE.md:3-4 |

## 二、词法/basic token 层

| # | 判据 | 出处 |
| --- | --- | --- |
| R02 | basic token 至少覆盖：区域注释、行注释、正则、字符串、括号、空白、符号、通用字符块、BOM、Shebang | IMPORTANCE.md:7-17 |
| R03 | basic token 把字符串切成词组，由语法层消费；关闭或 bracket 创建时才触发 possible/end | IMPORTANCE.md:7-8, 20 |

## 三、语法层结构（shape / possible / end）

| # | 判据 | 出处 |
| --- | --- | --- |
| R04 | 语法层由 shape（继承 ShapeToken）、possible（候选）、end（终结候选）三件套构成；关联通过 catalog guide 表达 | IMPORTANCE.md:19-20 |
| R05 | 只有一个候选时形状完全确定，即可 build 创建形状 | IMPORTANCE.md:19 |
| R06 | 增量创建形状是**主要方案**，全量创建形状只是**备选方案** | IMPORTANCE.md:22-23 |
| R07 | 能用增量却用全量 ⇒ 质量等级为「差」 | IMPORTANCE.md:62 |
| R08 | compute/build 每轮都重新寻找/遍历 ⇒ 质量等级为「差」；应把寻找结果记进 cache 复用 | IMPORTANCE.md:61 |

## 四、cache

| # | 判据 | 出处 |
| --- | --- | --- |
| R09 | compute/build 从 possible cache `get state`，完成后 `set state` | IMPORTANCE.md:26 |
| R10 | 多个 possible 的共同状态用 `share`（get share / set share） | IMPORTANCE.md:26 |
| R11 | `state` 面向单个 possible 且 **build 后 reset**；`share` 是共享空间且 **不 reset** | IMPORTANCE.md:27 |

## 五、逐字 AST（增量可验证性）

| # | 判据 | 出处 |
| --- | --- | --- |
| R12 | 第 n 个字符形状已确定时，ast 树必须已经创建形状；否则说明增量创建没覆盖该场景 | IMPORTANCE.md:29-31 |

## 六、bracket 晋升

| # | 判据 | 出处 |
| --- | --- | --- |
| R13 | bracket **create 时**就要触发 possible（install catalog possible），不能等 close | IMPORTANCE.md:34 |
| R14 | bracket create 时形状可能确定但 `bracket.data` 不完整，故只 install catalog，由 data 增量收敛 | IMPORTANCE.md:35 |
| R15 | bracket create 时按场景配置 `bracket.HandleCloseDispatch` | IMPORTANCE.md:35 |
| R16 | bracket close 时若 `HandleCloseDispatch` 非空，**直接调用它**完成晋升 + shape close，**不再触发原 close 逻辑（possible 与 end 都不触发）** | IMPORTANCE.md:35 |

## 七、未消费的 basic token

| # | 判据 | 出处 |
| --- | --- | --- |
| R17 | 四种去向：① 应消费没消费 = build 的错误；② 按形状预期挂到 build 出的 shape 下，等后续 token 关闭/EOF 触发消费；③ 继续挂原 parent，build 之后 `Reclose`（closed 置 false 重新 close）触发新 compute；④ 其他情况走 `Reload Message` | IMPORTANCE.md:38-42 |

## 八、shape 转 AST

| # | 判据 | 出处 |
| --- | --- | --- |
| R18 | 最终 shape 树与 TS AST **同构** | IMPORTANCE.md:54 |
| R19 | basic token 的数据必须在 **build 那一刻**全部提取到 shape 字段；basic token 用完即丢弃（`BuildByIndex` 从 `Data` 移除，或 `Close` 里过滤） | IMPORTANCE.md:55 |
| R20 | 形状 `Close` 之后 `Data` 等价于 AST 的 children——只剩子节点形状 | IMPORTANCE.md:56 |
| R21 | AST 节点由 `ParseFromShape(shape)` 从关闭后的 shape 产出 | IMPORTANCE.md:57 |

## 九、possible compute/build 行为规范

| # | 判据 | 出处 |
| --- | --- | --- |
| R22 | 只允许看 `tokenIndex` 之前，**禁止看之后**（之后的数据不保证就绪） | IMPORTANCE.md:65 |
| R23 | compute/build 里的异常**禁止 catch 吃掉**（异常是 possible 诊断，用户要看） | IMPORTANCE.md:66 |
| R24 | 禁止跳跃式处理（trivia 除外）：`shape1, basic1, shape2…` 中 basic1 未消费前不得处理 shape2 | IMPORTANCE.md:67 |
| R25 | 越界：`host.Data[tokenIndex]` 不存在 ⇒ 返回 `Nothing`（调用方可能按旧长度遍历） | IMPORTANCE.md:70 |

## 十、候选判定五条（CatalogGuide 语义）

| # | 判据 | 出处 |
| --- | --- | --- |
| R26 | 淘汰：逐个活候选调 `ComputeByIndex`；`Reject` 从 `Candidates` 去掉；`PossibleShapes` 数组禁止修改；`Accept`/`Uncertain` 同义=还活着，只淘汰不定案 | IMPORTANCE.md:71 |
| R27 | 终结候选 Accept：`Candidates == 0` ⇒ 调 `BuildByIndex`（`SignOut` → `TryToClose()` → `Quit()`），`Reset` 返回 `Built`；`Candidates > 0` ⇒ **抛错** | IMPORTANCE.md:72-74 |
| R28 | 零候选且不结束：`EndPossible === null` ⇒ **抛错**；不为 null ⇒ `Waiting` | IMPORTANCE.md:75 |
| R29 | 多候选（`>1`）⇒ `Waiting` | IMPORTANCE.md:76 |
| R30 | 唯一候选：先问 `IsBuildable`（只在恰好一个候选时问，默认 true）——false ⇒ `Waiting`；true ⇒ `BuildByIndex`，`Reset`，`Built` | IMPORTANCE.md:77 |

## 十一、build 产物两种去向

| # | 判据 | 出处 |
| --- | --- | --- |
| R31 | 立即关闭：静态工厂里签范围、取字段、`TryToClose()`（如 `StringLiteralShape.FromBasicToken`、`ImportAttributesShape.FromBracket`） | IMPORTANCE.md:80 |
| R32 | 未关闭 + 挂载：`host.MountedUnit = shape`，既不 `SignOut` 也不 `TryToClose`，后续字符继续流进它 | IMPORTANCE.md:81 |
| R33 | shape **禁止用 `ExitOrPre` 结束自己**，禁止覆盖 `ExitOrPre` | IMPORTANCE.md:84 |
| R34 | shape 禁止覆盖 `ComputePossibleShapes` | IMPORTANCE.md:85 |
| R35 | 被真实消费的 basic token 一律丢弃 | IMPORTANCE.md:86 |

## 十二、特性边界

| # | 判据 | 出处 |
| --- | --- | --- |
| R36 | 不支持 tsx | IMPORTANCE.md:119 |

---

## 偏离编号（本套文档统一使用）

| 编号 | 名称 | 对应判据 |
| --- | --- | --- |
| `S1` | basic token 层缺失/越权（basic token 里做了语法层的事，或缺一类 token） | R02–R03 |
| `S2` | 语法层三件套不成立（只有 shape 没有 possible/end，或 possible 未走 catalog guide） | R04–R05 |
| `S3` | shape 树与 TS AST 不同构（形状树里留壳类、残留 basic token、层级与 AST 不一致） | R18 |
| `S4` | `ParseFromShape` 缺失——AST 不由关闭后的 shape 产出（改由 builder/session 直接建） | R21 |
| `P1` | possible 触发时机/来源偏离（close 才触发、bracket create 不触发、自行造触发点） | R13–R14 |
| `P2` | 候选判定语义偏离（淘汰/终结/零候选/多候选/唯一候选/IsBuildable 次序或语义不对） | R26–R30 |
| `P3` | build 去向偏离（该挂载却关闭、该关闭却挂载、缺 `TryToClose`/`SignOut`、`Quit` 缺失） | R27, R31–R32 |
| `P4` | bracket 晋升偏离（没有 `HandleCloseDispatch`、close 仍走原 possible/end 逻辑） | R15–R16 |
| `C1` | 每轮重扫（compute/build 内 for/while 找形状或找 token，不看 cache） | R08 |
| `C2` | 能用增量却用全量（一次性扫全部 basic token/整段 raw 重建形状） | R06–R07 |
| `C3` | cache 语义偏离（state 未 reset、share 被当 state 用、state/share 全未用） | R09–R11 |
| `U1` | 应消费未消费（build 后该字段拿不到数据，或 basic token 仍在 `Data` 里） | R17①, R19 |
| `U2` | 该回挂 parent 并 `Reclose` 却直接丢弃/直接跳过 | R17③ |
| `U3` | 未消费 token 的处理走了非 `Reload Message` 的自造通道 | R17④ |
| `U4` | basic token 用后未丢弃（`Data` 仍含 basic token，close 后 `Data` ≠ AST children） | R19–R20, R35 |
| `B1` | 越界未返回 `Nothing`（`Data[tokenIndex]` 缺失时抛错/解引用） | R25 |
| `B2` | compute/build 里 catch 掉异常 | R23 |
| `B3` | 跳跃式处理（越过未消费的 basic token 去看后面的 shape/token） | R24 |
| `B4` | 查看 `tokenIndex` 之后的数据 | R22 |
| `R1` | 覆盖 `ExitOrPre`（含用它结束自己） | R33 |
| `R2` | 覆盖 `ComputePossibleShapes` | R34 |
| `X1` | 设计外挂：IMPORTANCE 未定义的机制（分支转发器、扫描器、builder/session 直建、开关位、指标计数器…） | 设计全文 |
| `X2` | legacy / fallback 旁路（整段 raw 重建、整文件回退重解析） | 设计全文 |
| `X3` | tsx/JSX 形状存在（与「不支持 tsx」相悖） | R36 |
| `D1` | 散文（xl.md 围栏外的说明文字） | R01 |
| `N` | 不涉及（纯数据、纯 AST 节点、纯枚举/别名） | — |

**强度标记**：`●` 明确偏离（代码直接违反判据）／`○` 疑似偏离（需要上下文才能定性）／`—` 不涉及。

---

## 每个文件的输出模板

```text
### <相对路径>（<字节数>B / <代码行>行；<类名列表>）
- 结构：<它属于哪一层：basic token / 模板 / shape / possible / end / 会话 / AST 节点 / 工具>
- 偏离：
  - `[编号]` ● <一句话结论> — 证据 `文件:行`（<关键代码片段>）
- 结论：符合 / 偏离（n 条）
```

要求：

1. **逐个文件**给条目，不允许合并成「其余同理」。
2. 证据必须带行号，行号以 `read` 工具返回的行号为准。
3. 没有偏离也要写「符合」，并说明它凭什么符合（例如「无方法体的纯 AST 节点，不涉及 possible」）。
4. 偏离按 IMPORTANCE 判据归类到上面的编号；判据覆盖不到的，归 `X1` 并在正文写清是什么机制。
5. **纯标记类文件**（类体只有构造函数、无字段赋值、无引用）可以用**表格逐文件一行**代替小节（字段：文件 / 类 / 字节 / 外部引用点 / 判定），这仍满足「每个文件都输出」；有方法体或有引用的文件必须用小节写。
