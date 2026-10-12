// xl:title `extends Array` 的实例：进去是数组、出来也是数组
// xl:round 335
// xl:judge stdout
// xl:end

class MyList extends Array {
  constructor(items: number) {
    super();
    for (let i = 0; i < items; i++) this.push(i);
  }
  first() { return this[0]; }
}
const m = new MyList(3);
console.log(Array.isArray(m), m.length, m.first(), m instanceof MyList, m instanceof Array);
console.log(m.join("-"), m.slice(1).join("-"), m.map((v: number) => v * 2).join(","));
class Plain { constructor() {} }
const p = new Plain();
console.log(Array.isArray(p), p instanceof Plain);
