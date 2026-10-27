// xl:note 嵌套 if：外层块体里再建一次括号，验证树不丢层。
// xl:expect ok
if (a) { if (b) {} }
