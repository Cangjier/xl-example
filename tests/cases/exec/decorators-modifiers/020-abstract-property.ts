// xl:title 抽象属性由子类用字段实现
// xl:round 304
// xl:judge stdout
// xl:end

abstract class Node3 {
  abstract id: number;
  abstract label: string;
  show(): string { return this.id + ":" + this.label; }
}
class Leaf extends Node3 {
  id = 1;
  label = "leaf";
}
console.log(new Leaf().show());
