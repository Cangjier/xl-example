// xl:title 计算成员访问与计算成员调用（含字符串键与数字键）
// xl:judge stdout
// xl:end

const key = "val";
const idx = 2;
const o: any = { val: () => "called", 2: "two" };
console.log(o[key](), o[idx], o[String(idx)]);
const arr: any = [10, 20, 30];
console.log(arr[idx], arr["length"], arr[arr.length - 1]);
