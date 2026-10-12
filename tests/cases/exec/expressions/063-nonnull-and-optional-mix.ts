// xl:title 非空断言与可选链写在同一条取值里
// xl:round 331
// xl:judge stdout
// xl:end

const data: { list?: { id: number; tags?: string[] }[] } = { list: [{ id: 1, tags: ["x"] }] };
console.log(data.list![0].id, data.list![0].tags?.length);
const maybe: { run?(): number } = {};
console.log(maybe.run?.(), maybe.run?.() ?? -1);
