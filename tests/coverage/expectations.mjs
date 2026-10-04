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
  "fn-call-apply-bind": { expect: "blocked", why: "`Function.prototype.call` / `apply` / `bind` 都没装（`greet.call(o, 1, 2)` 报 `calling a non-closure value`）——它们在普通 `.ts` 里很常见" },
  "exc-throw-in-callback": { expect: "differ", why: "**回调里抛的异常没有立刻中断 `forEach`**：`[1,2,3].forEach(v => { if (v===2) throw … })` 里第 3 项**照跑**了（本仓 `13|caught:cb2|fin`，node `1|caught:cb2|fin`）——异常在最后才冒出来，属于**静默**那一类" },
  "gen-try-finally": { expect: "blocked", why: "同 `gen-basics`：生成器对象的 `next()` 调不动（`calling a non-closure value`）——`for..of` / 展开那两条路是好的" },
  "cls-inherited-accessor": { expect: "blocked", why: "同 `ex-getter-setter-class`：`super.v` **属性访问**没做（`super` 只做了方法调用那一格）" },
  "fn-named-expression": { expect: "blocked", why: "具名函数表达式的名字没绑进函数自己那一层作用域" },
  "gen-basics": { expect: "blocked", why: "生成器对象上的 `next()` 调不动（`calling a non-closure value`）" },
  "gen-delegating": { expect: "blocked", why: "`yield*` 没做（要**惰性转发**，不是一次收完）" },
  "gen-lazy-and-state": { expect: "blocked", why: "同 `gen-basics`：生成器对象的 `next()`" },
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
  "array-reduce": { expect: "differ", why: "空数组 + 无初值该抛 `TypeError`，抛的是 `Error`" },
  "array-spread-conditional": { expect: "blocked", why: "发现于第 214 轮：展开一个**条件表达式**（`[...cond ? a : b]`）降级不出来（`unimplemented: expression SpreadElement`）——`[...xs]` / `[...f()]` 一直是好的 ✓" },
  "object-freeze": { expect: "blocked", why: "**口径分歧**：本仓对只读属性**抛**（严格模式），node 把 `.ts` 当 CJS 跑是**松散模式**静默失败" },
  "object-freeze-array-element": { expect: "differ", why: "**静默错值**：冻住的数组还能 `push`（要动引擎的写屏障）" },
  "object-tostring-tag": { expect: "blocked", why: "`Object.prototype.toString` 只答了能证的那一格，`call` 这条形状过不去" },
  "symbol-concat-throws": { expect: "differ", why: "发现于第 215 轮：`\"x\" + Symbol()` 与模板串里插符号**抛的是 `Error`**（JS 是 `TypeError`）——语言层那几处 `throw` 没有类别，与「引擎抛的也要是 TypeError」那条同源" },
  "symbol-hasinstance": { expect: "blocked", why: "类上的**计算成员名**（`static [Symbol.hasInstance]`）降级不出来" },
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
  "e2e-mixed-everything": { expect: "blocked", why: "类里的生成器方法（`*keys()`）降级不出来" },
  "e2e-linked-list": { expect: "blocked", why: "类上写 `[Symbol.iterator]()` 这种**计算成员名**降级不出来（与 `symbol-hasinstance` 同一处）" },
};
