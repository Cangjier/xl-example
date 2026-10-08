// xl:title 一元前缀打在**非空断言 / as** 上
// xl:round 740
// xl:judge stdout
// xl:end
const o: any = { p: 2 };
console.log(-o.p!, typeof (o.p as any), !(o.p as any));
console.log(-(o.p!), -(o.p as number));
