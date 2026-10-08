// xl:title Array.join：默认逗号、空串分隔、null/undefined 变空
// xl:judge stdout
// xl:end

const xs: any[] = [1, "a", null, undefined, true];
console.log(xs.join(), xs.join("-"), xs.join(""));
console.log([].join(","), [1].join(","), [1, [2, 3]].join("|"));
