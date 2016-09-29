'use strict'

const expect = require('chai').expect
// const PSG = require('libp2p-floodsub')
const FloodSub = require('libp2p-floodsub')
// const R = require('ramda')
const Logger = require('./../src/index')

describe('Logger', () => {
  let logger

  describe('constructor', () => {
    it('fails: missing valid Node', () => {
      const thrower = () => new Logger()
      expect(thrower).to.throw
    })
  })

})
