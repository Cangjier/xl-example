// xl:title 重载签名 + 实现体：运行期只留实现那一份
// xl:round 330
// xl:judge stdout
// xl:end

function size(value: string): number;
function size(value: number[]): number;
function size(value: string | number[]): number {
  return value.length;
}
console.log(size("abcd"), size([1, 2, 3]));
