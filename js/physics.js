'use strict';

import {
    win, List, evaluate
} from "./svgbase.js";
import {
    Box
} from "./toolkit.js";

export class Physic {

    constructor(host, ...args) {
        this._host = host;
        this._init(...args);
        this._triggered = false;
    }

    get host() {
        return this._host;
    }

    _init(...args) {}

    _trigger() {
        if (!this._triggered) {
            this._triggered = true;
            win.setTimeout(()=>{
                this.refresh();
            }, 0);
        }
    }

    resize(width, height) {
        this._trigger();
        this._resize(width, height);
    }

    reset() {
        this._trigger();
        this._reset();
    }

    hover(elements) {
        this._hover(elements);
        this._refresh();
    }

    refresh() {
        try {
            this._refresh();
        }
        finally {
            this._triggered = false;
        }
    }

    add(element) {
        this._trigger();
        this._add(element);
    }

    remove(element) {
        this._trigger();
        this._remove(element);
    }

    _reset() {}
    _refresh() {}
    _hover(elements) {}
    _add() {}
    _remove() {}
    _resize() {}
}

export function makePositionningPhysic(superClass) {

    superClass.prototype._init = function(positionsFct, ...args) {
        this._positionsFct = positionsFct;
        this._elements = new Set();
    };

    superClass.prototype._refresh = function() {
        for (let element of this._elements) {
            this._refreshElement(element);
        }
        if (this._hoveredElements) {
            for (let element of this._hoveredElements) {
                this._refreshElement(element);
            }
            this._hoveredElements.clear();
        }
        this._elements.clear();
    };

    superClass.prototype._reset = function() {
        this._elements = new Set(this._host.children);
    };

    superClass.prototype._hover = function(elements) {
        this._hoveredElements = new List(...elements);
    };

    superClass.prototype._add = function(element) {
        this._elements.add(element);
    };

    superClass.prototype._refreshElement = function(element) {
        let lx = element.lx;
        let ly = element.ly;
        let distance = Infinity;
        let position = {x:lx, y:ly};
        let positions = this._positionsFct.call(this._host, element);
        for (let _position of positions) {
            let _distance = (_position.x-lx)*(_position.x-lx)+(_position.y-ly)*(_position.y-ly);
            if (_distance<distance) {
                distance = _distance;
                position = _position;
            }
        }
        element.move(position.x, position.y);
    };

    return superClass;
}

export class PositionningPhysic extends Physic {
    constructor(...args) {
        super(...args);
    }

    clone(duplicata) {
        let _copy = new PositionningPhysic(duplicata.get(this._host), this._positionsFct);
        _copy._trigger();
        return _copy;
    }
}
makePositionningPhysic(PositionningPhysic);

export function addPhysicToContainer(superClass, physicCreator) {

    let initContent = superClass.prototype._initContent;
    superClass.prototype._initContent = function(...args) {
        let result = initContent.call(this, ...args);
        this._initPhysic();
        return result;
    };

    superClass.prototype._initPhysic = function() {
        this._physic = physicCreator.call(this);
        return this;
    };

    let add = superClass.prototype._add;
    superClass.prototype._add = function(element) {
        add.call(this, element);
        this._physic.add(element);
    };

    let insert = superClass.prototype._insert;
    superClass.prototype._insert = function(previous, element) {
        insert.call(this, previous, element);
        this._physic.add(element);
    };

    let replace = superClass.prototype._replace;
    superClass.prototype._replace = function(previous, element) {
        replace.call(this, previous, element);
        this._physic.add(element);
        this._physic.remove(element);
    };

    let remove = superClass.prototype._remove;
    superClass.prototype._remove = function(element) {
        remove.call(this, element);
        this._physic.remove(element);
    };

    let hover = superClass.prototype.hover;
    superClass.prototype.hover = function(elements) {
        hover && hover.call(this, elements);
        this._physic.hover(elements);
    };

    let setsize = superClass.prototype._setSize;
    superClass.prototype._setSize = function(width, height) {
        setsize && setsize.call(this, width, height);
        this._physic.resize(width, height);
    };

    let superMemento = superClass.prototype._memento;
    if (superMemento) {
        let recover = superClass.prototype._recover;
        superClass.prototype._recover = function (memento) {
            if (recover) recover.call(this, memento);
            this._physic.reset();
        }
    }
}

export function makePositionningContainer(superClass, positionsFct) {

    addPhysicToContainer(superClass, function() {
        return new PositionningPhysic(this, positionsFct);
    });

    return superClass;
}

export function insertionSort(array, comparator = (a, b) => a - b) {
    let delta = array.length && array[0].removed ? 1 : 0;
    for (let index = 1; index < array.length; index++) {
        let tmp = array[index];
        if (tmp.removed) {
            delta++;
        } else {
            let idx2 = index - delta;
            while (idx2 > 0 && comparator(array[idx2 - 1], tmp) > 0) {
                array[idx2] = array[idx2 - 1];
                idx2 = idx2 - 1;
            }
            array[idx2] = tmp;
        }
    }
    array.length -= delta;
}

let COLLISION_MARGIN = 0.0001;
let ADJUST_MARGIN = 40;

export function dichotomousSearch(array, value, comparator = (a, b) => a - b) {
    let start = 0;
    let end = array.length - 1;

    while (start <= end) {
        let half = Math.floor((start + end) / 2);
        let cmp = comparator(value, array[half]);
        if (cmp === 0) return half;
        else if (cmp > 0) start = half + 1;
        else end = half - 1;
    }
    return start;
}

export class SAPRecord {

    constructor(element, sweepAndPrune, ...args) {
        this._sweepAndPrune = sweepAndPrune;
        this.createBounds(element, ...args);
    }

    _createBound(element) {
        let geometry = this._element.localGeometry;
        let widthSlim = geometry.left===geometry.right;
        let heightSlim = geometry.top===geometry.bottom;
        let bound = {
            left: {first: true, value: geometry.left, slim:widthSlim, element, index: -1, opened: new Set([element])},
            right: {first: false, value: geometry.right, slim:widthSlim, element, index: -1, opened: new Set()},
            top: {first: true, value: geometry.top, slim:heightSlim, element, index: -1, opened: new Set([element])},
            bottom: {first: false, value: geometry.bottom, slim:heightSlim, element, index: -1, opened: new Set()}
        };
        bound.left.index = this._sweepAndPrune._xAxis.length;
        bound.right.index = this._sweepAndPrune._xAxis.length + 1;
        this._sweepAndPrune._xAxis.push(bound.left, bound.right);
        bound.top.index = this._sweepAndPrune._yAxis.length;
        bound.bottom.index = this._sweepAndPrune._yAxis.length + 1;
        this._sweepAndPrune._yAxis.push(bound.top, bound.bottom);
        this._sweepAndPrune._xAxis.dirty = 2;
        this._sweepAndPrune._yAxis.dirty = 2;
        return bound;
    }

    createBounds(element) {
        this._element = element;
        this._bound = this._createBound(element);
    }

    get bounds() {
        return new List(this._bound);
    }

    _removeBound(bound) {
        bound.left.removed = true;
        bound.right.removed = true;
        bound.top.removed = true;
        bound.bottom.removed = true;
    }

    remove() {
        this._removeBound(this._bound);
        this._sweepAndPrune._xAxis.dirty = 2;
        this._sweepAndPrune._yAxis.dirty = 2;
    }

    _updateBound(bound) {
        let geometry = this._element.localGeometry;
        this._bound.left.value = geometry.left;
        this._bound.right.value = geometry.right;
        this._bound.top.value = geometry.top;
        this._bound.bottom.value = geometry.bottom;
    }

    update() {
        this._x = this._element.lx;
        this._y = this._element.ly;
        this._updateBound(this._bound);
        !this._sweepAndPrune._xAxis.dirty && (this._sweepAndPrune._xAxis.dirty += 1);
        !this._sweepAndPrune._yAxis.dirty && (this._sweepAndPrune._yAxis.dirty += 1);
    }

    left(element) {
        return this._bound.left.value;
    }

    right(element) {
        return this._bound.right.value;
    }

    top(element) {
        return this._bound.top.value;
    }

    bottom(element) {
        return this._bound.bottom.value;
    }

    x(element) {
        return this._x;
    }

    y(element) {
        return this._y;
    }

}

export class SweepAndPrune {

    constructor() {
        this._elements = new Map();
        this._xAxis = new List();
        this._yAxis = new List();
    }

    clear() {
        this._elements.clear();
        this._xAxis.clear();
        this._yAxis.clear();
    }

    get elements() {
        return this._elements.keys();
    }

    left(element) {
        let record = this._getRecord(element);
        return record ? record.left(element) : null;
    }

    right(element) {
        let record = this._getRecord(element);
        return record ? record.right(element) : null;
    }

    top(element) {
        let record = this._getRecord(element);
        return record ? record.top(element) : null;
    }

    bottom(element) {
        let record = this._getRecord(element);
        return record ? record.bottom(element) : null;
    }

    has(element) {
        return this._elements.has(element);
    }

    add(element) {
        if (!this.has(element)) {
            let record = this._createRecord(element);
            this._elements.set(element, record);
            return true;
        }
        return false;
    }

    remove(element) {
        if (this.has(element)) {
            let record = this._getRecord(element);
            record.remove();
            this._elements.delete(element);
            return true;
        }
        return false;
    }

    update(element) {

        let updateOnAxis = (axis, startBoundary, endBoundary) => {
            // 1st case : the starting bound is moved back
            let index = startBoundary.index;
            while (index > 0 && this._comparator(axis[index - 1], startBoundary) > 0) {
                let otherBoundary = axis[index - 1];
                axis[index - 1] = startBoundary;
                axis[index] = otherBoundary;
                startBoundary.index = index - 1;
                otherBoundary.index = index;
                otherBoundary.opened.add(startBoundary.element);
                if (otherBoundary.first) {
                    startBoundary.opened.delete(otherBoundary.element);
                } else {
                    startBoundary.opened.add(otherBoundary.element);
                }
                index--;
            }

            // 2nd case : the ending bound is moved forward
            index = endBoundary.index;
            while (
                index < axis.length - 1 &&
                this._comparator(axis[index + 1], endBoundary) < 0
                ) {
                let otherBoundary = axis[index + 1];
                axis[index + 1] = endBoundary;
                axis[index] = otherBoundary;
                endBoundary.index = index + 1;
                otherBoundary.index = index;
                otherBoundary.opened.add(endBoundary.element);
                if (otherBoundary.first) {
                    endBoundary.opened.add(otherBoundary.element);
                } else {
                    endBoundary.opened.delete(otherBoundary.element);
                }
                index++;
            }

            // 3nd case : the starting bound is moved forward
            index = startBoundary.index;
            while (
                index < axis.length - 1 &&
                this._comparator(axis[index + 1], startBoundary) < 0
                ) {
                let otherBoundary = axis[index + 1];
                axis[index + 1] = startBoundary;
                axis[index] = otherBoundary;
                startBoundary.index = index + 1;
                otherBoundary.index = index;
                otherBoundary.opened.delete(startBoundary.element);
                if (otherBoundary.first) {
                    startBoundary.opened.add(otherBoundary.element);
                } else {
                    startBoundary.opened.delete(otherBoundary.element);
                }
                index++;
            }

            // last case : the ending bound is moved back
            index = endBoundary.index;
            while (index > 0 && this._comparator(axis[index - 1], endBoundary) > 0) {
                let otherBoundary = axis[index - 1];
                axis[index - 1] = endBoundary;
                axis[index] = otherBoundary;
                endBoundary.index = index - 1;
                otherBoundary.index = index;
                otherBoundary.opened.delete(endBoundary.element);
                if (otherBoundary.first) {
                    endBoundary.opened.delete(otherBoundary.element);
                } else {
                    endBoundary.opened.add(otherBoundary.element);
                }
                index--;
            }
        };

        evaluate("SAP update element collisions", () => {
            let record = this._getRecord(element);
            record.update();
            if (this._xAxis.dirty >= 2 || this._yAxis.dirty >= 2) {
                this.updateInternals();
            } else {
                for (let bound of record.bounds) {
                    updateOnAxis(this._xAxis, bound.left, bound.right);
                    updateOnAxis(this._yAxis, bound.top, bound.bottom);
                }
                delete this._xAxis.dirty;
                delete this._yAxis.dirty;
            }
        });
    }

    _createRecord(element) {
        return new SAPRecord(element, this);
    }

    _getRecord(element) {
        return this._elements.get(element);
    }

    elementsInPoint(x, y) {
        let collectedOnX = new Set();
        let index = dichotomousSearch(this._xAxis, x, (v, b) => v - b.value);
        if (index > 0) {
            for (let element of this._xAxis[index - 1].opened) {
                // Verify that element may collide only on x axis because if element not selected here, it cannot be
                // processed thereafter
                if (!element.mayNotCollide) {
                    collectedOnX.add(element);
                }
            }
        }
        let result = new List();
        index = dichotomousSearch(this._yAxis, y, (v, b) => v - b.value);
        if (index > 0) {
            for (let element of this._yAxis[index - 1].opened) {
                if (collectedOnX.delete(element)) {
                    result.add(element);
                }
            }
        }
        return result;
    }

    elementBox(element) {
        let record = this._getRecord(element);
        let left = record.left(element);
        let right = record.right(element);
        let top = record.top(element);
        let bottom = record.bottom(element);
        return new Box(left, top, right-left, bottom-top)
    }

    elementsInBox(left, top, right, bottom) {
        let collectedOnX = new Set();
        let index = dichotomousSearch(this._xAxis, left + COLLISION_MARGIN, (v, b) => v - b.value);
        if (index > 0 && index < this._xAxis.length && this._xAxis[index].value > left) index--;
        while ( this._xAxis[index] && this._xAxis[index].value < right - COLLISION_MARGIN) {
            for (let element of this._xAxis[index].opened) {
                // Verify that element may collide only on x axis because if element not selected here, it cannot be
                // processed thereafter
                if (!element.mayNotCollide) {
                    collectedOnX.add(element);
                }
            }
            index++;
        }
        let result = new List();
        index = dichotomousSearch(this._yAxis, top + COLLISION_MARGIN, (v, b) => v - b.value);
        if (index > 0 && index < this._yAxis.length && this._yAxis[index].value > top) index--;
        while (this._yAxis[index] && this._yAxis[index].value < bottom - COLLISION_MARGIN) {
            for (let element of this._yAxis[index].opened) {
                if (collectedOnX.delete(element)) {
                    result.add(element);
                }
            }
            index++;
        }
        return result;
    }

    _comparator(e1, e2) {
        let diff = e1.value - e2.value;
        if (diff) return diff;
        // Same value... more complicated...
        // Same element = slim element : first bound is before last bound
        if (e1.element === e2.element) {
            return e1.first ? -1 : 1;
        }
        // Not same element
        else if (e1.first === e2.first) {
            // if an "element" is slim (width=0 or height=0), it is before or after the other element but cannot be
            // "inside" the "fat" element
            let e1w = e1.slim === e1.first ? 0 : 1; // XOR slim and first
            let e2w = e2.slim === e2.first ? 0 : 1;
            return e1w - e2w;
        }
        // Deux éléments avec des bornes différentes : la "fin" de l'un précède le "début" de l'autre (afin qu'ils apparaissent disjoints)
        else {
            return e1.first ? 1 : -1;
        }
    }

    updateInternals() {

        let sortAxis = () => {
            if (this._xAxis.dirty) {
                insertionSort(this._xAxis, this._comparator);
                for (let index = 0; index < this._xAxis.length; index++) {
                    this._xAxis[index].index = index;
                }
            }
            if (this._yAxis.dirty) {
                insertionSort(this._yAxis, this._comparator);
                for (let index = 0; index < this._yAxis.length; index++) {
                    this._yAxis[index].index = index;
                }
            }
            delete this._xAxis.dirty;
            delete this._yAxis.dirty;
        };

        let axisCollision = axis => {
            let opened = new List();
            for (let boundary of axis) {
                if (boundary.first) {
                    opened.add(boundary.element);
                    boundary.opened = new Set(opened);
                } else {
                    opened.remove(boundary.element);
                    boundary.opened = new Set(opened);
                }
            }
        };

        evaluate("SAP update internals", () => {
            sortAxis();
            axisCollision(this._xAxis);
            axisCollision(this._yAxis);
        });
    }

    collideWith(box) {
        let result = this.elementsInBox(
            box.left,
            box.top,
            box.right,
            box.bottom
        );
        return result;
    }

    onLeftSide(element) {
        let record = this._getRecord(element);
        if (!record) return new List();
        return this.elementsInBox(
            record.left(element) -1,
            record.top(element),
            record.right(element),
            record.bottom(element)
        );
    }

    onRightSide(element) {
        let record = this._getRecord(element);
        if (!record) return new List();
        return this.elementsInBox(
            record.left(element),
            record.top(element),
            record.right(element) +1,
            record.bottom(element)
        );
    }

    onTopSide(element) {
        let record = this._getRecord(element);
        if (!record) return new List();
        return this.elementsInBox(
            record.left(element),
            record.top(element) -1,
            record.right(element),
            record.bottom(element)
        );
    }

    onBottomSide(element) {
        let record = this._getRecord(element);
        if (!record) return new List();
        return this.elementsInBox(
            record.left(element),
            record.top(element),
            record.right(element),
            record.bottom(element) + 1
        );
    }
}

export function makeCollisionPhysic(superClass) {

    superClass.prototype._init = function(...args) {
        this._elements = new Set();
        this._supportSAP = new SweepAndPrune();
        this._dragAndDropSAP = new SweepAndPrune();
    };

    superClass.prototype._refresh = function() {
        this._supportSAP.updateInternals();
    };

    superClass.prototype._reset = function() {
        this._elements = new Set(this._host.children);
        this._supportSAP.clear();
        for (let element of this._elements) {
            this._supportSAP.add(element);
        }
    };

    superClass.prototype.hover = function(elements) {
        this._hover(elements);
    };

    superClass.prototype._hover = function(elements) {
        this._hoveredElements = new List(...elements);
        let inSAP = new Set(this._dragAndDropSAP.elements);
        for (let element of this._hoveredElements) {
            if (inSAP.has(element)) {
                inSAP.delete(element);
                this._dragAndDropSAP.update(element);
            }
            else {
                this._dragAndDropSAP.add(element);
            }
        }
        for (let element of inSAP) {
            this._dragAndDropSAP.remove(element);
        }
        this._dragAndDropSAP.updateInternals();
        this._avoidCollisionsForElements(this._hoveredElements);
    };

    superClass.prototype._add = function(element) {
        this._elements.add(element);
        this._supportSAP.add(element);
    };

    superClass.prototype._remove = function(element) {
        this._elements.delete(element);
        this._supportSAP.remove(element);
    };

    superClass.prototype._draggedCollideWith = function(element, exclude) {
        let elementBox = this._dragAndDropSAP.elementBox(element);
        let collisions = new List(
            ...this._supportSAP.collideWith(elementBox),
            ...this._dragAndDropSAP.collideWith(elementBox)
        );
        let result = new List();
        for (let target of collisions) {
            let sweepAndPrune = this.sweepAndPrune(target);
            if (!exclude.has(target) &&
                elementBox.collides(sweepAndPrune.elementBox(target))) {
                result.add(target);
            }
        }
        return result;
    };

    superClass.prototype.sweepAndPrune = function(element) {
        if (this._dragAndDropSAP.has(element)) {
            return this._dragAndDropSAP;
        }
        else {
            return this._supportSAP;
        }
    };

    superClass.prototype._avoidCollisionsForElement = function(element, exclude) {

        let put = (element, x, y) => {
            element.move(x, y);
            this._dragAndDropSAP.update(element);
        };

        let adjustOnX = (target, ox, hx) => {
            let sweepAndPrune = this.sweepAndPrune(target);
            if (ox > hx) {
                let rx = sweepAndPrune.right(target) + element.width / 2;
                return ox < rx || rx === hx ? null : rx;
            } else if (ox < hx) {
                let rx = sweepAndPrune.left(target) - element.width / 2;
                return ox > rx || rx === hx ? null : rx;
            } else return null;
        };

        let adjustOnY = (target, oy, hy) => {
            let sweepAndPrune = this.sweepAndPrune(target);
            if (oy > hy) {
                let ry = sweepAndPrune.bottom(target) + element.height / 2;
                return oy < ry || ry === hy ? null : ry;
            } else if (oy < hy) {
                let ry = sweepAndPrune.top(target) - element.height / 2;
                return oy > ry || ry === hy ? null : ry;
            } else return null;
        };

        let adjust = function(targets) {
            for (let target of targets) {
                let fx = adjustOnX(target, ox, hx);
                let fy = adjustOnY(target, oy, hy);
                if (fx!==null || fy!==null) {
                    return {fx, fy};
                }
            }
            return { fx:null, fy:null };
        };

        if (element._drag.validX===undefined) {
            element._drag.validX = element._drag.lastX;
            element._drag.validY = element._drag.lastY;
        }
        exclude.add(element);
        //var { x: sx, y: sy } = computePosition(element.root, this.host.root);
        let sx = element.lx, sy = element.ly;
        let hx = sx, hy = sy;
        let finished = false;
        let originMatrix = this._host.global;
        let invertedMatrix = originMatrix.invert();
        let ox = invertedMatrix.x(element._drag.validX, element._drag.validY);
        let oy = invertedMatrix.y(element._drag.validX, element._drag.validY);
        let cycleCount = 0;
        while (!finished && cycleCount < 100) {
            cycleCount++;
            let targets = this._draggedCollideWith(element, exclude);
            if (targets.length > 0) {
                let {fx, fy} = adjust(targets);
                if (fx !== null && fy !== null) {
                    let dx = hx > fx ? hx - fx : fx - hx;
                    let dy = hy > fy ? hy - fy : fy - hy;
                    if (dy && dx > dy) {
                        hy = fy;
                    } else {
                        hx = fx;
                    }
                } else if (fx !== null) {
                    hx = fx;
                } else if (fy !== null) {
                    hy = fy;
                } else {
                    hx = ox;
                    hy = oy;
                    finished = true;
                }
                put(element, hx, hy);
            } else {
                finished = true;
            }
        }
        if (Math.abs(hx - sx) > ADJUST_MARGIN || Math.abs(hy - sy) > ADJUST_MARGIN) {
            put(element, sx, sy, true);
            element.INVALID = true;
        } else {
            element._drag.validX = originMatrix.x(hx, hy);
            element._drag.validY = originMatrix.y(hx, hy);
            delete element.INVALID;
        }
        exclude.delete(element);
    };

    superClass.prototype._avoidCollisionsForElements = function(elements) {
        let exclude = new Set(elements);
        for (let element of elements) {
            evaluate("avoid collisiton for element", () => {
                this._avoidCollisionsForElement(element, exclude);
            });
        }
    };

    return superClass;
}

export class PhysicBorder {

    constructor(physic, x, y, width, height) {
        this._physic = physic;
        this._x = x;
        this._y = y;
        this._width = width;
        this._height = height;
    }

    get lx() {
        return this._x();
    }

    get ly() {
        return this._y();
    }

    get localGeometry() {
        return new Box(this._x()-this._width()/2, this._y()-this._height()/2, this._width(), this._height());
    }
}

export function addBordersToCollisionPhysic(superClass, specs) {

    let init = superClass.prototype._init;
    superClass.prototype._init = function(...args) {
        init.call(this, ...args);
        if (specs.left || specs.all) {
            this._addLeftBorder();
        }
        if (specs.right || specs.all) {
            this._addRightBorder();
        }
        if (specs.top || specs.all) {
            this._addTopBorder();
        }
        if (specs.bottom || specs.all) {
            this._addBottomBorder();
        }
        this._trigger();
    };

    superClass.prototype._addLeftBorder = function() {
        this._leftBorder = new PhysicBorder(
            this,
            () => -this.host.width / 2,
            () => 0,
            () => 0,
            () => this.host.height
        );
        this._supportSAP.add(this._leftBorder);
        return this;
    };

    superClass.prototype._addRightBorder = function() {
        this._rightBorder = new PhysicBorder(
            this,
            () => this.host.width / 2,
            () => 0,
            () => 0,
            () => this.host.height
        );
        this._supportSAP.add(this._rightBorder);
        return this;
    };

    superClass.prototype._addTopBorder = function() {
        this._topBorder = new PhysicBorder(
            this,
            () => 0,
            () => -this.host.height / 2,
            () => this.host.width,
            () => 0
        );
        this._supportSAP.add(this._topBorder);
        return this;
    };

    superClass.prototype._addBottomBorder = function() {
        this._bottomBorder = new PhysicBorder(
            this,
            () => 0,
            () => this.host.height / 2,
            () => this.host.width,
            () => 0
        );
        this._supportSAP.add(this._bottomBorder);
        return this;
    };

    let reset = superClass.prototype._reset;
    superClass.prototype._reset = function() {
        reset.call(this);
        this._leftBorder && this._supportSAP.add(this._leftBorder);
        this._rightBorder && this._supportSAP.add(this._rightBorder);
        this._topBorder && this._supportSAP.add(this._topBorder);
        this._bottomBorder && this._supportSAP.add(this._bottomBorder);
    };
}

export class CollisionPhysic extends Physic {

    constructor(...args) {
        super(...args);
    }

    clone(duplicata) {
        let _copy = new CollisionPhysic(duplicata.get(this._host), this._positionsFct);
        _copy._trigger();
        return _copy;
    }

}
makeCollisionPhysic(CollisionPhysic);

export function makeCollisionContainer(superClass, specs = null) {

    class ContainerPhysic extends CollisionPhysic {};
    if (specs) {
        addBordersToCollisionPhysic(ContainerPhysic, specs);
    }

    addPhysicToContainer(superClass, function() {
        return new ContainerPhysic(this);
    });

    return superClass;
}
