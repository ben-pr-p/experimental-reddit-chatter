# experimental-reddit-chatter
A Chrome browser plug-in that creates an audio visual representation of recent activity on a subreddit.

# What is this?
This is an experimental method of linguistic data visualization and sonification based in a browser plug-in around Reddit.

Upon clicking "Go!", the browser plug-in does a shallow crawl of recent threads on the subreddit and stores them by the time they appeared. It then segments the text into 30 (configurable number) equally sized time periods, and computes the unigram word probability for the top 360 most frequent words (stopwords excluded). 

It additionally computes a context for each word in each time period using a simple proximity metric (in the sentence "Colorless green ideas sleep furiously", the generated context matrix is for `green` is : `{colorless: .5, green: 1, ideas: .5, sleep: .333, furiously: .25}`).

## Visuals

It uses the context matrix to decide the vertical layout of the words in the resulting model. The "distance" between two words is defined by the euclidean distance between their context matrices. The goal in the vertical layout is to have words with similar contexts appear next to each other, so I treat the vertical layout as a traveling salesman problem and use the simplest greedy algorithm.

Each word, mapped to a y position from 1-360, is then drawn as a box in each vertical bar. The color of the box is determined by the hue of the y position, such that from 1-360 we see the full rainbow. The height of the box is determined by the relative frequency of the word in that time period to the other words in that time period, such that a bigger box means it occupies a larger portion of the total words.

Thus, if each of the top 360 words appeared with equal frequency, you would see a perfect color gradient (very, very unlikely). 

## Audio

The audio uses the same data to map, but y position is mapped to frequency instead of hue, and the relative frequency of the word is mapped to volumne instead of size. I take the top 10 words for each time period and say them out loud at the respective frequency and volumne using the Web Speech API, which accesses the user's computer's native text to speech capabilities. 

Initially, words are spoken with a default voice. Pressing the left or right arrow changes the voice, and pressing `r` cycles through the different voices available randomly. Pressing `0` resets the voice to "Alex" on a Mac.

# Known Problems

* The plug-in can only speak so many words aloud before quietly failing, requiring a refresh to play again. I think this is because of memory issues, specifically because I was able to significantly expand the number of words before failing by exploying better memory management techniques.

* The use of color is not meaningful – I could probably think of a more meaningful and distinguishable feature of the data to map to the color of the output.

# Demo

<iframe width="420" height="315" src="https://www.youtube.com/embed/dVt91eAqk3s" frameborder="0" allowfullscreen></iframe>

# Installation
First, open terminal and type 
```
git clone https://github.com/ben-pr-p/experimental-reddit-chatter.git
cd experimental-reddit-chatter
npm install jquery
npm install d3
```

If you don't have `npm` installed, follow these instructions: http://blog.npmjs.org/post/85484771375/how-to-install-npm.

Open Chrome, go to preferences, and click on "Extensions" on the left.

Enable "Developer Mode" in the top right, and click `Load unpacked extension...`.

Select the recently cloned directory, visit Reddit, and you should be good to go!

# Development

I used `browserify` to bundle the code. Modify `src/*.js`, and run `browserify src/main.js -o bundle.js` to rebundle it. Don't forget to reload the extension in the Chrome extension manager.

I know it's bad practice to include the `bundle.js` in the git repository, but I wanted it to be easier for people to run.
