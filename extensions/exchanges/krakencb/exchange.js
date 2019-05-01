var KrakenClient = require('kraken-api'),
ccxt = require('ccxt'),
minimist = require('minimist'),
moment = require('moment'),
n = require('numbro'),
// eslint-disable-next-line no-unused-vars
colors = require('colors')

module.exports = function container(conf) {
  var s = {
    options: minimist(process.argv)
  }
  var so = s.options

  var public_client, authed_client, coinbase_client
  let firstRun = true
  let allowGetMarketCall = true
  // var recoverableErrors = new RegExp(/(ESOCKETTIMEDOUT|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENOTFOUND|API:Invalid nonce|API:Rate limit exceeded|between Cloudflare and the origin web server)/)
  var recoverableErrors = new RegExp(/(ESOCKETTIMEDOUT|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENOTFOUND|API:Invalid nonce|between Cloudflare and the origin web server|The web server reported a gateway time-out|The web server reported a bad gateway|525: SSL handshake failed|Service:Unavailable|api.kraken.com \| 522:)/)
  var silencedRecoverableErrors = new RegExp(/(ESOCKETTIMEDOUT|ETIMEDOUT)/)

  function publicClient() {
    if (!public_client) {
      public_client = new KrakenClient()
    }
    return public_client
  }

  function coinbaseClient () {
    if (!coinbase_client) coinbase_client = new ccxt.coinbasepro({ 'apiKey': '', 'secret': ''})
    return coinbase_client
  }

  function authedClient() {
    if (!authed_client) {
      if (!conf.kraken || !conf.kraken.key || conf.kraken.key === 'YOUR-API-KEY') {
        throw new Error('please configure your Kraken credentials in conf.js')
      }
      authed_client = new KrakenClient(conf.kraken.key, conf.kraken.secret)
    }
    return authed_client
  }

  // This is to deal with a silly bug where kraken doesn't use a consistent definition for currency
  // with certain assets they will mix the use of 'Z' and 'X' prefixes
  function joinProductFormatted(product_id) {
    var asset = product_id.split('-')[0]
    var currency = product_id.split('-')[1]

    var assetsToFix = ['BCH', 'DASH', 'EOS', 'GNO']
    if (assetsToFix.indexOf(asset) >= 0 && currency.length > 3) {
      currency = currency.substring(1)
    }
    return asset + currency
  }

  function retry(method, args, error) {
    let timeout, errorMsg
    if (error.message.match(/API:Rate limit exceeded/)) {
      timeout = 30000
    } else {
      timeout = 15000
    }

    // silence common timeout errors
    if (so.debug || !error.message.match(silencedRecoverableErrors)) {
      if (error.message.match(/between Cloudflare and the origin web server/)) {
        errorMsg = 'Connection between Cloudflare CDN and api.kraken.com failed'
      }
      else if (error.message.match(/The web server reported a gateway time-out/)) {
        errorMsg = 'Web server Gateway time-out'
      }
      else if (error.message.match(/The web server reported a bad gateway/)) {
        errorMsg = 'Web server bad Gateway'
      }
      else if (error.message.match(/525: SSL handshake failed/)) {
        errorMsg = 'SSL handshake failed'
      }
      else if (error.message.match(/Service:Unavailable/)) {
        errorMsg = 'Service Unavailable'
      }
      else if (error.message.match(/api.kraken.com \| 522:/)) {
        errorMsg = 'Generic 522 Server error'
      }

      else {
        errorMsg = error
      }
      console.warn(('\nKraken API warning - unable to call ' + method + ' (' + errorMsg + '), retrying in ' + timeout / 1000 + 's').yellow)
    }
    setTimeout(function() {
      exchange[method].apply(exchange, args)
    }, timeout)
  }

  var orders = {}

  var exchange = {
    name: 'krakencb',
    historyScan: 'forward',
    makerFee: 0.16,
    takerFee: 0.26,
    backfillRateLimit: 3500,

    getProducts: function() {
      return require('./products.json')
    },

    getTrades: function (opts, cb) {
      var func_args = [].slice.call(arguments)
      var client = coinbaseClient()
      var args = {}
      if (opts.from) {
        // move cursor into the future
        args.before = opts.from
      }
      else if (opts.to) {
        // move cursor into the past
        args.after = opts.to
      }
      if (opts.product_id == 'XXBT-ZUSD') opts.product_id = 'BTC/USD'
      if (opts.product_id == 'XETH-ZUSD') opts.product_id = 'ETH/USD'
      if (opts.product_id == 'XXRP-ZUSD') opts.product_id = 'XRP/USD'
      if (opts.product_id == 'BCH-ZUSD') opts.product_id = 'BCH/USD'
      const symbol = opts.product_id
      client.fetchTrades(symbol, opts.from, args).then(result => {
        var trades = result.map(trade => ({
          trade_id: trade.id,
          time: trade.timestamp,
          size: parseFloat(trade.amount),
          price: parseFloat(trade.price),
          side: trade.side
        }))
        cb(null, trades)
      }).catch(function (error) {
        console.error('An error occurred', error)
        return retry('getTrades', func_args)
      })

    },

    getBalance: function(opts, cb) {
      var args = [].slice.call(arguments)
      var client = authedClient()
      if (so.leverage == 0) {
        client.api('Balance', null, function(error, data) {
          var balance = {
            asset: '0',
            asset_hold: '0',
            currency: '0',
            currency_hold: '0'
          }
          if (error) {
            if (error.message.match(recoverableErrors)) {
              return retry('getBalance', args, error)
            }
            console.error(('\ngetBalance error:').red)
            console.error(error)
            return cb(error)
          }
          if (data.error.length) {
            return cb(data.error.join(','))
          }
          if (data.result[opts.currency]) {
            balance.currency = n(data.result[opts.currency]).format('0.00000000')
            balance.currency_hold = '0'
          }
          if (data.result[opts.asset]) {
            balance.asset = n(data.result[opts.asset]).format('0.00000000')
            balance.asset_hold = '0'
          }
          cb(null, balance)
        })
      }
      else if (so.leverage > 0) {
        var balance = {
          asset: '100000',
          asset_hold: '0',
          currency: '100000',
          currency_hold: '0'
        }
        cb(null, balance)
      }
    },

    getQuote: function(opts, cb) {
      var args = [].slice.call(arguments)
      var client = publicClient()
      var pair = joinProductFormatted(opts.product_id)
      client.api('Ticker', {
        pair: pair
      }, function(error, data) {
        if (error) {
          if (error.message.match(recoverableErrors)) {
            return retry('getQuote', args, error)
          }
          console.error(('\ngetQuote error:').red)
          console.error(error)
          return cb(error)
        }
        if (data.error.length) {
          return cb(data.error.join(','))
        }
        cb(null, {
          bid: data.result[pair].b[0],
          ask: data.result[pair].a[0],
        })
      })
    },

    cancelOrder: function(opts, cb) {
      var args = [].slice.call(arguments)
      var client = authedClient()
      client.api('CancelOrder', {
        txid: opts.order_id
      }, function(error, data) {
        if (error) {
          if (error.message.match(recoverableErrors)) {
            return retry('cancelOrder', args, error)
          }
          console.error(('\ncancelOrder error:').red)
          console.error(error)
          return cb(error)
        }
        if (data.error.length) {
          return cb(data.error.join(','))
        }
        if (so.debug) {
          console.log('\nFunction: cancelOrder')
          console.log(data)
        }
        cb(error)
      })
    },

    trade: function(type, opts, cb) {
      var args = [].slice.call(arguments)
      var client = authedClient()
      var params = {
        pair: joinProductFormatted(opts.product_id),
        type: type,
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
      client.api('AddOrder', params, function(error, data) {
        if (error) {
          return retry('trade', args, error)
        }

        var order = {
          id: data && data.result ? data.result.txid[0] : null,
          status: 'open',
          price: opts.price,
          size: opts.size,
          created_at: new Date().getTime(),
          filled_size: '0'
        }

        if (opts.order_type === 'maker') {
          order.post_only = !!opts.post_only
        }

        if (so.debug) {
          console.log('\nData:')
          console.log(data)
          console.log('\nOrder:')
          console.log(order)
          console.log('\nError:')
          console.log(error)
        }

        if (error) {
          if (error.message.match(/Order:Insufficient funds$/)) {
            order.status = 'rejected'
            order.reject_reason = 'balance'
            return cb(null, order)
          } else if (error.message.length) {
            console.error(('\nUnhandeld AddOrder error:').red)
            console.error(error)
            order.status = 'rejected'
            order.reject_reason = error.message
            return cb(null, order)
          } else if (data.error.length) {
            console.error(('\nUnhandeld AddOrder error:').red)
            console.error(data.error)
            order.status = 'rejected'
            order.reject_reason = data.error.join(',')
          }
        }

        orders['~' + data.result.txid[0]] = order
        cb(null, order)
      })
    },

    buy: function(opts, cb) {
      exchange.trade('buy', opts, cb)
    },

    sell: function(opts, cb) {
      exchange.trade('sell', opts, cb)
    },

    getOrder: function(opts, cb) {
      var args = [].slice.call(arguments)
      var order = orders['~' + opts.order_id]
      if (!order) return cb(new Error('order not found in cache'))
      var client = authedClient()
      var params = {
        txid: opts.order_id
      }
      client.api('QueryOrders', params, function(error, data) {
        if (error) {
          return retry('getOrder', args, error)
          console.error(('\ngetOrder error:').red)
          console.error(error)
          return cb(error)
        }
        if (data.error.length) {
          return cb(data.error.join(','))
        }
        var orderData = data.result[params.txid]
        if (so.debug) {
          console.log('\nfunction: QueryOrders')
          console.log(orderData)
        }

        if (!orderData) {
          return cb('Order not found')
        }

        if (orderData.status === 'canceled' && orderData.reason === 'Post only order') {
          order.status = 'rejected'
          order.reject_reason = 'post only'
          order.done_at = new Date().getTime()
          order.filled_size = '0.00000000'
          return cb(null, order)
        }

        if (orderData.status === 'closed' || (orderData.status === 'canceled' && orderData.reason === 'User canceled')) {
          order.status = 'done'
          order.done_at = new Date().getTime()
          order.filled_size = n(orderData.vol_exec).format('0.00000000')
          order.price = n(orderData.price).format('0.00000000')
          return cb(null, order)
        }

        cb(null, order)
      })
    },

    // return the property used for range querying.
    getCursor: function(trade) {
      return (trade.time || trade)
    }
  }
  return exchange
}