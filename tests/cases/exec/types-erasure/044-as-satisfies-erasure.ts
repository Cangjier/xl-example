// xl:title as / satisfies / 非空断言 / 尖括号断言运行时都不留痕
// xl:round 623
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

const a = { x: 1 } as { x: number };
const b = { x: 2 } satisfies { x: number };
const c = a!.x;
const d = <number>(3 as any);
console.log(a.x, b.x, c, d, Object.keys(a).join(","));
