// xl:note 非空断言属于 `new` 的被构造者（后缀跟着左边那一格，不另起一个操作数）
// xl:expect New,NewType,NewArguments,NotNull,PropertyAccess
const n1 = new a!.b();
const n2 = new a!();
const n3 = new a!.b;
const n4 = new a!.b(1);
const n5 = new a!.b!.c();
const n6 = new a![0]!();
const n7 = new a! + 1;
const n8 = new (a!.b)();
