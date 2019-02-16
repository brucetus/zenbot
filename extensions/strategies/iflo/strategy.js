var z = require('zero-fill')
, n = require('numbro')
, highest = require('../../../lib/highest')
, lowest = require('../../../lib/lowest')
, dupOrderWorkAround = require('../../../lib/duporderworkaround')

module.exports = {
  name: 'iflo',
  description: 'Ichimoku Cloud + Fractals',

  getOptions: function () {
    this.option('period_length', 'period length', String, '2h')
    this.option('min_periods', 'min periods', Number, 120)
    this.option('buy', 'buy', Boolean, false)
    this.option('sell', 'sell', Boolean, false)
    this.option('up', 'up', Number, 1)
    this.option('down', 'down', Number, 1)
    this.option('tenkan', 'Tenkan (conversion) line', Number, 20)
    this.option('kijun', 'Kijun (base) line', Number, 60)
    this.option('senkou_b', 'Senkou (leading) span B', Number, 120)
    this.option('chikou', 'Chikou (lagging) span)', Number, 30)
  },

  calculate: function (s) {
    if (s.lookback[s.options.min_periods]) {
      if (s.options.buy !== false) {
        if ((s.period.high / s.upfractal > s.options.up) && (s.period.high / Math.max(s.lookback[29].senkou_a, s.lookback[29].senkou_b) > s.options.up)) {
          if (s.trend !== 'up') {
            s.acted_on_trend = false
          }
          s.trend = 'up'
          if (dupOrderWorkAround.checkForPriorBuy(s))
          s.signal = !s.acted_on_trend ? 'buy' : null
        }
      }
      if (s.options.sell !== false) {
        if ((s.period.low / s.downfractal < s.options.down) && (s.period.low / Math.max(s.lookback[29].senkou_a, s.lookback[29].senkou_b) < s.options.down)) {
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
      highest(s, 'tenkan_high', s.options.tenkan)
      lowest(s, 'tenkan_low', s.options.tenkan)
      highest(s, 'kijun_high', s.options.kijun)
      lowest(s, 'kijun_low', s.options.kijun)
      highest(s, 'senkou_high', s.options.senkou_b)
      lowest(s, 'senkou_low', s.options.senkou_b)
      s.period.tenkan = round(((s.period.tenkan_high + s.period.tenkan_low) / 2), 8)
      s.period.kijun = round(((s.period.kijun_high + s.period.kijun_low) / 2), 8)
      s.period.senkou_a = round(((s.period.tenkan + s.period.kijun) / 2), 8)
      s.period.senkou_b = round(((s.period.senkou_high + s.period.senkou_low) / 2), 8)
      s.period.chikou = round(s.lookback[s.options.chikou - 1].close, 8)
      if (s.lookback[3].high <= s.lookback[1].high && s.lookback[2].high <= s.lookback[1].high && s.lookback[0].high <= s.lookback[1].high && s.period.high <= s.lookback[1].high) {
        s.upfractal = s.lookback[1].high
      }
      if (s.lookback[3].low >= s.lookback[1].low && s.lookback[2].low >= s.lookback[1].low && s.lookback[0].low >= s.lookback[1].low && s.period.low >= s.lookback[1].low) {
        s.downfractal = s.lookback[1].low
      }
    }
    cb()
  },

  onReport: function (s) {
    var cols = []
    if (s.lookback[s.options.min_periods]) {
      if (!s.trend || s.trend == 'down') {
        cols.push(z(8, n(s.upfractal), ' '))
        cols.push(z(1, ' '))
        cols.push(z(8, n(Math.max(s.lookback[29].senkou_a, s.lookback[29].senkou_b)), ' '))
      }
      else if (s.trend == 'up') {
        cols.push(z(8, n(s.downfractal), ' '))
        cols.push(z(1, ' '))
        cols.push(z(8, n(Math.min(s.lookback[29].senkou_a, s.lookback[29].senkou_b)), ' '))
      }
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
