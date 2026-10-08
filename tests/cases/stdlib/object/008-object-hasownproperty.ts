// xl:title Object.prototype.hasOwnProperty
// xl:judge stdout
// xl:end

class A { m() { return 1; } }
const a: any = new A();
a.own = 2;
console.log(a.hasOwnProperty("own"), a.hasOwnProperty("m"), ({}).hasOwnProperty("x"));
