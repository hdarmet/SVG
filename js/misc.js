'use strict';

export function createUUID(){
    let dt = new Date().getTime();
    let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        let r = (dt + Math.random()*16)%16 | 0;
        dt = Math.floor(dt/16);
        return (c=='x' ? r :(r&0x3|0x8)).toString(16);
    });
    return uuid;
}

export function evaluate(label, code) {
    let begin = new Date().getMilliseconds();
    let result = code();
    let end = new Date().getMilliseconds();
    //console.log(label+": "+(end-begin));
    return result;
}