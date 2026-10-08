// xl:title preventExtensions 之后 isSealed 该是假（那一格还可配置）
// xl:round 304
// xl:judge stdout
// xl:end

const o: any = { x: 1 };
Object.preventExtensions(o);
console.log(Object.isExtensible(o), Object.isSealed(o), Object.isFrozen(o));
const p: any = { x: 1 };
Object.seal(p);
console.log(Object.isSealed(p), Object.isFrozen(p), Object.isExtensible(p));
const q: any = {};
Object.preventExtensions(q);
console.log(Object.isSealed(q), Object.isFrozen(q));
