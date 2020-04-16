'use strict';

import {
    Context
} from "../js/toolkit.js";
import {
    win, doc, dom, KeyboardEvents
} from "../js/graphics.js";
import {
    same
} from "../js/misc.js";

let itCount = 0;
let itFailed = 0;

function round(number, precision=1) {
    return Math.round(number/precision)*precision;
}

let eventListeners = [];
let domAddEventListener = dom.addEventListener;
dom.addEventListener = function(node, event,  callback) {
    eventListeners.push({node, event, callback});
    domAddEventListener(node, event, callback);
};
dom.resetEventListeners = function() {
    for (let listener of eventListeners) {
        dom.removeEventListener(listener.node, listener.event, listener.callback);
    }
    eventListeners = [];
};

// To avoid Chrome bug...
let domClientWidth = dom.clientWidth;
dom.clientWidth = function(node) {
    return round(domClientWidth(node), 100);
};
let domClientHeight = dom.clientHeight;
dom.clientHeight = function(node) {
    return round(domClientHeight(node), 100);
};
let domGetBoundingClientRect = dom.getBoundingClientRect;
dom.getBoundingClientRect = function(node) {
    let box = domGetBoundingClientRect(node);
    return {left:round(box.left), top:round(box.top), right:round(box.right), bottom:round(box.bottom)};
};
let domGetCTM = dom.getCTM;
dom.getCTM = function(node) {
    let matrix = domGetCTM(node);
    return {a:round(matrix.a, 0.01), b:round(matrix.b, 0.01), c:round(matrix.c, 0.01), d:round(matrix.d, 0.01), e:round(matrix.e, 0.01), f:round(matrix.f, 0.01)};
};
/*
Object.defineProperty(win, "pageYOffset", {
    get() { return 0;}
});
*/
// End of Chrome bug... :( :( :(

export class AssertionFailed {
    constructor(message) {
        this.message = message;
    }

    toString() {
        return this.message;
    }
}

export class AssertionError {
    constructor(message) {
        this.message = message;
    }

    toString() {
        return this.message;
    }
}

let NUMBER_MARGIN = 0.0001;

export class Assertor {
    constructor(value) {
        this.value = value;
    }

    _equals(model, value) {
        if (typeof(model)==="number" && typeof(value)==="number") {
            if (value<model-NUMBER_MARGIN || value>model+NUMBER_MARGIN) {
                throw new AssertionFailed(`${value} is not equal to ${model}`);
            }
        } else if (model!==value) {
            throw new AssertionFailed(`${value} is not equal to ${model}`);
        }
    }

    _notEquals(model, value) {
        if (typeof(model)==="number" && typeof(value)==="number") {
            if (value>model-NUMBER_MARGIN && value<model+NUMBER_MARGIN) {
                throw new AssertionFailed(`${value} is equal to ${model}`);
            }
        } else if (model===value) {
            throw new AssertionFailed(`${value} is equal to ${model}`);
        }
    }

    _contains(model, value) {
        if (!value || value.indexOf(model)===-1) {
            throw new AssertionFailed(`${value} does not contain ${model}`);
        }
    }

    _arrayEquals(model, value) {
        if (!model || !(model instanceof Array)) {
            throw new AssertionError(`${model} is not an array.`);
        }
        if (!value || !(value instanceof Array)) {
            throw new AssertionError(`${value} is not an array.`);
        }
        if (value.length!=model.length) {
            throw new AssertionFailed(`${value} is not equal to ${model}`);
        }
        for (let index=0; index<model.length; index++) {
            if (model[index] && (model[index] instanceof Array)) {
                this._arrayEquals(model[index], value[index]);
            }
            else {
                this._equals(model[index], value[index]);
            }
        }
    }

    _objectEquals(model, value) {
        for (let key in model) {
            if (model[key] && (model[key] instanceof Array)) {
                this._arrayEquals(model[index], value[index]);
            }
            else {
                this._equals(model[key], value[key]);
            }
        }
    }

    _setEquals(model, value) {
        if (!model || !(model instanceof Set)) {
            throw new AssertionError(`${model} is not a set.`);
        }
        if (!value || !(value instanceof Set)) {
            throw new AssertionError(`${value} is not a set.`);
        }
        if (value.size!=model.size) {
            throw new AssertionFailed(`${value} is not equal to ${model}`);
        }
        for (let modelElement of model) {
            if (!value.has(modelElement)) {
                throw new AssertionFailed(`${model} does not contain ${value}`);
            }
        }
    }

    _arraySame(model, value) {
        if (!model || !(model instanceof Array)) {
            throw new AssertionError(`${model} is not an array.`);
        }
        if (!value || !(value instanceof Array)) {
            throw new AssertionError(`${value} is not an array.`);
        }
        if (value.length!=model.length) {
            throw new AssertionFailed(`${value} is not equal to ${model}`);
        }
        for (let index=0; index<model.length; index++) {
            if (model[index] && (model[index] instanceof Array)) {
                this._arraySame(model[index], value[index]);
            }
            else {
                this._same(model[index], value[index]);
            }
        }
    }

    _same(model, object) {
        if (model === object) return;
        if (model===null || model===undefined || object===null || object===undefined) {
            throw new AssertionFailed(`${object} is not equal to ${model}`);
        }
        if (typeof(model)==='object' || typeof(object)==='object') {
            if (model.constructor !== object.constructor) {
                throw new AssertionFailed(`${object} and ${model} are not of same type.`);
            }
            if (model instanceof Array) {
                this._sameArray(model, object);
            }
            else {
                let modelPropNames = Object.getOwnPropertyNames(model);
                for (let propName of modelPropNames) {
                    let modelValue = model[propName];
                    let objectValue = object[propName];
                    this._same(modelValue, objectValue);
                }
            }
        }
        else {
            this._equals(model, object);
        }
    }

    fail() {
        try {
            this.value();
        }
        catch(exception) {
            return;
        }
        throw new AssertionError("No exception thrown");
    }

    sameTo(model) {
        this._same(model, this.value);
        return this;
    }

    equalsTo(model) {
        this._equals(model, this.value);
        return this;
    }

    notEqualsTo(model) {
        this._notEquals(model, this.value);
        return this;
    }

    isDefined() {
        if (this.value===null || this.value===undefined) {
            throw new AssertionFailed(`Not defined`);
        }
        return this;
    }

    isNotDefined() {
        if (this.value!==null && this.value!==undefined) {
            throw new AssertionFailed(`Defined`);
        }
        return this;
    }

    isTrue() {
        if (!this.value) {
            throw new AssertionFailed(`Not false.`);
        }
        return this;
    }

    isFalse() {
        if (this.value) {
            throw new AssertionFailed(`Not true.`);
        }
        return this;
    }

    contains(model) {
        this._contains(model, this.value);
        return this;
    }

    arrayEqualsTo(model) {
        this._arrayEquals(model, this.value);
        return this;
    }

    objectEqualsTo(model) {
        this._objectEquals(model, this.value);
        return this;
    }

    setEqualsTo(model) {
        this._setEquals(model, this.value);
        return this;
    }

    unorderedEqualsTo(model) {
        if (!model || !(model instanceof Array)) {
            throw new AssertionError(`${model} is not an array.`);
        }
        let value = [...this.value];
        this._setEquals(new Set(model), new Set(this.value));
        return this;
    }

    hasContent(...elements) {
        if (this.value.length!==elements.length) {
            throw new AssertionFailed(`${this.value} has not same length than ${elements}`);
        }
        for (let index=0; index<elements.length; index++) {
            if (this.value[index]!==elements[index]) {
                throw new AssertionFailed(`${this.value[index]} is not equal to ${elements[index]}`);
            }
        }
        return this;
    }

    hasNodeEqualsTo(node) {
        if (!this.value._root._node.isEqualNode(node)) {
            throw new AssertionFailed(`${this.value._root._node.outerHTML} is not equals to ${node.outerHTML}`);
        }
        return this;
    }
}

export function cloneNode(element) {
    return element._root._node.cloneNode(true);
}

export function assert(value) {
    return new Assertor(value);
}

let testSuite;
let startTime = new Date().getTime();
let suites = [];

function executeNextSuite(suite) {
    let next = suite ? suites.indexOf(suite)+1 : 0;
    if (next<suites.length) {
        suites[next].execute();
    }
    else {
        console.log(`${itCount} tests executed. ${itCount-itFailed} passed. ${itFailed} failed.`);
    }
}

export class TestSuite {
    constructor(title) {
        this.title = title;
        testSuite = this;
        this.befores = [];
        this.its = [];
        this.index=0;
        suites.push(this);
    }

    before(before) {
        this.befores.push(before);
    }

    it(caseTitle, testCase) {
        this.its.push({caseTitle, testCase});
        return this;
    }

    _executeIt() {
        function _done() {
            this._processSuccess();
            this.index++;
            this._executeIt();
        }

        if (this.index<this.its.length) {
            try {
                itCount++;
                this.timeouts = [];
                win.setTimeout = (action, delay)=> {
                    this.timeouts.push({delay, action});
                };
                dom.resetEventListeners();
                for (let before of this.befores) {
                    before();
                }
                if (this.its[this.index].testCase.length===0) {
                    try {
                        this.its[this.index].testCase();
                    } finally {
                        this.executeTimeouts();
                    }
                    this._processSuccess();
                    this.index++;
                    this._executeIt();
                }
                else {
                    this.its[this.index].testCase(_done.bind(this));
                }
            }
            catch (exception) {
                this._processException(exception);
                this.index++;
                this._executeIt();
            }
        }
        else {
            executeNextSuite(this);
        }
    }

    execute() {
        testSuite = this;
        console.log(this.title);
        this._executeIt(0);
    }

    _processException(exception) {
        let time = new Date().getTime() - startTime;
        if (exception && (exception instanceof AssertionFailed)) {
            console.log(`- ${this.its[this.index].caseTitle} -> FAILED (${time}): ${exception}`);
        }
        else {
            console.log(`- ${this.its[this.index].caseTitle} -> ERROR (${time}): ${exception}`);
        }
        itFailed ++;
    }

    _processSuccess() {
        let time = new Date().getTime() - startTime;
        console.log(`- ${this.its[this.index].caseTitle} -> OK (${time})`);
    }

    executeTimeouts() {
        this.timeouts.sort((timeout1, timeout2)=>timeout1.delay-timeout2.delay);
        for (let timeout of this.timeouts) {
            timeout.action();
        }
        this.timeouts = [];
    }

}

export function defer(func, delay) {
    setTimeout(()=>{
        try {
            func();
        }
        catch (exception) {
            testSuite._processException(exception);
            testSuite.index++;
            testSuite._executeIt();
        }
    }, delay)
}

export function describe(title, procedure) {
    testSuite = new TestSuite(title);
    procedure.call(testSuite);
}

export function before(before) {
    testSuite.before(before);
}

export function it(caseTitle, testCase) {
    testSuite.it(caseTitle, testCase);
}

export function result() {
    executeNextSuite();
}

export function executeTimeouts() {
    testSuite.executeTimeouts();
}

export function clickOn(target, specs) {
    let eventSpecs = {bubbles:true};
    specs && Object.assign(eventSpecs, specs);
    let event = new MouseEvent('click', eventSpecs);
    target._shape._node.dispatchEvent(event);
}

class Drag {

    constructor(item) {
        this._item = item;
        this.bx = Context.canvas.baseLayer._content.globalMatrix.dx;
        this.by = Context.canvas.baseLayer._content.globalMatrix.dy;
    }

    from(x, y, specs) {
        let eventSpecs = {bubbles:true, clientX:x+this.bx, clientY:y+this.by};
        specs && Object.assign(eventSpecs, specs);
        let event = new MouseEvent('mousedown', eventSpecs);
        this._item._shape._node.dispatchEvent(event);
        return this;
    }

    through(x, y, specs) {
        let eventSpecs = {bubbles:true, clientX:x+this.bx, clientY:y+this.by};
        specs && Object.assign(eventSpecs, specs);
        let event = new MouseEvent('mousemove', eventSpecs);
        this._item._shape._node.dispatchEvent(event);
        return this;
    }

    hover(target, x=0, y=0, specs) {
        let eventSpecs = {bubbles:true, clientX:target.gx+x, clientY:target.gy+y};
        specs && Object.assign(eventSpecs, specs);
        let event = new MouseEvent('mousemove', eventSpecs);
        this._item._shape._node.dispatchEvent(event);
        return this;
    }

    to(x, y, specs) {
        this.through(x, y, specs);
        let eventSpecs = {bubbles:true, clientX:x+this.bx, clientY:y+this.by};
        specs && Object.assign(eventSpecs, specs);
        let event = new MouseEvent('mouseup', eventSpecs);
        this._item._shape._node.dispatchEvent(event);
        return this;
    }

    at(target, x=0, y=0, specs) {
        let eventSpecs = {bubbles:true, clientX:target.gx+x, clientY:target.gy+y};
        specs && Object.assign(eventSpecs, specs);
        let event = new MouseEvent('mousedown', eventSpecs);
        this._item._shape._node.dispatchEvent(event);
        return this;
    }

    on(target, x=0, y=0, specs) {
        this.hover(target, x, y, specs);
        let eventSpecs = {bubbles:true, clientX:target.gx+x, clientY:target.gy+y};
        specs && Object.assign(eventSpecs, specs);
        let event = new MouseEvent('mouseup', eventSpecs);
        this._item._shape._node.dispatchEvent(event);
        return this;
    }
}

export class Snapshot {

    constructor(object) {
        this._snapshot = {};
        for (let name of Object.getOwnPropertyNames(object)) {
            this._snapshot[name] = object[name];
        }
    }

    assert(object) {
        for (let name of Object.getOwnPropertyNames(object)) {
            assert(this._snapshot[name]).sameTo(object[name]);
        }
    }

}

export function drag(item) {
    return new Drag(item);
}

class Keyboard {

    ctrl(value) {
        return (type) => {
            return new KeyboardEvent(type, {
                bubbles: true,
                cancelable: true,
                key: value, char: value, ctrlKey: true
            });
        }
    }

    get delete() {
        return (type) => {
            return new KeyboardEvent(type, {
                bubbles: true,
                cancelable: true,
                key: "Delete", char: 127, ctrlKey: true
            });
        }
    }

    input(eventGenerator) {
        Context.anchor.dispatchEvent(eventGenerator(KeyboardEvents.KEY_DOWN));
        Context.anchor.dispatchEvent(eventGenerator(KeyboardEvents.KEY_UP));
    }

}

export let keyboard = new Keyboard();

export function findChild(element, x, y) {
    if (element.children) {
        for (let child of element.children) {
            if (same(child.lx, x) && same(child.ly, y)) {
                return child;
            }
        }
    }
    return null;
}

