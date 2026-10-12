// xl:title 可选链的每一种位置：属性、下标、调用、以及整条链短路
// xl:round 323
// xl:judge stdout
// xl:end

const o: any = { a: { b: () => ({ c: 5 }) } };
console.log(o?.a?.b?.().c, o?.x?.y, o?.a?.["b"]?.().c);
const n: any = null;
console.log(n?.a, n?.[0], n?.f?.());
