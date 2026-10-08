// xl:title Object.create：null 原型、带属性描述符、链式原型
// xl:round 371
// xl:judge stdout
// xl:end
const bare = Object.create(null);
bare.x = 1;
console.log(typeof (bare as any).toString, Object.getPrototypeOf(bare));
const base = { greet() { return "hi"; } };
const child = Object.create(base, { n: { value: 5, enumerable: true, writable: true } });
console.log(child.greet(), child.n, Object.keys(child).join(","));
console.log(Object.getPrototypeOf(child) === base);
