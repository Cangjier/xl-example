// xl:title 内建符号：iterator / toPrimitive / toStringTag / hasInstance
// xl:round 371
// xl:judge stdout
// xl:end
class Box {
  [Symbol.toPrimitive](hint: string) { return hint === "number" ? 1 : "box"; }
}
const b = new Box();
console.log(b + "", +b as any, `${b}`, String(b));
class Tag { get [Symbol.toStringTag]() { return "Tagged"; } }
console.log(Object.prototype.toString.call(new Tag()));
console.log(typeof Symbol.iterator, typeof Symbol.asyncIterator, typeof Symbol.hasInstance);
