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

    empty() {
        return this.length === 0;
    }

    duplicate() {
        return this.slice(0);
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
        console.log(this._data+" "+this.height);
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

    constructor(comparator) {
        this._root = null;
        this._comparator = comparator;
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

}

