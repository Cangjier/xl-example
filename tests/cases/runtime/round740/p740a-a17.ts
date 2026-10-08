// xl:title `delete` 打在**括号 / as / !** 包着的成员上（第 740 轮收掉）
// xl:round 740
// xl:judge stdout
// xl:end
const o: any = { b: 2, c: 3, d: 4 };
console.log(delete (o.b as any), o.b);
console.log(delete (o.c), o.c);
console.log(delete (o.d!), o.d);
