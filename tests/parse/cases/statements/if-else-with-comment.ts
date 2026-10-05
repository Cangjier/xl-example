// if 体与 else 之间夹一条注释——续段判定要跳过 trivia（注释也是 trivia）
function pick(value: number, best: number): number {
  if (value > best) best = value;
  // 中间夹一条注释
  else if (value === 0 && best === 0) best = value;

  if (value > best) {
    best = value;
  }
  /* 块注释也是 trivia */
  else {
    best = 0;
  }
  return best;
}

// `else if` 后面再夹一条注释
function twice(value: number): string {
  if (value > 0) return "pos";
  // 第一条
  else if (value < 0) return "neg";
  /* 第二条 */
  else return "zero";
}

export { pick, twice };
