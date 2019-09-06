'use strict';

import {
    describe, it, before, assert, clickOn, drag, Snapshot, keyboard, findChild
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
    allowElementDeletion
} from "../js/tools.js";

describe("App fundamentals", ()=> {

    before(()=> {
        document.body.innerHTML=
            '<div id="edit"></div>\n' +
            '<div tabindex="0" id="app"></div>';
        Context.selection = new Selection();
        Context.canvas = new Canvas("#app", 1200, 600);
        setRef(Context.canvas, 'app-canvas');
        setRef(Context.canvas.baseLayer, 'app-base-layer');
        setRef(Context.canvas.toolsLayer, 'app-tool-layer');
        setRef(Context.canvas.glassLayer, 'app-glass-layer');
        setRef(Context.canvas.modalsLayer, 'app-modal-layer');
    });

    it("Creates a minimal app", ()=>{
        assert(html(Context.canvas.baseLayer))
            .equalsTo("<g id=\"app-base-layer\"></g>");
        assert(html(Context.canvas.toolsLayer))
            .equalsTo("<g id=\"app-tool-layer\"></g>");
        assert(html(Context.canvas.glassLayer))
            .equalsTo("<g id=\"app-glass-layer\"><g></g></g>");
        assert(html(Context.canvas.modalsLayer))
            .equalsTo("<g id=\"app-modal-layer\"><rect x=\"-600\" y=\"-300\" width=\"1200\" height=\"600\" fill=\"#0F0F0F\" opacity=\"0.5\" visibility=\"hidden\"></rect></g>");
        assert(html(Context.canvas))
            .equalsTo(
                '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="600" id="app-canvas">' +
                    '<defs>' +
                        '<filter id="_shadow_" filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse">' +
                            '<feDropShadow stdDeviation="3 3" in="SourceGraphic" dx="0" dy="0" flood-color="#0F0F0F" flood-opacity="1">' +
                            '</feDropShadow>' +
                        '</filter>' +
                    '</defs>' +
                    '<g transform="matrix(1 0 0 1 600 300)">' +
                        html(Context.canvas.baseLayer)+
                        html(Context.canvas.toolsLayer)+
                        html(Context.canvas.glassLayer)+
                        html(Context.canvas.modalsLayer)+
                    '</g>' +
                '</svg>');
    });

    function putTable() {
        let table = new BoardTable(4000, 3000, "#A0A0A0");
        setRef(table, "app-table")
        Context.canvas.putOnBase(table);
        return table;
    }

    it("Set a table on the board", ()=>{
        // Yest, table is ALWAYS (much) bigger than canvas area.
        let table = putTable();
        assert(html(table))
            .equalsTo('<g transform="matrix(1 0 0 1 0 0)" id="app-table"><g><g><rect x="-2000" y="-1500" width="4000" height="3000" fill="#A0A0A0"></rect></g><g></g></g></g>');
        assert(html(Context.canvas.baseLayer))
            .equalsTo(
                '<g id="app-base-layer" transform="matrix(1 0 0 1 0 0)">'+
                    html(table)+
                '</g>');
    });

    function defineTinyClass() {
        class BoardTiny extends BoardElement {
            constructor(width, height) {
                super(width, height);
                this._initShape(new Rect(-width / 2, -height / 2, width, height));
            }
        }
        makeShaped(BoardTiny);
        return BoardTiny;
    }

    it("Add a simple element on the board", ()=>{
        let BoardTiny = defineTinyClass();
        let table = putTable();
        let tiny = new BoardTiny(30, 20);
        setRef(tiny, "tiny");
        table.add(tiny);
        assert(html(tiny))
            .equalsTo('<g transform="matrix(1 0 0 1 0 0)" id="tiny"><g><g><rect x="-15" y="-10" width="30" height="20"></rect></g></g></g>');
        assert(html(table))
            .equalsTo(
                '<g transform="matrix(1 0 0 1 0 0)" id="app-table">' +
                    '<g>' +
                        '<g><rect x="-2000" y="-1500" width="4000" height="3000" fill="#A0A0A0"></rect></g>' +
                        '<g>' +
                         html(tiny)+
                        '</g>' +
                    '</g>' +
                '</g>');
    });

    it("Clicks on a simple element of the board", ()=>{
        let BoardTiny = defineTinyClass();
        makeClickable(BoardTiny);
        let table = putTable();
        let tiny = new BoardTiny(30, 20);
        let clicked = false;
        tiny.clickHandler = function() {return event=>clicked = true;};
        table.add(tiny);
        clickOn(tiny);
        assert(clicked).equalsTo(true);
    });

    function defineDraggableTinyClass() {
        let BoardTiny = defineTinyClass();
        // Yes. We need all these 3 traits...
        makeMoveable(BoardTiny);
        makeSelectable(BoardTiny);
        makeDraggable(BoardTiny);
        return BoardTiny;
    }

    function createATableWithOneElement() {
        let BoardTiny = defineDraggableTinyClass();
        let table = putTable();
        let tiny = new BoardTiny(30, 20);
        table.add(tiny);
        return {BoardTiny, table, tiny};
    }

    it("Drags and drops a simple element of the board", ()=>{
        let {tiny} = createATableWithOneElement();
        tiny.dragOperation = function() {return new DragMoveSelectionOperation()};
        drag(tiny).from(0, 0).through(10, 10).to(20, 20);
        assert(tiny.location).sameTo({x:20, y:20});
    });

    function defineSimpleTargetClass() {
        class BoardSimpleTarget extends BoardElement {
            constructor(width, height) {
                super(width, height);
                let background = new Rect(-width / 2, -height / 2, width, height)
                    .attrs({fill:"#0A0A0A"});
                this._initShape(background);
            }
        }
        makeShaped(BoardSimpleTarget);
        // May be targeted by drop
        makeSupport(BoardSimpleTarget);
        return BoardSimpleTarget;
    }

    it("Drags and drops an element over another one on the board and check glass management", ()=>{
        let {tiny, table} = createATableWithOneElement();
        let BoardSimpleTarget = defineSimpleTargetClass();
        let target = new BoardSimpleTarget(60, 60);
        tiny.dragOperation = function() {return new DragMoveSelectionOperation()};
        table.add(target);
        target.setLocation(100, 50);
        let dragSequence = drag(tiny).from(0, 0);
        // Start only. Nothing on glass
        assert(Context.canvas.getHoveredElements(table).contains(tiny)).isFalse();
        // First move : move on table.
        dragSequence.through(10, 10);
        assert(Context.canvas.getHoveredElements(table).contains(tiny)).isTrue();
        // Move on target
        dragSequence.hover(target, 10, 10);
        assert(Context.canvas.getHoveredElements(table).contains(tiny)).isFalse();
        assert(Context.canvas.getHoveredElements(target).contains(tiny)).isTrue();
        assert(tiny.location).sameTo({x:10, y:10});
        assert(tiny.position).sameTo({x:600+100+10, y:300+50+10});
        // On table again
        dragSequence.through(20, 20);
        assert(Context.canvas.getHoveredElements(table).contains(tiny)).isTrue();
        assert(Context.canvas.getHoveredElements(target).contains(tiny)).isFalse();
        // Drop on table
        dragSequence.to(20, 20);
        assert(Context.canvas.getHoveredElements(table).contains(tiny)).isFalse();
        assert(tiny.location).sameTo({x:20, y:20});
    });

    it("Drops successfully on a target", ()=>{
        let {tiny, table} = createATableWithOneElement();
        let BoardSimpleTarget = defineSimpleTargetClass();
        let target = new BoardSimpleTarget(60, 60);
        tiny.dragOperation = function() {return new DragMoveSelectionOperation()};
        table.add(target);
        target.setLocation(100, 50);
        let dragSequence = drag(tiny).from(0, 0).through(10, 10).on(target, 20, 20);
        assert(tiny.parent).equalsTo(target);
        assert(tiny.location).sameTo({x:20, y:20});
    });

    function defineNotATargetClass() {
        class BoardNotATarget extends BoardElement {
            constructor(width, height) {
                super(width, height);
                let background = new Rect(-width / 2, -height / 2, width, height)
                    .attrs({fill:"#0A0A0A"});
                this._root
                    .add(this._initShape(background))
                    .add(this._initContent());
            }
        }
        makeShaped(BoardNotATarget);
        // May be targeted by drop
        makeContainer(BoardNotATarget);
        return BoardNotATarget;
    }

    it("Cancel drop if target not accept any drop", ()=>{
        let {tiny, table} = createATableWithOneElement();
        let BoardNotATarget = defineNotATargetClass();
        let notATarget = new BoardNotATarget(60, 60);
        tiny.dragOperation = function() {return new DragMoveSelectionOperation()};
        table.add(notATarget);
        notATarget.setLocation(100, 50);
        let dragSequence = drag(tiny).from(0, 0).through(10, 10).on(notATarget, 20, 20);
        assert(tiny.parent).equalsTo(table);
        assert(tiny.location).sameTo({x:0, y:0});
    });

    it("Does not move dragged element outside any target", ()=>{
        let {tiny, table} = createATableWithOneElement();
        tiny.dragOperation = function() {return new DragMoveSelectionOperation()};
        tiny.setLocation(10, 10);
        let dragSequence = drag(tiny).from(10, 10).through(100, 100);
        assert(tiny.location).sameTo({x:100, y:100});
        dragSequence.to(2000, 2000);
        assert(tiny.parent).equalsTo(table);
        assert(tiny.location).sameTo({x:100, y:100});
    });

    it("Undo and redo a move", ()=>{
        let {tiny} = createATableWithOneElement();
        tiny.dragOperation = function() {return new DragMoveSelectionOperation()};
        let tinySnapshot = new Snapshot(tiny);
        Context.memento.opened = true;
        drag(tiny).from(0, 0).through(10, 10).to(20, 20);
        Context.memento.undo();
        assert(tiny.location).sameTo({x:0, y:0});
        tinySnapshot.assert(tiny);
        Context.memento.redo();
        assert(tiny.location).sameTo({x:20, y:20});
    });

    it("Undo and redo using keyboard", ()=>{
        let {tiny} = createATableWithOneElement();
        tiny.dragOperation = function() {return new DragMoveSelectionOperation()};
        let tinySnapshot = new Snapshot(tiny);
        Context.memento.opened = true;
        drag(tiny).from(0, 0).through(10, 10).to(20, 20);
        keyboard.input(keyboard.ctrl("z"));
        assert(tiny.location).sameTo({x:0, y:0});
        tinySnapshot.assert(tiny);
        keyboard.input(keyboard.ctrl("y"));
        assert(tiny.location).sameTo({x:20, y:20});
    });

    it("Select an element by clicking on it", ()=>{
        let {tiny} = createATableWithOneElement();
        clickOn(tiny);
        assert(Context.selection.selected(tiny)).isTrue();
    });

    it("Select an element by dragging it", ()=>{
        let {tiny} = createATableWithOneElement();
        tiny.dragOperation = function() {return new DragMoveSelectionOperation()};
        drag(tiny).from(0, 0).through(10, 10).to(20, 20);
        assert(Context.selection.selected(tiny)).isTrue();
    });

    function createATableWithTwoElements() {
        let BoardTiny = defineDraggableTinyClass();
        let table = putTable();
        let tiny1 = new BoardTiny(30, 20);
        let tiny2 = new BoardTiny(30, 20);
        table.add(tiny1);
        table.add(tiny2);
        tiny1.move(10, 10);
        tiny2.move(20, 10);
        return {BoardTiny, table, tiny1, tiny2};
    }

    it("Deselect an element if another element is selected", ()=>{
        let {tiny1, tiny2} = createATableWithTwoElements();
        clickOn(tiny1);
        assert(Context.selection.selected(tiny1)).isTrue();
        clickOn(tiny2);
        assert(Context.selection.selected(tiny1)).isFalse();
        assert(Context.selection.selected(tiny2)).isTrue();
    });

    it("Add an element to a selection if ctrl key is used", ()=>{
        let {tiny1, tiny2} = createATableWithTwoElements();
        clickOn(tiny1);
        clickOn(tiny2, {ctrlKey:true});
        assert(Context.selection.selected(tiny1)).isTrue();
        assert(Context.selection.selected(tiny2)).isTrue();
    });

    function selectTwoElements() {
        let {BoardTiny, table, tiny1, tiny2} = createATableWithTwoElements();
        let dragOperation = function() {return new DragMoveSelectionOperation()};;
        tiny1.dragOperation = dragOperation;
        tiny2.dragOperation = dragOperation;
        clickOn(tiny1);
        clickOn(tiny2, {ctrlKey:true});
        return {BoardTiny, table, tiny1, tiny2, dragOperation}
    }

    it("Moves a selection", ()=>{
        let {tiny1, tiny2} = selectTwoElements();
        drag(tiny1).from(10, 10).through(20, 20).to(30, 40);
        assert(Context.selection.selected(tiny1)).isTrue();
        assert(Context.selection.selected(tiny2)).isTrue();
        assert(tiny1.location).sameTo({x:30, y:40});
        assert(tiny2.location).sameTo({x:40, y:40});
    });

    it("Deletes a selection", ()=>{
        let {BoardTiny, table, tiny1, tiny2} = selectTwoElements();
        allowElementDeletion();
        makeDeletable(BoardTiny);
        assert(table.contains(tiny1)).isTrue();
        assert(table.contains(tiny2)).isTrue();
        keyboard.input(keyboard.delete);
        assert(table.contains(tiny1)).isFalse();
        assert(table.contains(tiny2)).isFalse();
        assert(tiny1.parent).isNotDefined();
        assert(tiny2.parent).isNotDefined();
    });

    it("Copies a selection", ()=>{
        let {table, tiny1, tiny2} = selectTwoElements();
        Context.copyPaste.copyModel(Context.selection.selection());
        Context.copyPaste.pasteModel();
        let children = table.children;
        assert(children.size).equalsTo(4);
        assert(findChild(table, -5, 0)).isDefined();
        assert(findChild(table, 5, 0)).isDefined();
    });

});