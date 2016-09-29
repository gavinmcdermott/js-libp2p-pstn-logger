'use strict'

const EE = require('events').EventEmitter
const TestnetNode = require('libp2p-pstn-node')
const R = require('ramda')

const { log } = require('./config')
const { LoggerError } = require('./errors')

class Logger {
  constructor(testnetNode, pubsub) {
    if (!(this instanceof Logger)) {
      return new Logger(testnetNode, pubsub)
    }

    if (!(testnetNode instanceof TestnetNode)) {
      throw new LoggerError('Expect <testnetNode> to be instance of libp2p-pstn-node')
    }

    if (R.isNil(pubsub)) {
      throw new LoggerError('Missing <pubsub>')
    }

  }
}
