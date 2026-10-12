// xl:title implements 是擦除的；接口不产生运行期值
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
interface Shape { area(): number; kind: string }
interface Named extends Shape { name: string }
class Circle implements Named {
  kind = "circle";
  constructor(public name: string, private r: number) {}
  area(): number { return 3 * this.r * this.r; }
}
const c: Named = new Circle("c1", 2);
console.log(c.kind, c.name, c.area(), c instanceof Circle, typeof (Shape as any));
