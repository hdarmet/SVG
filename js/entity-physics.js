import {
    dichotomousSearch, List, ESet
} from "./collections.js";
import {
    SAPRecord2D, SweepAndPrune2D, makeAbstractCollisionPhysic, AbstractGround, addGravitationToCollisionPhysic
} from "./collision-physics.js";
import {
    Box2D, Box3D, Point3D
} from "./geometry.js";
import {
    defineMethod, replaceMethod, defineGetProperty, extendMethod, replaceGetProperty, same, assert
} from "./misc.js";
import {
    Physic
} from "./physics.js";

class GroundStructure3DZone {

    constructor(left, top, right, bottom, elevation, entity) {
        this._left = left;
        this._top = top;
        this._right = right;
        this._bottom = bottom;
        this._elevation = elevation;
        this._entity = entity;
    }

    get left() {
        return this._left;
    }

    get right() {
        return this._right;
    }

    get top() {
        return this._top;
    }

    get bottom() {
        return this._bottom;
    }

    get elevation() {
        return this._elevation;
    }

    get entity() {
        return this._entity;
    }

    get localGeometry() {
        return new Box2D(this._left, this._top, this._right-this._left, this._bottom-this._top);
    }
}

class GroundStructure3D {

    constructor() {
        this._id = 0;
        this._sweepAndPrune = new SweepAndPrune2D();
    }

    filter(entity, record) {
        let left = record.left(entity);
        let right = record.right(entity);
        let front = record.front(entity);
        let back = record.back(entity);
        let box = new Box2D(left, back, right-left, front-back);
        let collides = this._sweepAndPrune.elementsInBox(box);
        let result = new List();
        for (let zone of collides) {
            result.add({element:zone.entity, top:zone.elevation});
        }
        return result;
    }

    update(entity, record, zone) {
        let left = record.left(entity);
        let right = record.right(entity);
        let front = record.front(entity);
        let back = record.back(entity);
        if (zone.left<left) {
            this._sweepAndPrune.add(
                new GroundStructure3DZone(left, back, zone.left, front, zone.elevation, entity)
            );
        }
        if (zone.right>right) {
            this._sweepAndPrune.add(
                new GroundStructure3DZone(zone.right, back, right, front, zone.elevation, entity)
            );
        }
        if (zone.top<back) {
            this._sweepAndPrune.add(
                new GroundStructure3DZone(zone.left, back, zone.right, zone.top, zone.elevation, entity)
            );
        }
        if (zone.bottom>front) {
            this._sweepAndPrune.add(
                new GroundStructure3DZone(zone.left, zone.bottom, zone.right, front, zone.elevation, entity)
            );
        }
        this._sweepAndPrune.remove(zone);
    }

    add(entity, record) {
        let left = record.left(entity);
        let right = record.right(entity);
        let front = record.front(entity);
        let back = record.back(entity);
        let elevation = record.top(entity);
        this._sweepAndPrune.add(new GroundStructure3DZone(left, back, right, front, elevation, entity));
    }

}

export class SAPRecord3D extends SAPRecord2D {

    constructor(element, sweepAndPrune) {
        super(element, sweepAndPrune);
    }

    _createBound(element) {
        let bound = super._createBound(element);
        let geometry = element.localGeometry;
        assert(geometry.back);
        let depthSlim = same(geometry.front, geometry.back);
        bound.back = {first: true, value: geometry.back, slim:depthSlim, element, index: -1, opened: new ESet([element])};
        bound.front = {first: false, value: geometry.front, slim:depthSlim, element, index: -1, opened: new ESet()};
        bound.back.index = this._sweepAndPrune._zAxis.length;
        bound.front.index = this._sweepAndPrune._zAxis.length + 1;
        this._sweepAndPrune._zAxis.push(bound.back, bound.front);
        this._sweepAndPrune._zAxis.dirty = 2;
        return bound;
    }

    createBounds() {
        this._z = this._element.lz;
        super.createBounds();
    }

    _removeBound(bound) {
        super._removeBound(bound);
        bound.front.removed = true;
        bound.back.removed = true;
    }

    remove() {
        super.remove();
        this._sweepAndPrune._zAxis.dirty = 2;
    }

    _updateBound(bound, box) {
        super._updateBound(bound, box);
        bound.front.value = box.front;
        bound.back.value = box.back;
    }

    update() {
        this._z = this._element.lz;
        super.update();
        if (!this._sweepAndPrune._zAxis.dirty) {
            this._sweepAndPrune._zAxis.dirty=1;
        } else {
            this._sweepAndPrune._zAxis.dirty++;
        }
    }

    front(element) {
        return this._bound.front.value;
    }

    back(element) {
        return this._bound.back.value;
    }

    z(element) {
        return this._z;
    }

    get box() {
        return new Box3D(
            this._bound.left.value,
            this._bound.top.value,
            this._bound.back.value,
            this._bound.right.value-this._bound.left.value,
            this._bound.bottom.value-this._bound.top.value,
            this._bound.front.value-this._bound.back.value
        );
    }
}

export class SweepAndPrune3D extends SweepAndPrune2D {

    constructor() {
        super();
        this._zAxis = new List();
    }

    log() {
        super.log();
        console.log("Z Axis: ", [...this._zAxis]);
    }

    clear() {
        super.clear();
        this._zAxis.clear();
    }

    front(element) {
        let record = this._getRecord(element);
        return record ? record.front(element) : null;
    }

    back(element) {
        let record = this._getRecord(element);
        return record ? record.back(element) : null;
    }

    _mustRefreshEverything() {
        return super._mustRefreshEverything() || this._zAxis.dirty >= 2;
    }

    _refreshRecord(record) {
        super._refreshRecord(record);
        for (let bound of record.bounds) {
            this._updateOnAxis(this._zAxis, bound.back, bound.front);
        }
        delete this._zAxis.dirty;
    }

    _createDefaultRecord(element) {
        return  new SAPRecord3D(element, this);
    }

    elementsInPoint(x, y, z) {
        let result = super.elementsInPoint(x, y);
        if (result.length) {
            let collectedOnXY = new ESet(result);
            let result = new List();
            let index = dichotomousSearch(this._zAxis, z, (v, b) => v - b.value);
            if (index > 0) {
                for (let element of this._zAxis[index - 1].opened) {
                    if (collectedOnXY.delete(element)) {
                        result.add(element);
                    }
                }
            }
        }
        return result;
    }

    elementsInBox(box) {
        let result = super.elementsInBox(box);
        let front = box.front;
        let back = box.back;
        if (result.length) {
            let collectedOnXY = new ESet(result);
            result = new List();
            let index = dichotomousSearch(this._zAxis, back, (v, b) => v - b.value);
            if (index > 0 && index < this._zAxis.length && this._zAxis[index].value > back) index--;
            while (this._zAxis[index] && this._zAxis[index].value < front) {
                if (this._zAxis[index].value!==back || this._zAxis[index].first) {
                    for (let element of this._zAxis[index].opened) {
                        if (collectedOnXY.delete(element)) {
                            result.add(element);
                        }
                    }
                }
                index++;
            }
        }
        return result;
    }

    updateInternals() {
        super.updateInternals();
        this._updateAxis(this._zAxis);
    }

}

export function makeCollisionPhysicForEntities(superClass) {

    makeAbstractCollisionPhysic(superClass);

    defineMethod(superClass,
        function _createSweepAndPrunes() {
            this._supportSAP = new SweepAndPrune3D();
            this._dragAndDropSAP = new SweepAndPrune3D();
        }
    );

    replaceMethod(superClass,
        function hover(previousEntities, entities) {
            this._hover(previousEntities, entities);
            this._refresh();
            this._host._fire(Physic.events.REFRESH_HOVER, this, entities);
            return this;
        }
    );

    extendMethod(superClass, $removeHovered=>
        function _removeHovered(element) {
            $removeHovered.call(this, element);
            if (this._elements.has(element)) {
                this._supportSAP.add(element);
                this._valids.set(element, element.validLocation);
            }
        }
    );

    replaceMethod(superClass,
        function _move(element) {
            if (this._supportSAP.has(element)) {
                this._supportSAP.update(element);
            }
        }
    );

    defineGetProperty(superClass,
        function _noResult() {
            return { x:null, y:null, z:null }
        }
    );

    /**
     * Set the fixed position of the element and update physics internal structures accordingly. Note that this
     * element is ALWAYS a DnD'ed one.
     * @param element element to displace.
     * @param x new X ccords of the element
     * @param y new Y coords of the element.
     * @param z new Z coords of the element.
     */
    defineMethod(superClass,
        function _put(element, sap, {x, y, z}) {
            // setLocation(), not move(), on order to keep the DnD fluid (floating elements not correlated).
            element.setLocation(new Point3D(x, y, z));
            sap.update(element);
        }
    );

    defineMethod(superClass,
        function _adjustOnTarget(element, target, o, h) {
            let sap = this.sweepAndPrune(target);
            let fx = this._adjustOnAxis(target, o.x, h.x, sap, sap.left, sap.right, element.width);
            let fy = this._adjustOnAxis(target, o.y, h.y, sap, sap.top, sap.bottom, element.height);
            let fz = this._adjustOnAxis(target, o.z, h.z, sap, sap.back, sap.front, element.depth);
            if (fx!==null || fy!==null || fz!==null) {
                return {x:fx, y:fy, z:fz};
            }
        }
    );

    defineMethod(superClass,
        function _getPlacement(f, h, o) {
            let dx = f.x!==null ? (f.x > h.x ? f.x - h.x : h.x - f.x) : Infinity;
            let dy = f.y!==null ? (f.y > h.y ? f.y - h.y : h.y - f.y) : Infinity;
            let dz = f.z!==null ? (f.z > h.z ? f.z - h.z : h.z - f.z) : Infinity;
            if (dx<dy && dx<dz) {
                h.x = f.x;
            }
            else if (dy<dz) {
                h.y = f.y
            }
            else if (dz<Infinity) {
                h.z = f.z;
            } else {
                // Last case : no proposition is available. We revert to last valid position
                h.x = o.x;
                h.y = o.y;
                h.z = o.z;
                h._check();
                return true;
            }
            return false;
        }
    );

}

export class EmbodimentPhysic {

    constructor(host) {
        this._host = host;
    }

    get host() {
        return this._host;
    }

    get entityPhysic() {
        return this.host.entity.physic;
    }

    resize(width, height) {
        this.entityPhysic.resize();
        return this;
    }

    reset() {
        this.entityPhysic.reset();
        return this;
    }

    managedEntities(elements) {
        let managedEntities = new List();
        for (let element of elements) {
            if (this.entityPhysic.accept(element.entity)) {
                managedEntities.add(element.entity);
            }
        }
        return managedEntities;
    }

    hover(elements) {
        let managedEntities = this.managedEntities(elements);
        this.entityPhysic.hover(this._managedEntities, managedEntities);
        this._managedEntities = new ESet(managedEntities);
        this._host._fire(Physic.events.REFRESH_HOVER, this, managedEntities);
        return this;
    }

    add(element) {
        this.entityPhysic.add(element.entity);
        return this;
    }

    remove(element) {
        this.entityPhysic.remove(element.entity);
        return this;
    }

    move(element) {
        this.entityPhysic.move(element.entity);
        return this;
    }

    accept(element) {
        return this.entityPhysic.accept(element.entity);
    }

    clone(duplicata) {
        let copy = new this.constructor(duplicata.get(this._host));
        return copy;
    }

    _acceptDrop(element, dragSet) {
        return this.entityPhysic._acceptDrop(element, dragSet);
    }

    _receiveDrop(element, dragSet) {
        return this.entityPhysic._receiveDrop(element, dragSet);
    }
}

export function addPhysicToEntity(superClass, {physicBuilder}) {

    extendMethod(superClass, $init=>
        function _init(...args) {
            let result = $init.call(this, ...args);
            this._initPhysic();
            return result;
        }
    );

    defineMethod(superClass,
        function _initPhysic() {
            this._physic = physicBuilder.call(this);
            return this;
        }
    );

    defineGetProperty(superClass,
        function physic() {
            return this._physic;
        }
    );

    extendMethod(superClass, $setSize=>
        function _setSize(width, height, depth) {
            $setSize && $setSize.call(this, width, height, depth);
            this.physic.resize(width, height, depth);
        }
    );

    extendMethod(superClass, $recover=>
        function _recover(memento) {
            $recover && $recover.call(this, memento);
            this.physic.reset();
        }
    );

}

export function createCollisionPhysicForEntities({predicate}) {
    class CollisionEntityPhysic extends Physic {
        constructor(host, ...args) {
            super(host, predicate, ...args);
        }
    }
    makeCollisionPhysicForEntities(CollisionEntityPhysic);
    return CollisionEntityPhysic;
}

export function makeContainerSorted(superClass, comparator) {

    defineMethod(superClass,
        function _sortChildren() {
            if (this._children) {
                this._children.sort(comparator);
                for (let index = 0; index < this._children.length; index++) {
                    let child = this._content.get(index);
                    if (this._children[index] != child.owner) {
                        this._content.insert(child, this._children[index]._root);
                    }
                }
            }
        }
    );

    extendMethod(superClass, $addChild=>
        function _addChild(element) {
            $addChild.call(this, element);
            this._sortChildren();
        }
    );

    extendMethod(superClass, $insertChild=>
        function _insertChild(previous, element) {
            $insertChild.call(this, previous, element);
            this._sortChildren();
        }
    );

    extendMethod(superClass, $replaceChild=>
        function _replaceChild(previous, element) {
            $replaceChild.call(this, previous, element);
            this._sortChildren();
        }
    );

    extendMethod(superClass, $removeChild=>
        function _removeChild(element) {
            $removeChild.call(this, element);
            this._sortChildren();
        }
    );

    extendMethod(superClass, $shiftChild=>
        function _shiftChild(element, point) {
            $shiftChild.call(this, element, point);
            this._sortChildren();
        }
    );

}

export function makeContainerSortedFromTop(superClass, comparator) {

    makeContainerSorted(superClass, function(e1, e2) {
       let diff = e2.entity.ly-e1.entity.ly;
       if (diff) return diff;
       return e1.id<e2.id ? -1 : 1;
    });

}

export function makeContainerSortedFromFront(superClass, comparator) {

    makeContainerSorted(superClass, function(e1, e2) {
        let diff = e1.entity.lz-e2.entity.lz;
        if (diff) return diff;
        return e1.id<e2.id ? -1 : 1;
    });

}

/**
 * Class of objects that materialize a 3D container border, in order to prevent contained elements to collide with such
 * borders. Borders help to "box" contained element inside their container.
 */
export class PhysicBorder3D {

    /**
     * Creates a new SD Border
     * @param physic collision physic which this border object belong.
     * @param x <b>function, not value<b> that compute the central point location of the border on horizontal axis.
     * @param y <b>function, not value<b> that compute the central point location of the border on vertical axis.
     * @param z <b>function, not value<b> that compute the central point location of the border on depth axis.
     * @param width <b>function, not value<b> that compute the width of the border (0 or host's width, depending on border).
     * @param height <b>function, not value<b> that compute the height of the border (0 or host's height, depending on border).
     * @param depth <b>function, not value<b> that compute the depth of the border (0 or host's depth, depending on border).
     */
    constructor(physic, x, y, z, width, height, depth) {
        this._physic = physic;
        this._x = x;
        this._y = y;
        this._z = z;
        this._width = width;
        this._height = height;
        this._depth = depth;
    }

    /**
     * Returns the border central point location on horizontal axis (in host's coordinate system).
     * @returns {*}
     */
    get lx() {
        return this._x();
    }

    /**
     * Returns the border central point location on vertical axis (in host's coordinate system).
     * @returns {*}
     */
    get ly() {
        return this._y();
    }

    /**
     * Returns the border central point location on depth axis (in host's coordinate system).
     * @returns {*}
     */
    get lz() {
        return this._z();
    }

    /**
     * Returns the bounding box of the border (in host's coordinate system)
     * @returns
     */
    get localGeometry() {
        return new Box3D(
            this._x()-this._width()/2,
            this._y()-this._height()/2,
            this._z()-this._depth()/2,
            this._width(),
            this._height(),
            this._depth());
    }

}

/**
 * This Trait add the "Borders" capability to a 3D collision physic. A collision physic (only) with this capability may
 * prevent a contained element to collide with all or some of its (collision physic's) host borders
 * (left/right/top/bottom/front/back).
 * @param superClass 3D collision physic class
 * @param bordersCollide specify which borders may be "activated".
 */
export function addBordersTo3DCollisionPhysic(superClass, {bordersCollide}) {

    /**
     * Extends physic's init method in order to create the borders objects (inside collision physic) and bounds (inside
     * "supportSAP" object). Note that only borders mentioned in the borderCollide specificaion ave created.
     */
    extendMethod(superClass, $init=>
        function _init(...args) {
            $init.call(this, ...args);
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
            if (bordersCollide.back || bordersCollide.all) {
                this._addBackBorder();
            }
            if (bordersCollide.front || bordersCollide.all) {
                this._addFrontBorder();
            }
            this._trigger();
        }
    );

    /**
     * Add a "left" border to collision physic.
     * @private
     */
    defineMethod(superClass,
        function _addLeftBorder() {
            this._leftBorder = new PhysicBorder3D(
                this,
                () => -this.host.width / 2,
                () => 0,
                () => 0,
                () => 0,
                () => this.host.height,
                () => this.host.depth
            );
            this._supportSAP.add(this._leftBorder);
            return this;
        }
    );

    /**
     * Add a "right" border to collision physic.
     * @private
     */
    defineMethod(superClass,
        function _addRightBorder() {
            this._rightBorder = new PhysicBorder3D(
                this,
                () => this.host.width / 2,
                () => 0,
                () => 0,
                () => 0,
                () => this.host.height,
                () => this.host.depth
            );
            this._supportSAP.add(this._rightBorder);
            return this;
        }
    );

    /**
     * Add a "top" border to collision physic.
     * @private
     */
    defineMethod(superClass,
        function _addTopBorder() {
            this._topBorder = new PhysicBorder3D(
                this,
                () => 0,
                () => -this.host.height / 2,
                () => 0,
                () => this.host.width,
                () => 0,
                () => this.host.depth
            );
            this._supportSAP.add(this._topBorder);
            return this;
        }
    );

    /**
     * Add a "bottom" border to collision physic.
     * @private
     */
    defineMethod(superClass,
        function _addBottomBorder() {
            this._bottomBorder = new PhysicBorder3D(
                this,
                () => 0,
                () => this.host.height / 2,
                () => 0,
                () => this.host.width,
                () => 0,
                () => this.host.depth
            );
            this._supportSAP.add(this._bottomBorder);
            return this;
        }
    );

    /**
     * Add a "back" border to collision physic.
     * @private
     */
    defineMethod(superClass,
        function _addBackBorder() {
            this._backBorder = new PhysicBorder3D(
                this,
                () => 0,
                () => 0,
                () => -this.host.depth / 2,
                () => this.host.width,
                () => this.host.height,
                () => 0
            );
            this._supportSAP.add(this._backBorder);
            return this;
        }
    );

    /**
     * Add a "front" border to collision physic.
     * @private
     */
    defineMethod(superClass,
        function _addFrontBorder() {
            this._frontBorder = new PhysicBorder3D(
                this,
                () => 0,
                () => 0,
                () => this.host.depth / 2,
                () => this.host.width,
                () => this.host.height,
                () => 0
            );
            this._supportSAP.add(this._frontBorder);
            return this;
        }
    );

    /**
     * Extends collision physic resize method so that method can warn the "support Sweep And Prune" object that borders
     * have moved (according to new host dimension) and their related bounds must be updated.
     * @param widrh new collision physic's host width
     * @param height new collision physic's host height
     * @param depth new collision physic's host depth
     */
    extendMethod(superClass, $resize=>
        function resize(width, height, depth) {
            $resize && $resize.call(this, width, height, depth);
            if (this._leftBorder) {
                this._supportSAP.update(this._leftBorder);
            }
            if (this._rightBorder) {
                this._supportSAP.update(this._rightBorder);
            }
            if (this._topBorder) {
                this._supportSAP.update(this._topBorder);
            }
            if (this._bottomBorder) {
                this._supportSAP.update(this._bottomBorder);
            }
            if (this._backBorder) {
                this._supportSAP.update(this._backBorder);
            }
            if (this._frontBorder) {
                this._supportSAP.update(this._frontBorder);
            }
        }
    );

    /**
     * Extends collision physic reset method so that method includes borders object and bounds in the
     * (re-)initialisation process.
     */
    extendMethod(superClass, $reset=>
        function _reset() {
            $reset.call(this);
            this._leftBorder && this._supportSAP.add(this._leftBorder);
            this._rightBorder && this._supportSAP.add(this._rightBorder);
            this._topBorder && this._supportSAP.add(this._topBorder);
            this._bottomBorder && this._supportSAP.add(this._bottomBorder);
            this._backBorder && this._supportSAP.add(this._backBorder);
            this._frontBorder && this._supportSAP.add(this._frontBorder);
        }
    );

}

class GroundForEntities extends AbstractGround {

    _createGroundStructure() {
        return new GroundStructure3D();
    }

    _fallingPoint(element, y) {
        let record = this._physic._supportSAP._getRecord(element);
        return new Point3D(record.x(element), y, record.z(element));
    }
}


export function addGravitationToCollisionPhysicForEntities(superClass, {gravitationPredicate, carryingPredicate}) {

    addGravitationToCollisionPhysic(superClass, {gravitationPredicate, carryingPredicate});

    defineMethod(superClass,
        function _createGround() {
            return new GroundForEntities(this);
        }
    );

}

export function createGravitationPhysicForEntities({predicate, gravitationPredicate, carryingPredicate}) {
    class GravitationPhysic extends createCollisionPhysicForEntities({predicate}) {

        constructor(host, ...args) {
            super(host, ...args);
        }
    }
    addGravitationToCollisionPhysicForEntities(GravitationPhysic, {gravitationPredicate, carryingPredicate});
    return GravitationPhysic;
}
