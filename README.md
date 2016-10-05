# js libp2p pstn logger

A test data logger for benchmarking libp2p pubsub implementations.

## Install

To install through npm:

```sh
> npm i libp2p-pstn-logger --save
```

## Example

`libp2p-pstn-logger` is built to work with [this early implementation of libp2p pubsub](https://github.com/libp2p/js-libp2p-floodsub). It simply proxies a Pubsub instance's function calls and adds the new log events necessary for the testnet benchmark tools.

It logs using [`debug`](https://github.com/visionmedia/debug) and its namespace is `pstn:logger*`.


```JavaScript
const Pubsub = require('libp2p-floodsub')
const libp2p = require('libp2p-ipfs')
const addLogger = require('libp2p-pstn-logger')

const p2p = new libp2p.Node(<somePeerInfo>)
const pubsub = PS(p2p)

// Now just proxy and log the important pubsub events by calling the fn
addLogger(pubsub, p2p.peerInfo.id.toB58String())

// Or if you want to work with a logger instance, simply create one.
// const logger = addLogger(pubsub, p2p.peerInfo.id.toB58String())
// ...
// logger.on('publish', <your handler>)
```

### Proxied Pubsub Log Events

The proxied `pubsub` instance will now dump the following events to any specified log file in this format. 

- `<timestamp> pstn:logger publish <b58_event_source_id> <b64_topic> <b64_msg>`
- `<timestamp> pstn:logger receive <b58_event_source_id> <b64_topic> <b64_msg>`
- `<timestamp> pstn:logger subscribe <b58_event_source_id> <b64_topic> <b64_msg>`
- `<timestamp> pstn:logger unsubscribe <b58_event_source_id> <b64_topic> <b64_msg>`

### Logger Instance Events

Logger instances will receive these events:

- `logger.on('publish', <handler>)`
- `logger.on('receive', <handler>)` 
- `logger.on('subscribe', <handler>)` 
- `logger.on('unsubscribe', <handler>)` 

### Logger Instance Event Structure

Test log events are JSON objects structured as follows:

```JavaScript
{
  timestamp: <milliseconds>, // time of event capture in the pubsub instance
  source: <libp2p_peer_id_base58_string>, // E.g.: libp2pNode.peerInfo.id.toB58String()
  type: <string>, // publish, subscribe, unsubscribe, receive
  args: <array_args_for_proxied_fn>
}
```

## API

### Logger Instance

#### `logger.on('publish', <handler>)`

#### `logger.on('receive', <handler>)`

#### `logger.on('subscribe', <handler>)`

#### `logger.on('unsubscribe', <handler>)`

## Tests

To run the basic tests:

```sh
> npm test
```

To dump the `debug` logs into a file for viewing/parsing:

```sh
> npm run test:log
```

To show the `debug` logs:

```sh
> npm run test:debug
```

## Contribute

PRs are welcome!

## License

MIT © Gavin McDermott
