// xl:title `new (class { … })()`：被 new 的是一整个类表达式
// xl:judge stdout
// xl:end

const v = new (class { n = 7; })();
console.log(v.n);
console.log(new (class { m() { return "m"; } })().m());
