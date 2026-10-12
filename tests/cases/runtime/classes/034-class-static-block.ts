// xl:title 类静态块：初始化顺序与 this
// xl:round 9
// xl:judge stdout
// xl:end

class Registry {
  static items: string[] = [];
  static count: number;
  static {
    Registry.count = 0;
    console.log("static block");
  }
  static add(x: string) { Registry.items.push(x); }
}
Registry.add("a");
console.log(Registry.items.join(","), Registry.count);
