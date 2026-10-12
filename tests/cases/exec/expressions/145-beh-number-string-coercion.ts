// xl:title 加减法里的 ToNumber / ToString 分岔
// xl:round 678
// xl:judge stdout
// xl:end

console.log(1 + "2", "3" - 1, "3" * "2", [] + {}, [] + []);
console.log(+[], +[5], +[1, 2], +"", +" ", +"x");
console.log(String(null), String(undefined), String([]), String({}));
console.log(Number(null), Number(undefined), Number(true), Number(""));
