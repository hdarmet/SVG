'use strict';

/**
 * Arrays with standardized API (add, insert, size, delete...)
 */
export class List extends Array {

    constructor(...args) {
        super(...args);
    }

    /**
     * Add a value at the end of the list.
     * @param val to add
     * @returns index of added value (= last record of the list).
     */
    add(val) {
        this.push(val);
        return this.length-1;
    }

    replace(oldVal, val) {
        let i = this.indexOf(oldVal);
        if (i===-1) return undefined;
        this[i] = val;
        return i;
    }

    insert(beforeVal, val) {
        let i = this.indexOf(beforeVal);
        if (i===-1) return undefined;
        this.splice(i, 0, val);
        return i;
    }

    remove(val) {
        let i = this.indexOf(val);
        if (i===-1) return undefined;
        this.splice(i, 1);
        return val;
    }

    delete(val) {
        return this.remove(val);
    }

    contains(val) {
        return this.indexOf(val) >= 0;
    }

    equals(val) {
        if (val.length === undefined || val.length !== this.length) {
            return false;
        }
        for (let i = 0; i < this.length; i++) {
            if (val[i] !== this[i]) {
                return false;
            }
        }
        return true;
    }

    get size() {
        return this.length;
    }

    clear() {
        return (this.length = 0);
    }

    get empty() {
        return this.length === 0;
    }

    duplicate() {
        return this.slice(0);
    }
}

/**
 * Class of set that contains some set methods like union, diff, intersect and do on.
 */
export class ESet extends Set {

    constructor(...iterables) {
        super();
        this.merge(...iterables);
    }

    merge(...iterables) {
        for (let iterable of iterables) {
            for (let item of iterable) {
                this.add(item);
            }
        }
        return this;
    }

    union(...iterables) {
        let newSet = new this.constructor(this);
        for (let iterable of iterables) {
            for (let item of iterable) {
                newSet.add(item);
            }
        }
        return newSet;
    }

    intersect(target) {
        let newSet = new this.constructor();
        for (let item of this) {
            if (target.has(item)) {
                newSet.add(item);
            }
        }
        return newSet;
    }

    diff(target) {
        let newSet = new this.constructor();
        for (let item of this) {
            if (!target.has(item)) {
                newSet.add(item);
            }
        }
        return newSet;
    }

    same(target) {
        let tsize;
        if ("size" in target) {
            tsize = target.size;
        } else if ("length" in target) {
            tsize = target.length;
        } else {
            throw new TypeError("target must be an iterable like a Set with .size or .length");
        }
        if (tsize !== this.size) {
            return false;
        }
        for (let item of target) {
            if (!this.has(item)) {
                return false;
            }
        }
        return true;
    }

}

/**
 * Class of map that contains some set methods like union, diff, intersect and do on.
 */
export class EMap extends Map {

    constructor(...maps) {
        super();
        this.merge(...maps);
    }

    merge(...maps) {
        for (let map of maps) {
            let entries;
            if (map instanceof Map) {
                entries = map.entries();
            }
            else if (map instanceof Array) {
                entries = map;
            }
            else {
                throw new TypeError(`Cannot interpret ${map} as a map`);
            }
            for (let entry of entries) {
                if (entry instanceof Array) {
                    this.set(entry[0], entry[1]);
                }
                else {
                    throw new TypeError(`Key/value pair is not implemented as an array.`);
                }
            }
        }
        return this;
    }

    union(...maps) {
        let newMap = new this.constructor(this);
        for (let map of maps) {
            for (let entry of map.entries()) {
                newMap.set(entry[0], entry[1]);
            }
        }
        return newMap;
    }

    intersect(target) {
        let newMap = new this.constructor();
        for (let entry of this.entries()) {
            if (target.has(entry[0])) {
                newMap.set(entry[0], entry[1]);
            }
        }
        return newMap;
    }

    diff(target) {
        let newMap = new this.constructor();
        for (let entry of this.entries()) {
            if (!target.has(entry[0])) {
                newMap.set(entry[0], entry[1]);
            }
        }
        return newMap;
    }

    same(target) {
        let tsize;
        if ("size" in target) {
            tsize = target.size;
        } else if ("length" in target) {
            tsize = target.length;
        } else {
            throw new TypeError("target must be an iterable like a Map with .size or .length");
        }
        if (tsize !== this.size) {
            return false;
        }
        let entries = target instanceof Map ? target.entries() : target
        for (let entry of entries) {
            if (!this.has(entry[0])) {
                return false;
            }
        }
        return true;
    }

}

class AVLNode {

    constructor(tree, data) {
        this._tree = tree;
        this._data = data;
        this._left = null;
        this._right = null;
        this._parent = null;
        this._height = 0;
    }

    duplicate(tree, parent) {
        let node = new AVLNode(tree, this._data);
        node._parent = parent;
        node._left = this._left ? this._left.duplicate(tree, node) : null;
        node._right = this._right ? this._right.duplicate(tree, node) : null;
        node._height = this._height;
        return node;
    }

    print(stringifier, parent) {
        if (this._parent !== parent) {
            console.assert(false);
        }
        if (this._left) {
            this._left.print(stringifier, this);
        }
        console.log(stringifier(this));
        if (this._right) {
            this._right.print(stringifier, this);
        }
    }


    get height() {
        return this._height;
    }

    get left() {
        return this._left;
    }

    set left(node) {
        node && (node._parent = this);
        this._left = node;
    }

    get right() {
        return this._right;
    }

    set right(node) {
        node && (node._parent = this);
        this._right = node;
    }

    _computeHeight() {
        let left = this.left ? this.left._height : -1;
        let right = this.right ? this.right._height : -1;
        this._height = left>right ? left+1 : right+1;
    }

    get balanceFactor() {
        let left = this.left ? this.left._height : -1;
        let right = this.right ? this.right._height : -1;
        return left - right;
    }

    rightRotate() {
        let tmp = this.left;
        this.left = tmp.right;
        tmp.right = this;
        this._computeHeight();
        tmp._computeHeight();
        return tmp;
    }

    leftRotate() {
        let tmp = this.right;
        this.right = tmp.left;
        tmp.left = this;
        this._computeHeight();
        tmp._computeHeight();
        return tmp;
    }

    insert(node) {
        let comparator = this._tree._comparator;
        let comp = comparator(node._data, this._data);
        if (comp<0) {
            // Go left!
            this.left = this.left ? this.left.insert(node) : node;
            this._computeHeight();
            if (this.balanceFactor > 1) {
                if (comparator(node._data, this.left._data)<0) {
                    return this.rightRotate();
                } else {
                    this.left = this.left.leftRotate();
                    return this.rightRotate();
                }
            }
        } else if (comp>0) {
            this.right = this.right ? this.right.insert(node) : node;
            this._computeHeight();
            if (this.balanceFactor < -1) {
                if (comparator(node._data, this.right._data)>0) {
                    return this.leftRotate();
                } else {
                    this.right = this.right.rightRotate();
                    return this.leftRotate();
                }
            }
        }
        else {
            this._data = node._data;
        }
        return this;
    }

    _adjustForDeletion() {
        this._computeHeight();
        let balanceFactor = this.balanceFactor;
        if (balanceFactor > 1 && this.left.balanceFactor >= 0) {
            return this.rightRotate();
        }
        if (balanceFactor > 1 && this.left.balanceFactor < 0) {
            this.left = this.left.leftRotate();
            return this.rightRotate();
        }
        if (balanceFactor < -1 && this.right.balanceFactor <= 0) {
            return this.leftRotate();
        }
        if (balanceFactor < -1 && this.right.balanceFactor > 0) {
            this.right = this.right.rightRotate();
            return this.leftRotate();
        }
        return this;
    }

    _minValueNode() {
        let current = this;
        while (current.left != null) {
            current = current.left;
        }
        return current;
    }

    _maxValueNode() {
        let current = this;
        while (current.right != null) {
            current = current.right;
        }
        return current;
    }

    delete(data) {
        let comparator = this._tree._comparator;
        let comp = comparator(data, this._data);
        if (comp<0) {
            if (this.left) {
                this.left = this.left.delete(data);
                return this._adjustForDeletion();
            }
            else return this;
        }
        else if (comp>0) {
            if (this.right) {
                this.right = this.right.delete(data);
                return this._adjustForDeletion();
            }
            else return this;
        }
        else {
            if (!this.left || !this.right) {
                let tmp = this.left ? this.left : this.right;
                return tmp ? tmp._adjustForDeletion() : null;
            }
            else {
                let tmp = this.right._minValueNode();
                this._data = tmp._data;
                this.right = this.right.delete(this._data);
                return this._adjustForDeletion();
            }
        }
    }

    find(data) {
        let comparator = this._tree._comparator;
        let comp = comparator(data, this._data);
        if (comp<0) {
            if (!this.left) return null;
            return this.left.find(data);
        }
        else if (comp>0) {
            if (!this.right) return null;
            return this.right.find(data);
        }
        else {
            return this;
        }
    }

    findBefore(data) {
        let comparator = this._tree._comparator;
        let comp = comparator(data, this._data);
        if (comp<0) {
            if (!this.left) return null;
            return  this.left.findBefore(data);
        }
        else if (comp>0) {
            if (!this.right) return this;
            let node = this.right.findBefore(data);
            return node!==null ? node : this;
        }
        else {
            return this;
        }
    }

    findAfter(data) {
        let comparator = this._tree._comparator;
        let comp = comparator(data, this._data);
        if (comp<0) {
            if (!this.left) return this;
            let node = this.left.findAfter(data);
            return node!==null ? node : this;
        }
        else if (comp>0) {
            if (!this.right) return null;
            return this.right.findAfter(data);
        }
        else {
            return this;
        }
    }

    inOrder() {
        this.left && this.left.inOrder();
        this.right && this.right.inOrder();
    }

    _next(node) {
        if (node === this.left) {
            return this;
        }
        else {
            return this._parent ? this._parent._next(this) : null;
        }
    }

    next() {
        if (this.right) {
            return this.right._minValueNode();
        }
        else {
            return this._parent ? this._parent._next(this) : null;
        }
    }
}

class AVLIterator {

    constructor(start, end) {
        this._node = start;
        this._end = end ? end : null;
        this[Symbol.iterator] = ()=>this;
    }

    next() {
        if (!this._node) {
            return {
                value: null,
                done: true
            }
        }
        let value = {
            value: this._node._data,
            done: false
        };
        this._node = this._node!==this._end ? this._node.next() : null;
        return value;
    }

}

export class AVLTree {

    constructor(comparatorOrTree, iterable) {
        this._root = null;
        if (comparatorOrTree instanceof AVLTree) {
            this._comparator = comparatorOrTree._comparator;
            this._root = comparatorOrTree._root ? comparatorOrTree._root.duplicate(this, null) : null;
        }
        else {
            this._comparator = comparatorOrTree;
            if (iterable) {
                for (let data of iterable) {
                    this.insert(data);
                }
            }
        }
    }

    insert(data) {
        let node = new AVLNode(this, data);
        if (this._root === null) {
            this._root = node;
        } else {
            this._root = this._root.insert(node);
        }
        this._root._parent = null;
    }

    inOrder() {
        this._root && this._root.inOrder();
    }

    delete(data) {
        if (this._root) {
            this._root = this._root.delete(data);
            this._root && (this._root._parent = null);
        }
    }

    find(data) {
        let node = this._root ? this._root.find(data) : null;
        return node ? node._data : null;
    }

    inside(startData = null, endData = null) {
        if (startData && endData && this._comparator(startData, endData)>0) {
            return new AVLIterator();
        }
        else if (this._root) {
            let startNode = startData ? this._root.findAfter(startData) : null;
            if (!startNode) {
                if (startData !== null) {
                    return new AVLIterator();
                }
                else {
                    startNode = this._root._minValueNode();
                }
            }
            let endNode = endData ? this._root.findBefore(endData) : null;
            return new AVLIterator(startNode, endNode);
        }
        else {
            return new AVLIterator();
        }
    }

    including(startData = null, endData = null) {
        if (startData && endData && this._comparator(startData, endData)>0) {
            return new AVLIterator();
        }
        else if (this._root) {
            let startNode = startData ? this._root.findBefore(startData) : null;
            if (!startNode) startNode = this._root._minValueNode();
            let endNode = endData ? this._root.findAfter(endData) : null;
            return new AVLIterator(startNode, endNode);
        }
        else {
            return new AVLIterator();
        }
    }

    print(stringifier) {
        if (this._root) {
            this._root.print(stringifier, null);
        }
    }

    [Symbol.iterator]() {
        if (this._root) {
            return new AVLIterator(this._root._minValueNode(), null);
        }
        else {
            return new AVLIterator();
        }
    }

}

class SpacialSector {

    constructor(locator, parent, x, y, width, height, threshold, minSize) {
        this._locator = locator;
        this._parent = parent;
        this._x = x;
        this._y = y;
        this._width = width;
        this._height = height;
        this._threshold = threshold;
        this._minSize = minSize;
    }

    _addInSectors(element) {
        let {x, y} = this._locator._coordFinder(element);
        if (x<this._x) {
            if (y<this._y) {
                if (!this._sectors[0]) this._sectors[0] = new SpacialSector(
                    this._locator, this,
                    this._x-this._width/4, this._y-this._height/4, this._width/2, this._height/2,
                    this._threshold, this._minSize);
                this._sectors[0].add(element);
            }
            else {
                if (!this._sectors[1]) this._sectors[1] = new SpacialSector(
                    this._locator, this,
                    this._x-this._width/4, this._y+this._height/4, this._width/2, this._height/2,
                    this._threshold, this._minSize);
                this._sectors[1].add(element);
            }
        }
        else {
            if (y<this._y) {
                if (!this._sectors[2]) this._sectors[2] = new SpacialSector(
                    this._locator, this,
                    this._x+this._width/4, this._y-this._height/4, this._width/2, this._height/2,
                    this._threshold, this._minSize);
                this._sectors[2].add(element);
            }
            else {
                if (!this._sectors[3]) this._sectors[3] = new SpacialSector(
                    this._locator, this,
                    this._x+this._width/4, this._y+this._height/4, this._width/2, this._height/2,
                    this._threshold, this._minSize);
                this._sectors[3].add(element);
            }
        }
    }

    _split() {
        this._sectors = new List();
        for (let element of this._elements) {
            this.add(element);
        }
        delete this._elements;
    }

    add(element) {
        if (this._sectors) {
            this._addInSectors(element);
        }
        else {
            this._locator._elements.set(element, this);
            if (this._elements) {
                this._elements.add(element);
                if (this._elements.length===this._threshold &&
                    (this._width>this._minSize || this._height>this._minSize)) {
                    this._split();
                }
            }
            else {
                this._elements = new List(element);
            }
        }
    }

    _reunite() {
        if (this._sectors) {
            let length = 0;
            for (let index in this._sectors) {
                let sector = this._sectors[index];
                let sectorLength = sector ? sector.length : -1;
                if (!sectorLength) delete this._sectors[index];
                if (sectorLength>0) length += sectorLength;
            }
            if (length<this._threshold) {
                this._elements = new List();
                for (let sector of this._sectors) {
                    if (sector) this._elements.push(...sector.elements);
                }
                delete this._sectors;
                for (let element of this._elements) {
                    this._locator._elements.set(element, this);
                }
            }
        }
    }

    remove(element) {
        this._elements.remove(element);
        if (!this._elements.length) {
            delete this._elements;
        }
        this._locator._elements.delete(element);
        this._parent && this._parent._reunite();
    }

    get elements() {
        if (this._sectors) {
            let elements = new List();
            for (let sector of this._sectors) {
                if (sector) elements.push(...sector.elements);
            }
            return elements;
        }
        else {
            return this._elements ? this._elements : new List();
        }
    }

    get length() {
        if (this._sectors) {
            let length = 0;
            for (let sector of this._sectors) {
                if (sector) length+=sector.length;
            }
            return length;
        }
        else {
            return this._elements ? this._elements.length : 0;
        }
    }

    gather(x, y, range, elements) {
        let dx = x-this._x, dy = y-this._y;
        let mx = range+this._width/2, my = range+this._height/2;
        if (dx*dx+dy*dy<mx*mx+my*my) {
            if (this._sectors) {
                for (let sector of this._sectors) {
                    if (sector) sector.gather(x, y, range, elements);
                }
            }
            else if (this._elements) {
                let range2 = range*range;
                for (let element of this._elements) {
                    let coords = this._locator._coordFinder(element);
                    let dx = x-coords.x, dy = y-coords.y;
                    if (dx*dx+dy*dy<=range2) {
                        elements.add(element);
                    }
                }
            }
        }
    }

}

export class SpatialLocator {

    constructor(width, height, threshold, minSize, coordFinder) {
        this._root = new SpacialSector(this, null, 0, 0, width, height, threshold, minSize);
        this._elements = new Map();
        this._coordFinder = coordFinder;
    }

    add(element) {
        if (!this._elements.has(element)) {
            this._root.add(element);
        }
        return this;
    }

    remove(element) {
        let sector = this._elements.get(element);
        if (sector) {
            sector.remove(element);
        }
        return this;
    }

    find(x, y, range) {
        let elements = new List();
        this._root.gather(x, y, range, elements);
        return elements;
    }

    get length() {
        return this._root.length;
    }

    get elements() {
        return this._root.elements;
    }
}
