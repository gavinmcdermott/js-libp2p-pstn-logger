'use strict'

const EE = require('events').EventEmitter
const TestNode = require('libp2p-pstn-node')
const R = require('ramda')
const util = require('util')

const mountNodeLogger = require('./nodeLogger')
const mountPubsubLogger = require('./pubsubLogger')
const { logger } = require('./config')
const { LoggerError } = require('./errors')

const Logger = class Logger {
  constructor(testNode, pubsubStrategy) {
    if (!(this instanceof Logger)) {
      return new Logger(testNode, pubsub)
    }

    if (!(testNode instanceof TestNode)) {
      throw new LoggerError('Expect <testNode> to be instance of libp2p-pstn-node')
    }

    if (R.isNil(pubsubStrategy)) {
      throw new LoggerError('Missing <pubsubStrategy>')
    }

    // this.on('data', console.log)

    this.id = testNode.peerInfo.id.toB58String()
    this.node = testNode
    this.pubsub = pubsubStrategy(this.node.libp2p)

    mountNodeLogger(this)
    mountPubsubLogger(this)
  }
}

// Add event emitter
util.inherits(Logger, EE)

module.exports = Logger
