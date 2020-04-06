'use strict';
import {
    assert
} from "./misc.js";

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

/**
 * Arrays with standardized API (add, insert, size, delete...)
 */
export class List extends Array {

    constructor(...args) {
        super(...args);
    }

    /**
     * Add values at the end of the list.
     * @param vals values to add
     * @returns index of added values (= last record of the list).
     */
    add(...vals) {
        this.push(...vals);
        return this.length-vals.length;
    }

    addFirst(...vals) {
        this.unshift(...vals);
        return 0;
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

    /**
     * Removes first occurrence of parameter.
     * @param val value to remove
     * @returns former index of removed value
     */
    remove(val) {
        let i = this.indexOf(val);
        if (i===-1) return undefined;
        this.splice(i, 1);
        return i;
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

    indexes() {
        let result = [];
        for (let index in this) {
            result.push(parseInt(index));
        }
        return result.sort((i1, i2)=>i1-i2);
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

    remove(element) {
        return this.delete(element);
    }

    pick() {
        return this.values().next().value;
    }

    take() {
        let element = this.values().next().value;
        this.delete(element);
        return element;
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
        let entries = target instanceof Map ? target.entries() : target;
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
        assert(this._parent===parent);
        if (this._left) {
            this._left.print(stringifier, this);
        }
        console.log(stringifier(this));
        if (this._right) {
            this._right.print(stringifier, this);
        }
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

    constructor(locator, x, y, width, height, threshold, minSize) {
        this._locator = locator;
        this._x = x;
        this._y = y;
        this._width = width;
        this._height = height;
        this._threshold = threshold;
        this._minSize = minSize;
        this._size = 0;
    }

    _addInSectors(element) {
        let {x, y} = element._coords;
        if (x<this._x) {
            if (y<this._y) {
                if (!this._leftTopSector) this._leftTopSector = new SpacialSector(
                    this._locator,
                    this._x-this._width/4, this._y-this._height/4, this._width/2, this._height/2,
                    this._threshold, this._minSize);
                this._leftTopSector.add(element);
            }
            else {
                if (!this._leftBottomSector) this._leftBottomSector = new SpacialSector(
                    this._locator,
                    this._x-this._width/4, this._y+this._height/4, this._width/2, this._height/2,
                    this._threshold, this._minSize);
                this._leftBottomSector.add(element);
            }
        }
        else {
            if (y<this._y) {
                if (!this._rightTopSector) this._rightTopSector = new SpacialSector(
                    this._locator,
                    this._x+this._width/4, this._y-this._height/4, this._width/2, this._height/2,
                    this._threshold, this._minSize);
                this._rightTopSector.add(element);
            }
            else {
                if (!this._rightBottomSector) this._rightBottomSector = new SpacialSector(
                    this._locator,
                    this._x+this._width/4, this._y+this._height/4, this._width/2, this._height/2,
                    this._threshold, this._minSize);
                this._rightBottomSector.add(element);
            }
        }
    }

    _split() {
        let elements = this._elements;
        delete this._elements;
        for (let element of elements) {
            this._addInSectors(element);
        }
    }

    add(element) {
        this._size++;
        if (this._size === this._locator._threshold) {
            this._elements.add(element);
            if (this._width>this._minSize || this._height>this._minSize) {
                this._split();
            }
        }
        else if (this._size < this._locator._threshold) {
            if (!this._elements) this._elements = new List();
            this._elements.add(element);
        }
        else {
            this._addInSectors(element);
        }
    }

    _removeFromSectors(element) {
        let {x, y} = element._coords;
        if (x<this._x) {
            if (y<this._y) {
                if (this._leftTopSector) {
                    this._leftTopSector.remove(element);
                    if (this._leftTopSector.empty) {
                        delete this._leftTopSector;
                    }
                    return true;
                }
            }
            else {
                if (this._leftBottomSector) {
                    this._leftBottomSector.remove(element);
                    if (this._leftBottomSector.empty) {
                        delete this._leftBottomSector;
                    }
                    return true;
                }
            }
        }
        else {
            if (y<this._y) {
                if (this._rightTopSector) {
                    this._rightTopSector.remove(element);
                    if (this._rightTopSector.empty) {
                        delete this._rightTopSector;
                    }
                    return true;
                }
            }
            else {
                if (this._rightBottomSector) {
                    this._rightBottomSector.remove(element);
                    if (this._rightBottomSector.empty) {
                        delete this._rightBottomSector;
                    }
                    return true;
                }
            }
        }
        return false;
    }

    _shrink() {
        this._elements = new List();
        if (this._leftTopSector) {
            this._elements.add(...this._leftTopSector.elements);
            delete this._leftTopSector;
        }
        if (this._leftBottomSector) {
            this._elements.add(...this._leftBottomSector.elements);
            delete this._leftBottomSector;
        }
        if (this._rightTopSector) {
            this._elements.add(...this._rightTopSector.elements);
            delete this._rightTopSector;
        }
        if (this._rightBottomSector) {
            this._elements.add(...this._rightBottomSector.elements);
            delete this._rightBottomSector;
        }
    }

    remove(element) {
        if (!this._removeFromSectors(element)) {
            this._elements.delete(element);
            if (!this._elements.length) {
                delete this._elements;
            }
        }
        if (this._size === this._locator._threshold) {
            this._shrink();
        }
        this._size--;
    }

    get elements() {
        let elements = new List();
        if (this._leftTopSector || this._rightTopSector || this._leftBottomSector || this._rightBottomSector) {
            this._leftTopSector &&  elements.add(...this._leftTopSector.elements);
            this._rightTopSector &&  elements.add(...this._rightTopSector.elements);
            this._leftBottomSector &&  elements.add(...this._leftBottomSector.elements);
            this._rightBottomSector &&  elements.add(...this._rightBottomSector.elements);
        }
        else {
            this._elements && elements.add(...this._elements);
        }
        return elements;
    }

    get empty() {
        return !this._leftTopSector && !this._rightTopSector &&
            !this._leftBottomSector && !this._rightBottomSector && !this._elements;
    }

    gather(x, y, range, elements) {
        let dx = x-this._x, dy = y-this._y;
        let mx = range+this._width/2, my = range+this._height/2;
        if (dx*dx+dy*dy<mx*mx+my*my) {
            this._leftTopSector && this._leftTopSector.gather(x, y, range, elements);
            this._leftBottomSector && this._leftBottomSector.gather(x, y, range, elements);
            this._rightTopSector && this._rightTopSector.gather(x, y, range, elements);
            this._rightBottomSector && this._rightBottomSector.gather(x, y, range, elements);
            if (this._elements) {
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

    constructor(left, top, right, bottom, threshold, minSize, coordFinder) {
        this.resize(left, top, right, bottom);
        this._threshold = threshold;
        this._minSize = minSize;
        this._elements = new Set();
        this._coordFinder = coordFinder;
    }

    resize(left, top, right, bottom) {
        delete this._sector;
        this._x = left;
        this._y = top;
        this._width = right-left;
        this._height = bottom-top;
    }

    _update() {
        if (!this._sector) {
            this._sector = new SpacialSector(this,
                this._x+this._width/2,
                this._y+this._height/2,
                this._width, this._height,
                this._threshold, this._minSize);
        }
    }

    add(element) {
        this._update();
        if (!this._elements.has(element)) {
            let coords = this._coordFinder(element);
            assert(
                coords.x>=this._x && coords.x<=this._x+this._width &&
                coords.y>=this._y && coords.y<=this._y+this._height);
            element._coords = coords;
            this._elements.add(element);
            this._sector.add(element);
        }
        return this;
    }

    remove(element) {
        this._update();
        if (this._elements.has(element)) {
            this._elements.delete(element);
            this._sector.remove(element);
            delete element._coords;
        }
        return this;
    }

    find(x, y, range) {
        this._update();
        let elements = new List();
        this._sector.gather(x, y, range, elements);
        return elements;
    }

    get size() {
        return this._elements.size;
    }

    get elements() {
        return this._elements;
    }
}

class BoxSector {

    constructor(locator, left, top, right, bottom) {
        assert(!isNaN(left+top+right+bottom));
        this._locator = locator;
        this._left = left;
        this._top = top;
        this._right = right;
        this._bottom = bottom;
        this._x = (this._left+this._right)/2;
        this._y = (this._top+this._bottom)/2;
        this._size = 0;
    }

    _add(element) {
        if (!this._elements) this._elements = new List();
        this._elements.add(element);
    }

    _split() {
        let elements = this._elements;
        delete this._elements;
        for (let element of elements) {
            if (!this._addInSector(element, element._bbox)) {
                this._add(element, element._bbox);
            }
        }
    }

    _addInSector(element) {
        if (element._bbox.left >= this._x) {
            if (!this._rightSector) {
                this._rightSector = new BoxSector(this._locator, this._x, this._top, this._right, this._bottom);
            }
            this._rightSector.add(element);
            return true;
        }
        if (element._bbox.right <= this._x) {
            if (!this._leftSector) {
                this._leftSector = new BoxSector(this._locator, this._left, this._top, this._x, this._bottom);
            }
            this._leftSector.add(element);
            return true;
        }
        if (element._bbox.top >= this._y) {
            if (!this._bottomSector) {
                this._bottomSector = new BoxSector(this._locator, this._left, this._y, this._right, this._bottom);
            }
            this._bottomSector.add(element);
            return true;
        }
        if (element._bbox.bottom <= this._y) {
            if (!this._topSector) {
                this._topSector = new BoxSector(this._locator, this._left, this._top, this._right, this._y);
            }
            this._topSector.add(element);
            return true;
        }
        return false;
    }

    add(element) {
        this._size++;
        if (this._size<=this._locator._threshold) {
            this._add(element);
            if (this._size === this._locator._threshold) {
                this._split();
            }
        }
        else if (!this._addInSector(element)) {
            this._add(element);
        }
    }

    _shrink() {
        if (!this._elements) this._elements = new List();
        if (this._leftSector) {
            this._elements.add(...this._leftSector.elements);
            delete this._leftSector;
        }
        if (this._rightSector) {
            this._elements.add(...this._rightSector.elements);
            delete this._rightSector;
        }
        if (this._topSector) {
            this._elements.add(...this._topSector.elements);
            delete this._topSector;
        }
        if (this._bottomSector) {
            this._elements.add(...this._bottomSector.elements);
            delete this._bottomSector;
        }
    }

    _remove(element) {
        this._elements.delete(element);
        if (!this._elements.length) delete this._elements;
    }

    _removeFromSector(element) {
        if (element._bbox.left >= this._x) {
            if (!this._rightSector.remove(element)) {
                delete this._rightSector;
            }
            return true;
        }
        if (element._bbox.right <= this._x) {
            if (!this._leftSector.remove(element)) {
                delete this._leftSector;
            }
            return true;
        }
        if (element._bbox.top >= this._y) {
            if (!this._bottomSector.remove(element)) {
                delete this._bottomSector;
            }
            return true;
        }
        if (element._bbox.bottom <= this._y) {
            if (!this._topSector.remove(element)) {
                delete this._topSector;
            }
            return true;
        }
        return false;
    }

    remove(element) {
        if (this._size>=this._locator._threshold) {
            if (!this._removeFromSector(element)) {
                this._remove(element);
            }
            if (this._size === this._locator._threshold) {
                this._shrink();
            }
        }
        else {
            this._remove(element);
        }
        this._size--;
        return this._elements || this._leftSector || this._rightSector || this._topSector || this._bottomSector;
    }

    get elements() {
        let elements = new List();
        if (this._elements) elements.add(...this._elements);
        if (this._leftSector) elements.add(...this._leftSector.elements);
        if (this._topSector) elements.add(...this._topSector.elements);
        if (this._rightSector) elements.add(...this._rightSector.elements);
        if (this._bottomSector) elements.add(...this._bottomSector.elements);
        return elements;
    }

    collect(elements, x, y) {
        if (this._elements) {
            for (let element of this._elements) {
                let bbox = element._bbox;
                if (bbox.left<=x && bbox.right>=x && bbox.top<=y && bbox.bottom>=y) {
                    elements.add(element);
                }
            }
        }
        if (this._leftSector && x<=this._x) this._leftSector.collect(elements, x, y);
        if (this._rightSector && x>=this._x) this._rightSector.collect(elements, x, y);
        if (this._topSector && y<=this._y) this._topSector.collect(elements, x, y);
        if (this._bottomSector && y>=this._y) this._bottomSector.collect(elements, x, y);
    }

}

export class BoxLocator {

    constructor(threshold, minSize, geometryGetter) {
        this._threshold = threshold;
        this._minSize = minSize;
        this._geometryGetter = geometryGetter;
    }

    add(element) {
        if (this._removedElements && this._removedElements.has(element)) {
            this._removedElements.delete(element);
        }
        else {
            if (!this._elements || !this._elements.has(element)) {
                if (!this._addedElements) this._addedElements = new ESet();
                this._addedElements.add(element);
            }
        }
        return this;
    }

    remove(element) {
        if (this._addedElements && this._addedElements.has(element)) {
            this._addedElements.delete(element);
        }
        else {
            if (this._elements && this._elements.has(element)) {
                if (!this._removedElements) this._removedElements = new ESet();
                this._removedElements.add(element);
            }
        }
        return this;
    }

    _extendSize(box) {
        let renew = false;
        if (this._left===undefined || this._left>box.left) {
            this._left = box.left;
            renew = true;
        }
        if (this._right===undefined || this._right<box.right) {
            this._right = box.right;
            renew = true;
        }
        if (this._top===undefined || this._top>box.top) {
            this._top = box.top;
            renew = true;
        }
        if (this._bottom===undefined || this._bottom<box.bottom) {
            this._bottom = box.bottom;
            renew = true;
        }
        return renew;
    }

    _reduceSize(box) {
        let renew = false;
        if (this._left!==undefined && this._left===box.left) {
            delete this._left;
            renew = true;
        }
        if (this._right!==undefined && this._right===box.right) {
            delete this._right;
            renew = true;
        }
        if (this._top!==undefined && this._top===box.top) {
            delete this._top;
            renew = true;
        }
        if (this._bottom!==undefined && this._bottom===box.bottom) {
            delete this._bottom;
            renew = true;
        }
        return renew;
    }

    _update() {
        if (this._addedElements || this._removedElements) {
            let refresh = false;
            if (this._removedElements) {
                for (let element of this._removedElements) {
                    if (this._reduceSize(element._bbox)) delete this._sector;
                    this._elements.delete(element);
                }
            }
            if (this._addedElements) {
                for (let element of this._addedElements) {
                    element._bbox = {locator: this, ...this._geometryGetter(element)};
                    if (this._extendSize(element._bbox)) delete this._sector;
                    if (!this._elements) this._elements = new ESet();
                    this._elements.add(element);
                }
            }
            if (this._sector) {
                if (this._removedElements) {
                    for (let element of this._removedElements) {
                        this._sector.remove(element);
                    }
                }
                if (this._addedElements) {
                    for (let element of this._addedElements) {
                        this._sector.add(element);
                    }
                }
            }
            else {
                delete this._left;
                delete this._top;
                delete this._right;
                delete this._bottom;
                if (this._elements) {
                    for (let element of this._elements) {
                        this._extendSize(element._bbox);
                    }
                    this._sector = new BoxSector(this, this._left, this._top, this._right, this._bottom);
                    for (let element of this._elements) {
                        let bbox = element._bbox;
                        this._sector.add(element, bbox.left, bbox.top, bbox.right, bbox.bottom);
                    }
                }
            }
            if (this._removedElements) {
                for (let element of this._removedElements) {
                    delete element._bbox;
                }
                delete this._removedElements;
            }
            delete this._addedElements;
            if (!this._elements.size) delete this._elements;
        }
    }

    find(x, y) {
        this._update();
        let elements = new List();
        this._sector && this._sector.collect(elements, x, y);
        return elements;
    }

    get size() {
        this._update();
        return this._elements ? this._elements.size : 0;
    }

    getBBox(element) {
        return element._bbox;
    }

}
