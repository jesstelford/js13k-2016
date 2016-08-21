'use strict';

var screenfull = require('screenfull');

var videoElement = document.createElement('video');
var canvasElement = document.querySelector('canvas');

videoElement.muted = true;
videoElement.autoplay = true;

function getVideoBySource(videoSource) {
  var constraints = {
    video: {
      deviceId: videoSource && videoSource.deviceId ? {exact: videoSource.deviceId} : undefined
    }
  };

  return navigator.mediaDevices.getUserMedia(constraints)
}

function askPermission() {
  return getVideoBySource();
}

function getDevices() {
  return navigator.mediaDevices.enumerateDevices();
}

function getRearFacingVideoSource(sources) {

  return getDevices().then(function (sources) {

    var videoSources = sources.filter(source => source.kind === 'videoinput')

    if (!videoSources.length) {
      throw new Error('Could not find any video sources');
    }

    var rearVideoSource;

    videoSources.some(function(sourceInfo) {
      var labelLower = sourceInfo.label.toLowerCase();
      if (
        labelLower.indexOf('back') !== -1
        || labelLower.indexOf('environment') !== -1
        || labelLower.indexOf('rear') !== -1
      ) {
        rearVideoSource = sourceInfo;
        return true;
      }
      return false;
    })

    return rearVideoSource || videoSources[0];

  });

}

function getVideoStream(source) {
  return getVideoBySource(source);
}


function gotStream(stream) {
  window.stream = stream; // make stream available to console
  videoElement.srcObject = stream;
  videoElement.addEventListener('loadeddata', function() {

    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;

    const videoRatio = videoElement.videoWidth / videoElement.videoHeight; // 480 / 640 = 0.75
    const screenRatio = window.innerWidth / window.innerHeight; // 412 / 604 = 0.682

    if (videoRatio < screenRatio) {
      // video tall and skinny compared to screen
      canvasElement.style.width = window.innerWidth + 'px';
    } else {
      // video short and wide compared to screen
      canvasElement.style.height = window.innerHeight + 'px';
    }

    const context = canvasElement.getContext('2d');
    const rAF = window.requestAnimationFrame;
    function render() {
      context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
      rAF(render);
    }
    rAF(render);
  });
}

function start() {

  document.querySelector('button').addEventListener('click', () => {

    if (screenfull.enabled) {

      document.addEventListener(screenfull.raw.fullscreenchange, () => {

        if (screenfull.isFullscreen) {
          askPermission()
            .then(getRearFacingVideoSource)
            .then(getVideoStream)
            .then(gotStream)
            .catch(handleError);
        }
      });

      screenfull.request();
    } else {
      // Ignore or do something else
      throw new Error('Couldnt go fullscreen');
    }
  });

}

start();

function handleError(error) {
  console.error('navigator.getUserMedia error: ', error);
}

function toggleFullscreen(on) {

}

// NOTE: Can only call this when in fullscreen mode
function lockOrientation(mode) {

  const windowScreen = window.screen;

  try {
    // old spec
    windowScreen.lockOrientation(mode);
  } catch (e) {
    try {
      // new spec
      windowScreen.orientation.lock(mode);
    } catch(e) {}
  }

}
