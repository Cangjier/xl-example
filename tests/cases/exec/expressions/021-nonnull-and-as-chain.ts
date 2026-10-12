// xl:title 非空断言与 as 串在一条链上
// xl:judge stdout
// xl:end

const o: any = { a: { b: [1, 2, 3] } };
console.log(o!.a!.b![1], (o as any).a.b.length);
const s: string | null = "x";
console.log(s!.length, (s as string).toUpperCase());
const n = (1 as unknown as string) as unknown as number;
console.log(n + 1);
