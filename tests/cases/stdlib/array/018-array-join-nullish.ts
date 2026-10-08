// xl:title join 把 null / undefined / 洞 变成空串
// xl:judge stdout
// xl:end

const xs: any[] = [1, null, undefined, "a", , 2];
console.log(xs.join("-"), xs.join(""), [].join("-"), [undefined].join("-"));
console.log([1, 2].join(), [1, 2].toString());
