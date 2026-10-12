// xl:title as 与算术 / 一元 / 成员运算的优先级
// xl:round 371
// xl:judge stdout
// xl:end
const n: unknown = 3;
const s: unknown = "ab";
console.log((n as number) + 1, 1 + (n as number), (n as number) * 2);
console.log(-(n as number), !(n as number), typeof (n as number));
console.log(((s as string) + "").length, (s as string).length + 1);
const o = { v: 1 } as { v: number };
console.log(o.v + 1, o.v as number);
