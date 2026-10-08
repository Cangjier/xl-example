// xl:title 一元前缀与**二元**混排时的紧密度
// xl:round 740
// xl:judge stdout
// xl:end
const o: any = { p: 2 };
console.log(-o.p + 1, 1 + -o.p);
console.log(typeof o.p === "number", !o.p === false);
console.log(-o.p * 2, -(o.p * 2));
console.log(!!o.p && 1, ~o.p | 0);
