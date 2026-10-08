// xl:title 逻辑赋值走的是**一次**取值（访问器只被读一次）
// xl:round 691
// xl:judge stdout
// xl:end
let reads = 0;
const o: any = { get a() { reads++; return 0; }, set a(v: any) { console.log("set", v); } };
o.a ||= 7;
o.a &&= 8;
console.log("reads", reads);
let u: any;
u ??= 1;
u ??= 2;
console.log(u);
