// xl:title 只带类型的 import 一行都不产生运行期东西
// xl:round 330
// xl:judge stdout
// xl:end

type Shape = { area(): number };
interface Named { name: string }
const s: Shape = { area: () => 4 };
const n: Named = { name: "box" };
console.log(s.area(), n.name);
