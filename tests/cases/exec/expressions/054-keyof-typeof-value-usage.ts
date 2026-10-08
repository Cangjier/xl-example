// xl:title `keyof typeof` 取出来的键在运行期读属性
// xl:round 305
// xl:judge stdout
// xl:end

const shapes = { circle: 1, square: 2 };
type ShapeKey = keyof typeof shapes;
const k: ShapeKey = "circle";
console.log(shapes[k], shapes.square);
