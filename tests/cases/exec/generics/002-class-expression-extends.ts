// xl:title 类表达式继承 + 用 `super` + instanceof
// xl:judge stdout
// xl:end

class Base { m(): string { return "base"; } }
const Sub = class extends Base { m(): string { return "sub:" + super.m(); } };
const Named = class Self extends Base { m(): string { return "named"; } };
const s = new Sub();
console.log(s.m(), s instanceof Base, new Named().m());
