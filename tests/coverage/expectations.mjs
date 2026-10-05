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
  // **第 286 轮删掉了 `prm-async-await` 那一行** ✓（它过了 ✓）：`async` 的三条语义差
  // （`lowering.xl.md` 文首那张表 ✓）这一轮**一起**做掉了 ✓——
  // ① 调用者立刻拿到承诺 ✓（`DoCallValue` 的 async 那一支：承诺在**开帧那一刻**就造好 ✓、
  // 当场写进调用者那一格 ✓，帧的 `ReturnSlot` 给 `-1` ✓）；
  // ② `return v` / 体里抛的错 = 那个承诺**兑现 / 拒绝** ✓（`DoReturn` 与 `DoThrow`
  // 各认 `AsyncPromise` 那一格 ✓）；③ `await` 一个**不是承诺**的值 ✓
  // （包一个已兑现的承诺 ✓、照样让出一个 tick ✓，见 `DoAwait` ✓）。
  // **顺带撞出四处「只有这个形状才现形」的** ✗，四处都写进了规范 ✓：
  // 实参被承诺盖掉（写承诺要在铺参数**之后** ✓）、`DoIterNext` 清掉机器级的 `Finished`
  // （`DrainMicrotasks` 要连它一起还原 ✓）、`DoThrow` 拒绝之后**必须收摊**
  // （不然「同步就抛的 async」会把整段脚本打断 ✓）、`MakeAsyncPromise`
  // （引擎自己造的承诺也得带 `then` / `catch` / `finally` ✓）。
  // **第 286 轮删掉了 `prm-async-throw` 那一行** ✓（它过了 ✓）：同一个根 ✓——
  // `boom().catch(…)` 现在接得到 ✓，`try { await boom() } catch (e)` 也接得到 ✓
  //（后者靠「只拒绝最里面那一个 async 帧」✓：外面那些要等拒绝顺着 `await` 传上去 ✓）。
  // **第 248 轮把这条的理由改准了** ✓（原来记的是「次序」✗，**量下来次序是对的** ✓）：
  // 判据是 `Promise.resolve().then(…)` 那一族 ✓，而**纯次序**那一面早就对 ✓——
  // 实测 `1 / 2 / 3 / 4` 三条普通 `.then` ✓ 与 Node 逐字节相同 ✓。
  // **真正坏的是「回调返回一个承诺」那一档** ✗（这一条判据里正好是它 ✓）：
  // 回调体是 `{ console.log("4"); Promise.resolve().then(() => console.log("5")); }` ✓，
  // 第 2 条那一整条**一句都不跑** ✓（连 `4` 都没有 ✓）。
  // 根子在 `vm.RunNativeTask` 的收尾 ✓：回调跑完之后
  // `this.ResolvePromise(result, produced)` ✓——`produced` 是回调**返回的那个值** ✓，
  // 而它可能**自己就是一个承诺** ✓。JS 的规矩是**采纳**它 ✓（结果承诺跟着内层那一档走 ✓，
  // `then(() => Promise.resolve(5)).then(v => …)` 里 `v` 是 `5` ✓），
  // 本仓**把它当成一个普通值灌进去** ✗ ⇒ 结果承诺**带着一个承诺对象兑现了** ✓
  // ⇒ 后面接的 `.then` 拿到的「值」是一个承诺 ✓、而**整条内层链的收尾也丢了** ✗。
  // **第 249 轮把根子再往前提了一步** ✓（第 248 轮记的是「采纳」✗，**那一半是真的、但不是第一因** ✓）：
  // 给 `AdoptInto` 那一支插了一句探针 ✓，**它一次都没打印** ✓ ⇒
  // 这一条链**根本走不到「回调的返回值」那一步** ✓——
  // 它在**回调跑完之后、收尾之前**就出事了 ✓（`cannot read properties of undefined` ✓）。
  // **所以采纳要修，而它前面还有一个更要紧的缺口** ✗。
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
  // **第 270 轮删掉了 `ex-private-in-operator` 那一行** ✓（它过了 ✓）：
  // 差的是 **`#n in o`** ✓（私有名的**品牌检查** ✓）——它报的是
  // `unimplemented: expression PrivateIdentifier` ✓，**整份文件进不来** ✗，
  // 而 `#n` 那些**读写**一直是好的 ✓（第 195 轮就通了 ✓）。
  // **修法只有一处** ✓：本仓的私有名**就是属性名** ✓（第 195 轮定的口径 ✓——
  // `this.#n` 与字段同键 ✓、`KeyUnitsOf` 对 `PrivateIdentifier` 取的就是 `text` ✓，
  // 也就是 `"#n"` 那个带井号的字符串 ✓），所以 `#n in o` **就是 `"#n" in o`** ✓——
  // **照 `in` 那一支办就行** ✓，不必另开一条路 ✗。
  // **次序要紧** ✗：这一支必须排在**求值左边之前** ✓（`LowerExpression(PrivateIdentifier)` 会抛 ✓），
  // 所以左边那一格在这一支里**直接发一条常量** ✓。
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
  // **第 273 轮把这个 blocked 那一行删掉了** ✓（这两条一直是过的 ✓，判据每轮都提示
  // `NEWLY-PASSING` ✓）：`object-tostring-tag` 与 `symbol-tostringtag` 是第 229 轮修好的 ✓
  //（`Object.prototype.toString` 先问 `Symbol.toStringTag` ✓），台账那一行忘了删 ✗。
  // 留着的代价是**读数看不见**：它们一直算 `pass` ✓，只是每次跑都提示一遍 ✓。
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
  // **第 273 轮把这个 blocked 那一行也删掉了** ✓（理由与 `object-tostring-tag` 同一处 ✓）。
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
  // **第 286 轮改成了「还差一步」** ✓（原来记 `blocked` ✓）：执行器**已经会同步跑了** ✓
  //（`PromiseCtor` 那一支 ✓：造两个结清回调 ✓、`invoke(执行器, 承诺, [resolve, reject])` ✓、
  // 执行器自己抛 ⇒ 结果承诺被拒绝 ✓）。**差的最后一步**是：脚本里 `resolve` 是
  // **当普通函数**调的 ✓（`(resolve) => resolve(1)` ✓），而这一族读的是**接收者** ✓
  //（`InvokePromise` 的 `self` ✓）⇒ `self` 是 `undefined` ✓ ⇒ 宿主读 `self.Tag` 抛 ✓
  // ⇒ 那个新承诺被**拒绝** ✗ ⇒ 宿主说「脚本挂着等一个它没结清的承诺」✓
  //（**看起来像运行器卡住** ✗）。**两条候选都写在 `promise.xl.md` 的 `MakeSettleCallback`**
  // （本轮引擎那半边加了 `InvokeCallback` 的接收者格 ✓，可它传不到 `resolve` 身上 ✗；
  // 下一轮最短的一步是让那个值**绑定过** ✓——把承诺写进实参表第一格 ✓，宿主读 `args[0]` ✓）。
  "promise-constructor": { expect: "differ", why: "`new Promise(执行器)` 的执行器已经会同步跑了，差的是「`resolve` 被当普通函数调时怎么知道它管哪个承诺」——下一轮让它绑定过（承诺写进实参表第一格）" },
  // **第 286 轮删掉了 `promise-chaining-errors` 那一行** ✓（它过了 ✓）：
  // `.then` 回调里抛的错现在**变成结果承诺的拒绝** ✓——
  // 修在 `RunNativeTask` 那一处 ✓（回调跑完看 `Status === Threw` ✓ ⇒ 拒绝 ✓、
  // 把状态放回去 ✓，否则 `.catch` 那一条链一步都不跑 ✗）。
  // **第 247 轮删掉了 `promise-all-kinds` 那一行** ✓（它过了 ✓，与 `prm-combinators` 同一处 ✓）：`Promise.all([1, Promise.resolve(2), "3"])` 从 `mixed ,2,` ✓ 变成 `mixed 1,2,3` ✓。修法就是**包一个已兑现的承诺** ✓（`MakePromise(…, Fulfilled, item)` ✓，与 `PromiseResolve` 那一支一字不差 ✓）——**不直接调一步** ✗：那样 `all` 与 `race` 要各写一遍 ✓，而且同步调与承诺结清后调的**次序**会不同 ✓。
  // **第 286 轮删掉了 `promise-async-await-forms` 那一行** ✓（它过了 ✓）：
  // 类里的 `async` 方法原来在**降级期**响亮地抛 ✓（`unimplemented: async method in a class` ✓）。
  // 那一句是第 229 轮**故意**留的 ✓（引擎那时还不认识 async 帧 ✓，静默当成普通方法会挂死 ✗），
  // 而标记那三句（`IsGenerator` / `IsAsync` / `HasRest` ✓）**早就在 `LowerFunctionValue` 里** ✓
  // ——四条路（函数声明 / 函数表达式 / 箭头 / 类方法）**共用同一段** ✓。
  // **删掉那一句就是全部** ✓：`DoCallMethod` 与 `DoCallValue` 也共用同一个 `DoCallValue` ✓
  //（`this` 的来处不同 ✓、开帧那一段一模一样 ✓）。
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
  // **第 286 轮删掉了 `e2e-async-workflow` 那一行** ✓（它过了 ✓）：
  // 它差的正是 async 那一整族 ✓（`await` 一个非承诺值 ✓、`for..of` 里的 `total += await f(n)` ✓、
  // 类里的 `async` 方法 ✓）——本轮一起做掉了 ✓。
  // **`e2e-mixed-everything` 从「降级期就抛」走到了「运行期同一个根」** ✓（见下面 ✓）。
  // **`e2e-mixed-everything` 第 286 轮从「降级期就抛」走到了「运行期同一个根」** ✓：
  // 类里的 `async total(key)` 已经能降级 ✓（async 那一族本轮做掉了 ✓），
  // 现在卡在**这个类自己的字段初始化式**上 ✓——`private data = new Map<…>()` ✓，
  // 与 `e2e-event-emitter` **一字不差的同一个根** ✓（全局名没进内层帧的环境 ✓）。
  // 台账从 `pass` 变成 `blocked` 不是倒退 ✗：这一条**从来没有真跑起来过** ✓
  //（原来整份文件在降级期就进不来 ✓）——它只是原来被记成了「类型位擦除」那一档 ✓。

  // ===================== 第 273 轮加宽：矩阵 275 → 395 条，新盖到 37 条缺口 =====================
  //
  // **这一轮的读数一定会掉** ✓（90.7% → 约 84.3%）——那是**分母变诚实** ✓，不是倒退 ✓：
  // 分母涨了 44%（275 → 395），新收的 120 条里有 37 条过不去 ✓。
  // 前面那一批（第 202~270 轮）的 90.7% 量的是一张**只装了「已经想到的形状」**的矩阵 ✓；
  // 这一批按「**普通 `.ts` 里会出现什么**」重新铺了一遍 ✓，于是把 37 条一直没被问过的
  // 形状问了出来 ✓。
  //
  // 下面按**根子**分组 ✓（不是按 id 排 ✓）——同一组的修法一样 ✓，一起做才不白付 ✓。
  //
  // ---- 组 1：`implements` 子句被当成值求值（2 条）**第 281 轮清空了** ✓ ----
  //
  // **原来写的诊断是错的** ✗（第 273 轮那一版说的是「只认了 `extends` 那一格」✓）：
  // 真相是 `SuperClassNameOf` 取的是**第一条能找到名字的子句** ✗——
  // 而 `class Person implements Named, Aged` **只有 `implements` 一条** ✓，
  // 于是它把 `Named`（一个**接口** ✓）当成了父类 ✓。
  // **难点不在降级层** ✗：投影出来的两条子句**形状完全一样** ✓（都只有 `types` ✓），
  // 所以「哪一条是 `extends`」在那一层**无从回答** ✗。
  // **信息在投影那一头丢了** ✗：`PrintAst` 按 TS 的 `forEachChild` 口径把子句词
  // **滤掉了** ✓（不加这一滤，投影会多出 2192 个 `ExtendsKeyword` 节点 ✓）——
  // 可它也**只保留 `types`** ✓，于是 `token` 那一格（TS 里明明有 ✓）没了 ✗。
  // **第 281 轮的修法**：把子句词作为 `token` 属性**收进投影** ✓（不进 `types` ✓，
  // 所以节点集合一个都没变 ✓——`cases:tsast` 的「字段名」只统计**值里含节点**的键 ✓，
  // 而它是字符串 ✓），降级层再按 `token === "extends"` 过滤 ✓。
  // **顺带把一条老账修了** ✓：`samples/declarations.expected.tsast.json` 那份夹具
  // 钉着旧的投影形状 ✓，跟着补了两处 `token` ✓。

  // ---- 组 2：枚举名在**函数体里**看不见（1 条）**第 282 轮清空了** ✓ ----
  //
  // **诊断写对了，但入口指错了半格** ✗（第 273 轮记的是 `CollectDeclaredNames` / `Hoist` ✓）：
  // 真相是 **`CollectDeclaredNames` 那张 `kind` 名单漏了 `EnumDeclaration`** ✓——
  // 与 `Hoist` 无关 ✗（枚举本来就不进提升 ✓，它像 `let` ✓，按书写位置降级 ✓）。
  // **症状很窄** ✓：顶层用枚举是好的 ✓（那时 `BindName` 已经把名字放进当前作用域 ✓），
  // 而**内层函数一提就报 `name is not a local or a capture`** ✓——
  // 中间隔着一次「内层看外层」✓，那一趟要靠这张名单才认得出「这是捕获」✗。
  // **为什么不能顺手把「所有带 `name` 的节点」都收进来** ✗：
  // `InterfaceDeclaration` / `TypeAliasDeclaration` 带 `name` 却**不产生运行期东西** ✓，
  // 收进来会把「类型名当值用」从**响亮地报错**变成「读到一个空槽」✗（**静默错值** ✓）。
  //
  // **同时加宽了一条** ✓：`ex-enum-in-nested-scopes` ✓（函数 / 箭头 / 立即调用 / 类方法
  // 四种内层各来一个 ✓，外加反向映射 `N[1]` ✓——它证明进环境格的是**真那个枚举对象** ✓，
  // 不是一个只带正向格子的影子 ✓）。

  // ---- 组 3：枚举的反向映射只认字面量（1 条）**第 283 轮清空了** ✓ ----
  //
  // 第 230 轮自己写下的已知差 ✓（当时判据量不到 ✓）：那一版的判据只认
  // 「没有初始化式」与「数值字面量」两档 ✓，`A = BASE` / `C = 1 + 1` 这种**算出来的数**
  // 不挂反向格 ✗ ⇒ `E[10]` 给 `undefined` ✓（Node 给 `"A"` ✓）。
  //
  // **改准之后发现：当初那条理由本身是多余的** ✗。那一版写的是
  // 「它要在运行期才知道是不是数 ✓，而 `set_prop` 的值键那条路**不区分类型** ✗，
  // 真要做就得先问一次 `typeof` ✓」——**前半句问错了问题** ✗：
  // 要证的不是「值是不是数」✓，而是**「TS 会不会挂这一格」** ✓。
  // 而 TS 的判据是**语法上的** ✓（`emitEnumMember` 只看「初始化式是不是字符串字面量」✓，
  // 值算出来是什么它不管 ✓）——**于是完全不需要运行期 `typeof`** ✓，
  // 一条编译期判据就够了 ✓。
  //
  // **新口径**：`initializer === null` 或**初始化式不是字符串字面量** ⇒ 挂 ✓。
  // 判据**复用 `IsTextLiteral`** ✓（`+` 那条换路用的同一个 ✓，认三种字符串形态 ✓）——
  // 不另写一份 ✗（第二份迟早与第一份走偏 ✓）。
  // **「算出来的数是字符串」那一档不必担心** ✓：TS 在**编译期就拒收**它 ✓
  // （「计算属性名必须是数值」✓），所以这条口径不会挂出一个错的键 ✓。
  //
  // **一条可以复用的读法** ✓：这一轮的病不在实现 ✗，在**判据问的问题** ✓——
  // 「我要证的是什么」写错了，于是多了一层根本不需要的运行期依赖 ✓。

  // ---- 组 4：静态成员不随 `extends` 走（2 条）----
  // 这一组是**同一个根** ✓，两半：继承（`B.make` 是 undefined ✓）与 `super`（静态里
  // `super.kind` 是 undefined ✓）。JS 里 `class B extends A` 做的是**两步** ✗：
  // `B.prototype.__proto__ = A.prototype` **与** `Object.setPrototypeOf(B, A)` ✓，
  // 而本仓只做了第一步 ✗。`super` 在**静态**成员里要从**父构造函数**起读 ✓，
  // 第 243 轮的 `RtOp.GetPropFrom` 起点那一格因此要按「静态 / 实例」分两种 ✓。
  // **第 278 轮删掉了这两行** ✓（它们过了 ✓）——**两条是同一个根** ✓：
  // ① `extends` 在 JS 里是**两步** ✓（`B.prototype` 的链 ✓ **加** `B` 自己的链 ✓），
  //   本仓只做了前一步 ✗ ⇒ `B.make` / `B.tag` 都读不到 ✓；
  // ② 静态成员里的 `super.x` 该从**父类构造函数**起读 ✓，本仓照实例那一支从父原型起 ✓。
  // 第 278 轮把两半都接上 ✓，**顺带撞出一条引擎侧的** ✗：`class E extends Error {}` 里
  // 父类是**宿主引用值** ✓（`IsObject()` 是假 ✗），于是 `set_proto` 那一抛把一条
  // **完全合法**的 `extends` 挡住了 ✓——`set_proto` 的两格因此分了开来 ✓
  //（接收者仍然抛 ✓、原型不是对象时不做事 ✓，JS 的口径 ✓）。
  // 逐条账见 `typescript-exec/README.md` 的「第 278 轮的账」✓。

  // ---- 组 5：`new` 一个**常量里的类表达式**不跑构造函数（1 条）----
  // 实测分得很清 ✓：`const C = class { constructor(n) { this.n = n } }; new C(4).n` 给 `undefined` ✗，
  // 而 `class D { … }; const D2 = D; new D2(5).n` 给 `5` ✓——所以问题不在「`new` 一个变量」✗，
  // 在**那个变量的值是类表达式**这一格 ✗（`instanceof` 反而是对的 ✓）。
  "ex-index-and-call-signatures": { expect: "differ", why: "`new` 一个**常量里的类表达式**不跑构造函数（`new C(4).n` 给 `undefined`；把类换成一则**类声明**再赋给常量就对）。它与 `instanceof` 无关（那一半是对的）。入口 `typescript-exec/lowering.xl.md` 的 `DoNew` + 类表达式降级" },

  // ---- 组 6：`typeof` 的**类表达式**操作数没被收（1 条）----
  // `typeof class C { }` ✓——与第 233 轮那个 `typeof {a: 1}` **同一族** ✓：
  // `typeof` 后面那个操作数表达式没被收进操作数位 ✓，
  // 投影只留下一个**孤零零的 `TypeOfKeyword`** ✗。
  "rt-typeof-all-kinds": { expect: "blocked", why: "`typeof class C { }` 报 `unimplemented: expression TypeOfKeyword`：操作数是**类表达式**时 `typeof` 那一格没被收（与第 233 轮 `typeof {}` 同一族，那时补的是「后面跟 `{`」那一格）" },

  // ---- 组 7：字符串按**码元**迭代（1 条）----
  // `[...s].length` / `Array.from(s).length` 给 4 ✓（Node 给 3 ✓）：
  // `for..of` 一个字符串该**一次一个码点** ✓（代理对要合起来 ✓），而本仓一次一个码元 ✗。

  // ---- 组 8：投影不认的两种形状（2 条）----
  // 两条都是「降到一半发现树上的节点形状不是预期的那一个」✓，而根子在**投影** ✗：
  // ① 尖括号断言 `<T>expr` ✓——TS 的 AST 里它与 `as` 是**两个 kind**
  //   （`TypeAssertionExpression` vs `AsExpression` ✓），本仓只认了后者 ✗；
  //   顺带记一笔**裁判的取法** ✗：`node` 的剥离模式**明确拒收**尖括号写法 ✓
  //   （「与 JSX 有歧义」✓），所以这一条的 `nodeArgs` 是 `--experimental-transform-types` ✓。
  // ② 对象字面量里的**计算访问器名** ✓（`get [k + "2"]()`）——报的是
  //   `ast node ComputedPropertyName has no text` ✓；而**普通**计算方法名
  //   （`{ [k]() {} }` ✓，`ex-computed-member-call` 那条）一直是好的 ✓。
  //   **第 284 轮清空了这一条** ✓：根子是**同一个形状在同一个函数里写了三遍** ✗——
  //   `PropertyAssignment` ✓ 与 `MethodDeclaration` ✓ 两条第 183 轮就收下了计算键 ✓，
  //   而**访问器那一条漏了** ✗（它无条件走 `KeyUnitsOf` ✓，最后落在 `TextOf` 上 ✓）。
  //   **漏的那一遍隔了 100 轮才被量到** ✓。顺带把那一族**求值顺序**改对了 ✓：
  //   三条计算键的路原来都是**值在前、键在后** ✗（第 183 轮自己把它记成「已知差」✓），
  //   而 JS 的规范是**键在前** ✓——只有键 / 值里带副作用才看得出来 ✓，
  //   所以一直没被量到 ✓。**新加了一条判据守着它** ✓（`ex-object-literal-key-order` ✓）。
  "ex-angle-bracket-assertion": { expect: "blocked", why: "`unimplemented: expression TypeAssertionExpression`：尖括号断言与 `as` 在 TS 的 AST 里是两个 kind，只认了 `as`。裁判要用 `--experimental-transform-types`（剥离模式明确拒收尖括号写法）" },
  // 这一条与组 10 的「成员不在那儿」是**同一类** ✓，只是它住在 `ex` 层 ✗
  //（`String.raw` 是 `String` 上的一格 ✓，而它挡住的是一条**标签模板**的用例 ✗）。
  "ex-string-raw-and-tagged": { expect: "blocked", why: "`String.raw` 不在那儿（`typeof String.raw` 给 `undefined`）——第 273 轮量到。与组 10 那些「成员不在那儿」同类，只是这条落在 `exec` 层（它挡住的是一条标签模板用例）" },

  // ---- 组 9：整块都是类型位的 `namespace` 该**整块擦掉**（1 条）----
  // 这一条不是「namespace 没做」那一条 ✗——它体内**一个运行期东西都没有** ✓
  //（`export type` 与 `export interface` 都是类型位 ✓），所以正确结局是
  // **一个指令都不产生** ✓，而不是造一个空对象 ✓。挡在门口的却是同一句
  // `unimplemented: statement ModuleDeclaration` ✗——也就是「先问体内有没有运行期东西」
  // 这一问还不存在 ✗。

  // **第 274 轮删掉了这七行** ✓（它们过了 ✓）——第 273 轮普查收进来的那四条
  // 「那一格根本没装」✗（`reduceRight` / `copyWithin` / `findLast` / `toSorted`·`with` ✓），
  // 加上三条**静默错值** ✗（`includes` 丢掉起始下标 ✓、`flat(0)` 掉进 `depth || 1` ✓、
  // `Math.abs(-0)` 给 `-0` ✓）。七格一起收在 `array.xl.md` 与 `globals.xl.md` 里 ✓，
  // 逐条账见 `typescript-exec/README.md` 的「第 274 轮的账」✓。

  // **第 275 轮删掉了这五行** ✓（它们过了 ✓）：`Object.is`（第三张判等表 `SameValue` ✓）、
  // `Math` 那十格（`imul` / `clz32` / `fround` / `expm1` / `sinh` / `cosh` / `tanh` /
  // `log2` / `log10` / `log1p` ✓）、`trimStart` / `trimEnd` ✓、`String.fromCodePoint` ✓。
  // 逐条账见 `typescript-exec/README.md` 的「第 275 轮的账」✓。

  // **第 276 轮删掉了这两行** ✓（它们过了 ✓）：`Object.getOwnPropertyDescriptor` ✓
  // （`defineProperty` 的反面 ✓）与 `Object.defineProperties` / `seal` / `isSealed` /
  // `isFrozen` ✓（描述符的复数版与标志位的三种问法 ✓）。
  // 逐条账见 `typescript-exec/README.md` 的「第 276 轮的账」✓。

  // ---- 组 10：标准库**成员不在那儿**（14 条）----
  // 这一组的量法是**先问「在不在」** ✓：一个探针把候选成员逐个 `typeof` 一遍 ✓，
  // 于是「根本不在那儿」与「在、但语义不对」被分开了 ✓（修法不一样 ✓）。
  // 全部是「往表里挂一格」（或几格）的活 ✓——`Object.is` 尤其便宜 ✓：
  // 引擎里 `SameValue` 的判据**早就有** ✓（第 207 轮那张具名的表 ✓），缺的只是往 `Object` 上挂一格 ✗。
  // **第 279 轮删掉了这两行** ✓（它们过了 ✓）——**两条都是「差最后一步」** ✓：
  // ① 数组迭代器只差 `next()` ✓——而**表示没动** ✗（返回的仍然是数组 ✓，
  //    否则 `[...xs.keys()]` / `for..of` / `Array.from` 会一起坏 ✓）：
  //    接上的办法是在那个数组上挂两格**隐藏属性** ✓（游标 `__i` ✓ 与 `next` ✓）。
  //    **已知的表示差异**写在明处 ✗：`Object.keys(it)` 给 `["0"]` ✓（JS 给 `[]` ✓）、
  //    `JSON.stringify(it)` 给 `[1]` ✓（JS 给 `{}` ✓）——**这是老账** ✓
  //    （「返回数组而不是迭代器」第 214 轮就写在规范里了 ✓），这一轮**没有让它变大** ✓。
  // ② `JSON.parse` 的 reviver 只差**那一趟自底向上** ✓（`SyntaxError` 第 277 轮修好了 ✓）——
  //    顺带接上了一条更基础的：**整棵树在这一次调用期间要锚住** ✓
  //    （回调里会分配 ✓），锚在 `protos.WellKnownSymbols` 上并**存旧恢复** ✓
  //    （回调里再调一次 `JSON.parse` 是合法的 ✓）。
  // 逐条账见 `typescript-exec/README.md` 的「第 279 轮的账」✓。
  // **第 273 轮把这一条从 `blocked` 改成 `differ`** ✓（量准了）：它抛出之前**已经打印了一行** ✓
  // （`Math.hypot` 与 `Math.cbrt` 是**在的** ✓），所以判决落在 `differ` 上 ✓ 而不是 `blocked` ✓。
  // **第 277 轮把这一条从 `blocked` 改成 `differ`** ✓（量准了）：`SyntaxError` 那一族装上之后
  // 它**进得了门**了 ✓（坏输入那一句现在给 `true` ✓）——剩下的是**第一句** ✗：
  // `JSON.parse(文本, reviver)` 的**第二格实参**还没接 ✓，所以数字没有过一遍回调 ✓。
  // **第 279 轮它整个过了** ✓（那一趟自底向上接上了 ✓），所以这一行也删掉了 ✓。
  // **第 277 轮删掉了这两行** ✓（它们过了 ✓）：`Symbol.for` / `keyFor`（注册表挂在
  // `protos.WellKnownSymbols` 上 ✓，键带 `for:` 前缀 ✓——前缀就是「注册过」的判据 ✓）
  // + `Symbol.prototype.toString` ✓（**引擎特判那一支第一次要交出一个可调用值** ✗，
  // 所以多了一格 `DeclareSymbolToString` ✓，还带出一条「属性读有两条路」的教训 ✓），
  // 以及 `SyntaxError` 那一族（第四个错误原型 ✓ + `GlobalNames` 补一个名字 ✓）与
  // `Error(msg, { cause })` ✓。逐条账见 `typescript-exec/README.md` 的「第 277 轮的账」✓。
  // **第 280 轮把这一条从 `blocked` 改成 `differ`** ✓（量准了）：它**进得了门**了 ✓——
  // `Date.UTC` ✓、`toISOString` ✓、`toJSON` ✓、七个 `setUTC*` ✓ 都装上了 ✓。
  // 剩下的是**最后一句** ✗：`new Date("2021-03-04T05:06:07Z")` 那个**字符串实参** ✓
  // （要一个 ISO 解析器 ✓），以及 `JSON.stringify({ d })` 要**认 `toJSON`** ✓
  //（`JsonText` 是个纯查询 ✓、没有调用通道 ✗——那要给它加一格 ✓）。
  // **第 280 轮删掉了这一行** ✓（它过了 ✓）：七个 `setUTC*` + `toISOString` ✓——
  // 而这一族最值钱的一格是**逆变换** ✓（`DateDaysFromCivil` ✓，Hinnant 的 `days_from_civil` ✓）：
  // `DateParts` 从第 138 轮起就给了正向 ✓，而逆变换一直没有 ✗ ⇒ `Date.UTC` 与七个 setter
  // **全都落不下来** ✓。逆变换的 `Math.floor` 那三处是**路障** ✓（负年份上写成截断会整整挪一个纪元 ✓，
  // 而它只在「年份 ≤ 0」时才现形 ✗）。
  // **顺带撞出一条静默的**：第一版把这九格排在 `273..281` ✗，而 `280` / `281` 已经是
  // `ErrorCtor` / `TypeErrorCtor` ✓ ⇒ `Date.UTC(…)` 返回了一个 `TypeError` **对象** ✓
  //（分派表先问错误构造器那一支 ✓）——**号撞车是静默的** ✓，与第 150 轮
  // `ArrayAt = 22` 撞上 `ArrayFlat = 22` 是同一个形状 ✓。改到 `284..292` ✓。

  // ---- 组 11：标准库**在、但语义不对**（3 条）----
  // 这三条比组 10 危险 ✓：**静默错值** ✓，不是响亮地抛 ✓。

  // ---- 组 12：函数当 `ToPrimitive` 该给**源码文本**（1 条）----
  // `fn.toString()` ✓ 与 `String(fn)` ✓ 报的是同一句
  // `unimplemented: ToPrimitive of a function (JS renders source text)` ✓——
  // 与 `ex-tagged-template-suffix` **同一个根** ✓（JS 里 `Function.prototype.toString`
  // 要给**源码文本** ✓，而源码文本得由降级层把区间抄下来 ✓）。
  "function-prototype-tostring": { expect: "differ", why: "`unimplemented: ToPrimitive of a function (JS renders source text)`——与 `ex-tagged-template-suffix` 同一个根：函数当 `ToPrimitive` 要给源码文本，而源码文本要由降级层按区间抄下来" },

  // ---- 组 13：JSON 的那两格扩展（1 条，与组 10 的 reviver 同族）----

  // ---- 组 14：函数的 `length` / `name` 两个属性（1 条）----

  // ---- 组 15：async 那一族（第 286 轮清空了）----
  // **`promise-then-value-and-throw` 那一行删掉了** ✓（它过了 ✓）：与 `prm-microtask-order`
  // 同一个根 ✓——`.then` 回调的返回值与回调里抛的错两条路都通了 ✓
  //（前者一直是好的 ✓，后者修在 `RunNativeTask` ✓：回调跑完看 `Status === Threw` ✓）。

  // ===================== 第 287 轮加宽：矩阵 397 → 556 条，新盖到 39 条缺口 =====================
  //
  // 这一轮**只做加宽** ✓（分母变诚实 ✓，读数会掉 ✓），修法留给后面几轮 ✓。
  // 候选 159 条，先经 `sweep.mjs` 普查 ✓（`pass` 的 120 条直接收编 ✓，
  // `nodefail` 的 4 条是**用例自己不合法** ✗ ⇒ 当场改写成合法形状 ✓ 再收 ✓），
  // 于是矩阵里**一条 `nodefail` 都没有** ✓。下面按**根子**分组 ✓。

  // ---- 组 A：引擎的**静默错值**（第 287 轮 7 条，**第 288 / 289 两轮收掉 2 条**）----
  // 这一组是这一轮最值钱的读数 ✗——它们**全是亮的** ✓（没有一句异常），
  // 所以只能靠「与 `node` 逐字节比」才看得见 ✓。
  // **第 289 轮删掉了 `object-valueof-override` 那一行** ✓（它过了 ✓）——
  // **而它有两个根** ✗，两个都是**静默错值** ✓，两个都在这一轮修掉 ✓：
  // ① **`as` 的优先级**：`a as number + 1` 在 TS 里是 **`(a as number) + 1`** ✓
  //   （`ts.createSourceFile` 给 `BinaryExpression(AsExpression(a, number), +, 1)` ✓），
  //   而本规则把 `+ 1` 当成**类型的一部分**吞进了 `As` ✗ ⇒ 降级之后那个 `+ 1` 整个没了 ✓。
  //   修法在 token 层：`AsReorganization` 收到**值位二元运算符**就收工 ✓（`+ - * / % ** && || ?? == != === !== ^ !` ✓）。
  //   顺带量出**第二处** ✗：收工之后 `+` 前面站的是**折好的 `As` 单元** ✓，
  //   而 `UnaryOperator` / `BinaryOperator` 两份 `IsOperand` 名单里**都没有 `As`** ✗
  //   ⇒ `+` 被读成**前缀一元加** ✗（`<UnaryOperator op="+">+ 1</UnaryOperator>` ✓）。两处一起补才对 ✓。
  // ② **模板串的 hint**：`` `${o}` `` 在 JS 里是 `ToString(o)` ✓ ⇒ `ToPrimitive(o, "string")` ✓
  //   **先问 `toString`** ✓——与 `"x" + o`（`default` ✓ **先问 `valueOf`** ✓）**不是同一件事** ✗。
  //   而本仓两处都走 `StringConcat` ✗ ⇒ `{ valueOf: () => 5, toString: () => "T" }` 印出 `5` ✗（Node 印 `T` ✓）。
  //   修法是**多一个能力号** `TemplateConcat` ✓（与 `StringConcat` **共用同一支实现** ✓，只换 hint ✓）。
  // **第 289 轮删掉了 `symbol-toprimitive-and-concat` 那一行** ✓（它过了 ✓）：
  // 同一条修正顺带把它带过去了 ✓（它那句 `` `${o}` `` 原来也走 `default` ✓）。
  //
  // **第 289 轮还删掉了 `rt-delete-array-element` 与 `rt-IIFE-module-scope` 两行** ✓：
  // ① `delete xs[1]` —— 元素**不住在 `Props` 里** ✓（在 `HeapArray` 的 `Elements` 上 ✓），
  //    而 `DeleteProperty` 只扫 `Props` ✗ ⇒ **一格都碰不到** ✓ 而且**返回 `true`** ✓。
  //    修法是在那一段前面加「数组 + 下标键 ⇒ `SetHole`」✓——键有**两种形态** ✗
  //    （`xs[1]` 给一个整数 ✓、`xs[i]` 也是 ✓；`ArrayIndexAt` 只认字符串 ✓），两档都要认 ✓。
  // ② `(function () { const n = 2 })()` 改写外层的 `n` —— 根子在 `CellOf` ✗：
  //    它看的是 `Env.Last()` ✓（**链上最近的一格**），而本函数**没开环境**时
  //    链尾是**外层函数**的格子 ✓ ⇒ 本层的 `let` / `const` 走 `EnvSet` 写进了外层 ✓
  //    （**静默错值** ✓）。修法是给降级层加一格 `OwnEnv` ✓（进门置假、真开了才置真 ✓），
  //    `CellOf` 在它假的时候直接给 `-1` ✓——那个名字于是落到「现在占槽」那一条 ✓。
  "ex-nonnull-and-as-chain": { expect: "differ", why: "**静默错值**：`o!.a!.b![1]` 给整个数组而不是 `2`——非空断言串在成员链上时把后面那一截丢掉了（`(o as any).a.b.length` 是对的）" },
  "rt-iife-forms": { expect: "differ", why: "**静默错值**：`((a: number, b: number) => a + b)(2, 3)` 给 `NaN`——**带类型标注**的箭头函数出现在立即调用位置时，形参没绑上（不带标注的箭头立即调用是对的）" },

  // ---- 组 B：`delete` 与**原始值接收者**上的赋值（2 条）----
  // 两条都卡在同一族判据上 ✓：写操作先问「接收者是不是对象」✓，
  // 而 JS 在这一格上**不抛** ✗（松散模式静默无效 ✓）。
  "rt-string-index-write-ignored": { expect: "blocked", why: "`unimplemented: assigning an index on a primitive receiver`：`\"abc\"[0] = \"z\"` 在 JS 里**静默无效**（不抛），本仓在降级期就挡住" },
  "rt-accessor-override": { expect: "blocked", why: "`unimplemented: assigning a property on a primitive receiver`：报在子类 `set value(next) { super.value = next }` 那一句上——`super.value = x` 该写进**接收者**（实例），却被当成了写在一个原始值上" },

  // ---- 组 C：环境格与闭包（2 条）----
  "rt-loop-capture-let-vs-var": { expect: "differ", why: "`for (var j = 0; …) fns.push(() => j)` 报 `environment index out of range: 1`——`var` 那一格**不按迭代复制** ✓（对的那一半 ✓），差的是闭包读它时算出的槽位越界" },
  "rt-ternary-nesting-and-assign": { expect: "blocked", why: "`flag ? (flag = false) : (flag = true)` 报 `name is not a local or a capture: return`——**三元的分支位**上放一个赋值表达式时，作用域收集把 `return` 当成了要绑的名字" },

  // ---- 组 D：生成器对象上那两格（2 条）----
  // `it.return(v)` / `it.throw(e)` 是 `Generator.prototype` 上的两格 ✓，
  // 本仓的生成器对象只有 `next` ✗（`cannot call a non-closure value`）。
  "rt-generator-return-early": { expect: "differ", why: "`it.return(9)` 不在那儿（生成器对象上只有 `next`）——`return` 要跑 `finally` 并把 `done` 置上" },
  "rt-generator-throw-into": { expect: "differ", why: "`it.throw(e)` 不在那儿（生成器对象上只有 `next`）——`throw` 要把那一抛投进**挂起点**，体内 `catch` 接得住" },

  // ---- 组 E：可选调用那一条（1 条）----
  "rt-optional-chain-null-base": { expect: "differ", why: "**基名是 null 的可选调用**（`f?.()`）报 `cannot call a non-closure value`——`?.` 该整条短路，这里却照样去调了（`f?.[0]` / `f?.p` 那一半是对的）" },

  // ---- 组 F：降级层的两种形状（3 条）----
  "ex-class-computed-and-static-init": { expect: "blocked", why: "`unimplemented: computed class field name`：类字段的计算名 `[k] = v` 没接（计算**方法**名第 229 轮就通了 ✓）" },

  // ---- 组 G：标准库**成员不在那儿**（第 287 轮 7 条，**第 288 轮收掉 3 条**）----
  // 量法与第 273 轮一致 ✓：一个探针把候选成员逐个 `typeof` 一遍 ✓，
  // 把「根本不在那儿」与「在、但语义不对」分开 ✓（修法不一样 ✓）。
  //
  // **第 288 轮收掉的三格** ✓（`Math` 三角七格 ✓ · `Number.isSafeInteger` ✓ ·
  // `Object.getOwnPropertySymbols` ✓）——**两条教训** ✗：
  // ① **三角七格是本轮最便宜的一格** ✓（往 `Math` 那两张按下标的表里各加七项 ✓）——
  //    而它拖到第 288 轮才被量到 ✗，因为第 273 轮那份普查按「**已经想到的形状**」铺 ✓，
  //    没人想到去写 `Math.sin` ✓（第 287 轮的加宽把它问了出来了 ✓）。
  // ② **`isSafeInteger` 与 `isInteger` 只差一个边界** ✓、**`getOwnPropertySymbols` 与
  //    `getOwnPropertyNames` 只差「键是不是符号」** ✓——两处都**复用**了兄弟那一支 ✓，
  //    没有另写一份 ✗（第 283 轮那条「第二份迟早与第一份走偏」✓）。
  "string-raw-and-tagged": { expect: "blocked", why: "`String.raw` 不在那儿（`typeof (String as any).raw` 给 `undefined`）——标签模板的 `raw` 那一栏投影里也没有" },

  // ---- 组 H：标准库**在、但语义不对**（第 287 轮 15 条，**第 288 轮收掉 5 条**）----
  // 与组 A 同样是**静默错值** ✓，只是这一组住在标准库里 ✓。
  //
  // **第 288 轮收掉的五条** ✓：
  // ① `Map` / `Set` 的 `forEach` **第三格实参**（两条 ✓）——`self` 就在手边 ✓，
  //    补一格实参就完了 ✓（第 142 轮把实参表开宽之后这是**顺手**的 ✓，只是没人回头补 ✗）；
  // ② `"a".repeat(2.9)`（一条 ✓）——**根子不在 `repeat`** ✗，在**共用的取值器 `ArgOr`** ✓：
  //    它原来对 `Float64` 一律走 `AsInt()` ✓ ⇒ **每一个小数实参都静默变成 `0`** ✗
  //    （`fill(9, 1.5)` 从 0 开始填 ✗、`at(1.5)` 给第 0 格 ✗ ……）。
  //    改在 `ArgOr` 一处 ✓ ⇒ 十几个内建一起对 ✓；同一条判据当场抓到第二处 ✗：
  //    `repeat(-1)` 抛的是**裸 `Error`** ✓，而脚本看得见 `e.name` ✓（Node 给 `RangeError` ✓）；
  // ③ `Math.hypot()` **空实参**（一条 ✓）——少一条早退 ✓（`Math.max()` 第 206 轮那条
  //    **同一个形状** ✓，`hypot` 那一支当时没跟着补 ✗）；
  // ④ `-0` 那一格记在组 A ✓。
  "object-assign-forms-and-order": { expect: "differ", why: "**静默错值**：`Object.assign({}, \"ab\")` 给 `{}`（Node 给 `{\"0\":\"a\",\"1\":\"b\"}`）——字符串当源时要按**码元**展开成下标键" },
  "string-concat-and-trim-families": { expect: "differ", why: "`unimplemented: trim with a non-ASCII edge`：`\\u00a0`（不换行空格）在 JS 里**是可 trim 的**，本仓只认 ASCII 那一档" },
  "global-explicit-and-implicit": { expect: "differ", why: "`unimplemented: Object(primitive) needs wrapper objects`——`Object(1)` 那一档要造包装对象（`new Object(null)` 是好的 ✓）" },
  "rt-instanceof-custom": { expect: "differ", why: "与 `symbol-hasinstance` **同一个根**：`static [Symbol.hasInstance](v)` 降级得出来 ✓，但 `instanceof` 那头没问那一格（引擎的 `RtInstanceOf` 只沿原型链找 `C.prototype`）" },

  // ===== 第 290 轮：矩阵加宽 95 条量到的那一批（29 条缺口，按根子分组）=====
  //
  // 这一轮的选题是「先把 exec / runtime / 标准库 的语料铺满」✓，所以**先加宽、再照读数挑** ✓
  //（与第 287 轮同一条口径 ✓）。下面按**根子**分组 ✓——同一组的修法一样 ✓，一起做才不白付 ✓。
  //
  // **组 A：标准库「成员不在那儿」（9 条）** ✓——都是 `cannot call a non-closure value` ✓
  //（即那一格**根本没装** ✗）。按「普通 `.ts` 里有多常见」排 ✓：`Date` 多实参构造与 `Date.parse` ✓、
  // `fn.name` / `fn.length` ✓（与已有的 `function-length-and-name` 同一件事 ✓）、
  // `Promise.any` / `allSettled` ✓、`WeakMap` ✓、`AggregateError` ✓、
  // `Object.getOwnPropertyDescriptors` / `Object.groupBy` ✓、`Array.prototype.toLocaleString` ✓、
  // `String.normalize` ✗（要 Unicode 归一化表 ✓，与 `localeCompare` 同一条纪律 ✓）。
  "object-getownpropertydescriptors": { expect: "blocked", why: "`Object.getOwnPropertyDescriptors`（复数）没装——单数那格（412）第 276 轮就有了，缺的是「一趟扫自有键、每格复用同一次读描述符」" },
  "string-normalize": { expect: "blocked", why: "`String.normalize` 没装——NFC / NFD 要一张 Unicode 归一化表，本仓没有（与 `toUpperCase` / `localeCompare` 同一条纪律：不编一个看起来对的答案）" },
  //
  // **组 B：标准库「在、但语义不对」（4 条）** ✓——**全是静默错值** ✗，一句异常都没有 ✓。
  "array-tostring-custom-values": { expect: "differ", why: "**静默错值**：`[new C(), 1].toString()` 给 `[object Object],1`（Node 给 `C!,1`）——`ValueUnits` 对普通对象**写死了 `[object Object]`**，没走 `ToPrimitive(el, \"string\")` ⇒ 元素自己那个 `toString` 根本不被调。根子与 `json-stringify-tojson-and-specials` 同一处：**取文本这条路上没有回调通道**" },
  //
  // **组 C：降级层 / token 层（3 条）** ✓
  "ex-arrow-immediately-invoked-typed": { expect: "differ", why: "**静默错值**：`((a: number, b: number) => a + b)(1, 2)` 给 `NaN`——带类型标注的箭头出现在立即调用位置时形参没绑上（不带标注的箭头立即调用是对的）。与已有的 `rt-iife-forms` **同一个根**：括号里的形参表怎么被收" },
  "ex-nonnull-chain-index": { expect: "differ", why: "**静默错值**：`o!.a!.b![1]` 给整个数组而不是 `2`——非空断言串在成员链上时把后面那一截丢掉了。与已有的 `ex-nonnull-and-as-chain` **同一个根**（投影层 `!` 的尾）" },
  //
  // **组 D：`arguments`（2 条）** ✓——`arguments` 这个对象**这一层根本没有** ✗。
  "rt-arguments-object": { expect: "blocked", why: "`arguments` 没做（`name is not a local or a capture: arguments`）——它是有运行期语义的一格（形参个数 / 下标 / 箭头里看外层那一份），要走「函数进门时造一个数组式对象」那条路" },
  "rt-arguments-vs-rest": { expect: "blocked", why: "同上：`arguments` 与剩余形参并存时两者都要对（`arguments.length` 是**实参**个数）" },
  //
  // **组 E：生成器少了「送进挂起点」那一格（2 条）** ✓——**静默错值** ✗。
  "rt-generator-next-sends-value": { expect: "differ", why: "**静默错值**：`it.next(10)` 的值没送进挂起点（`yield a + 1` 里 `a` 拿到 `null` / `undefined`，Node 给 `10`）。`next()` 第 229 轮就接上了，缺的是「实参写进 `yield` 表达式那一格」" },
  "rt-generator-next-arg-ignored-first": { expect: "differ", why: "同上，另一半：**第一次 `next(v)` 的实参必须被丢掉**（JS 的规矩）——这一条要等上一条做完才谈得上" },
  //
  // **组 F：`for..in` 只走自有键（1 条）** ✓——**静默错值** ✗。
  "rt-forin-order-and-inherited": { expect: "differ", why: "**静默错值**：`for (const k in o)` 只给自有键（Node 还会走原型链上的可枚举键）。根子在 `lowering.xl.md` 的 `LowerForIn`——它把这一条**拼成 `Object.keys`**，而 `Object.keys` 的口径就是自有键；那句「今天原型上没挂可枚举东西，所以差别看不见」现在被 `Object.create({ inherited: true })` 当场证伪" },
  //
  // **组 G：`class X extends Array`（1 条）** ✓
  "rt-instanceof-array-subclass": { expect: "blocked", why: "`class MyList extends Array {}` 报 `this method needs an array receiver`——实例是普通对象、数组方法不认它。要一条「按内置类做实例的 `[[Prototype]]` 与内部槽」的路" },
  //
  // **组 H：`replace` 的那两格（2 条）** ✓——`String.replace` 只认两个字符串实参 ✗。
  //
  // **组 I：`Date` 的文本（1 条）** ✓
  //
  // ===== 第 291 轮加宽：exec / runtime / 标准库 三层一起铺（126 条候选）=====
  // 逐条读数（`sweep.mjs`）：**97 pass / 17 blocked / 12 differ / 0 nodefail**。
  // 下面 29 行按**根子**分组 ✓——同一组的修法一样，一起做才不白付 ✓。
  // 这一轮**量到的**多半是「普通 `.ts` 里天天见、此前一条判据都没有」的形状 ✗：
  // `fn.name` / `fn.length` / `String.substr` / `Date.parse` / `Math.LN2` /
  // `Object.isExtensible` / `WeakSet` / `ReferenceError` / `Promise.allSettled` ✓。
  //
  // **组 A：`namespace` 带值那一族（3 条）** ✓——与缺口清单 #4 同一根。
  "c291-ex-nested-namespace-with-values": { expect: "blocked", why: "这一条是**一行写完**的那个形状（`namespace Outer { export namespace Inner { … } export const w = Inner.v + 1; }`）——第 292 轮把 `namespace` 本身做出来了 ✓（另外 7 条当场转绿 ✓），剩下的根子**不在降级层** ✗：`Namespace` 这个单元**不算语句边界** ⇒ 同一行后面那句 `export const w = …` 的 `=` 被读成**二元运算符**、左边正好是它 ⇒ 投影出来是 `ExpressionStatement(BinaryExpression(ModuleDeclaration, EqualsToken, …))`，降级层报 `unimplemented: assignment to a non-identifier`。第 292 轮**试过**把 `Namespace` 收进 `IsStatementUnit`：那一处修好了 ✓，可外层 `ModuleBlock` 的产物从 `statements:[ModuleDeclaration]` 变成 `body: ModuleDeclaration`（实测 `--ts-ast`）⇒ 降级层取不到语句 ⇒ 内层命名空间**根本没建**、报 `cannot read properties of undefined`（**静默错值** ✗）。收益 1 条、代价是嵌套那一档从「报错」变成「静默错值」，所以**退回来了**；要动就得把「语句边界」与「`ModuleBlock` 的收法」一起改" },
  //
  // **组 B：属性枚举的整数键优先序（2 条）** ✓——**静默错值** ✗。
  //
  // **组 C：生成器的 `next(v)` 送值（1 条）** ✓——与 `rt-generator-next-sends-value` 同一根。
  "c291-rt-generator-forms": { expect: "differ", why: "生成器的 `next(5)` 送值：`const x = yield 1` 收不到（给 `undefined`，于是 `x * 2` 印 `null`）——`yield` 表达式要读**上一格送进来的值**" },
  //
  // **组 D：构造函数上的原型读（1 条）** ✓
  "c291-rt-class-shapes": { expect: "blocked", why: "`Object.getPrototypeOf(B) === A` 报 `unimplemented: Object.getPrototypeOf over this kind of value`——第 278 轮给 `extends` 补了**第二步**（`B` 自己的链），但那一格在**函数值**上没有读出来的口子" },
  //
  // **组 E：计算键上的函数值 / 方法里的箭头（2 条）** ✓
  "c291-rt-closure-and-method-this": { expect: "blocked", why: "`obj.get()()` 报 `cannot call a non-closure value`——方法体里 `return () => this.v` 返回的箭头要带着 `this` 出帧、再被调用" },
  "c291-rt-iteration-protocol-forms": { expect: "blocked", why: "`{ [Symbol.iterator]: () => it }` 报 `cannot call a non-closure value`——与上一格同一族（计算键上的函数值那条路），也牵着 `c291-symbol-wellknown-custom-iterator`" },
  //
  // **组 F：码元 vs 码点（1 条）** ✓——与 `rt-surrogate-iteration` 同一根。
  //
  // **组 G：显式取出来的迭代器（1 条）** ✓
  "c291-array-iterator-protocol-manual": { expect: "blocked", why: "`xs[Symbol.iterator]()` 报 `cannot call a non-closure value`——`for..of` 内部那条路是好的，**显式取出来自己调**这一格还没接（组 E 那一族的另一半）" },
  //
  // **组 H / I / J：标准库「成员不在那儿」最日常的三格（3 条）** ✓
  "c291-string-normalize-ascii": { expect: "blocked", why: "`String.prototype.normalize` 还没挂表（与 `string-normalize` 同一格）。ASCII 上该原样返回；组合字符上要合一（那一档要 Unicode 归一化表，是单独的活）" },
  //
  // **组 K：包装对象（2 条）** ✓
  "c291-number-wrapper-and-negative-zero": { expect: "differ", why: "`typeof new Number(5)` 给 `\"number\"`（Node 给 `\"object\"`）——包装对象整族还没造（`new Number` 返回的是原始值）。`-0` 那两格是对的" },
  "c291-global-object-wrappers": { expect: "blocked", why: "`Object(1)` 报 `unimplemented: Object(primitive) needs wrapper objects`——与上一格同一根，`install.xl.md` 里那一支是**明写**的缺口" },
  //
  // **组 L：Math 的两个常量（1 条）** ✓——**静默错值** ✗。
  //
  // **组 M：`Object.isExtensible`（1 条）** ✓
  //
  // **组 N：`WeakSet`（1 条）** ✓
  //
  // **组 O：计算键 + 生成器方法（1 条）** ✓
  "c291-symbol-wellknown-custom-iterator": { expect: "blocked", why: "对象字面量里**计算键 + 生成器方法**（`{ [Symbol.iterator]: function* () {} }`）报 `suspend outside a generator`——方法那一格建成了普通闭包，`yield` 就落在生成器外面" },
  //
  // **组 P：`Date.parse`（1 条）** ✓
  //
  // **组 Q：承诺组合子少两格（2 条）** ✓
  //
  // **组 R：函数自己的 `name` / `length`（3 条）** ✓
  "c291-function-prototype-shape": { expect: "differ", why: "`Function.prototype.call.length` 给 `undefined`（Node 给 `1`）——内建函数自己的 `length` 这一格没填，与上面两条同一组" },
  //
  // **组 S：函数当 `ToPrimitive` 要给源码文本（1 条）** ✓——缺口清单 #11。
  "c291-function-tostring-forms": { expect: "blocked", why: "`fn.toString()` 报 `unimplemented: ToPrimitive of a function (JS renders source text)`——函数要交出**源码文本**，得由降级层按区间抄下来（与 `function-prototype-tostring` 同一根）" },
  //
  // **组 T：`ReferenceError`（1 条）** ✓
  //
  // **组 U：函数显示名的推断（1 条）** ✓
  "c291-console-log-nested-shapes": { expect: "differ", why: "`console.log({ f: () => 1 })` 印 `[Function (anonymous)]`（Node 印 `[Function: f]`）——匿名函数要**从属性名反推显示名**（与 `function-name-inference` 同一族）" },
};

