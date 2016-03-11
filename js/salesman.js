module.exports.greedySalesman = function (items, distanceFn) {
  var copy = items.slice();
  var result = [copy[0]];
  copy.splice(0, 1);

  while (copy.length > 0) {
    var current = result[result.length - 1];
    var closestIdx = null;
    var closestDist = Number.MAX_VALUE;

    copy.forEach(function (item, idx) {
      var dist = distanceFn(current.context, item.context);

      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = idx;
      }
    });

    result.push(copy[closestIdx]);
    copy.splice(closestIdx, 1);
  }

  return result;
}