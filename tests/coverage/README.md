# tests/coverage —— **场景覆盖度**判据

这条判据回答的是**唯一**一个进度问题：

> 「一份普通的、没为本运行器改过的 `.ts`，**跑得对多少**、**读得对多少**？」

它不猜、不折算：**矩阵里每一条就是一个真跑的 `.ts` 文件**，五类各有各的尺子，
覆盖度 = 过关条数 / 条数（按类加权）。**逐轮的现场在 git 历史里**，这里只留今天的口径。

## 五类与两种尺子

| 类别 | 目录 | 权重 | 尺子 |
| --- | --- | --- | --- |
| `token` | `tests/cases/token/<功能域>/` | 15% | **AST 尺子**：逐节点对 `ts.createSourceFile` |
| `exec` | `tests/cases/exec/<功能域>/` | 25% | **执行尺子**：`node` 与 `tsrun` 各跑一遍，比 stdout 逐字节 + 退出码 |
| `runtime` | `tests/cases/runtime/<功能域>/` | 25% | 同上 |
| `stdlib` | `tests/cases/stdlib/<功能域>/` | 20% | 同上 |
| `e2e` | `tests/cases/e2e/<功能域>/` | 15% | 同上 |

**两种尺子、两套口径，都摆在这里**：

1. **执行尺子**（`exec` / `runtime` / `stdlib` / `e2e`）：裁判是**真 Node**——两个进程、
   两条完整链路、中间没有打桩；比 **stdout 逐字节 + 退出码**。`xl:args` 那一档
   给有运行期语义、类型剥离拒收的语法（`enum` / `namespace`）换 `--experimental-transform-types`。
   **裁判侧的源码每次现写**到 `.work-<pid>/src/<下标>.ts`（跑完就删），那一份目录里带一个
   `package.json`，**但它故意不写 `type`**（第 686 轮；原来写的是 `type: commonjs`）——
   `.ts` 的执行形态由**最近的** `package.json` 决定，而「最近的」对**入口点**与对
   **`import()` 进来的模块**是两回事：`node <文件>.ts` 拿 `type: commonjs` 先按 CJS 解析、
   失败再**按语法探测重试成 ESM**，批里那句 `await import()` **没有那一步重试**。
   于是显式 `type: commonjs` 会把 `export` / `import` / 顶层 `await` 的用例在批那一档判成
   语法错 ⇒ `nodefail` / `bad`。**不写 `type` ⇒ 两档都走语法探测、落到同一个模式**，
   而这一层仍在仓根那份 `type: commonjs` 之内，**松散模式那一半原样保住**
   （实测：同一条用例在两档下的 `this` / 冻结写 / `delete` 三个读数逐字相同）。
   **实测**（同一趟全矩阵，哨兵从 `type: commonjs` 改成不写 `type`）：
   `bad 3 → 0`（那 3 条各自回到真实判决：`006-module-export` pass、`007-module-import` differ、
   `056-l677p-dynamic-import` blocked），通过 **3520 → 3521**、`blocked 239 → 240`、
   `differ 40 → 41`，`regressions` 0。
   **第 687 轮全矩阵**（在那一轮加进来的 4 份新语料之上）：通过 **3521 → 3527**、
   `differ 41 → 43`、`bad` 仍是 **0**、`regressions` 0——那一轮收掉的是
   `Map` / `Set` / `Array` 三族**「长度被快照一次」**的七处静默错值
   （见根目录 README 第 687 轮那一段）。
   **第 688 轮全矩阵**（3 份新语料）：通过 **3527 → 3536**、`differ 43 → 37`、
   `blocked` 仍是 240、`bad` 0、`regressions` 0——收掉的是**内建构造自己的 `length`**
   那一格（十四格一起）与**函数 `length` / `name` 的描述符**那一条路
   （原来对函数是「响亮地抛」，一句异常带走整份文件）。
   **第 689 轮全矩阵**（3 份新语料）：通过 **3536 → 3538**、`differ 37 → 38`、
   `blocked` 240、`bad` 0、`regressions` 0——收掉 `Object.prototype.toLocaleString`
   （规范里只有一句转交，所以不写第二份实现），另把三格「转交 / 区域设置 / 正则」
   的成员原样登记进台账。
   **第 690 轮全矩阵**（3 份新语料）：通过 **3538 → 3544**、`differ 38 → 35`、
   `blocked` 240、`bad` 0、`regressions` 0——收掉三处**静默错值**：
   ① `Object(null)` / `Object(undefined)` 原来**原样返回那个原始值**（JS 给 `{}`，
      与无实参那一档同一句）；
   ② `Object.groupBy` 的分组表原来带 `Object.prototype`（JS 给 null 原型对象，
      而 `Object.create(null)` 那一档第 299 轮**早就落地了**，第 295 轮那句「表达不了」已过期）；
   ③ `typeof Object.prototype` 原来给 `"function"`（JS 给 `"object"`；第 228 轮把
      `Object.prototype` 与 `Function.prototype` **一起**认成了函数对象，前半句是错的）。
   ①②各收掉一条台账（`109-std-new-object-null` / `111-r676-std-object-groupby-prototype`），
   ③让 `117-names-object` 整条转绿；另有 3 条（`045` / `065` / `109`）是上一轮修好、
   这一轮才把台账撤掉的。
   **同一轮的第二批**（又 7 份新语料）：通过 **3544 → 3552**、`differ 35 → 34`、
   `blocked` 240、`bad` 0、`regressions` 0——包装对象的**内部标签**
   （`Object.prototype.toString.call(new Number(3))` 原来给 `[object Object]`；
   判据是**自有那一格 `__box` 在不在**，不是照原型认）让 `137-beh-boxed-primitives` 转绿；
   知名符号名单补齐七个（名字与协议是两件事）让 `150-sym-wellknown-presence` 转绿；
   另添一条**登记在案**的缺口（`138-object-tostring-arguments-gap`：本仓的 `arguments`
   就是一个数组 ⇒ 标签给 `[object Array]`、`Array.isArray` 给真，Node 两处都给「不是」）。
   **同一轮的第三批**（又 1 份新语料）：通过 **3552 → 3554**、`differ 34 → 33`、
   `blocked` 240、`bad` 0、`regressions` 0——`Promise.prototype` 补上 `then` / `catch` /
   `finally`（JS 里它们就在原型上，本仓原来只在实例上挂一份）让 `121-names-promise-proto`
   转绿，形状另立 `139-promise-proto-method-shape`。**同一批还试过 `Function.prototype`
   自己的 `length` / `name`**：挂上去那条转绿，却因为「可调用接收者先看 `protos.Function`、
   后看闭包载荷」的次序把**每一个函数**的 `name` / `length` 顶掉，
   **实测 40 条回归**（`089-function-tostring-and-name` 那种）——当场回退，
   量出来的话登在那一条的台账里。
   反过来**写成 `type: module`**也要不得：ESM 一律严格模式，而这一层语料的期望值全是照
   松散模式写的（`Object.freeze` 之后写属性静默、`delete` 不可配置属性该静默、
   非严格调用里 `this` 指向全局）——实测 `bad 3 → 12`、`differ 40 → 50`、通过掉到 3500、
   加权 **95.9% → 95.1%**。所以这里要的是**「没有显式 type」**，不是「显式换成另一个 type」。
   **第 691 轮全矩阵**（两批角落普查、106 份新语料）：通过 **3554 → 3644**、
   分母 **3827 → 3933**、`blocked 240 → 244`、`differ 33 → 45`、`bad` 仍 **0**、
   `regressions` 0——**加宽这一件事本身**收掉五个静默错值（`Object.create` 第二格实参
   在无原型那一支被 `return` 吃掉、`console.log` 印不可枚举属性、符号键不印、
   可枚举访问器与 `{}` 同形、匿名类给 `[class ]`），另登记八族新缺口
   （见 [tests/cases/README.md](../cases/README.md) 那一节）。**加权从 96.2% 掉到 95.8%**
   是登记缺口的账，不是回归：新收的 90 条通过是分子，14 条登记缺口也是分母。
   **同一轮的第二批**（又 25 份新语料、专问属性描述符那一族）：通过 **3644 → 3669**、
   分母 **3933 → 3958**、`differ 45`（**没涨**：新登记 3 条、收掉 3 条）、`bad` 0、
   `regressions` 0——收掉的是 `defineProperty` 的
   `ValidateAndApplyPropertyDescriptor` 那一段（含「没写的字段 = 不改」、
   「不可扩展上新建一格抛」）、`console.log` 的格式说明符、`sort` 把 `undefined`
   与洞排到最后；另把 `stdlib/object/116` 那条**量错了**的台账翻了过来。
   **同一轮的第三批**（又 34 份新语料、问微任务次序 / 生成器清理 / 迭代中改集合 /
   属性查询）：通过 **3669 → 3697**、分母 **3958 → 3992**、`blocked 244 → 245`、
   `differ 45 → 50`、`bad` 0、`regressions` 0——收掉两处**直接崩**的
   （`propertyIsEnumerable(符号)` 与 `hasOwnProperty(符号)` 整份脚本挂掉；
   `hasOwnProperty.call(null, …)` 该抛而答了假），另登记五族新缺口。
   （`tests/cases/package.json` 那一份是给「直接 `node <用例>.ts`」用的，实测改它**不影响**读数
   ——判据跑的是 `.work-<pid>/src/` 里现写的那一份。）
   **第 692 轮全矩阵**（两批角落普查、385 份新语料）：通过 **3697 → 4077**、
   分母 **3992 → 4377**、`blocked` **245（没涨**：新登记 1 条、收掉 1 条）、
   `differ 50 → 55`、`bad` 仍 **0**、`regressions` 0——**加宽这一件事本身**收掉四处：
   ① `o["f"]().v` 那一族**整段丢**（**静默错值**：打印出来的是那个函数自己）；
   ② `IsOperand` 不认 `Function`（`typeof function () {}` / `!function () {}` /
   `function () {} + 1` 三条一起断，第 328 轮补 `Class` 时漏的另一半）；
   ③ 补 `Function` 带出来的**后缀回归**（`function f() {} ++n`，同一轮当场收掉）；
   ④ `"abc".hasOwnProperty("length"|0)` 答假（与 `Object.hasOwn` 那一支**两套答案**）。
   另登记 6 条新缺口（见 [tests/cases/README.md](../cases/README.md) 那一节）。
   **加权 95.7% → 95.8%**：新收的 380 条通过是分子，6 条登记缺口是分母。
   **这一轮的量法**：原子探针的期望值**不写死在语料里**——一条只问一个表达式、
   由 `node` 现给答案，打印口径钉成 `typeof:值`（免得把控制台渲染那一族的已知缺口
   混进来），299 条一次量完只用 **~3s**（批：被测 1.8s、裁判 1.0s）；
   再按 `coverage:sweep --json` 的判决把候选写成**带文件头的真用例**
   （非 pass 的把 `xl:want` / `xl:why` 一起写进去）——「加宽」与「记缺口」是同一次动作，
   不靠人手抄。
   **同一轮（其二）又 150 条**（第二批原子探针：属性描述符与访问器 / `Array.prototype`
   的**泛用**写法 / 数字格式化 / `Math` 边角 / 类的 `super` 与私有名 / 解构与展开 /
   装箱与 `ToPrimitive` / 控制流）：通过 **4077 → 4217**、分母 **4377 → 4527**、
   `blocked` **245 没涨**、`differ 55 → 65`、`bad` 仍 **0**、`regressions` 0。
   **收掉五处**，其中一处是**函数返回 `undefined`** 的静默错值：
   ① 带标签的语句后面那一截被 `Statement` 壳吞掉（`SplitShell` 遇到 `Label` 一律让开
   —— 壳里剩下的连投影都轮不到）；② 多标签的循环（`first: second: for` +
   `break first` 报 `unknown label`，**整份脚本进不来**）；③ `(0.1).toPrecision()`
   抛 `RangeError`（规范对三格各有一套缺省口径，「不给实参」与「显式 `undefined`」
   是同一档）；④ `Object.getOwnPropertyDescriptor([1], 0)` 响亮地抛（键没过
   `ToPropertyKey`）；⑤ `Array.prototype.map.call(null, f)` 给普通 `Error`
   （JS 给 `TypeError`——`e instanceof TypeError` 分不出来）。
   另登记 10 条新缺口（**类数组接收者**那一族 8 条、函数的 `arguments` / `caller`、
   **计算键成员**）。加权 **95.8%**（两个数都在这一位）。
   **第 692 轮的四处修法都留了指纹**：`isCallFirstUnit`（投影层）、
   `IsOperand` 里的 `Function`（两份名单）、`SplitShell` 的标签头、
   `PendingLabels` / `LoopContext.Labels`（多标签）——四处的判据都在用例里钉着。
   **同一轮（其三）又 103 条**（第三批原子探针：闭包与作用域 / `this` 绑定 /
   承诺与 `async` / `Map`·`Set` 成员面 / 异常流转 / 字符串与模板）：通过
   **4217 → 4315**、分母 **4527 → 4630**、`blocked` **245 没涨**、`differ 65 → 70`、
   `bad` 仍 **0**、`regressions` 0——收掉的是 **`new Array(-1)` 抛普通 `Error`**
   （JS 抛 `RangeError`；同一支里 `new Array(1.5)` 原来**静默给 `[1.5]`**，
   判据改成「是不是 `0..2^32-2` 的整数」之后两档一起对上）。
   另登记 5 条：TDZ 的 `typeof`、松散模式原始值接收者**不装箱**（3 条）、
   `async` 函数的返回值不是承诺。加权 **95.7%**。
   **第 693 轮全矩阵**（第四批原子探针，两批共 555 份新语料）：通过
   **4315 → 4855**、分母 **4630 → 5185**、`blocked 245 → 250`、`differ 70 → 80`
   （那 15 条**全是新登记的**：`blocked` +5 / `differ` +10，**旧的一条都没动**）、
   `bad` 仍 **0**、`regressions` **0**、`moved` 0、`newlyPassing` 0——**收掉三处**：
   ① **对象解构写死的键走 `get_prop`**（`const { 0: a } = [7]` 与 `({ 0: b } = [7])`
   都给 `undefined`，JS 给 `7`；**两半一起**改成走 `get_index`，与 `arr["0"]` 同一条路）；
   ② **引号名的键在投影那一步整个丢掉**（`const { "x": a } = o` 的 `propertyName` 是
   `<String>`，而 `isNameNode` 只认 `Identifier` / `Keyword` ⇒ 降级层把**绑定名**当成了键
   ⇒ `undefined`；取法与 `specifierNameOf` 一字不差）；
   ③ **`break` 的目标从「块」放宽到「一切不吃标签的语句」**（`lbl: if (…) { break lbl; }` /
   `lbl: try { … } finally { … }` 原来都报 `unknown label`，**整份文件进不来**——
   第 234 轮那一支只认裸块；判据改成「体**吃不吃**标签」：循环五档 + `switch` 走
   `PendingLabels`，其余给一层 `BlockLabel`；**判据要穿过嵌着的标签看**，否则
   `first: second: for (…)` 的外层会被当成「不吃标签」，第 692 轮刚收掉的 `continue first`
   又会断）。三处各有判据钉着（`probe693b-d23` / `probe693b-s22` / `probe693b-s24` /
   `probe693-*` 那一族的对象解构与引号名键）。加权仍是 **95.7%**（分子 +540、分母 +555）。
   **第 694 轮全矩阵**（第五批原子探针 242 份新语料）：通过 **4855 → 5090**、
   分母 **5185 → 5427**、`blocked 250 → 251`、`differ 80 → 86`、
   `bad` 仍 **0**、`regressions` **0**、`moved` 0、`newlyPassing` **1**——收掉一处：
   **`return o.f?.()` 里那个 `return` 被吃进了被调者链**。`?.()`（可选调用）那一条规则
   往左走成员访问链找**被调者起点**时只按**类名**判（`IsChainLink` 认 `Identifier`），
   而那一刻 `return` 正是一个 `Identifier`（关键字升级还没轮到它）⇒ 被调者链成了
   `return . f`、产物的 `Method` 名字记成 `"return"`、`return` 成了它的第一个孩子
   ⇒ 降级期报 `name is not a local or a capture: return`（**整份文件进不来**；
   `typeof o.f?.()` 同一处，那一份报的是 `typeof`）。修法：给链的边界添一张
   **语句 / 一元关键字表**（`NonChainWords`），并且**只看左边那一格是不是点号**
   ——`o.return?.()` 里的 `return` 是**属性名**（生成器的 `it.return()` 遍地都是），
   `this` / `super` / 字面量**不进表**（它们可以是链的头）。
   那一条同时把第 693 轮登记的 `exec/expressions/probe693b-e49`
   （**连续两次可选调用** `o?.f?.()`）收掉了——`newlyPassing` 就是它，台账已撤。
   另登记 8 条（`blocked` +5 / `differ` +11，其中 8 条新登、3 条是同根探针收进矩阵）：
   `new ns.C()`（对象字面量里的类当构造器）、生成器 `return(7)` 的实参（**静默错值**）、
   迭代器对象没有 `next`、方法里箭头函数用 `super`、**数组下标不是自有属性**那一族
   （`defineProperty` 抛 / `hasOwnProperty(0)` 假 / `Object.assign([], [1,2])` 静默长度 0）、
   `JSON.stringify` 遇访问器给 `{}`。加权仍是 **95.7%**（分子 +235、分母 +242）。
   **第 695 轮全矩阵**（第六批原子探针 150 份新语料）：通过 **5090 → 5241**、
   分母 **5427 → 5577**、`blocked` **251 没涨**、`differ 86 → 85`、
   `bad` 仍 **0**、`regressions` **0**、`moved` 0、`newlyPassing` **1**——收掉一处：
   **`JSON.stringify` 遇到访问器给 `{}`**（**静默错值**，`{"a":1}` 才是 JS 的答案）。
   `JsonText` 那一趟**遇到访问器一律跳过**（四处 `PropertyKind.Accessor → continue`），
   而 `Object.values` / `entries` 第 655 轮就已经接上了「有 `call` 通道就**现读**」
   这条可选服务的纪律。修法：**读值收成一个方法**（`JsonMemberValue`：数据属性给
   `property.Value`、访问器走 `GetProperty` + `call`、读到的值当场 `JsonAnchor` 锚住、
   **没有通道时给 `null`** 让调用方跳过），四处调用点换成它。
   **同一个根还有第二个门**：`JsonKeyOrder` 那一趟也把访问器筛掉了——不放开它，
   次序表里根本没有那一格（实测：只改 `JsonText` 三处仍然给 `{}`）。
   `stdlib/object/probe694-o34` 转绿、台账已撤（`newlyPassing` 就是它）。
   **本批 150 条全 pass**（这一族没有别的缺口）。加权仍是 **95.7%**（分子 +151、分母 +150）。
   **第 696 轮全矩阵**（两批原子探针 152 份新语料：102 + 50）：通过 **5241 → 5395**、
   分母 **5577 → 5729**、`blocked 251 → 253`、`differ 85 → 81`、
   `bad` 仍 **0**、`regressions` **0**、`moved` 0、`newlyPassing` **5**——收掉的是
   **类数组接收者那一族**（`Array.prototype.map.call({ length: 2, 0: "a", 1: "b" }, f)`
   原来报 `this method needs an array receiver`）。**修法不是「每个方法都改成通用的」**
   （这一块有三十来个分派分支、全建在 `HeapArray` 上，一处一处改就是三十份会漂的判据），
   而是**先把接收者折成一个真数组**再走**下面同一段**：`ArrayLikeSnapshot` 做
   `ToObject` + 逐格 `HasProperty`（`length` 走 `ArrayLikeLength`，**在就是值、不在就是洞**，
   `{ length: 2 }` 折出来是**两个洞**——与 Node 一致），`HeapArray` 本来就表达得了洞
   （`SetHole` / `IsHole`），所以折出来的是**同构**的、不是近似值。
   **只接只读那一族**（`IsArrayLikeMethod`）；**会改接收者的那些**要写回那个对象，仍响亮地抛
   （`probe2-g10` / `g11` / `g14` 三条台账还在）。
   **两处不在预期里的**：① **第三个实参是原件**——JS 的回调收的第三个实参是 `O`（接收者），
   快照**不是**它，所以四处回调传的是留下的一份 `receiver`（不传的话
   `Array.prototype.map.call(o, (v, i, arr) => arr === o)` 会**静默给假**）；
   ② **`ToObject` 那一半**：`ArrayLikeLength` 一句 `if (!receiver.IsObject()) return 0`
   把**原始值一律当 0** ⇒ `Array.prototype.slice.call("abc")` 给 `[]`（Node 给 `["a","b","c"]`，
   第 692 轮登记的 `probe2-g12`）；`null` / `undefined` 要先挡成 `TypeError`，
   不然会被当成「没有 `length`」而**静默给 `[]`**。
   **实测**：`probe2-g02` / `g04` / `g08` / `g12` / `g15` 五条台账转绿、已撤
   （`newlyPassing` 就是这五条）；本批新登记 3 条（两格正则字面量 `blocked`、
   一格「展开不可迭代对象该给 `TypeError`」），所以 `blocked` +2、`differ` −4。
   第二批那 50 条**专钉这一处**（洞的四种口径、接收者身份、文本接收者、
   原始值接收者、数组接收者原样），**全 pass**。加权 **95.7% → 95.8%**
   （分子 +154、分母 +152）。
   **第 697 轮全矩阵**（三批原子探针 159 份新语料：95 + 50 + 15）：通过 **5395 → 5543**、
   分母 **5729 → 5888**、`blocked 253 → 255`、`differ 79 → 90`、`bad` 仍 **0**、
   `regressions` **0**、`moved` 0、`newlyPassing` **2**——收掉的是
   **`Object.prototype.__proto__` 那个访问器**（第 678 轮就登在台账里的两格：
   `exec/decorators-modifiers/051-beh-proto-accessor` 与
   `exec/expressions/128-beh-setproto-change`）。**底下压着三小处**：
   ① **读**那一支要一个取法，于是把 `Object.getPrototypeOf` 的取法抽成 `PrototypeOfValue`
   两支共用（规范里 `__proto__` 的正身就是一句转交）；
   ② **`RtSetProto` 把 `null` 与「随便什么非对象」挤在同一句 `return receiver` 里** ⇒
   `Object.setPrototypeOf(o, null)` **静默不断链**（Node 给 `undefined null`、本仓给
   `base { tag: 'base' }`）；③ **最要紧的那一处**：`SetPropertySearched` 判 setter 能不能调
   用的是 `property.Setter.IsCallable()`，而**语言层往内建身上挂的 setter 是宿主引用**、
   `Value.IsCallable()` 看不到它 ⇒ **继承来的宿主 setter 永远不调**，
   `o.__proto__ = p` 被静默当成「写了不存在的名字」。**读那一侧第 601 轮就修过了**
   （`ReadProperty` 用的正是 `IsCallableValue`，注释里写着「实测撞到的」）——
   **同一个根长在两条路上、只修了一条**。
   修完当场红三条 JSON 用例（`038` / `044` / `061`），引出最后一处：
   **「按数据造对象」不能走 `[[Set]]`**——`JSON.parse('{"__proto__": {…}}')` 在 JS 里造的是
   **普通自有属性**，而 `[[Set]]` 会沿链调 setter（去**改原型**），装库期还会撞上 `NeverCall`
   （`unreachable: installing a builtin never calls a function`，整份文件进不来）。
   原来那三条**只是碰巧过**。修法是 `props.xl.md` 添一格 `CreateDataProperty`
   （`SetHiddenProperty` 那一趟 + 三个标志全开），`JSON.parse` 与 reviver 两处换成它。
   本批另登记 13 条新缺口（`Error.stack`、`async` 函数那一层壳四格、
   `Promise` 实例上多一份自有 `then`、`Object.setPrototypeOf(o, 1)` 该抛而本仓不抛，
   以及两条 `blocked`：**函数体里的内建基类** `class M extends Error {}` 报
   `heap object is not an environment`、**查不到的名字**在降级期就报而不是运行期 `ReferenceError`）。
   第二批那 50 条**专钉原型这一格**（读/写/`null`/原始值接收者/自有属性遮蔽/枚举不可见/
   `for..in`/`JSON.parse` 的 `__proto__` 键/四档 `setPrototypeOf`/脚本 setter 走链），
   47 pass（一条 unhandled rejection 换成了合法形状、一条 `setPrototypeOf(o, 1)` 如实登记）。
   加权 **95.8% → 95.6%**（分子 +148、分母 +159）。
   **第 698 轮全矩阵**（一批原子探针 85 份新语料）：通过 **5543 → 5630**、
   分母 **5888 → 5973**、`blocked 255 → 256`、`differ 90 → 87`、`bad` 仍 **0**、
   `regressions` **0**、`moved` 0、`newlyPassing` **0**——收掉两处：
   ① **`async` 函数的返回值不是一个「真的承诺」**（第 692 轮登记的 `probe3-a12` 与第 697 轮
   新登的四条一起转绿）：它有 `then`（第 285 轮挂在实例上），可原型一直是 `protos.Object`
   ⇒ `instanceof Promise` 假、`Object.prototype.toString` 给 `[object Object]`、
   `.constructor` 没有。修法：`MakeAsyncPromise` **把原型接上 `protos.Promise`**、
   **不再在实例上挂那三个方法**（第 690 轮它们已经在 `Promise.prototype` 上——
   再挂一份的症状就是 `Object.getOwnPropertyNames(promise)` 多三格）；
   建库层的 `MakePromise` 照改（它那句「与 `Map` / `Set` 同一条口径」第 341 轮就过期了）。
   ② **裸块里带 `in` 的数组字面量整份文件进不来**：`{ const r = ["a" in o]; }` 报
   `unimplemented: expression TypeParameter`——`IsMappedKeyBracket` 的容器那一问
   只问了「父单元是不是一个 `{` 括号」，而**块的花括号与类型字面量的花括号是同一个类**
   ⇒ 整个数组被当成映射键、投成 `TypeParameter`。修法：花括号那一档再问一句
   「**本单元是不是它的第一个实义单元**」（与 `type-literal.xl.md` 的 `IsMappedTypeBrace`
   同一条判据，按类名判以避免环形 import）。**试过又退回来的一版**用括号自己的
   `Context === "type"`：真映射键那个 `{` 不是 `"type"`，六条 token 用例当场判成
   「缺 16 多 7」，`cases:tsast` 与 `coverage` 同时红——那一版没有留下。
   本批另登记 3 条：计算键是对象时的 `ToPropertyKey`（`blocked`）、
   `Object.defineProperty(数组, "1", …)` **静默不改元素**（`differ`，数组的元素住在
   `Elements` 上，而那一趟只扫属性表），以及**计算键写的 `__proto__` 会改原型**
   （`differ`，第 697 轮那个访问器带出来的：对象字面量的成员走 `[[Set]]`，
   而 JS 那一步是 `CreateDataProperty`——`props.xl.md` 里那一格已经有了，
   缺的是让降级层改走它并把键的 `ToPropertyKey` 一起搬过去）。加权 **95.7%**
   （分子 +87、分母 +85）。
   **第 699 轮全矩阵**（第十批原子探针 202 份新语料）：通过 **5630 → 5830**、
   分母 **5973 → 6175**、`blocked 256 → 259`、`differ 87 → 86`、`bad` 仍 **0**、
   `regressions` **0**、`moved` 0、`newlyPassing` **2**——收掉两处，另撤两条旧台账：
   ① **类字段写的是「赋值」而不是 `[[DefineOwnProperty]]`**（**静默错值**，
   第 128 轮就写在明处的那条已知差异）：`class A { get x() { return 1; } }` +
   `class B extends A { x = 2 }` ⇒ `new B().x` 本仓给 **`1`**、Node 给 **`2`**
   （字段被原型上的 getter 拦住，实例上那一格**根本没造**）；反面是父类有 setter 时
   **去调了它**。修法：语言层添一格内部调用 `define_data`（号 713）落在
   `props.xl.md` 的 `CreateDataProperty` 上（第 697 轮给 `JSON.parse` 立的那一格），
   **实例 / 静态 / 计算键三条字段路一起换**；`#私有字段` 仍走 `set_hidden`
   （JS 里它不是一个属性）。同一处顺手把 `set_hidden` 的键过一遍 `ToPropertyKey`
   （`class A { [1 + 1]() { … } }` 的**数字计算键**原来报
   `set_hidden with a key that is not a string or a symbol`，**整个类进不来**）——
   台账 `exec/classes/probe2-k14` 转绿、已撤。
   ② **具名类表达式那一层环境没开**（**整份文件进不来**）：
   `const A = class Named { static y = 2 }` 报 `env_leave with no parent environment`——
   `HasNamedExpression` 只认 `FunctionExpression`（类的体只是被**走进去**找具名函数），
   而 `LowerClass` 里 `env_new` → … → `env_set` → `env_leave` 那三步的最后一步要求
   这一帧有环境。加上 `ClassExpression` 之后，静态字段里的类名也**当场**读得到：
   `class Named { static y = Named.name }` 原来读成 `undefined`（报
   `cannot read properties of undefined`），因为 `env_set` 排在**静态成员之后**——
   写值那一步挪到构造函数出来之后、`env_leave` 留在最后（规范里内层绑定在静态元素
   求值之前就指向那个构造函数）。台账 `exec/classes/probe-c09` 转绿、已撤
   （`newlyPassing` 就是这两条）。
   本批另登记 4 条新缺口（`blocked` +3 / `differ` +1）：**内建构造当基类**
   （`class A extends Array { }` 的 `super(...)` 报 `heap object is not an environment`，
   与 `class M extends Error {}` 同根）、**`class B extends null {}`**（继承目标那一趟
   只按名字解析 ⇒ `name is not a local or a capture: null`）、**`super()` 之前读 `this`**
   （JS 抛 `ReferenceError`，本仓给 `undefined`）、**字符串搜索族的实参没走 `ToPrimitive`**
   （`"abc".includes({ toString() { return "k"; } })` 报
   `unimplemented: ToString of this kind of value`，同一族还有
   `indexOf` / `startsWith` / `endsWith` / `replace` 的模式位）。加权 **95.75% → 95.78%**
   （分子 +199、分母 +202）。
   **第 700 轮全矩阵**（第十一批原子探针 158 份新语料）：通过 **5830 → 5969**、
   分母 **6175 → 6333**、`blocked 259 → 258`、`differ 86 → 106`、`bad` 仍 **0**、
   `regressions` **0**、`moved` 0、`newlyPassing` **1**——收掉一族**静默错值**：
   **字符串方法一次都没转换自己的实参**。
   **文本那一半**（`searchString` / `pattern` / `replacement` / `separator` /
   `localeCompare` 的 `that` / `concat` 的每一项）直接走 `JsTextUnits`（**引擎的**
   `TextUnitsOf`，对对象当场抛），而且把**缺实参**当**空串**——JS 那一步是 `ToString`：
   `"abc".includes({ toString() { return "b"; } })` 该给真（本仓报
   `unimplemented: ToString of this kind of value`）、`"abc".includes()` 找的是
   `"undefined"`（该给假，本仓给真）、`"abc".concat({ toString() { return "T"; } })`
   该给 `"abcT"`（本仓给 `"abc[object Object]"`）。
   修法：添一格 `TextArgUnits`（缺实参当 `undefined`；对象那一档走
   `ToPrimitiveOf` + `JsTextUnits`——与 `String(x)` **同一处**，不写第二份转换表），
   并把 `protos` 灌进 `InvokeString`：这一族有九个调用点，**再开九个号就是把同一件事抄九遍**，
   而 `InvokeString` 的调用点**只有一处**（`install.xl.md` 的分派那一行）。
   `replace` 的「不收正则」判据同时改成 JS 的 `IsRegExp`（`Symbol.match` 那一格可调才是正则）：
   原来「不是字符串就抛」把「不该静默当字面量」**过度执行**成了「连普通对象也不收」。
   **数值那一半**：共用的 `ArgOr` 原来把非数字**一律**当缺省值，而 JS 是
   `ToIntegerOrInfinity(ToNumber(v))` ⇒ `"abc".slice(true)` 给整串（Node 给 `"bc"`）、
   `"abc".repeat(true)` 给空串（Node 给 `"abc"`）；现在布尔与 `null` 各认一档，
   `undefined` **仍然**走缺省值（规范里可选实参「给了 `undefined`」与「没给」是同一档）。
   第 699 轮登记的那条（`stdlib/string/probe699-s-t08`）转绿、台账已撤
   （`newlyPassing` 就是它）。
   本批另登记 20 条新缺口（`differ` +20）：**`ArgOr` 不做 `ToNumber`**（13 条：
   `charAt("1")` / `charCodeAt({valueOf})` / `at("1")` / `slice({valueOf})` / `substring` /
   `substr` / `repeat({valueOf})` / `padStart({valueOf})` / `indexOf("b", {valueOf})` /
   `lastIndexOf`——`ToNumber` 要 `room` / `call` / `protos`，而这个取值器被**十几个内建共用**，
   是另一处活）、**`arguments` 那一族**（松散模式的形参双向别名、`arguments.callee`、
   `f.arguments`）、函数体开头的 `"use strict"` 没认、`call` / `apply` 的原始值接收者没装箱、
   形参默认值里的 TDZ，以及**往生成器里 `throw` 不走 `try/finally`**（`it.throw(err)`
   该先把挂起点外面的 `finally` 跑完再抛，本仓直接把它标成结束 ⇒ 清理一次都不跑）。
   加权 **95.78% → 95.62%**（分子 +139、分母 +158）。
   **第 701 轮全矩阵**（第十二批原子探针 100 份新语料）：通过 **5969 → 6069**、
   分母 **6333 → 6433**、`blocked 258 → 259`、`differ 106 → 105`、`bad` 仍 **0**、
   `regressions` **0**、`moved` 0、`newlyPassing` **2**——收掉两处：
   ① **函数体开头的 `"use strict"` 从来没认过**（**静默错值**）：第 620 轮那条注释写着
   「本仓只认**类体**这个严格源」，而 `(function () { "use strict"; return this === undefined; })()`
   在 JS 里是**真**、本仓给假（`this` 还是全局对象）。修法：降级层添一格
   `HasUseStrictDirective`（只认**开头那串**「字符串字面量且是表达式语句」——
   `("use strict")` 与放在别的语句之后的都**不是**指令），在**函数值**与**函数声明**
   两条路上一起记进 `item.IsStrict`；**函数声明那条路原来一格都不设** ⇒ 类体里嵌套的
   `function f() {}` 一直被当成松散（JS 的严格性沿词法继承）。
   **箭头不给指令序言这一档**：它的 `this` 是**词法**的（从外层环境格读），
   标成严格只会让引擎给帧一个 `undefined`。**引擎一侧一个字都没改**——它认的一直是这一位。
   ② **`break` / `continue` 会把**外层** `try` 的 `finally` 也跑一遍**（**静默多跑**）：
   `try { for (const x of [1, 2]) { s += x; if (x === 1) continue; } } finally { s += "f"; }`
   在 JS 里给 `"12f"`（`continue` 的目标**在 `try` 里面**，这次 abrupt completion
   没有离开那个 `try`），本仓给 `"1f2f"`。根子：`LowerContinue` / `LowerBreak` 调的
   `EmitPendingFinalies()` 发的是**当前词法位置在册的全部** `finally`，
   它分不清「在循环**里面**」（该跑）与「在循环**外面**」（不该跑）。修法：
   `LoopContext` / `BlockLabelContext` 各添一格 `FinallyDepth`（进那一层时外面挂着几层），
   `EmitPendingFinalies(from)` 只发 `>= from` 那几层；`return` 走缺省 `0`（它离开的是整个函数）。
   两条旧台账转绿、已撤（`newlyPassing` 就是它们）：`exec/functions/probe693b-f17`
   （第 692 轮登记的「`"use strict"`」）与 `exec/functions/probe700-f-e24`（第 700 轮登记的同一个根）。
   本批另登记 2 条新缺口：**没声明过的名字**在降级期就抛（JS 要到运行期才抛
   `ReferenceError`，第 692 轮那条的同一个根）、**模块顶层的 `this` 是 `undefined`**
   （裁判按 CJS 跑，那里 `this` 是 `module.exports`；本仓按 ESM 的口径给——
   箭头那一半本轮已经对齐）。加权 **95.62% → 95.66%**（分子 +100、分母 +100）。
   **第 703 轮全矩阵**（第十三批原子探针 303 份新语料）：通过 **6093 → 6374**、
   分母 **6439 → 6742**、`blocked 257 → 261`、`differ 89 → 107`、`bad` 仍 **0**、
   `regressions` **0**、`moved` **1**、`newlyPassing` **3**——收掉的是
   **对象字面量的数据成员走的是「赋值」而不是 `[[DefineOwnProperty]]`**（第 699 轮
   只改了**类字段**那一条路）。四条原子探针钉着它（`p703o-a45` / `a46` / `a47` / `a48`）：
   `({ get a() { return 1; }, a: 2 }).a` JS 给 `2`、本仓给 `1`（`[[Set]]` 撞上原型上
   那格只读访问器 ⇒ **静默不写**）；`({ ["__proto__"]: { z: 1 } }).z` JS 给 `undefined`、
   本仓给 `1`（**计算**键的 `__proto__` 是普通属性，`[[Set]]` 却去调了
   `Object.prototype` 上那个 setter ⇒ 原型被改掉）；另两条是同一处的另外两个面。
   修法：`LowerObjectLiteral` 里三条数据成员的路（非计算键的收尾、`PropertyAssignment`
   的计算键、`MethodDeclaration` 的计算键）从 `set_prop` / `set_index` 换成现成的
   `define_data`（`EmitDefineData` / `EmitDefineDataValue`，第 699 轮为类字段立的），
   **访问器那两档照旧走 `define_accessor`**，非计算的 `__proto__` 特例照旧走 `set_proto`
   ——规范里那一条特例恰好只管非计算的那一档。旧台账 `stdlib/object/probe698-f09`
   （计算键写的 `__proto__` 不改原型）当场转绿、已撤；另两条 `newlyPassing` 是
   同一条根上的 `exec/functions/probe700-f-e47` 与 `stdlib/array/probe693-a30`。
   唯一的 `moved` 是 `stdlib/object/probe698-b14`（`{ [o]: 1 }`，`o` 只有 `toString`）：
   形态从「整份文件进不来」变成**运行期抛、被 `try/catch` 接住**（stdout 非空 ⇒ differ），
   **读数变了、根没变**，台账已按现状改写。本批另登记 22 条新缺口（`blocked` +5 /
   `differ` +18，其中 `probe698-b14` 是 moved 不是新增）：`Reflect` 整个没有（4 条）、
   松散模式原始值接收者不装箱 / `bind` 的接收者不装箱（2 条）、闭包上缺 async 与
   generator 两位（`[object AsyncFunction]` 那一族，3 条）、**类的 `toString()` 打出整份源码**
   （1 条）、函数自己的 `arguments` / `caller` 两格（2 条，与 `stdlib/object/151` 同根）、
   `JSON.isRawJSON`（1 条）、`Map` 的内部载荷 `__k` 是可见自有属性（1 条）、
   `Math.f16round` / `Math.random`（2 条，与 `stdlib/math/044` 同根）、
   数组下标不是自有属性（1 条）、`String.prototype` 的 `match` / `search` / `matchAll`
   与字符串实参转 `RegExp`（4 条）。加权 **95.8% → 95.7%**（分子 +281、分母 +303）
   ——新登记缺口的账，不是回归。
   **第 704 轮全矩阵**（第十四批原子探针 208 份新语料）：通过 **6374 → 6583**、
   分母 **6742 → 6950**、`blocked 261 → 263`、`differ 107 → 104`、`bad` 仍 **0**、
   `regressions` **0**、`moved` **0**、`newlyPassing` **5**——收掉三处：
   ① `Math` 补上 **`f16round`**（交给宿主那一格，与 `fround` 同一条口径）与 **`random`**
      （同样交给宿主——本仓不自己写伪随机源：那会把一个「故意不确定」的东西做成确定的），
      `stdlib/math/044-names-math` 转绿；
   ② `Error` 的四个静态（`captureStackTrace` / `prepareStackTrace` / `stackTraceLimit` /
      `length`，走 `SetHiddenProperty`——Node 上这四格都**不可枚举**），
      `stdlib/error/031-names-error` 与 `probe-e09` 两条**一起**转绿；
   ③ **`new Error(undefined).message` 该是 `""`、本仓给 `"undefined"`**（**静默错值**）：
      规范那一步是「message 不是 `undefined` **才**挂那一格」，本仓无条件挂了。
      修法是把「挂不挂」收成 `NewErrorLike` 的一个参数（`hasMessage`），
      `Error` / `AggregateError` 两支 + 两个宿主调用点（`tsrun.xl.md` 的 `SetErrorFactory`、
      `install.xl.md` 的 `RaiseFromHost`）一起对齐。
   另清掉两条**第 702 轮就该撤**的旧台账（`exec/functions/probe700-f-e47`、
   `stdlib/array/probe693-a30`——`arguments` 那一轮修好、台账留着的）。
   本批另登记 4 条新缺口（`blocked` +2 / `differ` +2）：正则字面量两处（与第 703 轮
   `p703s-e33` 同根）、**类的 `toString()` 打印整份源码**（与 `p703f-g23` 同根）、
   `Error.stack` 那一格（与 `probe697-e11` 同根）。加权 **95.7% → 95.7%**
   （分子 +209、分母 +208）。
   **第 705 轮全矩阵**（第十五批原子探针 168 份新语料）：通过 **6583 → 6748**、
   分母 **6950 → 7118**、`blocked 263 → 264`、`differ 104 → 106`、`bad` 仍 **0**、
   `regressions` **0**、`moved` **0**、`newlyPassing` **0**——收掉两处：
   ① **类的 `toString()` 打出的是整份源码**（第 703 / 704 两轮各登记过一条探针，
      `p703f-g23` / `p704k-c12`）：根子在**合成节点没有 `[pos, end)`**，而
      `SourceText.slice(undefined, undefined)` **不抛也不给空串**，给的是**整份源码**。
      修法两处：`SourceSliceOf` 添一句「`pos` / `end` 不是数就给空串」（`typeof` 判据，
      不是「有没有这一格」），以及 `LowerClass` 把**整个 `class` 那一句**通过新的
      `PendingClassSource`（与 `PendingClassNode` 同一处挂、同一处撤）交给
      `LowerFunctionValue` —— 规范里 `A.toString()` 给的就是那一句，
      不是构造函数那一段、更不是整份文件。四条形态（具名 / 匿名 / 带显式构造函数 /
      `extends`）与 Node **逐字节相同**；
   ② **`Object.getOwnPropertyNames(1)` 该给 `[]`、本仓抛**（`p705o-b26`）：
      JS 那一步是 `ToObject`，只有 `null` / `undefined` 抛——与 `Object.keys`
      第 377 轮补的那两档**同一个口径**（`Object.keys(1)` 早就是好的，这一格漏了）。
   本批另登记 5 条新缺口（`blocked` +1 / `differ` +4）：`Reflect`（与第 703 轮同根）、
   **`Math` 的常量是可写的**（`Object.getOwnPropertyDescriptor(Math, "PI").writable`
   JS 给 `false`）、`Function.prototype.toString.call(内建)` 抛
   （与 `probe693-o46` 同一族）、`console.log(new Error(…))` 的栈
   （与 `001` / `probe697-e11` 同根）、展开不可迭代对象抛的是普通 `Error`
   而不是 `TypeError`（与 `probe696-i08` 同根）。加权 **95.7% → 95.7%**
   （分子 +165、分母 +168）。
2. **AST 尺子**（`token`）：裁判是 `ts.createSourceFile`，比**逐节点的 kind / 区间 / 字段名**，
   外加未映射 / 缺 range / 区间越界。它**不开进程**，而且借的是 `cases:tsast` 的**同一份实现**
   （`compareSource`）——两份实现就是两个口径。

## token 那两个数

`token` 原来只有一把**布尔门**（`cases:tsast`：八项全 0 才退出码 0），于是「还剩多少」在读数里看不见。
这里把它折成百分比，**两个数都报**：

- **A 逐文件完全一致**：每个文件的四方向 + 三栏地基都为 0（口径最严，含已登记缺口）。
- **B 没登记缺口的用例里全对的**：A 再排除 `xl:known-gap` 的用例。**加权用的是 B。**

**为什么要 B**：`xl:known-gap` 那 219 条是**已经量出来的缺口**，门把它们排除在八项之外
（否则门永远红，红里分不出「新坏了」与「本来就还没做」）。可「还差多少」不该跟着消失——
B 把分母定成「本来该全对的用例」，缺口另立一行报（**收掉一条涨一格**）。
这与执行尺子的台账（`xl:want`）同一精神。

`xl:ts-invalid`（故意写非法 TS，9 份）与 `.tsx`（4 份）**不进任何一边的分母**：
AST 尺子的裁判对它们没有基准。它们照样在语料里、照样被 `cases:check` / `cases:tags` 盯着。

## 跑一次

```bash
npm run coverage                                 # 五类全跑 + 覆盖度报告（写 report.json）
node tests/coverage/run.mjs --category stdlib    # 只看一类
node tests/coverage/run.mjs --filter array-      # 只看 id 里带这个子串的
node tests/coverage/run.mjs --list               # 只列 id（一类一行）
node tests/coverage/run.mjs --verbose            # 每条一行；配 XL_COVERAGE_SELFCHECK=1 另印自查
node tests/coverage/run.mjs --strict             # 只要有一条不是 pass 就红
node tests/coverage/run.mjs --no-batch           # 一条一个进程（权威口径）
node tests/coverage/run.mjs --emit-ledger        # 按现状打一份台账骨架（给人改，写进用例文件头）
```

全矩阵实测墙钟 **~37s**（16 核；第 693 轮加宽到 5185 条之后量到的数）。

## 三条纪律

1. **不许给 coverage 加缓存**：判定必须**只**由「今天的源码 + 今天的 node + 今天的 tsrun」决定，
   没有第二份状态参与。加速的路是下面第 2 条，不是记住上一趟的答案。
2. **跑 case 必须走批**：被测侧 `tsrun --batch 清单.json`、裁判侧 `judge-batch.mjs`。
   「一条一个进程」只允许出现在两个地方——`--no-batch`（权威口径）与
   「批里没交回结果的那几条按单条重跑」。判据是**进程启动 ≈ 100ms 且并发不省**，
   所以唯一的出路是**少起进程**。
3. **每个实例一个工作目录**（`tests/coverage/.work-<pid>`，跑完自删）：共用一份时，
   两个实例并行会互相 `rm -rf` 掉对方的输入，症状是「找不到输入文件」——
   看起来像用例坏了，实则是工具串了。

## 台账（写在**每个用例文件头**）

台账不另立文件：`xl:want` / `xl:skip` / `xl:why` / `xl:known-gap` **就在那一条用例自己的文件头**，
与它同生共死（第 685 轮从 `expectations.mjs` 搬进来的——那份 1481 行的清单与语料分开住，
改一条要记得改两处）。文件头文法见 [tests/cases/README.md](../cases/README.md)。

- `xl:want blocked` —— 进不了门（降级 / 装载 / 求值那一步就断了）；
- `xl:want differ` —— 跑得出来，但 stdout 或退出码不同（**多数是静默错值**）；
- 没登记的按 `pass` 算；
- `xl:skip <人话>` —— **口径外**（不进分母）。**只剩「裁判给不出来」那一档**
  （今天 1 条：装饰器，`node` 三种模式都拒收，没有基准可比）。

**台账不是免检单**：登记过的照样每次真跑。五种判决：

| 判决 | 含义 | 红不红 |
| --- | --- | --- |
| `ok` | 台账 pass、现在 pass | — |
| `known` | 台账 blocked/differ、现在还是 | —（还差多少由覆盖度那一栏说） |
| `MOVED` | 原来进不了门、现在跑得出来但还不对 | —（提示改台账） |
| `NEWLY-PASSING` | 台账记没过、现在过了 | —（提示删掉那一行） |
| `REGRESSION` | 台账记 pass、现在过不了 | **红** |
| `BAD-CASE` | `node` 自己都跑不动（用例写错了） | **红** |

也就是说：**红只红在「比昨天差」，不红在「还差多少」**。

token 那一侧的「登记」是 `xl:known-gap`，语义与 `xl:want blocked` 相同：
**登记过的照样每次真跑**，对上了就报「收掉了」并红，逼你去删那行指令。

## 怎么**加宽**矩阵

分母比分子重要，所以「加语料」不是随手往里塞——先**普查**：

```bash
# 1. 候选写在一个临时 .mjs 里（形状与用例一样：导出数组、每项 { id, title, src }）
# 2. 先量一遍：只留下裁判跑得动的，同时把缺口一次看全
npm run coverage:sweep -- tmp/cand.mjs
npm run coverage:sweep -- tmp/cand.mjs --json tmp/sweep.json   # 逐条读数落成 JSON
# 3. 把候选收进 tests/cases/<类别>/<功能域>/，元数据写成文件头
#    （xl:title / xl:want / xl:why / xl:round / xl:end）
npm run coverage
node tests/coverage/run.mjs --emit-ledger        # 按现状打一份台账骨架
# 4. 把骨架里那几行贴进**对应用例的文件头**——why 那一栏要**人写**（写根子，不是抄 stderr）
```

**为什么加宽要单独一个工具**：`run.mjs` 量的是**矩阵**，它要求每条都在台账里**有账**，
没登记的没过就是 `REGRESSION`（红）；而加宽的第一步恰好**还不知道哪些会过**——
拿 `run.mjs` 去试会得到一片红，红里混着「真坏了」与「本来就还没做」，读不出东西。
`sweep.mjs` 的口径与它**完全相同**（stdout 逐字节 + 退出码 + 真 `node` 当裁判），
只是**不写读数、不看台账、不红**。

## 一条用例的规矩

1. **一条只考一件事**，短、能读懂、**必须打印**（一行都不打印的「通过」等于没验）。
2. 输出要**确定**：不许 `Math.random` / `Date.now` / 无实参 `new Date()`。
3. 语料必须是**裁判跑得动的**普通 `.ts`：
   - `enum` / `namespace` / 构造函数参数属性 → `xl:args --experimental-transform-types`
     （它们有**运行期语义**，类型剥离只认能擦掉的语法）；
   - 装饰器 → 裁判给不出来 ⇒ 记 `xl:skip`，不记 `xl:want`。
4. `xl:skip` 只用于**口径外**（**裁判给不出来**）。「裁判跑得动、这边过不了」的一律进台账记
   `blocked` / `differ`——**`RegExp` / `BigInt` / 多文件加载 / 动态 `import()` 都是待做项**，
   不许写成 `skip`（第 685 轮已经把它们从 `skip` 拉回台账）。
5. **产物新鲜度**：规范比产物新就直接红（与 `runtime:check` / `runtime:cli` 同一条规矩）——
   判据读的是 `build/**/*.js`，跳过 `xl build` 量的是上一版。

## 与另外几条判据的分工

| 判据 | 量什么 |
| --- | --- |
| `npm run runtime:check` | 引擎的**机制**（IR / 堆 / GC / 帧 / 宿主） |
| `npm run runtime:cli` | **必须全过**的端到端语料（过不了的进不去） |
| `npm run cases:tsast` | token 层与真 TS 的 **AST 对拍**（**八条**全 0 的**门**） |
| `npm run cases:check` | 用例文件本身合不合格（文件头指令有没有写错） |
| `npm run cases:tags` | 用例自带的期望（`xl:expect` / `xl:absent`）对产物核实 |
| `npm run cases:shapes` | 用例**覆盖了哪些形状** |
| **`npm run coverage`** | **场景覆盖面**（含「现在过不了」的那些） |

前四条是**门**（过不了就红），这一条是**尺**——它把「还差多少」变成可复现的读数，
并把每一格的缺口写成一张**带原因的清单**（每条用例文件头的 `xl:why`，以及 `report.json`）。
各条的当前读数见根目录 [README](../../README.md) 的「当前状态」。

## 已知的账（**不是口径**，是待做项）

**口径外只剩「裁判给不出来」那一档**：装饰器 1 条、`xl:ts-invalid` 9 条、`.tsx` 4 条。
其余一律进分母，`RegExp` 族 7 条、`BigInt` 族 4 条、多文件导入 1 条、动态 `import()` 1 条、
`eval` 1 条、`Error` 的栈 1 条都记 `xl:want blocked|differ` + `xl:why`（写着「要做」）。

**3 条 `bad` 是运行形态问题，不是配置问题**：`exec/enums-namespaces/006-module-export`、
`007-module-import`、`stdlib/globals/056-l677p-dynamic-import` 都用 `import` / `export`，
而裁判侧显式是 `type: commonjs`（见上文）⇒ `node` 把它们当 CJS 跑、`export` 是语法错。
要修它得让裁判**按每个用例的形态选模式**——而那件事的代价已经量过了：
整层改成 ES 模块会连带把 20 条照松散模式写的期望值一起打掉（见上文那份实测），
所以这是个**要一起想清楚**的改动，不是改一个字段。
