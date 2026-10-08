// xl:title 一元前缀接**下标**链
// xl:round 740
// xl:judge stdout
// xl:end
const a: any[] = [1, 2, 3];
console.log(typeof a[0], !a[1], -a[2], ~a[0]);
const m: any = { k: [4] };
console.log(-m.k[0], typeof m["k"][0]);
