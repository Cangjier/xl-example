// xl:title AST 语料 expressions/expr-nonnull-right-operand.ts：expr nonnull right operand
// xl:round 677
// xl:judge stdout
// xl:end
//  xl:note 非空断言接在**右操作数**后面时，成员访问必须先折成一格：`0 >= f()!.p` 里
// `NotNull` 比 `PropertyAccess` 晚成形（队列次序），二元 / 逻辑运算符抢先把 `f()!` 当成
// **完整的右操作数**吃掉 ⇒ `.p` 留在外面成了平级兄弟（树成了 `(0 >= f()!).p`）。
//  xl:expect NotNull,PropertyAccess,BinaryOperator,LogicalOperator
function f(): { p: number } { return { p: 1 }; }
const o: { p: number } = { p: 2 };
console.log(0 >= f()!.p, 0 + f()!.p, true && f()!.p > 0, false || o!.p > 0);
