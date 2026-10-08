// xl:title 可选参数、默认值与剩余参数一起用
// xl:round 331
// xl:judge stdout
// xl:end

function tag(name: string, prefix = "#", ...rest: string[]): string {
  return prefix + name + (rest.length > 0 ? ":" + rest.join("+") : "");
}
console.log(tag("a"), tag("b", "@"), tag("c", "!", "x", "y"));
