// Chaikin Money Flow
module.exports = function cmf (s, key, length) {
  if (s.lookback.length >= length) {
    let MFV = 0, SOV = 0
    s.lookback.slice(0, length - 1).forEach(function(period) {
      MFV = period.volume * ((period.close - period.low) - (period.high - period.close)) / (period.high - period.low)
      SOV = period.volume
    })
    s.period[key] = (MFV+length) / (SOV+length)
  }
}
