// xl:title ||= / &&= / ??= 的短路与返回值
// xl:judge stdout
// xl:end

let a: number | null = null;
console.log((a ??= 5), a);
let b = 1;
console.log((b ||= 2), b);
let c = 0;
console.log((c &&= 3), c);
let d: any = { n: 0 };
console.log((d.n ||= 7), d.n);
