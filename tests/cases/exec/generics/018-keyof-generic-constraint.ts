// xl:title keyof 当泛型约束，运行期按下标取
// xl:round 304
// xl:judge stdout
// xl:end

function pluck<T, K extends keyof T>(obj: T, key: K): T[K] { return obj[key]; }
const row = { id: 1, name: "kim" };
console.log(pluck(row, "id"), pluck(row, "name"));
