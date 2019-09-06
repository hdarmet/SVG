'use strict';

import {
    evaluate, same
} from "./misc.js";
import {
    List, AVLTree
} from "./collections.js";
import {
    Box
} from "./geometry.js";
import {
    win
} from "./graphics.js";
import {
    Memento, CloneableObject
} from "./toolkit.js";

export class Physic {

    constructor(host, predicate, ...args) {
        this._host = host;
        this._predicate = predicate;
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

    _managedElements(elements) {
        let managedElements = new List();
        for (let element of elements) {
            if (this._predicate(element)) {
                managedElements.add(element);
            }
        }
        return managedElements;
    }

    hover(elements) {
        this._hover(this._managedElements(elements));
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
        if (this._predicate(element)) {
            this._trigger();
            this._add(element);
        }
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

export function makePositioningPhysic(superClass) {

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
                this._refreshHoverElement(element);
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

    superClass.prototype._elementPosition = function(element) {
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
        return position;
    };

    superClass.prototype._refreshHoverElement = function(element) {
        let position = this._elementPosition(element);
        element.setLocation(position.x, position.y);
    };

    superClass.prototype._refreshElement = function(element) {
        let position = this._elementPosition(element);
        element.move(position.x, position.y);
    };

    return superClass;
}

export class PositioningPhysic extends Physic {
    constructor(host, predicate, ...args) {
        super(host, predicate, ...args);
    }

    clone(duplicata) {
        let _copy = new this.constructor(duplicata.get(this._host), this._predicate, this._positionsFct);
        _copy._trigger();
        return _copy;
    }
}
makePositioningPhysic(PositioningPhysic);

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

    let acceptDrop = superClass.prototype._acceptDrop;
    superClass.prototype._acceptDrop = function(element) {
        if (element._drag.invalid) return false;
        return acceptDrop ? acceptDrop.call(this, element) : true;
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

export function makePositioningContainer(superClass, predicate, positionsFct) {

    addPhysicToContainer(superClass, function() {
        return new PositioningPhysic(this, predicate, positionsFct);
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
        let widthSlim = same(geometry.left, geometry.right);
        let heightSlim = same(geometry.top, geometry.bottom);
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
        this._x = this._element.lx;
        this._y = this._element.ly;
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
        let left = record.left(element)+COLLISION_MARGIN;
        let right = record.right(element)-COLLISION_MARGIN;
        let top = record.top(element)+COLLISION_MARGIN;
        let bottom = record.bottom(element)-COLLISION_MARGIN;
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
            box.left+COLLISION_MARGIN,
            box.top+COLLISION_MARGIN,
            box.right-COLLISION_MARGIN,
            box.bottom-COLLISION_MARGIN
        );
        return result;
    }

    near(element, left=1, top=1, right=1, bottom=1) {
        let record = this._getRecord(element);
        if (!record) return new List();
        return this.elementsInBox(
            record.left(element) -left,
            record.top(element) -top,
            record.right(element) +right,
            record.bottom(element) +bottom
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
        this._hover(this._managedElements(elements));
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
                elementBox.intersects(sweepAndPrune.elementBox(target))) {
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

    /**
     * Fix the position of a DRAGGED element (NEVER an element already contained by the host of the physic) so this
     * element (if possible...) does not collide with another one (dragged of already on host).
     * @param element element to fix
     * @param exclude elements to exclude from processing (these element are those that are not already processed so
     * their positions are not relevant).
     * @private
     */
    superClass.prototype._avoidCollisionsForElement = function(element, exclude) {

        /**
         * Set the fixed position of the element and update physics internal structures accordingly. Note that this
         * element is ALWAYS a DnD'ed one.
         * @param element element to displace.
         * @param x new X ccords of the element
         * @param y new Y coords of the element.
         */
        let put = (element, x, y) => {
            // setLocation(), not move(), on order to keep the DnD fluid (floating elements not correlated).
            element.setLocation(x, y);
            this._dragAndDropSAP.update(element);
        };

        /**
         * Get a proposition on the X axis. This proposition is the nearest position between the one given by "mouse"
         * toward the "original" (= lasted valid) position of the element.
         * @param target element to "avoid".
         * @param ox original position
         * @param hx the proposition.
         * @returns {*}
         */
        let adjustOnX = (target, ox, hx) => {
            let sweepAndPrune = this.sweepAndPrune(target);
            if (ox > hx) {
                let rx = sweepAndPrune.right(target) + element.width / 2;
                return ox < rx || same(rx, hx) ? null : rx;
            } else if (ox < hx) {
                let rx = sweepAndPrune.left(target) - element.width / 2;
                return ox > rx || same(rx, hx) ? null : rx;
            } else return null;
        };

        /**
         * Get a proposition on the Y axis. This proposition is the nearest position between the one given by "mouse"
         * toward the "original" (= lasted valid) position of the element.
         * @param target element to "avoid".
         * @param oy original position
         * @param hy the proposition.
         * @returns {*}
         */
        let adjustOnY = (target, oy, hy) => {
            let sweepAndPrune = this.sweepAndPrune(target);
            if (oy > hy) {
                let ry = sweepAndPrune.bottom(target) + element.height / 2;
                return oy < ry || same(ry, hy) ? null : ry;
            } else if (oy < hy) {
                let ry = sweepAndPrune.top(target) - element.height / 2;
                return oy > ry || same(ry, hy) ? null : ry;
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

        exclude.add(element);
        let sx = element.lx, sy = element.ly;
        let hx = sx, hy = sy;
        let finished = false;
        let originMatrix = this._host.global;
        let invertedMatrix = originMatrix.invert();
        // Coords of last valid position of the element (we have to "go" in this direction...)
        let ox = invertedMatrix.x(element._drag.validX, element._drag.validY);
        let oy = invertedMatrix.y(element._drag.validX, element._drag.validY);
        // In order to avoid (= bug ?) infinite loop
        let cycleCount = 0;
        while (!finished && cycleCount < 100) {
            cycleCount++;
            let targets = this._draggedCollideWith(element, exclude);
            if (targets.length > 0) {
                // Get a proposition
                let {fx, fy} = adjust(targets);
                // First case : we have to choice between X and Y : we get the smallest
                if (fx/* !== null*/ && fy /*!== null*/) {
                    let dx = hx > fx ? hx - fx : fx - hx;
                    let dy = hy > fy ? hy - fy : fy - hy;
                    if (/*dy &&*/ dx > dy) {
                        hy = fy;
                    } else {
                        hx = fx;
                    }
                // 2nd case : only one dimension is available
                } else if (fx/* !== null*/) {
                    hx = fx;
                } else if (fy/* !== null*/) {
                    hy = fy;
                } else {
                    // Last case : no proposition is available. We revert to last valid position
                    hx = ox;
                    hy = oy;
                    finished = true;
                }
                put(element, hx, hy);
            } else {
                finished = true;
            }
        }
        // If final position is "too far" from "mouse" position, revert to mouse position, but mark element drag as
        // invalid.
        if (Math.abs(hx - sx) > ADJUST_MARGIN || Math.abs(hy - sy) > ADJUST_MARGIN) {
            put(element, sx, sy, true);
            element._drag.invalid = true;
        } else {
            // Fixing accepted: update drag infos.
            element._drag.validX = element.gx;
            element._drag.validY = element.gy;
            delete element._drag.invalid;
        }
        exclude.delete(element);
    };

    superClass.prototype._avoidCollisionsForElements = function(elements) {
        let exclude = new Set(elements);
        for (let element of elements) {
            evaluate("avoid collision for element", () => {
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

    /*
    let clone = superClass.prototype.clone;
    superClass.prototype.clone = function(duplicata) {
        let copy = clone.call(this, duplicata);
        if (this._leftBorder) {
            copy._addLeftBorder();
        }
        if (this._rightBorder) {
            copy._addRightBorder();
        }
        if (this._topBorder) {
            copy._addTopBorder();
        }
        if (this._bottomBorder) {
            copy._addBottomBorder();
        }
        return copy;
    };
*/

}

export class CollisionPhysic extends Physic {

    constructor(host, predicate, ...args) {
        super(host, predicate, ...args);
    }

    clone(duplicata) {
        let _copy = new this.constructor(duplicata.get(this._host), this._predicate);
        _copy._trigger();
        return _copy;
    }

}
makeCollisionPhysic(CollisionPhysic);

export function makeCollisionContainer(superClass, predicate, specs = null) {

    class ContainerPhysic extends CollisionPhysic {}
    if (specs) {
        addBordersToCollisionPhysic(ContainerPhysic, specs);
    }

    addPhysicToContainer(superClass, function() {
        return new ContainerPhysic(this, predicate);
    });

    return superClass;
}

export function addGravitationToCollisionPhysic(superClass) {

    class Ground {

        constructor(physic) {
            this._physic = physic;
            this._segments = new AVLTree((s1, s2)=>{
                let value = s1.right-s2.right;
                return value ? value : s1.id-s2.id;
            });
        }

        _setCarriedBy(element, supports) {
            element.clearCarriedBy();
            for (let support of supports) {
                if (support.isCarrier) {
                    support.addCarried(element);
                }
            }
        }

        process(element) {
            let id = 1;
            let record = this._physic._supportSAP._getRecord(element);
            let left = record.left(element);
            let right = record.right(element);
            let top = record.top(element);
            let it = this._segments.inside({right:left+COLLISION_MARGIN, id:0}, null);
            let ground = this._physic._host.bottom;
            let segment = it.next().value;
            let supports = new Set();
            while (segment && segment.left+COLLISION_MARGIN < right) {
                if (segment.top < ground) {
                    ground = segment.top;
                    supports = new Set([segment.element]);
                }
                else if (same(segment.top, ground)) {
                    supports.add(segment.element);
                }
                if (segment.left > left && segment.right < right) {
                    this._segments.delete(segment);
                }
                segment = it.next().value;
            }
            let ly = ground - (record.bottom(element)-record.y(element));
            if (ly !== element.ly) {
                element.setLocation(record.x(element), ly);
                this._physic._supportSAP.update(element);
                top = record.top(element);
            }
            if (element.isCarriable) {
                this._setCarriedBy(element, supports);
            }
            this._segments.insert({left, right, id:id++, top, element})
        }

    }

    let refresh = superClass.prototype._refresh;
    superClass.prototype._refresh = function() {

        let comparator = (e1, e2)=> {
            let b1 = this._supportSAP.bottom(e1);
            let b2 = this._supportSAP.bottom(e2);
            return b2-b1;
        };

        refresh.call(this);
        let elements = new List(...this._elements).sort(comparator);
        let ground = new Ground(this);
        for (let element of elements) {
            ground.process(element);
        }
    };

    return superClass;
}

export class GravitationPhysic extends CollisionPhysic {

    constructor(host, predicate, ...args) {
        super(host, predicate, ...args);
    }

    clone(duplicata) {
        let _copy = this.constructor(duplicata.get(this._host), this._predicate);
        _copy._trigger();
        return _copy;
    }

}
addGravitationToCollisionPhysic(GravitationPhysic);

export function makeGravitationContainer(superClass, predicate, specs = null) {

    class ContainerPhysic extends GravitationPhysic {};
    if (specs) {
        addBordersToCollisionPhysic(ContainerPhysic, specs);
    }

    addPhysicToContainer(superClass, function() {
        return new ContainerPhysic(this, predicate);
    });

    return superClass;
}

export function makeCarrier(superClass) {

    Object.defineProperty(superClass.prototype, "isCarrier", {
        configurable:true,
        get() {
            return true;
        }
    });

    superClass.prototype.addCarried = function(element) {
        if (element.__addCarriedBy) {
            Memento.register(this);
            Memento.register(element);
            this._addCarried(element);
        }
    };

    superClass.prototype.removeCarried = function(element) {
        if (element.__removeCarriedBy) {
            Memento.register(this);
            Memento.register(element);
            this._removeCarried(element);
        }
    };

    superClass.prototype.__addCarried = function(element, record) {
        if (!this._carried) {
            this._carried = new Map();
        }
        this._carried.set(element, record);
    };

    superClass.prototype.__removeCarried = function(element) {
        if (this._carried) {
            this._carried.delete(element);
            if (!this._carried.size) {
                delete this._carried;
            }
        }
    };

    superClass.prototype._addCarried = function(element) {
        this.__addCarried(element, new CloneableObject({
            dx:element.lx-this.lx,
            dy:element.ly-this.ly
        }));
        element.__addCarriedBy(this);
    };

    superClass.prototype._removeCarried = function(element) {
        this.__removeCarried(element);
        element.__removeCarriedBy(this);
    };

    superClass.prototype._clearCarried = function() {
        delete this._carriedBy;
    };

    let getExtension = superClass.prototype.getExtension;
    superClass.prototype.getExtension = function() {
        let extension = getExtension ? getExtension.call(this) : new Set();
        if (this._carried) {
            for (let element of this._carried.keys()) {
                if (!extension.has(element)) {
                    extension.add(element);
                    if (element.getExtension) {
                        for (let child of element.getExtension()) {
                            extension.add(child);
                        }
                    }
                }
            }
        }
        return extension
    };

    let move = superClass.prototype.move;
    superClass.prototype.move = function(x, y) {
        if (move.call(this, x, y)) {
            if (this._carried) {
                for (let element of this._carried.keys()) {
                    let record = this._carried.get(element);
                    if (element.parent === this.parent) {
                        element.move(this.lx + record.dx, this.ly + record.dy);
                    }
                    else {
                        this.removeCarried(element);
                    }
                }
            }
            return true;
        }
        return false;
    };

    let cloned = superClass.prototype._cloned;
    superClass.prototype._cloned = function (copy, duplicata) {
        cloned && cloned.call(this, copy, duplicata);
        if (this._carried) {
            for (let element of this._carried.keys()) {
                let childCopy = duplicata.get(element);
                let record = this._carried.get(element);
                copy.__addCarried(childCopy, record);
            }
        }
    };

    let revertDroppedIn = superClass.prototype._revertDroppedIn;
    superClass.prototype._revertDroppedIn = function () {
        revertDroppedIn && revertDroppedIn.call(this);
        if (this._carried) {
            for (let element of this._carried.keys()) {
                let record = this._carried.get(element);
                element.__addCarriedBy(this, record);
            }
        }
    };

    let superDelete = superClass.prototype.delete;
    superClass.prototype.delete = function() {
        let result = superDelete.call(this);
        if (this._carried) {
            for (let element of this._carried.keys()) {
                this.removeCarried(element);
            }
        }
        return result;
    };

    let superMemento = superClass.prototype._memento;
    superClass.prototype._memento = function () {
        let memento = superMemento.call(this);
        if (this._carried) {
            memento._carried = new Map(this._carried);
        }
        return memento;
    };

    let superRevert = superClass.prototype._revert;
    superClass.prototype._revert = function (memento) {
        superRevert.call(this, memento);
        if (memento._carried) {
            this._carried = new Map(memento._carried);
        }
        else {
            delete this._carried;
        }
        return this;
    };

    return superClass;
}

export function makeCarriable(superClass) {

    Object.defineProperty(superClass.prototype, "isCarriable", {
        configurable:true,
        get() {
            return true;
        }
    });

    superClass.prototype.__addCarriedBy = function(element, record) {
        if (!this._carriedBy) {
            this._carriedBy = new Map();
        }
        this._carriedBy.set(element, record);
    };

    superClass.prototype.__removeCarriedBy = function(element) {
        if (this._carriedBy) {
            this._carriedBy.delete(element);
            if (!this._carriedBy.size) {
                delete this._carriedBy;
            }
        }
    };

    superClass.prototype.clearCarriedBy = function() {
        if (this._carriedBy) {
            for (let support of [...this._carriedBy.keys()]) {
                support.removeCarried(this);
            }
        }
    };

    let draggedFrom = superClass.prototype._draggedFrom;
    superClass.prototype._draggedFrom = function(support, dragSet) {
        draggedFrom && draggedFrom.call(this, support, dragSet);
        if (this._carriedBy) {
            for (let support of [...this._carriedBy.keys()]) {
                if (!dragSet.has(support)) {
                    support.removeCarried(this);
                }
            }
        }
    };

    let revertDroppedIn = superClass.prototype._revertDroppedIn;
    superClass.prototype._revertDroppedIn = function () {
        revertDroppedIn && revertDroppedIn.call(this);
        if (this._carriedBy) {
            for (let element of this._carriedBy.keys()) {
                let record = this._carriedBy.get(element);
                element.__addCarried(this, record);
            }
        }
    };

    let cloned = superClass.prototype._cloned;
    superClass.prototype._cloned = function (copy, duplicata) {
        cloned && cloned.call(this, copy, duplicata);
        if (this._carriedBy) {
            for (let element of this._carriedBy.keys()) {
                let childCopy = duplicata.get(element);
                let record = this._carriedBy.get(element);
                copy.__addCarriedBy(childCopy, record);
            }
        }
    };

    let superDelete = superClass.prototype.delete;
    superClass.prototype.delete = function() {
        let result = superDelete.call(this);
        if (this._carriedBy) {
            for (let element of this._carriedBy.keys()) {
                element.removeCarried(this);
            }
        }
        return result;
    };

    let superMemento = superClass.prototype._memento;
    superClass.prototype._memento = function () {
        let memento = superMemento.call(this);
        if (this._carriedBy) {
            memento._carriedBy = new Map(this._carriedBy);
        }
        return memento;
    };

    let superRevert = superClass.prototype._revert;
    superClass.prototype._revert = function (memento) {
        superRevert.call(this, memento);
        if (memento._carriedBy) {
            this._carriedBy = new Map(memento._carriedBy);
        }
        else {
            delete this._carriedBy;
        }
        return this;
    };

    return superClass;
}

export function addStickingToCollisionPhysic(superClass) {

    let refresh = superClass.prototype._refresh;
    superClass.prototype._refresh = function() {
        refresh.call(this);
        for (let element of this._elements) {
            if (element.isStickable) {
                let alreadySticked = element.getSticked(false, true, true, false);
                let stickedElements = this._supportSAP.near(element, 1, 1, 0, 0);
                for (let neighbour of stickedElements) {
                    if (!alreadySticked.has(neighbour)) {
                        element.stick(neighbour);
                    }
                    else {
                        alreadySticked.delete(neighbour);
                    }
                }
                for (let neighbour of alreadySticked) {
                    element.unstick(neighbour);
                }
            }
        }
    };

    return superClass;
}

export function makeStickable(superClass) {

    Object.defineProperty(superClass.prototype, "isStickable", {
        configurable:true,
        get() {
            return true;
        }
    });

    superClass.prototype.__stick = function(element, record) {
        if (!this._stickedWith) {
            this._stickedWith = new Map();
        }
        this._stickedWith.set(element, record);
    };

    superClass.prototype.__unstick = function(element) {
        if (this._stickedWith) {
            this._stickedWith.delete(element);
            if (!this._stickedWith.size) {
                delete this._stickedWith;
            }
        }
    };

    superClass.prototype._stick = function(element) {
        this.__stick(element, this._createRecord(element));
        element.__stick(this, element._createRecord(this));
    };

    superClass.prototype._unstick = function(element) {
        this.__unstick(element);
        element.__unstick(this);
    };

    superClass.prototype.stick = function(element) {
        if (element.isStickable && !this._stickedWith.has(element)) {
            Memento.register(this);
            Memento.register(element);
            this._stick(element);
        }
    };

    superClass.prototype.unstick = function(element) {
        if (!element.isStickable && this._stickedWith.has(element)) {
            Memento.register(this);
            Memento.register(element);
            this._unstick(element);
        }
    };

    superClass.prototype._createRecord = function(element) {
        return new CloneableObject({
            dx: element.lx - this.lx,
            dy: element.ly - this.ly
        })
    };

    superClass.prototype.clearSticked = function() {
        if (this._stickedWith) {
            for (let element of [...this._stickedWith.keys()]) {
                this.unstick(element);
            }
        }
    };

    superClass.prototype.getSticked = function(left = true, top = true, right = true, bottom = true) {
        let stickedWidth = new Set();
        if (this._stickedWith) {
            let tlx = this.lx, tly = this.ly, tw = this.width/2-COLLISION_MARGIN, th = this.height/2-COLLISION_MARGIN;
            for (let neighbour of this._stickedWith) {
                let nlx = neighbour.lx, nly = neighbour.ly,
                    nw = neighbour.width / 2 - COLLISION_MARGIN, nh = neighbour.height / 2 - COLLISION_MARGIN;
                if (left && nlx + nw <= tlx - tw) stickedWidth.add(neighbour);
                else if (top && nly + nh <= tly - th) stickedWidth.add(neighbour);
                else if (right && nlx - nw >= tlx + tw) stickedWidth.add(neighbour);
                else if (bottom && nly - nh >= tly + th) stickedWidth.add(neighbour);
            }
        }
    };

    let getExtension = superClass.prototype.getExtension;
    superClass.prototype.getExtension = function() {
        let extension = getExtension ? getExtension.call(this) : new Set();
        if (this._stickedWith) {
            for (let element of this._stickedWith.keys()) {
                if (!extension.has(element) && this._unstickOnDrag && this._unstickOnDrag(element)) {
                    extension.add(element);
                    if (element.getExtension) {
                        for (let child of element.getExtension()) {
                            extension.add(child);
                        }
                    }
                }
            }
        }
        return extension
    };

    let draggedFrom = superClass.prototype._draggedFrom;
    superClass.prototype._draggedFrom = function(support, dragSet) {
        draggedFrom && draggedFrom.call(this, support, dragSet);
        if (this._stickedWith) {
            for (let element of [...this._stickedWith.keys()]) {
                if (this._unstickOnDrag && this._unstickOnDrag(element) && !dragSet.has(element)) {
                    this.unstick(element);
                }
            }
        }
    };

    let revertDroppedIn = superClass.prototype._revertDroppedIn;
    superClass.prototype._revertDroppedIn = function () {
        revertDroppedIn && revertDroppedIn.call(this);
        if (this._stickedWith) {
            for (let element of this._stickedWith.keys()) {
                element.__stick(this, element._createRecord(this));
            }
        }
    };

    let cloned = superClass.prototype._cloned;
    superClass.prototype._cloned = function (copy, duplicata) {
        cloned && cloned.call(this, copy, duplicata);
        if (this._stickedWith) {
            for (let element of this._stickedWith.keys()) {
                let childCopy = duplicata.get(element);
                let record = this._stickedWith.get(element);
                copy.__stick(childCopy, record);
            }
        }
    };

    let superDelete = superClass.prototype.delete;
    superClass.prototype.delete = function() {
        let result = superDelete.call(this);
        if (this._stickedWith) {
            for (let element of this._stickedWith.keys()) {
                element.removeCarried(this);
            }
        }
        return result;
    };

    let superMemento = superClass.prototype._memento;
    superClass.prototype._memento = function () {
        let memento = superMemento.call(this);
        if (this._stickedWith) {
            memento._stickedWith = new Map(this._stickedWith);
        }
        return memento;
    };

    let superRevert = superClass.prototype._revert;
    superClass.prototype._revert = function (memento) {
        superRevert.call(this, memento);
        if (memento._stickedWith) {
            this._stickedWith = new Map(memento._stickedWith);
        }
        else {
            delete this._stickedWith;
        }
        return this;
    };

    return superClass;
}

export function addGravitationToStickingPhysic(superClass) {

    class Ground {

        constructor(physic) {
            this._physic = physic;
            this._segments = new AVLTree((s1, s2)=>{
                let value = s1.right-s2.right;
                return value ? value : s1.id-s2.id;
            });
        }

        _setCarriedBy(element, supports) {
            element.clearCarriedBy();
            for (let support of supports) {
                if (support.isCarrier) {
                    support.addCarried(element);
                }
            }
        }

        processElement(element) {
            let id = 1;
            let record = this._physic._supportSAP._getRecord(element);
            let left = record.left(element);
            let right = record.right(element);
            let top = record.top(element);
            let it = this._segments.inside({right:left+COLLISION_MARGIN, id:0}, null);
            let ground = this._physic._host.bottom;
            let segment = it.next().value;
            let supports = new Set();
            while (segment && segment.left+COLLISION_MARGIN < right) {
                if (segment.top < ground) {
                    ground = segment.top;
                    supports = new Set([segment.element]);
                }
                else if (same(segment.top, ground)) {
                    supports.add(segment.element);
                }
                if (segment.left > left && segment.right < right) {
                    this._segments.delete(segment);
                }
                segment = it.next().value;
            }
            let ly = ground - (record.bottom(element)-record.y(element));
            let dy = ly-element.dy;
            if (dy < COLLISION_MARGIN) {
                element.setLocation(record.x(element), ly);
                this._physic._supportSAP.update(element);
                top = record.top(element);
            }
            if (element.isCarriable) {
                this._setCarriedBy(element, supports);
            }
            this._segments.insert({left, right, id:id++, dy, top, element})
            return segment;
        }

        adjustSegments(segments, dy) {
            for (let segment of segments) {

            }
        }

        processBlock(block) {
            block.elements.sort(comparator);
        }

    }

    superClass.prototype._getBlocks = function(elements) {

        let blocks = new Map();

        function setToBlock(element, block) {
            block.elements.add(elements);
            blocks.set(element, block);
            let bottom = this._supportSAP.bottom(element)
            if (block.bottom===undefined || bottom > block.bottom) {
                block.bottom = bottom;
            }
        }

        for (let element of elements) {
            let block = blocks.get(element);
            if (!block) {
                block = {
                    elements : new Set(),
                    bottom : this._supportSAP.bottom(element)
                };
                setToBlock(element, block);
            }
            if (element.isStickable) {
                for (let neighbour of element.stickedWith) {
                    let nblock = blocks.get(element);
                    if (nblock) {
                        for (let friend of nblock) {
                            setToBlock(friend, block);
                        }
                    }
                    else {
                        setToBlock(neighbour, block);
                    }
                }
            }
        }
        return blocks;
    };

    let refresh = superClass.prototype._refresh;
    superClass.prototype._refresh = function() {
        refresh.call(this);
        let blocks = new List(...this._getBlocks(this._elements)).sort((b1, b2)=>b1.bottom-b2.bottom);
        let ground = new Ground(this);
        for (let block of blocks) {
            ground.processBlock(block);
        }
    };

    return superClass;
}
