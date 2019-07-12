module.exports = function ema (s, key, length, source_key) {
  if (!source_key) source_key = 'close'
  if (s.lookback.length = length) {
    var sum = 0
    let SMA = s.lookback
    .slice(0, length)
    .reduce((sum, cur) => {
      return sum + cur[source_key]
    }, 0)
    var init_sma = SMA / length
    s.period[key] = init_sma
  }
  if (s.lookback.length >= length) {
    var prev_ema = s.lookback[0][key]
    var multiplier = 2 / (length + 1)
    s.period[key] = (s.period[source_key] - prev_ema) * multiplier + prev_ema
  }
}
