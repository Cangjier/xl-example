// xl:title 静态成员随继承走，静态里用 this
// xl:round 371
// xl:judge stdout
// xl:end
class Base {
  static kind = "base";
  static describe(): string { return "k=" + this.kind; }
  static create(): Base { return new this(); }
  v = 1;
}
class Mid extends Base {
  static kind = "mid";
}
class Leaf extends Mid {
  static kind = "leaf";
  static parentKind(): string { return super.kind; }
}
console.log(Base.describe(), Mid.describe(), Leaf.describe());
console.log(Leaf.parentKind(), Leaf.create() instanceof Leaf, Mid.create() instanceof Mid);
console.log(Object.getPrototypeOf(Leaf) === Mid, (Leaf as any).kind);
