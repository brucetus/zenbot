var z = require('zero-fill')
, n = require('numbro')
, highest = require('../../../lib/highest')
, lowest = require('../../../lib/lowest')
, dupOrderWorkAround = require('../../../lib/duporderworkaround')

module.exports = {
  name: 'kijun',
  description: 'Buys or sells when price hits kijun',

  getOptions: function () {
    this.option('period_length', 'period length', String, '2h')
    this.option('min_periods', 'min periods', Number, 120)
    this.option('buy', 'buy', Boolean, false)
    this.option('sell', 'sell', Boolean, false)
    this.option('up', 'up', Number, 1.005)
    this.option('down','down', Number, 0.995)
    this.option('kijun','Kijun (base) line', Number, 60)
  },

  calculate: function (s) {
    if (s.lookback[s.options.min_periods]) {
      if (s.options.buy !== false) {
        if (s.period.low/s.lookback[0].kijun <= s.options.up) {
          if (s.trend !== 'up') {
            s.acted_on_trend = false
          }
          s.trend = 'up'
          if (dupOrderWorkAround.checkForPriorBuy(s))
          s.signal = !s.acted_on_trend ? 'buy' : null
        }
      }
      if (s.options.sell !== false) {
        if (s.period.high/s.lookback[0].kijun >= s.options.down) {
          if (s.trend !== 'down') {
            s.acted_on_trend = false
          }
          s.trend = 'down'
          if (dupOrderWorkAround.checkForPriorSell(s))
          s.signal = !s.acted_on_trend ? 'sell' : null
        }
      }
    }
  },

  onPeriod: function (s, cb) {
    if (s.lookback[s.options.min_periods]) {
      highest(s, 'kijun_high', s.options.kijun)
      lowest(s, 'kijun_low', s.options.kijun)
      s.period.kijun = round(((s.period.kijun_high + s.period.kijun_low) / 2), 8)
    }
    cb()
  },

  onReport: function (s) {
    var cols = []
    if (s.lookback[s.options.min_periods]) {
      cols.push(z(8, n(s.lookback[0].kijun), ' '))
    }
    return cols
  }
}

function round(n, digits) {
  if (digits === undefined) {
    digits = 0
  }
  var multiplicator = Math.pow(10, digits)
  n = parseFloat((n * multiplicator).toFixed(11))
  var test =(Math.round(n) / multiplicator)
  return +(test.toFixed(digits))
}
