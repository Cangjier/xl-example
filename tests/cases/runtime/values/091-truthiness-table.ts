// xl:title 真假值表的常用几格
// xl:round 291
// xl:judge stdout
// xl:end

const vals: any[] = [0, -0, "", "0", null, undefined, NaN, [], {}, () => 1];
console.log(vals.map((v) => (v ? "T" : "F")).join(""));
console.log(!!NaN, !!0, !![], !!{});
