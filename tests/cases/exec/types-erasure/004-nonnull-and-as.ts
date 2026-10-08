// xl:title `x!` / `as T` / `as unknown as T` / `satisfies`
// xl:judge stdout
// xl:end

const o: any = { a: 1 };
const n = o.a!;
const s = "1" as unknown as number;
const cfg = { level: 2 } satisfies { level: number };
console.log(n, s, cfg.level);
