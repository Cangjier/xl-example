// xl:title satisfies 的两种位置
// xl:round 291
// xl:judge stdout
// xl:end

const cfg = { a: 1, b: "x" } satisfies { a: number; b: string };
const arr = [1, 2] satisfies number[];
console.log(cfg.a, cfg.b, arr.length);
