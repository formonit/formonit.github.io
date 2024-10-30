/*
Brief: Helper utilities.
*/

import securelayEndpoint, * as securelay from 'https://cdn.jsdelivr.net/gh/securelay/api@main/script.js';

/*
Brief: Convert URL or Percent-encoded string to JSON string.
*/
export function urlEncoded2Json (str) {
  const arr = str.split('&');
  const obj = new Object();

  for (const el of arr) {
    const elArray = el.split('=');
    const val = decodeURIComponent(elArray[1].replace(/\+/g, ' ')).replace(/"/g, '\\"'); // Decoded and escaped
    obj[elArray[0]] = val;
  }

  return JSON.stringify(obj);
}

/*
Brief: Send message to Telegram account chatting with your bot.
Error: Throws status code of the response when promise is rejected.
*/
export async function sendTG (botAPIKey, chatID, msg, timeout = 5000) {
  const endpoint = `https://api.telegram.org/bot${botAPIKey}/sendMessage`;
  const payload = { chat_id: chatID, text: msg }; // conforming to Telegram API schema
  return fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: timeout ? AbortSignal.timeout(timeout) : null
  })
    .then((response) => {
      if (!response.ok) throw new Error(response.status);
    });
}

/*
Brief: Fetch chat ID of the Telegram account that last texted your bot.
Error: Throws status code of the response when promise is rejected.
*/
export async function chatIDTG (botAPIKey, timeout = 5000) {
  const endpoint = `https://api.telegram.org/bot${botAPIKey}/getUpdates`;
  return fetch(endpoint, { signal: timeout ? AbortSignal.timeout(timeout) : null })
    .then((response) => {
      if (!response.ok) throw new Error(response.status);
      return response.json();
    })
    .then((json) => {
      return json.result[0].message.chat.id;
    });
}

/*
Brief: GET at private path of Securelay.
Arg: Key is string of the format `<privateKey>@<endpointID>`. Optionally provide webhook URL.
Error: Throws status code of the response when promise is rejected.
*/
export async function syncSecurelay (key, webhook = null, timeout = 5000) {
  console.log(key);
  const [privateKey, endpointID] = key.split('@');
  return securelay.sync(privateKey, endpointID, webhook, timeout);
}

export async function keySecurelay (timeout = 5000) {
  const [ _, endpointID ] = await securelayEndpoint();
  const privateKey = await securelay.key(endpointID, timeout);
  return `${privateKey}@${endpointID}`;
}

export async function publicUrlSecurelay (key, timeout = 5000) {
  const [privateKey, endpointID] = key.split('@');
  return securelay.publicUrl(privateKey, endpointID, timeout);
}

/*
Brief: GET JSON from piping-server
Ref: https://github.com/nwtgck/piping-server
*/
export async function getPipe (path, timeout = null) {
  const endpoint = `https://ppng.io/${path}`;
  return fetch(endpoint, { signal: timeout ? AbortSignal.timeout(timeout) : null })
    .then((response) => {
      if (!response.ok) throw new Error(response.status);
      return response.json();
    });
}
