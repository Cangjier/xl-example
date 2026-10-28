# IMPORTANCE
本文档只能由用户编辑——AI 与其它工具不得改动。**AI 只有在用户消息明确要求修改本文档时才能改，且只改被要求的那一条。**
## xl.md 规范
所有xl.md禁止散文。散文是指代码围栏之外、标题之外的说明文字。```txt``` 围栏内的示例与中文注释不算散文。
## 设计
### 框架
本设计主要分为词法层和语法层。其中语法层是指basic token。basic token将字符串转换成词组，由语法层进一步消费。常见的basic token有：
- 区域注释 `AreaAnnotation`
- 行注释 `LineAnnotation`
- 正则 `RegexToken`
- 字符串 `String`
- 括号 `Bracket`
- 空白 `WrapSymbol`
- 符号 `Symbol`
- 通用字符块 `Common`
- BOM `Bom`
- Shebang `Shebang`

语法层主要是shape，possible，end。shape是继承于ShapeToken的形状，对标ts的形状。possible是候选，当只有一个候选时说明此时形状完全确定，即可调用build创建形状。end是终结候选，当shape完成时，end将关闭shape，表明shape信息已然完整。
shape和possible/end的关联通过catalog guide表达，当baisc token发生关闭或者bracket被创建时，即会触发possible/end。

### 增量创建形状和全量创建形状
possible/end时形状创建和关闭的机制，但落地过程中主要有两种形式，分别是增量创建形状和全量创建形状。增量创建形状是指逐字增量状态机，每当一个basic token确定时，形状候选将会逐步收敛，直至收敛成唯一形状，该形式是主要方案。全量创建形状是指一次性基于所有basic tokens进行创建形状，该形式是备选方案。

### 增量创建形状
当basic token关闭或者bracket创建时，将会触发possible compute/build，compute/build时将会从possible cache中get state，compute/build完成将会set state到possible cache。如果多个possible存在共同状态，则可以get share/set share到possible cache。
state和share的区别是：state是面向每一个possible的独立空间(compute/build用同一套数据)，share是多个possible的共享空间。并且state将在会build后reset，而share不会。

### 逐字ast树
当我们需要测试验证增量创建形状时，可以每一个字符打印ast树。如果第n个字符形状已经确定，但是ast树却没有创建形状，则说明增量创建形状没有处理到该场景。
在`docs/excepted-tts`中存在逐字ast树的示例。如`let_x_=_2x3+1.md`描述`let x = 2*3+1`的逐字打印ast。这些示例是大致符合预期的，llm可以通过将这些示例作为范本，去诊断增量创建形状是否符合预期。

### bracket 晋升
bracket和其他basic token不同的是bracket存在子集，如code block、class body、if body等等，如果等到bracket close时再possible，bracket.data将会存在大量basic token，因此bracket create时就需要触发possible。由此，possible有两个来源：close和bracket create。
bracket create和close虽然都触发possible compute/build，但不同的是bracket create时形状可能确定，但bracket.data不是完整，形状无法完成。因此bracket create时将会install catalog possible，bracket.data将进行增量创建形状；并且当bracket create时，将根据场景配置bracket.HandleCloseDispatch，用于关闭时晋升或不处理。当bracket close时，如果bracket.HandleCloseDispatch不为空，将直接调用bracket.HandleCloseDispatch完成bracket 晋升（也可以不晋升，根据需要来）和相应的shape close，并不触发原close逻辑（包括possible和end都不会触发）。

### 未消费的basic token
当possible build时，可能不会全部basic token都进行消费，成为shape的信息。这些未消费的baisc token存在以下情况：
- 应该被消费没有消费，这个是build的错误
- 按照形状预期，应该收到build的shape下面，由后续basic tokens关闭时/EOF触发消费
- 按照形状预期，应该继续挂载在原parent下面，并在build之后调用Reclose（将closed设为false，并重新close），基于build后的状态触发新的compute
- 其他情况，则走`Reload Message`

### cache重要性

```text
不用 cache：500 → 3.80ms / 1000 → 6.92ms / 2000 → 27.85ms / 4000 → 112.73ms   （n 翻倍，耗时 ×4）
用 cache  ：500 → 0.31ms / 1000 → 0.14ms / 2000 → 0.19ms / 4000 → 0.33ms       （每次只扫新增单元）
```

n=4000 时相差约 **340 倍**，曲线从二次变平。

### shape转ast node
- 最终 shape 树应当与 TS AST 同构
- basic token 的数据必须在 **build 那一刻**就全部提取到 shape 字段上；basic token 用完即**丢弃**（由 `BuildByIndex` 从 `Data` 移除，或在 `Close` 里过滤掉）。
- 形状 `Close` 之后 `Data` 就等价于 AST 的 children——只剩子节点形状。
- AST 节点约定由 `ParseFromShape(shape)` 从关闭后的 shape 产出。

### possible 质量标准
质量等级为：差/一般/好
- compute/build 如果每轮都进行寻找/遍历，则质量等级为差。解决思路：复用cache，将寻找的结果记录到cache，便于下次直接复用。
- 如果可以增量创建形状，但使用全量创建形状，则质量等级为差。

### possible compute/build 行为规范
- 只允许查看tokenIndex之前，禁止查看tokenIndex之后，因为此时tokenIndex之后的数据不一定准备好。
- compute/build过程中发生的异常禁止catch吃掉，这些异常是possible诊断，是用户期望看到的信息。
- possible/build禁止跳跃式处理（除了trivia），如 shape1, basic token1, shape2, ...; 此时basic token1尚未被消费，必须前置basic token确定形状后，才能处理后续。

### 其他注意点
- **越界**：`host.Data[tokenIndex]` 不存在 → 返回 `Nothing`（调用方可能按旧长度遍历）。
- **淘汰**：逐个还活着的候选调 `ComputeByIndex`；`Reject` 从 `Candidates` 里去掉（`PossibleShapes` 数组禁止修改），`Accept` 与 `Uncertain` 在这一次判定里同义——都只表示「还活着」。这一步只淘汰，不定案。
- **终结候选 Accept**：`EndPossible` 非空且判出 `Accept` 时
   - `Candidates == 0` 就调它的 `BuildByIndex` 结束（签出宿主 `SignOut` → `TryToClose()` → `Quit()`），`Reset` 后返回 `Built`；
   - `Candidates > 0` 则**抛错**（既像结束、又像还能长）。
- **零候选且不结束**：`EndPossible` 为 `null` 时则进行 **抛错**（没有候选形状可以构成）；不为 `null` 则返回 `Waiting`，继续等（有终结候选时不因 0 候选抛错）。
- **多候选**：`Candidates.size > 1` → 返回 `Waiting`。
- **唯一候选**：先过 `IsBuildable`（只在恰好剩一个候选时问；默认 `true`，候选可以声明「还缺后续单元」，例如 `ImportDeclarationPossibleShape` 要等 `Stage` 走出 0）——`false` 就返回 `Waiting`；`true` 就 `BuildByIndex` 建它，`Reset`，返回 `Built`。

建出来的形状有两种去向。
- **立即关闭** ：静态工厂里签范围、取字段、`TryToClose()`，如 `StringLiteralShape`（`FromBasicToken`）与 `ImportAttributesShape`（`FromBracket`）；
- **未关闭 + 挂载**：`host.MountedUnit = shape`，既不 `SignOut` 也不 `TryToClose`，如 `ImportDeclarationShape`，后续字符继续流进它，直到终结候选在「单元到齐」时签名并关闭。

需要注意的是：
- shape **禁止用 `ExitOrPre` 结束自己**，禁止覆盖`ExitOrPre`。
- shape 禁止覆盖 ComputePossibleShapes
- 被真实消费的baisc tokens一律丢弃
## cases

### astjson
`typescript/cases/astjson/*.ts` 的用例规范：每个语句形态必须**先有一条 base**（不含任何干扰信息），再基于同一个 base 给出叠加干扰信息的变体。干扰信息分两类：
- **trivia 类**：前导空格 / 前导注释 / 词间注释 / 词间多空格 / 词间换行 / 行尾注释；
- **重复形**：该位置可以表达为集合时，多放几个元素（如具名导入 3~5 个、属性多条、同一文件多条语句），可与 trivia 叠加。
一行一个用例；行内 `\n` 由生成器还原成真实换行。

### tts
`typescript/cases/tts/*.ts` 是逐字打印ast line，用于验证增量构建形状。

## 问题与解决
### 问题分类
- basic token存在问题
- 缺少possible
- 缺少end
- possible compute不对
- possible build不对
- end compute不对
- end build不对

### 解决思路
- basic token 哪些场景存在问题，交给用户决定
- 正确的应该什么时候build
- build时应该提取哪些信息
- 什么时候close
- 以及close时应该提取哪些信息
- build时未消费的basic tokens是不是处理不正确



## 特性说明
- 不支持tsx
