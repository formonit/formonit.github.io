/*
Brief: Background worker performing syncing/networking.
*/

import { sendTG, syncSecurelay, getPipe } from './utils.js';

let unique;

/*
Brief: Run a webhook server by polling piping-server. Collects only one POST request at a time.
Arg: Unique string. Callback function to be called when a POST is received.
*/
function pollPipe(unique, callback, errHandler) {
    getPipe(unique)
            .then((dataObj) => {console.log(dataObj); callback(dataObj)})
            .catch((err) => {
                err.cause = 'piping-server';
                errHandler(err);
            })
            .finally(() => setTimeout(pollPipe(...arguments), 0))
}

function pollSecurelay(key, callback, errHandler, webhook=null, pollInterval=null, timeout=10000) {
    syncSecurelay(key, webhook, timeout)
            .then((dataObj) => callback(dataObj))
            .catch((err) => {
                err.cause = 'securelay';
                errHandler(err);
            })
            .finally(() => {
                if (pollInterval) setTimeout(pollSecurelay(...arguments), pollInterval);
            })
}

function processData(TGbotKey, TGchatID){   
    function _handler(dataObj){
        sendTG(TGbotKey, TGchatID, JSON.stringify(dataObj))
            .catch((err) => {
                err.cause = 'sendTG';
                processError(err);
            })
        let dataObjArray;
        if (Array.isArray(dataObj)) {
            dataObjArray = dataObj;
        } else {
            dataObjArray = [dataObj];
        }
        self.postMessage({msg: dataObjArray, errlvl: 0, err: null});
    }
    
    return _handler;
}

function processError(err){
    console.error(err);
    if (err.message.toLowerCase().includes('timeout') || (err.message == 404)) {
        self.postMessage({msg: `Warning: Error during fetch from ${err.cause}.`, errlvl: 1, err: err});
    } else if (err.cause === 'sendTG') {
        self.postMessage({msg: `Warning: Error during post to Telegram.`, errlvl: 1, err: err});
    } else {
        self.postMessage({msg: `Fatal: Error during fetch from ${err.cause}.`, errlvl: 2, err: err});
    }
}

function handler(formonitKey, TGbotKey, TGchatID){   
    if (! unique) unique = crypto.randomUUID().split('-')[0]; //choose the first block of hex chars from a v4 UUID
    const webhook = `https://ppng.io/${unique}`;
    const pollInterval = unique?null:3600000;
    const _processData = processData(TGbotKey, TGchatID);
    pollSecurelay(formonitKey, _processData, processError, webhook, pollInterval);
    pollPipe(unique, _processData, processError);
}

// Register handler for the event of receiving any message from main
self.onmessage = (e) => {
  const msgObj = e.data;
  console.log("Message received from main script: " + JSON.stringify(msgObj));
  handler(msgObj.formonitKey, msgObj.TGbotKey, msgObj.TGchatID);
};
