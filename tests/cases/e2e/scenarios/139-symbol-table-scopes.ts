// xl:title 符号表与作用域链：嵌套作用域解析
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
class Scope {
  private vars = new Map<string, number>();
  constructor(private parent: Scope | null = null) {}
  declare(name: string, value: number): void { this.vars.set(name, value); }
  lookup(name: string): number | undefined {
    if (this.vars.has(name)) return this.vars.get(name);
    return this.parent ? this.parent.lookup(name) : undefined;
  }
  assign(name: string, value: number): boolean {
    if (this.vars.has(name)) { this.vars.set(name, value); return true; }
    return this.parent ? this.parent.assign(name, value) : false;
  }
  localNames(): string[] { return [...this.vars.keys()].sort(); }
}
const global2 = new Scope();
global2.declare("x", 1);
global2.declare("y", 2);
const fn = new Scope(global2);
fn.declare("x", 10);
const block = new Scope(fn);
block.declare("z", 30);
console.log(fn.lookup("x"), fn.lookup("y"), block.lookup("x"), block.lookup("z"));
console.log(fn.assign("y", 20), global2.lookup("y"));
console.log(block.assign("x", 99), fn.lookup("x"), global2.lookup("x"));
console.log(block.assign("q", 1), block.lookup("q"));
console.log(global2.localNames().join(","), fn.localNames().join(","));
