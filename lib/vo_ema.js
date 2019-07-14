module.exports = function vo_ema (s, key, short, long, source_key) {
  if (s.lookback.length >= long) {
    if (typeof prev_long === 'undefined' || isNaN(prev_long)) {
      let shortV = s.lookback
      .slice(0, short - 1)
      .reduce((sum, cur) => {
        return sum + cur[source_key]
      }, 0)
      let longV = s.lookback
      .slice(0, long - 1)
      .reduce((sum, cur) => {
        return sum + cur[source_key]
      }, 0)
      var prev_short = shortV/short
      var prev_long = longV/short
    }
    let short_mult = 2 / (short + 1)
    let long_mult = 2 / (long + 1)
    if (short_ema && long_ema) {
      short_ema = (s.period.volume - short_ema) * short_mult + short_ema
      long_ema = (s.period.volume - long_ema) * long_mult + long_ema
    }
    else {
      var short_ema = (s.period.volume - prev_short) * short_mult + prev_short
      var long_ema = (s.period.volume - prev_long) * long_mult + prev_long
    }
    s.period[key] = 100 * (short_ema - long_ema) / long_ema
  }
}
