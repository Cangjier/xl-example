// xl:title bind 的偏应用与新函数形状
// xl:round 304
// xl:judge stdout
// xl:end

function tag(prefix: string, a: string, b: string) { return prefix + a + b; }
const withPrefix = tag.bind(null, "#");
console.log(withPrefix("a", "b"), withPrefix.name, withPrefix.length);
const bound = tag.bind(null);
console.log(bound("x", "y", "z"));
