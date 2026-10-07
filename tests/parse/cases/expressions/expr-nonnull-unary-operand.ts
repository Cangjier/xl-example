// xl:note 前缀一元运算符的操作数里带「非空断言 + 链」：一元运算的作用范围是整条链，不是 `!` 前面那半截
// xl:expect UnaryOperator,NotNull,PropertyAccess,ArrayLiteral
const o: any = { get: 1, n: 2, m() { return 3; } };
console.log(typeof o!.get, typeof o!.get(), void o!.get);
console.log(typeof o![0], -o!.n, !o!.m(), ~o!.n);
