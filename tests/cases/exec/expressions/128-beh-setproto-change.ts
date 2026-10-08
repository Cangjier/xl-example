// xl:title setPrototypeOf 换链之后读到的成员与 instanceof
// xl:round 678
// xl:judge stdout
// xl:end

function Base(): void {}
Base.prototype.tag = "base";
const o: any = {};
Object.setPrototypeOf(o, Base.prototype);
console.log(o.tag, o instanceof Base);
Object.setPrototypeOf(o, null);
console.log(o.tag, Object.getPrototypeOf(o));
