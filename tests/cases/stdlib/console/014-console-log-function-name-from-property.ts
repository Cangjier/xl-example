// xl:title `console.log({ f: () => 1 })` 里那个函数的显示名
// xl:round 305
// xl:judge stdout
// xl:end

const f = () => 1;
console.log({ f }, { m() {} }, [function named() {}]);
