// xl:title 短路求值里的副作用只发生一次
// xl:round 738
// xl:judge stdout
// xl:end
let calls = 0;
const t = () => { calls += 1; return true; };
console.log(t() && t(), calls);
calls = 0;
console.log((false && t()) || calls);
console.log(calls);
const o: any = { get v() { calls += 1; return 1; } };
console.log(o.v && o.v, calls);
