// xl:title 标签模板出现在二元 / 实参位时，标签与模板不能被拆开
// xl:round 321
// xl:judge stdout
// xl:end

const t = (s: any, ...v: any[]) => s[0] + v.join("");
console.log(t`abc`.length, 1 + t`xy`.length, t`a${1}b`.toUpperCase());
console.log(2 * t`q`.length);
console.log([t`m`, t`n`].join("-"));
