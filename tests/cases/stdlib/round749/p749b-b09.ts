// xl:title `console` 的多种调用形状与格式说明符
// xl:round 749
// xl:judge stdout
// xl:end
console.log("a", "b");
console.log(1, 2, 3);
console.warn("warn");
console.error("err");
console.info("info");
console.log("%s-%d", "x", 3);
console.log({ a: 1 }, [1, 2], "s", 1, true, null, undefined);
console.log("nested", { x: { y: { z: [1, [2]] } } });
console.log();
