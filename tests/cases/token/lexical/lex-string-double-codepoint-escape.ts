// xl:note 双引号字符串里的 \u{…} 码点转义（`"\u{1F600}"` 应解出一个代理对）
// xl:expect Let,String,ConstString
const a = "\u{1F600}";
