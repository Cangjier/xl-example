// xl:title `seal` 之后写已有属性静默（松散模式）、删不掉的静默
// xl:round 691
// xl:judge stdout
// xl:end
const o: any = { a: 1 };
Object.seal(o);
o.a = 2;
console.log(o.a, Object.isSealed(o), Object.isFrozen(o));
console.log(delete o.a, o.a);
