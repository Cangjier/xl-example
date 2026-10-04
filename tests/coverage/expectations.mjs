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
  "cls-inherited-accessor": { expect: "blocked", why: "同 `ex-getter-setter-class`：`super.v` **属性访问**没做（`super` 只做了方法调用那一格 ✓——`super.m(...)` 那条路第 104 轮就通了 ✓）。**第 224 轮查清为什么它不是个小改动**：JS 的 `super.v` 是「**从父原型开始找**、但 `this` 还是当前实例」✗，而本仓现成的两件都不够用——`GetProperty(receiver, key)` 从**接收者**开始找 ✗（它会先命中实例自己的那一格 ✗），`FindProperty(句柄, key)` 也只能「从这个句柄开始沿链找」 ✓ 而 `ReadProperty(..., receiver)` 的 `receiver` 是**读出来的那一格**用的 ✓。要凑齐「起点是父原型 + 读的时候 `this` 是实例」这两件事，得给引擎加一条**带接收者的、从指定原型起读**的入口 ✗（不然父原型上的访问器会拿到 `this = 原型` ✗，是**静默错值** ✗）。" },
  "fn-named-expression": { expect: "blocked", why: "具名函数表达式的名字没绑进函数自己那一层作用域" },
  "prm-combinators": { expect: "differ", why: "`Promise.all` 里**非承诺的项**丢了（`[p, p, 3]` 给 `1,2,`）" },
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
  "ex-computed-member-call": { expect: "differ", why: "函数的显示形态：`[Function: run]` vs `[Function (anonymous)]`" },
  // **第 232 轮删掉了 `ex-spread-in-new` 那一行** ✓（它过了 ✓）：它的最后一句话是
  // `new Map([[1, 2]] as any)` ✓——**实参位里的 `as`** ✓。产物那边 `x as T` 是
  // **两格平级单元** ✓（`Identifier` 与 `As` ✓），而 `new` 的实参位原来走「逐格投」✗，
  // 于是 `As` 被单独投成一个**没有 `expression`** 的 `AsExpression` ✗。
  // 改成与 `CallExpression` 的实参位**同一个写法**（按顶层逗号切段、每段走 `Expression` ✓）之后，
  // 展开那两句（`new P(...args)` / `new P(...[3, 4])`）本来就是好的 ✓，整条跟着通了 ✓。
  "ex-parameter-properties": { expect: "differ", why: "构造函数参数属性：门进得去，但字段的值是错的（`1 6 3` vs `undefined NaN 0`）——**静默错值**" },
  // **第 230 轮删掉了 `ex-yield-star` 那一行** ✓（它过了 ✓）：`yield*` 落成一段
  // **等价的循环** ✓（`lowering.xl.md` 的 `LowerYieldDelegation` ✓）——
  // 拼的是 `GetIterator` + `IterNew` + `IterNext` + `Suspend` / `Resume` 五样现成的 ✓。
  "ex-private-in-operator": { expect: "blocked", why: "`#x in o` 没做（私有名字的品牌检查）" },
  "ex-getter-setter-class": { expect: "blocked", why: "`super.v` 属性访问（`super` 只做了方法调用那一格）" },
  "ex-labeled-block": { expect: "blocked", why: "带标签的块：标签该挂在块上（现在只收循环与 `switch`）" },

  // ===== stdlib：内建成员与标准形状 =====
  "array-spread-conditional": { expect: "blocked", why: "发现于第 214 轮：展开一个**条件表达式**（`[...cond ? a : b]`）降级不出来（`unimplemented: expression SpreadElement`）——`[...xs]` / `[...f()]` 一直是好的 ✓" },
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
  "symbol-description": { expect: "differ", why: "第 217 轮查清：`Symbol.prototype.description` 是**访问器**，要挂在符号的**原型**上——而 `Protos` 表里**没有符号那一格**（`Protos` 只有对象/数组/字符串/数/布尔/集合/错误那几族），所以这一格要**先给引擎加一个符号原型**（与 `Number.prototype` 让原始值读得到方法那条路同源）。这一轮只把根子写清，没动引擎。" },
  "console-log-special": { expect: "differ", why: "第 217 轮定性：这是**口径边界**，不是缺口——Node 对 `console.log(new Error(\"x\"))` 打的是**栈**（第一行 `Error: x`、后面是文件路径与行号），而栈**由宿主决定**、逐字节对不上是**必然**的（与 `Object.freeze` 那条严格/松散分歧同一类）。`Error.prototype.toString` 第 213 轮已经装上，`String(e)` / `e + 1` 都是对的。" },
  "error-engine-throws": { expect: "differ", why: "调用一个非函数的值该抛 `TypeError`（现在报的是别的）" },
  "promise-constructor": { expect: "blocked", why: "`new Promise(执行器)` 没做（要同步跑一次执行器 + 造两个宿主回调）" },
  "promise-chaining-errors": { expect: "blocked", why: "`.then` 回调里抛的错没接到拒绝链上" },
  "promise-all-kinds": { expect: "differ", why: "`Promise.all` 里**非承诺的项**丢了（与 `prm-combinators` 同一处）" },
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
