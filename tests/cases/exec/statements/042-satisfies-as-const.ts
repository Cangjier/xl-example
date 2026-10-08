// xl:title satisfies 与 as const：都只活在类型位，值原样
// xl:round 7
// xl:judge stdout
// xl:end

const cfg = { mode: "fast", n: 2 } satisfies { mode: string; n: number };
const tuple = [1, "a", true] as const;
const frozen = { a: 1 } as const;
console.log(cfg.mode, cfg.n, tuple.length, tuple[0], frozen.a, typeof tuple);
