// xl:title `getOwnPropertyNames` 把非枚举也带上，顺序同上
// xl:round 691
// xl:judge stdout
// xl:end
const o: any = { b: 1 };
Object.defineProperty(o, "a", { value: 2, enumerable: false });
o[2] = 3;
console.log(Object.getOwnPropertyNames(o).join(","));
