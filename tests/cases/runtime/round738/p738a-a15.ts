// xl:title 逻辑链两侧是**调用 / 三元 / 一元**时的结合性
// xl:round 738
// xl:judge stdout
// xl:end
const f = (v: any) => v;
console.log(f(0) || f(1) && f(2), (f(0) || f(1)) && f(2));
console.log(!f(0) && !f(1), typeof f && "s", void 0 ?? "v");
console.log((1 ? 0 : 1) || (0 ? 2 : 3), -1 && +2);
