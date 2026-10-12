// xl:title 继承 Array 的类：实例方法与 length
// xl:round 323
// xl:judge stdout
// xl:end

class List extends Array {
  first() { return this[0]; }
}
const xs = new List();
xs.push(1, 2, 3);
console.log(xs.length, xs.first(), xs.join(","), xs instanceof Array);
