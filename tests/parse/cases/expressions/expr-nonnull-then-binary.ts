// xl:note 非空断言之后的链要一次收完：接二元运算符、接调用、接下标都不许被抢先折走
// xl:expect NotNull,PropertyAccess
// xl:expect BinaryOperator,Method,Bracket
declare const o: any;
const box = { v: 1 as number | null };
const a = o.a!.toString() + "x" + "y";
const b = o.a!.b + 1 + 2;
const c = box.v!.toString() + "z";
const d = o.a!.b().c + 1;
const e = o.a![0] + 1;
const f = o.a!.b[0] + 1;
console.log(a, b, c, d, e, f);
