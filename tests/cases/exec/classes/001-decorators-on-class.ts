// xl:title 装饰器：语法要读得进来（运行期语义不在口径内）
// xl:judge stdout
// xl:skip 裁判给不出来：`node` 的类型剥离 / 变换 / `--experimental-strip-types` 三种模式都在 `@tag` 那一行报语法错，没有基准可比。**装饰器本身的实现**是待做项（见 README 的「明确不做」与 §15）——那件事落地后这一条要换一个能跑的裁判
// xl:why 裁判给不出来：`node` 的类型剥离 / 变换 / `--experimental-strip-types` 三种模式都在 `@tag` 那一行报语法错，没有基准可比。**装饰器本身的实现**是待做项（见 README 的「明确不做」与 §15）——那件事落地后这一条要换一个能跑的裁判
// xl:end

function tag(target: any) { return target; }
@tag
class Service { run(): string { return "ran"; } }
console.log(new Service().run());
