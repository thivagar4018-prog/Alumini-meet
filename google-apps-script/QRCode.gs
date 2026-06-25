// =============================================================================
// QR Code Generator — Pure Google Apps Script (zero external dependencies)
// Ported from qrcodejs (MIT License, davidshimjs)
// Call generateQRSVG_(text) to get an SVG string, or
// Call generateQRImgTag_(text) to get a ready-to-embed <img> HTML tag.
// =============================================================================

var QRErrorCorrectLevel = { L: 1, M: 0, Q: 3, H: 2 };

// ── QRMath: Galois Field arithmetic ──────────────────────────────────────────
var QRMath = {
  EXP_TABLE: new Array(256),
  LOG_TABLE: new Array(256),
  glog: function(n) {
    if (n < 1) throw new Error('glog(' + n + ')');
    return QRMath.LOG_TABLE[n];
  },
  gexp: function(n) {
    while (n < 0) n += 255;
    while (n >= 256) n -= 255;
    return QRMath.EXP_TABLE[n];
  }
};
(function() {
  for (var i = 0; i < 8; i++) QRMath.EXP_TABLE[i] = 1 << i;
  for (var i = 8; i < 256; i++) QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i-4] ^ QRMath.EXP_TABLE[i-5] ^ QRMath.EXP_TABLE[i-6] ^ QRMath.EXP_TABLE[i-8];
  for (var i = 0; i < 255; i++) QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;
})();

// ── QRPolynomial: Reed-Solomon polynomial ─────────────────────────────────────
function QRPolynomial(num, shift) {
  var offset = 0;
  while (offset < num.length && num[offset] == 0) offset++;
  this.num = new Array(num.length - offset + shift);
  for (var i = 0; i < num.length - offset; i++) this.num[i] = num[i + offset];
}
QRPolynomial.prototype = {
  get: function(i) { return this.num[i]; },
  getLength: function() { return this.num.length; },
  multiply: function(e) {
    var num = new Array(this.getLength() + e.getLength() - 1);
    for (var i = 0; i < num.length; i++) num[i] = 0;
    for (var i = 0; i < this.getLength(); i++)
      for (var j = 0; j < e.getLength(); j++)
        num[i+j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
    return new QRPolynomial(num, 0);
  },
  mod: function(e) {
    if (this.getLength() - e.getLength() < 0) return this;
    var ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
    var num = new Array(this.getLength());
    for (var i = 0; i < this.getLength(); i++) num[i] = this.get(i);
    for (var i = 0; i < e.getLength(); i++) num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
    return new QRPolynomial(num, 0).mod(e);
  }
};

// ── QRRSBlock: Reed-Solomon block configuration ───────────────────────────────
var QRRSBlock = {
  RS_BLOCK_TABLE: [
    [1,26,19],[1,26,16],[1,26,13],[1,26,9],
    [1,44,34],[1,44,28],[1,44,22],[1,44,16],
    [1,70,55],[1,70,44],[2,35,17],[2,35,13],
    [1,100,80],[2,50,32],[2,50,24],[4,25,9],
    [1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],
    [2,86,68],[4,43,27],[4,43,19],[4,43,15],
    [2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],
    [2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],
    [2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],
    [2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],
    [4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13]
  ],
  getRSBlocks: function(typeNumber, errorCorrectLevel) {
    var rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
    var length = rsBlock.length / 3;
    var list = [];
    for (var i = 0; i < length; i++) {
      var count = rsBlock[i*3+0], totalCount = rsBlock[i*3+1], dataCount = rsBlock[i*3+2];
      for (var j = 0; j < count; j++) list.push({ totalCount: totalCount, dataCount: dataCount });
    }
    return list;
  },
  getRsBlockTable: function(typeNumber, errorCorrectLevel) {
    switch (errorCorrectLevel) {
      case QRErrorCorrectLevel.L: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber-1)*4+0];
      case QRErrorCorrectLevel.M: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber-1)*4+1];
      case QRErrorCorrectLevel.Q: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber-1)*4+2];
      case QRErrorCorrectLevel.H: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber-1)*4+3];
      default: throw new Error('bad errorCorrectLevel');
    }
  }
};

// ── QRBitBuffer ───────────────────────────────────────────────────────────────
function QRBitBuffer() { this.buffer = []; this.length = 0; }
QRBitBuffer.prototype = {
  get: function(i) { return ((this.buffer[Math.floor(i/8)] >>> (7 - i%8)) & 1) == 1; },
  put: function(num, length) { for (var i = 0; i < length; i++) this.putBit(((num >>> (length - i - 1)) & 1) == 1); },
  getLengthInBits: function() { return this.length; },
  putBit: function(bit) {
    var bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) this.buffer.push(0);
    if (bit) this.buffer[bufIndex] |= (0x80 >>> (this.length % 8));
    this.length++;
  }
};

// ── QR8bitByte: UTF-8 byte encoder ───────────────────────────────────────────
function QR8bitByte(data) {
  this.mode = 4;
  this.data = data;
  this.parsedData = [];
  for (var i = 0; i < data.length; i++) {
    var code = data.charCodeAt(i);
    if (code > 0x10000) {
      this.parsedData.push(0xF0 | ((code & 0x1C0000) >>> 18), 0x80 | ((code & 0x3F000) >>> 12), 0x80 | ((code & 0xFC0) >>> 6), 0x80 | (code & 0x3F));
    } else if (code > 0x800) {
      this.parsedData.push(0xE0 | ((code & 0xF000) >>> 12), 0x80 | ((code & 0xFC0) >>> 6), 0x80 | (code & 0x3F));
    } else if (code > 0x80) {
      this.parsedData.push(0xC0 | ((code & 0x7C0) >>> 6), 0x80 | (code & 0x3F));
    } else {
      this.parsedData.push(code);
    }
  }
  if (this.parsedData.length != this.data.length) {
    this.parsedData.unshift(239, 187, 191); // UTF-8 BOM
  }
}
QR8bitByte.prototype = {
  getLength: function() { return this.parsedData.length; },
  write: function(buffer) { for (var i = 0; i < this.parsedData.length; i++) buffer.put(this.parsedData[i], 8); }
};

// ── QRCodeModel: Core QR code engine ─────────────────────────────────────────
function QRCodeModel(typeNumber, errorCorrectLevel) {
  this.typeNumber = typeNumber;
  this.errorCorrectLevel = errorCorrectLevel;
  this.modules = null;
  this.moduleCount = 0;
  this.dataCache = null;
  this.dataList = [];
}
QRCodeModel.PAD0 = 0xEC;
QRCodeModel.PAD1 = 0x11;

QRCodeModel.prototype = {
  addData: function(data) { this.dataList.push(new QR8bitByte(data)); this.dataCache = null; },
  isDark: function(row, col) { return this.modules[row][col]; },
  getModuleCount: function() { return this.moduleCount; },
  make: function() {
    if (this.typeNumber < 1) {
      this.typeNumber = 1;
      for (; this.typeNumber < 40; this.typeNumber++) {
        var rsBlocks = QRRSBlock.getRSBlocks(this.typeNumber, this.errorCorrectLevel);
        var buffer = new QRBitBuffer();
        for (var i = 0; i < this.dataList.length; i++) {
          var d = this.dataList[i];
          buffer.put(d.mode, 4);
          buffer.put(d.getLength(), QRCodeModel.getLengthInBits(d.mode, this.typeNumber));
          d.write(buffer);
        }
        var totalDataCount = 0;
        for (var i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
        if (buffer.getLengthInBits() <= totalDataCount * 8) break;
      }
    }
    this.dataCache = null;
    this.makeImpl(false, this.getBestMaskPattern());
  },
  makeImpl: function(test, maskPattern) {
    this.moduleCount = this.typeNumber * 4 + 17;
    this.modules = [];
    for (var r = 0; r < this.moduleCount; r++) { this.modules[r] = []; for (var c = 0; c < this.moduleCount; c++) this.modules[r][c] = null; }
    this.setupPositionProbePattern(0, 0);
    this.setupPositionProbePattern(this.moduleCount - 7, 0);
    this.setupPositionProbePattern(0, this.moduleCount - 7);
    this.setupPositionAdjustPattern();
    this.setupTimingPattern();
    this.setupTypeInfo(test, maskPattern);
    if (this.typeNumber >= 7) this.setupTypeNumber(test);
    if (!this.dataCache) this.dataCache = QRCodeModel.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
    this.mapData(this.dataCache, maskPattern);
  },
  setupPositionProbePattern: function(row, col) {
    for (var r = -1; r <= 7; r++) {
      if (row+r < 0 || this.moduleCount <= row+r) continue;
      for (var c = -1; c <= 7; c++) {
        if (col+c < 0 || this.moduleCount <= col+c) continue;
        this.modules[row+r][col+c] =
          (0<=r&&r<=6&&(c==0||c==6)) || (0<=c&&c<=6&&(r==0||r==6)) || (2<=r&&r<=4&&2<=c&&c<=4);
      }
    }
  },
  getBestMaskPattern: function() {
    var minLostPoint = 0, pattern = 0;
    for (var i = 0; i < 8; i++) {
      this.makeImpl(true, i);
      var lostPoint = QRCodeModel.getLostPoint(this);
      if (i == 0 || minLostPoint > lostPoint) { minLostPoint = lostPoint; pattern = i; }
    }
    return pattern;
  },
  setupTimingPattern: function() {
    for (var r = 8; r < this.moduleCount-8; r++) { if (this.modules[r][6]==null) this.modules[r][6]=(r%2==0); }
    for (var c = 8; c < this.moduleCount-8; c++) { if (this.modules[6][c]==null) this.modules[6][c]=(c%2==0); }
  },
  setupPositionAdjustPattern: function() {
    var pos = QRCodeModel.getPatternPosition(this.typeNumber);
    for (var i = 0; i < pos.length; i++) {
      for (var j = 0; j < pos.length; j++) {
        var row = pos[i], col = pos[j];
        if (this.modules[row][col] != null) continue;
        for (var r = -2; r <= 2; r++)
          for (var c = -2; c <= 2; c++)
            this.modules[row+r][col+c] = (r==-2||r==2||c==-2||c==2||(r==0&&c==0));
      }
    }
  },
  setupTypeNumber: function(test) {
    var bits = QRCodeModel.getBCHTypeNumber(this.typeNumber);
    for (var i = 0; i < 18; i++) {
      this.modules[Math.floor(i/3)][i%3+this.moduleCount-8-3] = !test && ((bits>>i)&1)==1;
      this.modules[i%3+this.moduleCount-8-3][Math.floor(i/3)] = !test && ((bits>>i)&1)==1;
    }
  },
  setupTypeInfo: function(test, maskPattern) {
    var bits = QRCodeModel.getBCHTypeInfo((this.errorCorrectLevel<<3)|maskPattern);
    for (var i = 0; i < 15; i++) {
      var mod = !test && ((bits>>i)&1)==1;
      if (i<6) this.modules[i][8]=mod;
      else if (i<8) this.modules[i+1][8]=mod;
      else this.modules[this.moduleCount-15+i][8]=mod;
    }
    for (var i = 0; i < 15; i++) {
      var mod = !test && ((bits>>i)&1)==1;
      if (i<8) this.modules[8][this.moduleCount-i-1]=mod;
      else if (i<9) this.modules[8][15-i-1+1]=mod;
      else this.modules[8][15-i-1]=mod;
    }
    this.modules[this.moduleCount-8][8] = !test;
  },
  mapData: function(data, maskPattern) {
    var inc=-1, row=this.moduleCount-1, bitIndex=7, byteIndex=0;
    for (var col = this.moduleCount-1; col > 0; col -= 2) {
      if (col==6) col--;
      while (true) {
        for (var c = 0; c < 2; c++) {
          if (this.modules[row][col-c]==null) {
            var dark = byteIndex < data.length ? ((data[byteIndex]>>>bitIndex)&1)==1 : false;
            if (QRCodeModel.getMask(maskPattern, row, col-c)) dark = !dark;
            this.modules[row][col-c] = dark;
            if (--bitIndex < 0) { byteIndex++; bitIndex=7; }
          }
        }
        row += inc;
        if (row<0||this.moduleCount<=row) { row-=inc; inc=-inc; break; }
      }
    }
  }
};

QRCodeModel.getMask = function(p, i, j) {
  switch(p) {
    case 0: return (i+j)%2==0; case 1: return i%2==0; case 2: return j%3==0;
    case 3: return (i+j)%3==0; case 4: return (Math.floor(i/2)+Math.floor(j/3))%2==0;
    case 5: return (i*j)%2+(i*j)%3==0; case 6: return ((i*j)%2+(i*j)%3)%2==0;
    case 7: return ((i*j)%3+(i+j)%2)%2==0;
  }
};

QRCodeModel.getPatternPosition = function(t) {
  return [[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],
    [6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],
    [6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],
    [6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],
    [6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],
    [6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],
    [6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]
  ][t-1]||[];
};

QRCodeModel.getBCHTypeInfo = function(data) {
  var d = data<<10;
  while (QRCodeModel.getBCHDigit(d)-QRCodeModel.getBCHDigit(1335)>=0)
    d ^= (1335<<(QRCodeModel.getBCHDigit(d)-QRCodeModel.getBCHDigit(1335)));
  return ((data<<10)|d)^21522;
};

QRCodeModel.getBCHTypeNumber = function(data) {
  var d = data<<12;
  while (QRCodeModel.getBCHDigit(d)-QRCodeModel.getBCHDigit(7973)>=0)
    d ^= (7973<<(QRCodeModel.getBCHDigit(d)-QRCodeModel.getBCHDigit(7973)));
  return (data<<12)|d;
};

QRCodeModel.getBCHDigit = function(data) {
  var digit = 0; while (data!=0){digit++;data>>>=1;} return digit;
};

QRCodeModel.getLostPoint = function(qrCode) {
  var mc = qrCode.getModuleCount(), lp = 0;
  for (var row = 0; row < mc; row++) {
    for (var col = 0; col < mc; col++) {
      var cnt = 0, dark = qrCode.isDark(row, col);
      for (var r = -1; r <= 1; r++) {
        if (row+r<0||mc<=row+r) continue;
        for (var c = -1; c <= 1; c++) {
          if (col+c<0||mc<=col+c||r==0&&c==0) continue;
          if (dark==qrCode.isDark(row+r,col+c)) cnt++;
        }
      }
      if (cnt > 5) lp += (3+cnt-5);
    }
  }
  return lp;
};

QRCodeModel.getLengthInBits = function(mode, type) {
  if (type < 10) { switch(mode){case 1:return 10;case 2:return 9;case 4:return 8;case 8:return 8;} }
  else if (type < 27) { switch(mode){case 1:return 12;case 2:return 11;case 4:return 16;case 8:return 10;} }
  else { switch(mode){case 1:return 14;case 2:return 13;case 4:return 16;case 8:return 12;} }
};

QRCodeModel.createData = function(typeNumber, errorCorrectLevel, dataList) {
  var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
  var buffer = new QRBitBuffer();
  for (var i = 0; i < dataList.length; i++) {
    var d = dataList[i];
    buffer.put(d.mode, 4);
    buffer.put(d.getLength(), QRCodeModel.getLengthInBits(d.mode, typeNumber));
    d.write(buffer);
  }
  var totalDataCount = 0;
  for (var i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
  if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) buffer.put(0, 4);
  while (buffer.getLengthInBits() % 8 != 0) buffer.putBit(false);
  while (buffer.getLengthInBits() < totalDataCount * 8) {
    buffer.put(QRCodeModel.PAD0, 8);
    if (buffer.getLengthInBits() < totalDataCount * 8) buffer.put(QRCodeModel.PAD1, 8);
  }
  return QRCodeModel.createBytes(buffer, rsBlocks);
};

QRCodeModel.createBytes = function(buffer, rsBlocks) {
  var offset=0, maxDcCount=0, maxEcCount=0;
  var dcdata = new Array(rsBlocks.length), ecdata = new Array(rsBlocks.length);
  for (var r = 0; r < rsBlocks.length; r++) {
    var dcCount = rsBlocks[r].dataCount, ecCount = rsBlocks[r].totalCount-dcCount;
    maxDcCount = Math.max(maxDcCount, dcCount); maxEcCount = Math.max(maxEcCount, ecCount);
    dcdata[r] = new Array(dcCount);
    for (var i = 0; i < dcdata[r].length; i++) dcdata[r][i] = 0xff & buffer.buffer[i+offset];
    offset += dcCount;
    var rsPoly = QRCodeModel.getErrorCorrectPolynomial(ecCount);
    var rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength()-1);
    var modPoly = rawPoly.mod(rsPoly);
    ecdata[r] = new Array(rsPoly.getLength()-1);
    for (var i = 0; i < ecdata[r].length; i++) {
      var mi = i + modPoly.getLength() - ecdata[r].length;
      ecdata[r][i] = mi >= 0 ? modPoly.get(mi) : 0;
    }
  }
  var totalCodeCount = 0;
  for (var i = 0; i < rsBlocks.length; i++) totalCodeCount += rsBlocks[i].totalCount;
  var data = new Array(totalCodeCount), index = 0;
  for (var i = 0; i < maxDcCount; i++) for (var r = 0; r < rsBlocks.length; r++) { if (i < dcdata[r].length) data[index++] = dcdata[r][i]; }
  for (var i = 0; i < maxEcCount; i++) for (var r = 0; r < rsBlocks.length; r++) { if (i < ecdata[r].length) data[index++] = ecdata[r][i]; }
  return data;
};

QRCodeModel.getErrorCorrectPolynomial = function(n) {
  var a = new QRPolynomial([1], 0);
  for (var i = 0; i < n; i++) a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
  return a;
};

// ── Public helpers ────────────────────────────────────────────────────────────

/**
 * Generates an SVG string for the given text.
 * @param {string} text  Text to encode in the QR code.
 * @param {number} cell  Module size in px (default 4).
 */
function generateQRSVG_(text, cell) {
  cell = cell || 4;
  try {
    var qr = new QRCodeModel(-1, QRErrorCorrectLevel.M);
    qr.addData(text);
    qr.make();
    var n = qr.getModuleCount();
    var margin = cell * 4;
    var size = n * cell + margin * 2;
    var rects = [];
    for (var row = 0; row < n; row++) {
      for (var col = 0; col < n; col++) {
        if (qr.isDark(row, col)) {
          rects.push('<rect x="'+(col*cell+margin)+'" y="'+(row*cell+margin)+'" width="'+cell+'" height="'+cell+'"/>');
        }
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'">'
      + '<rect width="'+size+'" height="'+size+'" fill="white"/>'
      + '<g fill="black">'+rects.join('')+'</g>'
      + '</svg>';
  } catch (e) {
    Logger.log('generateQRSVG_ error: ' + e.message);
    return null;
  }
}

/**
 * Returns a base64-encoded data URI img tag for the given text.
 * Suitable for embedding directly in HTML emails.
 * @param {string} text     Text to encode.
 * @param {number} pxSize   Displayed width/height in the email (default 160).
 * @param {number} cell     Module size in pixels (default 4).
 */
function generateQRImgTag_(text, pxSize, cell) {
  pxSize = pxSize || 160;
  var svg = generateQRSVG_(text, cell || 4);
  if (!svg) return '<div style="padding:8px;color:#666;font-size:11px;">QR error</div>';
  var b64 = Utilities.base64Encode(svg);
  return '<img src="data:image/svg+xml;base64,' + b64
    + '" width="' + pxSize + '" height="' + pxSize
    + '" alt="Food Token QR Code" style="display:block;border-radius:4px;">';
}
