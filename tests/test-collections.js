
import {
    describe, it, before, assert
} from "./test-toolkit.js";
import {
    AVLTree, List
} from "../js/collections.js";

describe("AVL Tree implementation", ()=> {

    it("Manipulates a list", ()=> {
        // Check add
        let list = new List(0, 1, 2, 3, 4);
        let idx = list.add(5);
        assert(list).arrayEqualsTo([0, 1, 2, 3, 4, 5]);
        assert(idx).equalsTo(5);
        // Check remove
        idx = list.remove(4);
        assert(list).arrayEqualsTo([0, 1, 2, 3, 5]);
        assert(idx).equalsTo(4);
        // Check insert
        idx = list.insert(5, 4);
        assert(list).arrayEqualsTo([0, 1, 2, 3, 4, 5]);
        assert(idx).equalsTo(4);
        // Check replace
        idx = list.replace(3, "trois");
        assert(idx).equalsTo(3);
        assert(list).arrayEqualsTo([0, 1, 2, "trois", 4, 5]);
        // Check equals
        assert(list.equals([0, 1, 2, "trois", 4, 5])).isTrue();
        assert(list.equals([0, 1, "deux", 3, 4, 5])).isFalse();
        // Check size and length
        assert(list.length).equalsTo(6);
        assert(list.size).equalsTo(6);
        // Check contains
        assert(list.contains(2)).isTrue();
        assert(list.contains("deux")).isFalse();
        // Check duplicate
        let copy = list.duplicate();
        assert(copy).arrayEqualsTo(list);
        // Check empty and clear
        assert(list.empty).isFalse();
        list.clear();
        assert(list.size).equalsTo(0);
        assert(list.empty).isTrue();
    });

    it("Creates and fill an AVL in the ascending direction", () => {
        let tree = new AVLTree((a, b) => a - b);
        for (let i = 0; i < 10; i++) {
            tree.insert(i);
        }
        let it = tree.inside();
        for (let i = 0; i < 10; i++) {
            assert(it._node._height <= 3).equalsTo(true);
            assert(it.next().value).equalsTo(i);
        }
        assert(it.next().done).equalsTo(true);
    });

    it("Creates and fill an AVL in the descending direction", () => {
        let tree = new AVLTree((a, b) => a - b);
        for (let i = 9; i >= 0; i--) {
            tree.insert(i);
        }
        let it = tree.inside();
        for (let i = 0; i < 10; i++) {
            assert(it._node._height <= 3).equalsTo(true);
            assert(it.next().value).equalsTo(i);
        }
        assert(it.next().done).equalsTo(true);
    });

    it("Creates and fill an AVL randomly", () => {
        let tree = new AVLTree((a, b) => a - b);
        tree.insert(5);
        tree.insert(8);
        tree.insert(2);
        tree.insert(3);
        tree.insert(0);
        tree.insert(7);
        tree.insert(6);
        tree.insert(9);
        tree.insert(1);
        tree.insert(4);
        let it = tree.inside();
        for (let i = 0; i < 10; i++) {
            assert(it._node._height <= 3).equalsTo(true);
            assert(it.next().value).equalsTo(i);
        }
        assert(it.next().done).equalsTo(true);
    });

    it("Finds a value in AVL", () => {
        let tree = new AVLTree((a, b) => a - b);
        for (let i = 0; i < 10; i++) {
            tree.insert(i);
        }
        for (let i = 0; i < 10; i++) {
            assert(tree.find(i)).equalsTo(i);
        }
    });

    it("Deletes values from an AVL", () => {
        let tree = new AVLTree((a, b) => a - b);
        for (let i = 0; i < 10; i++) {
            tree.insert(i);
        }
        tree.delete(5);
        assert(tree.find(5)).equalsTo(null);
        assert(tree.find(8)).equalsTo(8);
        tree.delete(8);
        assert(tree.find(8)).equalsTo(null);
        assert(tree.find(2)).equalsTo(2);
        tree.delete(2);
        tree.delete(3);
        tree.delete(0);
        tree.delete(7);
        tree.delete(6);
        tree.delete(9);
        tree.delete(1);
        tree.delete(4);
        assert(tree.inside().next().done).equalsTo(true);
    });

    it("Iterator over a portion of an ALV", () => {
        let tree = new AVLTree((a, b) => a - b);
        for (let i = 0; i < 10; i++) {
            tree.insert(i);
        }
        let it = tree.inside(null, 4);
        for (let i of [0, 1, 2, 3, 4]) {
            assert(it.next().value).equalsTo(i);
        }
        assert(it.next().done).equalsTo(true);
        it = tree.inside(4, null);
        for (let i of [4, 5, 6, 7, 8, 9]) {
            assert(it.next().value).equalsTo(i);
        }
        assert(it.next().done).equalsTo(true);
        it = tree.inside(3, 6);
        for (let i of [3, 4, 5, 6]) {
            assert(it.next().value).equalsTo(i);
        }
        assert(it.next().done).equalsTo(true);
    });

    it("Iterator over a portion of an ALV when search values are not included in the ALV", () => {
        let tree = new AVLTree((a, b) => a - b);
        for (let i = 0; i < 10; i+=2) {
            tree.insert(i);
        }
        let it = tree.inside(null, 5);
        for (let i of [0, 2, 4]) {
            assert(it.next().value).equalsTo(i);
        }
        assert(it.next().done).equalsTo(true);
        it = tree.including(null, 5);
        for (let i of [0, 2, 4, 6]) {
            assert(it.next().value).equalsTo(i);
        }
        assert(it.next().done).equalsTo(true);
        it = tree.inside(3, null);
        for (let i of [4, 6, 8]) {
            assert(it.next().value).equalsTo(i);
        }
        assert(it.next().done).equalsTo(true);
        it = tree.including(3, null);
        for (let i of [2, 4, 6, 8]) {
            assert(it.next().value).equalsTo(i);
        }
        assert(it.next().done).equalsTo(true);
        it = tree.inside(3, 7);
        for (let i of [4, 6]) {
            assert(it.next().value).equalsTo(i);
        }
        assert(it.next().done).equalsTo(true);
        it = tree.including(3, 7);
        for (let i of [2, 4, 6, 8]) {
            assert(it.next().value).equalsTo(i);
        }
        assert(it.next().done).equalsTo(true);
    });

    it("Checks insertion of an already existing value", () => {
        let tree = new AVLTree((a, b) => a.value - b.value);
        for (let i = 0; i < 10; i++) {
            tree.insert({value:i});
        }
        tree.insert({value:6, new:true});
        assert(tree.find({value:6}).new).equalsTo(true);
    });

    it("Checks uncommon (or false) usages of an ALV", () => {
        let tree = new AVLTree((a, b) => a - b);
        for (let i = 0; i < 10; i++) {
            tree.insert(i);
        }
        let it = tree.inside(6, 6);
        assert(it.next().value).equalsTo(6);
        assert(it.next().done).equalsTo(true);
        it = tree.inside(6, 3);
        assert(it.next().done).equalsTo(true);
    });

    it("Creates an AVL from an iterable (an array) and check tree as an iterator", () => {
        let tree = new AVLTree((a, b) => a - b, [0, 8, 1, 9, 6, 4, 2, 5, 3, 7]);
        let values = [...tree];
        assert(values).arrayEqualsTo([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it("Copies an AVL", () => {
        let tree = new AVLTree((a, b) => a - b, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        let values = [...new AVLTree(tree)];
        assert(values).arrayEqualsTo([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

});