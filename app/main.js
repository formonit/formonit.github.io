/*
Brief: Main entry point for the app.
*/

import * as utils from './utils.js';

const checkImgURL = 'https://img.icons8.com/color/30/approval--v1.png';
const crossImgURL = 'https://img.icons8.com/emoji/30/cross-mark-emoji.png';
let myWorker = null;
let cache = null;

let numReadMsgs = 0;
let numTotalMsgs = 0;

window.toggleDarkMode = function toggleDarkMode () {
  const rootElement = document.documentElement;
  const mainElement = document.querySelector('main > div');
  if (rootElement.getAttribute('data-bs-theme') == 'dark') {
    rootElement.setAttribute('data-bs-theme', 'light');
    mainElement.classList.remove('text-bg-dark');
    mainElement.classList.add('text-bg-light');
  } else {
    rootElement.setAttribute('data-bs-theme', 'dark');
    mainElement.classList.remove('text-bg-light');
    mainElement.classList.add('text-bg-dark');
  }
};

function logThis (report) {
  const logs = document.getElementById('logs');
  const row = document.createElement('p');
  row.append(`${Date()}: ${report}`);
  logs.prepend(row);
}

// Handler for updating the display of number of unread messages
window.updateUnreadCount = function updateUnreadCount () {
  if (spaCurrentPageID === 'inbox') {
    numReadMsgs = numTotalMsgs;
  }
  document.getElementById('unread').innerText = numTotalMsgs - numReadMsgs;
};

function inbox (dataArray) {
  for (const data of dataArray) {
    if (data.From === 'FormonitViewCounter') {
      let viewCount = cache.getItem('FormonitViewCounter');
      ++viewCount;
      document.getElementById('FormonitViewCounter').innerText = `which has ${viewCount} views`;
      cache.setItem('FormonitViewCounter', viewCount);
      continue;
    }

    data.Timestamp = Date();

    // Create table row:
    const row = document.createElement('tr');

    const header = document.getElementById('inboxHeader');
    if (!numTotalMsgs) { header.replaceChildren(); }

    for (const key in data) {
      // Create cell:
      const cell = document.createElement('td');

      // Create a text entry:
      const entry = data[key];

      // Append entry to cell:
      cell.append(entry);

      // Append cell to row:
      row.append(cell);

      if (!numTotalMsgs) {
        // Setup header according to the form fields. This is necessary as users may have custom form fields.
        // Create header block:
        const header_block = document.createElement('th');
        header_block.append(key);
        header.append(header_block);
      }
    }

    // Append row to table body:
    document.getElementById('inboxTable').prepend(row);

    // Update number of total messages
    ++numTotalMsgs;
    updateUnreadCount('new');
  }
}

window.genUUID = async function genUUID () {
  try {
    const appKey = await utils.keySecurelay();
    document.getElementById('uuid').value = appKey;
  } catch (err) {
    console.error(err);
    alert('Some error has occured!');
    return false;
  }
};

window.fetchChatID = async function fetchChatID (botAPIKey) {
  console.log('Fetching Telegram chat ID' + botAPIKey);
  try {
    const TGchatID = await utils.chatIDTG(botAPIKey);
    document.getElementById('chatID').value = TGchatID;
    document.getElementById('chatIDShow').value = TGchatID;
  } catch (e) {
    console.error(e);
    alert('Failed to fetch chat ID. Send any text to the Telegram Bot then try again.');
    return false;
  }
};

window.sync = function sync () {
  if (myWorker) myWorker.postMessage({ cmd: 'syncNow' });
};

function updateSyncStatusBadge () {
  const badge = document.getElementById('serverStatus');
  if (myWorker) {
    const autoSync = cache.getItem('autoSync');
    badge.innerHTML = autoSync ? 'auto <span class="spinner-grow spinner-grow-sm"></span>' : 'manual';
  } else {
    badge.innerHTML = 'off';
  }
}

window.autoSyncToggle = function autoSyncToggle () {
  if (cache.getItem('autoSync') === 'on') {
    cache.removeItem('autoSync');
    if (!myWorker) return;
    myWorker.postMessage({ cmd: 'autoSyncOff' });
    document.getElementById('serverStatus').innerText = 'manual';
  } else {
    cache.setItem('autoSync', 'on');
    if (!myWorker) return;
    myWorker.postMessage({ cmd: 'autoSyncOn' });
    updateSyncStatusBadge();
  }
};

window.startWorker = function startWorker () {
  if (myWorker) {
    return;
  } else {
    sessionStorage.setItem('server', 'live');
  }

  myWorker = new Worker('app/worker.js', { type: 'module' });

  // Register handler for messages from the background worker
  myWorker.onmessage = (e) => {
    const data = e.data;
    const errLvl = data.errlvl;
    const msg = data.msg;
    if (!errLvl) {
      inbox(msg);
      logThis(`Received: ${JSON.stringify(msg)}`);
    } else if (errLvl === 2) {
      stopWorker();
      logThis(`${msg}. Error: ${data.err.message}`);
      alert('App stopped due to some critical error. Check logs.');
    } else {
      logThis(`${msg}. Error: ${data.err.message}`);
    }
  };

  // init worker
  myWorker.postMessage({
    cmd: 'cache',
    data: {
      appKey: cache.getItem('appKey'),
      TGbotKey: cache.getItem('TGbotKey'),
      TGchatID: cache.getItem('TGchatID'),
      TGnotify: cache.getItem('TGnotify'),
      autoSync: cache.getItem('autoSync')
    }
  });

  // Launch sync
  myWorker.postMessage({ cmd: 'launch' });

  const toggleServer = document.getElementById('toggleServer');
  toggleServer.value = 'Stop syncing';
  toggleServer.disabled = false;

  logThis('Started sync');
  updateSyncStatusBadge();

  const formActionURL = cache.getItem('formActionURL');
  logThis('Public key = ' + formActionURL);
  document.getElementById('formActionURL').innerText = formActionURL;
  // document.getElementById("readyForm").href = `./${btoa(formActionURL).replace(/\+/g,'_').replace(/\//g,'-').replace(/=+$/,'')}`;
  const query = `?ok=${encodeURIComponent(checkImgURL)}&err=${encodeURIComponent(crossImgURL)}`;
  document.getElementById('testFormBtn').setAttribute('formaction', formActionURL + query);
  document.getElementById('testFormBtn').disabled = false;
};

window.stopWorker = function stopWorker () {
  if (!myWorker) {
    return;
  }
  myWorker.terminate();
  myWorker = null;
  sessionStorage.removeItem('server');
  console.log('Worker terminated');
  const toggleServer = document.getElementById('toggleServer');
  toggleServer.value = 'Start syncing';
  logThis('Stopped syncing');
  updateSyncStatusBadge();
};

window.toggleWorker = function toggleWorker () {
  if (myWorker != null) {
    stopWorker();
  } else {
    startWorker();
  }
};

window.signout = function signout () {
  stopWorker();
  localStorage.clear();
  sessionStorage.clear();
  location.reload();
};

window.signIn = async function signIn (callerForm) {
  const data = new FormData(callerForm);
  const appKey = data.get('appKey');
  if (data.get('keepSignedIn') === 'on') {
    cache = localStorage;
  } else {
    cache = sessionStorage;
  }
  try {
    const formActionURL = await utils.publicUrlSecurelay(appKey);
    cache.setItem('appKey', appKey);
    cache.setItem('formActionURL', formActionURL);
    cache.setItem('signed', 'in');
    spaHide('login');
    logThis('Sign-in successful');
    autoSyncToggle();
    startWorker();
  } catch (err) {
    console.error(err);
    if (err.message == 404) {
      alert('Provided key is wrong!');
    } else {
      alert('Some error occurred!');
    }
    return false;
  }
};

window.TGconfig = function TGconfig (callerForm) {
  const formData = new FormData(callerForm);
  const dataObj = {};
  for (const [key, val] of formData.entries()) {
    console.log(key + ',' + val);
    dataObj[key] = val;
    cache.setItem(key, val);
  }
  if (myWorker) myWorker.postMessage({ cmd: 'cache', data: dataObj });
  callerForm.reset();
};

window.togglePasswordVisibility = function (elementID) {
  var input = document.getElementById(elementID);
  if (input.type === "password") {
    input.type = "text";
  } else {
    input.type = "password";
  }
}

window.main = function main () {
  // Enable sign-in if no prior cache found in localStorage or sessionStorage
  if (cache !== null) {
    spaHide('login');
    startWorker();
    spaGoTo('inbox');
  } else {
    document.getElementById('signIn').showModal();
    spaGoTo('forms');
  }
};

if (localStorage.getItem('signed') === 'in') {
  cache = localStorage;
} else if (sessionStorage.getItem('signed') === 'in') {
  cache = sessionStorage;
}

if (cache !== null && !cache.getItem('autoSync')) document.getElementById('autoSync').checked = false;

if (sessionStorage.getItem('server')) {
  spaHide('login');
  startWorker();
}
