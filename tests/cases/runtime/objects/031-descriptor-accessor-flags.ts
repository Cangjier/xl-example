// xl:title 属性描述符：访问器 + enumerable/configurable 的默认值都是 false
// xl:round 7
// xl:judge stdout
// xl:end

const o: any = {};
let hidden = 0;
Object.defineProperty(o, "v", { get() { return hidden; }, set(n) { hidden = n; } });
o.v = 7;
const d = Object.getOwnPropertyDescriptor(o, "v");
console.log(o.v, d.enumerable, d.configurable, d.writable, Object.keys(o).length);
console.log(JSON.stringify(Object.keys(o)));
