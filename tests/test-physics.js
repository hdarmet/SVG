'use strict';

import {
    describe, it, before, assert, clickOn, drag, Snapshot, keyboard, executeTimeouts, findChild
} from "./test-toolkit.js";
import {
    Rect
} from "../js/graphics.js";
import {
    setRef, html, Context, Selection, Canvas, DragMoveSelectionOperation
} from "../js/toolkit.js";
import {
    BoardElement, BoardTable, makeShaped, makeClickable, makeMoveable, makeSelectable,
    makeDraggable, makeContainer, makeSupport, makeDeletable
} from "../js/base-element.js";
import {
    makePositioningContainer, makeCollisionContainer, makeGravitationContainer
} from "../js/physics.js";

describe("Physics", ()=> {

    before(()=> {
        document.body.innerHTML=
            '<div id="edit"></div>\n' +
            '<div tabindex="0" id="app"></div>';
        Context.selection = new Selection();
        Context.canvas = new Canvas("#app", 1200, 600);
    });

    function putTable() {
        let table = new BoardTable(4000, 3000, "#A0A0A0");
        Context.canvas.putOnBase(table);
        return table;
    }

    function defineDraggableClass() {
        class BoardDraggable extends BoardElement {
            constructor(width, height) {
                super(width, height);
                this._initShape(new Rect(-width / 2, -height / 2, width, height).attrs({fill:"#00FF00"}));
                this._dragOperation(function() {return new DragMoveSelectionOperation()});
            }
        }
        makeShaped(BoardDraggable);
        makeMoveable(BoardDraggable);
        makeSelectable(BoardDraggable);
        makeDraggable(BoardDraggable);
        return BoardDraggable;
    }

    function defineContainerClass() {
        class BoardContainer extends BoardElement {
            constructor(width, height) {
                super(width, height);
                this._initShape(new Rect(-width / 2, -height / 2, width, height).attrs({fill:"#0F0F0F"}));
            }
        }
        makeShaped(BoardContainer);
        makeSupport(BoardContainer);
        return BoardContainer;
    }

    function definePositioningContainerClass(DraggableClass, strategy) {
        let BoardPositioningContainer = defineContainerClass();
        makePositioningContainer(BoardPositioningContainer, element=>element instanceof DraggableClass, strategy);
        return BoardPositioningContainer;
    }

    it("Uses a positioning physics", ()=>{
        let table = putTable();
        let DraggableClass = defineDraggableClass();
        let ContainerClass = definePositioningContainerClass(DraggableClass, function(element) {
            return [{x:-25, y:-25}, {x:25, y:-25}, {x:25, y:25}, {x:-25, y:25}]
        });
        let container = new ContainerClass(100, 100);
        container.setLocation(100, 0);
        let element = new DraggableClass(10, 10);
        element.setLocation(0, 100);
        table.add(container);
        table.add(element);
        let dragSequence = drag(element).from(0, 100);
        dragSequence.hover(container, 20, 20);
        assert(element.location).sameTo({x:25, y:25});
        dragSequence.on(container, -20, 20);
        assert(element.parent).equalsTo(container);
        assert(element.location).sameTo({x:-25, y:25});
    });

    function defineCollisionContainerClass(DraggableClass, specs) {
        let BoardCollisionContainer = defineContainerClass();
        makeCollisionContainer(BoardCollisionContainer, element=>element instanceof DraggableClass, specs);
        return BoardCollisionContainer;
    }

    it("Uses a collision physics", ()=>{
        let table = putTable();
        let DraggableClass = defineDraggableClass();
        let ContainerClass = defineCollisionContainerClass(DraggableClass);
        let container = new ContainerClass(100, 100);
        container.setLocation(100, 0);
        let elementOnContainer = new DraggableClass(20, 20);
        let movingElement = new DraggableClass(20, 20);
        table.add(container);
        elementOnContainer.setLocation(0, 0);
        container.add(elementOnContainer);
        movingElement.setLocation(0, 100);
        table.add(movingElement);
        let dragSequence = drag(movingElement).from(0, 100);
        dragSequence.hover(container, -25, 25);
        assert(movingElement.location).sameTo({x:-25, y:25});
        dragSequence.hover(container, -15, 10);
        assert(movingElement.location).sameTo({x:-20, y:10});
        dragSequence.on(container, -15, 0);
        assert(movingElement.parent).equalsTo(container);
        assert(movingElement.location).sameTo({x:-20, y:0});
    });

    function createABorderedCollisionContainer() {
        let table = putTable();
        let DraggableClass = defineDraggableClass();
        let ContainerClass = defineCollisionContainerClass(DraggableClass, {all:true});
        let container = new ContainerClass(100, 100);
        table.add(container);
        container.setLocation(0, 0);
        executeTimeouts();
        return {table, container, DraggableClass, ContainerClass};
    }

    it("Puts borders on collision physics", ()=>{
        let {table, container, DraggableClass} = createABorderedCollisionContainer();
        let movingElement = new DraggableClass(20, 20);
        movingElement.setLocation(-100, -100);
        table.add(movingElement);
        executeTimeouts();
        let dragSequence = drag(movingElement).from(-100, -100);
        // No collision at all
        dragSequence.hover(container, -80, 40);
        assert(movingElement.location).sameTo({x:-80, y:40});
        // Collision from "outside" : no collision detected
        dragSequence.hover(container, -55, 40);
        assert(movingElement.location).sameTo({x:-55, y:40});
        // Collision form "inside"
        // East
        dragSequence.hover(container, -40, 30).hover(container, -45, 30);
        assert(movingElement.location).sameTo({x:-40, y:30});
        // West
        dragSequence.hover(container, 40, 30).hover(container, 45, 30);
        assert(movingElement.location).sameTo({x: 40, y:30});
        // North
        dragSequence.hover(container, 30, 40).hover(container, 30, -45);
        assert(movingElement.location).sameTo({x:30, y:-40});
        // South
        dragSequence.hover(container, 30, 40).hover(container, 30, 45);
        assert(movingElement.location).sameTo({x:30, y:40});
        // Drop when collided
        dragSequence.on(container, -45, 40);
        assert(movingElement.parent).equalsTo(container);
        assert(movingElement.location).sameTo({x:-40, y:40});
    });

    function crossBorder(table, container, movingElement) {
        let dragSequence = drag(movingElement).from(-100, -100);
        // No collision at all
        dragSequence.hover(container, -55, 5);
        assert(Context.canvas.getHoveredElements(table).contains(movingElement)).isTrue();
        assert(movingElement.location).sameTo({x:-55, y:5});
        // Collision from "outside" : no collision detected
        dragSequence.hover(container, -41, 5);
        assert(Context.canvas.getHoveredElements(container).contains(movingElement)).isTrue();
        assert(movingElement.location).sameTo({x:-55, y:5});
        dragSequence.hover(container, -40, 5);
        assert(Context.canvas.getHoveredElements(container).contains(movingElement)).isTrue();
        assert(movingElement.location).sameTo({x:-40, y:5});
        // Drop somewhere to "clean" window event listeners
        dragSequence.on(container, 0, 0);
    }

    it("Cross a border on a collision physics", ()=>{
        let {table, container, DraggableClass} = createABorderedCollisionContainer();
        let movingElement = new DraggableClass(20, 20);
        movingElement.setLocation(-100, -100);
        table.add(movingElement);
        executeTimeouts();
        crossBorder(table, container, movingElement);
    });

    it("Undo and redo drops inside a collision physics", ()=>{
        let {table, container, DraggableClass} = createABorderedCollisionContainer();
        let element1 = new DraggableClass(20, 20);
        element1.setLocation(-100, -50);
        table.add(element1);
        let element2 = new DraggableClass(20, 20);
        element2.setLocation(-100, 50);
        table.add(element2);
        Context.memento.opened = true;
        Context.memento.open();
        executeTimeouts();
        // Undo/redo the DnD of an element
        drag(element1).from(-100, -50).through(-60, -60).on(container, 0, 0);
        executeTimeouts();
        assert(element1.location).sameTo({x:0, y:0});
        assert(container.contains(element1)).isTrue();
        Context.memento.undo();
        executeTimeouts();
        assert(element1.location).sameTo({x:-100, y:-50});
        assert(table.contains(element1)).isTrue();
        Context.memento.redo();
        executeTimeouts();
        assert(element1.location).sameTo({x:0, y:0});
        assert(container.contains(element1)).isTrue();
        // Drag another element : the first element must hinder the move ot this incoming element
        drag(element2).from(-100, 50).through(-60, 60).on(container, -15, 10);
        assert(element2.location).sameTo({x:-20, y:10});
        executeTimeouts();
        //consolelog(container._physic);
    });

    function defineGravitationContainerClass(DraggableClass, specs) {
        let BoardGraviationContainer = defineContainerClass();
        makeGravitationContainer(BoardGraviationContainer, element=>element instanceof DraggableClass, specs);
        return BoardGraviationContainer;
    }

    it("Uses a gravitation physics", ()=>{
        let table = putTable();
        let DraggableClass = defineDraggableClass();
        let ContainerClass = defineGravitationContainerClass(DraggableClass);
        let container = new ContainerClass(100, 100);
        container.setLocation(100, 0);
        table.add(container);
        let movingElement = new DraggableClass(20, 20);
        movingElement.setLocation(0, 100);
        table.add(movingElement);
        let dragSequence = drag(movingElement).from(0, 100).hover(container, -25, 25).on(container, 0, 0);
        executeTimeouts();
        // Element on the bottom of the container
        assert(movingElement.location).sameTo({x:0, y:40});
    });

    function copyAContainerWithCollisionPhysic() {
        let {table, container, DraggableClass, ContainerClass} = createABorderedCollisionContainer();
        makeSelectable(ContainerClass);
        container.setLocation(200, 0);
        Context.selection.selectOnly(container);
        let element1 = new DraggableClass(20, 20);
        element1.setLocation(0, 0);
        container.add(element1);
        executeTimeouts();
        Context.copyPaste.copyModel(Context.selection.selection());
        Context.copyPaste.pasteModel();
        executeTimeouts();
        let containerCopy = findChild(table, 0, 0);
        let elementCopy = findChild(containerCopy, 0, 0);
        return {table, DraggableClass, containerCopy, elementCopy};
    }

    it("Copy/Paste a collision physic", ()=>{
        let {containerCopy, elementCopy} = copyAContainerWithCollisionPhysic();
        assert(containerCopy).isDefined();
        assert(elementCopy).isDefined();
    });

    it("It drops an element in a copied collision physic", ()=>{
        let {table, DraggableClass, containerCopy} = copyAContainerWithCollisionPhysic();
        assert(containerCopy).isDefined();
        let movingElement = new DraggableClass(20, 20);
        movingElement.setLocation(0, 100);
        table.add(movingElement);
        drag(movingElement).from(0, 100).hover(containerCopy, -25, 25).on(containerCopy, -15, 0);
        assert(movingElement.parent).equalsTo(containerCopy);
        // New element does not overlap avec copied element
        assert(movingElement.location).sameTo({x:-20, y:0})
    });

    it("It cross the border of a copied collision physic", ()=>{
        let {table, DraggableClass, containerCopy} = copyAContainerWithCollisionPhysic();
        assert(containerCopy).isDefined();
        let movingElement = new DraggableClass(20, 20);
        movingElement.setLocation(-100, -100);
        table.add(movingElement);
        crossBorder(table, containerCopy, movingElement);
    });

});