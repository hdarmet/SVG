
const nodeColor = {
    RED : 0,
    BLACK : 1
};

function toNumber(key) {

    const offset = 96;
    //if key is not a number
    if (isNaN(key) && typeof key === "string") {
        const keyToLower = key.toLowerCase();
        if (keyToLower.length > 1) {
            let number = '';
            //converting each letter to a number
            for (let ch of keyToLower) {
                number += ch.charCodeAt(0) - offset + '';
            }
            return parseInt(number);
        }
        return keyToLower.charCodeAt(0) - offset;
    }
    return key;
}

function isNilNode(node) {
    return node == null || (node.key == null && node.value == null
        && node.color === nodeColor.BLACK
        && node.left == null && node.right == null);
}

/**
 * Node of the red black tree
 * constructor
 * param key : Number
 * param value : Object
 * param left : Node
 * param right : Node
 * param color : Number
 */

class Node {
    constructor(key, value) {
        this.key = toNumber(key);
        this.value = value;
        this.left = null;
        this.right = null;
        this.color = null;
        this.parent = null;
    }

    /**
     * return Boolean
     */
    isRed() {
        return this.color === nodeColor.RED
    }

    getValue() {
        return {
            key: this.key,
            value: this.value,
        }
    }
}

function createLeafNode(parent) {
    let node = new Node(null, null);
    node.color = nodeColor.BLACK;
    node.parent = parent;
    return node;
}

function createNode(key, value) {
    let node = new Node(key, value);

    //left leaf has color black. left, right to be nul
    let leftLeaf = new Node(null, null);
    leftLeaf.color = nodeColor.BLACK;
    leftLeaf.left = null;
    leftLeaf.right = null;
    leftLeaf.parent = node;

    //right leaf has color black. left, right to be nul
    let rightLeaf = new Node(null, null);
    rightLeaf.color = nodeColor.BLACK;
    rightLeaf.left = null;
    rightLeaf.right = null;
    rightLeaf.parent = node;

    //map leaves
    node.left = leftLeaf;
    node.right = rightLeaf;
    return node;
}

class iterator {
    constructor(root) {
        this.stack = [];
        this.curr = root;
    }

    hasNext() {
        return !isNilNode(this.curr) || this.stack.length > 0;
    }

    next() {
        while (!isNilNode(this.curr)) {
            this.stack.push(this.curr);
            this.curr = this.curr.left;
        }
        this.curr = this.stack.pop();
        const node = this.curr;
        this.curr = this.curr.right;
        return node.getValue();
    }
}

/**
 * constructor
 * Node of the red black tree
 * 1.Every node is either red or black
 * 2.Root and leaves are all black
 * 3.Every red node has black parent
 * 4.All simple paths from a node x to a descendant leaves of x has same black nodes
 */
class RbTree {
    constructor() {
        this.root = null;
    }

    /**
     * Complexity: O(1).
     *
     * param Node node Node.
     * return Node a copy of original node
     */
    clone(node) {
        return new Node(node.key, node.value, node.left, node.right, node.color, node.parent);
    }

    /**
     * find value by node key
     */
    find(input) {
        const key = toNumber(input);
        let node = this.root;
        while (node != null) {
            if (key < node.key) {
                node = node.left;
            } else if (key > node.key) {
                node = node.right;
            } else {
                return node.value;
            }
        }
        return null;
    }

    leftMostChild(node) {
        if (isNilNode(node)) {
            return null;
        }
        while (!isNilNode(node.left)) {
            node = node.left;
        }
        return node;
    }

    findNode(key) {
        let node = this.root;
        while (node != null) {
            if (key < node.key) {
                node = node.left;
            } else if (key > node.key) {
                node = node.right;
            } else if (key === node.key) {
                return node;
            } else {
                return null;
            }
        }
        return null;
    }

    update(key, value) {
        const node = this.findNode(key);
        node.value = value;
    }

    /**
     * Complexity: O(1).
     *       y                   x
     *      / \                 / \
     *     x  Gamma   ====>   alpha y
     *   /  \                      / \
     * alpha beta               beta Gamma
     * method
     * param Node node Node.
     * return Node
     */
    rotateRight(node) {
        const y = node.left;

        if (isNilNode(y.right)) {
            node.left = createLeafNode(node);
        } else {
            node.left = y.right;
        }

        if (!isNilNode(y.right)) {
            y.right.parent = node;
        }
        y.parent = node.parent;
        if (isNilNode(node.parent)) {
            this.root = y;
        } else {
            if (node === node.parent.right) {
                node.parent.right = y;
            } else {
                node.parent.left = y;
            }
        }
        y.right = node;
        node.parent = y;
    }

    /**
     * Complexity: O(1).
     *       y                   x
     *      / \                 / \
     *     x  Gamma   <====   alpha y
     *   /  \                      / \
     * alpha beta               beta Gamma
     * method
     * param Node node Node.
     * return Node
     */
    rotateLeft(node) {
        const y = node.right;

        // console.log(y.left)
        if (isNilNode(y.left)) {
            node.right = createLeafNode(node);
        } else {
            node.right = y.left;
        }

        if (!isNilNode(y.left)) {
            y.left.parent = node;
        }
        y.parent = node.parent;
        if (isNilNode(node.parent)) {
            this.root = y;
        } else {
            if (node === node.parent.left) {
                node.parent.left = y;
            } else {
                node.parent.right = y;
            }
        }
        y.left = node;
        node.parent = y;
    }

    /**
     * param Node node Node.
     * Make the color of newly inserted nodes as RED and then perform standard BST insertion
     * If x is root, change color of node as BLACK (Black height +1).
     */
    insert(key, value) {
        let y = null;
        let x = this.root;
        const z = createNode(key, value);
        if (this.root == null) {
            this.root = z;
            z.color = nodeColor.BLACK;
            z.parent = null;
        } else {
            while (!isNilNode(x)) {
                y = x;
                if (z.key < x.key) {
                    x = x.left;
                } else {
                    x = x.right;
                }
            }
            z.parent = y;
            // current node parent is root
            if (z.key < y.key) {
                y.left = z;
            } else {
                y.right = z;
            }
            // y.right is now z
            z.left = createLeafNode(z);
            z.right = createLeafNode(z);
            z.color = nodeColor.RED;
            this.fixTree(z);
        }
    }

    /**
     * A method to fix RB TREE
     * when uncle is RED
     * Change color of parent and uncle as BLACK.
     * Color of grand parent as RED.
     * Change node = node’s grandparent, repeat steps 2 and 3 for new x.
     * ---------------------------------------------------------------
     * when uncle is BLACK
     * left_left_case
     * left_right_case
     * right_right_case
     * right_left_case
     */

    fixTree(node) {
        while (node.parent != null && node.parent.color === nodeColor.RED) {
            let uncle = null;
            if (node.parent === node.parent.parent.left) {
                uncle = node.parent.parent.right;

                if (uncle != null && uncle.color === nodeColor.RED) {
                    node.parent.color = nodeColor.BLACK;
                    uncle.color = nodeColor.BLACK;
                    node.parent.parent.color = nodeColor.RED;
                    node = node.parent.parent;
                    continue;
                }
                if (node === node.parent.right) {
                    // Double rotation needed
                    node = node.parent;
                    this.rotateLeft(node);
                }
                node.parent.color = nodeColor.BLACK;
                node.parent.parent.color = nodeColor.RED;
                // if the "else if" code hasn't executed, this
                // is a case where we only need a single rotation
                this.rotateRight(node.parent.parent);
            } else {
                uncle = node.parent.parent.left;
                if (uncle != null && uncle.color === nodeColor.RED) {
                    node.parent.color = nodeColor.BLACK;
                    uncle.color = nodeColor.BLACK;
                    node.parent.parent.color = nodeColor.RED;
                    node = node.parent.parent;
                    continue;
                }
                if (node === node.parent.left) {
                    // Double rotation needed
                    node = node.parent;
                    this.rotateRight(node);
                }
                node.parent.color = nodeColor.BLACK;
                node.parent.parent.color = nodeColor.RED;
                // if the "else if" code hasn't executed, this
                // is a case where we only need a single rotation
                this.rotateLeft(node.parent.parent);
            }
        }
        this.root.color = nodeColor.BLACK;
    }

    /**
     * return the height of a tree
     */
    findHeight(node) {
        if (node == null) {
            return -1;
        }
        const leftLen = this.findHeight(node.left);
        const rightLen = this.findHeight(node.right);

        if (leftLen > rightLen) {
            return leftLen + 1;
        }
        return rightLen + 1;
    }

    /**
     * print out current tree
     */
    print() {
        const height = this.findHeight(this.root) + 1;
        this.printHelper(this.root, '__', height);
    }

    printHelper(node, indent, height) {
        // tree height
        let treeHeight = height;

        if (node == null) {
            return;
        }
        if (node === this.root) {
            console.log(`${node.key} color: ${node.color}`);
        }
        if (node.left != null) {
            const parentInfo = `( parent node ${node.left.parent.key})`;
            console.log(`${indent}${node.left.key} color: ${node.left.color} ${parentInfo}`);
        }
        if (node.right != null) {
            const parentInfo = `( parent node ${node.right.parent.key})`;
            console.log(`${indent}${node.right.key} color: ${node.right.color} ${parentInfo}`);
        }
        treeHeight -= 1;
        this.printHelper(node.left, indent + indent, treeHeight);
        this.printHelper(node.right, indent + indent, treeHeight);
    }

    /**
     * remove all nodes inside the tree
     */
    emptyTree() {
        this.root = null;
    }

    /**
     * return the min node of a given tree
     */
    min(node) {
        if (node == null || node === undefined) {
            return {};
        }
        while (!isNilNode(node.left)) {
            node = node.left;
        }
        return node;
    }

    minNode() {
        let node = this.root;
        while (!isNilNode(node.left)) {
            node = node.left;
        }
        return node.getValue();
    }

    maxNode() {
        let node = this.root;
        while (!isNilNode(node.right)) {
            node = node.right;
        }
        return node.getValue();
    }

    transplant(u, v) {
        if (u.parent == null) {
            this.root = v;
        } else if (u === u.parent.left) {
            u.parent.left = v;
        } else {
            u.parent.right = v;
        }
        v.parent = u.parent;
    }

    /**
     * method
     * param Node node Node.
     * return Node
     */
    remove(key) {
        const z = this.findNode(key);
        if (z == null) {
            return;
        }
        let x;
        let y = z;
        let y_original_color = y.color;
        if (isNilNode(z.left)) {
            x = z.right;
            this.transplant(z, z.right);
        } else if (isNilNode(z.right)) {
            x = z.left;
            this.transplant(z, z.left);
        } else {
            y = this.min(z.right);
            y_original_color = y.color;
            x = y.right;
            if (y.parent === z) {
                x.parent = y;
            } else {
                this.transplant(y, y.right);
                y.right = z.right;
                y.right.parent = y;
            }
            this.transplant(z, y);
            y.left = z.left;
            y.left.parent = y;
            y.color = z.color;
        }
        if (y_original_color === nodeColor.BLACK) {
            this.removeFix(x);
        }
    }

    /**
     * a method to fix remove key
     */
    removeFix(node) {
        while (node !== this.root && node.color === nodeColor.BLACK) {
            if (node === node.parent.left) {
                let w = node.parent.right;
                if (w.color === nodeColor.RED) {
                    w.color = nodeColor.BLACK;
                    node.parent.color = nodeColor.RED;
                    this.rotateLeft(node.parent);
                    w = node.parent.right;
                }
                if (w.left.color === nodeColor.BLACK && w.right.color === nodeColor.BLACK) {
                    w.color = nodeColor.RED;
                    node = node.parent;
                    continue;
                } else if (w.right.color === nodeColor.BLACK) {
                    w.left.color = nodeColor.BLACK;
                    w.color = nodeColor.RED;
                    w = node.parent.right;
                }
                if (w.right.color === nodeColor.RED) {
                    w.color = node.parent.color;
                    node.parent.color = nodeColor.BLACK;
                    w.right.color = nodeColor.BLACK;
                    this.rotateLeft(node.parent);
                    node = this.root;
                }
            } else {
                let w = node.parent.left;
                if (w.color === nodeColor.RED) {
                    w.color = nodeColor.BLACK;
                    node.parent.color = nodeColor.RED;
                    this.rotateRight(node.parent);
                    w = node.parent.left;
                }
                if (w.right.color === nodeColor.BLACK && w.left.color === nodeColor.BLACK) {
                    w.color = nodeColor.RED;
                    node = node.parent;
                } else if (w.left.color === nodeColor.BLACK) {
                    w.right.color = nodeColor.BLACK;
                    w.color = nodeColor.RED;
                    this.rotateLeft(w);
                    w = node.parent.left;
                }
                if (w.left.color === nodeColor.RED) {
                    w.color = node.parent.color;
                    node.parent.color = nodeColor.BLACK;
                    w.left.color = nodeColor.BLACK;
                    this.rotateRight(node.parent);
                    node = this.root;
                }
            }
        }
        node.color = nodeColor.BLACK;
    }

    inOrderSucc(node) {
        if (isNilNode(node)) {
            return null;
        }
        // when a right child exist
        if (!isNilNode(node.right)) {
            return this.leftMostChild(node.right).getValue();

            // Where no right child exists
        } else { // eslint-disable-line
            let curr = node;
            let p = node.parent;
            // if this node is not its parent's left child
            while (p != null && p.left !== curr) {
                curr = p;
                p = p.parent;
            }
            // when there is no successor
            if (p == null) {
                return null;
            }
            return p.getValue();
        }
    }

    toSortedArray() {
        const sortedArray = [];
        this.inOrder(this.root, sortedArray);
        return sortedArray;
    }

    toArrayPreOrder() {
        const preOrderArray = [];
        this.preOrder(this.root, preOrderArray);
        return preOrderArray;
    }

    toArrayPostOrder() {
        const postOrderArray = [];
        this.postOrder(this.root, postOrderArray);
        return postOrderArray;
    }

    inOrder(node, array) {
        if (isNilNode(node)) {
            return;
        }
        this.inOrder(node.left, array);
        array.push(node.getValue());
        this.inOrder(node.right, array);
    }

    preOrder(node, array) {
        if (isNilNode(node)) {
            return;
        }
        array.push(node.getValue());
        this.preOrder(node.left, array);
        this.preOrder(node.right, array);
    }

    postOrder(node, array) {
        if (isNilNode(node)) {
            return;
        }
        this.postOrder(node.left, array);
        this.postOrder(node.right, array);
        array.push(node.getValue());
    }

    createIterator() {
        return new iterator(this.root);
    }

}
export default RbTree;

