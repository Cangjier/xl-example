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
  "op-typeof-forms": { expect: "blocked", why: "发现于第 211 轮：`typeof {}` / `typeof []` 这一类在 **token 层**就把 `typeof` 留成了兄弟单元（`TypeOfKeyword` ✗），对象字面量那一段与它对不上——`typeof <标识符>` 一直是好的 ✓" },
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
  "gen-delegating": { expect: "blocked", why: "`yield*` 没做（要**惰性转发**，不是一次收完）" },
  "prm-combinators": { expect: "differ", why: "`Promise.all` 里**非承诺的项**丢了（`[p, p, 3]` 给 `1,2,`）" },
  "prm-async-await": { expect: "blocked", why: "`await` 一个**不是承诺**的值" },
  "prm-async-throw": { expect: "blocked", why: "`async` 函数里 `throw` 没有变成返回承诺的**拒绝**" },
  "prm-microtask-order": { expect: "differ", why: "微任务队列的次序（嵌套入队那一档）" },
  "gc-churn": { expect: "blocked", why: "**步数预算**：两万次循环就 `step budget exhausted`（普通循环够不着这个量级）" },

  // ===== exec：TS 形状 → 运行期语义 =====
  "ex-enum-numeric": { expect: "blocked", why: "`enum` 整族没做（含反向映射）——有运行期语义" },
  "ex-enum-string": { expect: "blocked", why: "字符串 `enum` 没做（没有反向映射那一半）" },
  "ex-enum-const": { expect: "blocked", why: "`const enum` 没做（该内联成字面量）" },
  "ex-namespace": { expect: "blocked", why: "`namespace` 没做（含嵌套与导出）——有运行期语义" },
  "ex-tagged-template-suffix": { expect: "blocked", why: "函数当 `ToPrimitive` 时该给**源码文本**（`Function.prototype.toString`）" },
  "ex-typeof-value-expression": { expect: "blocked", why: "`typeof (表达式)`：投影认成了 `TypeLiteral`" },
  "ex-computed-member-call": { expect: "differ", why: "函数的显示形态：`[Function: run]` vs `[Function (anonymous)]`" },
  "ex-spread-in-new": { expect: "blocked", why: "`new Map([[1,2]] as any)`：`AsExpression` 那一层没有子表达式" },
  "ex-parameter-properties": { expect: "differ", why: "构造函数参数属性：门进得去，但字段的值是错的（`1 6 3` vs `undefined NaN 0`）——**静默错值**" },
  "ex-yield-star": { expect: "blocked", why: "`yield*` 转发没做（与 `gen-delegating` 同一处）" },
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
  "global-boolean": { expect: "differ", why: "`new Boolean(false)` 该是个**对象**（真），现在给 `false`" },
  "global-array-object-ctors": { expect: "blocked", why: "`new Object(null as any)` 的 `AsExpression` 那一层" },

  // ===== e2e：几族合起来 =====
  "e2e-event-emitter": { expect: "blocked", why: "类字段初始化器里引一个全局名（`new Map`）报「name used before its declaration」" },
  "e2e-async-workflow": { expect: "blocked", why: "`await` 一个非承诺值 + `async` 方法（同前面两格）" },
  "e2e-mixed-everything": { expect: "blocked", why: "**第 229 轮做掉了一半** ✓：类里的**生成器方法**（`*keys()`）现在降级得出来 ✓（原来整份文件进不来 ✗）——差的是同一个类里的 `async total(key)` ✗（`async method in a class` 照旧**响亮地抛** ✓）。**为什么 async 那一半不顺手做** ✗：`async` 的三条语义差写在 `lowering.xl.md` 文首 ✓——本仓的 `await` 挂的是**当前帧** ✓，所以调用者拿不到承诺 ✗；第 229 轮试过「把非承诺值包成已兑现承诺」那一半 ✓，判据**当场红两条** ✗（原来「响亮地抛」变成「静默 `undefined`」✗），于是退回来了 ✓。**那一整条要连着「async 函数返回承诺」一起做** ✗。" },
};
