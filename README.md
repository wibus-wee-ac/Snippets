# Snippets

## Frida

`tools/frida-ssl-pin.js` 文件是一个 Frida 脚本，可以附加到任何 macOS 进程并禁用所有 SSL 验证和 SSL 证书固定。这使我能够深入检查发送到 Apple 服务器的请求。这个脚本可能对许多其他用例有用。如果有其他人使用它，我很想听听它是如何使用的（我是一个超级大的书呆子，对逆向工程非常感兴趣）。请注意，为了正确使用它，需要禁用 SIP。

我还有一个修改过的 Frida Python 脚本，它针对 launchd 注入 SSL 固定和验证禁用脚本。由于 AssetCache 是由 launchd 生成的，您可以将 Frida 附加到 launchd，并等待通过服务生成 AssetCache。脚本位于：tools/frida-ssl-pin-target.py，只需 pip3 install frida frida-tools 并运行脚本。

## Tampermonkey

- [长江雨课堂试题转JSON工具](tampermonkey/changjiang-to-json.js)
- [问卷星自动填写脚本](tampermonkey/wjx-auto-complete.js)
