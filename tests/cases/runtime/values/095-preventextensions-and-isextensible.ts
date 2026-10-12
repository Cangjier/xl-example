// xl:title Object.preventExtensions / isExtensible：标记打上了、可扩展性翻了面
// xl:round 304
// xl:judge stdout
// xl:end

const o: any = { a: 1 };
console.log(Object.isExtensible(o));
Object.preventExtensions(o);
console.log(Object.isExtensible(o), Object.isExtensible({}), Object.isExtensible(1), JSON.stringify(o));
