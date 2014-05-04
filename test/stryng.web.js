(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

/**
 * If `Buffer._useTypedArrays`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (compatible down to IE6)
 */
Buffer._useTypedArrays = (function () {
  // Detect if browser supports Typed Arrays. Supported browsers are IE 10+, Firefox 4+,
  // Chrome 7+, Safari 5.1+, Opera 11.6+, iOS 4.2+. If the browser does not support adding
  // properties to `Uint8Array` instances, then that's the same as no `Uint8Array` support
  // because we need to be able to add all the node Buffer API methods. This is an issue
  // in Firefox 4-29. Now fixed: https://bugzilla.mozilla.org/show_bug.cgi?id=695438
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() &&
        typeof arr.subarray === 'function' // Chrome 9-10 lack `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Workaround: node's base64 implementation allows for non-padded strings
  // while base64-js does not.
  if (encoding === 'base64' && type === 'string') {
    subject = stringtrim(subject)
    while (subject.length % 4 !== 0) {
      subject = subject + '='
    }
  }

  // Find the length
  var length
  if (type === 'number')
    length = coerce(subject)
  else if (type === 'string')
    length = Buffer.byteLength(subject, encoding)
  else if (type === 'object')
    length = coerce(subject.length) // assume that object is array-like
  else
    throw new Error('First argument needs to be a number, array or string.')

  var buf
  if (Buffer._useTypedArrays) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer._useTypedArrays && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    for (i = 0; i < length; i++) {
      if (Buffer.isBuffer(subject))
        buf[i] = subject.readUInt8(i)
      else
        buf[i] = subject[i]
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer._useTypedArrays && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.isBuffer = function (b) {
  return !!(b !== null && b !== undefined && b._isBuffer)
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'hex':
      ret = str.length / 2
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.concat = function (list, totalLength) {
  assert(isArray(list), 'Usage: Buffer.concat(list, [totalLength])\n' +
      'list should be an Array.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (typeof totalLength !== 'number') {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

// BUFFER INSTANCE METHODS
// =======================

function _hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  assert(strLen % 2 === 0, 'Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    assert(!isNaN(byte), 'Invalid hex string')
    buf[offset + i] = byte
  }
  Buffer._charsWritten = i * 2
  return i
}

function _utf8Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function _asciiWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function _binaryWrite (buf, string, offset, length) {
  return _asciiWrite(buf, string, offset, length)
}

function _base64Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function _utf16leWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf16leToBytes(string), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = _asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = _binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = _base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leWrite(this, string, offset, length)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toString = function (encoding, start, end) {
  var self = this

  encoding = String(encoding || 'utf8').toLowerCase()
  start = Number(start) || 0
  end = (end !== undefined)
    ? Number(end)
    : end = self.length

  // Fastpath empty strings
  if (end === start)
    return ''

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexSlice(self, start, end)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Slice(self, start, end)
      break
    case 'ascii':
      ret = _asciiSlice(self, start, end)
      break
    case 'binary':
      ret = _binarySlice(self, start, end)
      break
    case 'base64':
      ret = _base64Slice(self, start, end)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leSlice(self, start, end)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  assert(end >= start, 'sourceEnd < sourceStart')
  assert(target_start >= 0 && target_start < target.length,
      'targetStart out of bounds')
  assert(start >= 0 && start < source.length, 'sourceStart out of bounds')
  assert(end >= 0 && end <= source.length, 'sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 100 || !Buffer._useTypedArrays) {
    for (var i = 0; i < len; i++)
      target[i + target_start] = this[i + start]
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

function _base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function _utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function _asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++)
    ret += String.fromCharCode(buf[i])
  return ret
}

function _binarySlice (buf, start, end) {
  return _asciiSlice(buf, start, end)
}

function _hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function _utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i+1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = clamp(start, len, 0)
  end = clamp(end, len, len)

  if (Buffer._useTypedArrays) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  return this[offset]
}

function _readUInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    val = buf[offset]
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
  } else {
    val = buf[offset] << 8
    if (offset + 1 < len)
      val |= buf[offset + 1]
  }
  return val
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  return _readUInt16(this, offset, true, noAssert)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  return _readUInt16(this, offset, false, noAssert)
}

function _readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    if (offset + 2 < len)
      val = buf[offset + 2] << 16
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
    val |= buf[offset]
    if (offset + 3 < len)
      val = val + (buf[offset + 3] << 24 >>> 0)
  } else {
    if (offset + 1 < len)
      val = buf[offset + 1] << 16
    if (offset + 2 < len)
      val |= buf[offset + 2] << 8
    if (offset + 3 < len)
      val |= buf[offset + 3]
    val = val + (buf[offset] << 24 >>> 0)
  }
  return val
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  return _readUInt32(this, offset, true, noAssert)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  return _readUInt32(this, offset, false, noAssert)
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  var neg = this[offset] & 0x80
  if (neg)
    return (0xff - this[offset] + 1) * -1
  else
    return this[offset]
}

function _readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt16(buf, offset, littleEndian, true)
  var neg = val & 0x8000
  if (neg)
    return (0xffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  return _readInt16(this, offset, true, noAssert)
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  return _readInt16(this, offset, false, noAssert)
}

function _readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt32(buf, offset, littleEndian, true)
  var neg = val & 0x80000000
  if (neg)
    return (0xffffffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  return _readInt32(this, offset, true, noAssert)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  return _readInt32(this, offset, false, noAssert)
}

function _readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 23, 4)
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  return _readFloat(this, offset, true, noAssert)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  return _readFloat(this, offset, false, noAssert)
}

function _readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 52, 8)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  return _readDouble(this, offset, true, noAssert)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  return _readDouble(this, offset, false, noAssert)
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'trying to write beyond buffer length')
    verifuint(value, 0xff)
  }

  if (offset >= this.length) return

  this[offset] = value
}

function _writeUInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
    buf[offset + i] =
        (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
            (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, false, noAssert)
}

function _writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 4); i < j; i++) {
    buf[offset + i] =
        (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, false, noAssert)
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= this.length)
    return

  if (value >= 0)
    this.writeUInt8(value, offset, noAssert)
  else
    this.writeUInt8(0xff + value + 1, offset, noAssert)
}

function _writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt16(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, false, noAssert)
}

function _writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt32(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, false, noAssert)
}

function _writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 23, 4)
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, false, noAssert)
}

function _writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 52, 8)
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (typeof value === 'string') {
    value = value.charCodeAt(0)
  }

  assert(typeof value === 'number' && !isNaN(value), 'value is not a number')
  assert(end >= start, 'end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  assert(start >= 0 && start < this.length, 'start out of bounds')
  assert(end >= 0 && end <= this.length, 'end out of bounds')

  for (var i = start; i < end; i++) {
    this[i] = value
  }
}

Buffer.prototype.inspect = function () {
  var out = []
  var len = this.length
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i])
    if (i === exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...'
      break
    }
  }
  return '<Buffer ' + out.join(' ') + '>'
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer._useTypedArrays) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1)
        buf[i] = this[i]
      return buf.buffer
    }
  } else {
    throw new Error('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

// slice(start, end)
function clamp (index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len
  if (index >= 0) return index
  index += len
  if (index >= 0) return index
  return 0
}

function coerce (length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length)
  return length < 0 ? 0 : length
}

function isArray (subject) {
  return (Array.isArray || function (subject) {
    return Object.prototype.toString.call(subject) === '[object Array]'
  })(subject)
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F)
      byteArray.push(str.charCodeAt(i))
    else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16))
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  var pos
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

/*
 * We have to make sure that the value is a valid integer. This means that it
 * is non-negative. It has no fractional component and that it does not
 * exceed the maximum allowed value.
 */
function verifuint (value, max) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value >= 0, 'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifsint (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754 (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

},{"base64-js":2,"ieee754":3}],2:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var ZERO   = '0'.charCodeAt(0)
	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS)
			return 62 // '+'
		if (code === SLASH)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	module.exports.toByteArray = b64ToByteArray
	module.exports.fromByteArray = uint8ToBase64
}())

},{}],3:[function(require,module,exports){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],4:[function(require,module,exports){
(function (Buffer){
(function (global, module) {

  var exports = module.exports;

  /**
   * Exports.
   */

  module.exports = expect;
  expect.Assertion = Assertion;

  /**
   * Exports version.
   */

  expect.version = '0.3.1';

  /**
   * Possible assertion flags.
   */

  var flags = {
      not: ['to', 'be', 'have', 'include', 'only']
    , to: ['be', 'have', 'include', 'only', 'not']
    , only: ['have']
    , have: ['own']
    , be: ['an']
  };

  function expect (obj) {
    return new Assertion(obj);
  }

  /**
   * Constructor
   *
   * @api private
   */

  function Assertion (obj, flag, parent) {
    this.obj = obj;
    this.flags = {};

    if (undefined != parent) {
      this.flags[flag] = true;

      for (var i in parent.flags) {
        if (parent.flags.hasOwnProperty(i)) {
          this.flags[i] = true;
        }
      }
    }

    var $flags = flag ? flags[flag] : keys(flags)
      , self = this;

    if ($flags) {
      for (var i = 0, l = $flags.length; i < l; i++) {
        // avoid recursion
        if (this.flags[$flags[i]]) continue;

        var name = $flags[i]
          , assertion = new Assertion(this.obj, name, this)

        if ('function' == typeof Assertion.prototype[name]) {
          // clone the function, make sure we dont touch the prot reference
          var old = this[name];
          this[name] = function () {
            return old.apply(self, arguments);
          };

          for (var fn in Assertion.prototype) {
            if (Assertion.prototype.hasOwnProperty(fn) && fn != name) {
              this[name][fn] = bind(assertion[fn], assertion);
            }
          }
        } else {
          this[name] = assertion;
        }
      }
    }
  }

  /**
   * Performs an assertion
   *
   * @api private
   */

  Assertion.prototype.assert = function (truth, msg, error, expected) {
    var msg = this.flags.not ? error : msg
      , ok = this.flags.not ? !truth : truth
      , err;

    if (!ok) {
      err = new Error(msg.call(this));
      if (arguments.length > 3) {
        err.actual = this.obj;
        err.expected = expected;
        err.showDiff = true;
      }
      throw err;
    }

    this.and = new Assertion(this.obj);
  };

  /**
   * Check if the value is truthy
   *
   * @api public
   */

  Assertion.prototype.ok = function () {
    this.assert(
        !!this.obj
      , function(){ return 'expected ' + i(this.obj) + ' to be truthy' }
      , function(){ return 'expected ' + i(this.obj) + ' to be falsy' });
  };

  /**
   * Creates an anonymous function which calls fn with arguments.
   *
   * @api public
   */

  Assertion.prototype.withArgs = function() {
    expect(this.obj).to.be.a('function');
    var fn = this.obj;
    var args = Array.prototype.slice.call(arguments);
    return expect(function() { fn.apply(null, args); });
  };

  /**
   * Assert that the function throws.
   *
   * @param {Function|RegExp} callback, or regexp to match error string against
   * @api public
   */

  Assertion.prototype.throwError =
  Assertion.prototype.throwException = function (fn) {
    expect(this.obj).to.be.a('function');

    var thrown = false
      , not = this.flags.not;

    try {
      this.obj();
    } catch (e) {
      if (isRegExp(fn)) {
        var subject = 'string' == typeof e ? e : e.message;
        if (not) {
          expect(subject).to.not.match(fn);
        } else {
          expect(subject).to.match(fn);
        }
      } else if ('function' == typeof fn) {
        fn(e);
      }
      thrown = true;
    }

    if (isRegExp(fn) && not) {
      // in the presence of a matcher, ensure the `not` only applies to
      // the matching.
      this.flags.not = false;
    }

    var name = this.obj.name || 'fn';
    this.assert(
        thrown
      , function(){ return 'expected ' + name + ' to throw an exception' }
      , function(){ return 'expected ' + name + ' not to throw an exception' });
  };

  /**
   * Checks if the array is empty.
   *
   * @api public
   */

  Assertion.prototype.empty = function () {
    var expectation;

    if ('object' == typeof this.obj && null !== this.obj && !isArray(this.obj)) {
      if ('number' == typeof this.obj.length) {
        expectation = !this.obj.length;
      } else {
        expectation = !keys(this.obj).length;
      }
    } else {
      if ('string' != typeof this.obj) {
        expect(this.obj).to.be.an('object');
      }

      expect(this.obj).to.have.property('length');
      expectation = !this.obj.length;
    }

    this.assert(
        expectation
      , function(){ return 'expected ' + i(this.obj) + ' to be empty' }
      , function(){ return 'expected ' + i(this.obj) + ' to not be empty' });
    return this;
  };

  /**
   * Checks if the obj exactly equals another.
   *
   * @api public
   */

  Assertion.prototype.be =
  Assertion.prototype.equal = function (obj) {
    this.assert(
        obj === this.obj
      , function(){ return 'expected ' + i(this.obj) + ' to equal ' + i(obj) }
      , function(){ return 'expected ' + i(this.obj) + ' to not equal ' + i(obj) });
    return this;
  };

  /**
   * Checks if the obj sortof equals another.
   *
   * @api public
   */

  Assertion.prototype.eql = function (obj) {
    this.assert(
        expect.eql(this.obj, obj)
      , function(){ return 'expected ' + i(this.obj) + ' to sort of equal ' + i(obj) }
      , function(){ return 'expected ' + i(this.obj) + ' to sort of not equal ' + i(obj) }
      , obj);
    return this;
  };

  /**
   * Assert within start to finish (inclusive).
   *
   * @param {Number} start
   * @param {Number} finish
   * @api public
   */

  Assertion.prototype.within = function (start, finish) {
    var range = start + '..' + finish;
    this.assert(
        this.obj >= start && this.obj <= finish
      , function(){ return 'expected ' + i(this.obj) + ' to be within ' + range }
      , function(){ return 'expected ' + i(this.obj) + ' to not be within ' + range });
    return this;
  };

  /**
   * Assert typeof / instance of
   *
   * @api public
   */

  Assertion.prototype.a =
  Assertion.prototype.an = function (type) {
    if ('string' == typeof type) {
      // proper english in error msg
      var n = /^[aeiou]/.test(type) ? 'n' : '';

      // typeof with support for 'array'
      this.assert(
          'array' == type ? isArray(this.obj) :
            'regexp' == type ? isRegExp(this.obj) :
              'object' == type
                ? 'object' == typeof this.obj && null !== this.obj
                : type == typeof this.obj
        , function(){ return 'expected ' + i(this.obj) + ' to be a' + n + ' ' + type }
        , function(){ return 'expected ' + i(this.obj) + ' not to be a' + n + ' ' + type });
    } else {
      // instanceof
      var name = type.name || 'supplied constructor';
      this.assert(
          this.obj instanceof type
        , function(){ return 'expected ' + i(this.obj) + ' to be an instance of ' + name }
        , function(){ return 'expected ' + i(this.obj) + ' not to be an instance of ' + name });
    }

    return this;
  };

  /**
   * Assert numeric value above _n_.
   *
   * @param {Number} n
   * @api public
   */

  Assertion.prototype.greaterThan =
  Assertion.prototype.above = function (n) {
    this.assert(
        this.obj > n
      , function(){ return 'expected ' + i(this.obj) + ' to be above ' + n }
      , function(){ return 'expected ' + i(this.obj) + ' to be below ' + n });
    return this;
  };

  /**
   * Assert numeric value below _n_.
   *
   * @param {Number} n
   * @api public
   */

  Assertion.prototype.lessThan =
  Assertion.prototype.below = function (n) {
    this.assert(
        this.obj < n
      , function(){ return 'expected ' + i(this.obj) + ' to be below ' + n }
      , function(){ return 'expected ' + i(this.obj) + ' to be above ' + n });
    return this;
  };

  /**
   * Assert string value matches _regexp_.
   *
   * @param {RegExp} regexp
   * @api public
   */

  Assertion.prototype.match = function (regexp) {
    this.assert(
        regexp.exec(this.obj)
      , function(){ return 'expected ' + i(this.obj) + ' to match ' + regexp }
      , function(){ return 'expected ' + i(this.obj) + ' not to match ' + regexp });
    return this;
  };

  /**
   * Assert property "length" exists and has value of _n_.
   *
   * @param {Number} n
   * @api public
   */

  Assertion.prototype.length = function (n) {
    expect(this.obj).to.have.property('length');
    var len = this.obj.length;
    this.assert(
        n == len
      , function(){ return 'expected ' + i(this.obj) + ' to have a length of ' + n + ' but got ' + len }
      , function(){ return 'expected ' + i(this.obj) + ' to not have a length of ' + len });
    return this;
  };

  /**
   * Assert property _name_ exists, with optional _val_.
   *
   * @param {String} name
   * @param {Mixed} val
   * @api public
   */

  Assertion.prototype.property = function (name, val) {
    if (this.flags.own) {
      this.assert(
          Object.prototype.hasOwnProperty.call(this.obj, name)
        , function(){ return 'expected ' + i(this.obj) + ' to have own property ' + i(name) }
        , function(){ return 'expected ' + i(this.obj) + ' to not have own property ' + i(name) });
      return this;
    }

    if (this.flags.not && undefined !== val) {
      if (undefined === this.obj[name]) {
        throw new Error(i(this.obj) + ' has no property ' + i(name));
      }
    } else {
      var hasProp;
      try {
        hasProp = name in this.obj
      } catch (e) {
        hasProp = undefined !== this.obj[name]
      }

      this.assert(
          hasProp
        , function(){ return 'expected ' + i(this.obj) + ' to have a property ' + i(name) }
        , function(){ return 'expected ' + i(this.obj) + ' to not have a property ' + i(name) });
    }

    if (undefined !== val) {
      this.assert(
          val === this.obj[name]
        , function(){ return 'expected ' + i(this.obj) + ' to have a property ' + i(name)
          + ' of ' + i(val) + ', but got ' + i(this.obj[name]) }
        , function(){ return 'expected ' + i(this.obj) + ' to not have a property ' + i(name)
          + ' of ' + i(val) });
    }

    this.obj = this.obj[name];
    return this;
  };

  /**
   * Assert that the array contains _obj_ or string contains _obj_.
   *
   * @param {Mixed} obj|string
   * @api public
   */

  Assertion.prototype.string =
  Assertion.prototype.contain = function (obj) {
    if ('string' == typeof this.obj) {
      this.assert(
          ~this.obj.indexOf(obj)
        , function(){ return 'expected ' + i(this.obj) + ' to contain ' + i(obj) }
        , function(){ return 'expected ' + i(this.obj) + ' to not contain ' + i(obj) });
    } else {
      this.assert(
          ~indexOf(this.obj, obj)
        , function(){ return 'expected ' + i(this.obj) + ' to contain ' + i(obj) }
        , function(){ return 'expected ' + i(this.obj) + ' to not contain ' + i(obj) });
    }
    return this;
  };

  /**
   * Assert exact keys or inclusion of keys by using
   * the `.own` modifier.
   *
   * @param {Array|String ...} keys
   * @api public
   */

  Assertion.prototype.key =
  Assertion.prototype.keys = function ($keys) {
    var str
      , ok = true;

    $keys = isArray($keys)
      ? $keys
      : Array.prototype.slice.call(arguments);

    if (!$keys.length) throw new Error('keys required');

    var actual = keys(this.obj)
      , len = $keys.length;

    // Inclusion
    ok = every($keys, function (key) {
      return ~indexOf(actual, key);
    });

    // Strict
    if (!this.flags.not && this.flags.only) {
      ok = ok && $keys.length == actual.length;
    }

    // Key string
    if (len > 1) {
      $keys = map($keys, function (key) {
        return i(key);
      });
      var last = $keys.pop();
      str = $keys.join(', ') + ', and ' + last;
    } else {
      str = i($keys[0]);
    }

    // Form
    str = (len > 1 ? 'keys ' : 'key ') + str;

    // Have / include
    str = (!this.flags.only ? 'include ' : 'only have ') + str;

    // Assertion
    this.assert(
        ok
      , function(){ return 'expected ' + i(this.obj) + ' to ' + str }
      , function(){ return 'expected ' + i(this.obj) + ' to not ' + str });

    return this;
  };

  /**
   * Assert a failure.
   *
   * @param {String ...} custom message
   * @api public
   */
  Assertion.prototype.fail = function (msg) {
    var error = function() { return msg || "explicit failure"; }
    this.assert(false, error, error);
    return this;
  };

  /**
   * Function bind implementation.
   */

  function bind (fn, scope) {
    return function () {
      return fn.apply(scope, arguments);
    }
  }

  /**
   * Array every compatibility
   *
   * @see bit.ly/5Fq1N2
   * @api public
   */

  function every (arr, fn, thisObj) {
    var scope = thisObj || global;
    for (var i = 0, j = arr.length; i < j; ++i) {
      if (!fn.call(scope, arr[i], i, arr)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Array indexOf compatibility.
   *
   * @see bit.ly/a5Dxa2
   * @api public
   */

  function indexOf (arr, o, i) {
    if (Array.prototype.indexOf) {
      return Array.prototype.indexOf.call(arr, o, i);
    }

    if (arr.length === undefined) {
      return -1;
    }

    for (var j = arr.length, i = i < 0 ? i + j < 0 ? 0 : i + j : i || 0
        ; i < j && arr[i] !== o; i++);

    return j <= i ? -1 : i;
  }

  // https://gist.github.com/1044128/
  var getOuterHTML = function(element) {
    if ('outerHTML' in element) return element.outerHTML;
    var ns = "http://www.w3.org/1999/xhtml";
    var container = document.createElementNS(ns, '_');
    var xmlSerializer = new XMLSerializer();
    var html;
    if (document.xmlVersion) {
      return xmlSerializer.serializeToString(element);
    } else {
      container.appendChild(element.cloneNode(false));
      html = container.innerHTML.replace('><', '>' + element.innerHTML + '<');
      container.innerHTML = '';
      return html;
    }
  };

  // Returns true if object is a DOM element.
  var isDOMElement = function (object) {
    if (typeof HTMLElement === 'object') {
      return object instanceof HTMLElement;
    } else {
      return object &&
        typeof object === 'object' &&
        object.nodeType === 1 &&
        typeof object.nodeName === 'string';
    }
  };

  /**
   * Inspects an object.
   *
   * @see taken from node.js `util` module (copyright Joyent, MIT license)
   * @api private
   */

  function i (obj, showHidden, depth) {
    var seen = [];

    function stylize (str) {
      return str;
    }

    function format (value, recurseTimes) {
      // Provide a hook for user-specified inspect functions.
      // Check that value is an object with an inspect function on it
      if (value && typeof value.inspect === 'function' &&
          // Filter out the util module, it's inspect function is special
          value !== exports &&
          // Also filter out any prototype objects using the circular check.
          !(value.constructor && value.constructor.prototype === value)) {
        return value.inspect(recurseTimes);
      }

      // Primitive types cannot have properties
      switch (typeof value) {
        case 'undefined':
          return stylize('undefined', 'undefined');

        case 'string':
          var simple = '\'' + json.stringify(value).replace(/^"|"$/g, '')
                                                   .replace(/'/g, "\\'")
                                                   .replace(/\\"/g, '"') + '\'';
          return stylize(simple, 'string');

        case 'number':
          return stylize('' + value, 'number');

        case 'boolean':
          return stylize('' + value, 'boolean');
      }
      // For some reason typeof null is "object", so special case here.
      if (value === null) {
        return stylize('null', 'null');
      }

      if (isDOMElement(value)) {
        return getOuterHTML(value);
      }

      // Look up the keys of the object.
      var visible_keys = keys(value);
      var $keys = showHidden ? Object.getOwnPropertyNames(value) : visible_keys;

      // Functions without properties can be shortcutted.
      if (typeof value === 'function' && $keys.length === 0) {
        if (isRegExp(value)) {
          return stylize('' + value, 'regexp');
        } else {
          var name = value.name ? ': ' + value.name : '';
          return stylize('[Function' + name + ']', 'special');
        }
      }

      // Dates without properties can be shortcutted
      if (isDate(value) && $keys.length === 0) {
        return stylize(value.toUTCString(), 'date');
      }
      
      // Error objects can be shortcutted
      if (value instanceof Error) {
        return stylize("["+value.toString()+"]", 'Error');
      }

      var base, type, braces;
      // Determine the object type
      if (isArray(value)) {
        type = 'Array';
        braces = ['[', ']'];
      } else {
        type = 'Object';
        braces = ['{', '}'];
      }

      // Make functions say that they are functions
      if (typeof value === 'function') {
        var n = value.name ? ': ' + value.name : '';
        base = (isRegExp(value)) ? ' ' + value : ' [Function' + n + ']';
      } else {
        base = '';
      }

      // Make dates with properties first say the date
      if (isDate(value)) {
        base = ' ' + value.toUTCString();
      }

      if ($keys.length === 0) {
        return braces[0] + base + braces[1];
      }

      if (recurseTimes < 0) {
        if (isRegExp(value)) {
          return stylize('' + value, 'regexp');
        } else {
          return stylize('[Object]', 'special');
        }
      }

      seen.push(value);

      var output = map($keys, function (key) {
        var name, str;
        if (value.__lookupGetter__) {
          if (value.__lookupGetter__(key)) {
            if (value.__lookupSetter__(key)) {
              str = stylize('[Getter/Setter]', 'special');
            } else {
              str = stylize('[Getter]', 'special');
            }
          } else {
            if (value.__lookupSetter__(key)) {
              str = stylize('[Setter]', 'special');
            }
          }
        }
        if (indexOf(visible_keys, key) < 0) {
          name = '[' + key + ']';
        }
        if (!str) {
          if (indexOf(seen, value[key]) < 0) {
            if (recurseTimes === null) {
              str = format(value[key]);
            } else {
              str = format(value[key], recurseTimes - 1);
            }
            if (str.indexOf('\n') > -1) {
              if (isArray(value)) {
                str = map(str.split('\n'), function (line) {
                  return '  ' + line;
                }).join('\n').substr(2);
              } else {
                str = '\n' + map(str.split('\n'), function (line) {
                  return '   ' + line;
                }).join('\n');
              }
            }
          } else {
            str = stylize('[Circular]', 'special');
          }
        }
        if (typeof name === 'undefined') {
          if (type === 'Array' && key.match(/^\d+$/)) {
            return str;
          }
          name = json.stringify('' + key);
          if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
            name = name.substr(1, name.length - 2);
            name = stylize(name, 'name');
          } else {
            name = name.replace(/'/g, "\\'")
                       .replace(/\\"/g, '"')
                       .replace(/(^"|"$)/g, "'");
            name = stylize(name, 'string');
          }
        }

        return name + ': ' + str;
      });

      seen.pop();

      var numLinesEst = 0;
      var length = reduce(output, function (prev, cur) {
        numLinesEst++;
        if (indexOf(cur, '\n') >= 0) numLinesEst++;
        return prev + cur.length + 1;
      }, 0);

      if (length > 50) {
        output = braces[0] +
                 (base === '' ? '' : base + '\n ') +
                 ' ' +
                 output.join(',\n  ') +
                 ' ' +
                 braces[1];

      } else {
        output = braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
      }

      return output;
    }
    return format(obj, (typeof depth === 'undefined' ? 2 : depth));
  }

  expect.stringify = i;

  function isArray (ar) {
    return Object.prototype.toString.call(ar) === '[object Array]';
  }

  function isRegExp(re) {
    var s;
    try {
      s = '' + re;
    } catch (e) {
      return false;
    }

    return re instanceof RegExp || // easy case
           // duck-type for context-switching evalcx case
           typeof(re) === 'function' &&
           re.constructor.name === 'RegExp' &&
           re.compile &&
           re.test &&
           re.exec &&
           s.match(/^\/.*\/[gim]{0,3}$/);
  }

  function isDate(d) {
    return d instanceof Date;
  }

  function keys (obj) {
    if (Object.keys) {
      return Object.keys(obj);
    }

    var keys = [];

    for (var i in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, i)) {
        keys.push(i);
      }
    }

    return keys;
  }

  function map (arr, mapper, that) {
    if (Array.prototype.map) {
      return Array.prototype.map.call(arr, mapper, that);
    }

    var other= new Array(arr.length);

    for (var i= 0, n = arr.length; i<n; i++)
      if (i in arr)
        other[i] = mapper.call(that, arr[i], i, arr);

    return other;
  }

  function reduce (arr, fun) {
    if (Array.prototype.reduce) {
      return Array.prototype.reduce.apply(
          arr
        , Array.prototype.slice.call(arguments, 1)
      );
    }

    var len = +this.length;

    if (typeof fun !== "function")
      throw new TypeError();

    // no value to return if no initial value and an empty array
    if (len === 0 && arguments.length === 1)
      throw new TypeError();

    var i = 0;
    if (arguments.length >= 2) {
      var rv = arguments[1];
    } else {
      do {
        if (i in this) {
          rv = this[i++];
          break;
        }

        // if array contains no values, no initial value to return
        if (++i >= len)
          throw new TypeError();
      } while (true);
    }

    for (; i < len; i++) {
      if (i in this)
        rv = fun.call(null, rv, this[i], i, this);
    }

    return rv;
  }

  /**
   * Asserts deep equality
   *
   * @see taken from node.js `assert` module (copyright Joyent, MIT license)
   * @api private
   */

  expect.eql = function eql(actual, expected) {
    // 7.1. All identical values are equivalent, as determined by ===.
    if (actual === expected) {
      return true;
    } else if ('undefined' != typeof Buffer
      && Buffer.isBuffer(actual) && Buffer.isBuffer(expected)) {
      if (actual.length != expected.length) return false;

      for (var i = 0; i < actual.length; i++) {
        if (actual[i] !== expected[i]) return false;
      }

      return true;

      // 7.2. If the expected value is a Date object, the actual value is
      // equivalent if it is also a Date object that refers to the same time.
    } else if (actual instanceof Date && expected instanceof Date) {
      return actual.getTime() === expected.getTime();

      // 7.3. Other pairs that do not both pass typeof value == "object",
      // equivalence is determined by ==.
    } else if (typeof actual != 'object' && typeof expected != 'object') {
      return actual == expected;
    // If both are regular expression use the special `regExpEquiv` method
    // to determine equivalence.
    } else if (isRegExp(actual) && isRegExp(expected)) {
      return regExpEquiv(actual, expected);
    // 7.4. For all other Object pairs, including Array objects, equivalence is
    // determined by having the same number of owned properties (as verified
    // with Object.prototype.hasOwnProperty.call), the same set of keys
    // (although not necessarily the same order), equivalent values for every
    // corresponding key, and an identical "prototype" property. Note: this
    // accounts for both named and indexed properties on Arrays.
    } else {
      return objEquiv(actual, expected);
    }
  };

  function isUndefinedOrNull (value) {
    return value === null || value === undefined;
  }

  function isArguments (object) {
    return Object.prototype.toString.call(object) == '[object Arguments]';
  }

  function regExpEquiv (a, b) {
    return a.source === b.source && a.global === b.global &&
           a.ignoreCase === b.ignoreCase && a.multiline === b.multiline;
  }

  function objEquiv (a, b) {
    if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
      return false;
    // an identical "prototype" property.
    if (a.prototype !== b.prototype) return false;
    //~~~I've managed to break Object.keys through screwy arguments passing.
    //   Converting to array solves the problem.
    if (isArguments(a)) {
      if (!isArguments(b)) {
        return false;
      }
      a = pSlice.call(a);
      b = pSlice.call(b);
      return expect.eql(a, b);
    }
    try{
      var ka = keys(a),
        kb = keys(b),
        key, i;
    } catch (e) {//happens when one is a string literal and the other isn't
      return false;
    }
    // having the same number of owned properties (keys incorporates hasOwnProperty)
    if (ka.length != kb.length)
      return false;
    //the same set of keys (although not necessarily the same order),
    ka.sort();
    kb.sort();
    //~~~cheap key test
    for (i = ka.length - 1; i >= 0; i--) {
      if (ka[i] != kb[i])
        return false;
    }
    //equivalent values for every corresponding key, and
    //~~~possibly expensive deep test
    for (i = ka.length - 1; i >= 0; i--) {
      key = ka[i];
      if (!expect.eql(a[key], b[key]))
         return false;
    }
    return true;
  }

  var json = (function () {
    "use strict";

    if ('object' == typeof JSON && JSON.parse && JSON.stringify) {
      return {
          parse: nativeJSON.parse
        , stringify: nativeJSON.stringify
      }
    }

    var JSON = {};

    function f(n) {
        // Format integers to have at least two digits.
        return n < 10 ? '0' + n : n;
    }

    function date(d, key) {
      return isFinite(d.valueOf()) ?
          d.getUTCFullYear()     + '-' +
          f(d.getUTCMonth() + 1) + '-' +
          f(d.getUTCDate())      + 'T' +
          f(d.getUTCHours())     + ':' +
          f(d.getUTCMinutes())   + ':' +
          f(d.getUTCSeconds())   + 'Z' : null;
    }

    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap,
        indent,
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        },
        rep;


    function quote(string) {

  // If the string contains no control characters, no quote characters, and no
  // backslash characters, then we can safely slap some quotes around it.
  // Otherwise we must also replace the offending characters with safe escape
  // sequences.

        escapable.lastIndex = 0;
        return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
            var c = meta[a];
            return typeof c === 'string' ? c :
                '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
        }) + '"' : '"' + string + '"';
    }


    function str(key, holder) {

  // Produce a string from holder[key].

        var i,          // The loop counter.
            k,          // The member key.
            v,          // The member value.
            length,
            mind = gap,
            partial,
            value = holder[key];

  // If the value has a toJSON method, call it to obtain a replacement value.

        if (value instanceof Date) {
            value = date(key);
        }

  // If we were called with a replacer function, then call the replacer to
  // obtain a replacement value.

        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }

  // What happens next depends on the value's type.

        switch (typeof value) {
        case 'string':
            return quote(value);

        case 'number':

  // JSON numbers must be finite. Encode non-finite numbers as null.

            return isFinite(value) ? String(value) : 'null';

        case 'boolean':
        case 'null':

  // If the value is a boolean or null, convert it to a string. Note:
  // typeof null does not produce 'null'. The case is included here in
  // the remote chance that this gets fixed someday.

            return String(value);

  // If the type is 'object', we might be dealing with an object or an array or
  // null.

        case 'object':

  // Due to a specification blunder in ECMAScript, typeof null is 'object',
  // so watch out for that case.

            if (!value) {
                return 'null';
            }

  // Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

  // Is the value an array?

            if (Object.prototype.toString.apply(value) === '[object Array]') {

  // The value is an array. Stringify every element. Use null as a placeholder
  // for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }

  // Join all of the elements together, separated with commas, and wrap them in
  // brackets.

                v = partial.length === 0 ? '[]' : gap ?
                    '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
                    '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }

  // If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    if (typeof rep[i] === 'string') {
                        k = rep[i];
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            } else {

  // Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }

  // Join all of the member texts together, separated with commas,
  // and wrap them in braces.

            v = partial.length === 0 ? '{}' : gap ?
                '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
                '{' + partial.join(',') + '}';
            gap = mind;
            return v;
        }
    }

  // If the JSON object does not yet have a stringify method, give it one.

    JSON.stringify = function (value, replacer, space) {

  // The stringify method takes a value and an optional replacer, and an optional
  // space parameter, and returns a JSON text. The replacer can be a function
  // that can replace values, or an array of strings that will select the keys.
  // A default replacer method can be provided. Use of the space parameter can
  // produce text that is more easily readable.

        var i;
        gap = '';
        indent = '';

  // If the space parameter is a number, make an indent string containing that
  // many spaces.

        if (typeof space === 'number') {
            for (i = 0; i < space; i += 1) {
                indent += ' ';
            }

  // If the space parameter is a string, it will be used as the indent string.

        } else if (typeof space === 'string') {
            indent = space;
        }

  // If there is a replacer, it must be a function or an array.
  // Otherwise, throw an error.

        rep = replacer;
        if (replacer && typeof replacer !== 'function' &&
                (typeof replacer !== 'object' ||
                typeof replacer.length !== 'number')) {
            throw new Error('JSON.stringify');
        }

  // Make a fake root object containing our value under the key of ''.
  // Return the result of stringifying the value.

        return str('', {'': value});
    };

  // If the JSON object does not yet have a parse method, give it one.

    JSON.parse = function (text, reviver) {
    // The parse method takes a text and an optional reviver function, and returns
    // a JavaScript value if the text is a valid JSON text.

        var j;

        function walk(holder, key) {

    // The walk method is used to recursively walk the resulting structure so
    // that modifications can be made.

            var k, v, value = holder[key];
            if (value && typeof value === 'object') {
                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = walk(value, k);
                        if (v !== undefined) {
                            value[k] = v;
                        } else {
                            delete value[k];
                        }
                    }
                }
            }
            return reviver.call(holder, key, value);
        }


    // Parsing happens in four stages. In the first stage, we replace certain
    // Unicode characters with escape sequences. JavaScript handles many characters
    // incorrectly, either silently deleting them, or treating them as line endings.

        text = String(text);
        cx.lastIndex = 0;
        if (cx.test(text)) {
            text = text.replace(cx, function (a) {
                return '\\u' +
                    ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            });
        }

    // In the second stage, we run the text against regular expressions that look
    // for non-JSON patterns. We are especially concerned with '()' and 'new'
    // because they can cause invocation, and '=' because it can cause mutation.
    // But just to be safe, we want to reject all unexpected forms.

    // We split the second stage into 4 regexp operations in order to work around
    // crippling inefficiencies in IE's and Safari's regexp engines. First we
    // replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
    // replace all simple value tokens with ']' characters. Third, we delete all
    // open brackets that follow a colon or comma or that begin the text. Finally,
    // we look to see that the remaining characters are only whitespace or ']' or
    // ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

        if (/^[\],:{}\s]*$/
                .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
                    .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
                    .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

    // In the third stage we use the eval function to compile the text into a
    // JavaScript structure. The '{' operator is subject to a syntactic ambiguity
    // in JavaScript: it can begin a block or an object literal. We wrap the text
    // in parens to eliminate the ambiguity.

            j = eval('(' + text + ')');

    // In the optional fourth stage, we recursively walk the new structure, passing
    // each name/value pair to a reviver function for possible transformation.

            return typeof reviver === 'function' ?
                walk({'': j}, '') : j;
        }

    // If the text is not JSON parseable, then a SyntaxError is thrown.

        throw new SyntaxError('JSON.parse');
    };

    return JSON;
  })();

  if ('undefined' != typeof window) {
    window.expect = module.exports;
  }

})(
    this
  , 'undefined' != typeof module ? module : {exports: {}}
);

}).call(this,require("buffer").Buffer)
},{"buffer":1}],5:[function(require,module,exports){

// baseline setup
// ==============
// leverage _uglifyjs_' ability to declare global variables
// ```
// if ( typeof DEBUG === 'undefined' ) DEBUG = true;
// ```

( function( root ) {

  var // one to var them all

  // used to access native instance methods
  array, object, string, regex, func,

    /**
     * _Stryng_'s version.
     * @name Stryng.VERSION
     * @readOnly
     * @type {String}
     */
    VERSION = string = '0.9.0',

    // used for input validation
    INFINITY = 1 / 0,

    // used to limit _String.fromCharCode_
    MAX_CHARCODE = 65535, // Math.pow(2, 16) - 1

    // used to convert to string
    String = func = string.constructor,

    // methods _Stryng_ hopes to adopt
    methods = array = ('' +
      + 'charAt,'
      + 'charCodeAt,'
      + 'codePointAt,'
      + 'concat,'
      + 'contains,'
      + 'endsWith'
      + 'indexOf,'
      + 'lastIndexOf,'
      + 'localeCompare,'
      + 'match,'
      + 'normalize,'
      + 'replace,'
      + 'search,'
      + 'slice,'
      + 'split,'
      + 'startsWith,'
      + 'substr,'
      + 'substring,'
      + 'toLocaleLowerCase,'
      + 'toLocaleUpperCase,'
      + 'toLowerCase,'
      + 'toUpperCase,'
      + 'trim,'
      + 'trimLeft,'
      + 'trimRight'
    ).split( ',' ),

    // methods which's native implementations to override if necessary
    shim_methods = [],

    // whether or not to adopt native static functions
    adopt_native_statics,

    // inner module to hold type/class check functions
    is = object = {},

    // method shortcuts
    // ----------------
    // create quick access variables for both native static functions
    // and instance methods. polyfills are reduced in functionality and byte-size.
    // they are thus __for internal use only__ and neither populated onto
    // native prototypes nor intended to be spec-compliant.

    // ### native static methods

    JSON_stringify = typeof JSON !== 'undefined' && JSON.stringify,
    Math_floor = Math.floor,
    Math_random = Math.random,
    String_fromCharCode = String.fromCharCode,

    // fully [spec](http://www.ecma-international.org/ecma-262/5.1/#sec-9.4) compliant
    // implementation of `Number.toInteger`, tested and benchmarked at [jsperf](http://jsperf.com/to-integer/11).
    Number_toInteger = Number.toInteger || function( n ) {
      return (
        ( n = +n ) && isFinite( n ) // toNumber and isFinite
        ? n - ( n % 1 ) // ceil negatives, floor positives
        : n || 0 // leave be +-Infinity, translate NaN to zero
      );
    },

    // feature detect native _Object.defineProperty_
    // and set _Stryng_'s version simultaneously.
    // 
    // - try to define a dummy property on an object literal which fails
    //   - either in case `defineProperty` isn't available
    //   - or only DOM objects are allowed as first argument
    // - if successful, return the reference to that function
    // - implicitely return `undefined` otherwise
    Object_defineProperty = ( function( defineProperty ) {
      try {
        defineProperty( Stryng, 'VERSION', { value: VERSION } );
        return defineProperty;
      } catch ( e ) {
        Stryng.VERSION = VERSION;
      }
    } )( Object.defineProperty ),

    // ### native instance methods

    array_push = array.push,
    array_slice = array.slice,
    array_unshift = array.unshift,
    function_call = func.call,
    object_toString = object.toString,

    array_forEach = array.forEach || function( iterator ) {
      for( var array = this, i = array.length; i--; iterator( array[ i ] ));
    },

    array_contains = array.contains || function( item ){
      for( var array = this, i = array.length; i-- && array[i] !== item;);
      return i !== -1;
    },

    // make this one pretty for the w3c-wishlist. used in favor of
    // the composition of _Array#forEach_ and _Object.keys_.
    object_forOwn = function( iterator, context ) {

      var object = this,
        key, return_value;

      if ( object == null ) {
        throw new TypeError( 'can\'t convert ' + object + ' to object' );
      }

      object = Object( object );

      for ( key in object ) {
        if ( object.hasOwnProperty( key ) ) {
          return_value = iterator.call( context, object[ key ], key, object );
          if ( return_value === false ) {
            break;
          }
        }
      }
    },

    // regular expressions
    // -------------------

    // used to check whether a regular expression's `source`
    // is suitable for reverse search. see _Stryng#endsWith_ or _Stryng#splitRight_.
    re_source_matches_end = regex = /[^\\]\$$/,

    re_is_float = /^\d+(?:\.\d*)?(?:[eE][\-\+]?\d+)?$/,

    // ### diacritics & liguatures
    // because character mappings easily grow large we only provide
    // the [Latin-1 Supplement](http://unicode-table.com/en/#latin-1-supplement)
    // ( letters in range [xC0-xFF] ) mapped to their nearest character
    // allowed in URL path segments.
    // 
    // we also rely on native _String#toLowerCase_ and _String#toUpperCase_
    // to properly convert characters - <a href="javascript:alert('give me the link!')">which they don't</a>
    latin_1_supplement = {
      'A': '\\xC0-\\xC5',
      'a': '\\xE0-\\xE5',
      'AE': '\\xC6',
      'ae': '\\xE6',
      'C': '\\xC7',
      'c': '\\xE7',
      'E': '\\xC8-\\xCB',
      'e': '\\xE8-\\xEB',
      'I': '\\xCC-\\xCF',
      'i': '\\xEC-\\xEF',
      'D': '\\xD0',
      'd': '\\xF0',
      'N': '\\xD1',
      'n': '\\xF1',
      'O': '\\xD2-\\xD6\\xD8',
      'o': '\\xF2-\\xF6\\xF8',
      'U': '\\xD9-\\xDC',
      'u': '\\xF9-\\xFC',
      'Y': '\\xDD',
      'y': '\\xFD\\xFF',
      'sz': '\\xDF'
    };

  // compile the character ranges to regular expressions to match and replace later
  object_forOwn.call( latin_1_supplement, function( chars, nearest_char ) {
    latin_1_supplement[ nearest_char ] = new RegExp( '[' + chars + ']', 'g' );
  } );

  // ### the whitespace shim
  // native implementations of _String#trim_ might miss out
  // on some of the more exotic characters considered [whitespace][1],
  // [line terminators][2] or the mysterious [Zs][3].
  // this section detects those flaws and constructs the regular expressions used
  // in the polyfills and others - [Stryng#splitLines](#splitLines) in particular.
  // Many thanks to the authors of [faster trim][4] and [whitespace deviations][5].
  // 
  // - let `re_whitespace` be the native white space matcher.
  // - iterate over our white space characters
  // - add all whitespace characters not recognized
  //   as such to the matcher's source.
  // - if the native implementation is not `is_spec_compliant`,
  //   reconstruct the above regular expressions and mark
  //   their associated methods as _to be shimmed_
  //   
  // [1]: http://www.ecma-international.org/ecma-262/5.1/#sec-7.2
  // [2]: http://www.ecma-international.org/ecma-262/5.1/#sec-7.3
  // [3]: http://www.fileformat.info/info/unicode/category/
  // [4]: http://blog.stevenlevithan.com/archives/faster-trim-javascript
  // [5]: http://perfectionkills.com/whitespace-deviations/

  var re_no_whitespace = /\S/,
    re_whitespaces = /\s\s*/g,
    re_trim_left = /^\s\s*/,
    re_trim_right = /\s*\s$/,
    re_linebreaks = /\r?\n|\u2028|\u2029/g;

  ( function() {

    var is_spec_compliant = true,
      re_whitespace = /\s/,
      re_whitespace_source = re_whitespace.source,
      re_whitespaces_source,

      hex_char_codes = (''
        + '0009,' // tab
        + '000A,' // line feed
        + '000B,' // vertical tab
        + '000C,' // form feed
        + '000D,' // carriage return
        + '0020,' // space
        + '00A0,' // nbsp

        + '1680,180E,2000,2001,' // prevent
        + '2002,2003,2004,2005,' // formatter
        + '2006,2007,2008,2009,' // from
        + '200A,202F,205F,3000,' // inlining

        + '2028,' // line separator
        + '2029,' // paragraph separator
        + 'FEFF' // byte order mark
      ).split(','), chr;

    array_forEach.call( hex_char_codes, function( hex_char_code ) {

      chr = String_fromCharCode( parseInt( hex_char_code, 16 ) )

      if ( !re_whitespace.test( chr ) ) {
        re_whitespace_source += '\\u' + hex_char_code;
        is_spec_compliant = false;
      }

    } );

    if ( !is_spec_compliant ) {

      shim_methods.push( 'trim', 'trimRight', 'trimLeft' );

      re_whitespaces_source = '[' + re_whitespace_source + '][' + re_whitespace_source + ']*';

      re_no_whitespace = new RegExp( '[^' + re_whitespace_source + ']' );
      re_whitespaces = new RegExp( re_whitespaces_source, 'g' );
      re_trim_left = new RegExp( '^' + re_whitespaces_source );
      re_trim_right = new RegExp( '[' + re_whitespace_source + ']+$' );
    }

  }() );

  // type safety
  // -----------
  // the inner module `is` holds type checks. this is an excerpt from
  // my [gist](https://gist.github.com/esnippo/9960508) inspired by the
  // [jQuery](http://jquery.com) and [underscore](http://underscorejs.org) libraries.
  // 
  // - provide quick access to precomputed `repr` within _Array#forEach_ closure
  // - early exit on "falsies"
  // - apply native implementations where available
  // - fix old webkit's bug where `typeof regex` yields `'function'` 

  array_forEach.call( [ 'Array', 'Function', 'RegExp' ], function( klass ) {

    var repr = '[object ' + klass + ']';
    is[ klass ] = function( any ) {
      return any && object_toString.call( any ) === repr;
    };

  } );

  is.Array = Array.isArray || is.Array;

  if ( typeof regex === 'object' ) {
    is.Function = function( any ) {
      return any && typeof any === 'function';
    };
  }

  // feature detection
  // -----------------
  
  // check whether or not native static functions exist on the global
  // _String_ namespace __and__ throw an error if no arguments passed
  // as required for static functions on _Stryng_.
  if(is.Function(String.slice)){
    try {
      String.slice();
    } catch( e ){
      adopt_native_statics = true;
    }
  }

  // check if the native implementation of _String#startsWith_
  // already knows how to deal with regular expressions.
  // consider _String#endsWith_ to behave the same on that matter.
  if(is.Function(string.startswith)){
    try{
      VERSION.startsWith(/\d/);
    } catch( e ){
      shim_methods.push( 'startsWith', 'endsWith' );
    }
  }

  // check if the native implementation of _String#substr_
  // correctly deals with negative indices.
  if ( 'xy'.substr( -1 ) !== 'y' ){
    shim_methods.push( 'substr' );
  }

  // custom exit
  // -----------
  // wraps the process of throwing an _Error_.
  function exit( message ) {
    throw new Error( 'invalid usage of stryng member. ' + ( message || '' ) );
  }

  // defining Stryng
  // ===============

  // constructor
  // -----------

  /**
   * @class Stryng
   * @param {*} [value=""]
   *   the value to parse. defaults to the empty string
   * @param {Boolean} [is_mutable=false]
   *   whether the created instance should be mutable or
   *   create a new instance from the result of every method call
   * @return {Stryng} -
   *   the `input`'s string representation wrapped
   *   in the instance returned.
   */
  function Stryng( value, is_mutable ) {
    var that = this, value_len;

    // allow omitting the new operator
    if ( !( that instanceof Stryng ) ) return new Stryng( value, is_mutable );

    /**
     * the wrapped native string primitive
     * @name Stryng~_value
     * @type {String}
     */
    that._value = value != null ? String( value ) : '';

    /**
     * whether the created instance should be mutable or
     * create a new instance from the result of every method call
     * @name Stryng~_is_mutable
     * @type {Boolean}
     */
    that._is_mutable = !! is_mutable;

    /**
     * the [String#_value](#_value)'s length defined via _Object.defineProperty_
     * if available, simply set onto the instance otherwise.
     * @name Stryng#length
     * @readOnly
     * @type {Number}
     * @todo further [reading](http://www.2ality.com/2012/08/property-definition-assignment.html)
     */
    value_len = that._value.length;
    if ( Object_defineProperty ) {
      Object_defineProperty( that, 'length', {
        get: function() {
          return value_len;
        }
      } );
    } else {
      that.length = value_len;
    }
  }

  // cloning mutables
  // ----------------
  
  /**
   * in case the instance was not constructed to be mutable
   * this is the hook to get a copy of it. delegates to [Stryng#constructor](#Stryng)
   * @param {Boolean} [is_mutable=false]
   *   whether the cloned instance should be mutable or
   *   create a new instance from the internal result of every method call
   * @return {Stryng} -
   *   a copy of the _Stryng_ instance
   */
  Stryng.prototype.clone = function( is_mutable ) {
    return new Stryng( this._value, is_mutable );
  };

  // seemlessness
  // ------------
  // by overriding `valueOf` and `toString` on the prototype
  // chain, instances of _Stryng_ can be used like native ones
  // in many situations:
  // ```
  // var numeric = Stryng('123');
  // !numeric; // false
  // +numeric; // 123
  // 
  // var greeting = Stryng('Hello');
  // greeting + ' World!' // 'Hello World'
  // 
  // var dictionary = {};
  // dictionary[ greeting ] = 'Salut'; // {'Hello': 'Salut'}
  // ```
  // however, there are exceptions to this:
  // ```
  // var stryng = Stryng();
  // typeof stryng; // 'object'
  // stryng instanceof String; // false
  // Object.prototype.toString.call(stryng); // '[object Object]'
  // ```
  // a viable check is
  // ```
  // stryng instanceof Stryng; // true
  // ```
  // but only for as long as `stryng` was actually constructed using
  // that specific `Stryng` constructor and not some other foreign (i)frame's one.
  Stryng.prototype.valueOf =
  Stryng.prototype.toString = function() {
      return this._value; // we can rest assured that this is a primitive
  };
  
  // instance methods
  // ----------------
  // the herein defined methods will be available as both
  // static functions on the `Stryng` namespace and instance methods
  // of the `Stryng` class. they are declared as static but __documented as
  // instance methods__, which makes it a lot shorter, less verbose and
  // easier to highlight the fact that all instance methods are available
  // as static ones but __not vice versa__.
  
  /**
   * @lends Stryng.prototype
   */
  var stryng_members = {

    /**
     * removes all whitespace, line terminators and Zs from both ends of this' string.
     * shim for native [String#trim](http://www.ecma-international.org/ecma-262/5.1/#sec-15.5.4.20)
     * @return {String}
     */
    trim: function( input ) {
      return input != null ?
        String( input )
        .replace( re_trim_left, '' )
        .replace( re_trim_right, '' ) : exit();
    },

    /**
     * removes all whitespace, line terminators and Zs from the beginning of this' string.
     * shim for non-standard [String#trimLeft](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/TrimLeft)
     * @return {String}
     */
    trimLeft: function( input ) {
      return input != null ? String( input ).replace( re_trim_left, '' ) : exit();
    },

    /**
     * removes all whitespace, line terminators and Zs from the end of this' string.
     * shim for non-standard [String#trimRight](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/TrimRight)
     * @return {String}
     */
    trimRight: function( input ) {
      return input != null ? String( input ).replace( re_trim_right, '' ) : exit();
    },

    /**
     * returns whether or not this' string contains the substring `search` starting at `position`.
     * shim for native [String#contains](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/contains)
     * @param {String} [search="undefined"]
     * @param {Number} [position=0]
     * @return {Boolean}
     */
    contains: function( input, search, position ) {
      return input != null ? String( input ).indexOf( search, position ) !== -1 : exit();
    },

    /**
     * returns whether or not this' string at index `position` begins with substring `search`.
     * shim for native [String#startsWith](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-string.prototype.startswith)
     * @param {String|RegExp} [search="undefined"]
     * @param {Number} [position=0]
     * @return {Boolean}
     */
    startsWith: function( input, search, position ) {
      input = input != null ? String( input ) : exit();

      // - if `search` is a regular expression,
      //   return whether or not it matches the beginning of
      //   this' string starting at `position`.
      // - otherwise let `i` be the index returned by _String#indexOf_.
      //   let `position` and `search` be parsed correctly internally
      // - return `false` if not found i.e. `i === -1`
      // - let `input_len` be this' string's length
      // - parse the `position` argument by the following rules
      //   - default and min to zero
      //   - max to `input_len`
      //   - floor if positive parsable, zero if `NaN`
      // - return whether or not `i` equals the above's result
      if ( is.RegExp( search ) ) {
        return !input.substring( position ).search( search );
      }

      var i = input.indexOf( search, position ),
        input_len = input.length;

      return i !== -1 && i === (
        position === void 0 || position < 0 ? 0 :
        position > input_len ? input_len :
        Math_floor( position ) || 0
      );
    },

    /**
     * returns whether or not this' string truncated at `end_position` ends with substring `search`.
     * `search` may also be a regular expression but must be of the form `/...$/`.
     * shim for native [String#endsWith](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-string.prototype.endswith)
     * @param {String|RegExp} [search="undefined"]
     * @param {Number} [end_position=input.length]
     * @return {Boolean}
     * @throws if `search` is a regular expression but does not match its input's end.
     */
    endsWith: function( input, search, end_position ) {
      input = input != null ? String( input ) : exit();

      // - let `input_len` be this' string's length
      // - parse the `end_position` argument by the following rules
      //   - default and max to `input_len`
      //   - min to zero
      //   - floor if parsable, zero if `NaN`
      // - if `search` is a regular expression
      //   - throw an error if the regular expression does not match the
      //     end of its input i.e. does not end with `'$'`
      //   - truncate this' string at `end_position`
      //   - return whether or not `search` matches the above's result
      // - otherwise let `i` be the index returned by _String#lastIndexOf_.
      //   let `position` and `search` be parsed correctly internally
      // - return `false` if not found i.e. `i === -1`
      // - return whether or not `i` equals the above's result

      var input_len = input.length,
        i,
        end_position = (
          end_position === void 0 || end_position > input_len ? input_len :
          end_position < 0 ? 0 :
          Math_floor( end_position ) || 0
        );

      if ( is.RegExp( search ) ) {

        if ( !re_source_matches_end.test( search.source ) ) {
          exit( '"search" must match end i.e. end with "$"' );
        }

        return search.test( input.substring( 0, end_position ) );
      }

      search = String( search );

      if ( !search ) return true;

      i = input.lastIndexOf( search, end_position );

      return i !== -1 && ( i + search.length === end_position );
    },

    /**
     * concatenates this' string `n` times to the empty string.
     * shim for native [String#repeat](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-string.prototype.repeat).
     * reduction of concat operations inspired by [mout/string/repeat](https://github.com/mout/mout/blob/v0.9.0/src/string/repeat.js)
     * @param {Number} [n=0]
     * @return {String}
     * @throws if `n` is either negative or infinite.
     */
    repeat: function( input, n ) {
      n = +n;
      if ( input == null || n <= -1 || n == INFINITY ) exit();

      n = n < 0 ? 0 : Math_floor( n ) || 0;

      var result = '';

      while ( n ) {
        if ( n % 2 ) {
          result += input;
        }
        n = Math_floor( n / 2 );
        input += input;
      }
      return result;
    },

    /**
     * returns the substring of `input` with length `length` starting at
     * `position` which may also be negative to index backwards.
     * shim for native [String#substr](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-string.prototype.substr)
     * @param {Number} [position=0]
     * @param {Number} [length=length-position] this' string's length minus `position`
     * @return {String}
     */
    substr: function( input, position, length ) {
      input = input != null ? String( input ) : exit();

      // parse the `position` argument.
      // 
      // - if `Number.toInteger( position )` is negative, add `input.length`
      // - if it still is negative, set it to zero
      // - leave it up to `substr`'s implicit parsing any otherwise
      position = position <= -1 ? ( position = Number_toInteger( position ) + input.length ) < 0 ? 0 : position : position;

      return input.substr( position, length );
    },

    /**
     * prepends and appends `outfix` to `input` in one go.
     * to do the opposite use [Stryng.strip](#strip).
     * @param {String} [outfix="undefined"] prefix and suffix
     * @param {Number} [n=0] number of operations
     * @return {String}
     */
    wrap: function( input, outfix, n ) {
      if ( input == null ) exit();
      // implies parsing `outfix` and `n`
      outfix = Stryng.repeat( outfix, n );
      return outfix + input + outfix;
    },

    /**
     * returns the number of non-overlapping occurrences of `search` within `input`.
     * the empty string is considered a _character boundary_
     * thus `input.length + 1` will always be the result for that.
     * @param {String} [search="undefined"] the substring to search for
     * @return {Number}
     */
    count: function( input, search ) {
      input = input != null ? String( input ) : exit();

      search = String( search );

      // early exit for the empty search
      if ( !search ) return input.length + 1;

      var search_len = search.length,
        count = 0,
        i = -search_len; // prepare first run

      do i = input.indexOf( search, i + search_len );
      while ( i !== -1 && ++count )

      return count;
    },

    /**
     * delegates to native _Arrray#join_. returns the empty string if no arguments passed.
     * @param {...String} [joinees=[]]
     * @return {String}
     */
    join: function( delimiter /*, string... */ ) {
      var args = arguments; // promote compression

      if ( delimiter == null ) exit();
      if ( args.length === 1 ) return '';

      return array_slice.call( args, 1 ).join( delimiter );
    },

    /**
     * delegates to native _Array#reverse_.
     * this is a naive implementation of reversing a string.
     * for an alternative that knows how to properly reverse
     * diacritics and accented characters use [esrever](https://github.com/mathiasbynens/esrever).
     * @return {String}
     */
    reverse: function( input ) {
      return input != null ? String( input )
        .split( '' )
        .reverse()
        .join( '' ) : exit();
    },

    /**
     * splits this' string at `position` and rejoins the resulting parts using `insertion`.
     * `position` may also be negative to index backwards.
     * @param {Number} [position=0]
     * @param {String} [insertion="undefined"]
     * @return {String}
     */
    insert: function( input, position, insertion ) {
      input = input != null ? String( input ) : exit();

      // slice's native parsing will apply differenceerent
      // defaults for `undefined` to the first and second argument
      if ( position === void 0 ) position = Number_toInteger( position );

      // implies parsing `insertion`
      return input.slice( 0, position ) + insertion + input.slice( position );
    },

    /**
     * splits this' string at the given indices. negative indices are allowed.
     * if the resulting substrings overlap, the first one dominates, the latter is front-cut.
     * @param {...Number} index indices to split at. negatives allowed
     * @return {String[]}
     */
    splitAt: function( input /*, index... */ ) {
      input = input != null ? String( input ) : exit();

      // - for each index
      //   - if it is negative, add this' string's length
      //   - apply `pending_index` of the previous iteration ( initially zero ) as `index`'s minimum
      //   - let native _String#slice_ apply the maximum
      //   - push what's within input between `pending_index` and `index` to `result`
      //   - update `pending_index` for the next iteration
      // - push what's left to the result and return it.

      var input_len = input.length,
        args = arguments,
        args_len = args.length,
        i = 1, // skip `input`
        index = 0,
        pending_index = 0,
        result = [];

      for ( ; i < args_len; i++ ) {
        index = Number_toInteger( args[ i ] );
        if ( index < 0 ) {
          index += input_len;
        }
        if ( index <= pending_index ) {
          result.push( '' ); // faster than slicing the empty string first
          index = pending_index;
        } else {
          result.push( input.slice( pending_index, index ) );
          pending_index = index;
        }
      }
      result.push( input.substring( index ) );
      return result;
    },

    /**
     * splits this' string `n` times by the given `delimiter`. any captured groups
     * and the trailing part after the `n`th occurence of `delimiter` are included
     * in the returned array.
     * @param {String|RegExp} [delimiter="undefined"]
     * @param {Number} [n=Math.pow(2,32)-1]
     *   maximum number of split operations.
     *   default as per [ecma-262/5.1](http://www.ecma-international.org/ecma-262/5.1/#sec-15.5.4.14)
     * @return {String[]}
     */
    splitLeft: function( input, delimiter, n ) {
      input = input != null ? String( input ) : exit();

      // - parse `n` with `toUInt32`, default to `Math.pow(2, 32) - 1`
      // - return the empty array if `n` is zero
      // - let `result` be the array to return
      // - if `delimiter` is a regular expression
      //   - extract `n` matches using _String#match_ combined with
      //     subsequently front-cutting this' string.
      //   - push the substrings between the matches and any captured groups to `result`
      // - otherwise let `result` be the result of _String#split_
      //   called on this' string with `delimiter`
      // - if argument `n` is lesser than `result.length`
      //   - remove the last `result.length - n` items from `result`
      //   - rejoin them using `delimiter`
      //   - push them to `result` as one
      // - return `result`
      n = ( n === void 0 ? -1 : n ) >>> 0;

      if ( !n ) return [];

      var result = [],
        match,
        index,
        last_index = 0,
        difference;

      if ( is.RegExp( delimiter ) ) {
        while ( n-- && ( match = input.match( delimiter ) ) ) {
          index = match.index;
          result.push( input.substring( 0, index ) );
          last_index = index + match.shift().length; // mutates `match`
          if ( last_index <= index ) last_index = index + 1; // avoid endless loop
          if ( match.length ) array_push.apply( result, match ); // mutate instead of recreate as concat would
          input = input.substring( last_index );
        }
        result.push( input ); // push what's left
      } else {
        delimiter = String( delimiter );
        result = input.split( delimiter );
        difference = result.length - n;
        if ( difference > 0 ) {
          result.push( result.splice( n, difference ).join( delimiter ) ); // implies parsing delimiter
        }
      }

      return result;
    },

    /**
     * the right-associative version of [Stryng.splitLeft](#splitLeft).
     * splits this' string `n` times by the given `delimiter`. the preceding part
     * after the `n`th occurence of `delimiter` - counting backwards -
     * is included in the returned array. currently has no regex support
     * @param {String} [delimiter="undefined"]
     * @param {Number} [n=Math.pow(2,32)-1]
     *   maximum number of split operations.
     *   default as per [ecma-262/5.1](http://www.ecma-international.org/ecma-262/5.1/#sec-15.5.4.14)
     * @return {String[]}
     * @throws if `delimiter` is a regular expression
     */
    splitRight: function( input, delimiter, n ) {
      input = input != null ? String( input ) : exit();

      // - parse `n` with `toUInt32`, default to `Math.pow(2, 32) - 1`
      // - return the empty array if `n` is zero
      // - if `delimiter` is a regular expression
      //   - check its source if it matches a string's end by `$`
      //   - extract `n` matches using _String#match_ combined with
      //     subsequently truncating this' string.
      //   - unshift the substrings between the matches and any captured groups to `result`
      // - otherwise let `result` be the result of _String#split_
      //   called on this' string with `delimiter`
      // - if argument `n` is lesser than `result.length`
      //   - remove the first `n` items from `result`
      //   - rejoin them using `delimiter`
      //   - unshift them to `result` as one
      // - return `result`

      if ( is.RegExp( delimiter ) ) {
        exit('no regex support for splitRight');
      }

      n = ( n === void 0 ? -1 : n ) >>> 0;

      if ( !n ) return [];

      delimiter = String( delimiter );

      var result = input.split( delimiter ),
        difference = result.length - n;

      if ( difference > 0 ) {
        result.unshift( result.splice( 0, difference ).join( delimiter ) );
      }
      return result;
    },

    /**
     * splits this' string by line terminators as defined in the
     * [spec](http://www.ecma-international.org/ecma-262/5.1/#sec-7.3).
     * @return {String[]}
     */
    splitLines: function( input ) {
      return input != null ? String( input ).split( re_linebreaks ) : exit();
    },

    /**
     * substitues all non-overlapping occurrences of
     * `replacee` with `replacement`.
     * @param {String} [replacee="undefined"] string to replace
     * @param {String} [replacement="undefined"] replacement
     * @return {String}
     */
    exchange: function( input, replacee, replacement ) {
      input = input != null ? String( input ) : exit();
      replacee = String( replacee );
      replacement = String( replacement );

      // early exit for equality
      if ( replacee === replacement ) return input;

      // implies parsing
      return input.split( replacee ).join( replacement );
    },

    /**
     * substitues the first `n` non-overlapping occurrences of
     * `replacee` with `replacement`.
     * @param {String} [replacee="undefined"] string to replace
     * @param {String} [replacement="undefined"] replacement
     * @param {Number} [n=Math.pow(2, 32) - 1]
     *   number of replacement operations.
     * @return {String}
     */
    exchangeLeft: function( input, replacee, replacement, n ) {
      input = input != null ? String( input ) : exit();
      replacee = String( replacee );
      replacement = String( replacement );

      // early exit for equality
      if ( replacee === replacement ) return input;

      // implies parsing
      return Stryng.splitLeft( input, replacee, n ).join( replacement );
    },

    /**
     * substitues the last `n` non-overlapping occurrences of
     * `replacee` with `replacement`.
     * @param {String} [replacee="undefined"] string to replace
     * @param {String} [replacement="undefined"] replacement
     * @param {Number} [n=Math.pow(2, 32) - 1]
     *   number of replacement operations.
     * @return {String}
     */
    exchangeRight: function( input, replacee, replacement, n ) {
      input = input != null ? String( input ) : exit();
      replacee = String( replacee );
      replacement = String( replacement );

      // early exit for equality
      if ( replacee === replacement ) return input;

      // implies parsing
      return Stryng.splitRight( input, replacee, n ).join( replacement );
    },

    /**
     * both appends and prepends `fill` to this' string as often as needed
     * to reach but not exceed a length of `max_len`. passing a `max_len`
     * lesser than this' string's length has no effect. it is never truncated.
     * @param {Number} [max_len=0]
     * @param {String} [fill="undefined"]
     * @return {String}
     */
    just: function( input, max_len, fill ) {
      max_len = +max_len;
      if ( input == null || max_len <= -1 || max_len == INFINITY ) exit();

      input = String( input );
      fill = String( fill );
      max_len = max_len < 0 ? 0 : Math_floor( max_len ) || 0;

      var input_len = input.length,
        fill_len = fill.length * 2; // safe, `<< 1` isn't

      if ( max_len <= input_len || !fill ) return input;

      while ( input.length + fill_len <= max_len ) {
        input = fill + input + fill;
      }

      return input;
    },

    /**
     * prepends `fill` to this' string as often as needed
     * to reach but not exceed a length of `max_len`. passing a `max_len`
     * lesser than this' string's length has no effect. it is never truncated.
     * @param {Number} [max_len=0]
     * @param {String} [fill="undefined"]
     * @return {String}
     */
    justLeft: function( input, max_len, fill ) {
      max_len = +max_len;
      if ( input == null || max_len <= -1 || max_len == INFINITY ) exit();

      input = String( input );
      fill = String( fill );
      max_len = max_len < 0 ? 0 : Math_floor( max_len ) || 0;

      var input_len = input.length;

      // early exit for the empty fill
      if ( max_len <= input_len || !fill ) return input;

      var fill_len = fill.length;

      while ( input.length + fill_len <= max_len ) {
        input = fill + input;
      }

      return input;
    },

    /**
     * appends `fill` to this' string as often as needed
     * to reach but not exceed a length of `max_len`. passing a `max_len`
     * lesser than this' string's length has no effect. it is never truncated.
     * @param {Number} [max_len=0]
     * @param {String} [fill="undefined"]
     * @return {String}
     */
    justRight: function( input, max_len, fill ) {
      max_len = +max_len;
      if ( input == null || max_len <= -1 || max_len == INFINITY ) exit();

      input = String( input );
      fill = String( fill );
      max_len = max_len < 0 ? 0 : Math_floor( max_len ) || 0;

      var input_len = input.length,
        fill_len = fill.length;

      if ( max_len <= input_len || !fill ) return input;

      while ( input.length + fill_len <= max_len ) {
        input += fill;
      }

      return input;
    },

    /**
     * the combination of [Stryng.stripLeft](#stripLeft) and [Stryng.stripRight](#stripRight).
     * removes `outfix` `n` times from the both ends of this' string.
     * @param {String} [outfix="undefined"] string to remove
     * @param {Number} [n=1] number of removals
     * @return {String} -
     *
     */
    strip: function( input, outfix, n ) {
      return Stryng.stripRight( Stryng.stripLeft( input, outfix, n ), outfix, n );
    },

    /**
     * removes `prefix` `n` times from the beginning of this' string.
     * @param {String} [prefix="undefined"] string to remove
     * @param {Number} [n=Math.pow(2,32)-1] number of removals.
     * @return {String}
     */
    stripLeft: function( input, prefix, n ) {
      input = input != null ? String( input ) : exit();

      // - parse `n` with `toUInt32`, default to `Math.pow(2, 32) - 1`
      // - parse `prefix` to string
      // - early exit before processing senseless arguments
      // - set an index `pending_i` to zero
      // - increment it by `prefix.length` as long as fast native
      //   _String#indexOf_ return just the result of that addition
      //   and we are not running out of `n`.
      n = ( n === void 0 ? -1 : n ) >>> 0;
      prefix = String( prefix );

      if ( !n || !prefix ) return input;

      var prefix_len = prefix.length,
        pending_i = 0,
        i;

      do i = input.indexOf( prefix, pending_i );
      while ( n-- && i === pending_i && ( pending_i += prefix_len ) );

      return pending_i ? input.substring( pending_i ) : input;
    },

    /**
     * the right-associative version of [Stryng.stripLeft](#stripLeft).
     * removes `prefix` `n` times from the end of this' string.
     * @param {String} [suffix="undefined"] string to remove
     * @param {Number} [n=Math.pow(2,32)-1] number of removals.
     * @return {String}
     */
    stripRight: function( input, suffix, n ) {
      input = input != null ? String( input ) : exit();

      // - parse `n` with `toUInt32`, default to `Math.pow(2, 32) - 1`
      // - parse `suffix` to string
      // - early exit before processing senseless arguments
      // - set an index `p` to `input.length`
      // - decrement it by `suffix.length` as long as fast native
      //   _String#lastIndexOf_ return just the result of that subtraction
      //   and we are not running out of `n`.

      n = ( n === void 0 ? -1 : n ) >>> 0;
      suffix = String( suffix );

      if ( !n || !suffix ) return input;

      var suffix_len = suffix.length,
        pending_i = input.length,
        i;

      do {
        pending_i -= suffix_len;
        i = input.lastIndexOf( suffix, pending_i );
      }
      while ( n-- && i !== -1 && i === pending_i );

      return input.substring( 0, pending_i + suffix_len );
    },

    /**
     * slices this' string to exactly fit the given `max_len`
     * while including the `ellipsis` at its end ( enforced ).
     * @param {Number} [max_len=Math.pow(2,32)-1] length of the result.
     * @param {String} [ellipsis="..."]
     * @return {String}
     */
    truncate: function( input, max_len, ellipsis ) {
      input = input != null ? String( input ) : exit();

      // - parse `max_len` with `toUInt32`, default to `Math.pow(2, 32) - 1`
      // - if `max_len` is zero return the empty string
      // - if `max_len` is bigger than `input.length`
      //   there's to need to truncate, return this' string
      // - parse `ellipsis` to string, default to `'...'`
      // - if `ellipsis.length` is bigger than `max_len`,
      //   return the last `max_len` characters of `ellipsis`
      // - return the concatenation of this' string's first
      //   `max_len - ellipsis_len` characters and `ellipsis`

      max_len = ( max_len === void 0 ? -1 : max_len ) >>> 0;

      if ( !max_len ) return '';
      if ( max_len >= input.length ) return input;

      ellipsis = ellipsis !== void 0 ? String( ellipsis ) : '...';

      var ellipsis_len = ellipsis.length;

      if ( ellipsis_len >= max_len ) return ellipsis.slice( -max_len );

      return input.substring( 0, max_len - ellipsis_len ) + ellipsis;
    },

    /**
     * backslash-escapes all occurences of double quote, backslash,
     * backspace, tab, newline, form feed and carriage return,
     * hex-encodes any non-ASCII-printable character and wraps the result
     * in ( unescaped ) double quotes. this can be interpreted as a
     * shallow version of the native _JSON#stringify_. shim for non-standard
     * [String#quote](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/quote).
     * @return {String}
     */
    quote: function( input ) {
      input = input != null ? String( input ) : exit();

      // - delegate to native _JSON.stringify_ if available
      // - otherwise iterate over this' string's characters
      //   - preserve ASCII printables
      //   - use short escape characters
      //   - use hexadecimal notation as a last resort, whichever is shortest
      // - wrap `result` in double quotes and return it

      if ( JSON_stringify ) {
        return JSON_stringify( input );
      }

      var i = 0,
        result = '',
        input_len = input.length,
        char_code;

      for ( ; i < input_len; i++ ) {
        char_code = input.charCodeAt( i );

        result += (
          char_code === 34 ? '\\"' : // double quote
          char_code === 92 ? '\\\\' : // backslash
          31 < char_code && char_code < 127 ? String_fromCharCode( char_code ) : // ASCII printables
          char_code === 8 ? '\\b' : // backspace
          char_code === 9 ? '\\t' : // tab
          char_code === 10 ? '\\n' : // new line
          char_code === 12 ? '\\f' : // form feed
          char_code === 13 ? '\\r' : // carriage return
          (
            char_code < 256 ? '\\x' + ( char_code < 16 ? '0' : '' ) : '\\u' + ( char_code < 4096 ? '0' : '' )
          ) + char_code.toString( 16 )
        );
      }

      return '"' + result + '"';
    },

    /**
     * mirrors the effect of [Stryng#quote](#quote) without using `eval`.
     * unescapes all occurences of backslash-escaped
     * characters ( `"\\t\r\n\f\b` ), decodes all hex-encoded
     * characters and removes surrounding double quotes once.
     * @return {String}
     */
    unquote: function( input ) {
      return input != null ?
        Stryng.strip( String( input )

        .replace( /\\[xu]([0-9A-F]{2})([0-9A-F]{2})?/gi, function( _, x, u ) {
          return String_fromCharCode( parseInt( x + ( u || '' ), 16 ) );
        })
        .replace( /\\([btnfr"\\])/g, function( _, esc ) {
          return (
            esc === 'b' ? '\b' : // backspace
            esc === 't' ? '\t' : // tab
            esc === 'n' ? '\n' : // new line
            esc === 'f' ? '\f' : // form feed
            esc === 'r' ? '\r' : // carriage return
            esc // backslash, double quote and any other
          )
        }), '"', 1) : exit();
    },

    /**
     * appends the given `appendix` to this' string.
     * @param {String} [appendix="undefined"]
     * @return {String}
     */
    append: function( input, appendix ){
      return input != null ? String( input ) + appendix : exit();
    },

    /**
     * prepends the given `intro` to this' string.
     * @param {String} [intro="undefined"]
     * @return {String}
     */
    prepend: function( input, intro ) {
      return input != null ? intro + String( input ) : exit();
    },

    /**
     * returns whether or not this' string strictly equals the
     * string representation of `comparable`
     * @param {String} [comparable="undefined"] string to compare to
     * @return {Boolean}
     */
    equals: function( input, comparable ) {
      return input != null ? String( input ) === String( comparable ) : exit();
    },

    /**
     * lower-cases both this' string and `comparable` prior to
     * returning whether or not their are strictly equal.
     * @param {String} [comparable="undefined"] string to compare to
     * @return {Boolean}
     */
    iequals: function( input, comparable ) {
      return input != null ? String( input ).toLowerCase() === String( comparable ).toLowerCase() : exit();
    },

    /**
     * returns whether or not this' string has length `0`
     * @return {Boolean}
     */
    isEmpty: function( input ) {
      return input != null ? !String( input ) : exit();
    },

    /**
     * returns whether or not this' string is empty or consists of
     * whitespace, line terminators and/or Zs only.
     * @return {Boolean}
     */
    isBlank: function( input ) {
      return input != null ? !String( input ) || !re_no_whitespace.test( input ) : exit();
    },

    /**
     * delegates to [Stryng#trim](#trim) and replaces groups of
     * whitespace, line terminators and/or Zs by a single space character.
     * @return {String}
     */
    clean: function( input ) {
      return Stryng.trim( input ).replace( re_whitespaces, ' ' );
    },

    /**
     * upper-cases this' string's first character.
     * @return {String}
     */
    capitalize: function( input ) {
      input = input != null ? String( input ) : exit();
      return !input ? input : input.charAt().toUpperCase() + input.substring( 1 );
    },

    /**
     * transforms this' string into camel-case by
     * 
     * - removing all occurences of space, underscore and hyphen
     * - upper-casing the first letter directly following those.
     * 
     * inspired by [emberjs](http://emberjs.com/api/classes/Ember.String.html#method_camelize)
     * note that this leaves the very first letter untouched.
     * for a _classified_ output compose this method with [Stryng#capitalize](#capitalize).
     * @return {String}
     */
    camelize: function( input ) {
      return input != null ?
        String( input )
        .replace( /[ _-]([a-z]?)/g, function( _, character ) {
          return character ? character.toUpperCase() : '';
        } ) : exit();
    },

    /**
     * transforms this' string into an underscored form by
     *
     * - inserting `_` where upper-cased letters follow lower-cased ones
     * - replacing space and hyphen by `_`
     * - lower-casing the final output
     * 
     * inspired by [emberjs](http://emberjs.com/api/classes/Ember.String.html#method_underscore)
     * @return {String}
     */
    underscore: function( input ) {
      return input != null ?
        String( input )
        .replace( /([a-z])([A-Z])/g, '$1_$2' )
        .replace( /[ -]/g, '_' )
        .toLowerCase() : exit();
    },

    /**
     * transforms this' string into an underscored form by
     * 
     * - inserting `-` where upper-cased letters follow lower-cased ones
     * - replacing space and underscore by `-`
     * - lower casing the final output.
     *
     * note that this method has nothing to do with _hyphenation_ which would
     * be too serious an algorithm to fit into this library.
     * inspired by [emberjs](http://emberjs.com/api/classes/Ember.String.html#method_dasherize)
     * @return {String}
     */
    hyphenize: function( input ) {
      return input != null ?
        String( input )
        .replace( /([a-z])([A-Z])/g, '$1-$2' )
        .replace( /[ _]/g, '-' )
        .toLowerCase() : exit();
    },

    /**
     * replaces ligatures and diacritics from the Latin-1 Supplement
     * with their nearest ASCII equivalent, replaces symbols otherwise being percent-escaped.
     * compose this method with [Stryng#hyphenize](#hyphenize) to produce URL slugs
     * @return {String} [description]
     */
    simplify: function( input ) {
      input = input != null ? String( input ) : exit();
      object_forOwn.call( latin_1_supplement, function( re, nearest_char ) {
        input = input.replace( re, nearest_char );
      } );
      return input;
    },

    /**
     * maps every character of this' string to its ordinal representation.
     * @return {Number[]}
     */
    ord: function( input ) {
      input = input != null ? String( input ) : exit();

      var
      i = input.length,
        result = Array( i );

      while ( i-- ) result[ i ] = input.charCodeAt( i );

      return result;
    }
  };

  // static functions
  // ----------------

  /**
   * returns whether or not `any` is an instance of _Stryng_.
   * beware of _Stryng_ classes hosted by other HTML frames inside
   * browser windows. this method won't recognize _Stryng_s
   * created with foreign _Stryng_ constructors.
   * @function Stryng.isStryng
   * @param {*} any
   * @return {Boolean}
   */
  Stryng.isStryng = function(any){
    return (any instanceof Stryng);
  };

  /**
   * generates a string of `n` random characters in char-code range [`from`, `to`[.
   * this range defaults to the ASCII printables. to choose randomly from the whole
   * UTF-16 table call `Stryng.random(n, 0, 1>>16)`.
   * @function Stryng.random
   * @param {Number} [n=0]
   * @param {Number} [from=32] inclusively
   * @param {Number} [to=127] exclusively assuming _Math.random_ never yields `1`
   * @return {String}
   * @throws if `to` exceeds `Math.pow( 2, 16 )`
   */
  Stryng.random = function( n, from, to ) {
    n = +n;
    if ( n <= -1 || n == INFINITY ) exit();

    n = n < 0 ? 0 : Math_floor( n ) || 0;
    from = from === void 0 ? 32 : ( from >>> 0 );
    to = to === void 0 ? 127 : ( to >>> 0 );

    if ( to > MAX_CHARCODE ) exit();

    var result = '',
      difference = to - from;

    if ( difference > 0 ) {
      while ( n-- ) {
        result += String_fromCharCode( from + Math_floor( Math_random() * difference ) );
      }
    }

    return result;
  };

  /**
   * delegates to native _String#fromCharCode_.
   * returns the concatenated string representations of the given
   * `charCode`s from the UTF-16 table. return the empty string if no arguments passed.
   * @Stryng.chr
   * @param {...Number} charCode
   * @return {String}
   * @throws if one of the `charCode`s exceeds `Math.pow( 2, 16 ) - 1`
   */
  Stryng.chr = function( /* char_codes,... */) {
    var char_codes = arguments,
      i = char_codes.length;
    while ( i-- ){
      if ( char_codes[ i ] > MAX_CHARCODE ){
        exit();
      }
    }
    return String_fromCharCode.apply( null, char_codes );
  };

  Stryng.fromCharCode = String_fromCharCode;
  Stryng.fromCodePoint = String.fromCodePoint;

  // building Stryng
  // ===============

  // custom methods
  // --------------
  // - provide a closure for each wrapper function
  // - populate the custom static function `fn` onto the _Stryng_ namespace
  // - populate the function onto Stryng's prototype wrapped in another which..
  // - unshifts the _Stryng_ instance's wrapped `_value`
  //   to become the first argument among the proxied ones to the static function
  // - decides upon the type of `result` and whether this `_is_mutable` what to return.
  //   - if `result` isn't a string at all, simply return it
  //   - if the instance `_is_mutable`, assign `result` to `_value` and return `this`
  //   - if not, return a new instance of _Stryng_ constructed from `result`

  object_forOwn.call( stryng_members, function( fn, fn_name ) {

    Stryng[ fn_name ] = fn;

    Stryng.prototype[ fn_name ] = function( /* proxied arguments */) {

      var that = this,
        args = arguments,
        result;

      array_unshift.call( args, that._value );
      result = fn.apply( null, args );

      if ( typeof result === 'string' ) {
        if ( that._is_mutable ) {
          that._value = result;
          if ( !Object_defineProperty ) {
            that.length = result.length;
          }
          return that;
        } else {
          return new Stryng( result );
        }
      }
      return result;
    };
  } );

  // native methods
  // --------------
  // - provide a closure for each wrapper function
  // - skip functions that need stay shimmed
  // - populate the native static function `String[ fn_name ]` onto the
  //   _Stryng_ namespace if present, otherwise construct one from the equivalent
  //   instance method `fn` as learned from [javascript garden][1]
  // - populate the function onto Stryng's prototype wrapped in another which..
  // - ..calls the native instance method on Stryng instance's wrapped `_value`
  // - ..proxies the given `arguments`
  // - ..decides upon the type of `result` and whether or not this `_is_mutable` what to return.
  //   - if `result` isn't a string at all, simply return it
  //   - if the instance `_is_mutable`, set result as the new `_value` and return `this`
  //   - if not, return a new instance of _Stryng_ wrapping `result`
  // 
  // [1]: http://bonsaiden.github.io/JavaScript-Garden/#function.arguments
  array_forEach.call( methods, function( fn_name ) {

    var fn = string[ fn_name ];

    if ( is.Function( fn ) && !array_contains.call( shim_methods, fn_name )) {

      Stryng[ fn_name ] = adopt_native_statics && String[fn_name] || function( input /*, proxied argments */ ) {
        if ( input == null ) exit();
        return function_call.apply( fn, arguments );
      }

      Stryng.prototype[ fn_name ] = function(/* proxied arguments */) {

        var that = this, // promote compression
          result = fn.apply( that._value, arguments );

        if ( typeof result === 'string' ) {
          if ( that._is_mutable ) {
            that._value = result;
            if ( !Object_defineProperty ) {
              that.length = result.length;
            }
            return that;
          } else {
            return new Stryng( result );
          }
        }
        return result;
      };
    }
  } );

  // export
  // ------

  if ( 'undefined' !== typeof module && module.exports ) {
    // nodejs support
    module.exports = Stryng;
  } else if ( 'function' === typeof define && define.amd ) {
    // amd support
    define( function() {
      return Stryng
    } );
  } else {
    // browser support
    root.Stryng = Stryng;

    /**
     * restores the previous value assigned to `window.Stryng`
     * and returns the inner reference _Stryng_ holds to itself.
     * @function Stryng.noConflict
     * @return {Stryng}
     */
    var previous_Stryng = root.Stryng;
    Stryng.noConflict = function() {
      root.Stryng = previous_Stryng;
      return Stryng;
    }
  }

}( this ) );

// <script>document.write('<script src="http://' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1"></' + 'script>')</script>
},{}],6:[function(require,module,exports){
Stryng = require( './../src/stryng.js' );
expect = require( 'expect.js' );

///////////////////////////////////////////
// patch missing withArgs in npm version //
///////////////////////////////////////////

// expect.Assertion.prototype.withArgs = function() {
//   expect(this.obj).to.be.a('function');
//   var fn = this.obj;
//   var args = Array.prototype.slice.call(arguments);
//   return expect(function() { fn.apply(null, args); });
// }

describe( 'Stryng()', function() {

  if ( "undefined" != typeof window ) {

    beforeEach( function( done ) {

      setTimeout( function() {
        done()
      }, 15 );
    } );
  }

  describe( '.constructor()', function() {

    it( 'should work without the new operator', function() {
      expect( Stryng( '' ) ).to.be.a( Stryng );
    } );

    it( 'should return the wrapped empty string if passed null', function() {
      expect( Stryng( null ).toString() ).to.equal( '' );
    } );

    it( 'should return the wrapped empty string if passed no arguments or undefined', function() {
      expect( Stryng().toString() ).to.equal( '' );
      expect( Stryng( void 0 ).toString() ).to.equal( '' );
    } );

    it( 'should return the wrapped empty string if passed the empty array', function() {
      expect( Stryng( [] ).toString() ).to.equal( '' );
    } );
  } );

  describe('.length', function(){

  	it('should reflect `input.length`', function () {
  		var primitive = 'test',
  			length = primitive.length;

  		expect( Stryng( primitive ) ).to.have.length(length);
  	});

  	it('should not be writable if `Object.defineProperty` is available for Objects', function () {
  		var primitive = 'test',
  			length = primitive.length,
        nice_try_length = 0,
  			stryng = Stryng(primitive),
        Object_defineProperty = ( function( defineProperty ) {
          try {
            defineProperty( {}, 'name', {} );
            return defineProperty;
          } catch ( e ) {}
        } )( Object.defineProperty )

  		if(Object_defineProperty)
  		{
  			stryng.length = nice_try_length;
  			expect( stryng ).to.not.have.length(nice_try_length).and.have.length(length);
  		}
  	});
  });

  describe( 'mutability', function() {

    it( 'should not be mutable by default', function() {
      var stryng = Stryng( 'foo' /*, false */ );
      expect( stryng.append( 'bar' ).stripRight( 'bar' ) ).to.not.equal( stryng );
    } );

    it( 'should be mutable if told so', function() {
      var stryng = Stryng( 'foo', true );
      expect( stryng.append( 'bar' ) ).to.equal( stryng );
    } );
  } );

  describe('seemlessness', function(){

    it('should be plus-able', function () {
      expect( Stryng('foo') + 'bar' ).to.equal('foobar');
    });

    it('should be parsable to number', function () {
      expect( Number( Stryng( '123' ) ) ).to.equal( 123 );
    });
  });

  describe( '.trim()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.trim ).to.throwError();
    } );

    it( 'should return the empty string', function() {
      expect( Stryng.trim( '' ) ).to.equal( '' );
    } );

    it( 'should return the any string unchanged if neither prefixed nor suffixed by whitespace', function() {
      expect( Stryng.trim( 'foo' ) ).to.equal( 'foo' );
    } );

    it( 'should trim leading and trailing whitespace', function() {

      var ws = '\u0009\u000A\u000B\u000C' + '\u00A0\u000D\u0020\u1680' + '\u180E\u2000\u2001\u2002' + '\u2003\u2004\u2005\u2006' + '\u2007\u2008\u2009\u200A' + '\u2028\u2029\u202F\u205F' + '\u3000\uFEFF',
        msg = 'Hello World',
        padded = ws + msg + ws;

      expect( Stryng.trim( padded ) ).to.equal( msg );
    } );
  } );

  describe( '.trimLeft()', function() {

    it( 'should trim leading whitespace only', function() {

      var ws = '\u0009\u000A\u000B\u000C' + '\u00A0\u000D\u0020\u1680' + '\u180E\u2000\u2001\u2002' + '\u2003\u2004\u2005\u2006' + '\u2007\u2008\u2009\u200A' + '\u2028\u2029\u202F\u205F' + '\u3000\uFEFF',
        msg = 'Hello World',
        leftPadded = ws + msg;

      expect( Stryng.trimLeft( leftPadded ) ).to.equal( msg );
    } );
  } );

  describe( '.trimRight()', function() {

    it( 'should trim trailing whitespace only', function() {

      var ws = '\u0009\u000A\u000B\u000C' + '\u00A0\u000D\u0020\u1680' + '\u180E\u2000\u2001\u2002' + '\u2003\u2004\u2005\u2006' + '\u2007\u2008\u2009\u200A' + '\u2028\u2029\u202F\u205F' + '\u3000\uFEFF',
        msg = 'Hello World',
        rightPadded = msg + ws;

      expect( Stryng.trimRight( rightPadded ) ).to.equal( msg );
    } );
  } );

  describe( '.contains()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.contains ).to.throwError();
    } );

    it( 'should return true on "undefined" with no arguments passed', function() {
      expect( Stryng.contains( 'undefined' /*, (undefined).toString() */ ) ).to.be.ok();
    } );

    it( 'should find the empty string in any string', function() {
      expect( Stryng.contains( 'any', '' ) ).to.be.ok();
    } );

    it( 'should return true if search equals `input`', function() {
      expect( Stryng.contains( 'foo', 'foo' ) ).to.be.ok();
    } );

    it( 'should return true if `input` contains substring', function() {
      expect( Stryng.contains( 'the quick brown fox', 'quick' ) ).to.be.ok();
    } );

    it( 'should return false if substring not found', function() {
      expect( Stryng.contains( 'foo', 'bar' ) ).not.to.be.ok();
    } );
  } );

  describe( '.startsWith()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.startsWith ).to.throwError();
    } );

    it( 'should apply "undefined" as default `search` and zero as default position', function() {
      expect( Stryng( 'undefined...' ).startsWith( /* (undefined).toString(), toInteger(undefined) */) ).to.be.ok();
    } );

    it( 'should apply `input.length` as the maximum position (hence only the empty string as `search` results to true', function() {
      expect( Stryng.startsWith( 'foo bar', '', 'foo bar'.length + 1 ) ).to.be.ok();
      expect( Stryng.startsWith( 'foo bar', 'bar', 'foo bar'.length + 1 ) ).to.not.be.ok();
    } );

    it( 'should apply zero as the minimum position', function() {
      expect( Stryng.startsWith( 'foo bar', 'foo', -1 ) ).to.be.ok();
    } );

    it( 'should return false if `search` is longer than `input`', function() {
      expect( Stryng.startsWith( 'foo', 'fooo' ) ).to.not.be.ok();
    } );

    it( 'should return false if `input` doesn\'t start with substring', function() {
      expect( Stryng.startsWith( 'foo bar', 'bar' ) ).to.not.be.ok();
    } );

    it( 'should return true if `search` found at the exact position and fits found with given offset within `input`', function() {
      expect( Stryng.startsWith( 'foo bar', 'bar', 4 ) ).to.be.ok();
    } );

    it( 'should work for regexes, too', function() {
      expect( Stryng.startsWith( 'foo bar', /^foo bar$/ ) ).to.be.ok();
    } );
  } );

  describe( '.endsWith()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.endsWith ).to.throwError();
    } );

    it( 'should apply "undefined" as default `search` and `input.length` as default `end_position`', function() {
      expect( Stryng( '...undefined' ).endsWith( /* (undefined).toString(), `input.length` */) ).to.be.ok();
    } );

    it( 'should apply `input.length` as the maximum `end_position`', function() {
      expect( Stryng.endsWith( 'foo bar', 'bar', 'foo bar'.length + 1 ) ).to.be.ok();
    } );

    it( 'should apply zero as the minimum `end_position` (hence only the empty string as `search` result to true)', function() {
      expect( Stryng.endsWith( 'foo bar', '', -1 ) ).to.be.ok();
    } );

    it( 'should return false if `search` is longer than `input`', function() {
      expect( Stryng.endsWith( 'foo', 'ofoo' ) ).to.not.be.ok();
    } );

    it( 'should return false if `input` doesn\'t end with `search`', function() {
      expect( Stryng.endsWith( 'foo bar', 'foo' ) ).to.not.be.ok();
    } );

    it( 'should return false if `input` ends with `search` but at a different position', function() {
      expect( Stryng.endsWith( 'foo bar', 'bar', 6 ) ).to.not.be.ok();
    } );

    it( 'should return true if `search` fits and ends at the given position', function() {
      expect( Stryng.endsWith( 'foo bar', 'foo', 3 ) ).to.be.ok();
    } );

    it( 'should throw an error if passed a regex not matching the end', function() {
      expect( Stryng.endsWith ).withArgs( 'foo', /bar/ ).to.throwError();
    } );

    it( 'should work for regexes, too', function() {
      expect( Stryng.endsWith( 'foo bar', /foo$/, 3 ) ).to.be.ok();
    } );
  } );

  describe( '.repeat()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.repeat ).to.throwError();
    } );

    it( 'should fail if n is negative', function() {
      expect( Stryng.repeat ).withArgs( '', -1 ).to.throwError();
    } );

    it( 'should fail if n is not finite', function() {
      expect( Stryng.repeat ).withArgs( '', Infinity ).to.throwError();
      expect( Stryng.repeat ).withArgs( '', '-Infinity' ).to.throwError();
    } );

    it( 'should return the empty string if n is zero', function() {
      expect( Stryng.repeat( 'foo', 0 ) ).to.equal( '' );
    } );

    it( 'should repeat the `input` n times', function() {
      expect( Stryng.repeat( 'foo', 3 ) ).to.equal( 'foofoofoo' );
    } );
  } );

  describe( '.substr()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.substr ).to.throwError();
    } );

    it( 'should accept negative indices', function() {
      expect( Stryng.substr( 'foo', -1 ) ).to.equal( 'o' );
    } );

    it( 'should apply zero if abs(index) exceeds `input.length`', function() {
      expect( Stryng.substr( 'foo', -4 ) ).to.equal( 'foo' );
    } );

    it( 'should ceil negative floating point indices', function() {
      expect( Stryng.substr( 'foo', '-0.5', 2 ) ).to.equal( 'fo' );
    } );

    it( 'should return the empty string if length is zero', function() {
      expect( Stryng.substr( 'foo', 'NaN', 0 ) ).to.equal( '' );
    } );
  } );

  describe( '.wrap()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.wrap ).to.throwError();
    } );

    it( 'should fail if n is negative or not finite', function() {
      expect( Stryng.wrap ).withArgs( 'foo', 'outfix', Infinity ).to.throwError();
      expect( Stryng.wrap ).withArgs( 'foo', 'outfix', -1 ).to.throwError();
    } );

    it( 'should apply zero as the default thus return the `input`', function() {
      expect( Stryng.wrap( 'foo', 'outfix' ) ).to.equal( 'foo' );
    } );

    it( 'should wrap three times', function() {
      expect( Stryng.wrap( 'foo', 'x', 3 ) ).to.equal( 'xxxfooxxx' );
    } );
  } );

  describe( '.count()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.count ).to.throwError();
    } );

    it( 'should search for "undefined" by default', function() {
      expect( Stryng( 'undefined' ).count( /* (undefined).toString() */) ).to.equal( 1 );
    } );

    it( 'should return length + 1 when counting the empty string', function() {
      expect( Stryng.count( 'foo', '' ) ).to.equal( 4 );
    } );

    it( 'should return the number of non-overlapping occurences', function() {
      expect( Stryng.count( 'foo foo bar', 'foo' ) ).to.equal( 2 );
    } );
  } );

  describe( '.join()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.join ).to.throwError();
    } );

    it( 'should return the empty string if no arguments passed to join', function() {
      expect( Stryng.join( ',' ) ).to.equal( '' );
    } );

    it( 'should allow an empty delimiter string', function() {
      expect( Stryng.join( '', 1, 2, 3 ) ).to.equal( '123' );
    } );
  } )

  describe( '.reverse()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.reverse ).to.throwError();
    } );

    it( 'should return the empty string unchanged', function() {
      expect( Stryng.reverse( '' ) ).to.equal( '' );
    } );

    it( 'should rerturn a single character unchanged', function() {
      expect( Stryng.reverse( 'a' ) ).to.equal( 'a' );
    } );

    it( 'should reverse a string', function() {
      expect( Stryng.reverse( 'abc' ) ).to.equal( 'cba' );
    } );
  } );

  describe( '.insert()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.insert ).to.throwError();
    } );

    it( 'should prepend "undefined" if neither index nor insertion provided', function() {
      expect( Stryng.insert( 'foo' ) ).to.equal( 'undefinedfoo' );
    } );

    it( 'should append if the index exceed `input.length`', function() {
      expect( Stryng.insert( 'foo', Infinity, 'bar' ) ).to.equal( 'foobar' );
    } );

    it( 'should prepend if the index is negative but its absolute value exceeds `input.length`', function() {
      expect( Stryng.insert( 'foo', -Infinity, 'bar' ) ).to.equal( 'barfoo' );
    } );

    it( 'should insert at the given position counting from the beginning', function() {
      expect( Stryng.insert( 'the fox', 4, 'quick ' ) ).to.equal( 'the quick fox' );
    } );

    it( 'should insert at the given position counting from the end', function() {
      expect( Stryng.insert( 'the fox', -3, 'quick ' ) ).to.equal( 'the quick fox' );
    } );
  } );

  describe( '.splitAt()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.splitAt ).to.throwError();
    } );

    it( 'should split at the given indices', function() {
      expect( Stryng.splitAt( 'gosplitthis', 2, 7 ) ).to.eql( [ 'go', 'split', 'this' ] );
    } );

    it( 'should split at the given negative / backwards indices', function() {
      expect( Stryng.splitAt( 'gosplitthis', -9, -4 ) ).to.eql( [ 'go', 'split', 'this' ] );
    } );

    it( 'should split at 0 and `input.length` - edge case', function() {
      expect( Stryng.splitAt( 'foo', 0, 3 ) ).to.eql( [ '', 'foo', '' ] );
    } );

    it( 'should apply `input.length` as max', function() {
      expect( Stryng.splitAt( 'foo', Infinity ) ).to.eql( [ 'foo', '' ] );
    } );

    it( 'should apply the previous as the min index if substrings overlap', function() {
      expect( Stryng.splitAt( 'foo bar baz', 3, 1, 7 ) ).to.eql( [ 'foo', '', ' bar', ' baz' ] );
    } );
  } );

  describe( '.splitLeft()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.splitLeft ).to.throwError();
    } );

    it( 'should toUint32 negative values', function() {
      expect( Stryng.splitLeft( 'foo', '', -1 ) ).to.eql( [ 'f', 'o', 'o' ] );
    } );

    it( 'should return an empty array if `n` is zero', function() {
      expect( Stryng.splitLeft( 'foo', '', 0 ) ).to.eql( [] );
    } );

    it( 'should treat Infinity equal to zero as `n` - because of toUInt32', function() {
      expect( Stryng.splitLeft( 'foo', '', Infinity ) ).to.eql( [] );
    } );

    it( 'should return an empty array if splitting the empty string by itself', function() {
      expect( Stryng.splitLeft( '', '' ) ).to.eql( [] );
    } );

    it( 'should return an array of two empty strings if splitting by the `input`', function() {
      expect( Stryng.splitLeft( 'foo', 'foo' ) ).to.eql( [ '', '' ] );
    } );

    it( 'should split by all occurences of the delimiter if no `n` passed', function() {
      expect( Stryng.splitLeft( 'sequence', '' ) ).to.eql( [ 's', 'e', 'q', 'u', 'e', 'n', 'c', 'e' ] );
    } );

    it( 'should split `n` times but yet include the rest', function() {
      expect( Stryng.splitLeft( 'sequence', '', 4 ) ).to.eql( [ 's', 'e', 'q', 'u', 'ence' ] );
    } );

    it( 'should work for [grouping] regular expressions - even without the `global` flag', function() {
      expect(
        Stryng.splitLeft( 'head reacting reactors tail', /re(\w+)/i )
      ).to.eql(
        [ 'head ', 'acting', ' ', 'actors', ' tail' ]
      );
    } );
  } );

  describe( '.splitRight()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.splitRight ).to.throwError();
    } );

    it( 'should split `n` times but yet include the rest', function() {
      expect( Stryng.splitRight( 'charactersequence', '', 4 ) ).to.eql( [ 'charactersequ', 'e', 'n', 'c', 'e' ] );
    } );

    it( 'should throw an error if passed a regular expressions', function() {
      expect( Stryng.splitRight ).withArgs( 'dont care', /re/ ).to.throwError();
    } );

    // refer to Stryng.splitLeft for further tests

  } );

  describe( '.splitLines()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.splitLines ).to.throwError();
    } );

    it( 'should split by line terminators', function() {
      expect(
        Stryng.splitLines( 'carriage\r\nreturn\nnewline\u2028separate line\u2029paragraph' )
      ).to.eql(
        [ 'carriage', 'return', 'newline', 'separate line', 'paragraph' ]
      );
    } );
  } );

  describe( '.exchange()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.exchange ).to.throwError();
    } );

    it( 'should leave the `input` as is if replacee and replacement equal', function() {
      expect( Stryng.exchange( 'foo', 'o', 'o' ) ).to.equal( 'foo' );
    } );

    it( 'should replace all occurences of replacee by replacement', function() {
      expect( Stryng.exchange( 'foo', 'o', 'a' ) ).to.equal( 'faa' );
    } );

    it( 'should comma separate the `input` if passed the empty string as replacee and comma as replacement', function() {
      expect( Stryng.exchange( 'sequence', '', ',' ) ).to.equal( 's,e,q,u,e,n,c,e' );
    } );
  } );

  describe( '.exchangeLeft()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.exchangeLeft ).to.throwError();
    } );

    it( 'should replace n left-hand occurences of replacee', function() {
      expect( Stryng.exchangeLeft( 'sequence', '', ',', 3 ) ).to.equal( 's,e,q,uence' );
    } );

    // refer to Stryng.splitLeft for further tests
  } );

  describe( '.exchangeRight()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.exchangeRight ).to.throwError();
    } );

    it( 'should replace n right-hand occurences of replacee', function() {
      expect( Stryng.exchangeRight( 'sequence', '', ',', 3 ) ).to.equal( 'seque,n,c,e' );
    } );

    // refer to Stryng.splitRight for further tests
  } );

  describe( '.just()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.just ).to.throwError();
    } );

    it( 'should append and prepend to the `input` until its length equals `max_len`', function() {
      expect( Stryng.just( 'private', 'private'.length + 4, '_' ) ).to.equal( '__private__' )
    } );
  } );

  describe( '.justLeft()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.justLeft ).to.throwError();
    } );

    it( 'should fail if `max_len` is negative', function() {
      expect( Stryng.justLeft ).withArgs( 'foo', -1, 'o' ).to.throwError();
    } );

    it( 'should fail if `max_len` is not finite', function() {
      expect( Stryng.justLeft ).withArgs( 'foo', Infinity, 'o' ).to.throwError();
      expect( Stryng.justLeft ).withArgs( 'foo', '-Infinity', 'o' ).to.throwError();
    } );

    it( 'should return the `input` if its length is greater than or equals `max_len`', function() {
      expect( Stryng.justLeft( 'foo', 2, 'o' ) ).to.equal( 'foo' );
      expect( Stryng.justLeft( 'foo', 3, 'o' ) ).to.equal( 'foo' );
    } );

    it( 'should prepend the `fill` to the `input` until its length equals `max_len`', function() {
      expect( Stryng.justLeft( 'foo', 5, 'o' ) ).to.equal( 'oofoo' );
    } );

    it( 'should prepend the `fill` to the `input` until the next iteration would exceed `max_len`', function() {
      expect( Stryng.justLeft( 'dong', 20, 'ding ' ) ).to.equal( 'ding ding ding dong' ); // length 19
    } );
  } );

  describe( '.justRight()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.justRight ).to.throwError();
    } );

    it( 'should append the `fill` to the `input` until its length equals `max_len`', function() {
      expect( Stryng.justRight( 'foo', 5, 'o' ) ).to.equal( 'foooo' );
    } );

    it( 'should append the `fill` to the `input` until the next iteration would exceed `max_len`', function() {
      expect( Stryng.justRight( 'ding', 20, ' dong' ) ).to.equal( 'ding dong dong dong' ); // length 19
    } );

    // refer to Stryng.justLeft for further tests
  } );

  describe( '.strip()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.strip ).to.throwError();
    } );

    it( 'should strip from the beginning and the end', function() {
      expect( Stryng.strip( 'maoam', 'm' ) ).to.equal( 'aoa' );
    } );

    it( 'should strip multiple times', function() {
      expect( Stryng.strip( '"""docstring"""', '"' ) ).to.equal( 'docstring' );
    } );

    it( 'should strip n times', function() {
      expect( Stryng.strip( '"""docstring"""', '"', 2 ) ).to.equal( '"docstring"' );
    } );
  } );

  describe( '.stripLeft()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.stripLeft ).to.throwError();
    } );

    it( 'should strip from the beginning', function() {
      expect( Stryng.stripLeft( 'Hello World!', 'Hello' ) ).to.equal( ' World!' )
    } );

    it( 'should strip the prefix as long as it remains one', function() {
      expect( Stryng.stripLeft( 'ding ding ding dong', 'ding ' ) ).to.equal( 'dong' )
    } );

    it( 'should strip the prefix n times', function() {
      expect( Stryng.stripLeft( 'ding ding ding dong', 'ding ', 2 ) ).to.equal( 'ding dong' )
    } );
  } );

  describe( '.stripRight()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.stripRight ).to.throwError();
    } );

    it( 'should strip from the beginning', function() {
      expect( Stryng.stripRight( 'Hello, hello World!', 'World!' ) ).to.equal( 'Hello, hello ' )
    } );

    it( 'should strip the prefix as long as it remains one', function() {
      expect( Stryng.stripRight( 'ding dong dong dong', ' dong' ) ).to.equal( 'ding' )
    } );

    it( 'should strip the prefix n times', function() {
      expect( Stryng.stripRight( 'ding dong dong dong', ' dong', 2 ) ).to.equal( 'ding dong' )
    } );
  } );

  describe( '.truncate()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.truncate ).to.throwError();
    } );

    it( 'should not truncate the string if no `max_len` passed (Math.pow(2,32)-1 applied)', function() {
      expect( Stryng.truncate( 'Hello World!' ) ).to.equal( 'Hello World!' );
    } );

    it( 'should truncate the string at `max_len` - 3 (length of default ellipsis) and append "..."', function() {
      expect( Stryng.truncate( 'Hello World!', 8 ) ).to.equal( 'Hello...' );
    } );

    it( 'should make the truncated string and the ellipsis fit `max_len` exactly', function() {
      expect( Stryng.truncate( 'Hello World!', 10, '..' ) ).to.equal( 'Hello Wo..' );
    } );

    it( 'should return the ellipsis if `max_len` equals its length', function() {
      expect( Stryng.truncate( 'whatever', 3 ) ).to.equal( '...' );
    } );

    it( 'should return the last `max_len` characters of the ellipsis if `max_len` is lesser than the ellipsis\' length', function() {
      expect( Stryng.truncate( 'whatever', 2, 'abc' ) ).to.equal( 'bc' );
    } );

    it( 'should return the empty string if `max_len` equals zero', function() {
      expect( Stryng.truncate( 'whatever', 0, 'whatever' ) ).to.equal( '' )
    } );
  } );

  describe( '.quote()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.quote ).to.throwError();
    } );

    it( 'should return the `input` wrapped in double quotes', function() {
      expect( Stryng.quote( 'foo' ) ).to.equal( '"foo"' );
    } );

    it( 'should backslash-escape double quotes', function() {
      expect( Stryng.quote( '"' ) ).to.equal( '"\\""' );
    } );

    it( 'should backslash-escape special characters', function() {
      expect( Stryng.quote( '\n\t\r\b\f\\' ) ).to.equal( '"\\n\\t\\r\\b\\f\\\\"' );
    } );

    it( 'should hex/unicode escape non-printable characters', function() {
      // native JSON.stringify forces full unicode notation (at least on node it seems)
      expect( Stryng.quote( '\0\x01\u0002' ) ).to.match( /^"\\(x00|u0000)\\(x01|u0001)\\(x02|u0002)"$/ );
    } );
  } );

  describe( '.unquote()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.unquote ).to.throwError();
    } );

    it( 'should return the `input` unwrapped from double quotes', function() {
      expect( Stryng.unquote( '"foo"' ) ).to.equal( 'foo' );
    } );

    it( 'should unescape backslash-escaped characters', function() {
      expect( Stryng.unquote( '"\\n\\t\\r\\b\\f\\\\"' ) ).to.equal( '\n\t\r\b\f\\' );
    } );

    it( 'should decode hex-encoded characters', function() {
      // native JSON.stringify forces full unicode notation (at least on node it seems)
      expect( Stryng.unquote( '"\\x01\\u0002"' ) ).to.equal( '\x01\u0002' );
    } );
  } );

  describe( '.append()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.append ).to.throwError();
    } );

    it( 'should append the given argument', function() {
      expect( Stryng.append( 'Hello', ' World!' ) ).to.equal( 'Hello World!' );
    } );
  } );

  describe( '.prepend()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.prepend ).to.throwError();
    } );

    it( 'should prepend the given argument', function() {
      expect( Stryng.prepend( ' World!', 'Hello' ) ).to.equal( 'Hello World!' );
    } );
  } );

  describe('.equals()', function(){

    it('should fail if `input` is missing', function () {
      expect( Stryng.equals ).to.throwError();
    });

    it('should apply "undefined" as the default `comparable`', function () {
      expect( Stryng.equals('undefined' /*, (undefined).toString() */) ).to.be.ok();
    });

    it('should return true if equals', function () {
      expect( Stryng.equals('foo', 'foo') ).to.be.ok();
    });

    it('should return false if not equals', function () {
      expect( Stryng.equals('foo', 'bar') ).to.not.be.ok();
    });
  });

  describe( '.isEmpty()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.isEmpty ).to.throwError();
    } );

    it( 'should return true for the empty string', function() {
      expect( Stryng().isEmpty() ).to.be.ok();
    } );

    it( 'should return false for anything else (after parsing)', function() {
      expect( Stryng.isEmpty( {} ) ).to.not.be.ok();
    } );
  } );

  describe( '.isBlank()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.isBlank ).to.throwError();
    } );

    it( 'should return true for this empty string', function() {
      expect( Stryng().isBlank() ).to.be.ok();
    } );

    it( 'should return true for whitespace only strings', function() {
      expect( Stryng.isBlank([
        '\u0009\u000A\u000B\u000C',
        '\u00A0\u000D\u0020\u1680',
        '\u180E\u2000\u2001\u2002',
        '\u2003\u2004\u2005\u2006',
        '\u2007\u2008\u2009\u200A',
        '\u2028\u2029\u202F\u205F',
        '\u3000\uFEFF'].join('')
      )).to.be.ok();
    } );

    it( 'should return false for anything else', function() {
      expect( Stryng( {} ).isBlank() ).to.not.be.ok();
    } );
  } );

  describe( '.clean()', function(){

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.clean ).to.throwError();
    } );

    it('should trim the input', function () {
      expect( Stryng.clean(' foo ') ).to.equal('foo');
    });

    it('should leave single spaces untouched', function () {
      expect( Stryng.clean('the quick brown fox') ).to.equal('the quick brown fox');
    });

    it('should replace any white space with a space', function () {
      expect( Stryng.clean([
        '_\u0009_\u000A_\u000B_\u000C',
        '_\u00A0_\u000D_\u0020_\u1680',
        '_\u180E_\u2000_\u2001_\u2002',
        '_\u2003_\u2004_\u2005_\u2006',
        '_\u2007_\u2008_\u2009_\u200A',
        '_\u2028_\u2029_\u202F_\u205F',
        '_\u3000_\uFEFF'].join('')
      )).to.equal('_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _');
    });

    it('should collapse groups of white space to one single space', function () {
      expect( Stryng.clean([
        '\u0009\u000A\u000B\u000C',
        '\u00A0\u000D\u0020\u1680',
        '\u180E\u2000\u2001\u2002',
        '\u2003\u2004\u2005\u2006',
        '\u2007\u2008\u2009\u200A',
        '\u2028\u2029\u202F\u205F',
        '\u3000\uFEFF'].join('_')
      )).to.equal('_ _ _ _ _ _');
    });
  });

  describe( '.capitalize()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.capitalize ).to.throwError();
    } );

    it( 'should return the empty string', function() {
      expect( Stryng.capitalize( '' ) ).to.equal( '' );
    } );

    it( 'should upper case the first letter', function() {
      expect( Stryng.capitalize( 'foo' ) ).to.equal( 'Foo' );
    } );
  } );

  describe( '.camelize()', function(){
    it( 'should fail if `input` is missing', function() {
      expect( Stryng.camelize ).to.throwError();
    } );
  });

  describe( '.underscore()', function(){
    it( 'should fail if `input` is missing', function() {
      expect( Stryng.underscore ).to.throwError();
    } );
  });

  describe( '.hyphenize()', function(){
    it( 'should fail if `input` is missing', function() {
      expect( Stryng.hyphenize ).to.throwError();
    } );
  });

  describe( '.simplify()', function(){
    it( 'should fail if `input` is missing', function() {
      expect( Stryng.simplify ).to.throwError();
    } );
  });

  describe( '.ord()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.ord ).to.throwError();
    } );

    it( 'should return the empty array given the empty string', function() {
      expect( Stryng.ord( '' ) ).to.eql( [] );
    } );

    it( 'should return each character\'s character code', function() {
      expect(
        Stryng.ord( 'Hello World' )
      ).to.eql(
        [ 72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100 ]
      );
    } );
  } );

  describe( '.chr()', function() {

    it( 'should return the empty string if no arguments passed', function() {
      expect( Stryng.chr().toString() ).to.equal( '' );
    } );

    it( 'should fail for number greater than Math.pow(2, 16) - 1', function() {
      expect( Stryng.chr ).withArgs( 1 << 16 ).to.throwError();
    } );

    it( 'behave just like native String.fromCharCode', function() {
      expect(
        Stryng.chr( 72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100 ).toString()
      ).to.equal(
        'Hello World'
      );
    } );
  } );

  describe( '.random()', function() {

    it( 'should return the empty string if no length passed', function() {
      expect( Stryng.random().toString() ).to.equal( '' );
    } );

    it( 'should fail if passed a negative length', function() {
      expect( Stryng.random ).withArgs( -1 ).to.throwError();
    } );

    it( 'should fail if passed Infinity', function() {
      expect( Stryng.random ).withArgs( Infinity ).to.throwError();
    } );

    it( 'should produce an ASCII printable string of the given length', function() {
      
      var length = 10,
        result = Stryng.random( length ),
        ASCIIPrintables = '';
      
      for ( var i = 32; i < 127; i++ ) {
        ASCIIPrintables += String.fromCharCode( i );
      }

      expect( ( function() {
        for ( var i = result.length; i--; ) {
          if ( ASCIIPrintables.indexOf( result.charAt( i ) ) === -1 ) {
            return false;
          }
        }
        return true;
      } )() ).to.be.ok();

      expect( result ).to.have.length( length );
    } );
  } );
} );
},{"./../src/stryng.js":5,"expect.js":4}]},{},[6])