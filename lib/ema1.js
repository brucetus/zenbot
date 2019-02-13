module.exports = function ema1(s, key, length) {
  if (s.lookback.length >= length) {
    var prev_ema = s.lookback[0][key]
    if (typeof prev_ema === 'undefined' || isNaN(prev_ema)) {
      var sum = 0
      s.lookback.slice(0, length + 1).forEach(function (period) {
        sum += period.close
      })
      prev_ema = sum / length
    }
    var mult = (2 / (length + 1))
    s.period[key] = (s.period.close - prev_ema) * mult + prev_ema
  }
}
