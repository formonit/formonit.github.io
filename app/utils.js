/*
Brief: Helper utilities.
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
