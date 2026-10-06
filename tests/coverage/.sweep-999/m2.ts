const o: any = { m() { return "m"; }, n: { k() { return "k"; } } };
const f: any = null;
console.log(o.m?.(), o.n?.k?.(), o.missing?.(), f?.());
const g: any = undefined;
console.log(g?.(), typeof g?.());
const arr: any = [null];
let called = 0;
console.log(f?.(called++), called);
