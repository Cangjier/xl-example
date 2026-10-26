class 球 {
  static 数量: number = 0;
  readonly 名称: string = "球";
  private 半径: number;
  颜色?: string;

  constructor(半径: number, 颜色?: string) {
    this.半径 = 半径;
    this.颜色 = 颜色;
    球.数量++;
  }

  get 面积(): number {
    return Math.PI * this.半径 ** 2;
  }

  放大(倍率: number): 球 {
    return new 球(this.半径 * 倍率, this.颜色);
  }

  描述(): string {
    const 色 = this.颜色?.toUpperCase() ?? "无色";
    return `${this.名称}#${this.数量}:${色}:${this.面积.toFixed(2)}`;
  }
}

const 小球 = new 球(2, "red");
console.log(小球.放大(2).描述(), 球.数量);
