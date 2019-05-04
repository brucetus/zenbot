var z = require('zero-fill')
, n = require('numbro')
, ema = require('../../../lib/ema')
, dupOrderWorkAround = require('../../../lib/duporderworkaround')

module.exports = {
  name: 'emaf',
  description: 'EMA + Fractals',

  getOptions: function () {
    this.option('period_length', 'period_length', String, '2h')
    this.option('min_periods', 'min_periods', Number, 100)
    this.option('buy', 'buy', Boolean, false)
    this.option('sell', 'sell', Boolean, false)
    this.option('close', 'close', Boolean, false)
    this.option('up', 'up', Number, 1)
    this.option('down', 'down', Number, 1)
    this.option('ema', 'ema', Number, 100)
  },

  calculate: function (s) {
    if (s.lookback[s.options.ema]) {
      ema(s, 'ema', s.options.ema)
      s.period.ema = round(s.period.ema, 4)
      if (s.options.close == false) {
        if (s.options.buy !== false) {
          if ((s.period.high / s.upfractal > s.options.up) && (s.period.high / s.period.ema > s.options.up)) {
            if (s.trend !== 'up') {
              s.acted_on_trend = false
            }
            s.trend = 'up'
            if (dupOrderWorkAround.checkForPriorBuy(s))
            s.signal = !s.acted_on_trend ? 'buy' : null
          }
        }
        if (s.options.sell !== false) {
          if ((s.period.low / s.downfractal < s.options.down) && (s.period.low / s.period.ema < s.options.down)) {
            if (s.trend !== 'down') {
              s.acted_on_trend = false
            }
            s.trend = 'down'
            if (dupOrderWorkAround.checkForPriorSell(s))
            s.signal = !s.acted_on_trend ? 'sell' : null
          }
        }
      }
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
      if (s.options.close !== false) {
        if (s.options.buy !== false) {
          if ((s.period.close / s.upfractal > s.options.up) && (s.period.close / s.period.ema > s.options.up)) {
            if (s.trend !== 'up') {
              s.acted_on_trend = false
            }
            s.trend = 'up'
            if (dupOrderWorkAround.checkForPriorBuy(s))
            s.signal = !s.acted_on_trend ? 'buy' : null
          }
        }
        if (s.options.sell !== false) {
          if ((s.period.close / s.downfractal < s.options.down) && (s.period.close / s.period.ema < s.options.down)) {
            if (s.trend !== 'down') {
              s.acted_on_trend = false
            }
            s.trend = 'down'
            if (dupOrderWorkAround.checkForPriorSell(s))
            s.signal = !s.acted_on_trend ? 'sell' : null
          }
        }
      }
    }
    cb()
  },

  onReport: function (s) {
    var cols = []
    if (s.lookback[s.options.ema]) {
      cols.push(z(8, n(s.period.ema), ' '))
      cols.push(z(1, ' '))
      cols.push(z(8, n(s.upfractal), ' ').green)
      cols.push(z(1, ' '))
      cols.push(z(8, n(s.downfractal), ' ').red)
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
