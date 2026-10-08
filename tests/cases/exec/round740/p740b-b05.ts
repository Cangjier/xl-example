// xl:title 降级层：一元前缀与二元的紧密度
// xl:round 740
// xl:judge stdout
// xl:end
const o: any = { p: 2 };
console.log(-o.p + 1, typeof o.p === "number", !o.p === false);
