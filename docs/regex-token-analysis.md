# RegexToken 改造梳理（以 TS 的 RegularExpressionLiteral AST 为准）

本文回答三件事：TS 的 regex AST 要求我们产出什么、现在的 `RegexToken` 为什么在表达式上误判、以及要改哪些地方（按层拆开，含判据与状态机的具体写法）。

**边界**：`core/syntax/basic-tokens/` 属于「basic token 只能由用户发起修改」（IMPORTANCE §3.1）。本文是改动前的梳理，**没有改 basic token、也没有改 shape**。本轮实际落地的只有三件：
1. 新增 `typescript/cases/regex.ts`（256 条对抗用例，见 §4）；
2. `typescript/cases/ast-json.mjs` 的 TS 侧取样补上 `RegularExpressionLiteral.text`（否则 text 字段永远比不出来）；
3. 本页（`docs/regex-token-analysis.md`），即改造方案本身。

---

## 1. TS 的 regex AST：硬约束

用本仓的 TypeScript 6.0.3 实测（`ts.createSourceFile` + `parseDiagnostics`，下面都是**无语法错误**的输入）：

| 源码 | 节点 | pos, end | text |
| --- | --- | --- | --- |
| `/a/;` | RegularExpressionLiteral | `[0,3]` | `"/a/"` |
| `x = /a/g;` | RegularExpressionLiteral | `[3,8]` | `"/a/g"` |
| `/* c */ /a/;` | RegularExpressionLiteral | `[0,11]` | `"/a/"` |
| `x = a / /b/;` | SlashToken `[5,7]` + RegularExpressionLiteral | `[7,11]` | `"/b/"` |
| `x = /a/ / /b/;` | 正则 `[3,7]` / SlashToken `[7,9]` / 正则 `[9,13]` | — | `"/a/"`、`"/b/"` |
| `if (x) /a/.test(y);` | RegularExpressionLiteral | `[6,10]` | `"/a/"` |
| `({}) / b;` | SlashToken（不是正则） | `[4,6]` | — |
| `/a/xyz;` | RegularExpressionLiteral | `[0,6]` | `"/a/xyz"` |

从表里能读出四条对产物有约束的事实：

1. **`text` 是原始字面量整段**：含两端 `/` 与 flags，**不是** pattern、也不是 flags 的拆分。所以我们产出的形状必须有 `Text = "/" + 正文 + "/" + Flags`，否则字段差永远补不平。
2. **`pos` 含前导 trivia，`end` 左闭右开**：`x = /a/g;` 的 pos = 3（`=` 后的空格），end = 8（`g` 的下标 7 加一）。这与本仓 IMPORTANCE §4 的区间口径一致：shape 的 `SourceRange` 是闭区间 `[首个 /, 最后一个 flag]`，AST 的 `End = SourceRange.End.Index + 1`。
3. **flags 在解析期不做校验**：`/a/xyz` 照样产出 `text="/a/xyz"`（合法性是后面的语义检查）。只收合法 flags 也能满足本批用例，但若要与 TS 的 `text` 逐字符对齐，flags 应该按「标识符字符」收。
4. **「是不是正则」是语法层的决定，不是词法的**：
   - `if (x) /a/.test(y);` 里 `/` 前一个 token 是 `)`，但语句位要的是正则；
   - `({}) / b;` 里 `/` 前一个 token 也是 `)`，这里是除号；
   - `{} /a/;` 里 `}` 之后是正则（裸块），对象字面量之后的 `/` 才是除号。
   词法层只看得到一个字符的历史，所以它只能做**近似判据**；近似判据要留一个「语法层能否决」的接口（见 §4.5）。

---

## 2. 现状：`RegexToken` 现在做了什么

读 `core/syntax/basic-tokens/regex-token.xl.md`：

- **触发**（`Transit`，L136）：`source.Pre()` 是 `/`、那个 `/` 可回退、当前字符不是 `/`；然后看 `unit.Data` 的**倒数第二个元素**：单元数 > 1 且它是 `Common` 或 `Bracket` 就放弃。成立就 undo 那个已被吃成 `Symbol` 的 `/`，用同一个 `/` `SignIn`，再把当前字符 `Append` 进 `Temp`，挂载自己。
- **状态机**（`ExitOrPre`，L96）：转义态（`IsTranslate`）→ 原样收；未见到结尾 `/` → `\` 进转义态、`/` 置 `IsReadyToExit`、其它字符交 `Default`；已见到结尾 `/` → flags 字符收进 `Flags`，否则 `SignOut(当前字符)`、关闭、卸载、`ReloadMessage`。
- **数据**：`Temp`（正文）、`Flags`、`IsReadyToExit`、`IsTranslate`；区间由 `SignIn(preUnit)` 与关闭时的 `SignOut(source)` 决定。

### 缺陷清单（D1~D8）

| 编号 | 缺陷 | 后果 |
| --- | --- | --- |
| D1 | 起点判据看的是 `Data` 里**字面位置的倒数第二个元素**（含 trivia）。注意不对称：致命的是 `/` **左边**那一格——`a / b` 误判，`a/ b`（空格在右侧）反而判对 | `a / b`、`a /* c */ / b`、`(a) / b`、`f() / b` 全被当正则（假阳） |
| D2 | 同一判据把 `Common` 一律当操作数、`Bracket` 一律当操作数，不看 token 语义 | `typeof/a/`（无空格）假阴；`(`/`[` 之后的正则其实在子 `Data` 里，判据碰不到 |
| D3 | 正文第一个字符走 `Transit` 的 `Append`，**绕过** `IsTranslate` 设置 | `/\//` 的 `\` 没进入转义态，`/` 直接把字面量截断 |
| D4 | 没有字符类状态 | `/[/]/` 在类里的 `/` 处被认成结尾（`/[/]?/` 同理） |
| D5 | flags 只认 `m g i s u y` | `d`、`v` 被当成字面量之后的普通字符；TS 的 text 对它们是不拆的 |
| D6 | 关闭时 `SignOut(当前字符)` 而不是 `SignOut(source.Pre())` | 区间总是多吞一个字符（`x = /a/;` 得到 `[4,7]`，应为 `[4,6]`） |
| D7 | 形状层完全没接：`ExpressionStatementPossibleShape.CanStart` 不认 `RegexToken`、`ExpressionBuilder.ParsePrimary` 不认 `RegexToken`、`RegularExpressionLiteralShape` 没有 `Text`/工厂、`RegularExpressionLiteralPossibleShape` 还是抛错桩 | 即使 token 对了也建不出形状：语句首位报「没有候选形状可以构成」，表达式位报「不支持的表达式起点」 |
| D8 | `typescript-template` 用 `Ban([RegexToken.Transit])` 把整个跳转禁掉（L27） | 现在 89 条除号用例是绿的，但那是「根本没跑正则判据」换来的；正则用例一条也收不进来 |

**为什么不能只在形状层补**：字符层的包夹与分号先于形状层发生。`/;/` 里的 `;` 会先把语句切断、`/(/`、`/[a-z]/` 里的括号会先进 `Bracket` 配对、`/[/]/` 更是连正文边界都错。等 `ExpressionStatementPossibleShape` 在 `;` 处把单元交给 `ExpressionBuilder` 时，token 流已经被切错，重扫也拼不回来。所以**正则必须先由 basic token 整体收走**，形状层只做「把已经收好的 RegexToken 转成形状」。

---

## 3. 实测：去掉 Ban 而不改判据会怎样

`typescript/cases/regex.ts` 共 256 条，按 TS AST 分成两组：**该当正则 167 条、该当除号 89 条**。用两个模板各跑一遍（`Ban` 保留 / 去掉，判据不变）：

| | 该当正则 167 | 该当除号 89 |
| --- | --- | --- |
| 现在（Ban 开） | **0 通过**（全部抛错或静默错树） | **89 通过**（Ban 拦掉了判据） |
| 只去掉 Ban（判据不变） | 9 条「不抛异常」但全部是**静默错树**，158 条抛错 | **13 正常 / 68 被误判成 `RegexToken` / 8 其它失败** |

典型错树（`RegexToken` 出现在本不该出现的地方，且把后面的 `;` 一起吞掉）：

```text
a / b;        → <Common>a</Common><RegexToken r=2-5 temp=" b;">
(a) / b;      → <Bracket r=0-2>…</Bracket><RegexToken r=4-7 temp=" b;">
f() / b;      → <Common>f</Common><Bracket r=1-2/><RegexToken r=4-7 temp=" b;">
x = a / b;    → <Common>x</Common><Symbol>=</Symbol><Common>a</Common><RegexToken r=6-9 temp=" b;">
x = /a/ / 2;  → 不抛异常，但只剩 <Common>x</Common><Symbol>=</Symbol><RegexToken r=4-7 .../><RegexToken r=8-11 temp=" 2;">（没有 ExpressionStatement）
```

正则 token 自身的词法错误也能在树里直接看到（用无 Ban 模板逐字符探针得到）：

| 源码 | 实际得到的 RegexToken | 应该是 |
| --- | --- | --- |
| `x = /a/;` | `[4,7]`（多吞 `;`） | `[4,6]` |
| `x = /a/g;` | `[4,8]`（多吞 `;`），`Flags="g"` | `[4,7]` |
| `x = /a/d;` | `[4,7]`，`d` 落成独立的 `Common`（D5） | `[4,8]`，`Flags="d"` |
| `x = /[/]/;` | `[4,7]`、`Temp="["`，第二个 `/` 被当结尾（D4） | `[4,8]`、`Temp="[/]"` |
| `x = /\//;` | `[4,7]`、`Temp="\"`（D3，第一个字符没进转义态） | `[4,7]`、`Temp="\/"` |
| `/a/;`（语句首） | token 正确，但 `CanStart` 拒绝 → 抛「没有候选形状可以构成」 | 形状层认它 |

---

## 4. 改造方案

### 4.1 职责切分

| 层 | 负责 | 不负责 |
| --- | --- | --- |
| `RegexToken` | 收字符、维护转义 / 字符类 / flags、区间与 `Text` 数据 | 判断「这个 `/` 该不该起正则」的最终语义 |
| 语言模板（新增 `RegexTemplate`） | flags 字符集、哪些关键字 / 记号之后可以起表达式 | 语言无关的状态机 |
| 语法上下文（`RegexStartAfter` 位置登记） | 控制头 `)`、裸块 `}` 之后「紧邻的下一个代码单元可以起表达式」 | 词法 |
| `ExpressionBuilder` / 形状 | 把 `RegexToken` 转成 `RegularExpressionLiteralShape`、填 `Text` | 字符切分 |

### 4.2 起点判据（D1 / D2 的解法）

把「上一个**代码**单元」取出来（跳过 `WrapSymbol` / `AreaAnnotation` / `LineAnnotation` 这些 trivia），再按 token 类型判：

```ts
// RegexToken.Transit 内，判据部分（示意）
// 1) 上一个字符不是 "/"、不可回退、或当前字符是 "/" → Undo（不变）
// 2) 从 Data 里那个 "/" 往前找，跳过 trivia，得到 lastCode（可能为 null），
//    再往前一个代码单元得到 previousCode（给 ! / ++ / -- 回看用）
// 3) forced = lastCode !== null && context.RegexStartAfter.has(lastCode.SourceRange.End.Index)   // §4.5 位置登记
// 4) allowed = forced || Template.RegexTemplate.CanStart(lastCode, previousCode)
// 5) !allowed → Undo
// 6) Undo 那个 "/" → SignIn(/ 的 source) → 挂载 → 把当前字符交给统一状态机
```

`CanStart` 的默认判据（core 里写死 token **类型**规则，关键字表由语言配置给）：

| lastCode | 判 | 理由 |
| --- | --- | --- |
| `null`（本单元还没有代码单元） | 正则 | 文件开头 / 括号内开头 / 重放后开头 |
| `Common` 且文本 ∈ `ExpressionKeywords` | 正则 | `typeof` `void` `delete` `new` `instanceof` `in` `return` `throw` `case` `do` `else` `yield` `await` …（ts 模板配置） |
| `Common` 其它（标识符 / 数字 / `true` / `false` / `null` / `this`） | 除号 | 操作数已结束 |
| `String` / `RegexToken` | 除号 | 操作数已结束 |
| `Bracket`（已关闭的 `(...)` `[...]` `{...}`） | 除号 | 括号整体是操作数；`{}` 作块的情况交给 §4.5 的位置登记 |
| `Symbol` 是 `!` / `++` / `--` | 看再前一个代码单元：前面是操作数 → 除号（后缀），否则 → 正则（前缀） | `a!/b` 是除号，`!/b/` 是正则；`a++/b` 是除号 |
| 其它 `Symbol`（`(` 开头其实进不了这里） | 正则 | `;` `,` `:` `?` `=` `+=` `&&` `=>` 等都以操作数开头 |

这条判据覆盖了 regex.ts 里的全部 256 条。把「§4.2 判据 + §4.3 状态机」写成一个离线模拟器（按字符流走一遍，再用 TS AST 对正则的 `start` / `text` 逐条核对），256 条里 167 条该当正则的位置与 `text`、89 条该当除号的「一个正则都没有」全部一致，**0 条不符**——也就是说 §4.2 / §4.3 改完，词法层面剩下的缺口只有 §4.5 那一族。

新增的 `RegexTemplate` 建议只放语言数据，不放进基本 token：

```text
# class RegexTemplate
## field Flags:Array<string> = ["g", "i", "m", "s", "u", "y"]
## field ExpressionKeywords:Array<string> = []
## method IsFlag:(value:string)=>bool
## method CanStart:(lastCode:Token | null, previousCode:Token | null)=>bool   // 默认实现见上表
```

`typescript-template` 里配 `Flags`（ts 至少 `d g i m s u v`；要对齐 TS 的 text 就按「ASCII 标识符字符」收）与 `ExpressionKeywords`。

### 4.3 词法状态机（D3 / D4 / D5 / D6 的解法）

建议把「收一个正文字符」收成**一个入口**，`Transit` 的首字符与 `ExitOrPre` 的后续字符都走它，杜绝 D3 这种「第一条路径忘了设状态」：

```text
method Consume:(context:SyntaxContext, source:Source)=>BranchStates
  v = source.Value
  1. 转义态（IsTranslate）：Temp += v；IsTranslate = false；Done
  2. 已见结尾 "/"（IsReadyToExit）：
       是 flag（RegexTemplate.IsFlag）→ Flags += v；Done
       否则 → SignOut(source.Pre())；TryToClose；Quit；ReloadMessage；Done
  3. v == "\"：Temp += v；IsTranslate = true；Done
  4. 字符类内（InClass）：
       v == "]" → InClass = false
       Temp += v；Done
  5. v == "["：InClass = true；Temp += v；Done
  6. v == "/"：IsReadyToExit = true；Done
  7. Temp += v；Done
```

要点：

- **`SignOut(source.Pre())`**：关闭发生在「结尾 `/` 之后的下一个字符」上，区间终点必须是上一个字符；`Pre()` 为 `null` 不可能（此时至少已有开头那个 `/`），但仍要留着判空。
- **`InClass` 只在字符类内抑制 `/` 的结尾语义**；`]` 本身照常进 `Temp`（TS 的 text 里保留原字符）。
- **EOF**：`/a/` 落在文件末尾时由 `SourceFileShape` 的收尾 `SignOut` 递归签出，`SourceRange.End` 已由基类补上；`Consume` 里不要假设一定会看到「下一个字符」。
- **数据出口**：加 `ToText():string`，返回 `"/" + Temp + "/" + Flags`；形状在 build 那一刻取走这个串（IMPORTANCE §3.5：basic token 的数据必须在 build 时提取到 shape 字段，token 用完即丢）。
- `Default` 里原来那次 append 收进 `Consume` 之后可以退役；`Append` 同样并入 `Consume`（`Transit` 里改为 `regexToken.Consume(context, source)`）。
- **`//` 永远是行注释**：`source.Value !== "/"` 与 `LineAnnotation` 排在前面双重保证，所以空正则只能写 `/(?:)/`；`/a/ // c` 里的 `//` 是注释（TS 相同）。
- **用例生成器的限制**：`ast-json.mjs` 的 `readCases` 会把行内**任何** `\n` 还原成真换行（L56），所以正则正文里的 `\n` 转义写不进用例；要收这一格得先改生成器（只还原行尾 / 整行的 `\n`）。本条不影响 §4.1 的 `Text` 口径。

### 4.4 形状层接入（D7）

1. `typescript/tokens/literals/regular-expression-literal-shape.xl.md`
   - 加 `field Text:string = ""`；
   - 加 `static method FromBasicToken:(token:RegexToken, context:SyntaxContext)=>RegularExpressionLiteralShape`：按 token 的 `SourceRange` 签入签出、`Text = token.ToText()`、`shape.TryToClose(context)`、`return shape`（与 `NumericLiteralShape.FromBasicToken` 同款）。
2. `typescript/tokens/statements/expression-statement-possible-shape.xl.md`
   - `CanStart`（L43）里加：`if (unit instanceof RegexToken) { return true; }`。
3. `typescript/tokens/expressions/expression-builder.xl.md`
   - 依赖里 import `RegexToken` 与 `RegularExpressionLiteralShape`；
   - `ParsePrimary`（L580）开头加：`if (unit instanceof RegexToken) { this.At++; const shape = RegularExpressionLiteralShape.FromBasicToken(unit as RegexToken, this.Context); shape.Pos = this.Positions[start]; return shape; }`。
4. `typescript/run/typescript-template.xl.md`
   - 删掉 `template.BranchTemplate.Ban([RegexToken.Transit])`（L27）与那段解释；
   - 配 `template.RegexTemplate`（§4.2）。
5. `typescript/tokens/literals/regular-expression-literal-possible-shape.xl.md`
   - 当前架构下**不需要**它：表达式语句在 `;` 处整体交给 `ExpressionBuilder` 重解析，正则只是 `ParsePrimary` 的一个分支。这个桩保持不动或后续删除，不要给它写 `BuildByIndex`（会与 `ExpressionStatementShape` 抢建）。

### 4.5 语法上下文那一族：**位置登记**，不是一次性开关

`if (x) /a/`、`{} /a/`、`while (x) /a/`、`return /a/` 这类位置，词法层看不到「控制头已结束、语句体开始」。这里不能放一个「下一次判据用我」的可变开关——开关的持有者是长期存在的上下文，消费点却分散在词法层的各条路径上，生命周期只能靠约定，约定一漏就是「隔了一段距离被消费」。具体漏法：

| 漏法 | 后果 |
| --- | --- |
| 登记了，但紧邻的下一个**代码** token 不是 `/`（是标识符 / `{` / 关键字） | 开关没人消费，残留到后面某个真正的除号上，把它强判成正则 |
| 登记了，但到 EOF 都没有下一个代码 token | 残留，下一次 parse 若复用上下文（当前是每次新建）或跨语句复用就会串味 |
| `ReloadMessage` 把同一个字符重放一遍 | 第一次消费后重放丢开关 → 该起的正则起不来；不消费则可能被消费两次 |
| `Undo` / `TryToClose` 把消费掉开关的那个 token 撤回 | 开关该恢复，但没有机制恢复 |
| 嵌套控制头先后登记 | 多个开关并存，"哪一个生效"依赖消费顺序 |

**改法：登记的是一段不可变的历史事实，不是一个待消费的开关。** 在 `SyntaxContext` 上放一个**源码下标集合**：

```text
# class SyntaxContext  （新增）
## field RegexStartAfter:Set<int> = new Set<int>()   // 这些下标之后紧邻的代码单元可以起表达式/语句
```

- **谁登记**：知道自己上下文的形状，在关闭那个「边界 token」时登记它的 End 下标。
  - `if` / `while` / `for` / `switch` 的控制头 `)` 关闭后 → `add(右括号的 End.Index)`；
  - 裸块 `}` 关闭后（下一格是新语句）→ `add(右花括号的 End.Index)`；
  - `else`、`do`、`case … :` 等语句关键字形状 → 登记关键字/冒号的 End；
  - **对象字面量 `}` 不登记**（后面该是除号），登记与否就是语法层的表态，不需要 `false` 值。
- **谁判定**：`RegexToken.Transit` 跳过 trivia 取 `/` 前最后一个代码单元 `last`，然后
  `forced = last !== null && context.RegexStartAfter.has(last.SourceRange.End.Index)`，
  `allowed = forced || Template.RegexTemplate.CanStart(last, previousCode)`。
- **生命周期为什么稳**：
  - **没有「消费」这一步**。寄存器只声明「这个边界之后紧邻的代码单元可以是表达式起点」这一静态事实；能不能生效取决于一个**可判定的邻接关系**——`/` 是否恰好紧挨着这个边界。只要中间插进任何别的代码单元，`last` 的 End 就不再等于登记下标，条件**永久**失效，构造上不可能隔一段距离被消费。
  - **幂等**：同一份输入、同一个位置，查询结果永远一样；`Reload` 重放不会丢、也不会重复消费；`Undo` 不需要恢复任何东西。
  - **无需清理**：Set 只增不减也不会误伤（失效条件是邻接关系，不是时间顺序）；规模是 O(控制结构数)，随 `SyntaxContext` 一起丢。要清理反而要引入时序判断，是 bug 来源。
  - **多个登记并存**：只有「与紧邻边界相等」的那一个会命中，嵌套控制头先后登记互不干扰。
  - **作用域无关**：登记的是源码下标，`/` 在哪个宿主单元的 `Data` 里都能查到同一个全局事实；括号内部的 `/`（`(` 之后没有前项）本来就走词法判据的 `null` 分支，不依赖登记。

- 剩余约束：形状必须在「它确实知道下一个单元是语句/表达式」的时刻登记；不确定就不登记（词法判据兜底）。`}` 的二义（对象字面量 vs 裸块）也由这一条表达：`({}) / b` 不登记 → 除号；`{} /a/` 块形状登记 → 正则。

- 在那之前，这族用例只写在 regex.ts 的「暂缓」注释里（已列：`if (a) /b/.test(c);`、`while (a) /b/;`、`{} /a/;`、`return /a/;` 等），不混进 256 条计数。

### 4.6 区间与 AST 口径（D6 的收尾）

- `RegexToken.SourceRange`：闭区间 `[首个 /, 最后一个 flag]`；
- `RegularExpressionLiteralShape.SourceRange` 同；`Shape.Pos` 沿用「前一个非 trivia 单元 `End.Index + 1`」（`ExpressionBuilder` 的 `Positions` 已经这么算）；
- AST 投影：`Pos = shape.Pos`、`End = shape.SourceRange.End.Index + 1`、`Text = shape.Text`；
- 对拍时 `ast-json.mjs` 的 TS 侧已经补上 `RegularExpressionLiteral.text`，`ast-json-diff.mjs` 的「字段」栏会直接比 `text`。

---

## 5. 改动清单（按依赖顺序）

| # | 文件 | 改动 | 对应缺陷 |
| --- | --- | --- | --- |
| 1 | `typescript/cases/regex.ts` | **本轮已加**：256 条（167 该正则 / 89 该除号），分组见文件 | 度量 |
| 2 | `typescript/cases/ast-json.mjs` | **本轮已改**：TS 侧 `text` 取样补 `ts.isRegularExpressionLiteral` | 度量 |
| 3 | `core/syntax/templates/regex-template.xl.md`（新增） | `Flags`、`ExpressionKeywords`、`IsFlag`、`CanStart` 默认判据 | D1 D2 D5 |
| 4 | `core/syntax/templates/template.xl.md` | `field RegexTemplate:RegexTemplate` | — |
| 5 | `core/syntax/syntax-context.xl.md` | `field RegexStartAfter:Set<int>`（§4.5 的位置登记；只增不消费） | §4.5 |
| 6 | `core/syntax/basic-tokens/regex-token.xl.md` | `Transit` 换成 trivia 跳过 + 位置登记 + 语言判据；`Consume` 统一状态机（转义 / 字符类 / flags / `SignOut(Pre())`）；`ToText` | D1~D6 |
| 7 | `typescript/run/typescript-template.xl.md` | 删 Ban；配 `RegexTemplate`（flags / 关键字） | D8 |
| 8 | `typescript/tokens/literals/regular-expression-literal-shape.xl.md` | `Text` + `FromBasicToken` | D7 |
| 9 | `typescript/tokens/statements/expression-statement-possible-shape.xl.md` | `CanStart` 认 `RegexToken` | D7 |
| 10 | `typescript/tokens/expressions/expression-builder.xl.md` | `ParsePrimary` 认 `RegexToken` + import | D7 |
| 11 | （后续）控制流形状 | 控制头 `)` / 裸块 `}` 关闭时 `RegexStartAfter.add(End.Index)` | §4.5 |

改完 3~10 后，正则用例的失败面应当只剩 §4.5 那一族（它们不在 256 条里）；除号 89 条必须仍是 89 条全绿——**这 89 条就是判据的回归网**，尤其 `a / b`、`a /* c */ / b`、`(a) / b`、`f() / b`、`a / /b/`、`x = a/b; y = /c/d;`、`a /= b`、`a!/b`。

## 6. 验收

```bash
node typescript/cases/ast-json.mjs regex
node typescript/cases/ast-json-diff.mjs regex
# 期望：用例 256：完全一致 256 / 256（text 字段在比较范围内）
node typescript/cases/ast-json-diff.mjs
# 期望：合计 637——现有 381 条不变，加上 regex 256 条全一致（合计 637 / 637）
xl check          # 0 error
npm run compile   # tsc 0 error
```

补充的边界（实现时应当一起过）：

- `/a/` 在文件末尾（无 `;`）——EOF 签出路径；
- `/a/ /* c */;`、`/a/; // c`——关闭后的 trivia / 行尾注释；
- `/a/ .test(b)`、`/a/\n.test(b)`——flags 与后缀之间允许 trivia；
- `/a/ / /b/`、`a / /b/`——正则与除号紧邻；
- `/\//`、`/\\/`、`/[\\/]/`、`/[/]/`、`/[//]/`——转义与字符类；
- `x = /a/d;`、`x = /a/v;`、`x = /a/gimsuy;`——flags 集合。

## 7. 附：正则体字符的状态表

| 字符 | 结尾 `/` 之前（正文） | 字符类 `[...]` 内 | 已见结尾 `/` 后 |
| --- | --- | --- | --- |
| `\` | 进转义态，下个字符原样收 | 同左 | 结束字面量（`\` 不能当 flag） |
| `/` | 置「已见结尾」 | **正文**（不结束） | 结束字面量 |
| `[` | 进字符类 | 正文 | 结束字面量 |
| `]` | 正文 | 退出字符类 | 结束字面量 |
| 字母 | 正文 | 正文 | flag（按 `RegexTemplate.IsFlag`） |
| 其它 | 正文 | 正文 | 结束字面量 |
