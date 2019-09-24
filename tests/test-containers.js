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
    makeDraggable, makeContainer, makeSupport, makeDeletable, makeContainerASupport, makeContainerMultiLayered,
    makeContainerZindex
} from "../js/base-element.js";

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
            constructor(width, height, color = "#0C0C0C") {
                super(width, height);
                this._initShape(new Rect(-width / 2, -height / 2, width, height).attrs({fill:color}));
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

    function createTinyElements(BoardTiny = defineTinyClass()) {
        let tiny1 = new BoardTiny(40, 5, "#FF0000");
        tiny1.getLayer = ()=>"up";
        let tiny2 = new BoardTiny(30, 10, "#00FF00");
        tiny2.getLayer = ()=>"middle";
        let tiny3 = new BoardTiny(20, 20, "#0000FF");
        tiny3.getLayer = ()=>"middle";
        let tiny4 = new BoardTiny(10, 30, "#FFFF00");
        tiny4.getLayer = ()=>"down";
        let tiny5 = new BoardTiny(5, 40, "#FF00FF");
        tiny5.getLayer = ()=>"down";
        let tiny1Html = html(tiny1);
        let tiny2Html = html(tiny2);
        let tiny3Html = html(tiny3);
        let tiny4Html = html(tiny4);
        let tiny5Html = html(tiny5);
        return {tiny1, tiny2, tiny3, tiny4, tiny5, tiny1Html, tiny2Html, tiny3Html, tiny4Html, tiny5Html};
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

    function copyContainer(table, container) {
        container.setLocation(100, 100);
        Context.selection.selectOnly(container);
        Context.copyPaste.copyModel(Context.selection.selection());
        Context.copyPaste.pasteModel();
        let children = table.children;
        assert(children.size).equalsTo(2);
        return findChild(table, 0, 0);
    }

    it("Copies a simple container", ()=>{
        let table = putTable();
        let BoardSimpleContainer = defineSimpleContainerClass();
        makeSelectable(BoardSimpleContainer);
        let container = new BoardSimpleContainer(100, 150);
        let {tiny1, tiny2} = createTinyElements();
        container.add(tiny1).add(tiny2);
        table.add(container);
        let copy = copyContainer(table, container);
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

    function defineZIndexContainerClass() {
        class BoardZIndexContainer extends BoardElement {
            constructor(width, height) {
                super(width, height);
                let background = new Rect(-width / 2, -height / 2, width, height)
                    .attrs({fill:"#0A0A0A"});
                this._initShape(background);
            }
        }
        makeShaped(BoardZIndexContainer);
        makeContainer(BoardZIndexContainer);
        makeContainerZindex(BoardZIndexContainer);
        makeContainerASupport(BoardZIndexContainer);
        return BoardZIndexContainer;
    }

    function createTinyContainerElements() {
        let BoardTiny = defineTinyClass();
        // Element must be containers...
        makeContainer(BoardTiny);
        // ... and support (ZIndex ignore elements that are only part of other elements
        makeContainerASupport(BoardTiny);
        return createTinyElements(BoardTiny);
    }

    function getHtmlForZIndexContainer() {
        let containerStartHtml='<g transform="matrix(1 0 0 1 0 0)"><g><g><rect x="-75" y="-75" width="150" height="150" fill="#0A0A0A"></rect></g><g>';
        let startLayer='<g>';
        let endLayer='</g>';
        let startRootPedestal='<g>';
        let startPedestal='<g transform="matrix(1 0 0 1 0 0)">';
        let endPedestal='</g>';
        let containerEndHtml='</g></g></g>';
        return {containerStartHtml, startLayer, endLayer, startRootPedestal, startPedestal, endPedestal, containerEndHtml}
    }

    function createZIndexContainerAndElementsToPutInto() {
        let table = putTable();
        let BoardZIndexContainer = defineZIndexContainerClass();
        let container = new BoardZIndexContainer(150, 150);
        table.add(container);
        let {tiny1, tiny2, tiny3, tiny4, tiny5, tiny1Html, tiny2Html, tiny3Html, tiny4Html, tiny5Html} =
            createTinyContainerElements();
        return {
            table, container, BoardZIndexContainer,
            tiny1, tiny2, tiny3, tiny4, tiny5,
            tiny1Html, tiny2Html, tiny3Html, tiny4Html, tiny5Html
        };
    }

    it("Puts elements in a z-index container", ()=> {
        let {container, tiny1, tiny2, tiny3, tiny4, tiny1Html, tiny2Html, tiny3Html, tiny4Html} =
            createZIndexContainerAndElementsToPutInto();
        let {containerStartHtml, startLayer, endLayer, startPedestal, startRootPedestal, endPedestal, containerEndHtml} =
            getHtmlForZIndexContainer();
        tiny1.add(tiny2.add(tiny3));
        container.add(tiny1);
        assert(html(container)).equalsTo(
            containerStartHtml+
            startLayer+startRootPedestal+tiny1Html+endPedestal+endLayer+
            startLayer+startPedestal+tiny2Html+endPedestal+endLayer+
            startLayer+startPedestal+tiny3Html+endPedestal+endLayer+
            startLayer+startPedestal+endPedestal+endLayer+
            containerEndHtml);
        // Add an element at the top of the stack => a new layer is created on the ZIndex container.
        tiny3.add(tiny4);
        assert(html(container)).equalsTo(
            containerStartHtml+
            startLayer+startRootPedestal+tiny1Html+endPedestal+endLayer+
            startLayer+startPedestal+tiny2Html+endPedestal+endLayer+
            startLayer+startPedestal+tiny3Html+endPedestal+endLayer+
            startLayer+startPedestal+tiny4Html+endPedestal+endLayer+
            startLayer+startPedestal+endPedestal+endLayer+
            containerEndHtml);
    });

    it("Removes elements from a z-index container", ()=> {
        let {container, tiny1, tiny2, tiny3, tiny4, tiny5, tiny1Html, tiny2Html, tiny3Html, tiny4Html, tiny5Html} =
            createZIndexContainerAndElementsToPutInto();
        let {containerStartHtml, startLayer, endLayer, startPedestal, startRootPedestal, endPedestal, containerEndHtml} =
            getHtmlForZIndexContainer();
        // Stacks are created outside container
        tiny1.add(tiny2);
        tiny3.add(tiny4.add(tiny5));
        let stack1Html = html(tiny1);
        let stack2Html = html(tiny3);
        // Container is initialized with one stack ony;
        let containerEmptyHtml = html(container);
        container.add(tiny1);
        let containerHtml = html(container);
        // Put 2nd stack on first stack => items are dispatched on z-index layers
        tiny2.add(tiny3);
        assert(html(container)).equalsTo(
            containerStartHtml+
            startLayer+startRootPedestal+tiny1Html+endPedestal+endLayer+
            startLayer+startPedestal+tiny2Html+endPedestal+endLayer+
            startLayer+startPedestal+tiny3Html+endPedestal+endLayer+
            startLayer+startPedestal+tiny4Html+endPedestal+endLayer+
            startLayer+startPedestal+tiny5Html+endPedestal+endLayer+
            startLayer+startPedestal+endPedestal+endLayer+
            containerEndHtml);
        // Remove an item from another item => removed elements are recombined.
        tiny2.remove(tiny3);
        assert(html(tiny3)).equalsTo(stack2Html);
        assert(html(container)).equalsTo(containerHtml);
        // Remove an item from the container => removed elements must be recombined too
        container.remove(tiny1);
        assert(html(tiny1)).equalsTo(stack1Html);
        assert(html(container)).equalsTo(containerEmptyHtml);
    });

    it("Replaces an element in a z-index container", ()=> {
        let {containerStartHtml, startLayer, endLayer, startPedestal, startRootPedestal, endPedestal, containerEndHtml} =
            getHtmlForZIndexContainer();
        let {container, tiny1, tiny2, tiny3, tiny4, tiny1Html, tiny2Html, tiny3Html, tiny4Html} =
            createZIndexContainerAndElementsToPutInto();
        // Stack is created outside container
        tiny1.add(tiny2);
        let stackHtml = html(tiny1);
        tiny3.add(tiny4);
        // Container is initialized with first stack
        container.add(tiny1);
        assert(html(container)).equalsTo(
            containerStartHtml+
            startLayer+startRootPedestal+tiny1Html+endPedestal+endLayer+
            startLayer+startPedestal+tiny2Html+endPedestal+endLayer+
            startLayer+startPedestal+endPedestal+endLayer+
            containerEndHtml);
        // Remove root item => removed elements are recombined.
        container.replace(tiny1, tiny3);
        assert(html(container)).equalsTo(
            containerStartHtml+
            startLayer+startRootPedestal+tiny3Html+endPedestal+endLayer+
            startLayer+startPedestal+tiny4Html+endPedestal+endLayer+
            startLayer+startPedestal+endPedestal+endLayer+
            containerEndHtml);
        assert(html(tiny1)).equalsTo(stackHtml);
        // Remove an element on the stack => container takes control
        tiny3.replace(tiny4, tiny1);
        assert(html(tiny4)).equalsTo(tiny4Html);
        assert(html(container)).equalsTo(
            containerStartHtml+
            startLayer+startRootPedestal+tiny3Html+endPedestal+endLayer+
            startLayer+startPedestal+tiny1Html+endPedestal+endLayer+
            startLayer+startPedestal+tiny2Html+endPedestal+endLayer+
            startLayer+startPedestal+endPedestal+endLayer+
            containerEndHtml);
    });

    it("Inserts elements in a z-index container", ()=> {
        let {containerStartHtml, startLayer, endLayer, startPedestal, startRootPedestal, endPedestal, containerEndHtml} =
            getHtmlForZIndexContainer();
        let {container, tiny1, tiny2, tiny3, tiny1Html, tiny2Html, tiny3Html} =
            createZIndexContainerAndElementsToPutInto();
        tiny2.add(tiny3);
        container.add(tiny1);
        // Add an element at the top of the stack => a new layer is created on the ZIndex container.
        container.insert(tiny1, tiny2);
        assert(html(container)).equalsTo(
            containerStartHtml+
            startLayer+startRootPedestal+tiny2Html+tiny1Html+endPedestal+endLayer+
            startLayer+startPedestal+endPedestal+startPedestal+tiny3Html+endPedestal+endLayer+
            startLayer+startPedestal+endPedestal+endLayer+
            containerEndHtml);
    });

    it("Puts several elements on same levels in a z-index container", ()=> {
        let {containerStartHtml, startLayer, endLayer, startPedestal, startRootPedestal, endPedestal, containerEndHtml} =
            getHtmlForZIndexContainer();
        let {container, tiny1, tiny2, tiny3, tiny4, tiny1Html, tiny2Html, tiny3Html, tiny4Html} =
            createZIndexContainerAndElementsToPutInto();
        tiny1.add(tiny2);
        tiny3.add(tiny4);
        // Add two stacks
        container.add(tiny1);
        container.add(tiny3);
        // Stacks are splitted by levels
        assert(html(container)).equalsTo(
            containerStartHtml+
            startLayer+startRootPedestal+tiny1Html+tiny3Html+endPedestal+endLayer+
            startLayer+startPedestal+tiny2Html+endPedestal+startPedestal+tiny4Html+endPedestal+endLayer+
            startLayer+startPedestal+endPedestal+startPedestal+endPedestal+endLayer+
            containerEndHtml);
    });

    function getHtmlForMovedElementsInZIndexContainer() {
        let tiny1Html10_20 = '<g transform="matrix(1 0 0 1 10 20)"><g><g><rect x="-20" y="-2.5" width="40" height="5" fill="#FF0000"></rect></g><g></g></g></g>';
        let tiny2Html10_30 = '<g transform="matrix(1 0 0 1 10 30)"><g><g><rect x="-15" y="-5" width="30" height="10" fill="#00FF00"></rect></g><g></g></g></g>';
        let startPedestal10_20='<g transform="matrix(1 0 0 1 10 20)">';
        let startPedestal20_50='<g transform="matrix(1 0 0 1 20 50)">';
        return {tiny1Html10_20, tiny2Html10_30, startPedestal10_20, startPedestal20_50};
    }

    it("Add elements with random location in a z-index container", ()=> {
        let {containerStartHtml, startLayer, endLayer, startRootPedestal, endPedestal, containerEndHtml} =
            getHtmlForZIndexContainer();
        let {container, tiny1, tiny2} =
            createZIndexContainerAndElementsToPutInto();
        tiny1.setLocation(10, 20);
        tiny2.setLocation(10, 30);
        tiny1.add(tiny2);
        container.add(tiny1);
        let {tiny1Html10_20, tiny2Html10_30, startPedestal10_20, startPedestal20_50} =
            getHtmlForMovedElementsInZIndexContainer();
        assert(html(container)).equalsTo(
            containerStartHtml+
            startLayer+startRootPedestal+tiny1Html10_20+endPedestal+endLayer+
            startLayer+startPedestal10_20+tiny2Html10_30+endPedestal+endLayer+
            startLayer+startPedestal20_50+endPedestal+endLayer+
            containerEndHtml);
    });

    it("Moves elements in a z-index container", ()=> {
        let {containerStartHtml, startLayer, endLayer, startPedestal, startRootPedestal, endPedestal, containerEndHtml} =
            getHtmlForZIndexContainer();
        let {container, tiny1, tiny2, tiny1Html, tiny2Html} =
            createZIndexContainerAndElementsToPutInto();
        tiny1.add(tiny2);
        container.add(tiny1);
        assert(html(container)).equalsTo(
            containerStartHtml+
            startLayer+startRootPedestal+tiny1Html+endPedestal+endLayer+
            startLayer+startPedestal+tiny2Html+endPedestal+endLayer+
            startLayer+startPedestal+endPedestal+endLayer+
            containerEndHtml);
        // Add an element at the top of the stack => a new layer is created on the ZIndex container.
        tiny1.setLocation(10, 20);
        tiny2.setLocation(10, 30);
        let {tiny1Html10_20, tiny2Html10_30, startPedestal10_20, startPedestal20_50} =
            getHtmlForMovedElementsInZIndexContainer();
        assert(html(container)).equalsTo(
            containerStartHtml+
            startLayer+startRootPedestal+tiny1Html10_20+endPedestal+endLayer+
            startLayer+startPedestal10_20+tiny2Html10_30+endPedestal+endLayer+
            startLayer+startPedestal20_50+endPedestal+endLayer+
            containerEndHtml);
    });

    it("Copies a z-index container", ()=> {
        let {containerStartHtml, startLayer, endLayer, startPedestal, startRootPedestal, endPedestal, containerEndHtml} =
            getHtmlForZIndexContainer();
        let {BoardZIndexContainer, table, container, tiny1, tiny2} =
            createZIndexContainerAndElementsToPutInto();
        makeSelectable(BoardZIndexContainer);
        container.setLocation(100, 100);
        tiny1.setLocation(10, 20);
        tiny2.setLocation(10, 30);
        tiny1.add(tiny2);
        container.add(tiny1);
        let copy = copyContainer(table, container);
        assert(copy).isDefined();
        assert(copy===container).isFalse();
        assert(copy._root.innerHTML).equalsTo(container._root.innerHTML);
    });

    it("Undoes/Redoes a z-index container", ()=> {
        let {containerStartHtml, startLayer, endLayer, startPedestal, startRootPedestal, endPedestal, containerEndHtml} =
            getHtmlForZIndexContainer();
        let {BoardZIndexContainer, table, container, tiny1, tiny2, tiny3, tiny4} =
            createZIndexContainerAndElementsToPutInto();
        makeSelectable(BoardZIndexContainer);
        container.setLocation(100, 100);
        tiny1.setLocation(10, 20);
        tiny2.setLocation(10, 30);
        tiny1.add(tiny2);
        container.add(tiny1);
        let htmlBefore = html(container);
        Context.memento.opened = true;
        Context.memento.open();
        // Make some updates...
        tiny1.setLocation(20, 0);
        tiny1.add(tiny3);
        container.add(tiny4);
        let htmlAfter = html(container);
        // Ensure something has changed...
        assert(htmlBefore===htmlAfter).isFalse();
        Context.memento.undo();
        assert(html(container)).equalsTo(htmlBefore);
        Context.memento.redo();
        assert(html(container)).equalsTo(htmlAfter);
    });

});