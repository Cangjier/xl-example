// xl:title Object.create：null 原型 / 带原型 / 第二参数
// xl:round 676
// xl:judge stdout
// xl:end

const bare: any = Object.create(null);
bare.x = 1;
console.log(Object.getPrototypeOf(bare), bare.x, "toString" in bare);
const child: any = Object.create({ greet: "hi" });
console.log(child.greet, Object.getPrototypeOf(child).greet);
const props: any = Object.create({}, { v: { value: 7, enumerable: true } });
console.log(props.v, Object.keys(props).join(","));
