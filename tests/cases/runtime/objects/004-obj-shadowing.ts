// xl:title 原型链上的遮蔽：自己那一格赢
// xl:judge stdout
// xl:end

class A { value = "A"; read(): string { return this.value; } }
class B extends A { value = "B"; }
console.log(new A().read(), new B().read(), new A().value);
