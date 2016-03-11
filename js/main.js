var $ = require('jquery');
var d3 = require('d3');
var alltext = require('./crawl.js').alltext;
var greedySalesman = require('./salesman.js').greedySalesman;
var ctxts = require('./contexts');
var contexts = ctxts.contexts;
var joinContexts = ctxts.joinContexts;
var contextDiff = ctxts.contextDiff;
var messages = require('./sound.js').messages;

function flash(groupIdx, word) {
  var el = d3.select('rect[group="' + groupIdx + '"][word="' + word + '"]');
  if (el.empty()) return;

  var white = d3.rgb(255,255,255);
  var prevColor = el.style('fill');

  el.style('fill', white);
  setTimeout(function () {
    el.style('fill', prevColor);
  }, 1000);
}

/**
 * [addSvg description]
 */
function addSvg() {
  return d3.select('.update-button').append('div')
    .classed('svg-container', true)
      .style({
        width: '100%',
        height: '100%'
      })
    .append('svg')
      .classed('update-overlay', true)
      .style({
        width: '100%',
        height: '100%'
      });
}

function done() {
  var container = d3.select('.update-button')
  container.select('div').remove();
  container.style(collapsedStyle);
  container.text('Chatter!');
}

var numBuckets = 30;
var N = 5;
var rate = 1;
var voiceIdx = null;

function renderVisuals(groups, words, total) {
  // remove loading thing
  d3.select('.update-button').select('img').remove();

  var svg = addSvg();
  var bucketXScale = d3.scale.linear().domain([0, numBuckets]).range([0, $('svg').outerWidth()]);
  var saturationScale = d3.scale.linear().domain([0, total]).range([.5, 1]);

  // loop through groups
  groups.forEach(function (group, groupIdx) {
    var x = bucketXScale(groupIdx);
    var width = bucketXScale(groupIdx + 1) - x;
    var base = 0;

    var sizeScale = d3.scale.linear().domain([0, 1]).range([0, $('svg').outerHeight()]);

    // draw each word, updating the base
    var groupMag = 0;
    words.forEach(function (word, wordIdx) {
      if (!group[word.word]) return;

      var magnitude = group[word.word].count / group.totalCount;
      word.magnitude = magnitude;
      word.idx = wordIdx;
      var height = sizeScale(magnitude); // NaN
      var color = d3.hsl(wordIdx, saturationScale(group.totalCount), .5);
      d3.select('svg')
        .append('g')
          .attr('transform', 'translate(' + x + ',' + base + ')')
        .append('rect')
          .attr('width', width)
          .attr('height', height)
          .attr('group', groupIdx)
          .attr('word', word.word)
          .style('fill', color);

      base += height;
    });
  });

  groups.forEach(function (group, groupIdx) {
    var groupWords = words.slice();
    groupWords.sort(function (a, b) {
      var bVal = group[b.word] ? group[b.word].count : 0;
      var aVal = group[a.word] ? group[a.word].count : 0;
      return bVal - aVal;
    });

    group.topN = groupWords.slice(0, N);
    group.messages = messages(group.topN);
  });

  d3.select(window).on('keydown', function (ev) {
    if (d3.event.keyCode == 38) {
      rate = Math.min(rate + .5, 10);
    } else if (d3.event.keyCode == 40) {
      rate = Math.max(rate - .5, .5);
    } else if (d3.event.keyCode == 82) {
      voiceIdx = null;
      console.log('Turned on random voices.');
    } else if (d3.event.keyCode == 37) {
      voiceIdx = voiceIdx ? Math.max(voiceIdx - 1, 0) : Math.round(window.speechSynthesis.getVoices().length / 2);
    } else if (d3.event.keyCode == 39) {
      voiceIdx = voiceIdx ? Math.min(voiceIdx + 1, window.speechSynthesis.getVoices().length) : Math.round(window.speechSynthesis.getVoices().length / 2);
    } else if (d3.event.keyCode == 96) {
      voiceIdx = 0;
    }
    console.log('Rate changed – now ' + rate);
    console.log('Voiceidx now ' + voiceIdx);
  });

  var msgs = [];
  groups.forEach(function (group, groupIdx) {
    group.messages.forEach(function (message, idx) {
      message.idx = idx;
      message.groupIdx = groupIdx;
      msgs.push(message);
    });
  });

  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = function () {
    speakMsg(msgs[0], msgs);
  }
}

function speakMsg(msg, msgs) {
  if (!msg) return done();

  var utterance = new SpeechSynthesisUtterance();
  utterance.voice = window.speechSynthesis.getVoices()[voiceIdx || 0];
  utterance.text = msg.text;
  utterance.volume = msg.volume;
  utterance.pitch = msg.pitch;
  utterance.rate = rate;

  var nextMsg = msgs[msgs.indexOf(msg) + 1];

  utterance.onstart = function (ev) {
    flash(msg.groupIdx, msg.text);
  }

  utterance.onend = function (ev) {
    speakMsg(nextMsg, msgs);
  }

  window.speechSynthesis.speak(utterance);
}

function doUpdate() {
  var results = alltext();
  var everything = [].concat(results.titles);

  results.promise.then(function (comments) {
    /*
     * Process the data
     */
    comments.forEach(function (c) {
      everything = everything.concat(c)
    });

    // Remove things with no associated time
    everything = everything.filter(function (item) {
      return !isNaN(item.time);
    });

    // Sort things by time
    var sorted = everything.sort(function (a, b) {
      return a.time <= b.time;
    });

    // groupScale will assign things to one of 30 groups by time
    var groupScale = d3.scale.linear().domain([sorted[0].time, sorted[sorted.length - 1].time]).range([0, numBuckets - .51]);
    var groups = [];

    // Add them to the groups
    sorted.forEach(function (item) {
      var chosenGroup = Math.round(groupScale(item.time));
      if (!groups[chosenGroup])
        groups[chosenGroup] = [];

      groups[chosenGroup].push(item);
    });

    var aggregate = {};
    var total = 0;
    var groups = groups.map(function (group) {
      var groupText = group.map(function (item) {return item.text;}).join(' ');
      var tokens = contexts(groupText);

      for (var word in tokens) {
        if (word == '') continue;

        if (!aggregate[word])
          aggregate[word] = {count: 0, context: {}}

        aggregate[word].count += tokens[word].count;
        total += tokens[word].count;
        aggregate[word].context = joinContexts([aggregate[word].context, tokens[word].context]);
      }

      return tokens;
    });

    var words = [];
    for (var w in aggregate) {
      words.push({
        count: aggregate[w].count,
        context: aggregate[w].context,
        word: w
      });
    }

    // only keep top 360 most used words
    words.sort(function (a, b) {
      return b.count - a.count;
    });
    words = words.slice(0, 360);

    words.forEach(function (word) {
      groups.forEach(function (group) {
        if (!group.totalCount) group.totalCount = 0;
        // this is NEVER happening – group.totalCount is always 0
        if (group[word.word]) {
          group.totalCount += group[word.word].count;
        }
      });
    });

    words = greedySalesman(words, contextDiff);
    renderVisuals(groups, words, total);
  });
}

var collapsedStyle = {
  position: 'fixed',
  top: '20px',
  right: '20px',
  float: 'right',
  height: '40px',
  width: '80px',
  'border-radius': '5px',
  'box-shadow': '5px 5px #666',
  'z-index': 1000,
  'text-align': 'center',
  'background-color': 'white',
  border: '1px solid black'
};

var expandedStyle = {
  height: '99%',
  width:'99%',
  top: '0px',
  right: '0px'
};

/**
 * [onUpdateClick description]
 * @return {[type]} [description]
 */
function onUpdateClick() {
  d3.select('.update-button')
    .text('')
    .transition()
      .style(expandedStyle);

  d3.select('.update-button')
    .append('img')
      .attr('src', chrome.extension.getURL('ajax-loader.gif'))
      .style({
        height: '20%',
        width: '20%'
      });

  doUpdate();
}

/**
 * [addUpdateButton description]
 */
function addUpdateButton() {
  d3.select('body').append('div')
    .classed('update-button', true)
    .text('Chatter!')
    .style(collapsedStyle)
    .on('click', onUpdateClick);
}

/**
 * [main description]
 * @return {[type]} [description]
 */
function main() {
  console.log('Plug in running...');
  var url = window.location.href;
  if (url.indexOf('reddit.com') > 1) {
    addUpdateButton();
  } else {
    console.log("You're not on Reddit!");
  }
};

main();
