// xl:title 降级层：`delete` 打在成员与下标上
// xl:round 740
// xl:judge stdout
// xl:end
const o: any = { p: 1 };
const a: any = [1, 2];
console.log(delete o.p, delete a[1], a.length, Object.keys(o).length);
