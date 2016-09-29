'use strict'

const expect = require('chai').expect
// Note: require('libp2p-floodsub') throws: Cannot find module 'libp2p-floodsub'
const PSG = require('./../node_modules/libp2p-floodsub/src/index')
const TestNode = require('libp2p-pstn-node')
// const R = require('ramda')
const keys = require('./fixtures/keys').keys
const Logger = require('./../src/index')

describe('Logger', () => {
  let logger
  const testNode = new TestNode({ id: keys[0] })

  describe('constructor', () => {
    it('fails: missing Node', () => {
      const thrower = () => new Logger()
      expect(thrower).to.throw
    })

    it('fails: invalid Node', () => {
      const thrower = () => new Logger({})
      expect(thrower).to.throw
    })

    it('fails: missing pubsub', () => {
      const thrower = () => new Logger(testNode)
      expect(thrower).to.throw
    })

    it('success', () => {
      logger = new Logger(testNode, PSG)
      expect(logger instanceof Logger).to.be.true
    })
  })
})
