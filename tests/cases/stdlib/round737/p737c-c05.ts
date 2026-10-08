// xl:title `Symbol.iterator` 挂在**原型**上（取出后再调用）
// xl:round 737
// xl:judge stdout
// xl:end
const proto = Object.getPrototypeOf([]);
console.log(typeof (proto as any)[Symbol.iterator], (proto as any)[Symbol.iterator] === ([] as any).values);
const mproto = Object.getPrototypeOf(new Map());
console.log(typeof (mproto as any)[Symbol.iterator], (mproto as any)[Symbol.iterator] === (mproto as any).entries);
const sproto = Object.getPrototypeOf(new Set());
console.log(typeof (sproto as any)[Symbol.iterator], (sproto as any)[Symbol.iterator] === (sproto as any).values);
