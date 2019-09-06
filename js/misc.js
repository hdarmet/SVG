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

export function getPropertyDescriptor(prototype, property) {
    let descriptor = Object.getOwnPropertyDescriptor(prototype, property);
    while (!descriptor && prototype) {
        prototype = prototype.__proto__;
        descriptor = Object.getOwnPropertyDescriptor(prototype, property);
    }
    return descriptor ? descriptor : null;
}

export function same(v1, v2) {
    if (v1===v2) return true;
    if (v1!==0 && v2!==0 && (!v1 || !v2)) return false;
    return v1-v2>-0.0001 && v1-v2<0.001;
}