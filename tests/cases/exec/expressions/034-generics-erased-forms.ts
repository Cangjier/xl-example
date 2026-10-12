// xl:title 泛型函数与泛型类的擦除
// xl:round 291
// xl:judge stdout
// xl:end

function id<T>(x: T): T { return x; }
class Box<T> { v: T; constructor(v: T) { this.v = v; } get(): T { return this.v; } }
console.log(id(1), id("s"), new Box(5).get());
