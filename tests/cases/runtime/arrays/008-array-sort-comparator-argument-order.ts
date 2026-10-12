// xl:title `sort` 的比较器按 JS 的次序收到两个实参（顺序错了带副作用的那一族就跟着错）
// xl:judge stdout
// xl:end

// **只钉「第一次比较」与「结果」** ✓：比较的**次数与次序**由排序算法决定 ✓
// （本仓是插入排序、V8 是 TimSort ✗）——那一条**不是**可移植的语义 ✓，
// 钉它会变成「钉实现」✗。而「第一个实参是比较器的第一个参数」是**语义** ✓。
let firstPair = "";
let calls = 0;
const xs = [3, 1, 2];
xs.sort((a: number, b: number) => { calls += 1; if (calls === 1) firstPair = a + ":" + b; return a - b; });
console.log(xs.join(","), firstPair);
const ys = [10, 2, 33];
ys.sort((a: number, b: number) => b - a);
console.log(ys.join(","));
const zs = ["b", "c", "a"];
console.log(zs.sort().join(","), [10, 9, 100].sort().join(","));
