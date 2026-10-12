// xl:title 可选调用的三种基名：null、缺方法、接收者为 null
// xl:round 323
// xl:judge stdout
// xl:end

const o: any = { m() { return "m"; }, n: { k() { return "k"; } } };
const f: any = null;
console.log(o.m?.(), o.n?.k?.(), o.missing?.(), f?.());
