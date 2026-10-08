// xl:title 逻辑链的返回值是**操作数本身**（不是布尔）
// xl:round 738
// xl:judge stdout
// xl:end
console.log(0 || "x", "" || 0, null ?? "y", undefined ?? 0);
console.log(1 && "z", "a" && 0, NaN || "w");
console.log(([] || 1) === ([] as any), typeof (0 || ""), typeof (1 && 2));
