// xl:title 条件里的逻辑链与嵌套三元的结合性
// xl:round 738
// xl:judge stdout
// xl:end
const pick = (a: any, b: any) => (a && b ? "both" : a ? "a" : b ? "b" : "none");
console.log(pick(1, 1), pick(1, 0), pick(0, 1), pick(0, 0));
const t = (x: any) => (x ? (x > 1 ? "big" : "one") : "zero");
console.log(t(0), t(1), t(5));
console.log((false || true) && (true ?? false));
