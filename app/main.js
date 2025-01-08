/*
Brief: Main entry point for the app.
*/

import * as utils from './utils.js';

const checkImgURL = 'https://img.icons8.com/color/30/approval--v1.png';
const crossImgURL = 'https://img.icons8.com/emoji/30/cross-mark-emoji.png';
let myWorker = null;
let cache = null;

if (localStorage.getItem('signed') === 'in') {
  cache = localStorage;
} else if (sessionStorage.getItem('signed') === 'in') {
  cache = sessionStorage;
}

if (cache !== null && !cache.getItem('autoSync')) document.getElementById('autoSync').checked = false;

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

function updateViewCount (type, increment=1) {
  const id = `${type}Views`;
  let viewCount = parseInt(cache.getItem(id) ?? 0);
  viewCount += parseInt(increment);
  document.getElementById(id).innerText = viewCount;
  cache.setItem(id, viewCount);
}

async function inbox (dataArray) {
  const container = document.querySelector('#inbox section');
  const inboxUnread = document.getElementById('unread');

  // Loop over all messages
  for (const data of dataArray) {
    const origin = data.FormID ?? 'NA';
    
    if (origin.startsWith('_view_')) {
      updateViewCount(origin.substring('_view_'.length));
      continue;
    }
    
    const chatID = data.ChatID;
    if (chatID) delete data.ChatID;

    const keysArray = Object.keys(data);
    keysArray.push('Reply');
    const category = await utils.hash(JSON.stringify(keysArray) + origin);

    // Prepare table header
    if (!document.getElementById(category)) {
      const details = document.createElement('details');
      details.setAttribute('name', 'inboxCategories');
      details.toggleAttribute('open', false);
      details.classList.add('my-4');
      container.append(details);

      const summary = document.createElement('summary');
      details.append(summary);
      summary.classList.add('d-flex', 'justify-content-between', 'alert', 'alert-warning');
      summary.innerHTML = `<span><strong>FormID:</strong> ${origin}</span>
      <span class="badge bg-primary rounded-pill" id="${category}Unread" hidden>0</span>`;

      const copyBtn = document.createElement('button');
      copyBtn.append('Copy table');
      copyBtn.classList.add('clipboard-js-btn', 'my-4');
      copyBtn.setAttribute('data-clipboard-target', `#${category}`);
      details.append(copyBtn);

      const div = document.createElement('div');
      div.classList.add('table-responsive');
      details.append(div);

      const table = document.createElement('table');
      table.classList.add('table', 'table-hover', 'table-striped');
      div.append(table);

      const tableHead = document.createElement('thead');
      tableHead.classList.add('table-dark');
      table.append(tableHead);
      const header = document.createElement('tr');
      tableHead.append(header);

      keysArray.forEach((key) => {
        const cell = document.createElement('th');
        header.append(cell);
        cell.append(key);
      });

      const tableBody = document.createElement('tbody');
      tableBody.setAttribute('id', category);
      table.append(tableBody);

      details.addEventListener('toggle', (event) => {
        if (details.open) {
          /* the element was toggled open */
          // Update unread message count
          const categoryUnread = summary.getElementsByClassName('badge')[0];
          inboxUnread.innerText = parseInt(inboxUnread.innerText) - parseInt(categoryUnread.innerText);
          categoryUnread.innerText = 0;
          categoryUnread.toggleAttribute('hidden', true);
        } else {
          /* the element was toggled closed */
          const rowList = tableBody.getElementsByTagName('tr');
          // Unaccentuate old messages
          for (let i = 1; i <= rowList.length; i++) {
            // Looping from bottom [rowList.length - i] to avoid unaccentuating new incoming messages
            // rowList.length is live, hence not assigned to const
            rowList[rowList.length - i].classList.remove('table-primary');
          }
        }
      });
    }

    // Create table row:
    const row = document.createElement('tr');

    // Loop over fields of a single message
    for (const key in data) {
      // Create cell:
      const cell = document.createElement('td');

      // Append cell to row:
      row.append(cell);

      // Append entry to cell:
      cell.append(data[key]);
    }

    const cell = document.createElement('td');
    row.append(cell);
    cell.innerHTML = `<button onclick="reply('${chatID}');">Reply</button>`;
    cell.getElementsByTagName('button')[0].toggleAttribute('disabled', !chatID);

    // Append row to table body:
    document.getElementById(category).prepend(row);

    // Accentuate row as new
    row.className = 'table-primary';

    // Update unread message count
    if (!row.checkVisibility()) {
      inboxUnread.innerText = parseInt(inboxUnread.innerText) + 1;
      const categoryUnread = document.getElementById(`${category}Unread`);
      categoryUnread.innerText = parseInt(categoryUnread.innerText) + 1;
      categoryUnread.toggleAttribute('hidden', false);
    }
  }
}

window.reply = async function reply (chatID) {
  logThis(`Replying to ${chatID}`);
  const url = await utils.privateUrlSecurelay(cache.getItem('appKey'));
  const replyDialog = document.getElementById('reply');
  const query = `?ok=${encodeURIComponent(checkImgURL)}&err=${encodeURIComponent(crossImgURL)}`;
  replyDialog.getElementsByTagName('form')[0].setAttribute('action', `${url}/${chatID}${query}`);
  replyDialog.showModal();
};

window.loadReply = async function loadReply (callingBtn) {
  try {
    const reply = await fetch(cache.getItem('formActionURL') + '/' + cache.getItem('testFormChatID'))
      .then((response) => {
        if (!response.ok) throw new Error(response.status);
        return response.json();
      })
      .then((data) => data['Message']);
    callingBtn.previousElementSibling.innerText = reply;
  } catch (err) {
    callingBtn.previousElementSibling.innerText = 'Found none';
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

function renderForms () {
  const formActionURL = cache.getItem('formActionURL');
  const appKey = cache.getItem('appKey');
  const publicKey = formActionURL.split('/').pop() + '@' + appKey.split('@').pop();
  logThis('Public key = ' + publicKey);
  document.getElementById('formActionURL').innerText = formActionURL;
  // document.getElementById("readyForm").href = `./${btoa(formActionURL).replace(/\+/g,'_').replace(/\//g,'-').replace(/=+$/,'')}`;
  const query = `?ok=${encodeURIComponent(checkImgURL)}&err=${encodeURIComponent(crossImgURL)}`;
  document.getElementById('testFormChatID').value = cache.getItem('testFormChatID');
  document.getElementById('testFormBtn').setAttribute('formaction', formActionURL + query);
  document.getElementById('testFormBtn').disabled = false;

  // Prepare the shareable links with the public key
  const shareableLinks = document.getElementsByClassName('shareable-link');
  for (let i=0; i < shareableLinks.length; i++) {
    const linkElement = shareableLinks[i].getElementsByClassName('link')[0];
    const keyElement = linkElement.getElementsByTagName('span')[0];
    const qrElement = shareableLinks[i].getElementsByClassName('qr')[0];
    keyElement.innerText = encodeURIComponent(publicKey);
    const url = linkElement.innerText;
    linkElement.href = url;
    qrElement.href = "https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=" + url;
    const type = shareableLinks[i].getAttribute('name');
    updateViewCount(type, 0);
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

  renderForms();
};

window.stopWorker = function stopWorker () {
  if (!myWorker) {
    return;
  }
  myWorker.terminate();
  myWorker = null;
  sessionStorage.setItem('server', 'stopped');
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
  OneSignalDeferred.push(async function(OneSignal) {
     await OneSignal.logout();
  });
  localStorage.clear();
  sessionStorage.clear();
  location.reload();
};

window.signIn = async function signIn (callerForm) {
  const data = new FormData(callerForm);
  const appKey = data.get('appKey');
  try {
    const formActionURL = await utils.publicUrlSecurelay(appKey);
    if (data.get('keepSignedIn') === 'on') {
      cache = localStorage;
    } else {
      cache = sessionStorage;
    }
    if (data.get('notifyMe') === 'on') {
      cache.setItem('notification', 'consent');
    } else {
      cache.setItem('notification', 'deny');
    }    
    const testFormChatID = await utils.hash(appKey, 'base64url', 5);
    cache.setItem('appKey', appKey);
    cache.setItem('formActionURL', formActionURL);
    cache.setItem('testFormChatID', testFormChatID);
    cache.setItem('signed', 'in');
    logThis('Sign-in successful');
    autoSyncToggle();
    callerForm.submit();
    main();
  } catch (err) {
    console.error(err);
    if (err.message == 404) {
      callerForm.getElementsByClassName('alert')[0].innerText = 'Provided key is wrong!';
    } else {
      callerForm.getElementsByClassName('alert')[0].innerText = 'Some error occurred!';
    }
    return false;
  }
};

window.TGconfig = function TGconfig (callerForm) {
  const submitterBtn = callerForm.getElementsByTagName('button')[1];
  submitterBtn.replaceChildren('Saving...');
  setTimeout(() => { submitterBtn.replaceChildren('Save'); callerForm.reset(); }, 2000);
  const formData = new FormData(callerForm);
  const dataObj = {};
  for (const [key, val] of formData.entries()) {
    console.log(key + ',' + val);
    dataObj[key] = val;
    cache.setItem(key, val);
  }
  if (myWorker) myWorker.postMessage({ cmd: 'cache', data: dataObj });
  submitterBtn.replaceChildren('Saved');
};

window.togglePasswordVisibility = function (elementID) {
  const input = document.getElementById(elementID);
  if (input.type === 'password') {
    input.type = 'text';
  } else {
    input.type = 'password';
  }
};

function OneSignalLogin () {
  if (cache.getItem('notification') == 'deny') return false;
  OneSignalDeferred.push(async function(OneSignal) {
    await OneSignal.init({
      appId: "78f332f2-1b40-4cf2-a849-b70f9ddd7219",
      notificationClickHandlerMatch: "origin",
      notificationClickHandlerAction: "focus",
      welcomeNotification: {
        title: "Formonit says ...",
        message: "You will get notified of incoming message(s). Restart the app for these changes to take effect.",
        url: "https://formonit.github.io"
      }
    });
    if (!OneSignal.Notifications.isPushSupported()) return false;
    if (!OneSignal.Notifications.permission) OneSignal.Notifications.requestPermission();
    if (!OneSignal.Notifications.permission) return false;
    const formActionURL = cache.getItem('formActionURL');
    const externalId = formActionURL.split('/').pop(); // Securelay public key is used as external_id
    // OneSignal logout, being async, may not complete during signout()
    // So lets logout once again from any previous logins under a different external_id
    // Login once as above sometimes doesnt seem to work without relaunching the app
    if (OneSignal.User.externalId !== externalId) {
      await OneSignal.logout();
      await OneSignal.login(externalId);
    }
    OneSignal.Notifications.addEventListener("foregroundWillDisplay", sync);
  });
}

// This function is to be run when our website/PWA/SPA loads.
// We can therefore safely run functions from other scripts here, e.g. spa, ClipboardJS and OneSignal.
window.main = function main () {
  spaHide('jsAlert');
  new ClipboardJS('.clipboard-js-btn');
  
  // Sign-in automatically if prior cache is found in localStorage or sessionStorage.
  // Otherwise, enable the 'login' button.
  if (cache !== null) {
    spaHide('login');
    OneSignalLogin();
    
    // Restore on page refresh , go to inbox on fresh load.
    // Prior sessionStorage exists only on page refresh and not on fresh load!
    if (sessionStorage.getItem('server')) {
      spaRestore();
    } else {
      spaGoTo('inbox');
    }
    
    startWorker();
  } else {
    document.getElementById('login').addEventListener('click', (event) => {
      document.getElementById('signIn').showModal();
      spaGoTo('forms');
    })
  }
};

if (document.readyState === 'loading') {
  // Loading hasn't finished yet
  logThis('Registering DOMContentLoaded event handler');
  document.addEventListener('DOMContentLoaded', main);
} else {
  // `DOMContentLoaded` has already fired
  logThis('Running main directly');
  main();
}
