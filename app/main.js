/*
Brief: Main entry point for the app.
*/

import * as utils from './utils.js';

let myWorker = null;
let numReadMsgs = 0;
let numTotalMsgs = 0;
const logs = document.getElementById('logs');
const toggleServer = document.getElementById('toggleServer');

if (! localStorage.getItem('autoSync')) document.getElementById('autoSync').checked = false;

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
      let viewCount = localStorage.getItem('FormonitViewCounter');
      ++viewCount;
      document.getElementById('FormonitViewCounter').innerText = `which has ${viewCount} views`;
      localStorage.setItem('FormonitViewCounter', viewCount);
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
  // v4 UUID looks like xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx in hexadecimal. See Wikipedia.
  // M stores version & N, the variant. All the x digits above are cryptographically random.
  // For our uuid we simply choose the first block of hex chars from a v4 UUID.
  const response = await fetch('https://securelay.vercel.app/keys');
  const keypair = await response.json();
  document.getElementById('uuid').value = keypair.private;
};

window.fetchChatID = async function fetchChatID () {
  logThis('Fetching Telegram chat ID');
  const apiEndpoint = 'https://api.telegram.org/bot' + document.getElementById('TGbotKey').value + '/getUpdates';
  const response = await fetch(apiEndpoint); // Make request
  if (!response.ok) {
    logThis(`Telegram API status code: ${response.status}. Is Bot API Token ok?`);
    alert('Failed to fetch chat ID. Check your Bot API Token!');
    return;
  }
  const data = await response.json();
  try {
    const TGchatID = data.result[0].message.chat.id;
    document.getElementById('chatID').value = TGchatID;
    localStorage.setItem('TGchatID', TGchatID);
  } catch (e) {
    alert('Failed to fetch chat ID. Send any text to the Telegram Bot then try again.');
  }
};

window.config = async function config () {
  const uuid = document.getElementById('uuid').value;
  const response = await fetch(`https://securelay.vercel.app/keys/${uuid}`);
  if (!response.ok) { alert('Invalid Formonit Access Key!'); return; }
  const respJson = await response.json();
  const pubKey = respJson.public;
  console.log('Public key = ' + pubKey);
  const getFrom = 'https://securelay.vercel.app/private/' + uuid;
  localStorage.setItem('getFrom', getFrom);
  localStorage.setItem('formonitKey', `${uuid}@alz2h`);
  localStorage.setItem('TGbotKey', document.getElementById('TGbotKey').value);
  // Use encodeURIComponent below
  const formActionURL = 'https://securelay.vercel.app/public/' + pubKey +
        '?ok=https%3A%2F%2Fimg.icons8.com%2Fcolor%2F30%2Fapproval--v1.png&err=https%3A%2F%2Fimg.icons8.com%2Femoji%2F30%2Fcross-mark-emoji.png';
  localStorage.setItem('formActionURL', formActionURL);
  const postTo = 'https://api.telegram.org/bot' + document.getElementById('TGbotKey').value + '/sendMessage';
  localStorage.setItem('postTo', postTo);
  spaHide('login');
  spaGoTo('admin');
  localStorage.setItem('loggedIn', 'true');
  startWorker();
};

window.sync = function sync () {
  if (myWorker) myWorker.postMessage({ cmd: 'syncNow' });
};

function updateSyncStatusBadge () {
  const badge = document.getElementById('serverStatus');
  if (myWorker) {
    const autoSync = localStorage.getItem('autoSync');
    badge.innerHTML = autoSync ? 'auto <span class="spinner-grow spinner-grow-sm"></span>' : 'manual';
  } else {
    badge.innerHTML = 'off';
  }
}

window.autosyncToggle = function autosyncToggle () {
  if (localStorage.getItem('autoSync') === 'on') {
    localStorage.removeItem('autoSync');
    if (! myWorker) return; 
    myWorker.postMessage({ cmd: 'autoSyncOff' });
    document.getElementById('serverStatus').innerText = 'manual';
  } else {
    localStorage.setItem('autoSync', 'on');
    if (! myWorker) return;
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

  console.log(localStorage.getItem('autoSync'));
  // init worker
  myWorker.postMessage({
    cmd: 'cache',
    data: {
      appKey: localStorage.getItem('formonitKey'),
      TGbotKey: localStorage.getItem('TGbotKey'),
      TGchatID: localStorage.getItem('TGchatID'),
      autoSync: localStorage.getItem('autoSync')
    }
  });

  // Launch sync
  myWorker.postMessage({ cmd: 'launch' });

  toggleServer.value = 'Stop syncing';
  toggleServer.disabled = false;

  logThis('Started sync');
  updateSyncStatusBadge();

  const formActionURL = localStorage.getItem('formActionURL');
  logThis('Public key = ' + formActionURL);
  document.getElementById('formActionURL').innerText = formActionURL;
  // document.getElementById("readyForm").href = `./${btoa(formActionURL).replace(/\+/g,'_').replace(/\//g,'-').replace(/=+$/,'')}`;
  document.getElementById('testFormBtn').setAttribute('formaction', formActionURL);
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
  location.reload();
};

window.main = function main () {
  // Enable config if no prior settings found in localStorage
  if (localStorage.getItem('loggedIn')) {
    spaHide('login');
    startWorker();
    spaGoTo('admin');
  } else {
    document.getElementById('signIn').showModal();
    spaGoTo('settings');
  }
};

if (sessionStorage.getItem('server')) {
  spaHide('login');
  startWorker();
}
