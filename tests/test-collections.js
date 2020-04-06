
import {
    describe, it, assert
} from "./test-toolkit.js";
import {
    dichotomousSearch, insertionSort, AVLTree, List, ESet, EMap, SpatialLocator, BoxLocator
} from "../js/collections.js";

describe("AVL Tree implementation", ()=> {

    it("Executes a dichotomic search", ()=> {
        let values = [1, 3, 4, 7, 9, 10, 12, 13, 15, 17];
        assert(dichotomousSearch(values, 0)).equalsTo(0);
        assert(dichotomousSearch(values, 4)).equalsTo(2);
        assert(dichotomousSearch(values, 19)).equalsTo(10);
    });

    it("Executes an insertion sort", ()=> {
        let values = [4, 3, 9, 12, 15, 7, 17, 13, 1, 10];
        insertionSort(values);
        assert(values).arrayEqualsTo([1, 3, 4, 7, 9, 10, 12, 13, 15, 17]);
    });

    it("Sorts AND remove discarded elements", ()=> {
        let a = {value:4, removed:true}, b = {value:3}, c = {value:9, removed:true}, d = {value:12};
        let values = [a, b, c, d];
        insertionSort(values, (a, b)=>a.value-b.value);
        assert(values).arrayEqualsTo([b, d]);
    });

    it("Manipulates a list", ()=> {
        // Check add
        let list = new List(0, 1, 2, 3, 4);
        let idx = list.add(5, 6);
        assert(list).arrayEqualsTo([0, 1, 2, 3, 4, 5, 6]);
        assert(idx).equalsTo(5);
        // Check addFirst
        idx = list.addFirst(-1, -2);
        assert(list).arrayEqualsTo([-1, -2, 0, 1, 2, 3, 4, 5, 6]);
        assert(idx).equalsTo(0);
        // Check remove
        idx = list.remove(4);
        assert(list).arrayEqualsTo([-1, -2, 0, 1, 2, 3, 5, 6]);
        assert(idx).equalsTo(6);
        // Check insert
        idx = list.insert(5, 4);
        assert(list).arrayEqualsTo([-1, -2, 0, 1, 2, 3, 4, 5, 6]);
        assert(idx).equalsTo(6);
        // Check replace
        idx = list.replace(3, "trois");
        assert(idx).equalsTo(5);
        assert(list).arrayEqualsTo([-1, -2, 0, 1, 2, "trois", 4, 5, 6]);
        // Check equals
        assert(list.equals([-1, -2, 0, 1, 2, "trois", 4, 5, 6])).isTrue();
        assert(list.equals([-1, -2, 0, 1, "deux", 3, 4, 5, 6])).isFalse();
        assert(list.equals([-2, 0, 1, "trois", 3, 4, 5, 6])).isFalse();
        // Check size and length
        assert(list.length).equalsTo(9);
        assert(list.size).equalsTo(9);
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

    it("Returns the indexes of the list", ()=>{
        let list = new List();
        list[4] = 10;
        list[0] = 12;
        list[14] = 20;
        assert(list.indexes()).arrayEqualsTo([0, 4, 14]);
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
        for (let i = 6; i < 10; i++) {
            tree.insert(i);
        }
        for (let i = 0; i < 6; i++) {
            tree.insert(i);
        }
        let it = tree.inside();
        for (let i = 0; i < 10; i++) {
            assert(it._node._height <= 3).equalsTo(true);
            assert(it.next().value).equalsTo(i);
        }
        assert(it.next().done).equalsTo(true);
    });

    it("Creates and fill an AVL so a left/right rotate is done", () => {
        let tree = new AVLTree((a, b) => a - b);
        for (let i = 5; i >= 0; i--) {
            tree.insert(i);
        }
        for (let i = 9; i >= 6; i--) {
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

    it("Deletes values from an AVL so adjustement is necessary", () => {
        let tree = new AVLTree((a, b) => a - b);
        for (let i = 0; i <= 25; i++) {
            tree.insert(i);
        }
        // rightRotate
        for (let i = 25; i >= 21; i--) {
            tree.delete(i);
        }
        assert([...tree]).arrayEqualsTo([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
        // leftRotate
        for (let i = 0; i < 4; i++) {
            tree.delete(i);
        }
        assert([...tree]).arrayEqualsTo([4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
        // rightRightRotate + leftRotate
        for (let i = 9; i >=4; i--) {
            tree.delete(i);
        }
        assert([...tree]).arrayEqualsTo([10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
        // leftLeftRotate + rightRotate
        for (let i = 15; i <=20; i++) {
            tree.delete(i);
        }
        assert([...tree]).arrayEqualsTo([10, 11, 12, 13, 14]);
        // Try to remove elements that are not present in the AVL
        tree.delete(9);
        assert([...tree]).arrayEqualsTo([10, 11, 12, 13, 14]);
        tree.delete(15);
        assert([...tree]).arrayEqualsTo([10, 11, 12, 13, 14]);
    });

    it("Iterates over a portion of an ALV", () => {
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

    it("Iterates over a portion of an ALV when search values are not included in the ALV", () => {
        let tree = new AVLTree((a, b) => a - b);
        for (let i = 0; i < 10; i+=2) {
            tree.insert(i);
        }
        // Looks for elements at AVL start
        let it = tree.inside(null, 5);
        for (let i of [0, 2, 4]) {
            assert(it.next().value).equalsTo(i);
        }
        assert(it.next().done).equalsTo(true);
        it = tree.including(null, 5);
        for (let i of [0, 2, 4, 6]) {
            assert(it.next().value).equalsTo(i);
        }
        // Looks for elements at AVL end
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
        // Looks for elements in the middle of the tree
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

    it("Check inconsistent iteration tries", () => {
        let tree = new AVLTree((a, b) => a - b);
        assert([...tree].length).equalsTo(0);
        // Looks for elements in an empty AVL
        let it = tree.inside(0, 10);
        assert(it.next().done).equalsTo(true);
        it = tree.including(0, 10);
        assert(it.next().done).equalsTo(true);

        for (let i = 0; i < 10; i+=2) {
            tree.insert(i);
        }
        // Start bound after AVL last element
        it = tree.inside(11, null);
        assert(it.next().done).equalsTo(true);
        // Unconsistent bounds
        it = tree.including(7, 3);
        assert(it.next().done).equalsTo(true);
    });

    it("Checks insertion of an already existing value in an AVL", () => {
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

    it("Prints the content of an AVL", () => {
        let tree = new AVLTree((a, b) => a - b, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        let log = console.log;
        let line="";
        try {
            console.log = value=>line+=value+"\n";
            tree.print(elem => "" + elem._data);
            console.log = log;
            assert(line).equalsTo("0\n1\n2\n3\n4\n5\n6\n7\n8\n9\n");
        }
        finally {
            console.log = log;
        }
    });

    it("Manipulates an extended Set (ESet)", () => {
        let set1 = new ESet([1, 2, 3, 4]);
        let set2 = new ESet([3, 4, 5, 6]);
        // Union
        let union = set1.union(set2);
        assert([...union]).unorderedEqualsTo([1, 2, 3, 4, 5, 6]);
        // Intersect
        let intersect = set1.intersect(set2);
        assert([...intersect]).unorderedEqualsTo([3, 4]);
        // Difference
        let diff = set1.diff(set2);
        assert([...diff]).unorderedEqualsTo([1, 2]);
        // Same
        assert(set1.same(set2)).isFalse();
        assert(set1.same(new ESet([1, 2, 3, 4]))).isTrue();
    });

    it("Fails immediately if one compare 2 sets with different length", () => {
        let set1 = new ESet([1, 2, 3]);
        let set2 = new ESet([1, 2, 3, 4]);
        assert(set1.same(set2)).isFalse();
    });

    it("Compares a set and an array", ()=>{
        let set = new ESet([1, 2, 3]);
        let array = [1, 2, 3];
        assert(set.same(array)).isTrue();
    });

    it("Uses the remove method in place of delete", ()=> {
        let set = new ESet([1, 2, 3]);
        set.remove(3);
        assert([...set]).unorderedEqualsTo([1, 2]);
    });

    it ("Fails to compare a set with an object which is not a collection", ()=>{
        let set = new ESet([1, 2, 3]);
        let pseudoArray = {1:1, 2:2, 3:3};
        assert(()=>set.same(pseudoArray)).fail();
    });

    it ("Picks a value from a set", ()=>{
        let set = new ESet([1, 2, 3]);
        // Pick does not remove from set
        let value = set.pick();
        assert(value).isTrue();
        assert(set.size).equalsTo(3);
        // Take removes from set
        value = set.take();
        assert(value).isTrue();
        assert(set.size).equalsTo(2);
    });

    it("Manipulates an extended Map (EMap)", () => {
        let map1 = new EMap([[1, "one"], [2, "two"], [3, "three"]]);
        let map2 = new EMap([[3, "three"], [4, "four"], [5, "five"]]);
        assert(map1);
        assert([...map1.entries()]).arrayEqualsTo([[1, "one"], [2, "two"], [3, "three"]]);
        // Union
        let union = map1.union(map2);
        assert([...union.entries()]).arrayEqualsTo([
            [1, "one"], [2, "two"], [3, "three"], [4, "four"], [5, "five"]
        ]);
        // Intersect
        let intersect = map1.intersect(map2);
        assert([...intersect.entries()]).arrayEqualsTo([[3, "three"]]);
        // Difference
        let diff = map1.diff(map2);
        assert([...diff.entries()]).arrayEqualsTo([[1, "one"], [2, "two"]]);
        // Same
        assert(map1.same(map2)).isFalse();
        assert(map1.same(new EMap([[1, "one"], [2, "two"], [3, "three"]]))).isTrue();
        assert(map1.same([[1, "one"], [2, "two"], [3, "three"]])).isTrue();
    });

    it("Checks that Map merges only maps compatible objects", () => {
        let map = new EMap([[1, "one"], [2, "two"], [3, "three"]]);
        // Collection must be a map or an array
        assert(()=>map.merge({})).fail();
        // If array, elements must be arrays
        assert(()=>map.merge([{}])).fail();
    });

    it("Fails immediately to compare two maps if sizes are different", ()=>{
        let map1 = new EMap([[1, "one"], [2, "two"], [3, "three"]]);
        let map2 = new EMap([[1, "one"], [2, "two"]]);
        assert(map1.same(map2)).equalsTo(false);
    });

    it("Throws an exception if one try to compare a map with an object which is not a map", ()=>{
        let map = new EMap([[1, "one"], [2, "two"], [3, "three"]]);
        assert(()=>map.same({})).fail();
    });

    it("Uses a spacial locator", ()=> {
        let spacialLocator = new SpatialLocator(-100, -100, 100, 100, 3, 20, element=>element);
        let element1 = {x:-50, y:-50};
        spacialLocator.add(element1);
        assert(spacialLocator.find(0, 0, 20)).unorderedEqualsTo([]);
        assert(spacialLocator.find(-40, -40, 20)).unorderedEqualsTo([element1]);
    });

    it("Splits a spacial sector when threshold is reached: (remove top/left and bottom/right)", ()=> {
        let spacialLocator = new SpatialLocator(-100, -100, 100, 100, 3, 20, element=>element);
        let element1 = {x:-50, y:-50};
        let element2 = {x:50, y:-50};
        let element3 = {x:-50, y:50};
        // Add more elements than threshold
        spacialLocator.add(element1).add(element2);
        assert(spacialLocator._sector._leftTopSector).isNotDefined();
        assert(spacialLocator._sector._leftBottomSector).isNotDefined();
        assert(spacialLocator._sector._rightTopSector).isNotDefined();
        assert(spacialLocator._sector._rightBottomSector).isNotDefined();
        assert(spacialLocator.elements).unorderedEqualsTo([element1, element2]);
        // Threshold reached ! elements are dispatched in sub sectors
        spacialLocator.add(element3);
        assert(spacialLocator._sector._leftTopSector._elements).unorderedEqualsTo([element1]);
        assert(spacialLocator._sector._leftBottomSector._elements).unorderedEqualsTo([element3]);
        assert(spacialLocator._sector._rightTopSector._elements).unorderedEqualsTo([element2]);
        assert(spacialLocator._sector._rightBottomSector).isNotDefined();
        // Verify that finding in sub sectors is functional
        assert(spacialLocator.find(0, 0, 20)).unorderedEqualsTo([]);
        assert(spacialLocator.find(-40, 40, 20)).unorderedEqualsTo([element3]);
        // Check that everything works on fourth sector
        let element4 = {x:50, y:50};
        spacialLocator.add(element4);
        assert(spacialLocator.find(40, 40, 20)).unorderedEqualsTo([element4]);
        assert(spacialLocator.size).equalsTo(4);
        assert(spacialLocator.elements).unorderedEqualsTo([element1, element2, element3, element4]);
        // Remove elemente : sector should be reunited
        spacialLocator.remove(element3);
        assert(spacialLocator._sector._leftTopSector).isDefined();
        assert(spacialLocator._sector._leftBottomSector).isNotDefined();
        spacialLocator.remove(element4);
        assert(spacialLocator._sector._leftTopSector).isNotDefined();
        assert(spacialLocator._sector._leftBottomSector).isNotDefined();
        assert(spacialLocator._sector._rightTopSector).isNotDefined();
        assert(spacialLocator._sector._rightBottomSector).isNotDefined();
        assert(spacialLocator._sector._elements).unorderedEqualsTo([element1, element2]);
        assert(spacialLocator.size).equalsTo(2);
        assert(spacialLocator.elements).unorderedEqualsTo([element1, element2]);
    });

    it("Splits a spacial sector when threshold is reached (remove bottom/left and top/right)", ()=> {
        let spacialLocator = new SpatialLocator(-100, -100, 100, 100, 3, 20, element=>element);
        let element1 = {x:-50, y:-50};
        let element2 = {x:50, y:-50};
        let element3 = {x:-50, y:50};
        let element4 = {x:50, y:50};
        spacialLocator.add(element1).add(element2).add(element3).add(element4);
        // Remove elemente : sector should be reunited
        spacialLocator.remove(element1);
        assert(spacialLocator._sector._leftTopSector).isNotDefined();
        spacialLocator.remove(element2);
        assert(spacialLocator._sector._rightBottomSector).isNotDefined();
        assert(spacialLocator._sector._elements).unorderedEqualsTo([element3, element4]);
        assert(spacialLocator.size).equalsTo(2);
        assert(spacialLocator.elements).unorderedEqualsTo([element3, element4]);
    });

    it("Splits a sector contained in a sector", ()=> {
        // Splits root sector
        let spacialLocator = new SpatialLocator(-100, -100, 100, 100, 2, 20, element => element);
        let element1 = {x: -50, y: -50};
        let element2 = {x: 50, y: -50};
        let element3 = {x: -50, y: 50};
        let element4 = {x: 50, y: 50};
        spacialLocator.add(element1).add(element2).add(element3).add(element4);
        // Splits again left/top sector
        let element5 = {x: -75, y: -75};
        let element6 = {x: -25, y: -75};
        let element7 = {x: -75, y: -25};
        let element8 = {x: -25, y: -25};
        spacialLocator.add(element5).add(element6).add(element7).add(element8);
        // Verify SpaceLocator structure and content
        assert(spacialLocator._sector._leftTopSector._elements).isNotDefined();
        assert(spacialLocator._sector._leftTopSector._leftTopSector).isDefined();
        assert(spacialLocator._sector._leftTopSector._rightTopSector).isDefined();
        assert(spacialLocator._sector._leftTopSector._leftBottomSector).isDefined();
        assert(spacialLocator._sector._leftTopSector._rightBottomSector).isDefined();
        assert(spacialLocator._sector.elements).unorderedEqualsTo([
            element1, element2, element3, element4, element5, element6, element7, element8
        ]);
    });

    it("Uses an empty spacial locator", ()=> {
        let spacialLocator = new SpatialLocator(-100, -100, 100, 100, 3, 20, element=>element);
        assert(spacialLocator.find(0, 0, 20)).unorderedEqualsTo([]);
    });

    it ("Uses a Box Locator", ()=> {
        let boxLocator = new BoxLocator(10, 1, element=>element);
        let element1 = {left:-50, top:-50, right:-30, bottom:-30};
        boxLocator.add(element1);
        assert(boxLocator.find(0, 0)).unorderedEqualsTo([]);
        assert(boxLocator.find(-40, -40)).unorderedEqualsTo([element1]);
        assert(boxLocator.getBBox(element1)).objectEqualsTo({left:-50, top:-50, right:-30, bottom:-30});
    });

    it ("Adds and removes an element before using it", ()=> {
        let boxLocator = new BoxLocator(10, 1, element=>element);
        let element1 = {left:-50, top:-50, right:-30, bottom:-30};
        boxLocator.add(element1);
        assert(boxLocator.size).equalsTo(1);
        let sector = boxLocator._sector;
        assert(sector).isDefined();
        // Add and remove an element : nothing change
        let element2 = {left:30, top:30, right:50, bottom:50};
        boxLocator.add(element2).remove(element2);
        assert(boxLocator.size).equalsTo(1);
        assert(boxLocator._sector).equalsTo(sector);
        // Remove than add : nothing changed
        boxLocator.add(element2);
        assert(boxLocator.size).equalsTo(2);
        sector = boxLocator._sector;
        boxLocator.remove(element2).add(element2);
        assert(boxLocator.size).equalsTo(2);
        assert(boxLocator._sector).equalsTo(sector);
    });

    it("Splits a spacial sector when threshold is reached", ()=> {
        let boxLocator = new BoxLocator(3, 1, element=>element);
        // Too few elements : sector is not splitted
        let element1 = {left:-100, top:-100, right:100, bottom:100};
        let element2 = {left:-40, top:-40, right:-20, bottom:-20};
        boxLocator.add(element1).add(element2);
        assert(boxLocator.size).equalsTo(2);
        assert(boxLocator._sector._leftSector).isNotDefined();
        // Threshold reached : elements are dispatched in sub-sectors
        let element3 = {left:-50, top:-40, right:-20, bottom:-20};
        boxLocator.add(element3);
        assert(boxLocator.size).equalsTo(3);
        assert(boxLocator._sector._leftSector).isDefined();
        assert(boxLocator._sector._rightSector).isNotDefined();
        assert(boxLocator._sector._elements).isDefined();
        // New element in center : it is not dispatched to subsectors
        let element4 = {left:-10, top:-10, right:10, bottom:10};
        boxLocator.add(element4);
        assert(boxLocator.size).equalsTo(4);
        assert(boxLocator._sector._elements).arrayEqualsTo([element1, element4]);
    });

    it("Shrinks a spacial sector when elements are removed", ()=> {
        let boxLocator = new BoxLocator(3, 1, element=>element);
        // Too few elements : sector is not splitted
        let element1 = {left:-100, top:-100, right:100, bottom:100};
        let element2 = {left:-40, top:-40, right:-20, bottom:-20};
        let element3 = {left:-50, top:-40, right:-20, bottom:-20};
        let element4 = {left:-50, top:-40, right:-20, bottom:-20};
        boxLocator.add(element1).add(element2).add(element3).add(element4);
        // Simple remove...
        boxLocator.remove(element2);
        assert(boxLocator.size).equalsTo(3);
        assert(boxLocator._sector._leftSector).isDefined();
        // Threshold reached : sector is shrinked
        boxLocator.remove(element3);
        assert(boxLocator.size).equalsTo(2);
        assert(boxLocator._sector._leftSector).isNotDefined();
    });

    it("Resizes a spacial locator when out of bound elements are added", ()=> {
        let boxLocator = new BoxLocator(3, 1, element=>element);
        // Locator bounds fits first element geometry
        let element1 = {left:-100, top:-90, right:-70, bottom:-60};
        boxLocator.add(element1);
        assert(boxLocator.size).equalsTo(1);
        assert(boxLocator._left).equalsTo(-100);
        assert(boxLocator._top).equalsTo(-90);
        assert(boxLocator._right).equalsTo(-70);
        assert(boxLocator._bottom).equalsTo(-60);
        let sector = boxLocator._sector;
        assert(sector).isDefined();
        // Extends locator bounds to include new element
        let element2 = {left:70, top:60, right:100, bottom:90};
        boxLocator.add(element2);
        assert(boxLocator.size).equalsTo(2);
        assert(boxLocator._left).equalsTo(-100);
        assert(boxLocator._top).equalsTo(-90);
        assert(boxLocator._right).equalsTo(100);
        assert(boxLocator._bottom).equalsTo(90);
        assert(sector===boxLocator._sector).isFalse();
        // Reduce locator bounds when necessary
        sector = boxLocator._sector;
        boxLocator.remove(element2);
        assert(boxLocator.size).equalsTo(1);
        assert(boxLocator._left).equalsTo(-100);
        assert(boxLocator._top).equalsTo(-90);
        assert(boxLocator._right).equalsTo(-70);
        assert(boxLocator._bottom).equalsTo(-60);
        assert(sector===boxLocator._sector).isFalse();
    });

    it("Removes an element directly owned by the sector", ()=>{
        let boxLocator = new BoxLocator(2, 1, element=>element);
        let element0 = {left:-60, top:-60, right:60, bottom:60};
        let element1 = {left:-50, top:-50, right:50, bottom:50};
        boxLocator.add(element0).add(element1);
        assert(boxLocator.size).equalsTo(2);
        assert([...boxLocator._sector._elements]).arrayEqualsTo([element0, element1]);
        boxLocator.remove(element1);
        assert(boxLocator.size).equalsTo(1);
        assert([...boxLocator._sector._elements]).arrayEqualsTo([element0]);
    });

    it("Removes an element in a left sector (other sectors are tested elsewhere)", ()=>{
        let boxLocator = new BoxLocator(3, 1, element=>element);
        let element0 = {left:-60, top:-60, right:60, bottom:60};
        let element1 = {left:-50, top:-50, right:-30, bottom:-30};
        let element2 = {left:30, top:-40, right:50, bottom:-20};
        boxLocator.add(element0).add(element1).add(element2);
        assert(boxLocator.size).equalsTo(3);
        assert(boxLocator._sector._leftSector).isDefined();
        assert(boxLocator._sector._rightSector).isDefined();
        boxLocator.remove(element1);
        assert(boxLocator.size).equalsTo(2);
        assert(boxLocator._sector._leftSector).isNotDefined();
        assert(boxLocator._sector._rightSector).isNotDefined();
    });

    it("Removes an element in a right sector (other sectors are tested elsewhere)", ()=>{
        let boxLocator = new BoxLocator(3, 1, element=>element);
        let element0 = {left:-60, top:-60, right:60, bottom:60};
        let element1 = {left:-50, top:-50, right:-30, bottom:-30};
        let element2 = {left:30, top:-40, right:50, bottom:-20};
        boxLocator.add(element0).add(element1).add(element2);
        assert(boxLocator.size).equalsTo(3);
        assert(boxLocator._sector._leftSector).isDefined();
        assert(boxLocator._sector._rightSector).isDefined();
        boxLocator.remove(element2);
        assert(boxLocator.size).equalsTo(2);
        assert(boxLocator._sector._leftSector).isNotDefined();
        assert(boxLocator._sector._rightSector).isNotDefined();
    });

    it("Shrinks a top sector (other sectors are tested elsewhere)", ()=>{
        let boxLocator = new BoxLocator(3, 1, element=>element);
        // Too few elements : sector is not splitted
        let element0 = {left:-60, top:-60, right:60, bottom:60};
        let element1 = {left:-50, top:-50, right:30, bottom:-30};
        let element2 = {left:-50, top:30, right:30, bottom:50};
        boxLocator.add(element0).add(element1).add(element2);
        assert(boxLocator.size).equalsTo(3);
        assert(boxLocator._sector._topSector).isDefined();
        assert(boxLocator._sector._bottomSector).isDefined();
        // removes elements on top, so shrinking is done on bottom sector
        boxLocator.remove(element2);
        assert(boxLocator.size).equalsTo(2);
        assert(boxLocator._sector._topSector).isNotDefined();
        assert(boxLocator._sector._bottomSector).isNotDefined();
        assert([...boxLocator._sector._elements]).arrayEqualsTo([element0, element1]);
    });

    it("Shrinks a bottom sector (other sectors are tested elsewhere)", ()=>{
        let boxLocator = new BoxLocator(3, 1, element=>element);
        // Too few elements : sector is not splitted
        let element0 = {left:-60, top:-60, right:60, bottom:60};
        let element1 = {left:-50, top:-50, right:30, bottom:-30};
        let element2 = {left:-50, top:30, right:30, bottom:50};
        boxLocator.add(element0).add(element1).add(element2);
        assert(boxLocator.size).equalsTo(3);
        assert(boxLocator._sector._topSector).isDefined();
        assert(boxLocator._sector._bottomSector).isDefined();
        // removes elements on top, so shrinking is done on bottom sector
        boxLocator.remove(element1);
        assert(boxLocator.size).equalsTo(2);
        assert(boxLocator._sector._topSector).isNotDefined();
        assert(boxLocator._sector._bottomSector).isNotDefined();
        assert([...boxLocator._sector._elements]).arrayEqualsTo([element0, element2]);
    });

    it("Keeps a centered object in sector elements collection when splitting box sector", ()=> {
        let boxLocator = new BoxLocator(3, 1, element => element);
        // Too few elements : sector is not splitted
        let element1 = {left: -50, top: -50, right: -30, bottom: -30};
        let element2 = {left: 30, top: -50, right: 50, bottom: -30};
        let element3 = {left: -10, top: -50, right: 10, bottom: -30};
        boxLocator.add(element1).add(element2).add(element3);
        assert(boxLocator.size).equalsTo(3);
        assert(boxLocator._sector._leftSector.elements).unorderedEqualsTo([element1]);
        assert(boxLocator._sector._rightSector.elements).unorderedEqualsTo([element2]);
        assert(boxLocator._sector._elements).arrayEqualsTo([element3]);
        // removes and shrink
        boxLocator.remove(element3);
        assert(boxLocator.size).equalsTo(2);
        assert(boxLocator._sector._leftSector).isNotDefined();
        assert(boxLocator._sector._elements).isDefined();
    });

    it("Splits a box sector in top and bottom sectors", ()=> {
        let boxLocator = new BoxLocator(2, 1, element=>element);
        // Elements are in the center of X-Axis, Y Axis is used
        let element1 = {left:-50, top:-50, right:50, bottom:-30};
        let element2 = {left:-50, top:30, right:50, bottom:50};
        boxLocator.add(element1).add(element2);
        assert(boxLocator.size).equalsTo(2);
        assert(boxLocator._sector._topSector).isDefined();
        assert(boxLocator._sector._bottomSector).isDefined();
        // Add more elements to avoid shrinking...
        let element3 = {left:-50, top:-50, right:-30, bottom:-30};
        let element4 = {left:-40, top:-40, right:-20, bottom:-20};
        boxLocator.add(element3).add(element4);
        assert(boxLocator.size).equalsTo(4);
        // Remove element on top sector
        boxLocator.remove(element1);
        assert(boxLocator.size).equalsTo(3);
        assert(boxLocator._sector._topSector).isNotDefined();
        assert(boxLocator._sector._bottomSector).isDefined();
        // Remove element on bottom sector
        boxLocator.remove(element2);
        assert(boxLocator.size).equalsTo(2);
        assert(boxLocator._sector._bottomSector).isNotDefined();
    });

});