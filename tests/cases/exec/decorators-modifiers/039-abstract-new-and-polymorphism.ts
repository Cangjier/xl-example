// xl:title 抽象类的多态调用与 instanceof 分派
// xl:round 371
// xl:judge stdout
// xl:end
abstract class Animal {
  abstract sound(): string;
  describe(): string { return this.constructor.name + ":" + this.sound(); }
}
class Dog extends Animal { sound(): string { return "woof"; } }
class Cat extends Animal { sound(): string { return "meow"; } }
const zoo: Animal[] = [new Dog(), new Cat()];
console.log(zoo.map((a) => a.describe()).join("|"));
console.log(zoo.filter((a) => a instanceof Dog).length, zoo.every((a) => a instanceof Animal));
