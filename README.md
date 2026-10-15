# 水滴记 / Budget Gauge

本仓库保留旧版「额度舱」和新版「水滴记」。**当前开发对象是新版水滴记**。
本文用于让新会话快速找到新版代码并继续开发，不展开说明 App 的具体功能。

## 当前开发入口

### 2.1.2 动效与交互更新

设计约束：**保持扁平化极简**，以纯色、留白、细线和文字为主；首页星空和随消费金额上涨的水体继续使用原有渲染与记账逻辑。

用户要求恢复全部原 UI：保留原首页、字号、分类圆盘、按钮和设置布局，移除改版导航、网格分类及新增文案。`water-motion.css` 仅提供按压和减少动态效果规则，`water-v3-motion.js` 保留滚动标题、列表首次进入视野、金额到分类页的连续衔接与分段入场，不改静态 UI。侧页松手收尾采用携带手势速度的临界阻尼弹簧，支持反向拖动与减少动态效果。

后续动效调整：金额进入分类时在绘制前安装动画起始状态，保留金额上移；每级分类逐片旋开，片间停顿 12ms，8 片约 364ms 完成。展开期间隐藏静态圆环，由每片携带的弧线逐步拼成外圈；首片同时带两侧边线，中心按钮保留 1px 细描边。历史列表每次进入及日期明细打开都自上而下展开；统计环在侧页进入时立即启动，不等待圆形转场结束。历史、设置、登录页统一收起标题上下留白和占用高度，紧凑标题距内容顶部至少 40px，并兼容安全区；返回按钮淡出，滚回顶部恢复。设置标题栏透明，裁切滚入标题区域的设置内容，让底层真实星空连续可见。历史详情切换在安装位置动画前同步更新标题布局。`node water-demo-android/test-motion.cjs` 覆盖这些行为。

历史卡片切换由 `WaterHistoryMotion` 统一控制：点击同一任务内渲染并安装首帧，选中日期先加深边框约 60ms，再移动；归位时保持选中边框，移动结束后才恢复普通边框。明细在日期响应后通过缓起的顶部裁切和逐行下移渐显展开，旧卡片视觉副本同时收起；副本不接收交互，动画结束即移除。恢复总览时还原原滚动位置，离页先折叠卡片。屏幕外未播放过的卡片预先裁切，避免滚入视野时先闪现再展开。验证：`node water-demo-android/test-history-motion.cjs`。

首页、设置、登录页均可横滑进入历史或统计，原纵向页面与滚动位置保留，关闭侧页后回到原位置；横向锁定后才捕获指针，避免破坏普通按钮点击。进入设置时，首页金额与文字随设置进度连续向上离场。触摸回归：`node water-demo-android/test-cross-navigation.cjs`。

进入登录页时，透明表单从上方滑入，叠在白底反色星空上；标题栏同样透明，滚入标题范围的表单内容会被裁切。水体、水滴和首页金额继续下移，星空保留屏幕坐标；水内外遮罩使用移动后的水体路径。登录期间临时显示水外星空，不改变用户保存的开关，模拟星空也用缓存画布反色合成。`node water-demo-android/test-login-cover.cjs` 检查星点像素保持原位、水面位移、透明叠加、模拟星空和返回。

登录页向上返回手势允许从输入框、按钮和可点击内容起滑，确定纵向拖动后才接管并收起输入焦点，普通点击继续按原行为处理。内容较长时先消耗滚动距离，到底后在同一手势中接续页面返回；慢速拖动约 12% 屏高即可返回。完成拖动会抑制随后的合成点击，避免误提交或展开。验证：`node water-demo-android/test-login-return.cjs`。

记账页的消费记录说明、时间与分类标签及内容统一为 `.875rem`（默认 14px），分类空值占位文字的字体、字重、颜色与标签一致，覆盖浏览器原生占位样式；时间按钮与分类输入框共用 32px 高度、20px 行高和 6px 纵向内边距，标签明确左对齐；金额符号与数字按基线对齐。`node water-demo-android/test-record-alignment.cjs` 检查三种屏幕、放大字号、空白和已填状态、日期选择与保存。

首页进入金额输入页的圆点扩张为 200ms，点击即准备输入页，覆盖屏幕时直接同步显示；交接检查位于水体/星空绘制之前，不增加下一帧等待。`node water-demo-android/test-transition.cjs` 检查三个点击位置的覆盖交接和键盘立即可用。

历史列表在侧页圆形显露达到约 55% 时即开始逐行展开，与页面转场重叠；转场完成不会重新播放，避免先打开空页再展开列表。数据刷新仍在转场完成后应用，避免拖动过程中重建列表。验证：`node water-demo-android/test-history-entry.cjs`。

验证：`node water-demo-android/test-v3.cjs` 检查原 UI 与保留动效，另运行 `check-layout.cjs`、`test-record.cjs` 和 `test-browse.cjs`。`outputs/v3-preview/` 中早期改版截图和视频已过时，不代表恢复后的 UI。覆盖安装包固定为 `outputs/water-demo.apk`；本次作为小更新发布 `2.1.2` / `21002`，未升级到 3.0。

截至 2026-10-10：

| 项目 | 新版水滴记 | 旧版额度舱 |
| --- | --- | --- |
| Android 工程 | `water-demo-android/` | `android/`（Capacitor） |
| applicationId | `com.codex.waterdemo` | `com.codex.budgetgauge` |
| Android 版本 | `2.1.2`，versionCode `21002` | `0.3.1` |
| 主页面 | `public/water-demo.html` | `index.html` |
| 安装包交付 | `outputs/water-demo.apk` | 原有发布流程 |

新版虽然目录名仍带 `demo`，但已经是当前持续开发和交付的独立 App。
新版首次以 `v2.0.0` 发布，当前根目录 `package.json` 与新版 APK 的版本统一为 `2.1.2`（安装序号递增为 `21002`，可覆盖此前 `2.1.1` 安装包）。
2.0.4 默认分类新增餐饮首项“家庭”和公共交通后的“电动车”。本地仍是旧默认分类时自动使用新默认列表，手动定制过的分类保留。
旧版 Android 工程仍保留 `0.3.1`，不要使用旧版版本同步脚本更新新版。
设置页“检查更新”仅在点击时查询 GitHub 最新正式 Release，对比当前安装版本；下载资产固定为 `water-demo.apk`，避免下载旧版安装包。
Android 更新检查通过原生网络线程请求 API，失败时读取 `public/water-release.json` 的备用版本信息；这个文件只在对应 Release 安装包发布后更新。浏览器链接直接调用系统 Intent，避免包可见性查询误判。月份切换保留同一个 ECharts 实例与分类路径对应的扇区，通过合并数据平滑改变扇区大小，不清空或重建旭日图，不做整体淡入或位移。
后续发布需提升新版 `versionCode` 并保持当前水滴记的包名及签名，才能覆盖安装。当前发布沿用已有测试包签名。

## 项目目录

设置页新增“真实星空”开关，默认关闭。开启后使用离线 HYG v4.1 星表（7 等及更亮的 15598 颗恒星），按时间、经纬度、恒星自行和岁差计算星图，通过手机背面方向投影到水体内。`real-sky.js` 为计算与生命周期源代码，`public/real-sky-catalog.json` 为筛选后的星表；生成脚本将两者嵌入自包含页面。数据署名与许可见 `public/real-sky-data-license.txt`。

Android 原生方向感应与水体重力开关独立，使用旋转向量及磁偏角校正；设置页仅显示“模拟星河”“真实星空”“日月行星”“银河光带”四个开关，真实星空、日月行星或银河光带任一开启后自动获取当前位置并申请粗略定位权限。模拟星河不依赖配色或定位；模拟星河与真实星空互斥，开启一个会自动关闭另一个。旧版藏蓝配色的星河状态仅在首次升级时迁移为模拟星河开关，此后配色只改变颜色。没有位置或绝对方向时显示设置提示，不伪造朝向。关闭及后台时停止星图计算、方向监听和待处理定位。2.1.0 以约 100Hz 采样手机方向，绘制时直接读取最新采样，避免原生推送排队；通过低延迟四元数平滑旋转，缓存恒星坐标和分组绘制以减少逐帧开销。当前包含恒星、日月行星和真实 Gaia 银河光带，不包含星座连线；硬件罗盘精度与磁干扰需要真机核验。

日月行星由 `sky-solar-worker.js` 在 Worker 中通过 vendored Astronomy Engine 计算（每 30 秒刷新），`sky-solar.js` 将其显示为星点、柔和太阳光盘及朝向正确的月相。`sky-galaxy.js` 用 WebGL 采样 Gaia DR2 Hammer 全天图，将光带按真实银道坐标投影，绘制长边限制为 512 像素后与水体合成。两项均随关闭及后台释放资源；所有资源由生成脚本嵌入单文件，应用运行时不下载星图或计算库。许可见 `public/sky-extras-license.txt` 和 `vendor/astronomy-LICENSE.txt`。

2.0.5 的恒星、日月行星及银河均不限制地平线，仅按当前手机视野投影。真实星点提高亮度；行星统一直径 7 CSS 像素，日月按实际视角大小统一放大 12 倍，在 390 像素宽视野中心约为 42 像素，保留距离变化和真实月相。

2.1.0 性能优化版由 `sky-gpu-scene.js` 共用一个 WebGL 画布，恒星星表通过 `sky-stars-gpu.js` 一次上传，GPU 每帧完成朝向投影和柔和光晕；恒星与日月行星各一次批量 POINTS 绘制，银河在同一 GPU 上用长边不超过 512 的帧缓冲绘制后合成。整个天空最后仅一次 `drawImage` 合入水体，不在 JS 中逐帧遍历绘制全部恒星。WebGL 不可用或上下文丢失时回退到 Canvas；关闭及后台释放 GPU 资源。验证：`node water-demo-android/test-sky-gpu.cjs`，包含星点投影、月相方向、单次合成、星表不重复上传以及上下文恢复。

2.1.1 支持水体外显示星空：水体内显示原色，外部用当前配色的主题色显示，保留天体位置、透明度和月相。`sky-water-composite.js` 在同一个 GPU 上将天空仅渲染一次到纹理，以实际波浪轮廓生成 stencil，再分别合成内外颜色，最终仍只一次 `drawImage` 进入主画布，不读取像素到 CPU。无 WebGL 设备用 `sky-canvas-composite.js` 对同一张星空缓存着色和裁剪。模拟星河仍仅存在于水体内。

“水体外显示星空”开关默认开启，选择单独保存；关闭恢复只在水体内显示，不影响真实星空、日月行星、银河开关，也不单独启动方向监听。关闭时不执行外部着色合成，并释放 GPU 合成纹理。

验证命令：`node scripts/test-real-sky.mjs`、`node scripts/test-sky-extras.mjs`、`node water-demo-android/test-real-sky.cjs`、`node water-demo-android/test-sky-extras.cjs`、`node water-demo-android/profile-real-sky.cjs`（后三者启动无界面 Edge）。

```text
.
├── README.md                         # 新会话接手入口
├── AGENTS.md                         # 执行、构建与发布约束
├── public/
│   └── water-demo.html               # 新版主页面源码：水体、手势、页面容器和本地状态
├── water-record.css                  # 新版嵌入页面的配色与布局覆盖
├── water-auth.js                     # 新版登录、会话恢复和云端记录适配
├── script.js                         # 新旧版共用逻辑；包含新版 iframe 适配分支
├── index.html                        # 旧版页面，也是新版嵌入页面的结构来源
├── styles.css                        # 共用基础样式
├── scripts/
│   ├── build-water-preview.mjs        # 生成新版自包含 HTML
│   └── sync-version.mjs              # 旧版版本同步脚本
├── water-demo-android/
│   ├── build.gradle                  # 新版独立 Android 构建与版本配置
│   ├── settings.gradle
│   ├── gradle.properties
│   ├── src/main/
│   │   ├── AndroidManifest.xml       # 应用名称、图标、权限和 Activity 配置
│   │   ├── java/com/codex/waterdemo/MainActivity.java
│   │   │                             # WebView、传感器、键盘、返回和前后台桥接
│   │   └── res/drawable/ic_water.xml # 新版图标
│   ├── LEDGER.md                     # 缓存与云端同步的实现说明
│   ├── test-*.cjs                    # 逻辑与浏览器检查
│   ├── check-layout.cjs              # 页面布局检查
│   └── build/                        # 生成物，不提交
├── android/                          # 旧版 Capacitor Android 工程；也提供 Gradle wrapper
├── assets/                           # 共用资源
├── SUPABASE_EXPENSE_CATEGORIES.md     # 分类数据相关文档，修改时以当前代码为准
├── package.json / package-lock.json   # Web 依赖及旧版 npm 命令
├── capacitor.config.json             # 旧版 Capacitor 配置
└── outputs/                          # 本地 HTML、预览图和 APK，不提交
```

## 新会话如何继续开发

1. 先读 `AGENTS.md`，执行 `git status --short` 和 `git log -5 --oneline`。保留现有未提交改动。
2. 默认修改新版。主页面和动画主要在 `public/water-demo.html`；记账、历史、统计等嵌入页面主要在 `script.js` 与 `water-record.css`。
3. `script.js` 同时服务新旧版。修改新版时优先沿用 `isWaterRecordView`、`isWaterPageView` 等适配分支，避免误改旧版。
4. 涉及登录或消费同步时，再读 `water-auth.js` 和 [LEDGER.md](water-demo-android/LEDGER.md)。本文不代表对线上数据库状态的重新核验。
5. 涉及 Android 生命周期、重力感应或键盘时，检查新版 `MainActivity.java`。

`public/water-demo.html` 同时包含手写主页面代码和自动生成的 `recordBundle`。
**不要手动修改 `recordBundle` 的压缩内容**。修改它的来源文件后运行生成脚本。
生成脚本将 `index.html`、`styles.css`、`water-record.css`、打包后的 `script.js`（含其依赖）嵌入 HTML；主页面通过 `recordFrame`、`sideFrame` 加载嵌入页面。

当前工作区的实现可能领先于最近一次提交，不能只用 Git 提交说明判断完成状态。
最近基线提交：`3221703`（独立水滴记），`bee167e`（星点与大额消费标记）。
后续的前台恢复动画和金额滚动时长调整，在编写本文时仍位于未提交改动中；接手时以实际 `git status` 为准。

## 生成与交付

在仓库根目录执行。依赖未安装时先运行 `npm ci`。

生成新版自包含页面：

```powershell
node scripts/build-water-preview.mjs
```

同时更新 `public/water-demo.html` 和 `outputs/water-demo.html`。
**修改共享脚本或样式后，必须先生成页面，再打包 APK**；Gradle 只复制现有 HTML，不会自动运行上述脚本。

用户要求打包时，使用独立工程：

```powershell
$env:JAVA_HOME = 'E:\Android\jbr'
& '.\android\gradlew.bat' -p water-demo-android assembleDebug --offline --console=plain
Copy-Item -LiteralPath 'water-demo-android/build/outputs/apk/debug/WaterDemo-debug.apk' -Destination 'outputs/water-demo.apk' -Force
```

`JAVA_HOME` 是当前开发机路径；其他机器需要配置自己的 JDK、Android SDK 和 `water-demo-android/local.properties`。
`--offline` 依赖已缓存的 Gradle/Android 构建组件。当前独立工程使用 compile/target SDK 36、Build Tools 36.1.0，最低 Android API 24。
交付的是 debug 签名测试包，不等同于正式发布版本。打包后核验 APK 签名。

开发与交付约定：

- 用户远程查看，功能修改完成后默认打包并交付更新的 APK，不需要用户重复要求；用户明确说先不打包时，改为提供静态预览图。不要只给 HTML。
- 固定覆盖 `outputs/water-demo.apk`、`outputs/water-demo.html`，避免为小改动积累多个版本。
- 不更改电脑系统代理。
- Git 提交按用户要求执行；APK、预览图、附件、本地 SDK 配置不提交。
- 遵守 `AGENTS.md`：未经明确要求，不运行 `npm run dev`、`npm run android:sync`、`npm run version:sync` 或 Android Studio 构建/同步操作。
- `npm run android:sync`、`npm run version:sync` 属于旧版工作流，不用来构建新版水滴记。

## 验证入口

按改动选择相关检查，不必每次跑全部测试：

| 改动范围 | 检查文件（位于 `water-demo-android/`） |
| --- | --- |
| 水体与星点 | `test-water.cjs`、`test-stars.cjs` |
| 记账与金额动画 | `test-record.cjs`、`test-amount.cjs` |
| 前台恢复 | `test-foreground.cjs` |
| 左右、上下页面手势 | `test-side.cjs`、`test-vertical.cjs` |
| 历史与统计 | `test-browse.cjs` |
| 登录与同步 | `test-login.cjs`、`test-ledger.cjs` |
| 键盘、布局与衔接 | `test-keyboard.cjs`、`check-layout.cjs`、`test-transition.cjs` |

例如：

```powershell
node water-demo-android/test-stars.cjs
node water-demo-android/test-record.cjs
node water-demo-android/test-foreground.cjs
```

部分浏览器测试目前使用开发机上的 Playwright 和 Edge 绝对路径，且读取生成后的 HTML。
换机器需调整这些路径；跨月运行时也应检查旧测试中的固定消费日期。
浏览器或模拟测试通过不代表安卓真机观感已经确认，手势、传感器及 WebView 闪烁仍需 APK 实测。

## 旧版工程

旧版仍保留仪表盘界面、Capacitor 工程及原发布流程。除非用户明确要求，不将新版作为旧包升级发布，也不自动修改旧版版本、签名或更新地址。

项目地址：[cnjialin/budgetgauge](https://github.com/cnjialin/budgetgauge)。
