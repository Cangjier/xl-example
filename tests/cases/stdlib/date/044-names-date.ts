// xl:title 名字逐个取一次：Date 的静态成员（缺 1 个）
// xl:round 678
// xl:judge stdout
// xl:end
const b: any = Date;
let v = "";
v = "no";
try {
  v = String(typeof b["length"]);
} catch (err) {
}
console.log(typeof b, "length", v);
console.log("缺", 1, "个名字");
