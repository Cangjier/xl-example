// xl:title `delete` 数组元素 / 不可配置属性 / 变量
// xl:round 691
// xl:judge stdout
// xl:end
const a: any = [1, 2, 3];
delete a[1];
console.log(a.length, JSON.stringify(a), 1 in a);
const o: any = {};
Object.defineProperty(o, "x", { value: 1, configurable: false });
console.log(delete o.x, "x" in o);
console.log(delete (globalThis as any).nothing);
