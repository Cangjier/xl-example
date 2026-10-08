// xl:title 一元前缀打在**可选链**上
// xl:round 740
// xl:judge stdout
// xl:end
const o: any = { p: 1 };
const n: any = null;
console.log(typeof o?.p, typeof n?.p);
console.log(!o?.p, void n?.p);
console.log(typeof o?.["p"], -o?.p);
