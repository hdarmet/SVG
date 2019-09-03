'use strict';

import {
    describe, it, before, assert, clickOn, drag, Snapshot, keyboard, executeTimeouts
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
    makePositionningContainer, makeCollisionContainer
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

    function definePositionningContainerClass(DraggableClass, strategy) {
        class BoardPositionningContainer extends BoardElement {
            constructor(width, height) {
                super(width, height);
                this._initShape(new Rect(-width / 2, -height / 2, width, height).attrs({fill:"#0F0F0F"}));
            }
        }
        makeShaped(BoardPositionningContainer);
        makeSupport(BoardPositionningContainer);
        makePositionningContainer(BoardPositionningContainer, element=>element instanceof DraggableClass, strategy);
        return BoardPositionningContainer;
    }

    it("Uses a positionning physics", ()=>{
        let table = putTable();
        let DraggableClass = defineDraggableClass();
        let ContainerClass = definePositionningContainerClass(DraggableClass, function(element) {
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
        class BoardCollisionContainer extends BoardElement {
            constructor(width, height) {
                super(width, height);
                this._initShape(new Rect(-width / 2, -height / 2, width, height).attrs({fill:"#0F0F0F"}));
            }
        }
        makeShaped(BoardCollisionContainer);
        makeSupport(BoardCollisionContainer);
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

    it("Puts borders on collision physics", ()=>{
        let table = putTable();
        let DraggableClass = defineDraggableClass();
        let ContainerClass = defineCollisionContainerClass(DraggableClass, {all:true});
        let container = new ContainerClass(100, 100);
        container.setLocation(0, 0);
        let movingElement = new DraggableClass(20, 20);
        table.add(container);
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

    it("Cross a border on a collision physics", ()=>{
        let table = putTable();
        let DraggableClass = defineDraggableClass();
        let ContainerClass = defineCollisionContainerClass(DraggableClass, {all:true});
        let container = new ContainerClass(100, 100);
        container.setLocation(0, 0);
        let movingElement = new DraggableClass(20, 20);
        table.add(container);
        movingElement.setLocation(-100, -100);
        table.add(movingElement);
        executeTimeouts();
        let dragSequence = drag(movingElement).from(-100, -100);
        // No collision at all
        dragSequence.hover(container, -55, 5);
        assert(Context.canvas.getHoveredElements(table).contains(movingElement)).equalsTo(true);
        assert(movingElement.location).sameTo({x:-55, y:5});
        // Collision from "outside" : no collision detected
        dragSequence.hover(container, -41, 5);
        assert(Context.canvas.getHoveredElements(container).contains(movingElement)).equalsTo(true);
        assert(movingElement.location).sameTo({x:-55, y:5});
        dragSequence.hover(container, -40, 5);
        assert(Context.canvas.getHoveredElements(container).contains(movingElement)).equalsTo(true);
        assert(movingElement.location).sameTo({x:-40, y:5});
    });

});