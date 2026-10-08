// xl:title as const 与 satisfies 一起用
// xl:judge stdout
// xl:end

const cfg = { a: 1, b: "x" } as const satisfies { a: number; b: string };
console.log(cfg.a, cfg.b);
const fn = ((x: number) => x * 2) satisfies (x: number) => number;
console.log(fn(3));
