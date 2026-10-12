// xl:title delete：自有 / 继承 / 数组元素 / 不可配置
// xl:round 371
// xl:judge stdout
// xl:end
const o: any = { a: 1, b: 2 };
console.log(delete o.a, o.a, "a" in o, Object.keys(o).join(","));
const proto = { p: 1 };
const child: any = Object.create(proto);
console.log(delete child.p, child.p, "p" in child);
const arr: any = [1, 2, 3];
console.log(delete arr[1], arr.length, JSON.stringify(arr), 1 in arr);
const frozen: any = {};
Object.defineProperty(frozen, "f", { value: 1, configurable: false });
console.log(delete frozen.f, frozen.f);
