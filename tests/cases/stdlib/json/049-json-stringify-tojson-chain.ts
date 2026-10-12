// xl:title JSON.stringify 的 toJSON：容器里的对象先过 toJSON、数组里的也一样
// xl:judge stdout
// xl:end

const inner = { toJSON() { return "inner"; } };
console.log(JSON.stringify({ a: inner, b: [inner], c: { d: inner } }));
const d = new Date(0);
console.log(JSON.stringify({ d }), JSON.stringify([d]));
