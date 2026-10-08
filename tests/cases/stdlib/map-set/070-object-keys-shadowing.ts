// xl:title 遮蔽内建原型方法与 Object.keys 的自有性
// xl:round 371
// xl:judge stdout
// xl:end
const o: any = { toString: () => "own", valueOf: () => 7 };
console.log(String(o), o + 1, Object.prototype.toString.call(o));
console.log(Object.keys(o).join(","), "toString" in o, Object.hasOwn(o, "toString"));
const d: any = Object.create(null);
d.k = 1;
console.log(Object.keys(d).join(","), typeof d.toString);
