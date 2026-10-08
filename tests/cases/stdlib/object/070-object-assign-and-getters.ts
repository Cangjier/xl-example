// xl:title Object.assign 与访问器：取的是值不是描述符
// xl:round 323
// xl:judge stdout
// xl:end

const src = { get a() { return 1; } };
const target: any = {};
Object.assign(target, src);
console.log(target.a, Object.getOwnPropertyDescriptor(target, "a").get === undefined);
console.log(JSON.stringify(Object.assign({}, { x: 1 }, { y: 2 }, "ab")));
