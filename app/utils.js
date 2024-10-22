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
export async function sendTG(botAPIKey, chatID, msg) {
    const endpoint = `https://api.telegram.org/bot${botAPIKey}/sendMessage`;
    const payload = {chat_id: chatID, text: msg}; // conforming to Telegram API schema
    return fetch(endpoint, {
                method: "POST",
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            })
            .then((response) => {
                if (! response.ok) throw response.status;
            })
}

/*
Brief: GET at private path of Securelay. 
Arg: String of the format `<privateKey>@<endpointID>`.
Error: Throws status code of the response when promise is rejected.
*/
export async function syncSecurelay(formonitKey) {
    const [privateKey, endpointID] = formonitKey.split('@');
    const endpoint = await fetch("https://raw.githubusercontent.com/securelay/api/main/endpoints.json")
                        .then((response) => response.text())
                        .then((data) => JSON.parse(data)[endpointID][0]);
    const url = `${endpoint}/private/${privateKey}`;
    return fetch(url)
            .then((response) => {
                if (! response.ok) throw response.status;
                return response.text();
            })
}
