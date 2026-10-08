// xl:title 访问器描述符上的 get / set 与它们的 name
// xl:round 678
// xl:judge stdout
// xl:end

let seen = "";
const o: any = {};
Object.defineProperty(o, "p", {
  get() { return seen + "-get"; },
  set(v: string) { seen = v; },
  enumerable: true,
  configurable: true,
});
const d: any = Object.getOwnPropertyDescriptor(o, "p");
o.p = "set";
console.log(o.p);
console.log(typeof d.get, typeof d.set, d.enumerable);
console.log(d.get.name, d.set.name);
