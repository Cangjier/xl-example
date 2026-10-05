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
  "prm-microtask-order": { expect: "differ", why: "`.then(…).then(…)` 的返回值链：回调跑完之后收尾就出事（还走不到「采纳返回值」那一步）——探针证明 `AdoptInto` 从未被触达" },
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
  // ---- 组 1：`implements` 子句被当成值求值（2 条）----
  // `class Person implements Named, Aged` 报 `name is not a local or a capture: Named` ✓。
  // **`extends` 与 `implements` 在 TS 的 AST 里是同一个数组的两格** ✓
  //（`heritageClauses[0]` / `[1]` ✓），而本仓只认了前者 ✗——后者的实体名被当**值**降级了 ✓，
  // 于是「一个指令都不该产生」的类型位变成了一次**未声明名字的读** ✗。
  "ex-implements-and-heritage": { expect: "blocked", why: "`implements` 子句被当成**值**降级（`name is not a local or a capture: Named`）：TS 的 `heritageClauses` 里 `extends` 与 `implements` 是两格，只认了 `extends`。入口 `typescript-exec/lowering.xl.md` 类降级认 heritage 那一支" },
  "ex-abstract-implements": { expect: "blocked", why: "同 `implements` 那一处（`abstract class Base implements Shape`）——不是 abstract 的问题" },

  // ---- 组 2：枚举名在**函数体里**看不见（1 条）----
  // `ex-enum-numeric` 一直是绿的 ✓（它在**文件顶层**用 `Color` ✓）；这一条把同一件事放进
  // `function weight` 里 ✓ 就报 `name is not a local or a capture: Kind` ✗。
  // 也就是说枚举的名字只进了**最外那一层**的名字表 ✓，函数那一层没有 ✗。
  "ex-enum-in-switch": { expect: "blocked", why: "枚举名在**函数体里**看不见（`name is not a local or a capture: Kind`）——顶层用是好的。入口 `typescript-exec/scope.xl.md` 的 `CollectDeclaredNames` / `Hoist`" },

  // ---- 组 3：枚举的反向映射只认字面量（1 条）----
  // 第 230 轮自己写下的已知差 ✓（当时判据量不到 ✓）：`IsNumericInitializer` 只认
  // 「没有初始化式」与「数值字面量」两档 ✓，`A = BASE` / `C = 1 + 1` 这种**算出来的数**
  // 不挂反向格 ✗ ⇒ `E[10]` 给 `undefined` ✓（Node 给 `"A"` ✓）。
  "ex-enum-computed-initializer": { expect: "differ", why: "反向映射只给「没有初始化式」与「数值字面量」两档：`A = BASE` / `C = 1 + 1` 不挂反向格 ⇒ `E[10]` 是 `undefined`（Node 给 `\"A\"`）。第 230 轮记下的已知差" },

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
  "rt-surrogate-iteration": { expect: "differ", why: "字符串迭代按 **UTF-16 码元**走：`[...\"a\\u{1F600}b\"].length` 给 4（Node 给 3）。JS 的字符串迭代器一次一个**码点**，代理对要合起来" },

  // ---- 组 8：投影不认的两种形状（2 条）----
  // 两条都是「降到一半发现树上的节点形状不是预期的那一个」✓，而根子在**投影** ✗：
  // ① 尖括号断言 `<T>expr` ✓——TS 的 AST 里它与 `as` 是**两个 kind**
  //   （`TypeAssertionExpression` vs `AsExpression` ✓），本仓只认了后者 ✗；
  //   顺带记一笔**裁判的取法** ✗：`node` 的剥离模式**明确拒收**尖括号写法 ✓
  //   （「与 JSX 有歧义」✓），所以这一条的 `nodeArgs` 是 `--experimental-transform-types` ✓。
  // ② 对象字面量里的**计算访问器名** ✓（`get [k + "2"]()`）——报的是
  //   `ast node ComputedPropertyName has no text` ✓；而**普通**计算方法名
  //   （`{ [k]() {} }` ✓，`ex-computed-member-call` 那条）一直是好的 ✓。
  "ex-angle-bracket-assertion": { expect: "blocked", why: "`unimplemented: expression TypeAssertionExpression`：尖括号断言与 `as` 在 TS 的 AST 里是两个 kind，只认了 `as`。裁判要用 `--experimental-transform-types`（剥离模式明确拒收尖括号写法）" },
  "ex-object-literal-accessors": { expect: "blocked", why: "对象字面量里的**计算访问器名**（`get [k + \"2\"]()`）报 `ast node ComputedPropertyName has no text`；普通计算方法名（`{ [k]() {} }`）是好的。入口：对象字面量成员那一支的投影" },
  // 这一条与组 10 的「成员不在那儿」是**同一类** ✓，只是它住在 `ex` 层 ✗
  //（`String.raw` 是 `String` 上的一格 ✓，而它挡住的是一条**标签模板**的用例 ✗）。
  "ex-string-raw-and-tagged": { expect: "blocked", why: "`String.raw` 不在那儿（`typeof String.raw` 给 `undefined`）——第 273 轮量到。与组 10 那些「成员不在那儿」同类，只是这条落在 `exec` 层（它挡住的是一条标签模板用例）" },

  // ---- 组 9：整块都是类型位的 `namespace` 该**整块擦掉**（1 条）----
  // 这一条不是「namespace 没做」那一条 ✗——它体内**一个运行期东西都没有** ✓
  //（`export type` 与 `export interface` 都是类型位 ✓），所以正确结局是
  // **一个指令都不产生** ✓，而不是造一个空对象 ✓。挡在门口的却是同一句
  // `unimplemented: statement ModuleDeclaration` ✗——也就是「先问体内有没有运行期东西」
  // 这一问还不存在 ✗。
  "ex-nested-namespace-type-only": { expect: "blocked", why: "体内**全是类型位**的 `namespace`（`export type` / `export interface`）本该整块擦掉（产生的运行期东西一个都没有），却和真 `namespace` 一样挡住：`unimplemented: statement ModuleDeclaration`。要先做「体内有没有运行期东西」这一问" },

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
  "date-iso-and-json": { expect: "differ", why: "`new Date(字符串)` 还没接（`new Date(x) needs a number of milliseconds`），以及 `JSON.stringify({ d })` 要认 `toJSON`（`JsonText` 没有调用通道）。**前半条：`Date.UTC` / `toISOString` / `toJSON` / 七个 `setUTC*` 第 280 轮装上了** ✓" },
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
  "json-stringify-replacer": { expect: "differ", why: "`JSON.stringify(o, [\"a\", \"c\"])` 的 **replacer 数组被忽略**（打出了整个对象）；`JSON.stringify({ when: new Date(0) })` 给 `{\"when\":{}}`（`Date.prototype.toJSON` 不在）" },

  // ---- 组 14：函数的 `length` / `name` 两个属性（1 条）----
  "function-length-and-name": { expect: "differ", why: "`fn.length` 与 `fn.name` 都是 `undefined`：闭包那一格上没挂这两个属性（第 238 轮补的是 `HeapClosure.Name` 那一格**内部**的名字，供 `console.log` 用；属性读那一面没有）" },

  // ---- 组 15：async 那一族（1 条，与 `prm-microtask-order` 同一个根）----
  "promise-then-value-and-throw": { expect: "differ", why: "与 `prm-microtask-order` 同一个根：`.then` 回调跑完之后收尾就出事（`AdoptInto` 从未被触达），所以「回调返回一个值」与「回调里抛错」两条路都走不到" },
};

