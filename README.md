# libp2p pubsub testnet logger

A test data logger for benchmarking libp2p pubsub implementations.

## Install

To install through npm:

```
```sh
> npm i libp2p-pstn-logger --save
```

## Example

`libp2p-pstn-logger` is built to work with [this early implementation of libp2p pubsub](https://github.com/libp2p/js-libp2p-floodsub). It simply decorates the Pubsub instance with new test log events necessary for the testnet benchmark tools.

```JavaScript
const Pubsub = require('libp2p-floodsub')
const TestNode = require('libp2p-pstn-node')

const testNode = new TestNode({ id: keys[idx], portOffset: idx })
const pubsub = PS(testNode.libp2p)

// decorate the pubsub instance
addTestLog(pubsub, testNode.peerInfo.id.toB58String())
// pubsub now has a .test property that is an EventEmitter which emits test log events

pubsubA.test.on('data', someHandler) // 'data' is the only event emitted
```

Test log events are JSON objects structured as follows:

```JavaScript
{
  timestamp: <milliseconds>, // time of event capture in the pubsub instance
  source: <libp2p peer id base58 string>, // node.peerInfo.id.toB58String()
  type: <string>, // publish, subscribe, unsubscribe, emit
  args: <args array for the log event>
}
```

## API

### `ps.test.on('data', <handler>)`

## Tests

To run the tests:

`> npm test`

## Contribute

PRs are welcome!

## License

MIT © Gavin McDermott
