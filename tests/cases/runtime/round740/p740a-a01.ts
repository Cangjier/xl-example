// xl:title 一元前缀打在**成员链**上（typeof / void / delete / ! / ~ / - / +）
// xl:round 740
// xl:judge stdout
// xl:end
const o: any = { p: 5, s: "x" };
console.log(typeof o.p, typeof o.s);
console.log(void o.p, void o.missing);
console.log(!o.p, ~o.p, -o.p, +o.p);
console.log(delete o.p, o.p);
