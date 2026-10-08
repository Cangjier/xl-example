// xl:title 前后缀 `++` / `--` 打在成员与下标上
// xl:round 740
// xl:judge stdout
// xl:end
const o: any = { n: 1 };
const a: any = [5];
console.log(o.n++, o.n, ++o.n, o.n--, --o.n, o.n);
console.log(a[0]++, a[0], ++a[0], a[0]--, --a[0], a[0]);
