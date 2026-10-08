// xl:title Object.getOwnPropertyNames / getOwnPropertyDescriptor / defineProperty
// xl:round 623
// xl:judge stdout
// xl:end

const o: any = { a: 1 };
Object.defineProperty(o, "b", { value: 2, enumerable: false, writable: true, configurable: true });
console.log(Object.getOwnPropertyNames(o).join(","));
console.log(Object.getOwnPropertyDescriptor(o, "b").value, Object.getOwnPropertyDescriptor(o, "b").enumerable);
console.log(Object.keys(o).join(","));
