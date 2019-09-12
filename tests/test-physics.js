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
    makePositioningContainer, makeCollisionContainer, makeGravitationContainer, makeStickingGravitationContainer,
    makeCarrier, makeCarriable, makeStickable
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

    function createContainer(ContainerClass, table, x, y, width=100, height=100) {
        let container = new ContainerClass(width, height);
        container.setLocation(x, y);
        table.add(container);
        return container;
    }

    function createElement(ElementClass, container, x, y, width=20, height=20) {
        let element = new ElementClass(width, height);
        element.setLocation(x, y);
        container.add(element);
        return element;
    }

    it("Uses a positioning physics", ()=>{
        let table = putTable();
        let DraggableClass = defineDraggableClass();
        let ContainerClass = definePositioningContainerClass(DraggableClass, function(element) {
            return [{x:-25, y:-25}, {x:25, y:-25}, {x:25, y:25}, {x:-25, y:25}]
        });
        let container = createContainer(ContainerClass, table, 100, 10);
        let element = createElement(DraggableClass, table, 0, 100);
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
        let container = createContainer(ContainerClass, table, 100, 10);
        createElement(DraggableClass, container, 0, 0);
        let movingElement = createElement(DraggableClass, table, 0, 100);
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
        let movingElement = createElement(DraggableClass, table, -100, -100);
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
        let movingElement = createElement(DraggableClass, table, -100, -100);
        executeTimeouts();
        crossBorder(table, container, movingElement);
    });

    it("Undo and redo drops inside a collision physics", ()=>{
        let {table, container, DraggableClass} = createABorderedCollisionContainer();
        let element1 = createElement(DraggableClass, table, -100, -50);
        let element2 = createElement(DraggableClass, table, -100, 50);
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

    function copyAContainerWithCollisionPhysic() {
        let {table, container, DraggableClass, ContainerClass} = createABorderedCollisionContainer();
        makeSelectable(ContainerClass);
        container.setLocation(200, 0);
        Context.selection.selectOnly(container);
        createElement(DraggableClass, container, 0, 0);
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
        let movingElement = createElement(DraggableClass, table, 0, 100);
        drag(movingElement).from(0, 100).hover(containerCopy, -25, 25).on(containerCopy, -15, 0);
        assert(movingElement.parent).equalsTo(containerCopy);
        // New element does not overlap avec copied element
        assert(movingElement.location).sameTo({x:-20, y:0})
    });

    it("It cross the border of a copied collision physic", ()=>{
        let {table, DraggableClass, containerCopy} = copyAContainerWithCollisionPhysic();
        assert(containerCopy).isDefined();
        let movingElement = createElement(DraggableClass, table, -100, -100);
        crossBorder(table, containerCopy, movingElement);
    });

    it("Uses a gravitation physics", ()=>{
        let table = putTable();
        let DraggableClass = defineDraggableClass();
        let ContainerClass = defineGravitationContainerClass(DraggableClass);
        let container = createContainer(ContainerClass, table, 100, 0);
        let movingElement = createElement(DraggableClass, table, 0, 100);
        drag(movingElement).from(0, 100).hover(container, -25, 25).on(container, 0, 0);
        executeTimeouts();
        // Element on the bottom of the container
        assert(movingElement.location).sameTo({x:0, y:40});
    });

    function defineStickingGravitationContainerClass(DraggableClass, specs) {
        let BoardStickingGraviationContainer = defineContainerClass();
        makeStickingGravitationContainer(BoardStickingGraviationContainer, element=>element instanceof DraggableClass, specs);
        return BoardStickingGraviationContainer;
    }

    it("Uses a gravitation physics with several stacked items", ()=>{
        let table = putTable();
        let DraggableClass = defineDraggableClass();
        let ContainerClass = defineGravitationContainerClass(DraggableClass);
        let container = createContainer(ContainerClass, table, 100, 0);
        let movingElement1 = createElement(DraggableClass, table, 0, 100);
        let movingElement2 = createElement(DraggableClass, table, 0, 70);
        Context.selection.selectOnly(movingElement1, movingElement2);
        let dragSequence = drag(movingElement1).from(0, 100).hover(container, -25, 25).on(container, 0, 0);
        executeTimeouts();
        // The elements are stacked
        assert(movingElement1.location).sameTo({x:0, y:40});
        assert(movingElement2.location).sameTo({x:0, y:20});
    });

    it("Uses a gravitation physics with several uncorrelated items", ()=>{
        let table = putTable();
        let DraggableClass = defineDraggableClass();
        let ContainerClass = defineGravitationContainerClass(DraggableClass);
        let container = createContainer(ContainerClass, table, 100, 0);
        let movingElement1 = createElement(DraggableClass, table, -25, 100);
        let movingElement2 = createElement(DraggableClass, table, 25, 70);
        Context.selection.selectOnly(movingElement1, movingElement2);
        let dragSequence = drag(movingElement1).from(0, 100).hover(container, -25, 25).on(container, 0, 0);
        executeTimeouts();
        // The elements are bithat the bottom of the container
        assert(movingElement1.location).sameTo({x:-25, y:40});
        assert(movingElement2.location).sameTo({x:25, y:40});
    });

    it("Uses a sticking gravitation physics", ()=>{
        let table = putTable();
        let DraggableClass = defineDraggableClass();
        let ContainerClass = defineStickingGravitationContainerClass(DraggableClass);
        let container = createContainer(ContainerClass, table, 100, 0);
        let movingElement = createElement(DraggableClass, table, 0, 100);
        drag(movingElement).from(0, 100).hover(container, -25, 25).on(container, 0, 0);
        executeTimeouts();
        // Element on the bottom of the container
        assert(movingElement.location).sameTo({x:0, y:40});
    });

    it("Uses a sticking gravitation physics with several stacked items", ()=>{
        let table = putTable();
        let DraggableClass = defineDraggableClass();
        let ContainerClass = defineStickingGravitationContainerClass(DraggableClass);
        let container = createContainer(ContainerClass, table, 100, 0);
        let movingElement1 = createElement(DraggableClass, table, 0, 100);
        let movingElement2 = createElement(DraggableClass, table, 0, 70);
        Context.selection.selectOnly(movingElement1, movingElement2);
        let dragSequence = drag(movingElement1).from(0, 100).hover(container, -25, 25).on(container, 0, 0);
        executeTimeouts();
        // The elements are stacked
        assert(movingElement1.location).sameTo({x:0, y:40});
        assert(movingElement2.location).sameTo({x:0, y:20});
    });

    it("Uses a sticking gravitation physics with several uncorrelated items", ()=>{
        let table = putTable();
        let DraggableClass = defineDraggableClass();
        let ContainerClass = defineStickingGravitationContainerClass(DraggableClass);
        let container = createContainer(ContainerClass, table, 100, 0);
        let movingElement1 = createElement(DraggableClass, table, -25, 100);
        let movingElement2 = createElement(DraggableClass, table, 25, 70);
        Context.selection.selectOnly(movingElement1, movingElement2);
        let dragSequence = drag(movingElement1).from(0, 100).hover(container, -25, 25).on(container, 0, 0);
        executeTimeouts();
        // The elements are bithat the bottom of the container
        assert(movingElement1.location).sameTo({x:-25, y:40});
        assert(movingElement2.location).sameTo({x:25, y:40});
    });

    /**
     * Creates 3 falling 20x20 elements, one at x=0, the two others at x=-10 and x=10. The y position is given as
     * parameters to this function. The function creates also the container and the table, put elements on container and
     * let them fall.
     * @param ye1 y of movingElement1 before falling
     * @param ye2 y of movingElement2 before falling
     * @param ye3 y of movingElement3 before falling
     * @returns {{table, container, movingElement1, movingElement2, movingElement3}}
     */
    function moveAndFallElementsOnContainer(ye1, ye2, ye3) {
        let table = putTable();
        let DraggableClass = defineDraggableClass();
        makeCarrier(DraggableClass);
        makeCarriable(DraggableClass);
        let ContainerClass = defineGravitationContainerClass(DraggableClass);
        let container = createContainer(ContainerClass, table, 100, 0);
        let movingElement1 = createElement(DraggableClass, table, 0, ye1);
        let movingElement2 = createElement(DraggableClass, table, 10, ye2);
        let movingElement3 = createElement(DraggableClass, table, -10, ye3);
        Context.selection.selectOnly(movingElement1, movingElement2, movingElement3);
        drag(movingElement1).from(0, 100).hover(container, -25, 25).on(container, 0, 0);
        executeTimeouts();
        return {table, container, movingElement1, movingElement2, movingElement3}
    }

    it("Links elements by a carried/carried By relationship (one carries many)", ()=>{
        let {movingElement1, movingElement2, movingElement3} = moveAndFallElementsOnContainer(100, 75, 60);
        // The elements are stacked
        assert(movingElement1.location).sameTo({x:0, y:40});
        assert(movingElement2.location).sameTo({x:10, y:20});
        assert(movingElement3.location).sameTo({x:-10, y:20});
        assert([...movingElement1.carried]).unorderedEqualsTo([movingElement2, movingElement3]);
        assert([...movingElement2.carriers]).arrayEqualsTo([movingElement1]);
        assert([...movingElement3.carriers]).arrayEqualsTo([movingElement1]);
    });

    it("Links elements by a carried/carried By relationship (one is carried by many)", ()=>{
        let {movingElement1, movingElement2, movingElement3} = moveAndFallElementsOnContainer(100, 115, 120);
        // The elements are stacked
        assert(movingElement1.location).sameTo({x:0, y:20});
        assert(movingElement2.location).sameTo({x:10, y:40});
        assert(movingElement3.location).sameTo({x:-10, y:40});
        assert([...movingElement1.carriers]).unorderedEqualsTo([movingElement2, movingElement3]);
        assert([...movingElement2.carried]).arrayEqualsTo([movingElement1]);
        assert([...movingElement3.carried]).arrayEqualsTo([movingElement1]);
    });

    it("Links elements by a carried/carried By relationship for a sticking gravitation container", ()=>{
        let table = putTable();
        let DraggableClass = defineDraggableClass();
        makeCarrier(DraggableClass);
        makeCarriable(DraggableClass);
        let ContainerClass = defineStickingGravitationContainerClass(DraggableClass);
        let container = createContainer(ContainerClass, table, 100, 0);
        let movingElement1 = createElement(DraggableClass, table, 0, 100);
        let movingElement2 = createElement(DraggableClass, table, 10, 70);
        Context.selection.selectOnly(movingElement1, movingElement2);
        drag(movingElement1).from(0, 100).hover(container, -25, 25).on(container, 0, 0);
        executeTimeouts();
        // The elements are stacked
        assert(movingElement1.location).sameTo({x:0, y:40});
        assert(movingElement2.location).sameTo({x:10, y:20});
        assert([...movingElement1.carried]).arrayEqualsTo([movingElement2]);
        assert([...movingElement2.carriers]).arrayEqualsTo([movingElement1]);
    });

    it("Drags an element that carries many", ()=>{
        let {table, container, movingElement1, movingElement2, movingElement3} = moveAndFallElementsOnContainer(100, 75, 60);
        // Element1 carries element2 and element3
        Context.selection.selectOnly(movingElement1);
        drag(movingElement1).at(movingElement1, 0, 0).to(0, 100);
        // All elements on new position (relative position are unchanged)
        assert(movingElement1.location).sameTo({x:0, y:100});
        assert(movingElement2.location).sameTo({x:10, y:80});
        assert(movingElement3.location).sameTo({x:-10, y:80});
        // Everybody on table
        assert(movingElement1.parent).equalsTo(table);
        assert(movingElement2.parent).equalsTo(table);
        assert(movingElement3.parent).equalsTo(table);
        // So container is empty now
        assert(container.children).arrayEqualsTo([]);
        // But carried/carried by relationship is unchanged
        assert([...movingElement1.carried]).arrayEqualsTo([movingElement2, movingElement3]);
        assert([...movingElement2.carriers]).arrayEqualsTo([movingElement1]);
        assert([...movingElement3.carriers]).arrayEqualsTo([movingElement1]);
    });

    it("Breaks a carried/carried by relationship", ()=>{
        let {table, container, movingElement1, movingElement2, movingElement3} = moveAndFallElementsOnContainer(100, 115, 120);
        // Element1 carries element2 and element3
        Context.selection.selectOnly(movingElement1);
        drag(movingElement2).at(movingElement2, 0, 0).to(0, 100);
        // Carrier and carried are moved
        assert(movingElement2.location).sameTo({x:0, y:100});
        assert(movingElement1.location).sameTo({x:-10, y:80});
        assert(movingElement1.parent).equalsTo(table);
        assert(movingElement2.parent).equalsTo(table);
        // But not carried is not !
        assert(movingElement3.location).sameTo({x:-10, y:40});
        assert(movingElement3.parent).equalsTo(container);
        // So container still contain one element
        assert(container.children).arrayEqualsTo([movingElement3]);
        // But carried/carried by relationship is unchanged
        assert([...movingElement1.carriers]).arrayEqualsTo([movingElement2]);
        assert([...movingElement2.carried]).arrayEqualsTo([movingElement1]);
        assert([...movingElement3.carried]).arrayEqualsTo([]);
    });

    it("Lets fall sticked elements", ()=>{
        let table = putTable();
        let DraggableClass = defineDraggableClass();
        makeStickable(DraggableClass);
        let ContainerClass = defineStickingGravitationContainerClass(DraggableClass);
        let container = createContainer(ContainerClass, table, 100, 0);
        let mainElement = createElement(DraggableClass, table, 0, 100, 20, 20);
        let stickedElement = createElement(DraggableClass, table, 15, 100, 10, 10);
        mainElement.stick(stickedElement);
        drag(mainElement).from(0, 100).hover(container, -25, 25).on(container, 0, 0);
        executeTimeouts();
        assert(mainElement.location).sameTo({x:0, y:40});
        assert(stickedElement.location).sameTo({x:15, y:40});
    });

    it("Lets fall sticked element on another element", ()=>{
        let table = putTable();
        let DraggableClass = defineDraggableClass();
        makeStickable(DraggableClass);
        let ContainerClass = defineStickingGravitationContainerClass(DraggableClass);
        let container = createContainer(ContainerClass, table, 100, 0);
        let mainElement = createElement(DraggableClass, table, 0, 100, 20, 20);
        let stickedElement = createElement(DraggableClass, table, 15, 100, 10, 10);
        createElement(DraggableClass, container, 15, 30, 20, 20);
        mainElement.stick(stickedElement);
        drag(mainElement).from(0, 100).hover(container, -25, 25).on(container, -10, -25);
        executeTimeouts();
        assert(mainElement.location).sameTo({x:-10, y:25});
        assert(stickedElement.location).sameTo({x:5, y:25});
    });

    it("Lets fall a block on an element stopped by another block", ()=>{
        let table = putTable();
        let DraggableClass = defineDraggableClass();
        makeStickable(DraggableClass);
        let ContainerClass = defineStickingGravitationContainerClass(DraggableClass);
        let container = createContainer(ContainerClass, table, 100, 0);
        let mainElement = createElement(DraggableClass, table, 0, 100, 20, 20);
        let stickedElement = createElement(DraggableClass, table, 15, 100, 10, 10);
        let thirdBlockElement = createElement(DraggableClass, table, 0, 80, 10, 10);
        Context.selection.selectOnly(mainElement, thirdBlockElement);
        createElement(DraggableClass, container, 15, 30, 20, 20);
        mainElement.stick(stickedElement);
        drag(mainElement).from(0, 100).hover(container, -25, 25).on(container, -10, -25);
        executeTimeouts();
        assert(thirdBlockElement.location).sameTo({x:-10, y:10});
        // Every thing ok, even when elements are not carriers/carriables
        assert(thirdBlockElement.carriers).isNotDefined();
        assert(mainElement.carried).isNotDefined();
    });

    it("Lets fall carrier/carriable and stickable elements", ()=>{
        let table = putTable();
        let DraggableClass = defineDraggableClass();
        makeStickable(DraggableClass);
        makeCarrier(DraggableClass);
        makeCarriable(DraggableClass);
        let ContainerClass = defineStickingGravitationContainerClass(DraggableClass);
        let container = createContainer(ContainerClass, table, 100, 0);
        let mainElement = createElement(DraggableClass, table, 0, 100, 20, 20);
        let stickedElement = createElement(DraggableClass, table, 15, 100, 10, 10);
        let thirdBlockElement = createElement(DraggableClass, table, 0, 80, 10, 10);
        Context.selection.selectOnly(mainElement, thirdBlockElement);
        createElement(DraggableClass, container, 15, 30, 20, 20);
        mainElement.stick(stickedElement);
        drag(mainElement).from(0, 100).hover(container, -25, 25).on(container, -10, -25);
        executeTimeouts();
        assert(thirdBlockElement.location).sameTo({x:-10, y:10});
        assert([...thirdBlockElement.carriers]).arrayEqualsTo([mainElement]);
        assert([...mainElement.carried]).arrayEqualsTo([thirdBlockElement]);
    });

});