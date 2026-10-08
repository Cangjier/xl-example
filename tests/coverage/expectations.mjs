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

  // ===== 第 338 轮：端到端加宽**新量到**的缺口（2 条）=====

  // **类数组只接了 `slice`**（第 335 轮）：那一轮把类数组那一档接上了，
  // 但**只接了 `slice`**（`join` / `indexOf` / `forEach` 那些整段建在 `HeapArray` 上）。
  // 这一轮加端到端语料时当场撞上：`Array.prototype.join.call(like, "/")` 报
  // 「this method needs an array receiver」。**修法与 `slice` 那一支一字不差**
  //（`ArrayLikeLength` + `ArrayLikeAt` + `JsElementUnits` 三个都现成，抄一遍就有）。

  // **异步那一族：微任务队列在「模块同步部分跑完之后」没有排空完**。
  // 实测（最小反例）：一个 `async` 生成器 + `for await` 的 IIFE + 三个先排好的微任务——
  // 那一趟**跑了够多的微任务让 IIFE 完成**，可 `queueMicrotask` / `after-await` / `then7`
  // **一个都没跑**（Node 全跑了）。**下一步从这里查**：驱动那一侧排空微任务的条件
  //（`DrainMicrotasks` 与宿主的事件循环那一圈），看它是不是**跑到「模块那一帧结束」就收手**。

  // ===== 第 336 轮：加宽语料时**新量到**的缺口（1 条）=====

  // **`return` 从 `for..of` 里出去，也要 IteratorClose**（第 336 轮量到）：
  // 这一轮把 IteratorClose 接上了，可只接了 **`break`** 那一档
  //（`break` 走的是 `LoopContext.Breaks`，落点在循环出口）；
  // **`return` 走的是另一条路**（`EmitPendingFinalies` 那一条只认 `finally`），
  // 所以 `for (const v of gen()) { if (…) return v; }` 里的 `finally` **还是不跑**。
  // **修法已经看得见**：`LowerReturn` 那一条也要把**在册的迭代循环**从里到外收一遍
  //（`this.Loops` 就在手上——只是那要区分「迭代循环」与「普通循环」，
  //  也就是给 `LoopContext` 再加一格）。**下一轮从这里接**。
  // ===== runtime：引擎与语言层手里的那几张表 =====
  // **第 233 轮删掉了 `op-typeof-forms` 那一行**（它过了）：
  // `typeof {a: 1}` / `typeof {}` 原来只给一个**孤零零的 `TypeOfKeyword`**
  //（对象那一整棵子树根本不在产物里）。根子在**投影层前面一步**：
  // `typeof` 在类型位那张「引出类型的词」名单里（类型查询 `type T = typeof x`），
  // 于是那个 `{` 被 `TypeLiteralReorganization` 收成了 `TypeLiteral`。
  // **怎么分**：`typeof x` 这个类型查询后面**永远跟标识符或成员链**、**从不直接跟 `{`**；
  // 紧跟 `{` 的只出现在**条件类型**里（`typeof x extends { a: 1 } ? T : F`）——
  // 判据是「往前有没有 `extends`」（那一支原来就有的 `HasExtendsMarker`）。
  // 同一条里 `IsStatementStart` 也补了 `typeof`（那个 `{` 原来被判成**语句开头的块**）。
  // ===== 第 219 轮补的一批：新盖到的形状里有四条是缺口（另六条当场通过）=====
  // **第 228 轮删掉了 `fn-call-apply-bind` 那一行**（它过了）：根子是**闭包没有 `Proto`**
  // （`vm.xl.md` 的 `MakeClosure` 补上了），另一半是 `Function.prototype` 上那三格
  // （`call` / `apply` / `bind`，`globals.xl.md` 挂的）。
  // **第 229 轮又删掉三行**：`gen-basics` / `gen-lazy-and-state` / `gen-try-finally`——
  // 根子同样是**原型那一格不存在**（生成器对象没有属性表，`it.next()` 只能沿原型链找），
  // 补的是 `protos.Generator` 那一格与它上面的 `next`（`props.xl.md` / `globals.xl.md`），
  // 而「走一步」那条路落在引擎里（`vm.xl.md` 的 `NextStepOf`——走一步要发 `iter_next`，
  // 那是**指令**，宿主侧的内建调不到它）。
  // **第 243 轮删掉了 `cls-inherited-accessor` 那一行**（它过了）：
  // 修的是 `super.v` 那一格——引擎补了一条 `get_prop_from`（带接收者、从指定原型起读），
  // 降级层在**父节点**上认出 `super.v`（名字在那一层，与 `super.m(...)` 同一处形状）。
  // 实测：`get v() { return super.v + 1 }` 给 `2`、`super.m() + super.v` 混合着用给 `11`
  // ——与 Node 逐字节相同。
  // **第 247 轮删掉了 `prm-combinators` 那一行**（它过了）：差的是 `Promise.all` 里**不是承诺的那几项**（`Promise.all([Promise.resolve(1), Promise.resolve(2), 3])`——第三项是裸数字）。JS 对每一项先做一次 `Promise.resolve`；而这里原来把它**直接交给调度器** ⇒ 那一格永远不会被触发 ⇒ `remaining` 减不到 0 ⇒ 结果承诺**永不结清**（打出 `1,2,`，Node 给 `1,2,3`）。**静默错值**。
  // **第 286 轮删掉了 `prm-async-await` 那一行**（它过了）：`async` 的三条语义差
  // （`lowering.xl.md` 文首那张表）这一轮**一起**做掉了——
  // ① 调用者立刻拿到承诺（`DoCallValue` 的 async 那一支：承诺在**开帧那一刻**就造好、
  // 当场写进调用者那一格，帧的 `ReturnSlot` 给 `-1`）；
  // ② `return v` / 体里抛的错 = 那个承诺**兑现 / 拒绝**（`DoReturn` 与 `DoThrow`
  // 各认 `AsyncPromise` 那一格）；③ `await` 一个**不是承诺**的值
  // （包一个已兑现的承诺、照样让出一个 tick，见 `DoAwait`）。
  // **顺带撞出四处「只有这个形状才现形」的**，四处都写进了规范：
  // 实参被承诺盖掉（写承诺要在铺参数**之后**）、`DoIterNext` 清掉机器级的 `Finished`
  // （`DrainMicrotasks` 要连它一起还原）、`DoThrow` 拒绝之后**必须收摊**
  // （不然「同步就抛的 async」会把整段脚本打断）、`MakeAsyncPromise`
  // （引擎自己造的承诺也得带 `then` / `catch` / `finally`）。
  // **第 286 轮删掉了 `prm-async-throw` 那一行**（它过了）：同一个根——
  // `boom().catch(…)` 现在接得到，`try { await boom() } catch (e)` 也接得到
  //（后者靠「只拒绝最里面那一个 async 帧」：外面那些要等拒绝顺着 `await` 传上去）。
  // **第 248 轮把这条的理由改准了**（原来记的是「次序」，**量下来次序是对的**）：
  // 判据是 `Promise.resolve().then(…)` 那一族，而**纯次序**那一面早就对——
  // 实测 `1 / 2 / 3 / 4` 三条普通 `.then` 与 Node 逐字节相同。
  // **真正坏的是「回调返回一个承诺」那一档**（这一条判据里正好是它）：
  // 回调体是 `{ console.log("4"); Promise.resolve().then(() => console.log("5")); }`，
  // 第 2 条那一整条**一句都不跑**（连 `4` 都没有）。
  // 根子在 `vm.RunNativeTask` 的收尾：回调跑完之后
  // `this.ResolvePromise(result, produced)`——`produced` 是回调**返回的那个值**，
  // 而它可能**自己就是一个承诺**。JS 的规矩是**采纳**它（结果承诺跟着内层那一档走，
  // `then(() => Promise.resolve(5)).then(v => …)` 里 `v` 是 `5`），
  // 本仓**把它当成一个普通值灌进去** ⇒ 结果承诺**带着一个承诺对象兑现了**
  // ⇒ 后面接的 `.then` 拿到的「值」是一个承诺、而**整条内层链的收尾也丢了**。
  // **第 249 轮把根子再往前提了一步**（第 248 轮记的是「采纳」，**那一半是真的、但不是第一因**）：
  // 给 `AdoptInto` 那一支插了一句探针，**它一次都没打印** ⇒
  // 这一条链**根本走不到「回调的返回值」那一步**——
  // 它在**回调跑完之后、收尾之前**就出事了（`cannot read properties of undefined`）。
  // **所以采纳要修，而它前面还有一个更要紧的缺口**。

  // ===== exec：TS 形状 → 运行期语义 =====
  // **第 230 轮删掉了 `ex-enum-numeric` / `ex-enum-string` / `ex-enum-const` 三行**（它们过了）：
  // `enum` 现在降级成一个**普通对象 + 一堆属性**（`lowering.xl.md` 的 `LowerEnum`）——
  // **没有新算子**，拼的是 `NewObject` 与 `set_prop` 两样现成的。
  // **`const enum` 照普通 `enum` 做**（**与 TS 的一处已知差**：真正的 `const enum` 是
  // 编译期内联，而本仓造对象——结果值完全一样（判据比的就是值））。
  // **反向映射的两处判据**：数值成员挂两格、字符串成员只挂一格；
  // 而**数值那一格的键要先字符串化**（`set_prop` 的键只认字符串 / 符号）。
  // **另一处已知差**：`A = 1 + 1` 那种**算出来的数**这一轮**不挂反向格**
  //（`IsNumericInitializer` 只认「没有初始化式」与「数值字面量」两档——不猜）。
  // **第 233 轮删掉了 `ex-typeof-value-expression` 那一行**（它过了，与
  // `op-typeof-forms` 同一处）：它的第一项 `typeof ({}).toString` 原来把括号里的 `{}`
  // 投成了 **`TypeLiteral`**（一个大括号被读成「类型」，而它是**值**）。
  // **第 238 轮删掉了 `ex-computed-member-call` 那一行**（它过了）：
  // 差的是**函数的显示形态**（`[Function: run]` vs `[Function (anonymous)]`）。
  // 根子：`HeapClosure.Name` **一直没人填**——于是**每一个脚本函数**在
  // `console.log` 里都是匿名（实测：`function greet(){}` 也是，而 Node 给 `[Function: greet]`）。
  // 修法：`new_closure` 收**第三格**（名字，不给就是匿名、向后兼容），
  // 名字有三个来源——`FunctionNameHint`（`const arrow = () => 2` 那一档，
  // 名字来自**绑定的那一刻**）、树上的真名、或者**匿名**
  //（`"<arrow>"` / `"<function>"` 那两个占位符以 `<` 开头，那一档要当匿名——
  //  否则 `console.log(() => 1)` 会印 `[Function: <arrow>]`，Node 印 `[Function (anonymous)]`）。
  // **对象字面量的方法要把提示顶掉**：`const o = { run() {} }` 里提示还留着 `o`，
  // 不顶掉就印 `[Function: o]`（实测踩过）。
  // **第 232 轮删掉了 `ex-spread-in-new` 那一行**（它过了）：它的最后一句话是
  // `new Map([[1, 2]] as any)`——**实参位里的 `as`**。产物那边 `x as T` 是
  // **两格平级单元**（`Identifier` 与 `As`），而 `new` 的实参位原来走「逐格投」，
  // 于是 `As` 被单独投成一个**没有 `expression`** 的 `AsExpression`。
  // 改成与 `CallExpression` 的实参位**同一个写法**（按顶层逗号切段、每段走 `Expression`）之后，
  // 展开那两句（`new P(...args)` / `new P(...[3, 4])`）本来就是好的，整条跟着通了。
  // **第 239 轮删掉了 `ex-parameter-properties` 那一行**（它过了）：
  // `constructor(public x: number, private y: number, readonly z = 0)` 之后
  // 三处一起错（`p.x` 是 `undefined`、`p.sum()` 是 `NaN`、`Object.keys(p).length` 是 `0`）
  // ——因为**一样东西也没做**。TS 把这三个形参**同时**声明成实例字段、
  // 并在构造函数最开头写 `this.x = x` 那三句。
  // 修法**不新写发指令的路**：合成一棵最小的 `PropertyDeclaration`（名字 + 初始化式）、
  // 借现成的 `EmitFieldInit`（它认的就是那一条），插在 `instanceFields` 最前面。
  // **已知差**：`y = this.x * 10` 与参数属性的**交错次序**与 TS 不同
  //（本仓先发参数属性——判据量不到这一档）。
  // **它原来记的是 `differ`**（门进得去、值是错的）——**静默错值**，
  // 比「进不了门」危险；这一轮把它变成真答案。
  // **第 230 轮删掉了 `ex-yield-star` 那一行**（它过了）：`yield*` 落成一段
  // **等价的循环**（`lowering.xl.md` 的 `LowerYieldDelegation`）——
  // 拼的是 `GetIterator` + `IterNew` + `IterNext` + `Suspend` / `Resume` 五样现成的。
  // **第 270 轮删掉了 `ex-private-in-operator` 那一行**（它过了）：
  // 差的是 **`#n in o`**（私有名的**品牌检查**）——它报的是
  // `unimplemented: expression PrivateIdentifier`，**整份文件进不来**，
  // 而 `#n` 那些**读写**一直是好的（第 195 轮就通了）。
  // **修法只有一处**：本仓的私有名**就是属性名**（第 195 轮定的口径——
  // `this.#n` 与字段同键、`KeyUnitsOf` 对 `PrivateIdentifier` 取的就是 `text`，
  // 也就是 `"#n"` 那个带井号的字符串），所以 `#n in o` **就是 `"#n" in o`**——
  // **照 `in` 那一支办就行**，不必另开一条路。
  // **次序要紧**：这一支必须排在**求值左边之前**（`LowerExpression(PrivateIdentifier)` 会抛），
  // 所以左边那一格在这一支里**直接发一条常量**。
  // **第 243 轮把 `ex-getter-setter-class` 从 `blocked` 改成 `differ`**——
  // **这一条要分两半看**：
  // - **`super.v` 那一半修好了**（`b.v` 那一次读给 `2`，与 Node 相同）；
  // - **剩下的那一半是「只读访问器上赋值」**：`b.v = 5` 在 JS 里要看**模式**——
  //   **非严格是静默失败**（Node 给 `undefined`，脚本继续跑），
  //   **严格才抛 `TypeError`**。本仓**一律抛**（`accessor without a setter`）。
  //   **它为什么不是「顺手对齐」**：那正是 `object-freeze` 那一族的**同一个根**——
  //   要不要做严格 / 非严格模式是**一条设计决定**（判据所在的 `.ts` 文件在 Node 那边
  //   是按 CommonJS 跑的、也就是**非严格**），而本仓今天只有「响亮地抛」那一档。
  //   **所以它记成 `differ`**（口径分歧），与 `object-freeze` 同一类。
  // **第 234 轮删掉了 `ex-labeled-block` 那一行**（它过了）：
  // 根子是「**标签只挂循环与 `switch`**」（`PendingLabel` 由 `EnterLoop` 消费），
  // 而 `outer: { … }` 里**没有任何东西会来消费那个标签**——于是原来那句
  // 「无论体是什么都要清」把它当场扔掉，`break outer` 报
  // `unknown label \`outer\` (the parser should have rejected this)`
  //（那句话把责任推给语法层，而**它是合法的 JS**）。
  // 修法：给「标签 + 块」单开一摞上下文（`BlockLabels`），`break` 的跳转
  // **先记下标、块跑完一起回填**（与 `LeaveLoop` 同一个写法）。
  // **别拿 `LoopContext` 顶替**：那一摞还管着 `continue` 与「每轮新建绑定」，
  // 混进去会让块里的 `continue` 找到一层不是循环的东西（**静默错值**）。
  // **嵌套逼出了「必须是一摞」**：一格的话 `inner` 一进就把 `two` 顶掉——
  // 语料 `ex-labeled-block-nested` 钉着这一条。

  // ===== stdlib：内建成员与标准形状 =====
  // **第 234 轮删掉了 `array-spread-conditional` 那一行**（它过了）：
  // 投影把 `[...xs.length ? xs : ys]` 记成 `ArrayLiteral > ConditionalExpression`，
  // 而**三元的那一格「条件」是 `SpreadElement`**（区间从 `...` 起算，
  // 所以 `...` 绑得比三元还紧）。`LowerConditional` 于是拿到一个 `SpreadElement`，
  // 报 `unimplemented: expression SpreadElement`（听起来像「`...` 没人支持」，
  // 而**别处的 `...` 都是好的**）。
  // 修法：`LowerExpression` 顶上把裸位置上的 `SpreadElement` **剥掉**——
  // 那三处**有语义**的位置（数组元素 / 调用实参 / 对象成员）各走各的路、
  // **不经过这一句**，所以剥掉它们的信息不丢。
  // **剥掉是对的**：三元 / 二元 / 一元**操作数**位置上的 `...` 在 JS 里本来就是语法错误，
  // 它能出现在那里只是因为外面的数组字面量已经认过它了。
  // **第 273 轮把这个 blocked 那一行删掉了**（这两条一直是过的，判据每轮都提示
  // `NEWLY-PASSING`）：`object-tostring-tag` 与 `symbol-tostringtag` 是第 229 轮修好的
  //（`Object.prototype.toString` 先问 `Symbol.toStringTag`），台账那一行忘了删。
  // 留着的代价是**读数看不见**：它们一直算 `pass`，只是每次跑都提示一遍。
  // **第 228 轮删掉了 `symbol-concat-throws` 那一行**（它过了）：`TextUnitsOf` 对符号
  // 抛的是**宿主的 `TypeError`**，而 `Guard` 现在按**宿主异常的类**认类别
  // （`ErrorKindType` / `ErrorKindRange`），`tsrun` 的错误工厂把它翻成脚本的那一族——
  // 原来一律造 `Error`（判据 `symbol-concat-throws` 现场红的）。
  //
  // **第 229 轮删掉了 `object-tostring-tag` 与 `symbol-tostringtag` 两行**：
  // `Object.prototype.toString` 现在**先问 `Symbol.toStringTag`**（`ObjectTagOverride`），
  // 而 `Map` / `Set` / `Date` 三族的那一格是 `BuildGlobals` 挂上去的。
  // **顺序也摆正了**：`Error` 那一族给的是 `"[object Error]"`（**不是** `"Error: x"`——
  // 那是 `Error.prototype.toString` 的答案，同一个值两个方法两个答案）。
  // **`symbol-hasinstance` 从 blocked 变成 differ 了**：`static [Symbol.hasInstance](v)`
  // 这种**计算成员名**现在降级得出来（第 229 轮），差的是 `instanceof` 那头
  // **还没问那一格**（引擎的 `RtInstanceOf` 只沿原型链找）。
  // **第 273 轮把这个 blocked 那一行也删掉了**（理由与 `object-tostring-tag` 同一处）。
  // **第 241 轮删掉了 `symbol-description` 那一行**（它过了）：
  // 原来记的理由是「要挂在符号的**原型**上，而 `Protos` 表里没有符号那一格」——
  // **那一半是真的**（符号既没有属性表、也没有原型那一格），
  // 而**结论绕了远路**：既然符号**永远不会有**原型那一格，
  // 那一格就**只能由 `get_prop` 特判**——**不必给引擎加一个符号原型**。
  //
  // 做法与 `PrototypeKey` **一字不差**：引擎**只认句柄**，
  // `"description"` 这个字符串由语言层给（`vm.SetDescriptionKey` /
  // 驱动 `DeclareDescriptionKey`），键**按内容比**
  //（字符串不去重——比句柄永远不相等，`PrototypeKey` 那一处踩过同一个坑）。
  // **描述本身就在堆里那一格**（`HeapSymbol.Description`）⇒ 特判那一支**一格都不分配**。
  // **没描述给 `undefined`**、`Symbol("").description` 是**空串**——判据是句柄是不是 `0`。
  // **第 370 轮撤掉了 `console-log-special` 那一行**（它现在过了）：
  // 原来那一条打的是**整个错误对象** ⇒ 输出里带上一整段**栈**，而那段栈里
  // **大部分帧是宿主自己的**（`Module._compile` 那些、行号随宿主版本变）
  // ⇒ 那一条**永远不可能**逐字对上（第 217 轮的定性就是这个）。
  // 这一轮把它**拆开**：引擎自己拥有的那部分（`Map` / `Set` / `Error: boom` 这一行 / 符号）
  // 由收窄之后的 `console-log-special` **继续量着**；栈那一档搬进新条目
  // `console-log-error-stack`、按**口径外**登记（与 `regexp-literal-basic` 那几条同一个口径）。
  // **第 246 轮删掉了 `error-engine-throws` 那一行**（它过了）：
  // 差的是「**引擎抛的错要能进脚本的错路**」——`(1 as any)()` 那一抛原来是
  // **引擎自己的** `Error`（`catch` 接不住）。
  // 修法就是第 153 轮自己写下的那条正路：**让这一抛带上「是 `TypeError`」**
  //（`Guard` + `ErrorKindType`，引擎仍然不认识 `"TypeError"` 这几个字母）。
  // **两个入口都得改**：`CallNative` 管 `Op.Call`（`f(...)` 与 `(1 as any)()`）、
  // `DoCallValue` 管 `Op.CallMethod` / `o?.m()` 那一族——只改一处的话
  // 同一个脚本里两条路的 `catch` 行为不同，而那**不报错**。
  // **两处的收尾类型不一样**（`CallNative =>Value` 交 `Value.Undefined()`；
  // `DoCallValue =>void` 交裸 `return`）——第 245 轮两次都配反了，
  // 这一轮**先把签名抄在手边** 才落笔。
  // **它同时松开了 `runtime:check` 里两条钉旧行为的断言**
  //（「调一个数值要说清楚为什么不行」看的是那句 `non-closure`、
  //  「没接上原型名字时要报出来」原来靠异常越过宿主那一层）——
  // 两条都改成看**新口径**（结局是「脚本抛出」、话里仍然点名）。
  // **第 286 轮改成了「还差一步」**（原来记 `blocked`）：执行器**已经会同步跑了**
  //（`PromiseCtor` 那一支：造两个结清回调、`invoke(执行器, 承诺, [resolve, reject])`、
  // 执行器自己抛 ⇒ 结果承诺被拒绝）。**差的最后一步**是：脚本里 `resolve` 是
  // **当普通函数**调的（`(resolve) => resolve(1)`），而这一族读的是**接收者**
  //（`InvokePromise` 的 `self`）⇒ `self` 是 `undefined` ⇒ 宿主读 `self.Tag` 抛
  // ⇒ 那个新承诺被**拒绝** ⇒ 宿主说「脚本挂着等一个它没结清的承诺」
  //（**看起来像运行器卡住**）。**两条候选都写在 `promise.xl.md` 的 `MakeSettleCallback`**
  // （本轮引擎那半边加了 `InvokeCallback` 的接收者格，可它传不到 `resolve` 身上；
  // 下一轮最短的一步是让那个值**绑定过**——把承诺写进实参表第一格，宿主读 `args[0]`）。
  // **第 286 轮删掉了 `promise-chaining-errors` 那一行**（它过了）：
  // `.then` 回调里抛的错现在**变成结果承诺的拒绝**——
  // 修在 `RunNativeTask` 那一处（回调跑完看 `Status === Threw` ⇒ 拒绝、
  // 把状态放回去，否则 `.catch` 那一条链一步都不跑）。
  // **第 247 轮删掉了 `promise-all-kinds` 那一行**（它过了，与 `prm-combinators` 同一处）：`Promise.all([1, Promise.resolve(2), "3"])` 从 `mixed ,2,` 变成 `mixed 1,2,3`。修法就是**包一个已兑现的承诺**（`MakePromise(…, Fulfilled, item)`，与 `PromiseResolve` 那一支一字不差）——**不直接调一步**：那样 `all` 与 `race` 要各写一遍，而且同步调与承诺结清后调的**次序**会不同。
  // **第 286 轮删掉了 `promise-async-await-forms` 那一行**（它过了）：
  // 类里的 `async` 方法原来在**降级期**响亮地抛（`unimplemented: async method in a class`）。
  // 那一句是第 229 轮**故意**留的（引擎那时还不认识 async 帧，静默当成普通方法会挂死），
  // 而标记那三句（`IsGenerator` / `IsAsync` / `HasRest`）**早就在 `LowerFunctionValue` 里**
  // ——四条路（函数声明 / 函数表达式 / 箭头 / 类方法）**共用同一段**。
  // **删掉那一句就是全部**：`DoCallMethod` 与 `DoCallValue` 也共用同一个 `DoCallValue`
  //（`this` 的来处不同、开帧那一段一模一样）。
  // **第 232 轮删掉了 `global-boolean` 那一行**（它过了）：
  // `new Boolean(false)` 在 JS 里是**真**（任何对象都是真），
  // 而本仓原来把它按假算（`BooleanCtor` 只有「转真假」那一支）。
  // 现在构造那一支给一个**普通对象 + 一格隐藏的原值**（`__b`，
  // 用 `SetHiddenProperty`——挂成普通属性的话 `Object.keys(new Boolean(1))` 当场给
  // `["__b"]`，而 JS 给 `[]`）。**已知差**：`String(new Boolean(false))` 在这里给
  // `"[object Object]"`，JS 给 `"false"`（那要 `Boolean.prototype.toString` / `valueOf`）。
  // **第 232 轮删掉了 `global-array-object-ctors` 那一行**（它过了）：
  // 它卡过两处——先是 `new Object(null as any)` 的 `AsExpression` 那一层
  // （与 `ex-spread-in-new` 同一处），再是**最后那一句**
  // `new Object(null as any) !== null`。JS 里 `Object(null)` 是 `null`、
  // `new Object(null)` 是**一个空对象**（构造那条路**永远**给新对象，实参完全不参与），
  // 而本仓的宿主 ABI 只有 `(id, self, args)`——**分不出这两件事**。
  // 修法：`vm.xl.md` 加一位瞬时的 `HostConstructing`（`DoNew` 那两条宿主分支置上、
  // 调完立刻清掉），驱动把它当**最后一位**传进 `InvokeWithSink`
  //（**公开契约不动**——`HostInvoker` 是客户要照着实现的）。
  // **`Object` 这一格是唯一用它的人**（`Array` / `String` / `Function` 两档本来就同义）。

  // ===== e2e：几族合起来 =====
  // **第 286 轮删掉了 `e2e-async-workflow` 那一行**（它过了）：
  // 它差的正是 async 那一整族（`await` 一个非承诺值、`for..of` 里的 `total += await f(n)`、
  // 类里的 `async` 方法）——本轮一起做掉了。
  // **`e2e-mixed-everything` 从「降级期就抛」走到了「运行期同一个根」**（见下面）。
  // **`e2e-mixed-everything` 第 286 轮从「降级期就抛」走到了「运行期同一个根」**：
  // 类里的 `async total(key)` 已经能降级（async 那一族本轮做掉了），
  // 现在卡在**这个类自己的字段初始化式**上——`private data = new Map<…>()`，
  // 与 `e2e-event-emitter` **一字不差的同一个根**（全局名没进内层帧的环境）。
  // 台账从 `pass` 变成 `blocked` 不是倒退：这一条**从来没有真跑起来过**
  //（原来整份文件在降级期就进不来）——它只是原来被记成了「类型位擦除」那一档。

  // ===================== 第 273 轮加宽：矩阵 275 → 395 条，新盖到 37 条缺口 =====================
  //
  // **这一轮的读数一定会掉**（90.7% → 约 84.3%）——那是**分母变诚实**，不是倒退：
  // 分母涨了 44%（275 → 395），新收的 120 条里有 37 条过不去。
  // 前面那一批（第 202~270 轮）的 90.7% 量的是一张**只装了「已经想到的形状」**的矩阵；
  // 这一批按「**普通 `.ts` 里会出现什么**」重新铺了一遍，于是把 37 条一直没被问过的
  // 形状问了出来。
  //
  // 下面按**根子**分组（不是按 id 排）——同一组的修法一样，一起做才不白付。
  //
  // ---- 组 1：`implements` 子句被当成值求值（2 条）**第 281 轮清空了** ----
  //
  // **原来写的诊断是错的**（第 273 轮那一版说的是「只认了 `extends` 那一格」）：
  // 真相是 `SuperClassNameOf` 取的是**第一条能找到名字的子句**——
  // 而 `class Person implements Named, Aged` **只有 `implements` 一条**，
  // 于是它把 `Named`（一个**接口**）当成了父类。
  // **难点不在降级层**：投影出来的两条子句**形状完全一样**（都只有 `types`），
  // 所以「哪一条是 `extends`」在那一层**无从回答**。
  // **信息在投影那一头丢了**：`PrintAst` 按 TS 的 `forEachChild` 口径把子句词
  // **滤掉了**（不加这一滤，投影会多出 2192 个 `ExtendsKeyword` 节点）——
  // 可它也**只保留 `types`**，于是 `token` 那一格（TS 里明明有）没了。
  // **第 281 轮的修法**：把子句词作为 `token` 属性**收进投影**（不进 `types`，
  // 所以节点集合一个都没变——`cases:tsast` 的「字段名」只统计**值里含节点**的键，
  // 而它是字符串），降级层再按 `token === "extends"` 过滤。
  // **顺带把一条老账修了**：`samples/declarations.expected.tsast.json` 那份夹具
  // 钉着旧的投影形状，跟着补了两处 `token`。

  // ---- 组 2：枚举名在**函数体里**看不见（1 条）**第 282 轮清空了** ----
  //
  // **诊断写对了，但入口指错了半格**（第 273 轮记的是 `CollectDeclaredNames` / `Hoist`）：
  // 真相是 **`CollectDeclaredNames` 那张 `kind` 名单漏了 `EnumDeclaration`**——
  // 与 `Hoist` 无关（枚举本来就不进提升，它像 `let`，按书写位置降级）。
  // **症状很窄**：顶层用枚举是好的（那时 `BindName` 已经把名字放进当前作用域），
  // 而**内层函数一提就报 `name is not a local or a capture`**——
  // 中间隔着一次「内层看外层」，那一趟要靠这张名单才认得出「这是捕获」。
  // **为什么不能顺手把「所有带 `name` 的节点」都收进来**：
  // `InterfaceDeclaration` / `TypeAliasDeclaration` 带 `name` 却**不产生运行期东西**，
  // 收进来会把「类型名当值用」从**响亮地报错**变成「读到一个空槽」（**静默错值**）。
  //
  // **同时加宽了一条**：`ex-enum-in-nested-scopes`（函数 / 箭头 / 立即调用 / 类方法
  // 四种内层各来一个，外加反向映射 `N[1]`——它证明进环境格的是**真那个枚举对象**，
  // 不是一个只带正向格子的影子）。

  // ---- 组 3：枚举的反向映射只认字面量（1 条）**第 283 轮清空了** ----
  //
  // 第 230 轮自己写下的已知差（当时判据量不到）：那一版的判据只认
  // 「没有初始化式」与「数值字面量」两档，`A = BASE` / `C = 1 + 1` 这种**算出来的数**
  // 不挂反向格 ⇒ `E[10]` 给 `undefined`（Node 给 `"A"`）。
  //
  // **改准之后发现：当初那条理由本身是多余的**。那一版写的是
  // 「它要在运行期才知道是不是数，而 `set_prop` 的值键那条路**不区分类型**，
  // 真要做就得先问一次 `typeof`」——**前半句问错了问题**：
  // 要证的不是「值是不是数」，而是**「TS 会不会挂这一格」**。
  // 而 TS 的判据是**语法上的**（`emitEnumMember` 只看「初始化式是不是字符串字面量」，
  // 值算出来是什么它不管）——**于是完全不需要运行期 `typeof`**，
  // 一条编译期判据就够了。
  //
  // **新口径**：`initializer === null` 或**初始化式不是字符串字面量** ⇒ 挂。
  // 判据**复用 `IsTextLiteral`**（`+` 那条换路用的同一个，认三种字符串形态）——
  // 不另写一份（第二份迟早与第一份走偏）。
  // **「算出来的数是字符串」那一档不必担心**：TS 在**编译期就拒收**它
  // （「计算属性名必须是数值」），所以这条口径不会挂出一个错的键。
  //
  // **一条可以复用的读法**：这一轮的病不在实现，在**判据问的问题**——
  // 「我要证的是什么」写错了，于是多了一层根本不需要的运行期依赖。

  // ---- 组 4：静态成员不随 `extends` 走（2 条）----
  // 这一组是**同一个根**，两半：继承（`B.make` 是 undefined）与 `super`（静态里
  // `super.kind` 是 undefined）。JS 里 `class B extends A` 做的是**两步**：
  // `B.prototype.__proto__ = A.prototype` **与** `Object.setPrototypeOf(B, A)`，
  // 而本仓只做了第一步。`super` 在**静态**成员里要从**父构造函数**起读，
  // 第 243 轮的 `RtOp.GetPropFrom` 起点那一格因此要按「静态 / 实例」分两种。
  // **第 278 轮删掉了这两行**（它们过了）——**两条是同一个根**：
  // ① `extends` 在 JS 里是**两步**（`B.prototype` 的链 **加** `B` 自己的链），
  //   本仓只做了前一步 ⇒ `B.make` / `B.tag` 都读不到；
  // ② 静态成员里的 `super.x` 该从**父类构造函数**起读，本仓照实例那一支从父原型起。
  // 第 278 轮把两半都接上，**顺带撞出一条引擎侧的**：`class E extends Error {}` 里
  // 父类是**宿主引用值**（`IsObject()` 是假），于是 `set_proto` 那一抛把一条
  // **完全合法**的 `extends` 挡住了——`set_proto` 的两格因此分了开来
  //（接收者仍然抛、原型不是对象时不做事，JS 的口径）。
  // 逐条账见 `typescript-exec/README.md` 的「第 278 轮的账」。

  // ---- 组 5：`new` 一个**常量里的类表达式**不跑构造函数（1 条）----
  // 实测分得很清：`const C = class { constructor(n) { this.n = n } }; new C(4).n` 给 `undefined`，
  // 而 `class D { … }; const D2 = D; new D2(5).n` 给 `5`——所以问题不在「`new` 一个变量」，
  // 在**那个变量的值是类表达式**这一格（`instanceof` 反而是对的）。

  // ---- 组 6：`typeof` 的**类表达式**操作数没被收（1 条）----
  // `typeof class C { }`——与第 233 轮那个 `typeof {a: 1}` **同一族**：
  // `typeof` 后面那个操作数表达式没被收进操作数位，
  // 投影只留下一个**孤零零的 `TypeOfKeyword`**。
  // **`rt-typeof-all-kinds` 第 328 轮过了**（那一行撤了）：第 233 轮补的是
  // 「`typeof` 后面跟 `{`」那一格（`typeof {}`），这一轮补的是**类表达式**——
  // 两条**同一个根**：`IsOperand` 的那份名单里少了那个 kind。
  // `typeof class C { }` 折不起来 ⇒ 投影只吐一个**孤零零的 `TypeOfKeyword`**
  //（实测：TS 节点 10、投影 8，缺的正是 `TypeOfExpression` 与它下面的两格）。
  // **两份名单一起补**（`unary-operator.xl.md` 第 69 行那条纪律）：
  // `x + class { }` 是合法的 JS，二元那一份少了它，`+` 会被**一元**那一趟抢走。

  // ---- 组 7：字符串按**码元**迭代（1 条）----
  // `[...s].length` / `Array.from(s).length` 给 4（Node 给 3）：
  // `for..of` 一个字符串该**一次一个码点**（代理对要合起来），而本仓一次一个码元。

  // ---- 组 8：投影不认的两种形状（2 条）----
  // 两条都是「降到一半发现树上的节点形状不是预期的那一个」，而根子在**投影**：
  // ① 尖括号断言 `<T>expr`——TS 的 AST 里它与 `as` 是**两个 kind**
  //   （`TypeAssertionExpression` vs `AsExpression`），本仓只认了后者；
  //   顺带记一笔**裁判的取法**：`node` 的剥离模式**明确拒收**尖括号写法
  //   （「与 JSX 有歧义」），所以这一条的 `nodeArgs` 是 `--experimental-transform-types`。
  // ② 对象字面量里的**计算访问器名**（`get [k + "2"]()`）——报的是
  //   `ast node ComputedPropertyName has no text`；而**普通**计算方法名
  //   （`{ [k]() {} }`，`ex-computed-member-call` 那条）一直是好的。
  //   **第 284 轮清空了这一条**：根子是**同一个形状在同一个函数里写了三遍**——
  //   `PropertyAssignment` 与 `MethodDeclaration` 两条第 183 轮就收下了计算键，
  //   而**访问器那一条漏了**（它无条件走 `KeyUnitsOf`，最后落在 `TextOf` 上）。
  //   **漏的那一遍隔了 100 轮才被量到**。顺带把那一族**求值顺序**改对了：
  //   三条计算键的路原来都是**值在前、键在后**（第 183 轮自己把它记成「已知差」），
  //   而 JS 的规范是**键在前**——只有键 / 值里带副作用才看得出来，
  //   所以一直没被量到。**新加了一条判据守着它**（`ex-object-literal-key-order`）。
  // 这一条与组 10 的「成员不在那儿」是**同一类**，只是它住在 `ex` 层
  //（`String.raw` 是 `String` 上的一格，而它挡住的是一条**标签模板**的用例）。

  // ---- 组 9：整块都是类型位的 `namespace` 该**整块擦掉**（1 条）----
  // 这一条不是「namespace 没做」那一条——它体内**一个运行期东西都没有**
  //（`export type` 与 `export interface` 都是类型位），所以正确结局是
  // **一个指令都不产生**，而不是造一个空对象。挡在门口的却是同一句
  // `unimplemented: statement ModuleDeclaration`——也就是「先问体内有没有运行期东西」
  // 这一问还不存在。

  // **第 274 轮删掉了这七行**（它们过了）——第 273 轮普查收进来的那四条
  // 「那一格根本没装」（`reduceRight` / `copyWithin` / `findLast` / `toSorted`·`with`），
  // 加上三条**静默错值**（`includes` 丢掉起始下标、`flat(0)` 掉进 `depth || 1`、
  // `Math.abs(-0)` 给 `-0`）。七格一起收在 `array.xl.md` 与 `globals.xl.md` 里，
  // 逐条账见 `typescript-exec/README.md` 的「第 274 轮的账」。

  // **第 275 轮删掉了这五行**（它们过了）：`Object.is`（第三张判等表 `SameValue`）、
  // `Math` 那十格（`imul` / `clz32` / `fround` / `expm1` / `sinh` / `cosh` / `tanh` /
  // `log2` / `log10` / `log1p`）、`trimStart` / `trimEnd`、`String.fromCodePoint`。
  // 逐条账见 `typescript-exec/README.md` 的「第 275 轮的账」。

  // **第 276 轮删掉了这两行**（它们过了）：`Object.getOwnPropertyDescriptor`
  // （`defineProperty` 的反面）与 `Object.defineProperties` / `seal` / `isSealed` /
  // `isFrozen`（描述符的复数版与标志位的三种问法）。
  // 逐条账见 `typescript-exec/README.md` 的「第 276 轮的账」。

  // ---- 组 10：标准库**成员不在那儿**（14 条）----
  // 这一组的量法是**先问「在不在」**：一个探针把候选成员逐个 `typeof` 一遍，
  // 于是「根本不在那儿」与「在、但语义不对」被分开了（修法不一样）。
  // 全部是「往表里挂一格」（或几格）的活——`Object.is` 尤其便宜：
  // 引擎里 `SameValue` 的判据**早就有**（第 207 轮那张具名的表），缺的只是往 `Object` 上挂一格。
  // **第 279 轮删掉了这两行**（它们过了）——**两条都是「差最后一步」**：
  // ① 数组迭代器只差 `next()`——而**表示没动**（返回的仍然是数组，
  //    否则 `[...xs.keys()]` / `for..of` / `Array.from` 会一起坏）：
  //    接上的办法是在那个数组上挂两格**隐藏属性**（游标 `__i` 与 `next`）。
  //    **已知的表示差异**写在明处：`Object.keys(it)` 给 `["0"]`（JS 给 `[]`）、
  //    `JSON.stringify(it)` 给 `[1]`（JS 给 `{}`）——**这是老账**
  //    （「返回数组而不是迭代器」第 214 轮就写在规范里了），这一轮**没有让它变大**。
  // ② `JSON.parse` 的 reviver 只差**那一趟自底向上**（`SyntaxError` 第 277 轮修好了）——
  //    顺带接上了一条更基础的：**整棵树在这一次调用期间要锚住**
  //    （回调里会分配），锚在 `protos.WellKnownSymbols` 上并**存旧恢复**
  //    （回调里再调一次 `JSON.parse` 是合法的）。
  // 逐条账见 `typescript-exec/README.md` 的「第 279 轮的账」。
  // **第 273 轮把这一条从 `blocked` 改成 `differ`**（量准了）：它抛出之前**已经打印了一行**
  // （`Math.hypot` 与 `Math.cbrt` 是**在的**），所以判决落在 `differ` 上 而不是 `blocked`。
  // **第 277 轮把这一条从 `blocked` 改成 `differ`**（量准了）：`SyntaxError` 那一族装上之后
  // 它**进得了门**了（坏输入那一句现在给 `true`）——剩下的是**第一句**：
  // `JSON.parse(文本, reviver)` 的**第二格实参**还没接，所以数字没有过一遍回调。
  // **第 279 轮它整个过了**（那一趟自底向上接上了），所以这一行也删掉了。
  // **第 277 轮删掉了这两行**（它们过了）：`Symbol.for` / `keyFor`（注册表挂在
  // `protos.WellKnownSymbols` 上，键带 `for:` 前缀——前缀就是「注册过」的判据）
  // + `Symbol.prototype.toString`（**引擎特判那一支第一次要交出一个可调用值**，
  // 所以多了一格 `DeclareSymbolToString`，还带出一条「属性读有两条路」的教训），
  // 以及 `SyntaxError` 那一族（第四个错误原型 + `GlobalNames` 补一个名字）与
  // `Error(msg, { cause })`。逐条账见 `typescript-exec/README.md` 的「第 277 轮的账」。
  // **第 280 轮把这一条从 `blocked` 改成 `differ`**（量准了）：它**进得了门**了——
  // `Date.UTC`、`toISOString`、`toJSON`、七个 `setUTC*` 都装上了。
  // 剩下的是**最后一句**：`new Date("2021-03-04T05:06:07Z")` 那个**字符串实参**
  // （要一个 ISO 解析器），以及 `JSON.stringify({ d })` 要**认 `toJSON`**
  //（`JsonText` 是个纯查询、没有调用通道——那要给它加一格）。
  // **第 280 轮删掉了这一行**（它过了）：七个 `setUTC*` + `toISOString`——
  // 而这一族最值钱的一格是**逆变换**（`DateDaysFromCivil`，Hinnant 的 `days_from_civil`）：
  // `DateParts` 从第 138 轮起就给了正向，而逆变换一直没有 ⇒ `Date.UTC` 与七个 setter
  // **全都落不下来**。逆变换的 `Math.floor` 那三处是**路障**（负年份上写成截断会整整挪一个纪元，
  // 而它只在「年份 ≤ 0」时才现形）。
  // **顺带撞出一条静默的**：第一版把这九格排在 `273..281`，而 `280` / `281` 已经是
  // `ErrorCtor` / `TypeErrorCtor` ⇒ `Date.UTC(…)` 返回了一个 `TypeError` **对象**
  //（分派表先问错误构造器那一支）——**号撞车是静默的**，与第 150 轮
  // `ArrayAt = 22` 撞上 `ArrayFlat = 22` 是同一个形状。改到 `284..292`。

  // ---- 组 11：标准库**在、但语义不对**（3 条）----
  // 这三条比组 10 危险：**静默错值**，不是响亮地抛。

  // ---- 组 12：函数当 `ToPrimitive` 该给**源码文本**（1 条）----
  // `fn.toString()` 与 `String(fn)` 报的是同一句
  // `unimplemented: ToPrimitive of a function (JS renders source text)`——
  // 与 `ex-tagged-template-suffix` **同一个根**（JS 里 `Function.prototype.toString`
  // 要给**源码文本**，而源码文本得由降级层把区间抄下来）。

  // ---- 组 13：JSON 的那两格扩展（1 条，与组 10 的 reviver 同族）----

  // ---- 组 14：函数的 `length` / `name` 两个属性（1 条）----

  // ---- 组 15：async 那一族（第 286 轮清空了）----
  // **`promise-then-value-and-throw` 那一行删掉了**（它过了）：与 `prm-microtask-order`
  // 同一个根——`.then` 回调的返回值与回调里抛的错两条路都通了
  //（前者一直是好的，后者修在 `RunNativeTask`：回调跑完看 `Status === Threw`）。

  // ===================== 第 287 轮加宽：矩阵 397 → 556 条，新盖到 39 条缺口 =====================
  //
  // 这一轮**只做加宽**（分母变诚实，读数会掉），修法留给后面几轮。
  // 候选 159 条，先经 `sweep.mjs` 普查（`pass` 的 120 条直接收编，
  // `nodefail` 的 4 条是**用例自己不合法** ⇒ 当场改写成合法形状 再收），
  // 于是矩阵里**一条 `nodefail` 都没有**。下面按**根子**分组。

  // ---- 组 A：引擎的**静默错值**（第 287 轮 7 条，**第 288 / 289 两轮收掉 2 条**）----
  // 这一组是这一轮最值钱的读数——它们**全是亮的**（没有一句异常），
  // 所以只能靠「与 `node` 逐字节比」才看得见。
  // **第 289 轮删掉了 `object-valueof-override` 那一行**（它过了）——
  // **而它有两个根**，两个都是**静默错值**，两个都在这一轮修掉：
  // ① **`as` 的优先级**：`a as number + 1` 在 TS 里是 **`(a as number) + 1`**
  //   （`ts.createSourceFile` 给 `BinaryExpression(AsExpression(a, number), +, 1)`），
  //   而本规则把 `+ 1` 当成**类型的一部分**吞进了 `As` ⇒ 降级之后那个 `+ 1` 整个没了。
  //   修法在 token 层：`AsReorganization` 收到**值位二元运算符**就收工（`+ - * / % ** && || ?? == != === !== ^ !`）。
  //   顺带量出**第二处**：收工之后 `+` 前面站的是**折好的 `As` 单元**，
  //   而 `UnaryOperator` / `BinaryOperator` 两份 `IsOperand` 名单里**都没有 `As`**
  //   ⇒ `+` 被读成**前缀一元加**（`<UnaryOperator op="+">+ 1</UnaryOperator>`）。两处一起补才对。
  // ② **模板串的 hint**：`` `${o}` `` 在 JS 里是 `ToString(o)` ⇒ `ToPrimitive(o, "string")`
  //   **先问 `toString`**——与 `"x" + o`（`default` **先问 `valueOf`**）**不是同一件事**。
  //   而本仓两处都走 `StringConcat` ⇒ `{ valueOf: () => 5, toString: () => "T" }` 印出 `5`（Node 印 `T`）。
  //   修法是**多一个能力号** `TemplateConcat`（与 `StringConcat` **共用同一支实现**，只换 hint）。
  // **第 289 轮删掉了 `symbol-toprimitive-and-concat` 那一行**（它过了）：
  // 同一条修正顺带把它带过去了（它那句 `` `${o}` `` 原来也走 `default`）。
  //
  // **第 289 轮还删掉了 `rt-delete-array-element` 与 `rt-IIFE-module-scope` 两行**：
  // ① `delete xs[1]` —— 元素**不住在 `Props` 里**（在 `HeapArray` 的 `Elements` 上），
  //    而 `DeleteProperty` 只扫 `Props` ⇒ **一格都碰不到** 而且**返回 `true`**。
  //    修法是在那一段前面加「数组 + 下标键 ⇒ `SetHole`」——键有**两种形态**
  //    （`xs[1]` 给一个整数、`xs[i]` 也是；`ArrayIndexAt` 只认字符串），两档都要认。
  // ② `(function () { const n = 2 })()` 改写外层的 `n` —— 根子在 `CellOf`：
  //    它看的是 `Env.Last()`（**链上最近的一格**），而本函数**没开环境**时
  //    链尾是**外层函数**的格子 ⇒ 本层的 `let` / `const` 走 `EnvSet` 写进了外层
  //    （**静默错值**）。修法是给降级层加一格 `OwnEnv`（进门置假、真开了才置真），
  //    `CellOf` 在它假的时候直接给 `-1`——那个名字于是落到「现在占槽」那一条。

  // ---- 组 B：`delete` 与**原始值接收者**上的赋值（2 条）----
  // 两条都卡在同一族判据上：写操作先问「接收者是不是对象」，
  // 而 JS 在这一格上**不抛**（松散模式静默无效）。
  // **`rt-accessor-override` 第 326 轮过了**（那一行撤了）：根子就是写那一半的入口——
  // `super.value = x` 该写进**接收者**（实例），而查找起点是**父原型**；
  // 原来降级层把 `super` 那一格当成了接收者 ⇒ 接收者是一个 `undefined` ⇒
  // `assigning a property on a primitive receiver`（听起来像「往一个数上写」，
  // 其实是**接收者根本没算出来**）。见 `SetPropertyFrom` / `SuperStartSlot` 那两段。

  // ---- 组 C：环境格与闭包（2 条）----
  // **`var` 那一半第 315 轮修好了**（`EnvLeave`，判据转 pass、这一行撤了）——
  // 留一句在这里：它当初报的是 `environment index out of range: 1`，
  // 根子是「循环出口没把环境退回去」（见文件末尾那一段）。

  // ---- 组 D：生成器对象上那两格（2 条）----
  // `it.return(v)` / `it.throw(e)` 是 `Generator.prototype` 上的两格，
  // 本仓的生成器对象只有 `next`（`cannot call a non-closure value`）。

  // ---- 组 E：可选调用那一条（1 条）---- **第 325 轮收了**（那一行撤了）
  //
  // **「空值在哪一层」这是第三格**：第 152 轮分过两格（`o?.m()` 空在**接收者**上、
  // `o.m?.()` 空在**取出来的方法**上），而 **`f?.()` 空在「被调的那个值自己」身上**
  // ——`LowerCall` 的通用路与下标路**都没看那一格** ⇒ `?.` 被无视 ⇒ 照样去调 `undefined`
  // ⇒ 报 `cannot call a non-closure value`（听起来像「那个名字不是函数」，其实是**该短路**）。
  // **修法**：守卫排在**实参求值之前**（JS 里 `f?.(a())` 在 `f` 空值时**连 `a()` 都不求**——
  // 排在后面就是把副作用也跑了），结果落在结果格里；那一小段抽成
  // `PatchOptionalCall`（`LowerAccess` 的可选链与这里**同一个形状**，只写一处）。

  // ---- 组 F：降级层的两种形状（3 条）----
  // **`ex-class-computed-and-static-init` 第 323 轮过了**（那一行撤了）：
  // 根子就是「字段名那一格只认标识符 / 字符串 / 数字 / 私有名」——
  // 而**计算方法名**第 229 轮就通了（`[Symbol.iterator]() {}`），
  // 于是同一个形状在同一个类里**一半能进、一半进不来**。
  // 修法两处：① `EmitFieldInit` 认下 `ComputedPropertyName`（键算成一个值、
  // 走 `SetPropertyValue`——`ToPropertyKey` 那条规矩在引擎里只有一处），
  // **次序与 JS 一致**（键在前、值在后，与第 284 轮给对象字面量订正的那一条同源）；
  // ② `scope.xl.md` 的 `CollectInsideFunctions` 补一条：**计算名也是「内层代码」**
  // ——`[KEY] = 1` 的 `KEY` 是**外层**的名字，而实例字段那一段跑在**构造函数那一帧**里，
  // 不把计算名算进去，外层就不为它开格 ⇒ 降级到那儿报
  // `name is not a local or a capture: KEY`（**整份文件进不来**，实测就是它）。

  // ---- 组 G：标准库**成员不在那儿**（第 287 轮 7 条，**第 288 轮收掉 3 条**）----
  // 量法与第 273 轮一致：一个探针把候选成员逐个 `typeof` 一遍，
  // 把「根本不在那儿」与「在、但语义不对」分开（修法不一样）。
  //
  // **第 288 轮收掉的三格**（`Math` 三角七格 · `Number.isSafeInteger` ·
  // `Object.getOwnPropertySymbols`）——**两条教训**：
  // ① **三角七格是本轮最便宜的一格**（往 `Math` 那两张按下标的表里各加七项）——
  //    而它拖到第 288 轮才被量到，因为第 273 轮那份普查按「**已经想到的形状**」铺，
  //    没人想到去写 `Math.sin`（第 287 轮的加宽把它问了出来了）。
  // ② **`isSafeInteger` 与 `isInteger` 只差一个边界**、**`getOwnPropertySymbols` 与
  //    `getOwnPropertyNames` 只差「键是不是符号」**——两处都**复用**了兄弟那一支，
  //    没有另写一份（第 283 轮那条「第二份迟早与第一份走偏」）。

  // ---- 组 H：标准库**在、但语义不对**（第 287 轮 15 条，**第 288 轮收掉 5 条**）----
  // 与组 A 同样是**静默错值**，只是这一组住在标准库里。
  //
  // **第 288 轮收掉的五条**：
  // ① `Map` / `Set` 的 `forEach` **第三格实参**（两条）——`self` 就在手边，
  //    补一格实参就完了（第 142 轮把实参表开宽之后这是**顺手**的，只是没人回头补）；
  // ② `"a".repeat(2.9)`（一条）——**根子不在 `repeat`**，在**共用的取值器 `ArgOr`**：
  //    它原来对 `Float64` 一律走 `AsInt()` ⇒ **每一个小数实参都静默变成 `0`**
  //    （`fill(9, 1.5)` 从 0 开始填、`at(1.5)` 给第 0 格 ……）。
  //    改在 `ArgOr` 一处 ⇒ 十几个内建一起对；同一条判据当场抓到第二处：
  //    `repeat(-1)` 抛的是**裸 `Error`**，而脚本看得见 `e.name`（Node 给 `RangeError`）；
  // ③ `Math.hypot()` **空实参**（一条）——少一条早退（`Math.max()` 第 206 轮那条
  //    **同一个形状**，`hypot` 那一支当时没跟着补）；
  // ④ `-0` 那一格记在组 A。
  // **第 304 轮删掉了 `object-assign-forms-and-order` 那一行**（它过了）：
  // `Object.assign({}, "ab")` 从静默 `{}` 变成 `{"0":"a","1":"b"}`——
  // 修的是字符串当源那一格（按**码元**展开成下标键，与 `Object.keys("ab")` 同一条口径）。

  // ===== 第 290 轮：矩阵加宽 95 条量到的那一批（29 条缺口，按根子分组）=====
  //
  // 这一轮的选题是「先把 exec / runtime / 标准库 的语料铺满」，所以**先加宽、再照读数挑**
  //（与第 287 轮同一条口径）。下面按**根子**分组——同一组的修法一样，一起做才不白付。
  //
  // **组 A：标准库「成员不在那儿」（9 条）**——都是 `cannot call a non-closure value`
  //（即那一格**根本没装**）。按「普通 `.ts` 里有多常见」排：`Date` 多实参构造与 `Date.parse`、
  // `fn.name` / `fn.length`（与已有的 `function-length-and-name` 同一件事）、
  // `Promise.any` / `allSettled`、`WeakMap`、`AggregateError`、
  // `Object.getOwnPropertyDescriptors` / `Object.groupBy`、`Array.prototype.toLocaleString`、
  // `String.normalize`（要 Unicode 归一化表，与 `localeCompare` 同一条纪律）。
  // **`object-getownpropertydescriptors` 第 324 轮过了**（那一行撤了）：
  // 修法与号都写在 `globals.xl.md` 的 `ObjectGetOwnPropertyDescriptors` 那一段——
  // **逐格复用单数那一支**（`InvokeGlobal` 递归调自己），键那一趟复用
  // `getOwnPropertyNames` / `getOwnPropertySymbols` ⇒ 「描述符长什么样」**只有一处答案**
  // （数据属性四格 / 访问器两格 / 数组元素与字符串下标的标志不一样 / `length` 第三种，
  // 第 276 / 304 轮全是实测出来的）。**再抄一遍就是第二处会漂的答案**。
  //
  // **组 B：标准库「在、但语义不对」（4 条）**——**全是静默错值**，一句异常都没有。
  //
  // **组 C：降级层 / token 层（3 条）**
  //
  // **组 D：`arguments`（2 条）**——`arguments` 这个对象**这一层根本没有**。
  //
  // **组 E：生成器少了「送进挂起点」那一格（2 条）**——**静默错值**。
  //
  // **组 F：`for..in` 只走自有键（1 条）**——**静默错值**。
  //
  // **组 G：`class X extends Array`（1 条）**
  //
  // **组 H：`replace` 的那两格（2 条）**——`String.replace` 只认两个字符串实参。
  //
  // **组 I：`Date` 的文本（1 条）**
  //
  // ===== 第 291 轮加宽：exec / runtime / 标准库 三层一起铺（126 条候选）=====
  // 逐条读数（`sweep.mjs`）：**97 pass / 17 blocked / 12 differ / 0 nodefail**。
  // 下面 29 行按**根子**分组——同一组的修法一样，一起做才不白付。
  // 这一轮**量到的**多半是「普通 `.ts` 里天天见、此前一条判据都没有」的形状：
  // `fn.name` / `fn.length` / `String.substr` / `Date.parse` / `Math.LN2` /
  // `Object.isExtensible` / `WeakSet` / `ReferenceError` / `Promise.allSettled`。
  //
  // **组 A：`namespace` 带值那一族（3 条）**——与缺口清单 #4 同一根。
  //
  // **组 B：属性枚举的整数键优先序（2 条）**——**静默错值**。
  //
  // **组 C：生成器的 `next(v)` 送值（1 条）**——与 `rt-generator-next-sends-value` 同一根。
  //
  // **组 D：构造函数上的原型读（1 条）**
  //
  // **组 E：计算键上的函数值 / 方法里的箭头（2 条）**
  //
  // **组 F：码元 vs 码点（1 条）**——与 `rt-surrogate-iteration` 同一根。
  //
  // **组 G：显式取出来的迭代器（1 条）**
  //
  // **组 H / I / J：标准库「成员不在那儿」最日常的三格（3 条）**
  //
  // **组 K：包装对象（2 条）**
  //
  // **组 L：Math 的两个常量（1 条）**——**静默错值**。
  //
  // **组 M：`Object.isExtensible`（1 条）**
  //
  // **组 N：`WeakSet`（1 条）**
  //
  // **组 O：计算键 + 生成器方法（1 条）**
  //
  // **组 P：`Date.parse`（1 条）**
  //
  // **组 Q：承诺组合子少两格（2 条）**
  //
  // **组 R：函数自己的 `name` / `length`（3 条）**
  //
  // **组 S：函数当 `ToPrimitive` 要给源码文本（1 条）**——缺口清单 #11。
  //
  // **组 T：`ReferenceError`（1 条）**
  //
  // **组 U：函数显示名的推断（1 条）**
  // **`c291-console-log-nested-shapes` 第 330 轮过了**（那一行撤了）：
  // 根子是「对象字面量的属性名也是命名位置」（JS 的 NamedEvaluation）——
  // `{ f: () => 1 }` 里那个箭头叫 `"f"`，本仓原来给空串。
  // 修法与变量那一处**共用 `NamesFunctionValue`**（第 291 轮），
  // 名字从 `KeyUnitsOf` 来（字符串键的 `TextOf` 是带引号的原文，见 `UnitsText`）。

  // ===== 第 304 轮：加宽矩阵时量到的缺口（15 条）=====

  // **`c304-rt-super-property-write` 第 326 轮过了**（那一行撤了）：
  // 第 243 轮补的是读那一半（`super.v`），这一轮补的是**写那一半**——
  // 引擎侧是一条与 `get_prop_from` **对称**的 `set_prop_from`（四格：起点 / 键 / 值 / 接收者），
  // 降级侧的起点走**同一个** `SuperStartSlot`（静态那一半从父类构造函数起、
  // 实例那一半从 `父类.prototype` 起——两处各写一遍就会漂）。
  // **`c304-rt-optional-chain-call-forms` 第 325 轮过了**（那一行撤了）：
  // 同一条里的 `o.n?.()` / `o.missing?.()` 两半本来就对，这一轮补的是
  // **第三格**（`f?.()`：空值在**被调的那个值自己**身上）——见上面组 E 那一段。
  // **`c304-rt-promise-then-returns-promise` 与 `c305-std-then-returns-promise-adoption`
  // 第 317 轮修掉了**（`ResolvePromise` 现在走「兑现值本身是承诺就采纳」那一支）——
  // 两行都撤了。留一句在这里：它们当初报的是「后面 `.then` 拿到的是**承诺对象**」，
  // 根子是**「兑现值是个承诺」这条语义只长在 async 那一条支路上**。
  // **`c304-ex-namespace-merged-function` 第 325 轮过了**（那一行撤了）——
  // 根子与第 323 轮记的那一句**不一样**：**不是**「那一格没造」，
  // 而是**「有就复用」只看了本层的槽**、**没看本帧环境里的那一格**
  // （见下一条那一段账）。

  // ===== 第 305 轮：加宽矩阵时量到的缺口（34 条）=====

  // **`c305-ex-static-computed-key-and-method` 第 323 轮也过了**（同一处修，
  // 那一行撤了）：`static [KEY] = "c"` 那一格与实例字段那一条**共用同一段**——
  // 静态字段本来就在**类声明那一处**求值，所以它只需要①（认下计算名），
  // 不需要②（捕获那一条是给实例字段的）。
  // **`c305-std-map-groupby` 与 `c305-std-promise-withresolvers` 第 327 轮都过了**
  // （两行撤了）——修法与号写在各自的规范那一段里：
  // · `Map.groupBy`：`Map` 从**宿主引用**改成**带可调用载荷的对象**（第 183 轮 `Symbol` 那条），
  //   静态方法于是挂得上去；号 `660`（`600..610` 满了、`611..659` 是 `Set` 的）；
  //   **顺手补一处回归**：`instanceof` 走「读右边的 `prototype` 属性」那一条，
  //   所以 `Map.prototype` 也要挂（`Date` 那一行同一个形状）；
  // · `Promise.withResolvers`：号 `248`，号段的**上界跟着挪一格**
  //   （`id >= 230 && id < 248` → `< 249`，第 295 轮踩过一模一样的）。
  // （`c305-std-then-returns-promise-adoption` 也在第 317 轮转 pass、那一行同样撤了。）
  // **`c305-std-object-getownpropertydescriptors-all` 第 324 轮也过了**（同一处修）：
  // 这一条比第 323 轮新收的那一条**更宽**——它考的是「**复数拿全表、且与单数逐格一致**」
  // （`enumerable` / `configurable` / 访问器那一格都在里面）。
  // **`c305-e2e-lru-cache` 第 331 轮过了**（那一行撤了）：`map.keys().next()`——
  // 根子**不是**「私有字段里取出来的数组没有它」（第 305 轮猜的那一句），
  // 而是**这一族根本没接线**：`Array.prototype` 的 `keys` / `values` / `entries`
  // 第 279 轮就挂上了那两格隐藏属性（`__i` 与 `next`），
  // 而 `Map` / `Set` 的那六个方法是**同一件事的另外几个用户**、一个都没挂。
  // 修法是把那两格抽成 **`AttachArrayIterator`**（`array.xl.md`）——
  // **一处实现、四个用户**（数组那三格、`Map`、`Set`）。
  // **端到端那一层因此 97.8% → 100%**（45 / 45）。
  // **第 306 轮把上面那两处都修好了**（token 层的次序判据 + 名字收两遍），
  // 与 `ts.createSourceFile` 逐节点对过的形状现在**一字不差**：
  // `MethodDeclaration(asteriskToken) > name: ComputedPropertyName`、
  // `parameters: []`（不再冒出那个假 `ArrayLiteralExpression`）。
  // 这一条**还是没过**，但卡的地方**深了一层**——现在是**运行期**：
  // `tsrun: 脚本抛出：suspend outside a generator`（Node 给 `1,2`）。
  // **量窄过**（一次性探针）：同一个类里
  // ① `const it = a[Symbol.iterator](); it.next()` ——**好的**（给 `{value:1,done:false}`）；
  // ② `[...a]` / `Array.from(a)` / `for (const v of a)` ——**全抛**；
  // ③ `[...a[Symbol.iterator]()]` ——**给 `[object Object]`**；
  // ④ 把同一个生成器方法**改个普通名**、再用一个普通方法返回它 —— **全对**。
  // 所以根子在**「计算成员名 + 生成器方法」进迭代协议那条路**上（不在投影、不在降级）：
  // 直接调它是对的、**由协议/展开去调它就丢了生成器那一档**——
  // 与台账里 `c291-symbol-wellknown-custom-iterator` 那一行**是同一个根**（那一行写着
  // 「方法那一格建成了普通闭包」，这一轮把它量得更准了）。下一轮从这里下手。
  // **第 307 轮量到、当场收进矩阵的两条**（同一族的两个面）：`typeof` 的操作数位
  // 遇到「下标调用」时会把它**拆开**——实测的 token 树是
  // `<UnaryOperator op="typeof"><Keyword>typeof</Keyword><PropertyAccess>b["m"]</PropertyAccess></UnaryOperator>`
  // **加上一个平级的 `()` 括号**：于是 `typeof b["m"]` 先算出一个**函数**、
  // 那个括号成了**对结果的调用** ⇒ `cannot call a non-closure value`（离现场很远）。
  // **加一层括号就对了**（`typeof (o["m"]())`）——所以判据写清了是**哪一种排布**。
  // **第二条是它的另一半**：有了外层括号之后 token 树是对的，可当键是**符号值**
  // （`c[s]()` / `e[Symbol.iterator]()`）时**投影/降级又把它读成了方法本身**
  //（`typeof` 给 `"function"`，Node 给 `"object"`，**静默错值**）——
  // 而同一个形状换**字符串字面量**键就是对的。两条与缺口清单 #9 那一族同源
  //（「`typeof` 的操作数位」），下一轮照这两条修。
  // **第 308 轮量到的第三个面**（同一个族的另一处排布）：**展开位**里写
  // 「取 `Symbol.iterator` 再调」时，那个 `()` **逃出了 `Spread`**——实测的产物是
  // `<ArrayLiteral><Spread><SymbolToken>...</SymbolToken><PropertyAccess>a[Symbol.iterator]</PropertyAccess></Spread><Bracket startBracket="("></Bracket></ArrayLiteral>`：
  // 展开只吃到了**方法本身**、而那对圆括号成了**数组的第二个元素** ⇒ 报
  // `this method needs an array receiver`（**那句话听起来像「方法用错了接收者」**）。
  // **两处判据的分工**：`Spread.Process` 与 `UnaryOperator.Process`（`typeof` 那一处）
  // 都只往后吃**一个**单元（`SkipNextWrapSymbol`），而**调用括号是又一个单元**
  // ——`o["m"]()` 这种形状能对，是因为 `MethodReorganization` 先把它折成了一个 `Method`；
  // 而键本身是**成员链**（`Symbol.iterator` / `obj.key`）时那一折没赶上 ⇒ 括号剩在外面。
  // **第 314 轮量到、第 315 轮修掉**：`for (let i…)` 那个「每轮一个新环境」原来在**循环出口**
  // 把 `frame.Env` 留在**最后那个多出来的环境**上——而 IR 里当时**没有「退回上一层环境」那条指令**
  // （只有 `env_new` / `env_get` / `env_set`），于是循环**之后**的代码按词法深度读环境时
  // 读到的链少了一层 ⇒ 报 `environment index out of range: 1`，
  // 或者**一声不响地把后面的语句丢掉**（实测两种都出现过）。
  // **这一轮补上了 `env_leave`**（`ir.xl.md` 追加在**表尾**——「只追加、不改序」那条硬规矩），
  // 每轮的新环境也改成**以外层为父**（JS 的 `CreatePerIterationEnvironment` 就是这条）。
  // 判据 `c314-rt-top-level-env-after-let-loop` 与 `rt-loop-capture-let-vs-var` 都已转 pass，
  // **两行都撤了**——留这一段在这里，是为了让「为什么 IR 里要多一条与 `env_new` 对称的算子」有出处。
  // **一元运算符那一格今天还不通**（第 321 轮量到、当场记下来）：
  // `typeof t\`z\`` 报 `cannot call a non-closure value`（Node 给 `"string"`）——
  // 与**二元**那一条（这一轮修好了）**同源**：`UnaryOperator.Process` 只往后吃**一个**单元
  //（第 309 轮给它加过「吃调用括号」那一档），而**模板串**是又一个单元 ⇒
  // 被操作数只剩 `t`、模板留给通用支 ⇒ 降级层当成「调用 `t` 的结果」。
  // **修法**：照 `binary-operator.xl.md` 的 `StartsWithTemplate` 那一条**同一把判据**
  //（`String` 自己、或 `PropertyAccess` 的首个子单元是 `String`）在 `Process` 里多收一格。
  // **一元那一格第 322 轮也收了**（同一把判据 `StartsWithTemplate`，搬进
  // `text-common-util.xl.md` 两处共用；判据 `c321-ex-tagged-template-after-unary`
  // 已转 pass，那一行撤了）——留这一段是为了让「为什么一元也要多收一格」有出处。

  // ===== 第 323 轮：加宽 87 条，当场收掉 5 格（计算字段名 2 · `yield*` 返回值 1 ·
  // 两条端到端 async 的写法问题 0），落在下面的 18 条是这一轮量出来的缺口 =====
  //
  // **这一轮按「根子」分四簇**（同簇的修法一样，一起做才不白付）：
  //   A **名字只在该在的那一层里可见**（4 条：具名函数表达式 具名类表达式
  //     函数与命名空间合并 对象字面量里的 `super`）——都是「名字没绑进那一层」；
  //   B **标准库成员不在那儿**（7 条：`Map.groupBy` `Promise.withResolvers`
  //     `queueMicrotask` `Object.getOwnPropertyDescriptors` `String.raw`
  //     `Array.fromAsync` `Set` 的集合运算族——**与第 287 / 288 / 289 轮同一张单子**）；
  //   C **写那一半没有对应的入口**（2 条：`super.x = v` 数组子类）；
  //   D **同一个形状只认了一半**（2 条：尖括号断言 `<T>expr` 与「非空断言串在
  //     成员链上、后面那一截丢掉」）——前者是 `TypeAssertion` 与 `AsExpression` 两个
  //     kind 只认了后者，后者与第 303 / 304 / 305 轮那一条链同源
  //     （入口都在 `print-ast-common.xl.md` 的链分支）。
  // 另有 3 条是**已经登记过的缺口换了写法**（`f?.()` 生成器的 `return()`
  // 显示名推断），它们**不加新账**、只是把旧账的覆盖面加宽。

  // A —— 名字只在该在的那一层里可见（4 条）
  // **`c323-ex-namespace-merged-function` 第 325 轮也过了**（同一处修，那一行撤了）
  //
  // **量出来的根子与第 323 轮记的那一句不一样**（那次是**猜**的，这次是**读出来**的）：
  // 不是「那一格没造」，而是 **`LowerNamespace` 的「有就复用」只看了本层的槽**
  // （`this.Scope[last].Resolve(name)`）——**函数的名字自己**在捕获分析里被算成
  // 「内层函数里的引用」（`CollectInsideFunctions` 走进 `FunctionDeclaration` 时
  // `inside + 1`，而 `name` 那一格正好在它**里面**）⇒ `DeclareLocal` 把闭包
  // 写进了**环境格**、**没进槽** ⇒ `Resolve` 给 `-1` ⇒ 这一支**另造了一个对象**、
  // `BindName` 又把它写进**同一格环境** ⇒ **函数被对象盖掉**
  // ⇒ `make(3)` 报 `cannot call a non-closure value`（**静默错值**）。
  // **`enum` + `namespace` 合并一直是好的**：枚举名不在函数节点里面，
  // 所以它没被误算成捕获、一直住在槽里——差别只在**名字住哪儿**。
  // **修法**：复用判据加一格（`CellOf`，读的时候按**本帧第 0 层**，
  // 与 `DeclareLocal` 写它的那一句对称）。
  // B —— 标准库成员不在那儿（6 条，都是「挂一格」那一族）
  // **`c323-std-object-getownpropertydescriptors` 与 `c323-std-set-union-intersection`
  // 第 324 轮都过了**（两行撤了）——修法与号写在各自的规范那一段里：
  // · 复数那一格**逐格复用单数**（`globals.xl.md` 的 `ObjectGetOwnPropertyDescriptors`，号 `428`）；
  // · 集合运算六个**与那八个用同一个循环挂**（`set.xl.md` 的 `InstallSetMethods`，号 `620..625`），
  //   实参物化那一趟照 `new Set(生成器)` 的老路（`install.xl.md`）——
  //   **少了那一趟就是「把 Set 当数组读」**（静默给一个空集）。
  // **`Map.groupBy` 为什么还留着**（顺手量清的）：`Map` 是**宿主引用值**——
  // 它**没有属性表**，所以「往 `Map` 这个对象上挂一格静态方法」今天挂不了
  //（`Object.groupBy` 能挂是因为 `Object` 本来就是普通对象）。
  // 要做得先照第 183 轮 `Symbol` 那一条办：把 `Map` 改成**带可调用载荷的对象**
  //（`AttachCallable`，`IsHostCallable` 两种壳都认）——那是一次**结构性改动**，
  // 要连同 `instanceof` 与 `new Map()` 两条判据一起验，单独一轮做。
  // **`c323-std-map-groupby` 与 `c323-std-promise-withresolvers` 第 327 轮也过了**
  //（同一处修，两行撤了）。**`Map` 那一格的卡点量得准**：确实**不在分组本身**，
  // 而是「静态方法挂不上去」——第 323 轮猜的那一句这一轮**兑现了**。
  // **改名那一刀的风险也量清了**：`new Map()`（`IsHostCallable` 两种壳都认）与
  // `instanceof Map`（改成读 `prototype` 属性、并且**顺手补上那一格**）两条都验过，
  // 六道门 + 1202 条覆盖一起绿的。
  // C —— 写那一半没有对应的入口（2 条）
  // 写那一半没有对应的入口 **只剩下 1 条**（数组子类）
  //
  // **`c323-ex-super-property-write` 第 326 轮过了**（那一行撤了）：
  // 这一条是「父类只有数据字段、子类用访问器写」那种排布——
  // 与 `rt-accessor-override`（父类是访问器）和 `c304-rt-super-property-write`
  // （父类是 setter）**三种排布一起转绿**，因为根子是**同一处**：
  // 「查找起点」与「接收者」在写这一半上原来是**同一个东西**。
  // D —— 同一个形状只认了一半（2 条）
  // 旧账加宽（3 条：不加新账，只是同一个根换了写法）
  // **`c323-ex-optional-call-forms` 第 325 轮过了**（那一行撤了）：
  // 这一条把**三种基名**放在一起考（`o.m?.()` / `o.n?.k?.()` / `o.missing?.()` /
  // **`f?.()`**）——前面三种本来就对，补上的正是**第三格**
  // （空值在**被调的那个值自己**身上，见组 E 那一段）。
  // **`c323-std-console-shapes` 第 330 轮过了**（那一行撤了）：
  // 同一处修——`{ f: () => 1 }.f.name` 现在给 `"f"`；
  // 同一条里的容器形状与多实参那两行本来就是对。
  // **一处改动、两族一起转绿**：对象字面量（这条）与类字段（`f = () => 1`，
  // 同一轮补的第二处——`FieldInitialValue` 多收一格 `nameHint`）。

  // ===== 第 330 轮：新铺的 64 条里没过的那 8 条 =====
  //
  // **这一轮先量出「哪些已经对了」**：64 条候选里 **56 条当场通过**、
  // **8 条是新量到的缺口**、`nodefail` **0**、`differ` **0**
  //（第 323 轮那两条「用例写法不合法」的教训在这里用上了——
  //  **参数属性**（`constructor(private x: number)`）与 **`enum`** 都要
  //  `--experimental-transform-types`，前者干脆改写成「字段 + 赋值」）。
  //
  // **八条按根子分四组**（下面一条一行）。
  //
  // ---- 组 A：标准库的新面孔（4 条）----
  // **它不是「修 bug」那一类**：这四格是**标准里写着、本仓没做**
  //（与第 323 / 327 轮收的 `Array.fromAsync` / `Map.groupBy` / `Promise.withResolvers`
  //  是同一条口径：**标准里有的、普通 `.ts` 里会写的，就该在分母里**）。
  // **`c330-std-promise-try-value` / `c330-std-promise-try-throw` 第 331 轮过了**
  //（那两行撤了）：`Promise.try` 做出来了——**它不是 `Promise.resolve(f())`**
  //（那个在 `f` 抛时把整段代码打断），做法与 `new Promise(执行器)` **共用四样零件**
  //（`MakePromise` / `invoke` / `takeThrown` / `settle`），
  // 号取 `249`、**号段的上界第三次跟着挪**（`< 249` → `< 250`——
  // 295 / 327 / 331 三个轮次踩的是同一处）。
  // **它还顺手带出一条引擎级的静默错值**，见下面组 B 那一段。
  // `Error.isError` 这一条**卡在壳上**（与第 324 轮 `Map.groupBy` 量到的是同一个坎）：
  // `Error` 是**宿主引用值**、**没有属性表** ⇒ 静态方法挂不上去——
  // 要照第 183 轮 `Symbol` / 第 327 轮 `Map` 那一条先把它改成**带可调用载荷的对象**
  //（`AttachCallable`、`IsHostCallable` 两种壳都认），那是**结构性改动**，
  // 要连同 `new Error()` / `instanceof Error` / `Error.prototype.constructor` 三处一起验。
  //
  // ---- 组 B：三元的两支是箭头函数（1 条）----
  // **这一组是这一轮最值钱的发现**：`const f = flag ? () => 1 : () => 2` 是**日常写法**，
  // 而本仓**整份文件进不来**（`unimplemented: binary operator ?`）。
  // **量清楚了边界**（六条探针）：三元的两支是**函数表达式**是好的、
  // **套一层括号的箭头**也是好的（`? (() => 1) : 2`）、
  // **真值段写一个不套括号的箭头**才塌（`? () => 1 : 2`、`? () => 1 : () => 2` 都塌）。
  // **根子在「类型位」那一句判据上**：`?` 后面跟 `(` 被读成**函数类型**的开头
  //（`() => T`——条件类型 `A extends B ? () => C : D` 是合法类型），
  // 于是 `() => 1` 成了 `FunctionType` ⇒ 那个 `?` 再也配不成三元 ⇒
  // 通用那一趟把它当**二元运算符**（报的话离现场很远）。
  // **它不是「顺手改一处」**：要判「这个 `?` 处在值位还是类型位」，
  // 而那正是三元重组那一层今天**只在括号 / 类型容器的父单元上**回答得了的问题
  //（`ternary-operator.xl.md` 的 `IsTypePosition`）——括号关闭那一刻外层还没成形，
  // 所以要么给括号那一侧补一条「上一格是值位的 `?` ⇒ 这里不是类型位」，
  // 要么让箭头形的括号自己再收一次。两条都要连同 `cases:tsast` 的 1444 条一起验，单独立一轮。
  //
  // ---- 组 C：数组方法是通用的（1 条）----
  //
  // ---- 组 D：非空断言链上的名字（1 条）----
  // **与 `c323-ex-nonnull-in-chains` 是同一族**（旧账换写法，不加新账）：
  // 非空断言串在成员链上时**后面那一截被丢掉**——
  // 这一条的症状换成了 `name is not a local or a capture: id`
  //（`data.items![0]!.id` 里那个 `id` 掉成了一枚**裸标识符**，于是被当成要绑的名字）。

  // ===== 第 331 轮：新铺的 39 条里没过的那 3 条 =====
  //
  // **这一轮先量出「哪些已经对了」**：39 条候选里 **36 条当场通过**、
  // **3 条是新量到的缺口**、`nodefail` / `bad` 都是 **0**。
  // **端到端那一层 10 条全过**（它现在是 **55 / 55 = 100%**）。
  //
  // **三条按根子分三组**：
  //
  // ---- 组 A：解构形参的**嵌套**模式（1 条）----
  // `function render({ tags = [], meta: { width = 80 } = {} } = {})` 报
  // `ast node ArrayBindingPattern has no text`——**默认值是数组字面量**那一格
  //（`tags = []`）走的是 `BindingElement` 的取值路，而它按 `TextOf` 取名字。
  // 与 `ex-destructuring-params` / `c291-ex-destructure-params-and-defaults`
  // （那两条是**扁平**的、都过）不是同一个形状：这一条考的是**嵌了一层对象模式**。
  //
  // ---- 组 B：`enum` 与 `namespace` 的**同名合并**，且体内函数回头用那个枚举（1 条）----
  // `enum Level { … }` 之后 `namespace Level { export function label(v: Level) { … Level.Low … } }`——
  // `ex-enum-namespace-merge`（矩阵里那条）**是过的**，差别在**体内那个函数回头读枚举成员**：
  // 报 `unimplemented: name is not a local (captures need env records): Level`。
  // **与第 325 轮那条「有就复用只看了本层的槽」同一条链**（名字住在环境格里），
  // 而这一格多一层：命名空间体是**开一帧跑**的，那一帧要能把外层那个已经存在的
  // `Level` 对象**按名字读回来**——缺的是「合并时把老值的住址一起带进去」那一步。
  //
  // ---- 组 C：非空断言与可选链混写（1 条）----
  // **旧账换写法**（与 `c304-ex-nonnull-in-optional-chain` / `c305-ex-optional-chain-nonnull-mix` /
  // `c323-ex-nonnull-in-chains` / `c330-ex-nonnull-assertion-forms` **同一个根**，不加新账）。

  // ===== 第 371 轮：矩阵加宽 345 条，新量到的缺口（76 条）=====
  //
  // 这一轮**只做加宽**（用户口径：「先增加 exec / runtime / 标准库 / e2e cases，尽量覆盖所有场景」），
  // 345 条候选里 **269 条当场通过**、**76 条是新量到的缺口**、`nodefail` **0**（用例自身都合法）。
  // 下面按**根子**分组：同一条根子下的用例共用一句话。

  // ---- 枚举成员初始化式**引用同一枚举里前面的成员** ⇒ `name is not a local or a capture`。

  // ---- `const enum` 成员表达式与同类引用（与 `enumMemberRef` 同源）。

  // ---- 只有类型的 `namespace` 体在运行期应当是 `undefined`（本仓给了一个对象）。

  // ---- 接口名出现在**值位**（`typeof (Shape as any)`）⇒ 应当擦成 `undefined`，现在报 `name is not a local`。

  // ---- 尖括号断言的对象字面量那一格 ⇒ `unimplemented: expression Block`。


  // ---- 非空断言串在成员链上（`fn!().k`）——本仓给的是函数自己。

  // ---- 解构里的 `BindingElement`（对象模式 + 默认值 + 类型标注的组合）⇒ `unimplemented: expression BindingElement`。


  // ---- 展开数组（`{...xs}`）应当带上下标键（Node 给 `{"0":1,…}`，本仓给 `{}`）。

  // ---- 类表达式在体内 `Named.name` 可见（本仓给 `false` 那一格）。

  // ---- **类型字面量被当成表达式**（`unimplemented: expression TypeLiteral`）：类字段 / 形参上的对象类型标注。

  // ---- **尖括号断言** `<T>expr` 的降级（与 `as` 是同一个意思，两种写法）。

  // ---- **转义写法的标识符** `\u0061bc` 没有被解成 `abc` ⇒ 名字对不上。

  // ---- **标签名**（`block:`）被当成了要解析的名字。

  // ---- `Object.hasOwn` 不在那儿（`Object` 上没挂这一格）。

  // ---- 换掉 `C.prototype` 之后 `instanceof` 的判定（Node 给 `true true true`）。

  // ---- `findIndex` / `find` 要**访问洞**（Node 给 1），本仓把洞跳过了（给 -1）。

  // ---- `console.log(class C {})` 的标签应当是 `[class C]` 而不是 `[Function: C]`。

  // ---- **步数预算**在万级循环上耗尽（与 `gc-churn` 同一条已知缺口）。

  // ---- 带**剩余参数**的函数经 `.call(...)` 调用 ⇒ `cannot call a non-closure value`；最小反例 `function f(...r){}; f.call({}, 1)`。

  // ---- `Object.prototype.toString.call(promise)` 应当是 `[object Promise]`。

  // ---- 非 ASCII 的大小写转换（第 617 轮补上了 BMP 全段的映射表，台账那一行随之删掉）：
  // 表建在 `typescript-exec/builtins/string.xl.md` 的 `CaseUnits` 里——
  // 逐码元量出来的 676 + 665 段 1:1 映射 与 103 条展开映射（`ß` → `SS`）。
  // **还没做的是「语言特例」**：`toLocaleUpperCase("tr")` 在 Node 里是 `"İ"`、
  // 这里是 `"I"`——那要一张按 locale 分的表，记在 `StringToLocaleUpperCase` 那一段。

  // ---- `splice()` **不带实参**时 Node 返回 `[]` 且数组不动；本仓删空并返回全部 ⇒ 实参个数的口径。

  // ---- `xs[Symbol.iterator] === xs.values` 要是**同一个函数对象**。

  // ---- `xs.length = -1` 抛的应当是 `RangeError`，本仓抛裸 `Error`。

  // ---- `Object.keys / values / entries` 落在**字符串**上（本仓报 `needs an object`）。

  // ---- `Object.assign` 往目标上的**访问器 setter** 写 ⇒ `unreachable: installing a builtin never calls a function`。

  // ---- `Math.asinh` / `Math.acosh` / `Math.atanh` 不在那儿（`sinh`/`cosh`/`tanh` 是好的）。

  // ---- `Map.prototype` / `Set.prototype` 的 `size` 取不到（第 613 轮修好：原型上的访问器）。

  // ---- `Promise.resolve(p) === p` 要是 `true`（同一个承诺原样返回）。

  // ---- `Promise.any` 全拒时抛的是 `AggregateError`，本仓那个对象的 `constructor` 取不到。

  // ---- `Date.now()` —— 第 614 轮接上（命令行宿主回答 `ClockNow`）。

  // ---- `JSON.stringify(new Date(NaN))`：Node 给 `null`，本仓在 `toJSON` 里先抛了 `Invalid time value`。

  // ---- `MyArray[Symbol.species] === MyArray`（物种那一格的缺省值）。

  // ---- `EvalError` 这个全局名不在那儿。

  // ---- `Object.prototype.propertyIsEnumerable` 不在那儿。

  // ---- 绑定函数当构造器（第 617 轮修好，台账那一行随之删掉）：
  // `new (fn.bind(null))(5)` 原来报 `a bound function must be an object`——
  // 根子是 `DoCallValue` 里那句 `hostThis` 把 `HostConstructing` 也当成了排除条件，
  // 而 `bind` 那一格要的正是**对象自己**；实例另走 `HostConstructThis` 一格
  // （见 `runtime/vm.xl.md` 的 `DoNew` 与 `HostConstructThis`）。

  // ---- `Function.prototype.apply` 只吃真数组（类数组实参报 `needs an array`）。

  // ---- 访问器函数的 `name`：`getOwnPropertyDescriptor(o, "g").get.name` 应当是 `get g`。

  // ---- `encodeURI` 族在某一条上**挂住不返回**（退出码 `null` ⇒ 被 30s 超时杀掉）。

  // ---- `String(合法日期)`：第 616 轮起按 **UTC** 渲染（本仓的本地口径就是 UTC）——
  // 与 Node 的本地时区串**逐字节不同**，但 Node 在 `TZ=UTC` 下与本仓相同。
  // 那条用例量的是 `String(new Date(0)).length > 0`，所以它转正了。

  // ---- `Array.isArray(Array.prototype)` 要给 `true`（数组原型自己也是数组）。

  // ---- 稀疏数组的 `toString` / `join` 在**全洞**时（`[, ,]`）Node 给 `,`。

  // ---- **步数预算**在实操规模的循环上耗尽（同 `gc-churn`）。

  // ---- 字符串数组里逐字符找 `E` 失败（`charAt` 那一圈没找到，根子待量）。

  // ---- `render` 里对象当上下文时字段读不到（`{{user.name}}` 给 `false`）。

  // ---- **回调里的回调引用 `this`** ⇒ 内层闭包不是函数：最小反例 `class V { done = new Set(["build"]); ready(){ return this.list().filter((j) => j.deps.every((d) => this.done.has(d))) } }`（外层回调引用 `this` 是对的、再套一层就丢）。

  // ---- `encode` 里 `String(run)` 与 `charAt` 的分支被走成了布尔串（`truefalse…`）。

  // ---- 泛型类 + 参数属性 + **函数类型形参** ⇒ 实参错位：最小反例 `class G<K,V>{ private now: () => number; constructor(private cap: number, now: () => number){ this.now = now } tick(){ return this.now() } }` 里 `cap` 收到那个箭头、`now` 是 `undefined` ⇒ 调它报 non-closure（非泛型那一版是对的）。

  // ---- **类成员位置的表达式语句**（字段上的对象类型标注里带方法签名那一格）⇒ `unimplemented: class member ExpressionStatement`。

  // ---- 异步任务池：第 620 轮修好（`TryPop` 弹错了别人的处理点，见 `runtime/vm.xl.md`），台账那一行随之删掉。

  // ---- **以 `override` 开头的标识符**（`overrides` / 形参名 `override`）被当成 `override` 关键字切开 ⇒ `expression OverrideKeyword` / `parameter without a name`。

  // ---- `validate` 递归里同一个 schema 走了两遍（数组 `items` 那一支重复校验）。

  // ---- 闭包里引用了**在它后面声明**的 `const`（`name used before its declaration: c`）——TDZ 与提升的口径。

  // ---- **交叉类型被当成表达式**（`unimplemented: expression IntersectionType`）。

  // ---- `Map` 的 `entries()` 展开成数组之后 `for (const [id, tf] of …)` 的取格顺序。



  // ===== 第 586 轮：第 552–585 轮那次语句壳搬迁带出来的、**还没修**的六条 =====
  //
  // 那一趟把语句壳从「关闭前那一趟」搬到**解析期**，于是**解析期看不见的单元**
  //（函数 / 类 / 循环 / try 那些由关闭前那一趟才成形的）在壳里露不出来。
  // 第 586 轮收掉了四条根子（`if` 单语句体 / `catch` `finally` 换行 / 裸块 /
  // 循环体尾分号）与 `Statement.SplitShell`（见 `docs/member-layer-plan.md`
  // 第一百八十八节）——**下面这六条是同一片田里剩下的**，按现场分三簇。

  // ---- 簇 A：类型字面量被当成了值（`unimplemented: expression TypeLiteral`）。
  // 与第 586 轮修掉的「裸块」是同一条路：`{ … }` 在**值位**收成 `TypeLiteral` 是对的，
  // 而它在**语句位**应当是块（判据 `IsStatementStart`）。



  // ---- 簇 B：降级层还没接的两格。


  // ---- 簇 C：两个各自独立的现场。

  // ===== 第 670 轮：**案外那两条真缺口进矩阵**（用户口径：凡是缺口的全部进语料）=====
  //
  // 这两条原来只写在 `README.md` 的「没有进矩阵」那一段里 —— 进去了这一层就不再是 100%，
  // 于是「还差多少」在 `npm run coverage` 里看不见。可**分母是活的、它比分子重要**：
  // 藏起来的那两条会让百分比虚高。现在它们照 `blocked` 登记，读数掉下来是**分母变诚实**。
  //
  // ---- 对象字面量的值是一对圆括号里的二元表达式。
  // `{ x: (a.x + b.x) / 2 }` 投影出来是 `BinaryExpression(a.x, +, b)` + **散着的** `.` / `x`，
  // `PropertyAccessExpression(b.x)` 整条缺 —— 降级层于是把属性名 `x` 当变量读。
  // **同一段写法放进数组元素里是好的**（`[ (a.x + b.x) / 2 ]` 逐位置一致），
  // 所以根子在「对象字面量的值」这一格：链折叠没有在括号内容上先跑一趟。
  "gap-ex-object-value-paren-binary": {
    expect: "blocked",
    why: "对象字面量的值里那对括号：`(a.x + b.x)` 只折出二元表达式，`.x` 那一截散着 ⇒ 降级层把属性名当变量读",
  },

  // ---- 宿主 ABI 的定时器。
  // `setTimeout` 是宿主层的事（`runtime-architecture.md` 的宿主那一段），
  // 单文件 `tsrun` 现在只给微任务那一档；这个全局名根本没登记。
  "gap-std-set-timeout": {
    expect: "blocked",
    why: "`setTimeout` 这个全局名没登记：宿主 ABI 只接了微任务那一档，定时器整档还没有",
  },

  // ===== 第 672 轮：`using` / `await using` 的降级（原来只写在 `README.md` 的文字里）=====
  //
  // 第 651 轮普查过：`node` 给 `new a|new b|body|dispose b|dispose a`，本仓只给前三段 ——
  // 也就是说这两条**跑得出来、只是静默少一次释放**（不是进不了门）。
  // 缺的只是**声明本身的降级**：两种声明现在被当成普通 `const` 降级，块结束时不会调
  // `[Symbol.dispose]()` / `[Symbol.asyncDispose]()`。
  // 符号本身与符号键计算名的方法都已经能用（`c650-std-symbol-keyed-method`），所以只差这一跳。
  "gap-ex-using-declaration-dispose": {
    expect: "differ",
    why: "`using` 被当普通 `const` 降级：块结束时不调 `[Symbol.dispose]()`，少一次释放（静默）",
  },
  "gap-ex-await-using-declaration-dispose": {
    expect: "differ",
    why: "`await using` 同上：不调 `[Symbol.asyncDispose]()`，少一次释放（静默）",
  },

  // ===== 第 675 轮：规范里点名的那一格（`globals.xl.md` 的 `new Object(null)`）=====
  //
  // `new Object(x)` 与 `Object(x)` 走的是同一条宿主内建，而**构造那一半**该给一个**新对象**：
  // `new Object(null)` 是 `{}`（不是 `null`）。本仓两半都选了「原样返回」，
  // 所以 `new Object(null) === null` 在这边是 `true`、在 `node` 是 `false`。
  // 要做对得先给宿主 ABI 加一位「这次是不是构造」——那是另一件事。
  "gap-std-new-object-null": {
    expect: "differ",
    why: "`new Object(null)` 被当成 `Object(null)`：构造那一半该造 `{}`，这里原样返回 `null`（静默错值）",
  },

  // ===== 第 676 轮：加宽四层矩阵时**新量到**的缺口（3 条）=====
  //
  // 这一轮的候选是拿**已装面**去比（`typescript-exec/builtins/*.xl.md` 的 entries 表 + 矩阵里
  // 名字出现得少的那些），所以量出来的都是「成员本身还没装」或「装出来的形状不同」这一档。
  //
  // ---- `Date` 那一族只装到 ISO / UTC 取值那几格：
  // `toISOString` / `toJSON` / `getTime` / `getUTC*` 都是好的（`r676-std-date-iso` 过了），
  // 而 `getTimezoneOffset` 与 `toDateString` / `toTimeString` **在成员表里没有那一格** ——
  // 走到调用那一格报的是「cannot call a non-closure value」。修法是给 `Date` 段补两个号，
  // 形状照 `node`：`getTimezoneOffset` 是本地时区相对 UTC 的**分钟**数（东八区给 `-480`），
  // `toDateString` 是 `Thu Jan 02 2020`、`toTimeString` 是 `03:04:05 GMT+0800 (中国标准时间)`——
  // 后两个要的那张本地时区名表在宿主那一侧，与 `console.log(new Date())` 走的是同一份。
  "gap-r676-std-date-getTimezoneOffset": {
    expect: "blocked",
    why: "`Date.prototype.getTimezoneOffset` 没装：成员表里没有那一格，调用报 cannot call a non-closure value",
  },
  "gap-r676-std-date-toDateString": {
    expect: "blocked",
    why: "`Date.prototype.toDateString` / `toTimeString` 没装：同上一格，本地时区名的渲染还没有那一支",
  },

  // ---- `Object.groupBy` 装出来了，但**给的是普通对象**：
  // `node` 的分组表是 **null 原型**（`Object.getPrototypeOf(grouped) === null`，
  // 打印成 `[Object: null prototype] {…}`），这里给的是带 `Object.prototype` 的普通对象，
  // 于是 `Object.getPrototypeOf` 打出 `{`。做对要么在造表时换 `NewPlainObject` 的那条 null 原型路，
  // 要么给 `Object.groupBy` 单独一格「造表」的内建（与 `Map.groupBy` 那条分开）。
  "gap-r676-std-object-groupBy-prototype": {
    expect: "differ",
    why: "`Object.groupBy` 的分组表该是 null 原型对象，这里给了带 Object.prototype 的普通对象（静默错值）",
  },

  // ---- `Date` 的**本地时间构造**没走时区换算（第 676 轮 `r676-std-date-iso` 量到）：
  // `new Date(2020, 0, 2, 3, 4, 5)` 那些分量是**本地时间**，时间戳该等于
  // `Date.UTC(...) - 本地偏移`；这里给的是 `Date.UTC(...)`，于是 `getTime()` 差一个偏移，
  // `toISOString()` 把本地墙上时间当 UTC 打（东八区差 8 小时），而 `getHours()` 又照本地回读 ——
  // 两个出口互相矛盾。`new Date(数字)` / `new Date("…Z")` / `new Date(Date.UTC(...))` 都是对的，
  // 缺的只是**多分量构造那一支**要带上宿主给的本地偏移。
  "gap-r676-std-date-local-time": {
    expect: "differ",
    why: "多分量 `new Date(y, m, d, …)` 按 UTC 记时间戳：getTime 差一个时区偏移、toISOString 把本地时间当 UTC",
  },

  // ---- 正则那一档**进矩阵的只有这一格**：`RegExp` 是 v1 写死的非目标
  //（`docs/runtime-architecture.md` §15），正则字面量那一侧本来就不做，所以**不立用例**
  //（矩阵里已有的 `regexp-literal-basic` 那几条记的是 `skip`，那才是口径外的正确记法）。
  // 剩下这一格问的是另一件事：**`String.prototype.matchAll` 这个成员本身在不在**——
  // 它的第一个动作是「读参数上的 `Symbol.matchAll`」，可本仓连成员都没登记，
  // 走到调用那一格直接报 `cannot call a non-closure value`。
  // **同一条协议换成普通对象也是同一个根**（成员不在，谁当参数都一样），所以只留这一格。
  "r676-std-string-matchAll-iterable": {
    expect: "blocked",
    why: "`String.prototype.matchAll` 没装：成员表里没有那一格，调用报 cannot call a non-closure value",
  },

  // ---- 同一条 `Date` 用例的**另一面**：`r676-std-date-iso` 也在这条缺口上，
  // 它比的是 `toISOString` 那一串 UTC 文本（`node` 给 `2020-01-01T19:04:05.006Z`）。
  // 两格一起登记，是因为它们量的是同一个根（本地时间没换算），只是各自的出口不同。
  "r676-std-date-iso": {
    expect: "differ",
    why: "`new Date(2020, 0, 2, 3, 4, 5, 6)` 的本地分量没换算成 UTC：toISOString 把本地墙上时间打成了 UTC",
  },

  // ===== 第 676 轮（其三）：**系统性点名**量到的两格（2 条）=====
  //
  // 这一批不是「随手挑构造」，是**把内建族逐个问一遍**（全局名 → 静态成员 → 原型成员，
  // 名字用字符串键取，见用例正文），报出「本仓 `undefined`、`node` 有」的那些。量出来的是：
  //
  // ---- `String.prototype` 上**正则那一族缺三个成员**：`match` / `search` / `matchAll`
  // （`replace` / `split` 在，只是不做「模式是正则」那一档）。它们与 `RegExp` 这个非目标
  // **不是同一件事**：`node` 里这三个成员**存在**（`typeof` 是 `function`），
  // 缺的是本仓成员表里的号 —— 装上号以后「非正则参数」那一支（`"abc".search("b")`）
  // 是可以做的，就像 `replaceAll` / `split` 现在这样（`replaceAll` 那一格量过，是好的）。
  "gap-r676-std-string-regex-members": {
    expect: "differ",
    why: "`String.prototype` 的 `match` / `search` / `matchAll` 三个成员没装（`node` 上是函数）：成员表里没有那三格",
  },

  // ---- `Date.prototype.toUTCString` 没装（`getTimezoneOffset` / `toDateString` / `toTimeString`
  // 是同一族；`toISOString` 在）。它的形状是**固定英文**的 `Thu, 01 Jan 1970 00:00:00 GMT`
  // —— 与 `toDateString` 要的那张本地时区名表不同，这一格**不需要**宿主给时区名，
  // 只要 UTC 的星期 / 月份名表（运行时本来就有 `getUTCDay` / `getUTCMonth` 那两格）。
  "gap-r676-std-date-toUTCString": {
    expect: "blocked",
    why: "`Date.prototype.toUTCString` 没装：成员表里没有那一格，调用报 cannot call a non-closure value",
  },

  // ---- 第 676 轮（其三）另外量到的一格：`String.prototype.includes` **不吃 fromIndex**
  // （每次运行都忽略那个参数、一律从头搜）。同一条用例里 `indexOf` / `lastIndexOf` 的
  // fromIndex 是**对的**（`"banana".indexOf("an", 4)` 给 `-1`），所以根子只在这一格的方法体里：
  // 它把第二实参丢了（或走了「只搜第一段」的那条捷径）。修法是照 `indexOf` 那一支抄一遍，
  // 再把结果折算成布尔。
  "gap-r676-std-string-includes-fromIndex": {
    expect: "differ",
    why: "`String.prototype.includes` 忽略 fromIndex：`\"banana\".includes(\"nan\", 3)` 该是 false，这里给了 true",
  },
  "r676-std-string-index-family": {
    expect: "differ",
    why: "同上一格：这条一并量了 indexOf（对）/ lastIndexOf（对）/ includes（忽略 fromIndex）三格",
  },
};
