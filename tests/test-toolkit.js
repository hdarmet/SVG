'use strict';

import {
    Context
} from "../js/toolkit.js";
import {
    win, KeyboardEvents
} from "../js/graphics.js";
import {
    same
} from "../js/misc.js";

let itCount = 0;
let itFailed = 0;

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

    setEqualsTo(model) {
        this._setEquals(model, this.value);
        return this;
    }

    unorderedEqualsTo(model) {
        if (!model || !(model instanceof Array)) {
            throw new AssertionError(`${model} is not an array.`);
        }
        if (!this.value || !(this.value instanceof Array)) {
            throw new AssertionError(`${this.value} is not an array.`);
        }
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
    }

}

export function assert(value) {
    return new Assertor(value);
}

let testSuite;
let startTime = new Date().getTime();

export class TestSuite {
    constructor(title) {
        this.title = title;
        testSuite = this;
        this.befores = [];
        this.its = [];
        console.log(title);
    }

    before(before) {
        this.befores.push(before);
    }

    it(caseTitle, testCase) {
        this.its.push({caseTitle, testCase});
        return this;
    }

    _execute() {

        function _executeIt(index) {
            function _done() {
                _executeIt.call(this, index + 1);
            }

            if (index<this.its.length) {
                try {
                    itCount++;
                    this.timeouts = [];
                    win.setTimeout = (action, delay)=> {
                        this.timeouts.push({delay, action});
                    };
                    for (let before of this.befores) {
                        before();
                    }
                    if (this.its[index].testCase.length===0) {
                        this.its[index].testCase();
                    }
                    else {
                        this.its[index].testCase(_done.bind(this));
                    }
                    let time = new Date().getTime() - startTime;
                    console.log(`- ${this.its[index].caseTitle} -> OK (${time})`)
                }
                catch (exception) {
                    let time = new Date().getTime() - startTime;
                    if (exception && (exception instanceof AssertionFailed)) {
                        console.log(`- ${this.its[index].caseTitle} -> FAILED (${time}): ${exception}`);
                    }
                    else {
                        console.log(`- ${this.its[index].caseTitle} -> ERROR (${time}): ${exception}`);
                    }
                    itFailed ++;
                }
                if (this.its[index].testCase.length===0) {
                    _done.call(this);
                }
            }
        }

        _executeIt.call(this, 0);
    }

    executeTimeouts() {
        this.timeouts.sort((timeout1, timeout2)=>timeout1.delay-timeout2.delay);
        for (let timeout of this.timeouts) {
            timeout.action();
        }
        this.timeouts = [];
    }
}

export function describe(title, procedure) {
    let testSuite = new TestSuite(title);
    procedure.call(testSuite);
    testSuite._execute();
}

export function before(before) {
    testSuite.before(before);
}

export function it(caseTitle, testCase) {
    testSuite.it(caseTitle, testCase);
}

export function result() {
    console.log(`${itCount} tests executed. ${itCount-itFailed} passed. ${itFailed} failed.`);
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
        this.bx = Context.canvas.baseLayer._root.globalMatrix.dx;
        this.by = Context.canvas.baseLayer._root.globalMatrix.dy;
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

