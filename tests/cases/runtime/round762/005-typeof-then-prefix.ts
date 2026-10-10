// xl:title `typeof` 后面跟一个**前缀词**（`typeof !0` / `typeof void 0`）
// xl:round 762
// xl:judge stdout
// xl:note 第 961 轮转绿（`xl:want blocked` 与台账按规矩撤掉，用例留着当守卫）：
// 缺口原来是 `typeof void 0` 与 `typeof !0` 这两行**整份文件一个字节都不跑**
// ——降级期报 `name is not a local or a capture: typeof`。
//
// **量出来的形状**：`typeof !0` 里那个 `!` 被读成了**非空断言**，于是
// `typeof` 与被断言者一起收成一个 `NotNull`
//（`<NotNull><Identifier>typeof</Identifier><SymbolToken>!</SymbolToken></NotNull>`）、
// `0` 掉到外面当独立操作数 ⇒ `projectUnary` 按 `op` 属性找运算符那一格找不到 `typeof`、
// 那个词被当成**操作数**投了出去 ⇒ 降级层那一句。
//
// **同一个形状里 `typeof -1` 一直是好的**，差的正是**第二个词是不是前缀词**
//（`!` / `void` 是前缀词，`-` / `+` 是符号）。
//
// **根因不在 token 层的重组深度上**（第 762 轮当初是这么登记的，**这一轮推翻了**）：
// 那条纪律（`IsOperand`）**早就排掉了** `typeof` / `void` / `delete`
//（[`tokens/unary-operator.xl.md`](../../../../typescript/tokens/unary-operator.xl.md) 第 167 轮、
// `binary-operator.xl.md` 那一份也排了），只是**非空断言那条路漏了同一句**：
// `text-common-util.xl.md` 的 `IsAssertableOperand` 只排了语句关键字。
// 三处判据同源（那一节写的就是这句话：说得不一样就会出现「一处认、另一处不认」的半成品形状），
// 两处排了、一处没排 ⇒ 同一个词在两条判据上给出**相反**的答案。
//
// **修法**：给 `IsAssertableOperand` 的 `Identifier` 那一支补上 `typeof` / `void` / `delete`
// 三个词（`new` / `await` 照旧不排——`new A()!` 是合法的断言，理由与那两处一字不差）。
// xl:end
console.log("1", typeof void 0);
console.log("2", typeof !0);
console.log("3", typeof -1);
