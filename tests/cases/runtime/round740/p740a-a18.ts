// xl:title 前缀 `++` 打在成员链 / 下标链上（写回）
// xl:round 740
// xl:judge stdout
// xl:end
const o: any = { nest: { n: 1 }, list: [10] };
console.log(++o.nest.n, o.nest.n);
console.log(++o.list[0], o.list[0]);
console.log(--o.nest.n, --o.list[0]);
