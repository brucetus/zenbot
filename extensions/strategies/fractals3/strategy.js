var z = require('zero-fill'),
n = require('numbro')

module.exports = {
  name: 'fractals3',
  description: 'Fractals3',

  getOptions: function () {
    this.option('period_length', 'period length', String, '4h')
    this.option('min_periods', 'min_periods', Number, 20)
    this.option('up', 'up', Number, 1.01)
    this.option('down','down', Number, 0.99)
  },

  calculate: function (s) {
    if (s.period.high / s.upfractal > s.options.up) {
      if (s.trend !== 'up') {
        s.acted_on_trend = false
      }
      s.trend = 'up'
      s.signal = !s.acted_on_trend ? 'buy' : null
    }
    if (s.period.low / s.downfractal < s.options.down) {
      if (s.trend !== 'down') {
        s.acted_on_trend = false
      }
      s.trend = 'down'
      s.signal = !s.acted_on_trend ? 'sell' : null
    }
  },

  onPeriod: function (s, cb) {
    if (s.lookback[5]) {
      if (s.lookback[5].high <= s.lookback[2].high && s.lookback[4].high <= s.lookback[2].high && s.lookback[3].high <= s.lookback[2].high && s.lookback[1].high <= s.lookback[2].high && s.lookback[0].high <= s.lookback[2].high && s.period.high <= s.lookback[2].high) {
        s.upfractal = s.lookback[2].high
      }
      if (s.lookback[5].low >= s.lookback[2].low && s.lookback[4].low >= s.lookback[2].low && s.lookback[3].low >= s.lookback[2].low && s.lookback[1].low >= s.lookback[2].low && s.lookback[0].low >= s.lookback[2].low && s.period.low >= s.lookback[2].low) {
        s.downfractal = s.lookback[2].low
      }
    }
    cb()
  },

  onReport: function (s) {
    var cols = []
    cols.push(z(8, n(s.upfractal), ' '))
    cols.push(z(1, ' '))
    cols.push(z(8, n(s.downfractal), ' '))
    return cols
  }
}
