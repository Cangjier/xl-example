// 语料 10：**第 119 轮那一块的合成正脸**——默认参数 × `this` × 箭头。
//
// 这一份是「默认参数」那个判据在**命令行路径**上的翻版，而且带上了它当场抓出来的那个缺口：
// **模块里一旦有箭头，模块那一层就会多开一格 `this`**（箭头没有自己的 `this`，取外面那个）——
// 于是构造函数 / 方法 / 函数表达式**必须**走 `load_this`，不许沿环境链找。
// 找错了的症状就是 `this.v = v` 报「assigning a property on a primitive receiver」。
//
// 所以这里把三种形状放在**同一个文件**里：
//   1. 模块级箭头（`scale`）——它让模块那一层有 `this` 格；
//   2. 构造函数与方法里的 `this`（`Box`）——它们必须拿到**实例**；
//   3. 默认值里的 `this`（对象方法 `measure`）——它也必须拿到**接收者**。

const scale = (n: number, by: number = 2) => n * by;

function join(first: string = "a", second: string = first + "b"): string {
  return first + "|" + second;
}

function pick(a?: number, b: number = 10): number {
  return (a === undefined ? 0 - 1 : a) + b;
}

class Box {
  constructor(side: number = 3) {
    this.side = side;
  }
  area(multiplier: number = 1): number {
    return this.side * this.side * multiplier;
  }
  get label(): string {
    return "box(" + this.side + ")";
  }
}

const ruler = {
  unit: 4,
  measure(times: number = this.unit): number {
    return times * this.unit;
  },
};

function outer(): number {
  const base = 5;
  const inner = (extra: number = base + 1) => extra * 2;
  return inner();
}

console.log("arrow-default", scale(3), scale(3, 4));
console.log("prev-param", join(), join("x"), join("x", "y"));
console.log("optional", pick(), pick(5), pick(undefined, 1));
console.log("class", new Box().area(), new Box(5).area(2), new Box(2).label);
console.log("this-in-default", ruler.measure(), ruler.measure(3));
console.log("captured-default", outer());
