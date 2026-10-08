// xl:title 降级层：`typeof` 打在成员链上
// xl:round 740
// xl:judge stdout
// xl:end
const o: any = { p: { q: "s" } };
console.log(typeof o.p.q, typeof o.p, typeof o.missing);
