'use strict'

const expect = require('chai').expect
// Note: require('libp2p-floodsub') throws: Cannot find module 'libp2p-floodsub'
const PS = require('./../node_modules/libp2p-floodsub/src/index')
const TestNode = require('libp2p-pstn-node')
const R = require('ramda')
const parallel = require('run-parallel')

const keys = require('./fixtures/keys').keys
const Logger = require('./../src/index')

describe('Logger', () => {
  let logger
  let nodes = R.range(0, 3)

  before(() => {
    R.forEach((idx) => {
      let node = new TestNode({ id: keys[idx], portOffset: idx })
      nodes[idx] = node
    }, nodes)
  })

  describe('constructor', () => {
    let nodeA

    before(() => {
      nodeA = R.head(nodes)
    })

    it('fails: missing Node', () => {
      const thrower = () => new Logger()
      expect(thrower).to.throw
    })

    it('fails: invalid Node', () => {
      const thrower = () => new Logger({})
      expect(thrower).to.throw
    })

    it('fails: missing pubsub', () => {
      const thrower = () => new Logger(nodeA)
      expect(thrower).to.throw
    })

    it('success', () => {
      logger = new Logger(nodeA, PS)
      expect(logger instanceof Logger).to.be.true
      expect(logger.node instanceof TestNode).to.be.true
      expect(logger.pubsub instanceof PS).to.be.true
    })
  })
})
