// xl:title 可选调用在**链中间**（后面还接成员与下标）
// xl:round 741
// xl:judge stdout
// xl:end
const o: any = { m() { return { list: [1, 2] }; } };
console.log(o?.m?.().list[0], o?.m?.().list?.length);
console.log(o?.m?.()?.list?.[1]);
