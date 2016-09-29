'use strict'

class LoggerError extends Error {
  constructor (message, extra) {
    super()
    Error.captureStackTrace(this, this.constructor)
    this.name = `LoggerError`
    this.message = `${message}`
    if (extra) this.extra = extra
  }
}

module.exports = { LoggerError }
