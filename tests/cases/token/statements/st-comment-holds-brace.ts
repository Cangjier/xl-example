// xl:note 注释里也写着 `{`——结构括号的位置必须来自 token 字段，不能回原文里 indexOf
// xl:expect StaticBlock,Switch,IfSet,IfBody,Lamda
class Trap {
  static /* { */ {
  }
}

function pick(a: number): number {
  switch (a) /* { */ {
    default:
      break;
  }
  if (a) /* { */ {
    return 1;
  }
  return 2;
}

const arrow = () => /* { */ {
  return 3;
};

export { Trap, pick, arrow };
