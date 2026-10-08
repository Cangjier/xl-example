// xl:title `void` 后面跟数组字面量
// xl:round 727
// xl:judge stdout
// xl:end
console.log(void [1, 2]);
const b = void [3, 4, 5];
console.log(b);
const f = (): any => void [6];
console.log(f());
