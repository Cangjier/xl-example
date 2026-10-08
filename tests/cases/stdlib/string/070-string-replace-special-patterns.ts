// xl:title 替换文本里的 `$&` / `$1`（字符串模式没有捕获组）
// xl:round 305
// xl:judge stdout
// xl:end

console.log("abc".replace("b", "[$&]"), "abc".replace("b", "$1"));
