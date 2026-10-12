// xl:title 继承：super(...)、super.m()、字段初始化顺序
// xl:judge stdout
// xl:end

class Animal {
  name: string;
  constructor(name: string) { this.name = name; }
  speak(): string { return this.name + " makes a sound"; }
}
class Dog extends Animal {
  legs = 4;
  constructor(name: string) { super(name + "!"); }
  speak(): string { return super.speak() + " (woof, " + this.legs + " legs)"; }
}
console.log(new Animal("cat").speak());
console.log(new Dog("rex").speak(), new Dog("rex") instanceof Animal);
