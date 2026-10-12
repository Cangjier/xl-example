// xl:title 计算成员位上的可选链（`o?.list?.[1]`）
// xl:round 305
// xl:judge stdout
// xl:end

const o: any = { list: [1, 2, 3] };
console.log(o?.list?.[1], o.list?.[5], o?.missing?.[0]);
