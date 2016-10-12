# easy-adb

一个简单的adb调用脚本，方便使用在自动化测试方面

##　使用

### 枚举设备

一般情况下，adb可以连接多个设备，使用： **devices** 方法可以枚举出已经连接的设备

```javascript
var Adb = require('easy-adb');

Adb.devices((err, devices) => {
  console.info(devices);
});
```

### 连接设备

使用 **connect** 可以连接目标设备

```javascript
var Adb = require('easy-adb');

Adb.connect(function(err, adb) {
  // 连接默认设备，如果存在多个设备，会报错
});

Adb.connect('20080411', function(err, adb) {
  // 连接设备ID为20080411的设备，如果存在多个同名设备，会报错
});

Adb.connect('192.168.1.10', '5555', function(err, adb) {
  // 连接网络上的设备，通过TCP/IP使用adb
  // 调用disconnect来断开连接
  adb.disconnect();
});
```
