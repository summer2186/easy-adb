var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var path = require('path');
var os = require('os');
var _ = require('lodash');

const ADB_CMD = 'adb';

function filePathOnDevice(absFile) {

  // return path.posix.join(DEVICE_DIR, path.relative(__dirname, absFile).replace(/\\/g, '/'));

  return path.posix.join(DEVICE_DIR, path.relative(__dirname, absFile).replace(/\\/g, '/'));

}

var simpleSpawn = function(cmd, args, cb) {
  var tmp = spawn(cmd, args);
  tmp.stdout.on('data', function (data) {
    if ( self.showOutput == true )
      process.stdout.write(data.toString());
  });

  tmp.stderr.on('data', function (data) {
    if ( self.showOutput == true )
      process.stderr.write(data.toString());
  });

  tmp.on('close', function (code) {
    if ( code == 0 ) {
      cb(null);
    }else {
      cb(new Error("process exit code = " + code));
    }
  });

  tmp.on('error', function(error) {
    cb(error);
  });

  return tmp;
}

function Adb(opts) {
  // 兼容new和Adb()两种模式
  if (!(this instanceof Adb)) {
    return new Adb(opts);
  }

  this.showOutput = true;
  var self = this;
  this.devId = opts.devId;
  this.isOverTcp = opts.isOverTcp;

  this.exeAdb = function(args, cb) {
    var cmd = ADB_CMD +  " ";
    args.forEach((arg)=>{ cmd += (arg + " "); });
    exec(cmd, { maxBuffer: 4*1024*1024 }, (error, stdout, stderr)=>{
      if ( error == null ){
        cb(null, stdout.toString());
      }else {
        cb(error, null);
      }
    });
  }

  this.simpleSpawn = function(cmd, args, cb) {
    var tmp = spawn(cmd, args);
    tmp.stdout.on('data', function (data) {
      if ( self.showOutput == true )
        process.stdout.write(data.toString());
    });

    tmp.stderr.on('data', function (data) {
      if ( self.showOutput == true )
        process.stderr.write(data.toString());
    });

    tmp.on('close', function (code) {
      if ( code == 0 ) {
        cb(null);
      }else {
        cb(new Error("process exit code = " + code));
      }
    });

    tmp.on('error', function(error) {
      cb(error);
    });

    return tmp;
  }

  function makeArgsCommand(cmd, checkArgsArray, argTransform) {
    if ( checkArgsArray == null || checkArgsArray.length < 0 ) {
      return new TypeError('need more arguments');
    }
    var actArgCount = checkArgsArray.length;
    var checkActArgs = (actArgs, actStartIndex, actCount) => {
      if ( actArgCount != actCount ) {
        return new TypeError(`arguments length is not match ${actArgCount} != ${actCount}`);
      }
      for (var i = 0; i < actArgCount; ++i) {
        if ( ! checkArgsArray[ i ](actArgs[actStartIndex + i]) ) {
          return new TypeError(`argument(${actArgs[actStartIndex + i]}) type is not match`);
        }
      }
    }
    var pushArgs = (actArgs, actStartIndex, actCount, destArgs) => {
      for(var i=0; i<actCount; ++i ) {
        if ( argTransform != null && _.isFunction(argTransform) ) {
          destArgs.push(argTransform(actArgs[i + actStartIndex], i + actStartIndex, actArgs));
        } else {
          destArgs.push(actArgs[i + actStartIndex].toString());
        }
      }
    }
    return function() {
      var args = Array.prototype.slice.call(arguments);
      var adbArgs = [];
      if ( _.isArray(cmd) ) {
        adbArgs = adbArgs.concat(cmd);
      } else {
        adbArgs.push(cmd);
      }
      if ( !_.isFunction(args[args.length - 1]) ) {
        throw new TypeError(`last parameter must be function`);
      }
      cb = args[args.length - 1];
      if ( (args.length == actArgCount + 1) && (actArgCount != 0) ) { // 比实际需求参数少，说明没有添加-s
        var err = checkActArgs(args, 0, args.length - 1);
        if ( err ) throw err;
        // 检查一下
        if ( self.devId != "" ) adbArgs = ['-s', self.devId].concat(adbArgs);
        pushArgs(args, 0, args.length - 1, adbArgs);
      } else if ( args.length == actArgCount + 2 ) {
        if ( !_.isString(args[0]) ) throw new TypeError('first argument must be string');
        var err = checkActArgs(args, 1, args.length - 2);
        if ( err ) throw err;
        adbArgs = ['-s', args[0]].concat(adbArgs);
        // console.info(adbArgs);
        pushArgs(args, 1, args.length - 2, adbArgs);
      }
      //console.log("adb params:");
      //console.info(adbArgs);
      // self.simpleSpawn(ADB_CMD, adbArgs, cb);
      self.exeAdb(adbArgs, cb);
    }
  }

  this.reboot = makeArgsCommand('reboot', []);

  this.remount = makeArgsCommand('remount', []);

  this.forward = makeArgsCommand('forward', [_.isString, _.isString]);

  this.push = makeArgsCommand('push', [_.isString, _.isString]);

  this.pull = makeArgsCommand('pull', [_.isString, _.isString]);

  this.deleteFile = makeArgsCommand(['delete', 'rm', '-rf'], [_.isString]);

  // adb shell command , command must with "" !

  this.shell = makeArgsCommand('shell', [_.isString]);

  this.install = makeArgsCommand('install', [_.isString]);

  this.reInstall = makeArgsCommand(['install', '-r'], [_.isString]);

  this.uninstall = makeArgsCommand('uninstall', [_.isString]);

  this.waitOnline = makeArgsCommand('wait-for-device', []);

  this.disconnect = function(cb) {
    if ( self.isOverTcp == true ) {
      simpleSpawn(ADB_CMD, ['disconnect', self.devId], function(err, output) {
        cb(err);
      });
    } else {
      cb(null);
    }
  }
}

// module.exports = new Adb();
exports.connect = function() {
  if ( arguments.length == 0 ) {
    throw new Error('must pass less one arg as function');
  } else{
    // 检查最后一个参数
    if ( !_.isFunction(arguments[arguments.length - 1]) ) {
      throw new TypeError(`last parameter must be function`);
    }
    _cb = arguments[arguments.length - 1];
    if ( arguments.length == 1) { // 连接默认设备
      _cb(null, new Adb({devId: "", isOverTcp: false}));
    } else if ( arguments.length == 2) { // 连接已经创建连接的设备
      if ( !_.isString(arguments[0]) ) {
        _cb(new Error('first param must be string'), null);
      } else {
        _cb(null, new Adb({devId: arguments[0], isOverTcp: false}));
      }
    } else if ( arguments.length == 3 ) { // 连接网络上的设备
      simpleSpawn(ADB_CMD, ['connect', arguments[0], arguments[1]], function(err, output) {
        if ( err == null ) {
          _cb(null, new Adb({ devId: arguments[0] + ':' + arguments[1], isOverTcp: true}));
        } else {
          _cb(err, null);
        }
      });
    }
  }
}

exports.devices = function(cb) {
  exec('adb devices', (error, stdout, stderr) => {
    if ( error ) {
      cb(error, null);
    } else {
      var lines = stdout.toString().split(os.EOL);
      // skip first line
      var deviceArray = [];
      var index = 0;
      while ( (++ index) < lines.length) {
        if ( lines[index] != '' ) {
          var tmp = lines[index].split('\t');
          if ( tmp.length == 2 ) {
            deviceArray.push({id: tmp[0], state: tmp[1]});
          }
        }

        //index ++ ;
      }
      cb(null, deviceArray);
    }
  });
}
