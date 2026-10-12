// xl:title Object.create 的原型链：读穿、`in` 认、keys 不认
// xl:judge stdout
// xl:end

const base = { greet() { return "hi " + (this as any).name; }, shared: 1 };
const child: any = Object.create(base);
child.name = "kim";
console.log(child.greet(), child.shared, "shared" in child, Object.keys(child).join(","));
console.log(Object.getPrototypeOf(child) === base, child.hasOwnProperty("shared"));
