// xl:title Symbol.hasInstance 与 Symbol.species 的缺省语义
// xl:round 371
// xl:judge stdout
// xl:end
class Even {
  static [Symbol.hasInstance](v: unknown) { return typeof v === "number" && (v as number) % 2 === 0; }
}
console.log(2 instanceof (Even as any), 3 instanceof (Even as any));
class MyArray extends Array {}
const out = new MyArray().concat([1]);
console.log(out instanceof MyArray, out instanceof Array, (MyArray as any)[Symbol.species] === MyArray);
