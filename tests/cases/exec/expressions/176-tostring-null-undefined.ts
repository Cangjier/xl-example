// xl:title `String(null)` / `String(undefined)` / `+` 号拼接
// xl:round 691
// xl:judge stdout
// xl:end
console.log(String(null), String(undefined));
console.log(null + "a", undefined + 1, null + 1, true + 1);
console.log("5" - 1, "5" + 1, [] + {}, [] + []);
