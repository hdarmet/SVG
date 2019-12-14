
import {
    same, evaluate
} from "./misc.js";
import {
    AVLTree, ESet, List, EMap, dichotomousSearch, insertionSort
} from "./collections.js";
import {
    addPhysicToContainer, Physic
} from "./physics.js";
import {
    CloneableObject, Events, Memento
} from "./toolkit.js";
import {
    Box, Matrix
} from "./geometry.js";

export class SAPRecord {

    constructor(element, sweepAndPrune) {
        this._element = element;
        this._sweepAndPrune = sweepAndPrune;
    }

    _createBound(element) {
        let geometry = element.localGeometry;
        let widthSlim = same(geometry.left, geometry.right);
        let heightSlim = same(geometry.top, geometry.bottom);
        let bound = {
            element: element,
            left: {first: true, value: geometry.left, slim:widthSlim, element, index: -1, opened: new ESet([element])},
            right: {first: false, value: geometry.right, slim:widthSlim, element, index: -1, opened: new ESet()},
            top: {first: true, value: geometry.top, slim:heightSlim, element, index: -1, opened: new ESet([element])},
            bottom: {first: false, value: geometry.bottom, slim:heightSlim, element, index: -1, opened: new ESet()}
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

    createBounds() {
        this._x = this._element.lx;
        this._y = this._element.ly;
        this._bound = this._createBound(this._element);
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

    _updateBound(bound, box) {
        bound.left.value = box.left;
        bound.right.value = box.right;
        bound.top.value = box.top;
        bound.bottom.value = box.bottom
    }

    update() {
        this._x = this._element.lx;
        this._y = this._element.ly;
        this._updateBound(this._bound, this._element.localGeometry);
        if (!this._sweepAndPrune._xAxis.dirty) {
            this._sweepAndPrune._xAxis.dirty=1;
        } else {
            this._sweepAndPrune._xAxis.dirty++;
        }
        if (!this._sweepAndPrune._yAxis.dirty) {
            this._sweepAndPrune._yAxis.dirty=1;
        } else {
            this._sweepAndPrune._yAxis.dirty++;
        }
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
            for (let bound of record.bounds) {
                this._elements.set(bound.element, record);
            }
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
        let record = element._createSAPRecord ? element._createSAPRecord(this) : new SAPRecord(element, this);
        record.createBounds();
        return record;
    }

    _getRecord(element) {
        return this._elements.get(element);
    }

    elementsInPoint(x, y) {
        this.updateInternals();
        let collectedOnX = new ESet();
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
        this.updateInternals();
        let record = this._getRecord(element);
        let left = record.left(element);
        let right = record.right(element);
        let top = record.top(element);
        let bottom = record.bottom(element);
        return new Box(left, top, right-left, bottom-top)
    }

    elementsInBox(left, top, right, bottom) {
        this.updateInternals();
        let collectedOnX = new ESet();
        let index = dichotomousSearch(this._xAxis, left, (v, b) => v - b.value);
        if (index > 0 && index < this._xAxis.length && this._xAxis[index].value > left) index--;
        while ( this._xAxis[index] && this._xAxis[index].value < right) {
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
        index = dichotomousSearch(this._yAxis, top, (v, b) => v - b.value);
        if (index > 0 && index < this._yAxis.length && this._yAxis[index].value > top) index--;
        while (this._yAxis[index] && this._yAxis[index].value < bottom) {
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
        if (this._xAxis.dirty) {
            insertionSort(this._xAxis, this._comparator);
            for (let index = 0; index < this._xAxis.length; index++) {
                this._xAxis[index].index = index;
            }
            let opened = new List();
            for (let boundary of this._xAxis) {
                if (boundary.first) {
                    opened.add(boundary.element);
                    boundary.opened = new ESet(opened);
                } else {
                    opened.remove(boundary.element);
                    boundary.opened = new ESet(opened);
                }
            }
            delete this._xAxis.dirty;
        }
        if (this._yAxis.dirty) {
            insertionSort(this._yAxis, this._comparator);
            for (let index = 0; index < this._yAxis.length; index++) {
                this._yAxis[index].index = index;
            }
            let opened = new List();
            for (let boundary of this._yAxis) {
                if (boundary.first) {
                    opened.add(boundary.element);
                    boundary.opened = new ESet(opened);
                } else {
                    opened.remove(boundary.element);
                    boundary.opened = new ESet(opened);
                }
            }
            delete this._yAxis.dirty;
        }
    }

    collideWith(box) {
        let result = this.elementsInBox(
            box.left+SweepAndPrune.COLLISION_MARGIN,
            box.top+SweepAndPrune.COLLISION_MARGIN,
            box.right-SweepAndPrune.COLLISION_MARGIN,
            box.bottom-SweepAndPrune.COLLISION_MARGIN
        );
        return result;
    }

    near(element, left=1, top=1, right=1, bottom=1) {
        let record = this._getRecord(element);
        if (!record) return new List();
        let result = this.elementsInBox(
            record.left(element) -left,
            record.top(element) -top,
            record.right(element) +right,
            record.bottom(element) +bottom
        );
        result.remove(element);
        return result;
    }
}
SweepAndPrune.COLLISION_MARGIN = 0.0001;
SweepAndPrune.ADJUST_MARGIN = 40;

export function makeCollisionPhysic(superClass) {

    superClass.prototype._init = function(...args) {
        this._elements = new ESet();
        this._supportSAP = new SweepAndPrune();
        this._dragAndDropSAP = new SweepAndPrune();
        this._valids = new EMap();
    };

    superClass.prototype._refresh = function() {
        this._avoidCollisionsForElements();
    };

    superClass.prototype._reset = function() {
        this._elements = this._acceptedElements(this._host.children);
        this._supportSAP.clear();
        this._valids.clear();
        for (let element of this._elements) {
            this._supportSAP.add(element);
            this._valids.set(element, {validX:element.lx, validY:element.ly});
        }
    };

    superClass.prototype.hover = function(elements) {
        this._hover(this._managedElements(elements));
    };

    superClass.prototype._hover = function(elements) {
        this._hoveredElements = new List(...elements);
        let inSAP = this._acceptedElements(this._dragAndDropSAP.elements);
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
        this._avoidCollisionsForDraggedElements(this._hoveredElements);
    };

    superClass.prototype._add = function(element) {
        this._elements.add(element);
        this._supportSAP.add(element);
        this._valids.set(element, {validX:element.lx, validY:element.ly});
    };

    superClass.prototype._remove = function(element) {
        this._elements.delete(element);
        this._supportSAP.remove(element);
        this._valids.delete(element);
    };

    superClass.prototype._move = function(element) {
        this._supportSAP.update(element);
    };

    superClass.prototype._collideWith = function(element, exclude, sap) {
        let elementBox = sap.elementBox(element);
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
     * Fix the position of a MOVED element so this element (if possible...) does not collide with another one on
     * physic host.
     * @param element element to fix
     * @param exclude elements to exclude from processing (these element are those that are not already processed so
     * their positions are not relevant).
     * @private
     */
    superClass.prototype._avoidCollisionsForElement = function(element, exclude, sap, record, originMatrix) {

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
            sap.update(element);
        };

        /**
         * Get a proposition on the X axis. This proposition is the nearest position between the one given by "current"
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
                return ox+SweepAndPrune.COLLISION_MARGIN < rx || same(rx, hx) ? null : rx;
            } else if (ox < hx) {
                let rx = sweepAndPrune.left(target) - element.width / 2;
                return ox-SweepAndPrune.COLLISION_MARGIN > rx || same(rx, hx) ? null : rx;
            } else return null;
        };

        /**
         * Get a proposition on the Y axis. This proposition is the nearest position between the one given by "current"
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
            } else if (oy+SweepAndPrune.COLLISION_MARGIN < hy) {
                let ry = sweepAndPrune.top(target) - element.height / 2;
                return oy-SweepAndPrune.COLLISION_MARGIN > ry || same(ry, hy) ? null : ry;
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
        let invertedMatrix = originMatrix.invert();
        // Coords of last valid position of the element (we have to "go" in this direction...)
        let ox = invertedMatrix.x(record.validX, record.validY);
        let oy = invertedMatrix.y(record.validX, record.validY);
        // In order to avoid (= bug ?) infinite loop
        let cycleCount = 0;
        while (!finished && cycleCount < 100) {
            cycleCount++;
            let targets = this._collideWith(element, exclude, sap);
            if (targets.length > 0) {
                // Get a proposition
                let {fx, fy} = adjust(targets);
                // First case : we have to choice between X and Y : we get the smallest
                if (fx !== null && fy !== null) {
                    let dx = hx > fx ? hx - fx : fx - hx;
                    let dy = hy > fy ? hy - fy : fy - hy;
                    if (dx > dy) {
                        hy = fy;
                    } else {
                        hx = fx;
                    }
                    // 2nd case : only one dimension is available
                } else if (fx !== null) {
                    hx = fx;
                } else if (fy !== null) {
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
        // If final position is "too far" from "current" position, revert to current position, but mark element drag as
        // invalid.
        if (Math.abs(hx - sx) > SweepAndPrune.ADJUST_MARGIN || Math.abs(hy - sy) > SweepAndPrune.ADJUST_MARGIN) {
            put(element, sx, sy, true);
            record.invalid = true;
        } else {
            // Fixing accepted: update drag infos.
            record.validX = originMatrix.x(element.lx, element.ly);
            record.validY = originMatrix.y(element.lx, element.ly);
            delete record.invalid;
        }
        exclude.delete(element);
    };

    superClass.prototype._avoidCollisionsForDraggedElements = function(elements) {
        let exclude = new ESet(elements);
        for (let element of elements) {
            this._avoidCollisionsForElement(element, exclude, this._dragAndDropSAP, element._drag, this._host.global);
        }
    };

    superClass.prototype._avoidCollisionsForElements = function() {
        let elements = new List();
        for (let element of this._valids.keys()) {
            let record = this._valids.get(element);
            if (record.validX !== element.lx || record.validY !== element.ly) {
                elements.add(element);
            }
        }
        let exclude = new ESet(elements);
        for (let element of elements) {
            this._avoidCollisionsForElement(element, exclude, this._supportSAP, this._valids.get(element), new Matrix());
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

export function addBordersToCollisionPhysic(superClass, {bordersCollide}) {

    let init = superClass.prototype._init;
    superClass.prototype._init = function(...args) {
        init.call(this, ...args);
        if (bordersCollide.left || bordersCollide.all) {
            this._addLeftBorder();
        }
        if (bordersCollide.right || bordersCollide.all) {
            this._addRightBorder();
        }
        if (bordersCollide.top || bordersCollide.all) {
            this._addTopBorder();
        }
        if (bordersCollide.bottom || bordersCollide.all) {
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

export function createCollisionPhysic({predicate}) {
    class CollisionPhysic extends Physic {
        constructor(host, ...args) {
            super(host, predicate, ...args);
        }
    }
    makeCollisionPhysic(CollisionPhysic);
    return CollisionPhysic;
}

export function makeCollisionContainer(superClass, {predicate, bordersCollide = null}) {
    let ContainerPhysic = createCollisionPhysic({predicate});
    if (bordersCollide) {
        addBordersToCollisionPhysic(ContainerPhysic, {bordersCollide});
    }
    addPhysicToContainer(superClass, {
        physicBuilder: function() {
            return new ContainerPhysic(this);
        }
    });
    return superClass;
}

class Ground {

    constructor(physic) {
        this._physic = physic;
        this._segments = new AVLTree((s1, s2)=>{
            let value = s1.right-s2.right;
            return value ? value : s1.id-s2.id;
        });
    }

    duplicate() {
        let duplicates = new Ground(this._physic);
        duplicates._segments = new AVLTree(this._segments);
        return duplicates;
    }

    process(element, update=true) {

        function setCarriedBy(element, under, supports) {
            element._fall.carriers = new ESet(supports);
            for (let support of under) {
                if (!support._fall.under) support._fall.under = new ESet();
                support._fall.under.add(element);
            }
            for (let support of supports) {
                if (!support._fall.carried) support._fall.carried = new ESet();
                support._fall.carried.add(element);
            }
        }

        function filterInside(segments, left, right) {
            let it = segments.inside({right:left+SweepAndPrune.COLLISION_MARGIN, id:0}, null);
            let insideSegments = [];
            let segment = it.next().value;
            while (segment && segment.left+SweepAndPrune.COLLISION_MARGIN < right) {
                insideSegments.push(segment);
                segment = it.next().value;
            }
            return insideSegments;
        }

        let id = 1;
        let record = this._physic._supportSAP._getRecord(element);
        let left = record.left(element);
        let right = record.right(element);
        let top = record.top(element);
        let ground = this._physic._host.bottom;
        let supports = new ESet();
        let under = new ESet();
        for (let segment of filterInside(this._segments, left, right)) {
            under.add(segment.element);
            if (same(segment.top, ground)) {
                supports.add(segment.element);
            }
            else if (segment.top < ground) {
                ground = segment.top;
                supports = new ESet([segment.element]);
            }
            if (segment.left < left) {
                this._segments.insert({
                    left:segment.left, right:left, id:id++, top:segment.top, element:segment.element
                });
            }
            if (segment.right > right) {
                segment.left = right;
            }
            else {
                this._segments.delete(segment);
            }
        }
        if (update && this._physic._canFall(element)) {
            let ly = ground - (record.bottom(element) - record.y(element));
            if (ly !== element.ly) {
                element.setLocation(record.x(element), ly);
                this._physic._supportSAP.update(element);
                top = record.top(element);
            }
        }
        setCarriedBy(element, under, supports);
        this._segments.insert({left, right, id:id++, top, element});
    }

}

export function addGravitationToCollisionPhysic(superClass, {
    gravitationPredicate = element=>true,
    carryingPredicate = (carrier, carried, dx, dy)=>true
}={}) {

    superClass.prototype._setCarried = function(elements) {
        for (let element of elements) {
            if (element.isCarriable && element._fall.carriers) {
                for (let support of element._fall.carriers) {
                    let dx = element.lx - support.lx;
                    let dy = element.ly - support.ly;
                    if (support.isCarrier && carryingPredicate(support, element, dx, dy)) {
                        if (!element.carriedBy(support)) {
                            support.addCarried(element);
                        }
                        else {
                            support.moveCarried(element);
                        }
                    }
                }
            }
            if (element.isCarrier) {
                for (let child of element.carried) {
                    if (!element._fall.carried || !element._fall.carried.has(child)) {
                        element.removeCarried(child);
                    }
                }
            }
            delete element._fall;
        }
    };

    superClass.prototype._canFall = function(element) {
        return gravitationPredicate.call(this, element);
    };

    superClass.prototype._letFall = function(elements, ground) {

        let comparator = (e1, e2)=> {
            let b1 = this._supportSAP.bottom(e1);
            let b2 = this._supportSAP.bottom(e2);
            return b2-b1;
        };

        elements.sort(comparator);
        for (let element of elements) {
            element._fall = {};
        }
        for (let element of elements) {
            ground.process(element);
        }
    };

    superClass.prototype._processElements = function() {
        let elements = new List(...this._elements);
        this._letFall(elements, new Ground(this));
        this._setCarried(elements);
    };

    let refresh = superClass.prototype._refresh;
    superClass.prototype._refresh = function() {
        refresh.call(this);
        this._processElements();
    };

    return superClass;
}

export function createGravitationPhysic({predicate, gravitationPredicate, carryingPredicate}) {
    class GravitationPhysic extends createCollisionPhysic({predicate}) {

        constructor(host, ...args) {
            super(host, ...args);
        }
    }
    addGravitationToCollisionPhysic(GravitationPhysic, {gravitationPredicate, carryingPredicate});
    return GravitationPhysic;
}

export function makeGravitationContainer(superClass, {
    predicate, gravitationPredicate, carryingPredicate, bordersCollide = null
}) {
    let ContainerPhysic = createGravitationPhysic({predicate, gravitationPredicate, carryingPredicate});
    if (bordersCollide) {
        addBordersToCollisionPhysic(ContainerPhysic, {bordersCollide});
    }

    addPhysicToContainer(superClass, {
        physicBuilder: function() {
            return new ContainerPhysic(this);
        }
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

    Object.defineProperty(superClass.prototype, "carried", {
        configurable:true,
        get() {
            return this._carried ? this._carried.keys() : [];
        }
    });

    superClass.prototype.addCarried = function(element) {
        if (element.__addCarriedBy) {
            Memento.register(this);
            Memento.register(element);
            this._addCarried(element);
            this._fire(Events.ADD_CARRIED, element);
            element._fire(Events.ADD_CARRIER, this);
        }
    };

    superClass.prototype.moveCarried = function(element) {
        if (element.__addCarriedBy) {
            Memento.register(this);
            Memento.register(element);
            this._moveCarried(element);
            this._fire(Events.MOVE_CARRIED, element);
            element._fire(Events.MOVE_CARRIER, this);
        }
    };

    superClass.prototype.removeCarried = function(element) {
        if (element.__removeCarriedBy) {
            Memento.register(this);
            Memento.register(element);
            this._removeCarried(element);
            this._fire(Events.REMOVE_CARRIED, element);
            element._fire(Events.REMOVE_CARRIER, this);
        }
    };

    superClass.prototype.__addCarried = function(element, record) {
        if (!this._carried) {
            this._carried = new Map();
        }
        this._carried.set(element, record);
    };

    superClass.prototype.__moveCarried = function(element, record) {
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

    superClass.prototype.carry = function(element) {
        return this._carried && this._carried.has(element);
    };

    superClass.prototype._addCarried = function(element) {
        let record = new CloneableObject({
            dx:element.lx-this.lx,
            dy:element.ly-this.ly
        });
        this.__addCarried(element, record);
        element.__addCarriedBy(this, record);
    };

    superClass.prototype._moveCarried = function(element) {
        let record = new CloneableObject({
            dx:element.lx-this.lx,
            dy:element.ly-this.ly
        });
        this.__moveCarried(element, record);
        element.__moveCarriedBy(this, record);
    };

    superClass.prototype._removeCarried = function(element) {
        this.__removeCarried(element);
        element.__removeCarriedBy(this);
    };

    superClass.prototype._clearCarried = function() {
        delete this._carried;
    };

    let getExtension = superClass.prototype.getExtension;
    superClass.prototype.getExtension = function(extension) {
        let elemExtension = getExtension ? getExtension.call(this, extension) : new ESet();
        extension = extension ? extension.merge(elemExtension) : elemExtension;
        if (this._carried) {
            for (let element of this._carried.keys()) {
                if (!extension.has(element)) {
                    extension.add(element);
                    if (element.getExtension) {
                        for (let child of element.getExtension(extension)) {
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
                    if (element.support === this.support) {
                        element.move(this.lx + record.dx, this.ly + record.dy);
                    }
                }
            }
            return true;
        }
        return false;
    };

    let cancelDrop = superClass.prototype._cancelDrop;
    superClass.prototype._cancelDrop = function(dragOperation) {
        cancelDrop && cancelDrop.call(this, dragOperation);
        if (this._carried) {
            for (let element of this._carried.keys()) {
                if (!dragOperation.dropCancelled(element)) {
                    dragOperation.cancelDrop(element);
                }
            }
        }
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

    Object.defineProperty(superClass.prototype, "carriers", {
        configurable:true,
        get() {
            return this._carriedBy ? this._carriedBy.keys() : [];
        }
    });

    superClass.prototype._clearCarriedBy = function() {
        delete this._carriedBy;
    };

    superClass.prototype.__addCarriedBy = function(element, record) {
        if (!this._carriedBy) {
            this._carriedBy = new Map();
        }
        this._carriedBy.set(element, record);
    };

    superClass.prototype.__moveCarriedBy = function(element, record) {
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

    superClass.prototype.carriedBy = function(support) {
        return this._carriedBy && this._carriedBy.has(support);
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

export const Glue = {
    NONE:0,         // Elements should not be glued
    EXTEND:1,       // Elements should be glued. This element must add glued element to its extension
    BREAK:2         // Elements should be glued. This element must not add glued element to its extension
};

export function makeDroppedElementsToGlue(superClass, {gluingStrategy=(element1, element2)=>Glue.EXTEND}={}) {

    let receiveDrop = superClass.prototype._receiveDrop;
    superClass.prototype._receiveDrop = function(element, dragSet) {
        receiveDrop.call(this);
        if (element.isGlueable) {
            let alreadyGlued = element.getGlued(true, true, true, true);
            let gluedElements = this._supportSAP.near(element, 1, 1, 1, 1);
            for (let neighbour of gluedElements) {
                if (!alreadyGlued.has(neighbour)) {
                    if (gluingStrategy(element, neighbour)!==Glue.NONE) {
                        element.glue(neighbour, gluingStrategy);
                    }
                }
                else {
                    alreadyGlued.delete(neighbour);
                }
            }
            for (let neighbour of alreadyGlued) {
                element.unglue(neighbour);
            }
        }
    };

    return superClass;
}

export function makeGlueable(superClass) {

    Object.defineProperty(superClass.prototype, "isGlueable", {
        configurable:true,
        get() {
            return true;
        }
    });

    superClass.prototype.__glue = function(element, record) {
        if (!this._gluedWith) {
            this._gluedWith = new Map();
        }
        this._gluedWith.set(element, record);
    };

    superClass.prototype.__unglue = function(element) {
        if (this._gluedWith) {
            this._gluedWith.delete(element);
            if (!this._gluedWith.size) {
                delete this._gluedWith;
            }
        }
    };

    superClass.prototype._glue = function(element, strategy) {
        this.__glue(element, this._createRecord(element, strategy));
        element.__glue(this, element._createRecord(this, strategy));
    };

    superClass.prototype._unglue = function(element) {
        this.__unglue(element);
        element.__unglue(this);
    };

    superClass.prototype.glue = function(element, strategy=(element1, element2)=>Glue.EXTEND) {
        if (element.isGlueable && (!this._gluedWith || !this._gluedWith.has(element))) {
            Memento.register(this);
            Memento.register(element);
            this._glue(element, strategy);
            element._fire(Events.ADD_GLUED, this);
            this._fire(Events.ADD_GLUED, element);
        }
    };

    superClass.prototype.unglue = function(element) {
        if (element.isGlueable && this._gluedWith && this._gluedWith.has(element)) {
            Memento.register(this);
            Memento.register(element);
            this._unglue(element);
            element._fire(Events.REMOVE_GLUED, this);
            this._fire(Events.REMOVE_GLUED, element);
        }
    };

    superClass.prototype._createRecord = function(element, strategy) {
        return new CloneableObject({
            dx: element.lx - this.lx,
            dy: element.ly - this.ly,
            strategy
        })
    };

    superClass.prototype.clearGlued = function() {
        if (this._gluedWith) {
            for (let element of [...this._gluedWith.keys()]) {
                this.unglue(element);
            }
        }
    };

    Object.defineProperty(superClass.prototype, "gluedWith", {
        configurable:true,
        get() {
            return this._gluedWith ? this._gluedWith.keys() : [];
        }
    });

    superClass.prototype.getGlued = function(left = true, top = true, right = true, bottom = true) {
        let gluedWidth = new ESet();
        if (this._gluedWith) {
            let tlx = this.lx, tly = this.ly,
                tw = this.width/2-SweepAndPrune.COLLISION_MARGIN,
                th = this.height/2-SweepAndPrune.COLLISION_MARGIN;
            for (let neighbour of this._gluedWith) {
                let nlx = neighbour.lx, nly = neighbour.ly,
                    nw = neighbour.width / 2 - SweepAndPrune.COLLISION_MARGIN,
                    nh = neighbour.height / 2 - SweepAndPrune.COLLISION_MARGIN;
                if (left && nlx + nw <= tlx - tw) gluedWidth.add(neighbour);
                else if (top && nly + nh <= tly - th) gluedWidth.add(neighbour);
                else if (right && nlx - nw >= tlx + tw) gluedWidth.add(neighbour);
                else if (bottom && nly - nh >= tly + th) gluedWidth.add(neighbour);
            }
        }
        return gluedWidth;
    };

    let getExtension = superClass.prototype.getExtension;
    superClass.prototype.getExtension = function(extension) {
        let elemExtension = getExtension ? getExtension.call(this, extension) : new ESet();
        extension = extension ? extension.merge(elemExtension) : elemExtension;
        if (this._gluedWith) {
            for (let element of this._gluedWith.keys()) {
                let record = this._gluedWith.get(element);
                if (!extension.has(element) && record.strategy(this, element, record.dx, record.dy)===Glue.EXTEND) {
                    extension.add(element);
                    if (element.getExtension) {
                        for (let child of element.getExtension(extension)) {
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
        if (this._gluedWith) {
            for (let element of [...this._gluedWith.keys()]) {
                let record = this._gluedWith.get(element);
                if (record.strategy(this, element, record.dx, record.dy)!==Glue.EXTEND && !dragSet.has(element)) {
                    this.unglue(element);
                }
            }
        }
    };

    let revertDroppedIn = superClass.prototype._revertDroppedIn;
    superClass.prototype._revertDroppedIn = function () {
        revertDroppedIn && revertDroppedIn.call(this);
        if (this._gluedWith) {
            for (let element of this._gluedWith.keys()) {
                element.__glue(this, element._createRecord(this));
            }
        }
    };

    let cancelDrop = superClass.prototype._cancelDrop;
    superClass.prototype._cancelDrop = function(dragOperation) {
        cancelDrop && cancelDrop.call(this, dragOperation);
        if (this._gluedWith) {
            for (let element of this._gluedWith.keys()) {
                if (!dragOperation.dropCancelled(element)) {
                    dragOperation.cancelDrop(element);
                }
            }
        }
    };

    let cloned = superClass.prototype._cloned;
    superClass.prototype._cloned = function (copy, duplicata) {
        cloned && cloned.call(this, copy, duplicata);
        if (this._gluedWith) {
            for (let element of this._gluedWith.keys()) {
                let childCopy = duplicata.get(element);
                let record = this._gluedWith.get(element);
                copy.__glue(childCopy, record);
            }
        }
    };

    let superDelete = superClass.prototype.delete;
    superClass.prototype.delete = function() {
        let result = superDelete.call(this);
        if (this._gluedWith) {
            for (let element of this._gluedWith.keys()) {
                element.removeCarried(this);
            }
        }
        return result;
    };

    let superMemento = superClass.prototype._memento;
    superClass.prototype._memento = function () {
        let memento = superMemento.call(this);
        if (this._gluedWith) {
            memento._gluedWith = new Map(this._gluedWith);
        }
        return memento;
    };

    let superRevert = superClass.prototype._revert;
    superClass.prototype._revert = function (memento) {
        superRevert.call(this, memento);
        if (memento._gluedWith) {
            this._gluedWith = new Map(memento._gluedWith);
        }
        else {
            delete this._gluedWith;
        }
        return this;
    };

    return superClass;
}

export function addGlueToGravitationPhysic(
    superClass) {

    addGravitationToCollisionPhysic(superClass);

    superClass.prototype._getBlocks = function (elements) {

        function setToBlock(blocks, element, block) {
            block.elements.add(element);
            blocks.set(element, block);
            element._fall.block = block;
        }

        let blocks = new Map();
        for (let element of elements) {
            let block = element._fall.block;
            if (!block) {
                block = {
                    elements : new ESet(),
                    bottom : this._supportSAP.bottom(element)
                };
                setToBlock(blocks, element, block);
            }
            if (element.isGlueable) {
                for (let neighbour of element.gluedWith) {
                    let nblock = neighbour._fall.block;
                    if (nblock) {
                        for (let friend of nblock.elements) {
                            setToBlock(blocks, friend, block);
                        }
                    }
                    else {
                        setToBlock(blocks, neighbour, block);
                    }
                }
            }
        }
        return [...new ESet(blocks.values())];
    };

    superClass.prototype._processBlock = function(block) {

        function ascend(element, dy, carrier) {
            if (same(dy, 0)) {
                if (carrier) {
                    element._fall.carriers ? element._fall.carriers.add(carrier) : element._fall.carriers = new ESet([carrier]);
                    carrier._fall.carried ? carrier._fall.carried.add(element) : carrier._fall.carried = new ESet([element]);
                }
            }
            else if (dy > 0) {
                let ly = element.ly - dy;
                let ely = ly - element._fall.ly;
                if (element._fall.block.dy>ely) {
                    element._fall.block.dy = ely;
                }
                element.setLocation(element.lx, ly);
                this._supportSAP.update(element);
                if (element._fall.under) {
                    for (let carried of element._fall.under) {
                        let mdy = this._supportSAP.top(element)-this._supportSAP.bottom(carried);
                        ascend.call(this, carried, -mdy, element);
                    }
                }
                if (carrier) {
                    element._fall.carriers = new ESet([carrier]);
                    carrier._fall.carried = new ESet([element]);
                }
            }
        }

        for (let element of block.elements) {
            let dy = element.ly-element._fall.ly-block.dy;
            ascend.call(this, element, dy, null);
        }
    };

    superClass.prototype._processElements = function() {
        function computeBlockFall(block) {
            block.dy = Infinity;
            for (let element of block.elements) {
                let dy = element.ly - element._fall.ly;
                if (dy<block.dy) block.dy = dy;
            }
        }

        let elements = new List(...this._elements);
        for (let element of elements) {
            element._clearCarried && element._clearCarried();
            element._clearCarriedBy && element._clearCarriedBy();
            element._fall = {ly: element.ly};
        }
        let blocks = this._getBlocks(elements);
        this._letFall(elements, new Ground(this));
        for (let block of blocks) {
            computeBlockFall(block);
        }
        blocks.sort((b1, b2)=>b1.dy - b2.dy);
        for (let block of blocks) {
            this._processBlock(block);
        }
        this._setCarried(this._elements);
    };

    return superClass;
}

export function createStickyGravitationPhysic({
      predicate, gravitationPredicate, carryingPredicate, gluingStrategy
  }) {

    class StickyGravitationPhysic extends createGravitationPhysic({
        predicate, gravitationPredicate, carryingPredicate
    }) {
        constructor(host, ...args) {
            super(host, predicate, ...args);
        }
    }
    addGlueToGravitationPhysic(StickyGravitationPhysic);
    if (gluingStrategy) {
        makeDroppedElementsToGlue(StickyGravitationPhysic, {gluingStrategy});
    }
    return StickyGravitationPhysic;
}

export function makeStickyGravitationContainer(superClass, {
    predicate, gravitationPredicate, carryingPredicate,
    gluingStrategy = null,
    bordersCollide
}) {
    class ContainerPhysic extends createStickyGravitationPhysic({
        predicate, gravitationPredicate, carryingPredicate, gluingStrategy
    }) {}

    if (bordersCollide) {
        addBordersToCollisionPhysic(ContainerPhysic, bordersCollide);
    }
    addPhysicToContainer(superClass, {
        physicBuilder: function() {
            return new ContainerPhysic(this);
        }
    });
    return superClass;
}
