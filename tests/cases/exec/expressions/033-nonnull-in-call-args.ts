// xl:title 非空断言落在实参位上
// xl:judge stdout
// xl:end

let maybe: { m: () => number } | null = { m: () => 3 };
console.log(maybe!.m());
