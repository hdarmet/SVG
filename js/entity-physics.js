import {
    dichotomousSearch, List, ESet
} from "./collections.js";
import {
    SAPRecord2D, SweepAndPrune2D, makeCollisionPhysic2D
} from "./collision-physics.js";
import {
    Box2D, Box3D
} from "./geometry.js";
import {
    defineMethod, replaceMethod, defineGetProperty, extendMethod, same
} from "./misc.js";
import {
    Physic
} from "./physics.js";

class GroundStructure3D {

    constructor() {
        this._id = 0;
        this._sweepAndPrune = new SweepAndPrune2D();
    }

    filter(element, record) {
        let left = record.left(element);
        let right = record.right(element);
        let front = record.front(element);
        let back = record.back(element);
        let box = new Box2D(left, front, right-left, back-front);
        let collides = this._sweepAndPrune.elementsInBox(box);
        let result = new List();
        for (let element of collides) {
            result.add({element, top:element.localGeometry.top});
        }
        return result;
    }

    update(element, record, segment) {
        let left = record.left(element);
        let right = record.right(element);
        if (segment.left < left) {
            this._segments.insert({
                left:segment.left, right:left, id:this._id++, top:segment.top, element:segment.element
            });
        }
        if (segment.right > right) {
            segment.left = right;
        }
        else {
            this._segments.delete(segment);
        }
    }

    add(element, record) {
        let left = record.left(element);
        let right = record.right(element);
        let top = record.top(element);
        this._segments.insert({left, right, id:this._id++, top, element});
    }
}

export class SAPRecord3D extends SAPRecord2D {

    constructor(element, sweepAndPrune) {
        super(element, sweepAndPrune);
    }

    _createBound(element) {
        let bound = super._createBound(element);
        let geometry = element.localGeometry;
        let depthSlim = same(geometry.front, geometry.back);
        bound.back = {first: true, value: geometry.front, slim:depthSlim, element, index: -1, opened: new ESet([element])};
        bound.front = {first: false, value: geometry.back, slim:depthSlim, element, index: -1, opened: new ESet()};
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
            this._updateOnAxis(this._zAxis, bound.front, bound.back);
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
            let result = new List();
            let index = dichotomousSearch(this._zAxis, front, (v, b) => v - b.value);
            if (index > 0 && index < this._zAxis.length && this._zAxis[index].value > front) index--;
            while (this._zAxis[index] && this._zAxis[index].value < back) {
                for (let element of this._zAxis[index].opened) {
                    if (collectedOnXY.delete(element)) {
                        result.add(element);
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

export function makeCollisionPhysic3D(superClass) {

    makeCollisionPhysic2D(superClass);

    replaceMethod(superClass,
        function _createSweepAndPrunes() {
            this._supportSAP = new SweepAndPrune3D();
            this._dragAndDropSAP = new SweepAndPrune3D();
        }
    );

    replaceMethod(superClass,
        function hover(previousEntities, entities) {
            this._hover(previousEntities, entities);
            this._refresh();
            this._host._fire(Physic.events.REFRESH_HOVER, this, managedElements);
            return this;
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
    replaceMethod(superClass,
        function _put(element, sap, {x, y, z}) {
            // setLocation(), not move(), on order to keep the DnD fluid (floating elements not correlated).
            element.setLocation(x, y, z);
            sap.update(element);
        }
    );

    replaceMethod(superClass,
        function _adjustOnTarget(element, target, o, h) {
            let sap = this.sweepAndPrune(target);
            let fx = this._adjustOnAxis(target, o.x, h.x, sap, sap.left, sap.right, element.width);
            let fy = this._adjustOnAxis(target, o.y, h.y, sap, sap.top, sap.bottom, element.height);
            let fz = this._adjustOnAxis(target, o.z, h.z, sap, sap.front, sap.back, element.depth);
            if (fx!==null || fy!==null || fz!==null) {
                return {x:fx, y:fy, z:fz};
            }
        }
    );

    replaceMethod(superClass,
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
                managedEntities.add(element);
            }
        }
        return managedEntities;
    }

    hover(elements) {
        let managedEntities = this.managedEntities(elements);
        this.entityPhysic.hover(this._managedEntities, managedEntities);
        this._managedEntities = managedEntities;
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

    extendMethod(superClass, $setsize=>
        function _setSize(width, height, depth) {
            $setsize && $setsize.call(this, width, height, depth);
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

export function createCollisionEntityPhysic({predicate}) {
    class CollisionEntityPhysic extends Physic {
        constructor(host, ...args) {
            super(host, predicate, ...args);
        }
    }
    makeCollisionPhysic3D(CollisionEntityPhysic);
    return CollisionEntityPhysic;
}