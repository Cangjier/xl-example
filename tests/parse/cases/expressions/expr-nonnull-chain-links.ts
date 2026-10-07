// xl:note 非空断言是链的一环：`a!.b` / `fn!().k` / `a![0]`——产物收成一条 PropertyAccess，
// xl:note 而不是「NotNull + 点号 + 名字」三格平级（后者靠投影再拼一次）
// xl:expect NotNull,PropertyAccess
const data: any = { a: { b: { c: [1, 2, 3] } } };
console.log(data.a!.b!.c![0]);
console.log(data!.a!.b!.c!.slice(1).length);
const fn: any = () => ({ k: 7 });
console.log(fn!().k);
