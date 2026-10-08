// xl:title 类型位整族擦除：type / interface / declare
// xl:round 291
// xl:judge stdout
// xl:end

type A = { x: number };
interface B { y: string }
declare const z: number;
const a: A = { x: 1 };
const b: B = { y: "s" };
console.log(a.x, b.y);
