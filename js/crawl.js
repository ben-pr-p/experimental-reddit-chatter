var $ = require('jquery');

module.exports.alltext = function () {
  var titles = [];
  $('div.thing').each(function (idx, title) {
    titles.push({
      text: $(title).find('.title').text(),
      time: Date.parse($(title).find('time').attr('title'))
    });
  });

  var commentText = '';
  var commentLinks = $('a.comments');

  var promises = [];
  commentLinks.each(function (idx, commLink) {
    var p = new Promise(function (resolve, reject) {
      $.get($(commLink).attr('href')).success(function (html) {

        var comments = [];
        $(html).find('div.thing').each(function (idx, comment) {
          comments.push({
            text: $(comment).find('.md').text(),
            time: Date.parse($(comment).find('time').attr('title'))
          });
        });

        resolve(comments);

      });
    });

    promises.push(p);
  });

  var results = {titles: titles, promise: Promise.all(promises)};
  return results;
}