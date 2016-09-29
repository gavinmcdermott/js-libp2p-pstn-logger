'use strict'

const EE = require('events').EventEmitter
const TestNode = require('libp2p-pstn-node')
const R = require('ramda')

const { log } = require('./config')
const { LoggerError } = require('./errors')

module.exports = class Logger {
  constructor(testNode, pubsub) {
    if (!(this instanceof Logger)) {
      return new Logger(testNode, pubsub)
    }

    if (!(testNode instanceof TestNode)) {
      throw new LoggerError('Expect <testNode> to be instance of libp2p-pstn-node')
    }

    if (R.isNil(pubsub)) {
      throw new LoggerError('Missing <pubsub>')
    }

    // Add an eventEmitter to the instance
    EE.call(this)

    this.node = testNode
    this.pubsub = pubsub
  }
}
