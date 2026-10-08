// xl:title 几何：类继承 + getter + 静态工厂 + 数值格式化
// xl:round 683
// xl:judge stdout
// xl:end
class Shape { name: string; constructor(name: string) { this.name = name; } get area(): number { return 0; } describe(): string { return this.name + '=' + this.area.toFixed(2); } static of(name: string): Shape { return new Shape(name); } }
class Rect extends Shape { w: number; h: number; constructor(w: number, h: number) { super('rect'); this.w = w; this.h = h; } get area(): number { return this.w * this.h; } }
class Square extends Rect { constructor(s: number) { super(s, s); } get name2(): string { return 'sq'; } }
console.log(new Rect(3, 4).describe());
console.log(new Square(5).describe(), Shape.of('none').describe());
