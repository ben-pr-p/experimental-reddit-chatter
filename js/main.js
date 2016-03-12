var $ = require('jquery');
var d3 = require('d3');

var alltext = require('./crawl.js').alltext;
var greedySalesman = require('./salesman.js').greedySalesman;

var ctxts = require('./contexts');
var contexts = ctxts.contexts;
var joinContexts = ctxts.joinContexts;
var contextDiff = ctxts.contextDiff;

var sound = require('./sound');
var messages = sound.messages;
var speakMsg = sound.speakMsg;
var bindUserControls = sound.bindUserControls;

var numBuckets = 30;
var N = 5;
var firstRodeo = true;
var buttonText = 'Go!';

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

function doAudioVisual(groups, words, total) {
  // Remove the button
  var button = d3.select('.button');
  button.select('img').remove();

  // Create the svg
  var div = button.append('div')
    .classed('svg-container', true).style({ width: '100%', height: '100%' });

  var svg = div.append('svg')
    .classed('update-overlay', true).style({width: '100%', height: '100%' });

  // D3 scales for position and color
  var bucketXScale = d3.scale.linear().domain([0, numBuckets]).range([0, $('svg').outerWidth()]);
  var saturationScale = d3.scale.linear().domain([0, total]).range([.5, 1]);

  // Draw the distorted color gradient
  groups.forEach(function (group, groupIdx) {
    var x = bucketXScale(groupIdx);
    var width = bucketXScale(groupIdx + 1) - x;
    var base = 0;

    var sizeScale = d3.scale.linear().domain([0, 1]).range([0, $('svg').outerHeight()]);

    // draw each word, updating the base (y position)
    words.forEach(function (word, wordIdx) {
      if (!group[word.word]) return;

      var magnitude = group[word.word].count / group.totalCount;
      word.magnitude = magnitude;
      word.idx = wordIdx;
      var height = sizeScale(magnitude);
      var color = d3.hsl(wordIdx, saturationScale(group.totalCount), .5);

      d3.select('svg')
        .append('g').attr('transform', 'translate(' + x + ',' + base + ')')
        .append('rect')
          .attr({width: width, height: height, group: groupIdx, word: word.word})
          .style({fill: color});

      base += height;
    });
  });

  // Select the topN words from each group to speak
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

  bindUserControls();

  // Initialize the messages
  var msgs = [];
  groups.forEach(function (group, groupIdx) {
    group.messages.forEach(function (message, idx) {
      message.idx = idx;
      message.groupIdx = groupIdx;
      msgs.push(message);
    });
  });

  // Start speaking
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = function () {
    if (firstRodeo) {
      speakMsg(msgs[0], msgs);
      firstRodeo = false;
    }
  }
}

function processText() {
  var results = alltext();
  var everything = [].concat(results.titles);

  results.promise.then(function (comments) {
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
      words.push({ count: aggregate[w].count, context: aggregate[w].context, word: w });
    }

    // only keep top 360 most used words
    words.sort(function (a, b) {
      return b.count - a.count;
    });
    words = words.slice(0, 360);

    words.forEach(function (word) {
      groups.forEach(function (group) {
        if (!group.totalCount) group.totalCount = 0;

        if (group[word.word]) {
          group.totalCount += group[word.word].count;
        }
      });
    });

    words = greedySalesman(words, contextDiff);
    doAudioVisual(groups, words, total);
  });
}

function onButtonClick() {
  d3.select('.button').text('').transition().style(expandedStyle);

  d3.select('.button')
    .append('img').attr('src', chrome.extension.getURL('ajax-loader.gif'))
      .style({ height: '20%', width: '20%'});

  processText();
}


function addButton() {
  d3.select('body').append('div')
    .classed('button', true).text(buttonText).style(collapsedStyle).on('click', onButtonClick);
}


function main() {
  var url = window.location.href;
  if (url.indexOf('reddit.com') > 1) {
    addButton();
  } else {
    console.log("You're not on Reddit!");
  }
};

main();
