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
    makeDraggable, makeContainer, makeSupport, makeDeletable, makeContainerASupport, makeContainerMultiLayered
} from "../js/base-element.js";
import {
    allowElementDeletion
} from "../js/tools.js";

describe("Containers", ()=> {

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

    function defineTinyClass() {
        class BoardTiny extends BoardElement {
            constructor(width, height) {
                super(width, height);
                this._initShape(new Rect(-width / 2, -height / 2, width, height).attrs({fill:"#0C0C0C"}));
            }
        }
        makeShaped(BoardTiny);
        makeMoveable(BoardTiny);
        makeSelectable(BoardTiny);
        makeDraggable(BoardTiny);
        return BoardTiny;
    }

    function defineSimpleContainerClass() {
        class BoardSimpleContainer extends BoardElement {
            constructor(width, height) {
                super(width, height);
                let background = new Rect(-width / 2, -height / 2, width, height)
                    .attrs({fill:"#0A0A0A"});
                this._initShape(background);
            }
        }
        makeShaped(BoardSimpleContainer);
        makeSupport(BoardSimpleContainer);
        return BoardSimpleContainer;
    }

    function createTinyElements() {
        let BoardTiny = defineTinyClass();
        let tiny1 = new BoardTiny(10, 20);
        tiny1.setLocation(10, 20);
        tiny1.getLayer = ()=>"up";
        let tiny2 = new BoardTiny(20, 20);
        tiny2.setLocation(20, 20);
        tiny2.getLayer = ()=>"middle";
        let tiny3 = new BoardTiny(10, 30);
        tiny3.setLocation(10, 30);
        tiny3.getLayer = ()=>"middle";
        let tiny4 = new BoardTiny(20, 30);
        tiny4.setLocation(20, 30);
        tiny4.getLayer = ()=>"down";
        let tiny1Html = html(tiny1);
        let tiny2Html = html(tiny2);
        let tiny3Html = html(tiny3);
        let tiny4Html = html(tiny4);
        return {tiny1, tiny2, tiny3, tiny4, tiny1Html, tiny2Html, tiny3Html, tiny4Html};
    }

    function getHtmlForSimpleContainer() {
        let containerStartHtml = '<g transform="matrix(1 0 0 1 0 0)"><g><g><rect x="-50" y="-75" width="100" height="150" fill="#0A0A0A"></rect></g><g>';
        let containerEndHtml = '</g></g></g>';
        return {containerStartHtml, containerEndHtml}
    }

    it("Uses a simple container", ()=>{
        let BoardSimpleContainer = defineSimpleContainerClass();
        let container = new BoardSimpleContainer(100, 150);
        let {tiny1, tiny2, tiny3, tiny4, tiny1Html, tiny2Html, tiny3Html, tiny4Html} = createTinyElements();
        let {containerStartHtml, containerEndHtml} = getHtmlForSimpleContainer();
        // Add op.
        container.add(tiny1).add(tiny2).add(tiny3);
        assert(container.children).arrayEqualsTo([tiny1, tiny2, tiny3]);
        assert(html(container)).equalsTo(containerStartHtml+tiny1Html+tiny2Html+tiny3Html+containerEndHtml);
        // Replace op.
        container.replace(tiny2, tiny4);
        assert(container.children).arrayEqualsTo([tiny1, tiny4, tiny3]);
        assert(html(container)).equalsTo(containerStartHtml+tiny1Html+tiny4Html+tiny3Html+containerEndHtml);
        // Remove op.
        container.remove(tiny3);
        assert(container.children).arrayEqualsTo([tiny1, tiny4]);
        assert(html(container)).equalsTo(containerStartHtml+tiny1Html+tiny4Html+containerEndHtml);
        // Insert op.
        container.insert(tiny4, tiny2);
        assert(container.children).arrayEqualsTo([tiny1, tiny2, tiny4]);
        assert(html(container)).equalsTo(containerStartHtml+tiny1Html+tiny2Html+tiny4Html+containerEndHtml);
    });

    it("Copies a simple container", ()=>{
        let table = putTable();
        let BoardSimpleContainer = defineSimpleContainerClass();
        makeSelectable(BoardSimpleContainer);
        let container = new BoardSimpleContainer(100, 150);
        let {tiny1, tiny2} = createTinyElements();
        container.add(tiny1).add(tiny2);
        container.setLocation(100, 100);
        table.add(container);
        Context.selection.selectOnly(container);
        Context.copyPaste.copyModel(Context.selection.selection());
        Context.copyPaste.pasteModel();
        let children = table.children;
        assert(children.size).equalsTo(2);
        let copy = findChild(table, 0, 0);
        assert(copy).isDefined();
        assert(copy===container).isFalse();
        assert(copy.children.length).equalsTo(2);
        assert(copy._root.innerHTML).equalsTo(container._root.innerHTML);
    });

    it("Undoes/Redoes a simple container", ()=>{
        let table = putTable();
        let BoardSimpleContainer = defineSimpleContainerClass();
        makeSelectable(BoardSimpleContainer);
        let container = new BoardSimpleContainer(100, 150);
        container.setLocation(100, 100);
        table.add(container);
        let {tiny1, tiny2} = createTinyElements();
        container.add(tiny1);
        let htmlBeforeAdd = container._root.innerHTML;
        Context.memento.opened = true;
        Context.memento.open();
        container.add(tiny2);
        let htmlAfterAdd = container._root.innerHTML;
        assert(htmlBeforeAdd === htmlAfterAdd).isFalse();
        Context.memento.undo();
        assert(container._root.innerHTML).equalsTo(htmlBeforeAdd);
        Context.memento.redo();
        assert(container._root.innerHTML).equalsTo(htmlAfterAdd);
    });

    function defineMultiLayeredContainerClass() {
        class BoardMultiLayeredContainer extends BoardElement {
            constructor(width, height) {
                super(width, height);
                let background = new Rect(-width / 2, -height / 2, width, height)
                    .attrs({fill:"#0A0A0A"});
                this._initShape(background);
            }
        }
        makeShaped(BoardMultiLayeredContainer);
        makeContainer(BoardMultiLayeredContainer);
        makeContainerMultiLayered(BoardMultiLayeredContainer, "up", "middle", "down");
        makeContainerASupport(BoardMultiLayeredContainer);
        return BoardMultiLayeredContainer;
    }

    function getHtmlForMultiLayeredContainer() {
        let containerStartHtml = '<g transform="matrix(1 0 0 1 0 0)"><g><g><rect x="-50" y="-75" width="100" height="150" fill="#0A0A0A"></rect></g><g><g>';
        let containerEndHtml = '</g></g></g></g>';
        let newLayer = '</g><g>';
        return {containerStartHtml, newLayer, containerEndHtml}
    }

    it("Uses a multi layered container", ()=>{
        let BoardMultiLayeredContainer = defineMultiLayeredContainerClass();
        let container = new BoardMultiLayeredContainer(100, 150);
        let {tiny1, tiny2, tiny3, tiny4, tiny1Html, tiny2Html, tiny3Html, tiny4Html} = createTinyElements();
        let {containerStartHtml, newLayer, containerEndHtml} = getHtmlForMultiLayeredContainer();
        // Add operation
        container.add(tiny1).add(tiny2).add(tiny3);
        assert(container.children).arrayEqualsTo([tiny1, tiny2, tiny3]);
        assert(html(container)).equalsTo(
            containerStartHtml+tiny1Html+
            newLayer+tiny2Html+tiny3Html+
            newLayer+containerEndHtml);
        // Replace op.
        container.replace(tiny2, tiny4);
        assert(container.children).arrayEqualsTo([tiny1, tiny4, tiny3]);
        assert(html(container)).equalsTo(
            containerStartHtml+tiny1Html+
            newLayer+tiny3Html+
            newLayer+tiny4Html+containerEndHtml);
        // Remove op.
        container.remove(tiny3);
        assert(container.children).arrayEqualsTo([tiny1, tiny4]);
        assert(html(container)).equalsTo(
            containerStartHtml+tiny1Html+
            newLayer+
            newLayer+tiny4Html+containerEndHtml);
        // Insert op.
        container.insert(tiny4, tiny2);
        assert(container.children).arrayEqualsTo([tiny1, tiny2, tiny4]);
        assert(html(container)).equalsTo(
            containerStartHtml+tiny1Html+
            newLayer+tiny2Html+
            newLayer+tiny4Html+containerEndHtml);
    });

    it("Inserts in a multi layered container (check all cases)", ()=>{
        let BoardMultiLayeredContainer = defineMultiLayeredContainerClass();
        let container = new BoardMultiLayeredContainer(100, 150);
        let {tiny1, tiny2, tiny3, tiny4, tiny1Html, tiny2Html, tiny3Html, tiny4Html} = createTinyElements();
        let {containerStartHtml, newLayer, containerEndHtml} = getHtmlForMultiLayeredContainer();
        container.add(tiny1).add(tiny3);
        // First case : same layer
        container.insert(tiny3, tiny2);
        assert(html(container)).equalsTo(
            containerStartHtml+tiny1Html+
            newLayer+tiny2Html+tiny3Html+
            newLayer+containerEndHtml);
        // Second case : not same layer but there is a next one on the layer
        container.remove(tiny3);
        container.insert(tiny1, tiny3);
        assert(html(container)).equalsTo(
            containerStartHtml+tiny1Html+
            newLayer+tiny3Html+tiny2Html+
            newLayer+containerEndHtml);
        // Third case : not same layer and no next element on the given layer: insertion is a simple add
        container.insert(tiny3, tiny4);
        assert(html(container)).equalsTo(
            containerStartHtml+tiny1Html+
            newLayer+tiny3Html+tiny2Html+
            newLayer+tiny4Html+containerEndHtml);
    });

    it("Replace in a multi layered container (check all cases)", ()=>{
        let BoardMultiLayeredContainer = defineMultiLayeredContainerClass();
        let container = new BoardMultiLayeredContainer(100, 150);
        let {tiny1, tiny2, tiny3, tiny4, tiny1Html, tiny2Html, tiny3Html, tiny4Html} = createTinyElements();
        let {containerStartHtml, newLayer, containerEndHtml} = getHtmlForMultiLayeredContainer();
        container.add(tiny1).add(tiny3);
        // First case : same layer
        container.replace(tiny3, tiny2);
        assert(container.children).arrayEqualsTo([tiny1, tiny2]);
        assert(html(container)).equalsTo(
            containerStartHtml+tiny1Html+
            newLayer+tiny2Html+
            newLayer+containerEndHtml);
        // Second case : not same layer but there is a next one on the layer
        container.replace(tiny1, tiny3);
        assert(container.children).arrayEqualsTo([tiny3, tiny2]);
        assert(html(container)).equalsTo(
            containerStartHtml+
            newLayer+tiny3Html+tiny2Html+
            newLayer+containerEndHtml);
        // Third case : not same layer and no next element on the given layer: insertion is a simple add
        container.replace(tiny3, tiny4);
        assert(html(container)).equalsTo(
            containerStartHtml+
            newLayer+tiny2Html+
            newLayer+tiny4Html+containerEndHtml);
    });

});