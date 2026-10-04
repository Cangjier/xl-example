// **台账**：矩阵里每一条**现在的状态**。没有登记的按 `pass` 算。
//
// 两栏：
//   - `expect`: `"blocked"`（进不了门）/ `"differ"`（跑得出来但结果不同）——两者都算**没覆盖**；
//   - `why`: **这条为什么现在过不了**（一句人话，不是把 stderr 抄一遍）。
//
// 这一份是**账**，不是免检单：`expect` 登记了的那几条**照样每次真跑**，
// 跑过了判据会报 **NEWLY-PASSING**（提示把这一行删掉），
// 登记 `pass` 的哪天过不了则报 **REGRESSION**（红）。
// 所以红只红在「比昨天差」，不红在「还差多少」——**还差多少由覆盖度那一栏说**。

export const EXPECTATIONS = {
  // ===== runtime：引擎与语言层手里的那几张表 =====
  // **第 233 轮删掉了 `op-typeof-forms` 那一行** ✓（它过了 ✓）：
  // `typeof {a: 1}` / `typeof {}` 原来只给一个**孤零零的 `TypeOfKeyword`** ✗
  //（对象那一整棵子树根本不在产物里 ✗）。根子在**投影层前面一步** ✓：
  // `typeof` 在类型位那张「引出类型的词」名单里 ✓（类型查询 `type T = typeof x` ✓），
  // 于是那个 `{` 被 `TypeLiteralReorganization` 收成了 `TypeLiteral` ✓。
  // **怎么分**：`typeof x` 这个类型查询后面**永远跟标识符或成员链** ✓、**从不直接跟 `{`** ✗；
  // 紧跟 `{` 的只出现在**条件类型**里 ✓（`typeof x extends { a: 1 } ? T : F` ✓）——
  // 判据是「往前有没有 `extends`」✓（那一支原来就有的 `HasExtendsMarker` ✓）。
  // 同一条里 `IsStatementStart` 也补了 `typeof` ✓（那个 `{` 原来被判成**语句开头的块** ✗）。
  // ===== 第 219 轮补的一批：新盖到的形状里有四条是缺口（另六条当场通过）=====
  // **第 228 轮删掉了 `fn-call-apply-bind` 那一行** ✓（它过了 ✓）：根子是**闭包没有 `Proto`** ✗
  // （`vm.xl.md` 的 `MakeClosure` 补上了 ✓），另一半是 `Function.prototype` 上那三格
  // （`call` / `apply` / `bind` ✓，`globals.xl.md` 挂的 ✓）。
  // **第 229 轮又删掉三行** ✓：`gen-basics` / `gen-lazy-and-state` / `gen-try-finally` ✓——
  // 根子同样是**原型那一格不存在** ✗（生成器对象没有属性表 ✓，`it.next()` 只能沿原型链找 ✓），
  // 补的是 `protos.Generator` 那一格与它上面的 `next` ✓（`props.xl.md` / `globals.xl.md` ✓），
  // 而「走一步」那条路落在引擎里 ✓（`vm.xl.md` 的 `NextStepOf` ✓——走一步要发 `iter_next` ✓，
  // 那是**指令** ✓，宿主侧的内建调不到它 ✗）。
  // **第 243 轮删掉了 `cls-inherited-accessor` 那一行** ✓（它过了 ✓）：
  // 修的是 `super.v` 那一格 ✓——引擎补了一条 `get_prop_from` ✓（带接收者、从指定原型起读 ✓），
  // 降级层在**父节点**上认出 `super.v` ✓（名字在那一层 ✓，与 `super.m(...)` 同一处形状 ✓）。
  // 实测：`get v() { return super.v + 1 }` 给 `2` ✓、`super.m() + super.v` 混合着用给 `11` ✓
  // ——与 Node 逐字节相同 ✓。
  "fn-named-expression": { expect: "blocked", why: "具名函数表达式的名字没绑进函数自己那一层作用域" },
  // **第 247 轮删掉了 `prm-combinators` 那一行** ✓（它过了 ✓）：差的是 `Promise.all` 里**不是承诺的那几项** ✓（`Promise.all([Promise.resolve(1), Promise.resolve(2), 3])` ✓——第三项是裸数字 ✓）。JS 对每一项先做一次 `Promise.resolve` ✓；而这里原来把它**直接交给调度器** ✗ ⇒ 那一格永远不会被触发 ✓ ⇒ `remaining` 减不到 0 ✓ ⇒ 结果承诺**永不结清** ✓（打出 `1,2,` ✓，Node 给 `1,2,3` ✓）。**静默错值** ✓。
  "prm-async-await": { expect: "blocked", why: "`await` 一个**不是承诺**的值" },
  "prm-async-throw": { expect: "blocked", why: "`async` 函数里 `throw` 没有变成返回承诺的**拒绝**" },
  "prm-microtask-order": { expect: "differ", why: "微任务队列的次序（嵌套入队那一档）" },
  "gc-churn": { expect: "blocked", why: "**步数预算**：两万次循环就 `step budget exhausted`（普通循环够不着这个量级）" },

  // ===== exec：TS 形状 → 运行期语义 =====
  // **第 230 轮删掉了 `ex-enum-numeric` / `ex-enum-string` / `ex-enum-const` 三行** ✓（它们过了 ✓）：
  // `enum` 现在降级成一个**普通对象 + 一堆属性** ✓（`lowering.xl.md` 的 `LowerEnum` ✓）——
  // **没有新算子** ✓，拼的是 `NewObject` 与 `set_prop` 两样现成的 ✓。
  // **`const enum` 照普通 `enum` 做** ✓（**与 TS 的一处已知差** ✗：真正的 `const enum` 是
  // 编译期内联 ✓，而本仓造对象 ✓——结果值完全一样 ✓（判据比的就是值 ✓））。
  // **反向映射的两处判据** ✓：数值成员挂两格 ✓、字符串成员只挂一格 ✓；
  // 而**数值那一格的键要先字符串化** ✓（`set_prop` 的键只认字符串 / 符号 ✓）。
  // **另一处已知差** ✗：`A = 1 + 1` 那种**算出来的数**这一轮**不挂反向格** ✓
  //（`IsNumericInitializer` 只认「没有初始化式」与「数值字面量」两档 ✓——不猜 ✓）。
  "ex-namespace": { expect: "blocked", why: "`namespace` 没做（含嵌套与导出）——有运行期语义" },
  "ex-tagged-template-suffix": { expect: "blocked", why: "函数当 `ToPrimitive` 时该给**源码文本**（`Function.prototype.toString`）" },
  // **第 233 轮删掉了 `ex-typeof-value-expression` 那一行** ✓（它过了 ✓，与
  // `op-typeof-forms` 同一处 ✓）：它的第一项 `typeof ({}).toString` 原来把括号里的 `{}`
  // 投成了 **`TypeLiteral`** ✗（一个大括号被读成「类型」✓，而它是**值** ✓）。
  // **第 238 轮删掉了 `ex-computed-member-call` 那一行** ✓（它过了 ✓）：
  // 差的是**函数的显示形态**（`[Function: run]` ✓ vs `[Function (anonymous)]` ✗）。
  // 根子：`HeapClosure.Name` **一直没人填** ✗——于是**每一个脚本函数**在
  // `console.log` 里都是匿名 ✓（实测：`function greet(){}` 也是 ✓，而 Node 给 `[Function: greet]` ✓）。
  // 修法：`new_closure` 收**第三格**（名字 ✓，不给就是匿名 ✓、向后兼容 ✓），
  // 名字有三个来源 ✓——`FunctionNameHint`（`const arrow = () => 2` 那一档 ✓，
  // 名字来自**绑定的那一刻** ✓）、树上的真名 ✓、或者**匿名** ✓
  //（`"<arrow>"` / `"<function>"` 那两个占位符以 `<` 开头 ✓，那一档要当匿名 ✓——
  //  否则 `console.log(() => 1)` 会印 `[Function: <arrow>]` ✓，Node 印 `[Function (anonymous)]` ✓）。
  // **对象字面量的方法要把提示顶掉** ✓：`const o = { run() {} }` 里提示还留着 `o` ✓，
  // 不顶掉就印 `[Function: o]` ✓（实测踩过 ✗）。
  // **第 232 轮删掉了 `ex-spread-in-new` 那一行** ✓（它过了 ✓）：它的最后一句话是
  // `new Map([[1, 2]] as any)` ✓——**实参位里的 `as`** ✓。产物那边 `x as T` 是
  // **两格平级单元** ✓（`Identifier` 与 `As` ✓），而 `new` 的实参位原来走「逐格投」✗，
  // 于是 `As` 被单独投成一个**没有 `expression`** 的 `AsExpression` ✗。
  // 改成与 `CallExpression` 的实参位**同一个写法**（按顶层逗号切段、每段走 `Expression` ✓）之后，
  // 展开那两句（`new P(...args)` / `new P(...[3, 4])`）本来就是好的 ✓，整条跟着通了 ✓。
  // **第 239 轮删掉了 `ex-parameter-properties` 那一行** ✓（它过了 ✓）：
  // `constructor(public x: number, private y: number, readonly z = 0)` 之后
  // 三处一起错 ✓（`p.x` 是 `undefined` ✓、`p.sum()` 是 `NaN` ✓、`Object.keys(p).length` 是 `0` ✓）
  // ——因为**一样东西也没做** ✗。TS 把这三个形参**同时**声明成实例字段 ✓、
  // 并在构造函数最开头写 `this.x = x` 那三句 ✓。
  // 修法**不新写发指令的路** ✓：合成一棵最小的 `PropertyDeclaration`（名字 + 初始化式 ✓）、
  // 借现成的 `EmitFieldInit` ✓（它认的就是那一条 ✓），插在 `instanceFields` 最前面 ✓。
  // **已知差** ✗：`y = this.x * 10` 与参数属性的**交错次序**与 TS 不同 ✓
  //（本仓先发参数属性 ✓——判据量不到这一档 ✓）。
  // **它原来记的是 `differ`** ✓（门进得去、值是错的 ✓）——**静默错值** ✓，
  // 比「进不了门」危险 ✓；这一轮把它变成真答案 ✓。
  // **第 230 轮删掉了 `ex-yield-star` 那一行** ✓（它过了 ✓）：`yield*` 落成一段
  // **等价的循环** ✓（`lowering.xl.md` 的 `LowerYieldDelegation` ✓）——
  // 拼的是 `GetIterator` + `IterNew` + `IterNext` + `Suspend` / `Resume` 五样现成的 ✓。
  "ex-private-in-operator": { expect: "blocked", why: "`#x in o` 没做（私有名字的品牌检查）" },
  // **第 243 轮把 `ex-getter-setter-class` 从 `blocked` 改成 `differ`** ✓——
  // **这一条要分两半看** ✗：
  // - **`super.v` 那一半修好了** ✓（`b.v` 那一次读给 `2` ✓，与 Node 相同 ✓）；
  // - **剩下的那一半是「只读访问器上赋值」** ✗：`b.v = 5` 在 JS 里要看**模式**——
  //   **非严格是静默失败** ✓（Node 给 `undefined`，脚本继续跑 ✓），
  //   **严格才抛 `TypeError`** ✓。本仓**一律抛** ✓（`accessor without a setter` ✓）。
  //   **它为什么不是「顺手对齐」** ✗：那正是 `object-freeze` 那一族的**同一个根** ✓——
  //   要不要做严格 / 非严格模式是**一条设计决定** ✓（判据所在的 `.ts` 文件在 Node 那边
  //   是按 CommonJS 跑的 ✓、也就是**非严格** ✓），而本仓今天只有「响亮地抛」那一档 ✓。
  //   **所以它记成 `differ`** ✓（口径分歧 ✓），与 `object-freeze` 同一类 ✓。
  "ex-getter-setter-class": { expect: "differ", why: "`super.v` 已修（`b.v` 给 `2`）；剩下的是「只读访问器上赋值」——本仓一律抛，而 Node 在非严格模式下静默失败（与 `object-freeze` 同一个根：严格/非严格模式是一条设计决定）" },
  // **第 234 轮删掉了 `ex-labeled-block` 那一行** ✓（它过了 ✓）：
  // 根子是「**标签只挂循环与 `switch`**」✗（`PendingLabel` 由 `EnterLoop` 消费 ✓），
  // 而 `outer: { … }` 里**没有任何东西会来消费那个标签** ✓——于是原来那句
  // 「无论体是什么都要清」把它当场扔掉 ✓，`break outer` 报
  // `unknown label \`outer\` (the parser should have rejected this)` ✓
  //（那句话把责任推给语法层 ✗，而**它是合法的 JS** ✓）。
  // 修法：给「标签 + 块」单开一摞上下文（`BlockLabels` ✓），`break` 的跳转
  // **先记下标、块跑完一起回填** ✓（与 `LeaveLoop` 同一个写法 ✓）。
  // **别拿 `LoopContext` 顶替** ✗：那一摞还管着 `continue` 与「每轮新建绑定」✓，
  // 混进去会让块里的 `continue` 找到一层不是循环的东西 ✓（**静默错值** ✗）。
  // **嵌套逼出了「必须是一摞」** ✓：一格的话 `inner` 一进就把 `two` 顶掉 ✓——
  // 语料 `ex-labeled-block-nested` 钉着这一条 ✓。

  // ===== stdlib：内建成员与标准形状 =====
  // **第 234 轮删掉了 `array-spread-conditional` 那一行** ✓（它过了 ✓）：
  // 投影把 `[...xs.length ? xs : ys]` 记成 `ArrayLiteral > ConditionalExpression` ✓，
  // 而**三元的那一格「条件」是 `SpreadElement`** ✓（区间从 `...` 起算 ✓，
  // 所以 `...` 绑得比三元还紧 ✓）。`LowerConditional` 于是拿到一个 `SpreadElement` ✓，
  // 报 `unimplemented: expression SpreadElement` ✓（听起来像「`...` 没人支持」✗，
  // 而**别处的 `...` 都是好的** ✓）。
  // 修法：`LowerExpression` 顶上把裸位置上的 `SpreadElement` **剥掉** ✓——
  // 那三处**有语义**的位置（数组元素 / 调用实参 / 对象成员 ✓）各走各的路 ✓、
  // **不经过这一句** ✓，所以剥掉它们的信息不丢 ✓。
  // **剥掉是对的** ✗：三元 / 二元 / 一元**操作数**位置上的 `...` 在 JS 里本来就是语法错误 ✓，
  // 它能出现在那里只是因为外面的数组字面量已经认过它了 ✓。
  "object-freeze": { expect: "blocked", why: "**口径分歧**：本仓对只读属性**抛**（严格模式），node 把 `.ts` 当 CJS 跑是**松散模式**静默失败" },
  "object-freeze-array-element": { expect: "differ", why: "**静默错值**：冻住的数组还能 `push`（要动引擎的写屏障）" },
  "object-tostring-tag": { expect: "blocked", why: "`Object.prototype.toString` 只答了能证的那一格，`call` 这条形状过不去" },
  // **第 228 轮删掉了 `symbol-concat-throws` 那一行** ✓（它过了 ✓）：`TextUnitsOf` 对符号
  // 抛的是**宿主的 `TypeError`** ✓，而 `Guard` 现在按**宿主异常的类**认类别 ✓
  // （`ErrorKindType` / `ErrorKindRange` ✓），`tsrun` 的错误工厂把它翻成脚本的那一族 ✓——
  // 原来一律造 `Error` ✗（判据 `symbol-concat-throws` 现场红的 ✓）。
  //
  // **第 229 轮删掉了 `object-tostring-tag` 与 `symbol-tostringtag` 两行** ✓：
  // `Object.prototype.toString` 现在**先问 `Symbol.toStringTag`** ✓（`ObjectTagOverride` ✓），
  // 而 `Map` / `Set` / `Date` 三族的那一格是 `BuildGlobals` 挂上去的 ✓。
  // **顺序也摆正了** ✓：`Error` 那一族给的是 `"[object Error]"` ✓（**不是** `"Error: x"` ✗——
  // 那是 `Error.prototype.toString` 的答案 ✓，同一个值两个方法两个答案 ✓）。
  // **`symbol-hasinstance` 从 blocked 变成 differ 了** ✓：`static [Symbol.hasInstance](v)`
  // 这种**计算成员名**现在降级得出来 ✓（第 229 轮 ✓），差的是 `instanceof` 那头
  // **还没问那一格** ✗（引擎的 `RtInstanceOf` 只沿原型链找 ✓）。
  "symbol-hasinstance": { expect: "differ", why: "**第 229 轮做掉了一半** ✓：`static [Symbol.hasInstance](v) { … }` 这种**计算成员名**现在降级得出来 ✓（原来整份文件进不来 ✗）。差的是一半 ✗：`instanceof` 那头**还没问那一格** ✓——引擎的 `RtInstanceOf`（`rt.xl.md`）只沿原型链找 `C.prototype` ✓，「先问 `C[Symbol.hasInstance]`、有就调它」那条路没有 ✗。而那一格是**计算键** ✓、值是一个**闭包** ✓，要调它得有一条 `NativeCall` ✓（引擎里那一处只有 `room` ✓）——所以这一半不是一个顺手的小改 ✗。" },
  "symbol-tostringtag": { expect: "blocked", why: "`Symbol.toStringTag` 没装" },
  // **第 241 轮删掉了 `symbol-description` 那一行** ✓（它过了 ✓）：
  // 原来记的理由是「要挂在符号的**原型**上，而 `Protos` 表里没有符号那一格」✓——
  // **那一半是真的** ✓（符号既没有属性表 ✓、也没有原型那一格 ✓），
  // 而**结论绕了远路** ✗：既然符号**永远不会有**原型那一格 ✓，
  // 那一格就**只能由 `get_prop` 特判** ✓——**不必给引擎加一个符号原型** ✗。
  //
  // 做法与 `PrototypeKey` **一字不差** ✓：引擎**只认句柄** ✓，
  // `"description"` 这个字符串由语言层给 ✓（`vm.SetDescriptionKey` ✓ /
  // 驱动 `DeclareDescriptionKey` ✓），键**按内容比** ✓
  //（字符串不去重 ✗——比句柄永远不相等 ✓，`PrototypeKey` 那一处踩过同一个坑 ✓）。
  // **描述本身就在堆里那一格** ✓（`HeapSymbol.Description` ✓）⇒ 特判那一支**一格都不分配** ✓。
  // **没描述给 `undefined`** ✓、`Symbol("").description` 是**空串** ✓——判据是句柄是不是 `0` ✓。
  "console-log-special": { expect: "differ", why: "第 217 轮定性：这是**口径边界**，不是缺口——Node 对 `console.log(new Error(\"x\"))` 打的是**栈**（第一行 `Error: x`、后面是文件路径与行号），而栈**由宿主决定**、逐字节对不上是**必然**的（与 `Object.freeze` 那条严格/松散分歧同一类）。`Error.prototype.toString` 第 213 轮已经装上，`String(e)` / `e + 1` 都是对的。" },
  // **第 246 轮删掉了 `error-engine-throws` 那一行** ✓（它过了 ✓）：
  // 差的是「**引擎抛的错要能进脚本的错路**」✓——`(1 as any)()` 那一抛原来是
  // **引擎自己的** `Error` ✓（`catch` 接不住 ✓）。
  // 修法就是第 153 轮自己写下的那条正路 ✓：**让这一抛带上「是 `TypeError`」** ✓
  //（`Guard` + `ErrorKindType` ✓，引擎仍然不认识 `"TypeError"` 这几个字母 ✓）。
  // **两个入口都得改** ✗：`CallNative` 管 `Op.Call` ✓（`f(...)` ✓ 与 `(1 as any)()` ✓）、
  // `DoCallValue` 管 `Op.CallMethod` / `o?.m()` 那一族 ✓——只改一处的话
  // 同一个脚本里两条路的 `catch` 行为不同 ✓，而那**不报错** ✗。
  // **两处的收尾类型不一样** ✗（`CallNative =>Value` ✓ 交 `Value.Undefined()` ✓；
  // `DoCallValue =>void` ✓ 交裸 `return` ✓）——第 245 轮两次都配反了 ✓，
  // 这一轮**先把签名抄在手边** ✓ 才落笔 ✓。
  // **它同时松开了 `runtime:check` 里两条钉旧行为的断言** ✓
  //（「调一个数值要说清楚为什么不行」看的是那句 `non-closure` ✓、
  //  「没接上原型名字时要报出来」原来靠异常越过宿主那一层 ✓）——
  // 两条都改成看**新口径** ✓（结局是「脚本抛出」✓、话里仍然点名 ✓）。
  "promise-constructor": { expect: "blocked", why: "`new Promise(执行器)` 没做（要同步跑一次执行器 + 造两个宿主回调）" },
  "promise-chaining-errors": { expect: "blocked", why: "`.then` 回调里抛的错没接到拒绝链上" },
  // **第 247 轮删掉了 `promise-all-kinds` 那一行** ✓（它过了 ✓，与 `prm-combinators` 同一处 ✓）：`Promise.all([1, Promise.resolve(2), "3"])` 从 `mixed ,2,` ✓ 变成 `mixed 1,2,3` ✓。修法就是**包一个已兑现的承诺** ✓（`MakePromise(…, Fulfilled, item)` ✓，与 `PromiseResolve` 那一支一字不差 ✓）——**不直接调一步** ✗：那样 `all` 与 `race` 要各写一遍 ✓，而且同步调与承诺结清后调的**次序**会不同 ✓。
  "promise-async-await-forms": { expect: "blocked", why: "类里的 `async` 方法（`async method in a class`）" },
  // **第 232 轮删掉了 `global-boolean` 那一行** ✓（它过了 ✓）：
  // `new Boolean(false)` 在 JS 里是**真** ✓（任何对象都是真 ✓），
  // 而本仓原来把它按假算 ✗（`BooleanCtor` 只有「转真假」那一支 ✓）。
  // 现在构造那一支给一个**普通对象 + 一格隐藏的原值** ✓（`__b` ✓，
  // 用 `SetHiddenProperty` ✓——挂成普通属性的话 `Object.keys(new Boolean(1))` 当场给
  // `["__b"]` ✗，而 JS 给 `[]` ✓）。**已知差**：`String(new Boolean(false))` 在这里给
  // `"[object Object]"`，JS 给 `"false"`（那要 `Boolean.prototype.toString` / `valueOf`）。
  // **第 232 轮删掉了 `global-array-object-ctors` 那一行** ✓（它过了 ✓）：
  // 它卡过两处 ✓——先是 `new Object(null as any)` 的 `AsExpression` 那一层 ✓
  // （与 `ex-spread-in-new` 同一处 ✓），再是**最后那一句**
  // `new Object(null as any) !== null` ✓。JS 里 `Object(null)` 是 `null` ✓、
  // `new Object(null)` 是**一个空对象** ✓（构造那条路**永远**给新对象 ✓，实参完全不参与 ✓），
  // 而本仓的宿主 ABI 只有 `(id, self, args)` ✗——**分不出这两件事** ✗。
  // 修法：`vm.xl.md` 加一位瞬时的 `HostConstructing` ✓（`DoNew` 那两条宿主分支置上、
  // 调完立刻清掉 ✓），驱动把它当**最后一位**传进 `InvokeWithSink` ✓
  //（**公开契约不动** ✓——`HostInvoker` 是客户要照着实现的 ✓）。
  // **`Object` 这一格是唯一用它的人** ✓（`Array` / `String` / `Function` 两档本来就同义 ✓）。

  // ===== e2e：几族合起来 =====
  "e2e-event-emitter": { expect: "blocked", why: "类字段初始化器里引一个全局名（`new Map`）报「name used before its declaration」" },
  "e2e-async-workflow": { expect: "blocked", why: "`await` 一个非承诺值 + `async` 方法（同前面两格）" },
  "e2e-mixed-everything": { expect: "blocked", why: "**第 229 轮做掉了一半** ✓：类里的**生成器方法**（`*keys()`）现在降级得出来 ✓（原来整份文件进不来 ✗）——差的是同一个类里的 `async total(key)` ✗（`async method in a class` 照旧**响亮地抛** ✓）。**为什么 async 那一半不顺手做** ✗：`async` 的三条语义差写在 `lowering.xl.md` 文首 ✓——本仓的 `await` 挂的是**当前帧** ✓，所以调用者拿不到承诺 ✗；第 229 轮试过「把非承诺值包成已兑现承诺」那一半 ✓，判据**当场红两条** ✗（原来「响亮地抛」变成「静默 `undefined`」✗），于是退回来了 ✓。**那一整条要连着「async 函数返回承诺」一起做** ✗。" },
};
