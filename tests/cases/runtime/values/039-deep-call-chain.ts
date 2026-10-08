// xl:title 连着调用 / 连着取属性的长链
// xl:judge stdout
// xl:end

const o: any = { a: { b: { c: { d: () => ({ e: [1, 2, 3] }) } } } };
console.log(o.a.b.c.d().e.length, o.a.b.c.d().e[2]);
const f = (n: number) => (m: number) => (k: number) => n + m + k;
console.log(f(1)(2)(3));
