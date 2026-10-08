// xl:title stringify 里的 toJSON：Date、自定义对象、嵌套
// xl:round 371
// xl:judge stdout
// xl:end
console.log(JSON.stringify(new Date(0)));
console.log(JSON.stringify({ d: new Date(86400000) }));
const o = { toJSON() { return { wrapped: true }; }, other: 1 };
console.log(JSON.stringify(o), JSON.stringify({ nested: o }));
console.log(JSON.stringify({ toJSON() { return undefined; } }));
