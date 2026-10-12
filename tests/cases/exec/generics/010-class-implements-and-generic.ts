// xl:title implements 与泛型约束
// xl:round 291
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

interface Shape { area(): number }
class Sq implements Shape { constructor(private n: number) {} area() { return this.n * this.n; } }
function measure<T extends Shape>(s: T): number { return s.area(); }
console.log(measure(new Sq(3)));
