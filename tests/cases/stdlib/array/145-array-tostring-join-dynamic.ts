// xl:title `Array.prototype.toString` 要**现读** `this.join`（上一轮登记的缺口）
// xl:round 691
// xl:judge stdout
// xl:end
const a: any = [1, 2];
console.log(String(a), a + "");
a.join = function () { return "J"; };
console.log(String(a), a + "");
Array.prototype.toString.call({ join: () => "X" } as any);
console.log("ok");
