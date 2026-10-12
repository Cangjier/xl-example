// xl:title 可选链在中途 null / undefined 上短路整条链
// xl:judge stdout
// xl:end

const o: any = { a: { b: null } };
console.log(o?.a?.b?.c, o?.x?.y, o.a.b?.c, o?.a?.b);
const f: any = null;
console.log(f?.(), f?.[0], f?.p);
console.log(o?.a?.b ?? "fallback");
