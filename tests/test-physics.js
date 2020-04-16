'use strict';

import {
    describe, it, before, assert, drag, executeTimeouts, findChild
} from "./test-toolkit.js";
import {
    Rect
} from "../js/graphics.js";
import {
    Context, Selection, Canvas
} from "../js/toolkit.js";
import {
    DragMoveSelectionOperation
} from "../js/drag-and-drop.js";
import {
    makeShaped, makeMovable, makeSelectable, makeDraggable
} from "../js/core-mixins.js";
import {
    makeSupport
} from "../js/container-mixins.js";
import {
    SigmaElement, SigmaTable
} from "../js/base-element.js";
import {
    makePositioningContainer, addPhysicToContainer
    } from "../js/physics.js";
import {
    makeCollisionContainerForElements, makeGravitationContainerForElements, makeStickyGravitationContainerForElements,
    makeCarrier, makeCarriable, makeGlueable, createStickyGravitationPhysicForElements, makeDroppedElementsToGlue, Glue
} from "../js/collision-physics.js";
import {
    is, always
} from "../js/misc.js";
import {
    Point2D
} from "../js/geometry.js";

describe("Physics", ()=> {

    before(()=> {
        document.body.innerHTML=
            '<div id="edit"></div>\n' +
            '<div tabindex="0" id="app"></div>';
        Context.canvas = new Canvas("#app", 1200, 600);
        Context.selection = new Selection();
    });

    function putTable() {
        let table = new SigmaTable(4000, 3000, "#A0A0A0");
        Context.canvas.putOnBase(table);
        return table;
    }

    function defineDraggableClass() {
        class TestDraggable extends SigmaElement {
            constructor(width, height) {
                super(width, height);
                this._initShape(new Rect(-width / 2, -height / 2, width, height).attrs({fill:"#00FF00"}));
                this._dragOperation(function() {return new DragMoveSelectionOperation()});
            }
        }
        makeShaped(TestDraggable);
        makeMovable(TestDraggable);
        makeSelectable(TestDraggable);
        makeDraggable(TestDraggable);
        return TestDraggable;
    }

    function defineContainerClass() {
        class TestContainer extends SigmaElement {
            constructor(width, height) {
                super(width, height);
                this._initShape(new Rect(-width / 2, -height / 2, width, height).attrs({fill:"#0F0F0F"}));
            }
        }
        makeShaped(TestContainer);
        makeSupport(TestContainer);
        return TestContainer;
    }

    function definePositioningContainerClass(DraggableClass, positionsBuilder) {
        let TestPositioningContainer = defineContainerClass();
        makePositioningContainer(TestPositioningContainer, {
            predicate: is(DraggableClass),
            positionsBuilder});
        return TestPositioningContainer;
    }

    function createContainer(ContainerClass, table, x, y, width=100, height=100) {
        let container = new ContainerClass(width, height);
        container.setLocation(new Point2D(x, y));
        table.addChild(container);
        return container;
    }

    function createElement(ElementClass, container, x, y, width=20, height=20) {
        let element = new ElementClass(width, height);
        element.setLocation(new Point2D(x, y));
        container.addChild(element);
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
        assert(element.lloc).sameTo(new Point2D(25, 25));
        dragSequence.on(container, -20, 20);
        assert(element.parent).equalsTo(container);
        assert(element.lloc).sameTo(new Point2D(-25, 25));
    });

    function defineCollisionContainerClass(DraggableClass, bordersCollide) {
        let TestCollisionContainer = defineContainerClass();
        makeCollisionContainerForElements(TestCollisionContainer, {
            predicate: is(DraggableClass),
            bordersCollide
        });
        return TestCollisionContainer;
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
        assert(movingElement.lloc).sameTo(new Point2D(-25, 25));
        dragSequence.hover(container, -15, 10);
        assert(movingElement.lloc).sameTo(new Point2D(-20, 10));
        dragSequence.on(container, -15, 0);
        assert(movingElement.parent).equalsTo(container);
        assert(movingElement.lloc).sameTo(new Point2D(-20, 0));
    });

    function createABorderedCollisionContainer() {
        let table = putTable();
        let DraggableClass = defineDraggableClass();
        let ContainerClass = defineCollisionContainerClass(DraggableClass, {all:true});
        let container = new ContainerClass(100, 100);
        table.addChild(container);
        container.setLocation(new Point2D(0, 0));
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
        assert(movingElement.lloc).sameTo(new Point2D(-80, 40));
        // Collision from "outside" : no collision detected
        dragSequence.hover(container, -55, 40);
        assert(movingElement.lloc).sameTo(new Point2D(-55, 40));
        // Collision form "inside"
        // East
        dragSequence.hover(container, -40, 30).hover(container, -45, 30);
        assert(movingElement.lloc).sameTo(new Point2D(-40, 30));
        // West
        dragSequence.hover(container, 40, 30).hover(container, 45, 30);
        assert(movingElement.lloc).sameTo(new Point2D(40, 30));
        // North
        dragSequence.hover(container, 30, 40).hover(container, 30, -45);
        assert(movingElement.lloc).sameTo(new Point2D(30, -40));
        // South
        dragSequence.hover(container, 30, 40).hover(container, 30, 45);
        assert(movingElement.lloc).sameTo(new Point2D(30, 40));
        // Drop when collided
        dragSequence.on(container, -45, 40);
        assert(movingElement.parent).equalsTo(container);
        assert(movingElement.lloc).sameTo(new Point2D(-40, 40));
    });

    function crossBorder(table, container, movingElement) {
        let dragSequence = drag(movingElement).from(-100, -100);
        // No collision at all
        dragSequence.hover(container, -55, 5);
        assert(Context.canvas.getHoveredElements(table).contains(movingElement)).isTrue();
        assert(movingElement.lloc).sameTo(new Point2D(-55, 5));
        // Collision from "outside" : no collision detected
        dragSequence.hover(container, -41, 5);
        assert(Context.canvas.getHoveredElements(container).contains(movingElement)).isTrue();
        assert(movingElement.lloc).sameTo(new Point2D(-55, 5));
        dragSequence.hover(container, -40, 5);
        assert(Context.canvas.getHoveredElements(container).contains(movingElement)).isTrue();
        assert(movingElement.lloc).sameTo(new Point2D(-40, 5));
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
        assert(element1.lloc).sameTo(new Point2D(0, 0));
        assert(container.containsChild(element1)).isTrue();
        Context.memento.undo();
        executeTimeouts();
        assert(element1.lloc).sameTo(new Point2D(-100, -50));
        assert(table.containsChild(element1)).isTrue();
        Context.memento.redo();
        executeTimeouts();
        assert(element1.lloc).sameTo(new Point2D(0, 0));
        assert(container.containsChild(element1)).isTrue();
        // Drag another element : the first element must hinder the move ot this incoming element
        drag(element2).from(-100, 50).through(-60, 60).on(container, -15, 10);
        assert(element2.lloc).sameTo(new Point2D(-20, 10));
        executeTimeouts();
    });

    function defineGravitationContainerClass(DraggableClass, carryingPredicate, bordersCollide) {
        let TestGraviationContainer = defineContainerClass();
        makeGravitationContainerForElements(TestGraviationContainer, {
            predicate: is(DraggableClass),
            gravitationPredicate: always,
            carryingPredicate, bordersCollide
        });
        return TestGraviationContainer;
    }

    function copyAContainerWithCollisionPhysic() {
        let {table, container, DraggableClass, ContainerClass} = createABorderedCollisionContainer();
        makeSelectable(ContainerClass);
        container.setLocation(new Point2D(200, 0));
        Context.selection.selectOnly(container);
        let element = createElement(DraggableClass, container, 0, 0);
        executeTimeouts();
        Context.copyPaste.copyModel(Context.selection.selection());
        Context.copyPaste.pasteModel();
        executeTimeouts();
        let containerCopy = findChild(table, 0, 0);
        let elementCopy = findChild(containerCopy, 0, 0);
        assert(container).notEqualsTo(containerCopy);
        assert(element).notEqualsTo(elementCopy);
        return {table, ContainerClass, DraggableClass, containerCopy, elementCopy};
    }

    it("Copy/Paste a collision physic", ()=>{
        let {ContainerClass, DraggableClass, containerCopy, elementCopy} = copyAContainerWithCollisionPhysic();
        assert(containerCopy).isDefined();
        assert(elementCopy).isDefined();
        assert(containerCopy instanceof ContainerClass).isTrue();
        assert(elementCopy instanceof DraggableClass).isTrue();
    });

    it("Drops an element in a copied collision physic", ()=>{
        let {table, DraggableClass, containerCopy} = copyAContainerWithCollisionPhysic();
        assert(containerCopy).isDefined();
        let movingElement = createElement(DraggableClass, table, 0, 100);
        drag(movingElement).from(0, 100).hover(containerCopy, -25, 25).on(containerCopy, -15, 0);
        assert(movingElement.parent).equalsTo(containerCopy);
        // New element does not overlap with copied element
        assert(movingElement.lloc).sameTo(new Point2D(-20, 0))
    });

    it("Crosses the border of a copied collision physic", ()=>{
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
        assert(movingElement.lloc).sameTo(new Point2D(0, 40));
    });

    function defineStickingGravitationContainerClass(DraggableClass, gluingStrategy, bordersCollide) {
        let TestStickingGraviationContainer = defineContainerClass(gluingStrategy);
        makeStickyGravitationContainerForElements(TestStickingGraviationContainer, {
            predicate: is(DraggableClass),
            gravitationPredicate: always,
            gluingStrategy, bordersCollide});
        return TestStickingGraviationContainer;
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
        assert(movingElement1.lloc).sameTo(new Point2D(0, 40));
        assert(movingElement2.lloc).sameTo(new Point2D(0, 20));
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
        assert(movingElement1.lloc).sameTo(new Point2D(-25, 40));
        assert(movingElement2.lloc).sameTo(new Point2D(25, 40));
    });

    it("Lets fall two elements on a bigger one in order to ensure that elements are rightly sorted in the Ground object", ()=>{
        let table = putTable();
        let DraggableClass = defineDraggableClass();
        let ContainerClass = defineGravitationContainerClass(DraggableClass);
        let container = createContainer(ContainerClass, table, 100, 0);
        let bigElement = createElement(DraggableClass, table, 0, 130, 80, 20);
        let movingElement1 = createElement(DraggableClass, table, -25, 70);
        let movingElement2 = createElement(DraggableClass, table, 25, 100);
        Context.selection.selectOnly(bigElement, movingElement1, movingElement2);
        let dragSequence = drag(movingElement1).from(0, 100).hover(container, -25, 25).on(container, 0, 0);
        executeTimeouts();
        // The elements are bithat the bottom of the container
        assert(movingElement1.lloc).sameTo(new Point2D(-25, 20));
        assert(movingElement2.lloc).sameTo(new Point2D(25, 20));
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
        assert(movingElement.lloc).sameTo(new Point2D(0, 40));
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
        assert(movingElement1.lloc).sameTo(new Point2D(0, 40));
        assert(movingElement2.lloc).sameTo(new Point2D(0, 20));
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
        assert(movingElement1.lloc).sameTo(new Point2D(-25, 40));
        assert(movingElement2.lloc).sameTo(new Point2D(25, 40));
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
    function moveAndFallElementsOnContainer(xe1, ye1, xe2, ye2, xe3, ye3) {
        let table = putTable();
        let DraggableClass = defineDraggableClass();
        makeCarrier(DraggableClass);
        makeCarriable(DraggableClass);
        let ContainerClass = defineGravitationContainerClass(DraggableClass);
        let container = createContainer(ContainerClass, table, 100, 0);
        let movingElement1 = createElement(DraggableClass, table, xe1, ye1);
        let movingElement2 = createElement(DraggableClass, table, xe2, ye2);
        let movingElement3 = createElement(DraggableClass, table, xe3, ye3);
        Context.selection.selectOnly(movingElement1, movingElement2, movingElement3);
        drag(movingElement1).from(0, 100).hover(container, -25, 25).on(container, 0, 10);
        executeTimeouts();
        return {table, container, movingElement1, movingElement2, movingElement3}
    }

    it("Links elements by a carried/carried By relationship (one carries many)", ()=>{
        let {movingElement1, movingElement2, movingElement3} = moveAndFallElementsOnContainer(0, 100, 10, 75, -10, 60);
        // The elements are stacked
        assert(movingElement1.lloc).sameTo(new Point2D(0, 40));
        assert(movingElement2.lloc).sameTo(new Point2D(10, 20));
        assert(movingElement3.lloc).sameTo(new Point2D(-10, 20));
        assert([...movingElement1.carried]).unorderedEqualsTo([movingElement2, movingElement3]);
        assert([...movingElement2.carriers]).arrayEqualsTo([movingElement1]);
        assert([...movingElement3.carriers]).arrayEqualsTo([movingElement1]);
    });

    it("Links elements by a carried/carried By relationship (one is carried by many)", ()=>{
        let {movingElement1, movingElement2, movingElement3} = moveAndFallElementsOnContainer(0, 100, 10, 115, -10, 120);
        // The elements are stacked
        assert(movingElement1.lloc).sameTo(new Point2D(0, 20));
        assert(movingElement2.lloc).sameTo(new Point2D(10, 40));
        assert(movingElement3.lloc).sameTo(new Point2D(-10, 40));
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
        assert(movingElement1.lloc).sameTo(new Point2D(0, 40));
        assert(movingElement2.lloc).sameTo(new Point2D(10, 20));
        assert([...movingElement1.carried]).arrayEqualsTo([movingElement2]);
        assert([...movingElement2.carriers]).arrayEqualsTo([movingElement1]);
    });

    it("Drags an element that carries many", ()=>{
        let {table, container, movingElement1, movingElement2, movingElement3} =
            moveAndFallElementsOnContainer(0, 100, 10, 75, -10, 60);
        // Element1 carries element2 and element3
        Context.selection.selectOnly(movingElement1);
        drag(movingElement1).at(movingElement1, 0, 0).to(0, 100);
        // All elements on new position (relative position are unchanged)
        assert(movingElement1.lloc).sameTo(new Point2D(0, 100));
        assert(movingElement2.lloc).sameTo(new Point2D(10, 80));
        assert(movingElement3.lloc).sameTo(new Point2D(-10, 80));
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

    it("Shows that carrier/carried relationship is transitive", ()=>{
        let {table, movingElement1, movingElement3} =
            moveAndFallElementsOnContainer(0, 100, 0, 75, 0, 50);
        // Element1 carries element2 and element3
        Context.selection.selectOnly(movingElement1);
        drag(movingElement1).at(movingElement1, 0, 0).to(0, 100);
        // Third element had moved too
        assert(movingElement3.lloc).sameTo(new Point2D(0, 60));
        assert(movingElement3.parent).equalsTo(table);
    });

    it("Breaks a carried/carried by relationship", ()=>{
        let {table, container, movingElement1, movingElement2, movingElement3} =
            moveAndFallElementsOnContainer(0, 100, 10, 115, -10, 120);
        // Element1 carries element2 and element3
        Context.selection.selectOnly(movingElement1);
        drag(movingElement2).at(movingElement2, 0, 0).to(0, 100);
        // Carrier and carried are moved
        assert(movingElement2.lloc).sameTo(new Point2D(0, 100));
        assert(movingElement1.lloc).sameTo(new Point2D(-10, 80));
        assert(movingElement1.parent).equalsTo(table);
        assert(movingElement2.parent).equalsTo(table);
        // But not carried is not !
        assert(movingElement3.lloc).sameTo(new Point2D(-10, 40));
        assert(movingElement3.parent).equalsTo(container);
        // So container still contain one element
        assert(container.children).arrayEqualsTo([movingElement3]);
        // But carried/carried by relationship is unchanged
        assert([...movingElement1.carriers]).arrayEqualsTo([movingElement2]);
        assert([...movingElement2.carried]).arrayEqualsTo([movingElement1]);
        assert([...movingElement3.carried]).arrayEqualsTo([]);
    });

    it("Lets fall glued elements", ()=>{
        let table = putTable();
        let DraggableClass = defineDraggableClass();
        makeGlueable(DraggableClass);
        let ContainerClass = defineStickingGravitationContainerClass(DraggableClass);
        let container = createContainer(ContainerClass, table, 100, 0);
        let mainElement = createElement(DraggableClass, table, 0, 100, 20, 20);
        let stickedElement = createElement(DraggableClass, table, 15, 100, 10, 10);
        mainElement.glue(stickedElement);
        drag(mainElement).from(0, 100).hover(container, -25, 25).on(container, 0, 0);
        executeTimeouts();
        assert(mainElement.lloc).sameTo(new Point2D(0, 40));
        assert(stickedElement.lloc).sameTo(new Point2D(15, 40));
    });

    it("Lets fall glued element on another element", ()=>{
        let table = putTable();
        let DraggableClass = defineDraggableClass();
        makeGlueable(DraggableClass);
        let ContainerClass = defineStickingGravitationContainerClass(DraggableClass);
        let container = createContainer(ContainerClass, table, 100, 0);
        let mainElement = createElement(DraggableClass, table, 0, 100, 20, 20);
        let stickedElement = createElement(DraggableClass, table, 15, 100, 10, 10);
        createElement(DraggableClass, container, 15, 30, 20, 20);
        mainElement.glue(stickedElement);
        drag(mainElement).from(0, 100).hover(container, -25, 25).on(container, -10, -25);
        executeTimeouts();
        assert(mainElement.lloc).sameTo(new Point2D(-10, 25));
        assert(stickedElement.lloc).sameTo(new Point2D(5, 25));
    });

    it("Lets fall carrier/carriable and stickable elements", ()=>{
        let table = putTable();
        let DraggableClass = defineDraggableClass();
        makeGlueable(DraggableClass);
        makeCarrier(DraggableClass);
        makeCarriable(DraggableClass);
        let ContainerClass = defineStickingGravitationContainerClass(DraggableClass);
        let container = createContainer(ContainerClass, table, 100, 0);
        let mainElement = createElement(DraggableClass, table, 0, 100, 20, 20);
        let stickedElement = createElement(DraggableClass, table, 15, 100, 10, 10);
        let thirdBlockElement = createElement(DraggableClass, table, 0, 80, 10, 10);
        Context.selection.selectOnly(mainElement, thirdBlockElement);
        createElement(DraggableClass, container, 15, 30, 20, 20);
        mainElement.glue(stickedElement);
        drag(mainElement).from(0, 100).hover(container, -25, 25).on(container, -10, -25);
        executeTimeouts();
        assert(thirdBlockElement.lloc).sameTo(new Point2D(-10, 10));
        assert([...thirdBlockElement.carriers]).arrayEqualsTo([mainElement]);
        assert([...mainElement.carried]).arrayEqualsTo([thirdBlockElement]);
    });

    function createAGravitationContainer() {
        let table = putTable();
        let DraggableClass = defineDraggableClass();
        makeCarriable(DraggableClass);
        makeCarrier(DraggableClass);
        let ContainerClass = defineGravitationContainerClass(DraggableClass);
        let container = new ContainerClass(100, 100);
        table.addChild(container);
        container.setLocation(new Point2D(0, 0));
        executeTimeouts();
        return {table, container, DraggableClass, ContainerClass};
    }

    function copyAContainerWithGravitationPhysic() {
        let {table, container, DraggableClass, ContainerClass} = createAGravitationContainer();
        makeSelectable(ContainerClass);
        container.setLocation(new Point2D(200, 0));
        Context.selection.selectOnly(container);
        let topElement = createElement(DraggableClass, container, 0, -15);
        let bottomElement = createElement(DraggableClass, container, 0, 15);
        executeTimeouts();
        Context.copyPaste.copyModel(Context.selection.selection());
        Context.copyPaste.pasteModel();
        executeTimeouts();
        let containerCopy = findChild(table, 0, 0);
        let topElementCopy = findChild(containerCopy, 0, 20);
        let bottomElementCopy = findChild(containerCopy, 0, 40);
        assert(container).notEqualsTo(containerCopy);
        assert(topElement).notEqualsTo(topElementCopy);
        assert(bottomElement).notEqualsTo(bottomElementCopy);
        return {table, ContainerClass, DraggableClass, containerCopy, topElementCopy, bottomElementCopy};
    }

    it("Copy/Paste a gravitation physic", ()=>{
        let {ContainerClass, DraggableClass, containerCopy, topElementCopy, bottomElementCopy}
            = copyAContainerWithGravitationPhysic();
        assert(containerCopy).isDefined();
        assert(topElementCopy).isDefined();
        assert(bottomElementCopy).isDefined();
        assert(containerCopy instanceof ContainerClass).isTrue();
        assert(topElementCopy instanceof DraggableClass).isTrue();
        assert(bottomElementCopy instanceof DraggableClass).isTrue();
        assert([...bottomElementCopy.carried]).arrayEqualsTo([topElementCopy]);
        assert([...topElementCopy.carriers]).arrayEqualsTo([bottomElementCopy]);
    });

    function createAStickingGravitationContainer(strategy) {
        let table = putTable();
        let DraggableClass = defineDraggableClass();
        makeGlueable(DraggableClass);
        let ContainerClass = defineStickingGravitationContainerClass(DraggableClass, strategy);
        let container = new ContainerClass(100, 100);
        table.addChild(container);
        container.setLocation(new Point2D(0, 0));
        executeTimeouts();
        return {table, container, DraggableClass, ContainerClass};
    }

    function createAStickyContainerWithABlockInside(strategy) {
        let {table, container, DraggableClass, ContainerClass} = createAStickingGravitationContainer(strategy);
        makeSelectable(ContainerClass);
        container.setLocation(new Point2D(200, 0));
        Context.selection.selectOnly(container);
        let mainElement = createElement(DraggableClass, container, 0, 0, 20, 20);
        let secondaryElement = createElement(DraggableClass, container, 15, 0, 10, 10);
        mainElement.glue(secondaryElement, strategy);
        executeTimeouts();
        return {table, ContainerClass, DraggableClass, container, mainElement, secondaryElement};
    }

    function copyAContainerWithStickingGravitationPhysic() {
        let {table, ContainerClass, DraggableClass, container, mainElement, secondaryElement} =
            createAStickyContainerWithABlockInside();
        Context.copyPaste.copyModel(Context.selection.selection());
        Context.copyPaste.pasteModel();
        executeTimeouts();
        let containerCopy = findChild(table, 0, 0);
        let mainElementCopy = findChild(containerCopy, 0, 40);
        let secondaryElementCopy = findChild(containerCopy, 15, 40);
        assert(container).notEqualsTo(containerCopy);
        assert(mainElement).notEqualsTo(mainElementCopy);
        assert(secondaryElement).notEqualsTo(secondaryElementCopy);
        return {table, ContainerClass, DraggableClass, containerCopy, mainElementCopy, secondaryElementCopy};
    }

    it("Copy/Paste a sticking gravitation physic", ()=>{
        let {ContainerClass, DraggableClass, containerCopy, mainElementCopy, secondaryElementCopy}
            = copyAContainerWithStickingGravitationPhysic();
        assert(containerCopy).isDefined();
        assert(mainElementCopy).isDefined();
        assert(secondaryElementCopy).isDefined();
        assert(containerCopy instanceof ContainerClass).isTrue();
        assert(mainElementCopy instanceof DraggableClass).isTrue();
        assert(secondaryElementCopy instanceof DraggableClass).isTrue();
        assert([...mainElementCopy.gluedWith]).arrayEqualsTo([secondaryElementCopy]);
        assert([...secondaryElementCopy.gluedWith]).arrayEqualsTo([mainElementCopy]);
    });

    it("Undo and redo ops that break (then re-establish) carried/carried relationships", ()=>{
        Context.memento.opened = true;
        let {movingElement1, movingElement2, movingElement3} = moveAndFallElementsOnContainer(0, 100, 10, 115, -10, 120);
        // Element1 carries element2 and element3
        Context.selection.selectOnly(movingElement1);
        drag(movingElement2).at(movingElement2, 0, 0).to(0, 100);
        Context.memento.undo();
        assert([...movingElement1.carriers]).unorderedEqualsTo([movingElement2, movingElement3]);
        assert([...movingElement2.carried]).arrayEqualsTo([movingElement1]);
        assert([...movingElement3.carried]).arrayEqualsTo([movingElement1]);
        Context.memento.redo();
        assert([...movingElement1.carriers]).arrayEqualsTo([movingElement2]);
        assert([...movingElement2.carried]).arrayEqualsTo([movingElement1]);
        assert([...movingElement3.carried]).arrayEqualsTo([]);
    });

    it("Does not link elements by a carried/carried relationship if 'acceptCarried' predicate returns false", ()=>{
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
        assert(movingElement1.lloc).sameTo(new Point2D(0, 40));
        assert(movingElement2.lloc).sameTo(new Point2D(10, 20));
        assert([...movingElement1.carried]).arrayEqualsTo([movingElement2]);
        assert([...movingElement2.carriers]).arrayEqualsTo([movingElement1]);
    });

    it("breaks carriers/carried relationship of dropped elements if they not fall on each other.", ()=>{
        let table = putTable();
        let DraggableClass = defineDraggableClass();
        makeCarrier(DraggableClass);
        makeCarriable(DraggableClass);
        // A carrier must be bigger than a carried element
        let ContainerClass = defineGravitationContainerClass(DraggableClass,
            (d1, d2)=>d1.width>d2.width&&d1.height>d2.height);
        let container = createContainer(ContainerClass, table, 100, 0);
        let staticElement1 = createElement(DraggableClass, container, -20, 40, 20, 20);
        let staticElement2 = createElement(DraggableClass, container, 20, 45, 10, 10);
        let movingElement1 = createElement(DraggableClass, table, 0, 100, 10, 10);
        let movingElement2 = createElement(DraggableClass, table, 40, 100, 20, 20);
        Context.selection.selectOnly(movingElement1, movingElement2);
        let dragOperation = drag(movingElement1).from(0, 100).hover(container, 0, 0).on(container, -20, 0);
        executeTimeouts();
        assert([...movingElement1.carriers]).arrayEqualsTo([staticElement1]);
        assert([...staticElement1.carried]).arrayEqualsTo([movingElement1]);
        assert([...movingElement2.carriers]).arrayEqualsTo([]);
        assert([...staticElement2.carried]).arrayEqualsTo([]);
    });

    function defineStickingGravitationContainerClassWithStickingOnDrop(DraggableClass) {
        let StickingPhysicClass = createStickyGravitationPhysicForElements({
            predicate:is(DraggableClass)
        });
        makeDroppedElementsToGlue(StickingPhysicClass);
        let ContainerClass = defineContainerClass(DraggableClass);
        addPhysicToContainer(ContainerClass, {
            physicBuilder: function () {
                return new StickingPhysicClass(this);
            }
        });
        return {ContainerClass};
    }

    it("Sticks an element to another one by drag and drop", ()=>{
        let table = putTable();
        let DraggableClass = defineDraggableClass();
        makeGlueable(DraggableClass);
        let {ContainerClass} = defineStickingGravitationContainerClassWithStickingOnDrop(DraggableClass);
        let container = createContainer(ContainerClass, table, 100, 0);
        let staticElement = createElement(DraggableClass, container, 0, 40, 20, 20);
        let movingElement = createElement(DraggableClass, table, 0, 100, 10, 10);
        Context.selection.selectOnly(movingElement);
        drag(movingElement).from(0, 100).hover(container, -25, 40).on(container, 15, 40);
        executeTimeouts();
        assert([...movingElement.gluedWith]).arrayEqualsTo([staticElement]);
        assert([...staticElement.gluedWith]).arrayEqualsTo([movingElement]);
    });

    function createTwoBlocksWichCollide() {
        let table = putTable();
        let DraggableClass = defineDraggableClass();
        makeGlueable(DraggableClass);
        makeCarrier(DraggableClass);
        makeCarriable(DraggableClass);
        let ContainerClass = defineStickingGravitationContainerClass(DraggableClass);
        let container = createContainer(ContainerClass, table, 100, 0, 150, 150);
        createElement(DraggableClass, container, 15, 30, 20, 20);
        let mainElement = createElement(DraggableClass, table, 0, 100, 20, 20);
        let stickedElement = createElement(DraggableClass, table, 15, 100, 10, 10);
        let otherBlockElement = createElement(DraggableClass, table, 0, 80, 10, 10);
        mainElement.glue(stickedElement);
        return {DraggableClass, table, container, mainElement, stickedElement, otherBlockElement}
    }

    it("Lets fall a block on an element stopped by another block", ()=>{
        let {container, mainElement, otherBlockElement} = createTwoBlocksWichCollide();
        Context.selection.selectOnly(mainElement, otherBlockElement);
        drag(mainElement).from(0, 100).hover(container, -25, 25).on(container, -10, 0);
        executeTimeouts();
        assert(otherBlockElement.lloc).sameTo(new Point2D(-10, 35));
        assert([...otherBlockElement.carriers]).arrayEqualsTo([mainElement]);
        assert([...mainElement.carried]).arrayEqualsTo([otherBlockElement]);
    });

    it("Ascent an element that just touches a higher element", ()=>{
        let {DraggableClass, table, container, mainElement, otherBlockElement} = createTwoBlocksWichCollide();
        let fourthBlockElement = createElement(DraggableClass, table, -20, 80, 10, 45);
        let fifthBlockElement = createElement(DraggableClass, table, 0, 50, 50, 10);
        Context.selection.selectOnly(mainElement, otherBlockElement, fourthBlockElement, fifthBlockElement);
        drag(mainElement).from(0, 100).hover(container, -25, 25).on(container, -10, 0);
        executeTimeouts();
        assert(fifthBlockElement.lloc).sameTo(new Point2D(-10, 25));
        assert([...fifthBlockElement.carriers]).unorderedEqualsTo([fourthBlockElement, otherBlockElement]);
        assert([...otherBlockElement.carried]).arrayEqualsTo([fifthBlockElement]);
    });

    it("Ascent an element that raises a higher element", ()=>{
        let {DraggableClass, table, container, mainElement, otherBlockElement} = createTwoBlocksWichCollide();
        let fourthBlockElement = createElement(DraggableClass, table, -20, 80, 10, 40);
        let fifthBlockElement = createElement(DraggableClass, table, 0, 50, 50, 10);
        Context.selection.selectOnly(mainElement, otherBlockElement, fourthBlockElement, fifthBlockElement);
        drag(mainElement).from(0, 100).hover(container, -25, 25).on(container, -10, 0);
        executeTimeouts();
        assert([...fifthBlockElement.carriers]).unorderedEqualsTo([otherBlockElement]);
        assert([...otherBlockElement.carried]).arrayEqualsTo([fifthBlockElement]);
    });

    it("Ascent an element that raises a higher block", ()=>{
        let {DraggableClass, table, container, mainElement, otherBlockElement} = createTwoBlocksWichCollide();
        let fourthBlockElement = createElement(DraggableClass, table, -20, 80, 10, 40);
        let fifthBlockElement = createElement(DraggableClass, table, 0, 55, 50, 10);
        fourthBlockElement.glue(fifthBlockElement);
        Context.selection.selectOnly(mainElement, otherBlockElement, fourthBlockElement);
        drag(mainElement).from(0, 100).hover(container, -25, 25).on(container, -10, 0);
        executeTimeouts();
        assert(fourthBlockElement.lloc).sameTo(new Point2D(-30, 50));
    });

    it("Keeps a glue on drag if gluing strategy is EXTEND.", ()=>{
        let {table, mainElement, secondaryElement} =
            createAStickyContainerWithABlockInside((element1, element2, x, y)=>{
                if (element1.width*element1.height<element2.width*element2.height) return Glue.BREAK;
                return Glue.EXTEND;
            });
        drag(mainElement).at(mainElement, 0, 0).on(table, 0, 100);
        assert([...mainElement.gluedWith]).arrayEqualsTo([secondaryElement]);
        assert(secondaryElement.parent).equalsTo(table);
        assert(secondaryElement.lloc).sameTo(new Point2D(15, 100));
        assert([...secondaryElement.gluedWith]).arrayEqualsTo([mainElement]);
    });

    it("Breaks a glue on drag if gluing strategy is BREAK.", ()=>{
        let {table, container, mainElement, secondaryElement} =
            createAStickyContainerWithABlockInside((element1, element2, x, y)=>{
                if (element1.width*element1.height<element2.width*element2.height) return Glue.BREAK;
                return Glue.EXTEND;
            });
        drag(secondaryElement).at(secondaryElement, 0, 0).on(table, 0, 100);
        assert([...mainElement.gluedWith]).arrayEqualsTo([]);
        assert(mainElement.parent).equalsTo(container);
        assert(mainElement.lloc).sameTo(new Point2D(0, 40));
        assert([...secondaryElement.gluedWith]).arrayEqualsTo([]);
    });

    it("Shows that gluing is transitive regarding drag extension.", ()=>{
        let strategy = (element1, element2, x, y)=>{
            if (element1.width*element1.height<element2.width*element2.height) return Glue.BREAK;
            return Glue.EXTEND;
        };
        let {table, ContainerClass, DraggableClass, container, mainElement, secondaryElement} =
            createAStickyContainerWithABlockInside(strategy);
        let thirdElement = createElement(DraggableClass, container, 25, 40, 10, 10);
        secondaryElement.glue(thirdElement, strategy);
        drag(mainElement).at(mainElement, 0, 0).on(table, 0, 100);
        assert([...thirdElement.gluedWith]).arrayEqualsTo([secondaryElement]);
        assert(thirdElement.parent).equalsTo(table);
        assert(thirdElement.lloc).sameTo(new Point2D(25, 100));
        assert([...secondaryElement.gluedWith]).unorderedEqualsTo([mainElement, thirdElement]);
    });

});