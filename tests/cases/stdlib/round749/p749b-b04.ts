// xl:title `Object` 的取值族与 `entries` 在访问器上的行为
// xl:round 749
// xl:judge stdout
// xl:end
const o: any = { a: 1, get b() { return 2; } };
console.log(JSON.stringify(Object.keys(o)), JSON.stringify(Object.values(o)), JSON.stringify(Object.entries(o)));
console.log(JSON.stringify(Object.fromEntries([["x", 1], ["y", 2]])));
console.log(JSON.stringify(Object.fromEntries(new Map([["m", 3]]))));
const proto: any = { p: 1 };
const child: any = Object.create(proto);
child.c = 2;
console.log(JSON.stringify(Object.keys(child)), JSON.stringify(Object.getOwnPropertyNames(child)));
console.log(Object.getPrototypeOf(child) === proto, Object.hasOwn(child, "p"), "p" in child);
