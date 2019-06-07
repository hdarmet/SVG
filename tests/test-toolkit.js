'use strict';

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

export class Assertor {
    constructor(value) {
        this.value = value;
    }

    _equalsTo(model, value) {
        if (model!==value) {
            throw new AssertionFailed(`${value} is not equal to ${model}`);
        }
    }

    _contains(model, value) {
        if (!value || value.indexOf(model)===-1) {
            throw new AssertionFailed(`${value} does not contain ${model}`);
        }
    }

    _arrayEqualsTo(model, value) {
        if (!model || !(model instanceof Array)) {
            throw new AssertionError(`${model} is not an array.`);
        }
        if (!value || !(this.value instanceof Array)) {
            throw new AssertionError(`${value} is not an array.`);
        }
        if (value.length!=model.length) {
            throw new AssertionFailed(`${value} is not equal to ${model}`);
        }
        for (let index=0; index<model.length; index++) {
            if (model[index] && (model[index] instanceof Array)) {
                this._arrayEqualsTo(model[index], value[index]);
            }
            else {
                this._equalsTo(model[index], value[index]);
            }
        }
    }

    equalsTo(model) {
        this._equalsTo(model, this.value);
        return this;
    }

    contains(model) {
        this._contains(model, this.value);
        return this;
    }

    arrayEqualsTo(model) {
        this._arrayEqualsTo(model, this.value);
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
                }
                if (this.its[index].testCase.length===0) {
                    _done.call(this);
                }
            }
        }

        _executeIt.call(this, 0);
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
