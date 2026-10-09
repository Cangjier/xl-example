// xl:title 可选链：成员、下标、调用、与 ?? 混用
// xl:round 371
// xl:judge stdout
// xl:end
const o: any = { a: { b: () => ({ c: [1] }) }, n: null };
console.log(o?.a?.b?.().c?.[0], o.n?.x, o.missing?.y?.z, o?.a?.b?.().c?.[9]);
console.log(o.n?.[0], o["n"]?.["0"], o.fn?.(), o.a.b?.call?.(null).c.length);
const f: ((x: number) => number) | undefined = undefined;
console.log(f?.(1) ?? "none", (o?.n ?? "fallback"));
