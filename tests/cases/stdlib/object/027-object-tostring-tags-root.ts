// xl:title Object.prototype.toString 在各类值上的标签
// xl:judge stdout
// xl:end

const tag = (v: any) => Object.prototype.toString.call(v);
console.log(tag([]), tag({}), tag(1), tag("s"), tag(true), tag(null), tag(undefined));
console.log(tag(new Map()), tag(new Set()), tag(new Date(0)), tag(() => 0));
