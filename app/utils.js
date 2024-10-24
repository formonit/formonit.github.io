/*
Brief: Helper utilities.
*/

/*
Brief: Convert URL or Percent-encoded string to JSON string.
*/
export function urlEncoded2Json(str){
    const arr = str.split('&');
    const obj = new Object();

    for (const el of arr) {
        let elArray = el.split('=');
        let val = decodeURIComponent(elArray[1].replace( /\+/g, ' ' )).replace(/"/g,'\\"'); // Decoded and escaped
        obj[elArray[0]]=val;
    }

    return JSON.stringify(obj);
}

/*
Brief: Send message to Telegram account chatting with your bot.
Error: Throws status code of the response when promise is rejected.
*/
export async function sendTG(botAPIKey, chatID, msg, timeout=4000) {
    const endpoint = `https://api.telegram.org/bot${botAPIKey}/sendMessage`;
    const payload = {chat_id: chatID, text: msg}; // conforming to Telegram API schema
    return fetch(endpoint, {
                method: "POST",
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(timeout)
            })
            .then((response) => {
                if (! response.ok) throw new Error(response.status);
            })
}

/*
Brief: Fetch chat ID of the Telegram account that last texted your bot.
Error: Throws status code of the response when promise is rejected.
*/
export async function chatIDTG(botAPIKey, timeout=4000) {
    const endpoint = `https://api.telegram.org/bot${botAPIKey}/getUpdates`;
    return fetch(endpoint, { signal: AbortSignal.timeout(timeout) })
            .then((response) => {
                if (! response.ok) throw new Error(response.status);
                return response.json();
            })
            .then((json) => {
                return json.result[0].message.chat.id;
            })
}

/*
Brief: GET at private path of Securelay. 
Arg: Key is string of the format `<privateKey>@<endpointID>`. Optionally provide webhook URL.
Error: Throws status code of the response when promise is rejected.
*/
export async function syncSecurelay(key, webhook=null, timeout=4000) {
    const [privateKey, endpointID] = key.split('@');
    const endpoint = await fetch("https://raw.githubusercontent.com/securelay/api/main/endpoints.json", {
                                signal: AbortSignal.timeout(timeout)
                            })
                            .then((response) => response.text())
                            .then((data) => JSON.parse(data)[endpointID][0]);
    let query = "";
    if (webhook) query=`?hook=${encodeURIComponent(webhook)}`;
    const url = `${endpoint}/private/${privateKey}${query}`;
    return fetch(url, { signal: AbortSignal.timeout(timeout) })
            .then((response) => {
                if (! response.ok) throw new Error(response.status);
                return response.json();
            })
}

/*
Brief: GET JSON from piping-server
Ref: https://github.com/nwtgck/piping-server
*/
export async function getPipe(path) {
    const endpoint = `https://ppng.io/${path}`
    return fetch(endpoint)
            .then((response) => {
                if (! response.ok) throw new Error(response.status);
                return response.json();
            })
}
