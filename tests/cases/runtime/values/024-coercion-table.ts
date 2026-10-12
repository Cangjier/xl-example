// xl:title `+` 与 `-` 的强制转换：数组 / 对象 / 布尔 / null
// xl:judge stdout
// xl:end

console.log([] + {}, [] + [], [1] + [2], 1 + "2", "3" - 1, "3" * "2");
console.log(true + 1, null + 1, undefined + 1, +true, +"");
console.log([] ? "truthy" : "falsy", ({} ? "t" : "f"));
