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

export function assert(assertion) {
    console.assert(assertion);
}

export function getPropertyDescriptor(prototype, property) {
    let descriptor = Object.getOwnPropertyDescriptor(prototype, property);
    while (!descriptor && prototype) {
        prototype = prototype.__proto__;
        descriptor = Object.getOwnPropertyDescriptor(prototype, property);
    }
    return descriptor ? descriptor : null;
}

export function hasProperty(instance, property) {
    return !!getPropertyDescriptor(instance.__proto__, property);
}

export function same(v1, v2) {
    if (v1===v2) return true;
    if (v1!==0 && v2!==0 && (!v1 || !v2)) return false;
    return v1-v2>-0.0001 && v1-v2<0.001;
}

export function is(...classes) {
    return function(element) {
        for (let oneClass of classes) {
            if (element instanceof oneClass) return true;
        }
        return false;
    }
}

export function always() {
    return true;
}

export function isNumber(value) {
    return value===0 || value && typeof(value)==='string';
}

export function isString(value) {
    return value==="" || value && typeof(value)==='string';
}

export function isBoolean(value) {
    return value===true || value===false;
}

function _name(artifact) {
    let name = artifact.name;
    if (name.endsWith("_")) name = name.substring(0, name.length-1);
    return name;
}

export function defineMethod(superClass, methodImpl) {
    let name = _name(methodImpl);
    console.assert(!superClass.prototype[name]);
    superClass.prototype[name] = methodImpl;
}

export function extendMethod(superClass, builder) {
    let fun = builder();
    let name = _name(fun);
    let previousImpl = superClass.prototype[name];
    assert(superClass.prototype[name]);
    superClass.prototype[name] = builder(previousImpl);
}

export function proposeGetProperty(superClass, propImpl) {
    let name = _name(propImpl);
    if (!superClass.prototype.hasOwnProperty(name)) {
        Object.defineProperty(superClass.prototype, name, {
            configurable: true,
            get: propImpl
        });
    }
}

export function proposeProperty(superClass, getPropImpl, setPropImpl) {
    let name = _name(getPropImpl);
    if (!superClass.prototype.hasOwnProperty(name)) {
        Object.defineProperty(superClass.prototype, name, {
            configurable: true,
            get: getPropImpl,
            set: setPropImpl
        });
    }
}

export function defineGetProperty(superClass, propImpl) {
    let name = _name(propImpl);
    assert(!superClass.prototype.hasOwnProperty(name));
    Object.defineProperty(superClass.prototype, name, {
        configurable: true,
        get: propImpl
    });
}

export function defineProperty(superClass, getPropImpl, setPropImpl) {
    let name = _name(getPropImpl);
    assert(!superClass.prototype.hasOwnProperty(name));
    Object.defineProperty(superClass.prototype, name, {
        configurable: true,
        get: getPropImpl,
        set: setPropImpl
    });
}

export function replaceGetProperty(superClass, propImpl) {
    let name = _name(propImpl);
    Object.defineProperty(superClass.prototype, name, {
        configurable: true,
        get: propImpl
    });
}

export function replaceProperty(superClass, getPropImpl, setPropImpl) {
    let name = _name(getPropImpl);
    Object.defineProperty(superClass.prototype, name, {
        configurable: true,
        get: getPropImpl,
        set: setPropImpl
    });
}
