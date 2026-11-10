# 主场 · 球星之夜

一款浏览器足球游戏。选一位球星，以球员、门将或裁判的身份上场。选人页可查看和自定义全息球星卡。

## 本地试玩

在仓库根目录启动静态服务器：

```sh
python3 -m http.server 8843
```

打开 [http://localhost:8843/](http://localhost:8843/)。也可以直接进入 `/play-v3/`。游戏需要支持 WebGL 的浏览器。

## 测试

```sh
npm --prefix play-v3 test
```

游戏入口为 [play-v3/index.html](play-v3/index.html)。第三方素材来源及许可见 [素材鸣谢](play-v3/credits.html)。
