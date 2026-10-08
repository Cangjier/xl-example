// xl:title 解构赋值：左侧是成员表达式（this.x / 数组下标 / 计算键）
// xl:round 7
// xl:judge stdout
// xl:end

class Holder {
  a = 1;
  b = 2;
  swap() { [this.a, this.b] = [this.b, this.a]; return this; }
}
const h = new Holder().swap();
const arr = [1, 2, 3];
[arr[0], arr[2]] = [arr[2], arr[0]];
const o: any = {};
["x", "y"].forEach((k, n) => { [o[k]] = [n]; });
console.log(h.a, h.b, arr.join(","), JSON.stringify(o));
