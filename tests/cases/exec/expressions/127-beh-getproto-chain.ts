// xl:title getPrototypeOf 沿链走三层，以及 create(null) 的链头
// xl:round 678
// xl:judge stdout
// xl:end

const a = { x: 1 };
const b = Object.create(a);
const c = Object.create(b);
console.log(Object.getPrototypeOf(c) === b);
console.log(Object.getPrototypeOf(b) === a);
console.log(Object.getPrototypeOf(a) === Object.prototype);
const bare = Object.create(null);
console.log(Object.getPrototypeOf(bare));
console.log(Object.getPrototypeOf(Object.prototype) === null);
