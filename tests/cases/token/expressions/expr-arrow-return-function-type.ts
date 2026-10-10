// xl:note 箭头的返回类型是函数类型：体仍是块（回扫要跨过**两条**箭头才轮到最外面那条的形参表）
// xl:round 927
// xl:expect Lamda,LamdaParameters,ReturnType,FunctionType,Statement,Keyword
// xl:end
const f = (): () => void => { return; };
