const o: any = { m() { return "m"; }, n: { k() { return "k"; } } };
const f: any = null;
console.log(o.m?.(), o.n?.k?.(), o.missing?.(), f?.());
const g: any = undefined;
console.log(g?.(), g?.[0], g?.p);
let called = 0;
console.log(f?.(called++), called);
const h: any = { k: null };
console.log(h["k"]?.());
