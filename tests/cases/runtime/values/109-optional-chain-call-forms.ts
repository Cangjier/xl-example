// xl:title 可选调用的三种位置
// xl:round 304
// xl:judge stdout
// xl:end

const o: any = { m() { return "m"; }, n: null };
console.log(o.m?.(), o.n?.(), o.n?.[0], o.missing?.());
const f: any = null;
console.log(f?.());
