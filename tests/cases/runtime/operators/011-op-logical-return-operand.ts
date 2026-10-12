// xl:title `&&` / `||` / `??` 返回的是**操作数**，不是布尔
// xl:judge stdout
// xl:end

console.log(0 || "fallback", "x" && "y", null ?? "d", 0 ?? "d", undefined ?? 0);
console.log("" || 0, 1 && 2, 0 && 1, null || undefined);
