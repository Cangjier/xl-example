// golden —— 用原 Cangjie（C#）实现产出 XML 基准。
//
// 用法：
//   Golden <输入文件> [输出文件]
//
// 复刻 cangjie-typesharp/TSScriptEngine.cs 的解析入口：
//     TextDocument document = new(owner, script);
//     TextContext textContext = new(owner, Template);
//     textContext.Process(document);
//     string xml = textContext.Root.ToString();
//
// 输出一律 UTF-8 无 BOM；给输出文件时按原样落盘，不给时写标准输出。
// ts 端口必须对同一输入产出逐字节一致的结果。

using System;
using System.IO;
using System.Text;
using Cangjie.Core.Syntax.Templates;
using Cangjie.Dawn.Text;
using Cangjie.Dawn.Text.Tokens.String;
using Cangjie.Owners;

if (args.Length < 1)
{
    Console.Error.WriteLine("usage: Golden <inputFile> [outputFile]");
    return 2;
}

string inputPath = args[0];
string script = File.ReadAllText(inputPath, new UTF8Encoding(false));

using Owner owner = new();
TextDocument document = new(owner, script);
document.FilePath = inputPath;
TextContext textContext = new(owner, InitialTemplate());
textContext.Process(document);
string xml = textContext.Root.ToString();

byte[] bytes = new UTF8Encoding(false).GetBytes(xml);
if (args.Length >= 2)
{
    Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(args[1]))!);
    File.WriteAllBytes(args[1], bytes);
}
else
{
    using Stream stdout = Console.OpenStandardOutput();
    stdout.Write(bytes, 0, bytes.Length);
}
return 0;

// 复刻 cangjie-typesharp/TSScriptEngine.InitialTemplate：ts 端口必须用同一套模板配置。
static Template<char> InitialTemplate()
{
    Template<char> template = new();
    template.BranchTemplate.AddModifyItem(typeof(StringGuide.Branch), branch =>
    {
        ((StringGuide.Branch)branch).AddStringChar('`');
        ((StringGuide.Branch)branch).AddStringChar('\'');
    });
    template.SymbolTemplate.Ban('_');
    return template;
}
