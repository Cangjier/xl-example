// xl:title as / 尖括号 / ! / satisfies / as const 四种断言的优先级
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
const raw: unknown = { a: { b: [1, 2] } };
console.log((raw as { a: { b: number[] } }).a.b.length);
console.log((<{ n: number }>{ n: 1 }).n);
const maybe: string | null = "x";
console.log(maybe!.length, (maybe as string).toUpperCase());
const cfg = { mode: "fast", retries: 2 } as const;
const check = { mode: "slow", n: 1 } satisfies Record<string, unknown>;
console.log(cfg.mode, cfg.retries, check.mode, check.n);
console.log(((raw as any).a as { b: number[] }).b.length + 1);
