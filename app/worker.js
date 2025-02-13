/* eslint-env worker */
/*
Brief: Background worker performing syncing/networking.
*/

import { sendTG, syncSecurelay, getPipe, randHexString } from './utils.js';

const cache = new Map();

/*
Brief: Run a webhook server by polling piping-server. Collects only one POST request at a time.
*/
function pollPipe (callback, errHandler, pollInterval = 0, timeout = null) {
  const path = (cache.get('webhook')).split('/').pop();
  getPipe(path, timeout)
    .then((dataObj) => { console.log(dataObj); callback(dataObj); })
    .catch((err) => {
      err.cause = 'piping-server';
      errHandler(err);
    })
    .finally(() => {
      // `arguments` object below contains arguments of the non-arrow function pollPipe that encloses this scope
      if (pollInterval !== null && cache.get('autoSync')) cache.set('pollPipeTimeout', setTimeout(() => pollPipe(...arguments), pollInterval));
    });
}

function pollSecurelay (callback, errHandler, pollInterval = 3600000, timeout = 10000) {
  syncSecurelay(cache.get('appKey'), { webhook: cache.get('webhook'), timeout: timeout })
    .then((dataObj) => callback(dataObj))
    .catch((err) => {
      err.cause = 'securelay';
      errHandler(err);
    })
    .finally(() => {
      // `arguments` object below contains arguments of the non-arrow function pollSecurelay that encloses this scope
      if (pollInterval !== null && cache.get('autoSync')) cache.set('pollSecurelayTimeout', setTimeout(() => pollSecurelay(...arguments), pollInterval));
    });
}

function processData (dataObj) {
  const TGnotify = cache.get('TGnotify');
  const TGbotKey = cache.get('TGbotKey');
  const TGchatID = cache.get('TGchatID');
  if (TGnotify && TGbotKey && TGchatID) {
    sendTG(TGbotKey, TGchatID, JSON.stringify(dataObj))
      .catch((err) => {
        err.cause = 'sendTG';
        processError(err);
      });
  }
  let dataObjArray;
  if (Array.isArray(dataObj)) {
    dataObjArray = dataObj;
  } else {
    dataObjArray = [dataObj];
  }
  self.postMessage({ msg: dataObjArray, errlvl: 0, err: null });
}

function processError (err) {
  console.error(err);
  if (err.message.toLowerCase().includes('timeout') || (err.message == 404)) {
    self.postMessage({ msg: `Warning: Error during fetch from ${err.cause}.`, errlvl: 1, err });
  } else if (err.cause === 'sendTG') {
    self.postMessage({ msg: 'Warning: Error during post to Telegram.', errlvl: 1, err });
  } else {
    self.postMessage({ msg: `Fatal: Error during fetch from ${err.cause}.`, errlvl: 2, err });
  }
}

function handler (msgObj) {
  console.log('Message received from main script: ' + JSON.stringify(msgObj));
  const cmd = msgObj.cmd;
  const data = msgObj.data;

  switch (cmd) {
    case 'cache':
      for (const prop in data) {
        cache.set(prop, data[prop]);
      }
      // For a unique string, choose the first block of hex chars from a v4 UUID
      cache.set('webhook', `https://ppng.io/${randHexString()}`);
      break;
    case 'launch':
      pollSecurelay(processData, processError);
      pollPipe(processData, processError);
      break;
    case 'autoSyncOn':
      if (!cache.get('autoSync')) {
        pollSecurelay(processData, processError);
        pollPipe(processData, processError);
        cache.set('autoSync', 'on');
      }
      break;
    case 'autoSyncOff':
      if (cache.get('autoSync')) {
        clearTimeout(cache.get('pollSecurelayTimeout'));
        clearTimeout(cache.get('pollPipeTimeout'));
        cache.delete('autoSync');
      }
      break;
    case 'syncNow':
      pollSecurelay(processData, processError, null);
      break;
    default:
      const err = new Error('Command not found');
      err.cause = 'handler';
      processError(err);
  }
}

// Register handler for the event of receiving any message from main
self.onmessage = (e) => handler(e.data);
