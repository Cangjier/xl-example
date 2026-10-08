// xl:title 标签模板后面接成员 / 运算符 / 实参
// xl:judge stdout
// xl:end

const t = (s: any, ...v: any[]) => s[0] + v.join("");
console.log(t`abc`.length, 1 + t`xy`.length, t`a${1}b`.toUpperCase());
