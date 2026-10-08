// xl:title Object.create：原型链上的属性怎么被读到
// xl:judge stdout
// xl:end

const proto: any = { greet() { return "hi"; } };
const child: any = Object.create(proto);
child.own = 1;
console.log(child.greet(), child.own, "greet" in child, Object.keys(child).join(","));
