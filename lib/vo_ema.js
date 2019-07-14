module.exports = function vo_ema (s, key, short, long, source_key) {
  if (!source_key) source_key = 'volume'
  if (s.lookback.length >= long) {
    if (typeof prev_long === 'undefined' || isNaN(prev_vo)) {
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
      let short_ema = (s.period[source_key] - prev_short) * short_mult + prev_short
      let long_ema = (s.period[source_key] - prev_long) * long_mult + prev_long
      s.period[key] = 100 * (short_ema - long_ema) / long_ema
    }
  }
