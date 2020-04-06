'use strict';

import {
    describe, it, before, assert, clickOn, drag, Snapshot, keyboard, findChild
} from "./test-toolkit.js";
import {
    Rect, Group
} from "../js/graphics.js";
import {
    setRef, html, Context, Selection, Canvas
} from "../js/toolkit.js";
import {
    DragMoveSelectionOperation
} from "../js/drag-and-drop.js";
import {
    SigmaElement, SigmaTable
} from "../js/base-element.js";
import {
    makeShaped, makeClickable, makeMovable, makeSelectable, makeDraggable, makeDeletable
} from "../js/core-mixins.js";
import {
    makeContainer, makeSupport
} from "../js/container-mixins.js";
import {
    Facilities
} from "../js/standard-facilities.js";

describe("App fundamentals", ()=> {

    before(()=> {
        document.body.innerHTML=
            '<div id="edit"></div>\n' +
            '<div tabindex="0" id="app"></div>';
        Context.canvas = new Canvas("#app", 1200, 600);
        Context.selection = new Selection();
        setRef(Context.canvas, 'app-canvas');
        setRef(Context.canvas.baseLayer, 'app-base-layer');
        setRef(Context.canvas.toolsLayer, 'app-tool-layer');
        setRef(Context.canvas.glassLayer, 'app-glass-layer');
        setRef(Context.canvas.modalsLayer, 'app-modal-layer');
    });

    /*
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="position:absolute;transform:rotateX(0deg);width:100%;height:100%;" id="app-base-layer"><g><g transform="matrix(1 0 0 1 600 300)"><g transform="matrix(1 0 0 1 0 0)"></g></g></g><defs><filter id="_shadow_" filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse" x="-20pc" y="-20pc" width="140pc" height="140pc"><feDropShadow stdDeviation="3 3" in="SourceGraphic" dx="0" dy="0" flood-color="#0F0F0F" flood-opacity="1"></feDropShadow></filter><filter id="_highlight_" filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse" x="-20pc" y="-20pc" width="140pc" height="140pc"><feDropShadow stdDeviation="1 1" in="SourceGraphic" dx="0" dy="0" flood-color="#F00F0F" flood-opacity="1"></feDropShadow></filter></defs></svg>
     */
    it("Creates a minimal app", ()=>{
        assert(html(Context.canvas.baseLayer))
            .equalsTo("<g transform=\"matrix(1 0 0 1 0 0)\" id=\"app-base-layer\"></g>");
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
                        '<filter id="_shadow_" filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse" x="-20pc" y="-20pc" width="140pc" height="140pc">' +
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
        let table = new SigmaTable(4000, 3000, "#A0A0A0");
        setRef(table, "app-table")
        Context.canvas.putOnBase(table);
        return table;
    }

    it("Set a table on the board", ()=>{
        // Yest, table is ALWAYS (much) bigger than canvas area.
        let table = putTable();
        let tableShape = '<g><rect x="-2000" y="-1500" width="4000" height="3000" fill="#A0A0A0"></rect></g>';
        let tablePartsOwnership = '<g></g>';
        let tableChildrenOwnership = '<g></g>';
        assert(html(table))
            .equalsTo('<g transform="matrix(1 0 0 1 0 0)" id="app-table"><g>' +
                tableShape+tablePartsOwnership+tableChildrenOwnership+
                '</g></g>');
        assert(html(Context.canvas.baseLayer))
            .equalsTo(
                '<g transform="matrix(1 0 0 1 0 0)" id="app-base-layer">'+
                    html(table)+
                '</g>');
    });

    function defineTinyClass() {
        class TestTiny extends SigmaElement {
            constructor(width, height) {
                super(width, height);
                this._initShape(new Rect(-width / 2, -height / 2, width, height));
            }
        }
        makeShaped(TestTiny);
        return TestTiny;
    }

    it("Add a simple element on the board", ()=>{
        let TestTiny = defineTinyClass();
        let table = putTable();
        let tiny = new TestTiny(30, 20);
        setRef(tiny, "tiny");
        table.add(tiny);
        assert(html(tiny))
            .equalsTo('<g transform="matrix(1 0 0 1 0 0)" id="tiny"><g><g><rect x="-15" y="-10" width="30" height="20"></rect></g></g></g>');
        assert(html(table))
            .equalsTo(
                '<g transform="matrix(1 0 0 1 0 0)" id="app-table">' +
                    '<g>' +
                        '<g><rect x="-2000" y="-1500" width="4000" height="3000" fill="#A0A0A0"></rect></g>' +
                        '<g></g>' +
                        '<g>' +
                         html(tiny)+
                        '</g>' +
                    '</g>' +
                '</g>');
    });

    it("Clicks on a simple element of the board", ()=>{
        let TestTiny = defineTinyClass();
        makeClickable(TestTiny);
        let table = putTable();
        let tiny = new TestTiny(30, 20);
        let clicked = false;
        tiny.clickHandler = function() {return event=>clicked = true;};
        table.add(tiny);
        clickOn(tiny);
        assert(clicked).equalsTo(true);
    });

    function defineDraggableTinyClass() {
        let TestTiny = defineTinyClass();
        // Yes. We need all these 3 traits...
        makeMovable(TestTiny);
        makeSelectable(TestTiny);
        makeDraggable(TestTiny);
        return TestTiny;
    }

    function createATableWithOneElement() {
        let TestTiny = defineDraggableTinyClass();
        let table = putTable();
        let tiny = new TestTiny(30, 20);
        table.add(tiny);
        return {TestTiny, table, tiny};
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
                this._initShape(background);
                this._initContent();
            }
        }
        makeShaped(BoardNotATarget);
        // May be targeted by drop
        makeContainer(BoardNotATarget);
        return BoardNotATarget;
    }

    it("Cancel drop if target does not accept any drop", ()=>{
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
        let TestTiny = defineDraggableTinyClass();
        let table = putTable();
        let tiny1 = new TestTiny(30, 20);
        let tiny2 = new TestTiny(30, 20);
        table.add(tiny1);
        table.add(tiny2);
        tiny1.move(10, 10);
        tiny2.move(20, 10);
        return {TestTiny, table, tiny1, tiny2};
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
        let {TestTiny, table, tiny1, tiny2} = createATableWithTwoElements();
        let dragOperation = function() {return new DragMoveSelectionOperation()};;
        tiny1.dragOperation = dragOperation;
        tiny2.dragOperation = dragOperation;
        clickOn(tiny1);
        clickOn(tiny2, {ctrlKey:true});
        return {TestTiny, table, tiny1, tiny2, dragOperation}
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
        let {TestTiny, table, tiny1, tiny2} = selectTwoElements();
        Facilities.allowElementDeletion();
        makeDeletable(TestTiny);
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

    it("Select an element using the select area facility", ()=>{
        let {table, tiny} = createATableWithOneElement();
        tiny.dragOperation = function() {return new DragMoveSelectionOperation()};
        let dragOperation = drag(table).from(-10, -10, {button:2}).through(10, 10, {button:2});
        // Ensure that selection artifact is here
        assert(html(Context.canvas.glassLayer)).equalsTo(
            '<g id="app-glass-layer" transform="matrix(1 0 0 1 0 0)"><g><rect x="-18" y="-18" width="20" height="20" fill="none" stroke="#dc143c" stroke-opacity="0.01" stroke-width="2"></rect><rect x="-18" y="-18" width="20" height="20" fill="none" stroke="#dc143c" stroke-opacity="0.9" stroke-width="2" stroke-dasharray="5 5"></rect></g></g>\n'
        );
        dragOperation.to(30, 30, {button:2});
        // Ensure that select area artifact has disappeared.
        assert(html(Context.canvas.glassLayer)).equalsTo('<g id="app-glass-layer" transform="matrix(1 0 0 1 0 0)"><g></g></g>');
        assert(Context.selection.selected(tiny)).isTrue();
    });

    it("Select an element event if the select area artifact covers partially the element", ()=>{
        let {table, tiny} = createATableWithOneElement();
        tiny.dragOperation = function() {return new DragMoveSelectionOperation()};
        let dragOperation = drag(table).from(-10, -10, {button:2}).to(0, 0, {button:2});
        assert(Context.selection.selected(tiny)).isTrue();
    });

    it("Ensure that the select area artifact takes into account the zoom factor", ()=>{
        let table = putTable();
        Context.canvas.zoomSet(0.5, 0, 0);
        let dragOperation = drag(table).from(-10, -10, {button:2}).through(10, 10, {button:2});
        // Ensure that selection artifact stroke options are updated in accordance with zoom factor is here
        assert(html(Context.canvas.glassLayer)).equalsTo(
            '<g id="app-glass-layer" transform="matrix(0.5 0 0 0.5 0 0)"><g><rect x="-36" y="-36" width="40" height="40" fill="none" stroke="#dc143c" stroke-opacity="0.01" stroke-width="4"></rect><rect x="-36" y="-36" width="40" height="40" fill="none" stroke="#dc143c" stroke-opacity="0.9" stroke-width="4" stroke-dasharray="10 10"></rect></g></g>\n'
        );
        dragOperation.through(20, 20);
        // Even if zoom factor change during area selection !
        Context.canvas.zoomSet(0.4, 0, 0);
        assert(html(Context.canvas.glassLayer)).equalsTo(
            '<g id="app-glass-layer" transform="matrix(0.4 0 0 0.4 0 0)"><g><rect x="-36" y="-36" width="60" height="60" fill="none" stroke="#dc143c" stroke-opacity="0.9" stroke-width="5" stroke-dasharray="12.5 12.5"></rect></g></g>'
        );
        dragOperation.to(30, 30);
    });

    function copyPasteElement(table, element) {
        Context.selection.selectOnly(element);
        Context.copyPaste.copyModel(Context.selection.selection());
        Context.copyPaste.pasteModel();
        return findChild(table, 0, 0);
    }

    it("Clicks on a (clickable) copy of a simple element of the board", ()=>{
        let TestTiny = defineTinyClass();
        makeClickable(TestTiny);
        makeSelectable(TestTiny);
        let table = putTable();
        let tiny = new TestTiny(30, 20);
        let clicked = false;
        tiny.clickHandler = function() {return event=>clicked = true;};
        tiny.setLocation(100, 100);
        table.add(tiny);
        let copy = copyPasteElement(table, tiny);
        assert(copy).notEqualsTo(tiny);
        Context.selection.unselectAll();
        clickOn(copy);
        assert(clicked).equalsTo(true);
        assert(Context.selection.selected(copy)).isTrue();
    });

    it("Selects a (not clickable) copy of a simple element of the board", ()=>{
        let TestTiny = defineTinyClass();
        makeSelectable(TestTiny);
        let table = putTable();
        let tiny = new TestTiny(30, 20);
        tiny.setLocation(100, 100);
        table.add(tiny);
        let copy = copyPasteElement(table, tiny);
        assert(copy).notEqualsTo(tiny);
        Context.selection.unselectAll();
        clickOn(copy);
        assert(Context.selection.selected(copy)).isTrue();
    });

    function createNotAnElement() {
        return {
            _root: new Group(),
            register(element) {
                this._root.add(element._root);
                element._parent = this;
            },
            remove(element) {
                this._root.remove(element._root);
                element._parent = null;
            }
        }
    }

    it("Destroy the element if drop is cancelled and 'original' parent does not have any 'add' method (it comes form a tool for example)", ()=>{
        let {tiny, table} = createATableWithOneElement();
        let TestNotATarget = defineNotATargetClass();
        let notATarget = new TestNotATarget(60, 60);
        let pedestal = createNotAnElement();
        Context.canvas.putArtifactOnToolsLayer(pedestal._root);
        pedestal.register(tiny);
        tiny.dragOperation = function() {return new DragMoveSelectionOperation()};
        table.add(notATarget);
        notATarget.setLocation(100, 50);
        let dragSequence = drag(tiny).from(0, 0).through(10, 10).on(notATarget, 20, 20);
        assert(tiny._root.parent).isNotDefined();
        assert(tiny.parent).isNotDefined();
    });

});