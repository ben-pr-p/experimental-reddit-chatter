var d3 = require('d3');

var rate = 1;
var voiceIdx = 0;
var utterance;
var voice;

exports.messages = function (words) {
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

function ondone() {
  var container = d3.select('.update-button').style(collapsedStyle).text(buttonText)
    .select('div').remove();
}

exports.bindUserControls = function () {
    // Bind user controls over voice and rate
  d3.select(window).on('keydown', function (ev) {
    switch(d3.event.keyCode) {
      case 38:
        rate = Math.min(rate + .5, 10);
        break;

      case 40:
        rate = Math.max(rate - .5, .5);
        break;

      case 82:
        voiceIdx = null;
        console.log('Turned on random voices.');
        break;

      case 37:
        voiceIdx = (voiceIdx != null) ? Math.max(voiceIdx - 1, 0) : Math.round(window.speechSynthesis.getVoices().length / 2);
        break;

      case 39:
        voiceIdx = (voiceIdx != null) ? Math.min(voiceIdx + 1, window.speechSynthesis.getVoices().length) : Math.round(window.speechSynthesis.getVoices().length / 2);
        break;

      case 96:
        voiceIdx = 0;
        break;
    }

    if ([38, 40].indexOf(d3.event.keyCode) > -1)
      console.log('Rate change: ' + rate.toString());

    if ([37, 39, 96].indexOf(d3.event.keyCode) > -1)
      console.log('Voice index change: ' + voiceIdx.toString());
  });
}

exports.speakMsg = function (msg, msgs) {
  if (!msg) return ondone();

  var v = Math.floor(Math.random() * window.speechSynthesis.getVoices().length);
  voice = window.speechSynthesis.getVoices()[voiceIdx == null ? v : voiceIdx];

  utterance = new SpeechSynthesisUtterance();
  utterance.voice = voice;
  utterance.text = msg.text;
  utterance.volume = msg.volume;
  utterance.lang = 'en-US';
  utterance.pitch = msg.pitch;
  utterance.rate = rate;

  var idxOfMsg = msgs.indexOf(msg);
  var nextMsg = msgs[idxOfMsg + 1];

  // cleaning
  var groupIdx = msg.groupIdx;
  var text = msg.text;

  msg = null;
  msgs.splice(idxOfMsg, 1);

  utterance.onstart = function (ev) {
    flash(groupIdx, text);
  }

  utterance.onend = function (ev) {
    exports.speakMsg(nextMsg, msgs);
  }

  window.speechSynthesis.speak(utterance);
}
