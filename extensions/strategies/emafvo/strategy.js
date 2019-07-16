var z = require('zero-fill')
, n = require('numbro')
, ema = require('../../../lib/ema')
, vo_sma = require('../../../lib/vo_sma')
, dupOrderWorkAround = require('../../../lib/duporderworkaround')

module.exports = {
  name: 'emafvo',
  description: 'EMA + Fractals + VO',

  getOptions: function () {
    this.option('period_length', 'period_length', String, '2h')
    this.option('min_periods', 'min_periods', Number, 150)
    this.option('buy', 'buy', Boolean, false)
    this.option('sell', 'sell', Boolean, false)
    this.option('ema', 'ema', Number, 150)
    this.option('svo', 'voshort', Number, 20)
    this.option('lvo', 'volong', Number, 100)
  },

  calculate: function (s) {
    if (s.lookback[s.options.ema]) {
      ema(s, 'ema', s.options.ema)
      s.period.ema = round(s.period.ema, 4)
      vo_sma(s, 'vo', s.options.svo, s.options.lvo)
      s.period.vo = round(s.period.vo, 4)
    }
  },

  onPeriod: function (s, cb) {
    if (s.lookback[s.options.ema]) {
      if (s.lookback[3].high <= s.lookback[1].high && s.lookback[2].high <= s.lookback[1].high && s.lookback[0].high <= s.lookback[1].high && s.period.high <= s.lookback[1].high) {
        s.upfractal = s.lookback[1].high
      }
      if (s.lookback[3].low >= s.lookback[1].low && s.lookback[2].low >= s.lookback[1].low && s.lookback[0].low >= s.lookback[1].low && s.period.low >= s.lookback[1].low) {
        s.downfractal = s.lookback[1].low
      }
      if (s.options.buy !== false) {
        if (s.period.close > s.upfractal && s.period.close > s.period.ema && s.period.vo > 0) {
          if (s.trend !== 'up') {
            s.acted_on_trend = false
          }
          s.trend = 'up'
          if (dupOrderWorkAround.checkForPriorBuy(s))
          s.signal = !s.acted_on_trend ? 'buy' : null
        }
      }
      if (s.options.sell !== false) {
        if (s.period.close < s.downfractal && s.period.close < s.period.ema && s.period.vo > 0) {
          if (s.trend !== 'down') {
            s.acted_on_trend = false
          }
          s.trend = 'down'
          if (dupOrderWorkAround.checkForPriorSell(s))
          s.signal = !s.acted_on_trend ? 'sell' : null
        }
      }
    }
    cb()
  },

  onReport: function (s) {
    var cols = []
    if (s.lookback[s.options.ema]) {
      cols.push(z(6, n(s.period.ema),).red)
      cols.push(z(1, ' '))
      cols.push(z(6, n(s.period.vo), ' ').cyan)
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
