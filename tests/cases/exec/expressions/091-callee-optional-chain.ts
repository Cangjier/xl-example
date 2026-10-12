// xl:title 被调用者是括号 / 一次调用时的可选链（(x as T)?.m?.() / f()?.m?.()）
// xl:round 630
// xl:judge stdout
// xl:end

const o: any = { m: () => 7 };
const p: any = { n: { m: () => 3 } };
const f = () => ({ m: () => 5 });
console.log((o as any)?.m?.(), (o as any).m?.(), (p.n)?.m?.(), (p.n).m?.(), f()?.m?.());
console.log((o as any)?.m?.(1, 2), (o as any)?.nope?.());
