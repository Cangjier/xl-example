// xl:title Symbol.toStringTag：影响 Object.prototype.toString
// xl:judge stdout
// xl:end

const o: any = { [Symbol.toStringTag]: "Custom" };
console.log(Object.prototype.toString.call(o));
console.log(Object.prototype.toString.call(new Map()));
