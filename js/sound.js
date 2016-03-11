var d3 = require('d3');

module.exports.messages = function (words) {
  var volumeScale = d3.scale.linear().domain([0, 1]).range([.5, 1]);
  var pitchScale = d3.scale.linear().domain([0, 360]).range([2, 0]);

  return words.map(function (w, idx) {
    return {
      text: w.word,
      volume: volumeScale(volumeScale(w.magnitude)),
      pitch: pitchScale(w.idx)
    };
  });
}