module.exports = function ema1(s, key, length) {
  if (s.lookback.length < length) {
    s.period[key] = 0
  } else {
    let mult = (2 / (length + 1))
    //s.period[key] = (s.period.close - (s.lookback[0][key])) * mult + (s.lookback[0][key])
    s.period[key] = s.period.close * mult + s.lookback[0][key]) * (1 – mult)
  }
}
