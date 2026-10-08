// xl:title 可选链的五种落点：属性、下标、调用、串起来、在实参位
// xl:judge stdout
// xl:end

const o: any = { a: { b: { c: 1 } }, m: (n: number) => n, xs: [1] };
console.log(o?.a?.b?.c, o?.z?.b, o?.m?.(2), o?.n?.(2), o?.xs?.[0]);
function f(v: any): string { return "f:" + v; }
console.log(f(o?.z?.b ?? "d"), f(o?.a?.b?.c));
