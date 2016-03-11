var gapsize = 1;

var stopWords = require('./stopwords.json').stopwords;

module.exports.contexts = function (text) {
  var tokens = {};
  var words = text.split(/[^A-Za-z]+/g);
  var words = words.filter(function (word) {
    return stopWords.indexOf(word) == -1;
  });

  for (var idx = 0; idx < words.length; idx++) {
    var w = words[idx].toLowerCase();

    if (!tokens[w])
      tokens[w] = {count: 0, context: {}};

    tokens[w].count++;

    for (var gap = (-1 * gapsize); gap <= gapsize; gap++ ) {
      if (idx + gap >= 0 && idx + gap < words.length) {
        var other = words[idx + gap].toLowerCase();

        if (!tokens[w].context[other])
          tokens[w].context[other] = 0;

        if (gap == 0)
          tokens[w].context[other] += 2;
        else
          tokens[w].context[other] += 1 / Math.abs(gap);
      }
    }
  }

  return tokens;
}

module.exports.joinContexts = function (array) {
  var result = {};
  array.forEach(function (context) {
    for (var other in context) {
      if (result[other])
        continue;

      result[other] = context[other];
      array.forEach(function (otherContext) {
        if (otherContext != context) {
          if (otherContext[other])
            result[other] +=  otherContext[other];
        }
      });
    }
  });

  return result;
}

module.exports.contextDiff = function (a, b) {
  var rawDiff = 0;
  for (var key in a) {
    rawDiff += Math.pow(a[key] - (b[key] || 0), 2);
  }

  for (var key in b) {
    if (!a[key])
      rawDiff += Math.pow(b[key], 2);
  }

  return Math.sqrt(rawDiff);
}
