abstract class Shape {
  abstract area(): number;

  toString(): string {
    return `${this.constructor.name}:${this.area().toFixed(2)}`;
  }
}

class Circle extends Shape {
  constructor(private radius: number) {
    super();
  }

  area(): number {
    return Math.PI * this.radius ** 2;
  }

  override toString(): string {
    return `circle ${super.toString()}`;
  }
}

class Square extends Shape {
  constructor(private side: number) {
    super();
  }

  area(): number {
    return this.side ** 2;
  }
}

const shapes: Shape[] = [new Circle(1), new Square(2)];
for (const shape of shapes) {
  console.log(shape.toString());
}
