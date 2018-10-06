const ccxt = require('ccxt')
, path = require('path')
, minimist = require('minimist')
, colors = require('colors')
, _ = require('lodash')

module.exports = function kraken (conf) {
  var s = {
    options: minimist(process.argv)
  }
  var so = s.options
  var public_client, authed_client
  let firstRun = true
  let allowGetMarketCall = true

  function publicClient () {
    if (!public_client) public_client = new ccxt.kraken({ 'apiKey': '', 'secret': '' })
    return public_client
  }

  function authedClient () {
    if (!authed_client) {
      if (!conf.kraken || !conf.kraken.key || conf.kraken.key === 'YOUR-API-KEY') {
        throw new Error('please configure your Kraken credentials in ' + path.resolve(__dirname, 'conf.js'))
      }
      authed_client = new ccxt.kraken({ 'apiKey': conf.kraken.key, 'secret': conf.kraken.secret })
    }
    return authed_client
  }

  function joinProduct(product_id) {
    let split = product_id.split('-')
    return split[0] + '/' + split[1]
  }

  function retry (method, args, err) {
    if (method !== 'getTrades') {
      console.error(('\nKraken API is down! unable to call ' + method + ', retrying in 30s').red)
      if (err) console.error(err)
      console.error(args.slice(0, -1))
    }
    setTimeout(function () {
      exchange[method].apply(exchange, args)
    }, 30000)
  }

  var orders = {}

  var exchange = {
    name: 'krakenccxt',
    historyScan: 'forward',
    historyScanUsesTime: true,
    makerFee: 0.16,
    takerFee: 0.26,

    getProducts: function () {
      return require('./products.json')
    },

    getTrades: function (opts, cb) {
      var func_args = [].slice.call(arguments)
      , trades = []
      , maxTime = 0
      var client = publicClient()
      var args = {}
      if (opts.from) {
        args.since = Number(opts.from) * 1000000
      }
      if (allowGetMarketCall != true) {
        cb(null, [])
        return null
      }
      client.fetchTrades(joinProduct(opts.product_id), undefined, undefined, args).then(result => {
        var trades = result.map(function (trade) {
          return {
            trade_id: trade.id,
            time: trade.timestamp,
            size: parseFloat(trade.amount),
            price: parseFloat(trade.price),
            side: trade.side
          }
        })
        cb(null, trades)
      }).catch(function (error) {
        console.error('An error occurred', error)
        return retry('getTrades', func_args)
      })
    },

    getBalance: function (opts, cb) {
      var func_args = [].slice.call(arguments)
      var client = authedClient()
      if (!so.leverage) {
        client.fetchBalance().then(result => {
          var balance = {asset: 0, currency: 0}
          Object.keys(result).forEach(function (key) {
            if (key === opts.currency) {
              balance.currency = result[key].free + result[key].used
              balance.currency_hold = result[key].used
            }
            if (key === opts.asset) {
              balance.asset = result[key].free + result[key].used
              balance.asset_hold = result[key].used
            }
          })
          cb(null, balance)
        })
        .catch(function (error) {
          console.error('An error occurred', error)
          return retry('getBalance', func_args)
        })
      } else if (so.leverage > 1) {
        var balance = {
          asset: '100',
          asset_hold: '0',
          currency: '100',
          currency_hold: '0'
        }
        cb(null, balance)
      }
    },

    getQuote: function (opts, cb) {
      var func_args = [].slice.call(arguments)
      var client = publicClient()
      client.fetchTicker(joinProduct(opts.product_id)).then(result => {
        cb(null, { bid: result.bid, ask: result.ask })
      })
      .catch(function (error) {
        console.error('An error occurred', error)
        return retry('getQuote', func_args)
      })
    },

    getDepth: function (opts, cb) {
      var func_args = [].slice.call(arguments)
      var client = publicClient()
      client.fetchOrderBook(joinProduct(opts.product_id), {limit: opts.limit}).then(result => {
        cb(null, result)
      })
      .catch(function(error) {
        console.error('An error ocurred', error)
        return retry('getDepth', func_args)
      })
    },

    cancelOrder: function (opts, cb) {
      var func_args = [].slice.call(arguments)
      var client = authedClient()
      client.cancelOrder(opts.order_id, joinProduct(opts.product_id)).then(function (body) {
        if (body && (body.message === 'Order already done' || body.message === 'order not found')) return cb()
        cb(null)
      }, function(err){
        if (err) {
          return retry('cancelOrder', func_args, err)
        }
        cb()
      })
    },

    buy: function (opts, cb) {
      var func_args = [].slice.call(arguments)
      var client = authedClient()
      var params = {
        type: (opts.order_type === 'taker' ? 'market' : 'limit'),
        volume: this.roundToNearest(opts.size, opts),
        trading_agreement: conf.kraken.tosagree
      }
      if (so.leverage > 1) {
        params.leverage = so.leverage
      }
      if (opts.post_only === true && params.ordertype === 'limit') {
        params.oflags = 'post'
      }
      if ('price' in opts) {
        params.price = opts.price
      }
      if (so.debug) {
        console.log('\nFunction: trade')
        console.log(params)
      }
      var order = {}
      client.createOrder(joinProduct(opts.product_id), params).then(result => {
        if (result && result.message === 'Insufficient funds') {
          order = {
            status: 'rejected',
            reject_reason: 'balance'
          }
          return cb(null, order)
        }
        order = {
          id: result ? result.id : null,
          status: 'open',
          price: opts.price,
          size: this.roundToNearest(opts.size, opts),
          post_only: !!opts.post_only,
          created_at: new Date().getTime(),
          filled_size: '0',
          ordertype: opts.order_type
        }
        orders['~' + result.id] = order
        cb(null, order)
      }).catch(function (error) {
        console.error('An error occurred', error)

        // decide if this error is allowed for a retry:
        // {"code":-1013,"msg":"Filter failure: MIN_NOTIONAL"}
        // {"code":-2010,"msg":"Account has insufficient balance for requested action"}

        if (error.message.match(new RegExp(/-1013|MIN_NOTIONAL|-2010/))) {
          return cb(null, {
            status: 'rejected',
            reject_reason: 'balance'
          })
        }

        return retry('buy', func_args)
      })
    },

    sell: function (opts, cb) {
      var func_args = [].slice.call(arguments)
      var client = authedClient()
      var params = {
        pair: joinProduct(opts.product_id),
        type: opts.type,
        ordertype: (opts.order_type === 'taker' ? 'market' : 'limit'),
        volume: opts.size,
        trading_agreement: conf.kraken.tosagree
      }
      if (so.leverage > 1) {
        params.leverage = so.leverage
      }
      if (opts.post_only === true && params.ordertype === 'limit') {
        params.oflags = 'post'
      }
      if ('price' in opts) {
        params.price = opts.price
      }
      if (so.debug) {
        console.log('\nFunction: trade')
        console.log(params)
      }
      var order = {}
      client.createOrder(params).then(result => {
        if (result && result.message === 'Insufficient funds') {
          order = {
            status: 'rejected',
            reject_reason: 'balance'
          }
          return cb(null, order)
        }
        order = {
          id: result ? result.id : null,
          status: 'open',
          price: opts.price,
          size: this.roundToNearest(opts.size, opts),
          post_only: !!opts.post_only,
          created_at: new Date().getTime(),
          filled_size: '0',
          ordertype: opts.order_type
        }
        orders['~' + result.id] = order
        cb(null, order)
      }).catch(function (error) {
        console.error('An error occurred', error)

        // decide if this error is allowed for a retry:
        // {"code":-1013,"msg":"Filter failure: MIN_NOTIONAL"}
        // {"code":-2010,"msg":"Account has insufficient balance for requested action"}

        if (error.message.match(new RegExp(/-1013|MIN_NOTIONAL|-2010/))) {
          return cb(null, {
            status: 'rejected',
            reject_reason: 'balance'
          })
        }

        return retry('sell', func_args)
      })
    },

    roundToNearest: function(numToRound, opts) {
      var numToRoundTo = _.find(this.getProducts(), { 'asset': opts.product_id.split('-')[0], 'currency': opts.product_id.split('-')[1] }).min_size
      numToRoundTo = 1 / (numToRoundTo)

      return Math.floor(numToRound * numToRoundTo) / numToRoundTo
    },

    getOrder: function (opts, cb) {
      var func_args = [].slice.call(arguments)
      var client = authedClient()
      var order = orders['~' + opts.order_id]
      client.fetchOrder(opts.order_id, joinProduct(opts.product_id)).then(function (body) {
        if (body.status !== 'open' && body.status !== 'canceled') {
          order.status = 'done'
          order.done_at = new Date().getTime()
          order.filled_size = parseFloat(body.amount) - parseFloat(body.remaining)
          return cb(null, order)
        }
        cb(null, order)
      }, function(err) {
        return retry('getOrder', func_args, err)
      })
    },

    getCursor: function (trade) {
      return (trade.time || trade)
    }
  }
  return exchange
}
