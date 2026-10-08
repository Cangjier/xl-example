// xl:title Object.setPrototypeOf / isPrototypeOf 的链
// xl:round 304
// xl:judge stdout
// xl:end

const base = { kind: "base" };
const child = Object.create(base);
console.log(child.kind, base.isPrototypeOf(child), Object.prototype.isPrototypeOf({}));
const other: any = { kind: "other" };
Object.setPrototypeOf(other, base);
console.log(other.kind, base.isPrototypeOf(other));
