'use strict'

const expect = require('chai').expect
// Note: require('libp2p-floodsub') throws: Cannot find module 'libp2p-floodsub'
const PS = require('./../node_modules/libp2p-floodsub/src/index')
const TestNode = require('libp2p-pstn-node')
const R = require('ramda')
const parallel = require('run-parallel')

const keys = require('./fixtures/keys').keys
const Logger = require('./../src/index')

const mapIndexed = R.addIndex(R.map)

describe('pubsubLogger', () => {
  let logger
  let loggers = R.range(0, 3)

  before(() => {
    const nodeStartFns = mapIndexed((n, idx) => {
      let node = new TestNode({ id: keys[idx], portOffset: idx })
      loggers[idx] = new Logger(node, PS)
      return node.start
    }, loggers)

    return Promise.all(nodeStartFns)
  })

  describe('1 node', () => {
    let loggerA

    before(() => {
      loggerA = R.head(loggers)
    })

    it('foo', () => {
      loggerA.pubsub.subscribe('A')
    })
  })
})
