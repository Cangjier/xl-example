// xl:title 名字逐个取一次：Object 的静态成员（第 690 轮**两格都齐了**）
// xl:round 678
// xl:judge stdout
// xl:why 第 678 轮登记时缺两格：`length`（第 688 轮补上）与
//       `typeof Object.prototype`（第 690 轮改对——它必须是 `object`，
//       原来被 `RtTypeOf` 那条「两个原型对象都算 function」一起认成了 `function`）。
//       台账（原来记 `differ`）在第 690 轮撤掉，两边现在逐字相同。
// xl:end
const b: any = Object;
let v = "";
v = "no";
try {
  v = String(typeof b["length"]);
} catch (err) {
}
console.log(typeof b, "length", v);
v = "no";
try {
  v = String(typeof b["prototype"]);
} catch (err) {
}
console.log(typeof b, "prototype", v);
console.log("缺", 2, "个名字");
