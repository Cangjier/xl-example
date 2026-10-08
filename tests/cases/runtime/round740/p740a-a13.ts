// xl:title 一元前缀在**实参 / 数组 / 对象值 / 模板**里
// xl:round 740
// xl:judge stdout
// xl:end
const o: any = { p: 3 };
console.log([-o.p, !o.p, typeof o.p].join("|"));
console.log({ a: -o.p, b: typeof o.p }.a, { a: -o.p, b: typeof o.p }.b);
console.log(`v=${-o.p}/${typeof o.p}`);
