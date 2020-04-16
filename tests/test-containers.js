'use strict';

import {
    describe, it, before, assert, findChild
} from "./test-toolkit.js";
import {
    Rect
} from "../js/graphics.js";
import {
    html, Context, Selection, Canvas
} from "../js/toolkit.js";
import {
    SigmaElement, SigmaTable, SigmaLayer
} from "../js/base-element.js";
import {
    makeShaped, makeMovable, makeSelectable, makeDraggable,
} from "../js/core-mixins.js";
import {
    makeContainer, makeSupport, makeContainerASupport, makeContainerMultiLayered, makeContainerZindex,
    makeLayersWithContainers, makePart, makeContainerASandBox
} from "../js/container-mixins.js";
import {
    Point2D
} from "../js/geometry.js";

describe("Containers", ()=> {

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

    function defineTinyClass() {
        class TestTiny extends SigmaElement {
            constructor(width, height, color = "#0C0C0C") {
                super(width, height);
                this._initShape(new Rect(-width / 2, -height / 2, width, height).attrs({fill:color}));
            }
        }
        makeShaped(TestTiny);
        makeMovable(TestTiny);
        makeSelectable(TestTiny);
        makeDraggable(TestTiny);
        return TestTiny;
    }

    function defineSimpleContainerClass() {
        class TestSimpleContainer extends SigmaElement {
            constructor(width, height) {
                super(width, height);
                let background = new Rect(-width / 2, -height / 2, width, height)
                    .attrs({fill:"#0A0A0A"});
                this._initShape(background);
            }
        }
        makeShaped(TestSimpleContainer);
        makeSupport(TestSimpleContainer);
        return TestSimpleContainer;
    }

    function createTinyElements(TestTiny = defineTinyClass()) {
        let tiny1 = new TestTiny(40, 5, "#FF0000");
        tiny1.getLayer = ()=>"up";
        let tiny2 = new TestTiny(30, 10, "#00FF00");
        tiny2.getLayer = ()=>"middle";
        let tiny3 = new TestTiny(20, 20, "#0000FF");
        tiny3.getLayer = ()=>"middle";
        let tiny4 = new TestTiny(10, 30, "#FFFF00");
        tiny4.getLayer = ()=>"down";
        let tiny5 = new TestTiny(5, 40, "#FF00FF");
        tiny5.getLayer = ()=>"down";
        let tiny1Html = html(tiny1);
        let tiny2Html = html(tiny2);
        let tiny3Html = html(tiny3);
        let tiny4Html = html(tiny4);
        let tiny5Html = html(tiny5);
        return {tiny1, tiny2, tiny3, tiny4, tiny5, tiny1Html, tiny2Html, tiny3Html, tiny4Html, tiny5Html};
    }

    function getHtmlForSimpleContainer() {
        let containerStartHtml = '<g transform="matrix(1 0 0 1 0 0)" stroke="#0F0F0F"><g><g><rect x="-50" y="-75" width="100" height="150" fill="#0A0A0A"></rect></g><g>';
        let containerEndHtml = '</g></g></g>';
        return {containerStartHtml, containerEndHtml}
    }

    it("Uses a simple container", ()=>{
        let TestSimpleContainer = defineSimpleContainerClass();
        let container = new TestSimpleContainer(100, 150);
        let {tiny1, tiny2, tiny3, tiny4, tiny1Html, tiny2Html, tiny3Html, tiny4Html} = createTinyElements();
        let {containerStartHtml, containerEndHtml} = getHtmlForSimpleContainer();
        // Add op.
        container.addChild(tiny1).addChild(tiny2).addChild(tiny3);
        assert(container.children).arrayEqualsTo([tiny1, tiny2, tiny3]);
        assert(html(container)).equalsTo(containerStartHtml+tiny1Html+tiny2Html+tiny3Html+containerEndHtml);
        // Replace op.
        container.replaceChild(tiny2, tiny4);
        assert(container.children).arrayEqualsTo([tiny1, tiny4, tiny3]);
        assert(html(container)).equalsTo(containerStartHtml+tiny1Html+tiny4Html+tiny3Html+containerEndHtml);
        // Remove op.
        container.removeChild(tiny3);
        assert(container.children).arrayEqualsTo([tiny1, tiny4]);
        assert(html(container)).equalsTo(containerStartHtml+tiny1Html+tiny4Html+containerEndHtml);
        // Insert op.
        container.insertChild(tiny4, tiny2);
        assert(container.children).arrayEqualsTo([tiny1, tiny2, tiny4]);
        assert(html(container)).equalsTo(containerStartHtml+tiny1Html+tiny2Html+tiny4Html+containerEndHtml);
        // Clear op.
        container.clearChildren();
        assert(container.children).arrayEqualsTo([]);
        assert(html(container)).equalsTo(containerStartHtml+containerEndHtml);
    });

    function copyContainer(table, container) {
        container.setLocation(new Point2D(100, 100));
        Context.selection.selectOnly(container);
        Context.copyPaste.copyModel(Context.selection.selection());
        Context.copyPaste.pasteModel();
        let children = table.children;
        assert(children.size).equalsTo(2);
        return findChild(table, 0, 0);
    }

    it("Copies a simple container", ()=>{
        let table = putTable();
        let TestSimpleContainer = defineSimpleContainerClass();
        makeSelectable(TestSimpleContainer);
        let container = new TestSimpleContainer(100, 150);
        let {tiny1, tiny2} = createTinyElements();
        container.addChild(tiny1).addChild(tiny2);
        table.addChild(container);
        let copy = copyContainer(table, container);
        assert(copy).isDefined();
        assert(copy===container).isFalse();
        assert(copy.children.length).equalsTo(2);
        assert(copy._root.innerHTML).equalsTo(container._root.innerHTML);
    });

    it("Undoes/Redoes a simple container", ()=>{
        let table = putTable();
        let TestSimpleContainer = defineSimpleContainerClass();
        makeSelectable(TestSimpleContainer);
        let container = new TestSimpleContainer(100, 150);
        container.setLocation(new Point2D(100, 100));
        table.addChild(container);
        let {tiny1, tiny2} = createTinyElements();
        container.addChild(tiny1);
        let htmlBeforeAdd = container._root.innerHTML;
        Context.memento.opened = true;
        Context.memento.open();
        container.addChild(tiny2);
        let htmlAfterAdd = container._root.innerHTML;
        assert(htmlBeforeAdd === htmlAfterAdd).isFalse();
        Context.memento.undo();
        assert(container._root.innerHTML).equalsTo(htmlBeforeAdd);
        Context.memento.redo();
        assert(container._root.innerHTML).equalsTo(htmlAfterAdd);
    });

    function defineMultiLayeredContainerClass() {
        class TestMultiLayeredContainer extends SigmaElement {
            constructor(width, height) {
                super(width, height);
                let background = new Rect(-width / 2, -height / 2, width, height)
                    .attrs({fill:"#0A0A0A"});
                this._initShape(background);
            }
        }
        makeShaped(TestMultiLayeredContainer);
        makeContainer(TestMultiLayeredContainer);
        makeContainerMultiLayered(TestMultiLayeredContainer, {layers:["up", "middle", "down"]});
        makeContainerASupport(TestMultiLayeredContainer);
        return TestMultiLayeredContainer;
    }

    function getHtmlForMultiLayeredContainer() {
        let containerStartHtml = '<g transform="matrix(1 0 0 1 0 0)" stroke="#0F0F0F"><g><g><rect x="-50" y="-75" width="100" height="150" fill="#0A0A0A"></rect></g><g>';
        let containerEndHtml = '</g></g></g>';
        let newLayer = '<g>';
        let endLayer = '</g>';
        return {containerStartHtml, newLayer, endLayer, containerEndHtml}
    }

    it("Uses a multi layered container", ()=>{
        let TestMultiLayeredContainer = defineMultiLayeredContainerClass();
        let container = new TestMultiLayeredContainer(100, 150);
        let {tiny1, tiny2, tiny3, tiny4, tiny1Html, tiny2Html, tiny3Html, tiny4Html} = createTinyElements();
        let {containerStartHtml, newLayer, endLayer, containerEndHtml} = getHtmlForMultiLayeredContainer();
        // Add operation
        container.addChild(tiny1).addChild(tiny2).addChild(tiny3);
        assert(container.children).arrayEqualsTo([tiny1, tiny2, tiny3]);
        assert(html(container)).equalsTo(
            containerStartHtml+
            newLayer+tiny1Html+endLayer+
            newLayer+tiny2Html+tiny3Html+endLayer+
            newLayer+endLayer+
            containerEndHtml);
        // Replace op.
        container.replaceChild(tiny2, tiny4);
        assert(container.children).arrayEqualsTo([tiny1, tiny4, tiny3]);
        assert(html(container)).equalsTo(
            containerStartHtml+
            newLayer+tiny1Html+endLayer+
            newLayer+tiny3Html+endLayer+
            newLayer+tiny4Html+endLayer+
            containerEndHtml);
        // Remove op.
        container.removeChild(tiny3);
        assert(container.children).arrayEqualsTo([tiny1, tiny4]);
        assert(html(container)).equalsTo(
            containerStartHtml+
            newLayer+tiny1Html+endLayer+
            newLayer+endLayer+
            newLayer+tiny4Html+endLayer+
            containerEndHtml);
        // Insert op.
        container.insertChild(tiny4, tiny2);
        assert(container.children).arrayEqualsTo([tiny1, tiny2, tiny4]);
        assert(html(container)).equalsTo(
            containerStartHtml+
            newLayer+tiny1Html+endLayer+
            newLayer+tiny2Html+endLayer+
            newLayer+tiny4Html+endLayer+
            containerEndHtml);
        // Clear op.
        container.clearChildren();
        assert(container.children).arrayEqualsTo([]);
        assert(html(container)).equalsTo(
            containerStartHtml+
            newLayer+endLayer+
            newLayer+endLayer+
            newLayer+endLayer+
            containerEndHtml);
    });

    it("Inserts in a multi layered container (check all cases)", ()=>{
        let TestMultiLayeredContainer = defineMultiLayeredContainerClass();
        let container = new TestMultiLayeredContainer(100, 150);
        let {tiny1, tiny2, tiny3, tiny4, tiny1Html, tiny2Html, tiny3Html, tiny4Html} = createTinyElements();
        let {containerStartHtml, newLayer, endLayer, containerEndHtml} = getHtmlForMultiLayeredContainer();
        container.addChild(tiny1).addChild(tiny3);
        // First case : same layer
        container.insertChild(tiny3, tiny2);
        assert(html(container)).equalsTo(
            containerStartHtml+
            newLayer+tiny1Html+endLayer+
            newLayer+tiny2Html+tiny3Html+endLayer+
            newLayer+endLayer+
            containerEndHtml);
        // Second case : not same layer but there is a next one on the layer
        container.removeChild(tiny3);
        container.insertChild(tiny1, tiny3);
        assert(html(container)).equalsTo(
            containerStartHtml+
            newLayer+tiny1Html+endLayer+
            newLayer+tiny3Html+tiny2Html+endLayer+
            newLayer+endLayer+
            containerEndHtml);
        // Third case : not same layer and no next element on the given layer: insertion is a simple add
        container.insertChild(tiny3, tiny4);
        assert(html(container)).equalsTo(
            containerStartHtml+
            newLayer+tiny1Html+endLayer+
            newLayer+tiny3Html+tiny2Html+endLayer+
            newLayer+tiny4Html+endLayer+
            containerEndHtml);
    });

    it("Replace in a multi layered container (check all cases)", ()=>{
        let TestMultiLayeredContainer = defineMultiLayeredContainerClass();
        let container = new TestMultiLayeredContainer(100, 150);
        let {tiny1, tiny2, tiny3, tiny4, tiny1Html, tiny2Html, tiny3Html, tiny4Html} = createTinyElements();
        let {containerStartHtml, newLayer, endLayer, containerEndHtml} = getHtmlForMultiLayeredContainer();
        container.addChild(tiny1).addChild(tiny3);
        // First case : same layer
        container.replaceChild(tiny3, tiny2);
        assert(container.children).arrayEqualsTo([tiny1, tiny2]);
        assert(html(container)).equalsTo(
            containerStartHtml+
            newLayer+tiny1Html+endLayer+
            newLayer+tiny2Html+endLayer+
            newLayer+endLayer+
            containerEndHtml);
        // Second case : not same layer but there is a next one on the layer
        container.replaceChild(tiny1, tiny3);
        assert(container.children).arrayEqualsTo([tiny3, tiny2]);
        assert(html(container)).equalsTo(
            containerStartHtml+
            newLayer+endLayer+
            newLayer+tiny3Html+tiny2Html+endLayer+
            newLayer+endLayer+
            containerEndHtml);
        // Third case : not same layer and no next element on the given layer: insertion is a simple add
        container.replaceChild(tiny3, tiny4);
        assert(html(container)).equalsTo(
            containerStartHtml+
            newLayer+endLayer+
            newLayer+tiny2Html+endLayer+
            newLayer+tiny4Html+endLayer+
            containerEndHtml);
    });

    it("Copies a multilayered container", ()=>{
        let table = putTable();
        let TestMultiLayeredContainer = defineMultiLayeredContainerClass();
        makeSelectable(TestMultiLayeredContainer);
        let container = new TestMultiLayeredContainer(100, 150);
        let {tiny1, tiny2, tiny3} = createTinyElements();
        table.addChild(container);
        container.addChild(tiny1).addChild(tiny2).addChild(tiny3);
        let copy = copyContainer(table, container);
        assert(copy).isDefined();
        assert(copy===container).isFalse();
        assert(copy.children.length).equalsTo(3);
        assert(copy._root.innerHTML).equalsTo(container._root.innerHTML);
    });

    it("Undoes/Redoes a multilayered container", ()=>{
        let table = putTable();
        let TestMultiLayeredContainer = defineMultiLayeredContainerClass();
        let container = new TestMultiLayeredContainer(100, 150);
        let {tiny1, tiny2, tiny3, tiny4} = createTinyElements();
        table.addChild(container);
        container.addChild(tiny1).addChild(tiny2);
        let beforeHtml = html(container);
        Context.memento.opened=true;
        Context.memento.open();
        container.addChild(tiny3).addChild(tiny4);
        let afterHtml = html(container);
        Context.memento.undo();
        assert(html(container)).equalsTo(beforeHtml);
        Context.memento.redo();
        assert(html(container)).equalsTo(afterHtml);
    });

    function defineContainersAsLayersContainerClass() {
        class TestContainersAsLayersContainer extends SigmaElement {
            constructor(width, height) {
                super(width, height);
                let background = new Rect(-width / 2, -height / 2, width, height)
                    .attrs({fill:"#0A0A0A"});
                this._initShape(background);
            }
        }
        makeShaped(TestContainersAsLayersContainer);
        makeLayersWithContainers(TestContainersAsLayersContainer, {
            layersBuilder:()=>{
                return {
                    up:new SigmaLayer(),
                    middle:new SigmaLayer(),
                    down:new SigmaLayer()
                };
            }
        });
        makeContainerASupport(TestContainersAsLayersContainer);
        return TestContainersAsLayersContainer;
    }

    function getHtmlForContainersAsLayersContainer() {
        let containerStartHtml = '<g transform="matrix(1 0 0 1 0 0)" stroke="#0F0F0F"><g><g><rect x="-50" y="-75" width="100" height="150" fill="#0A0A0A"></rect></g><g>';
        let containerEndHtml = '</g></g></g>';
        let newLayer = '<g><g transform="matrix(1 0 0 1 0 0)"><g><g>';
        let endLayer = '</g></g></g></g>';
        return {containerStartHtml, newLayer, endLayer, containerEndHtml}
    }

    it("Uses a container of containers", ()=>{
        let TestContainersAsLayersContainer = defineContainersAsLayersContainerClass();
        let {containerStartHtml, newLayer, endLayer, containerEndHtml} = getHtmlForContainersAsLayersContainer();
        let container = new TestContainersAsLayersContainer(100, 150);
        // Empty container
        assert(html(container)).equalsTo(
            containerStartHtml+
            newLayer+endLayer+
            newLayer+endLayer+
            newLayer+endLayer+
            containerEndHtml);
        // Add operation
        let {tiny1, tiny2, tiny3, tiny4, tiny1Html, tiny2Html, tiny3Html, tiny4Html} = createTinyElements();
        container.addChild(tiny1).addChild(tiny2).addChild(tiny3);
        assert(container.children).unorderedEqualsTo([tiny1, tiny2, tiny3]);
        assert(html(container)).equalsTo(
            containerStartHtml+
            newLayer+tiny1Html+endLayer+
            newLayer+tiny2Html+tiny3Html+endLayer+
            newLayer+endLayer+
            containerEndHtml);
        // Replace op.
        container.replaceChild(tiny2, tiny4);
        assert(container.children).unorderedEqualsTo([tiny1, tiny4, tiny3]);
        assert(html(container)).equalsTo(
            containerStartHtml+
            newLayer+tiny1Html+endLayer+
            newLayer+tiny3Html+endLayer+
            newLayer+tiny4Html+endLayer+
            containerEndHtml);
        // Remove op.
        container.removeChild(tiny3);
        assert(container.children).unorderedEqualsTo([tiny1, tiny4]);
        assert(html(container)).equalsTo(
            containerStartHtml+
            newLayer+tiny1Html+endLayer+
            newLayer+endLayer+
            newLayer+tiny4Html+endLayer+
            containerEndHtml);
        // Insert op.
        container.insertChild(tiny4, tiny2);
        assert(container.children).unorderedEqualsTo([tiny1, tiny2, tiny4]);
        assert(html(container)).equalsTo(
            containerStartHtml+
            newLayer+tiny1Html+endLayer+
            newLayer+tiny2Html+endLayer+
            newLayer+tiny4Html+endLayer+
            containerEndHtml);
        // Clear op.
        container.clearChildren();
        assert(container.children).unorderedEqualsTo([]);
        assert(html(container)).equalsTo(
            containerStartHtml+
            newLayer+endLayer+
            newLayer+endLayer+
            newLayer+endLayer+
            containerEndHtml);
    });

    it("Inserts in a container of containers (check all cases)", ()=>{
        let TestContainersAsLayersContainer = defineContainersAsLayersContainerClass();
        let container = new TestContainersAsLayersContainer(100, 150);
        let {tiny1, tiny2, tiny3, tiny4, tiny1Html, tiny2Html, tiny3Html, tiny4Html} = createTinyElements();
        let {containerStartHtml, newLayer, endLayer, containerEndHtml} = getHtmlForContainersAsLayersContainer();
        container.addChild(tiny1).addChild(tiny3);
        // First case : same layer
        container.insertChild(tiny3, tiny2);
        assert(html(container)).equalsTo(
            containerStartHtml+
            newLayer+tiny1Html+endLayer+
            newLayer+tiny2Html+tiny3Html+endLayer+
            newLayer+endLayer+
            containerEndHtml);
        // Second case : not same layer but there is a next one on the layer
        container.removeChild(tiny3);
        container.insertChild(tiny1, tiny3);
        assert(html(container)).equalsTo(
            containerStartHtml+
            newLayer+tiny1Html+endLayer+
            newLayer+tiny2Html+tiny3Html+endLayer+
            newLayer+endLayer+
            containerEndHtml);
        // Third case : not same layer and no next element on the given layer: insertion is a simple add
        container.insertChild(tiny3, tiny4);
        assert(html(container)).equalsTo(
            containerStartHtml+
            newLayer+tiny1Html+endLayer+
            newLayer+tiny2Html+tiny3Html+endLayer+
            newLayer+tiny4Html+endLayer+
            containerEndHtml);
    });

    it("Replace in a container of containers (check all cases)", ()=>{
        let TestContainersAsLayersContainer = defineContainersAsLayersContainerClass();
        let container = new TestContainersAsLayersContainer(100, 150);
        let {tiny1, tiny2, tiny3, tiny4, tiny1Html, tiny2Html, tiny3Html, tiny4Html} = createTinyElements();
        let {containerStartHtml, newLayer, endLayer, containerEndHtml} = getHtmlForContainersAsLayersContainer();
        container.addChild(tiny1).addChild(tiny3);
        // First case : same layer
        container.replaceChild(tiny3, tiny2);
        assert(container.children).unorderedEqualsTo([tiny1, tiny2]);
        assert(html(container)).equalsTo(
            containerStartHtml+
            newLayer+tiny1Html+endLayer+
            newLayer+tiny2Html+endLayer+
            newLayer+endLayer+
            containerEndHtml);
        // Second case : not same layer but there is a next one on the layer
        container.replaceChild(tiny1, tiny3);
        assert(container.children).unorderedEqualsTo([tiny3, tiny2]);
        assert(html(container)).equalsTo(
            containerStartHtml+
            newLayer+endLayer+
            newLayer+tiny2Html+tiny3Html+endLayer+
            newLayer+endLayer+
            containerEndHtml);
        // Third case : not same layer and no next element on the given layer: insertion is a simple add
        container.replaceChild(tiny3, tiny4);
        assert(html(container)).equalsTo(
            containerStartHtml+
            newLayer+endLayer+
            newLayer+tiny2Html+endLayer+
            newLayer+tiny4Html+endLayer+
            containerEndHtml);
    });

    it("Copies a container of containers", ()=>{
        let table = putTable();
        let TestContainersAsLayersContainer = defineContainersAsLayersContainerClass();
        makeSelectable(TestContainersAsLayersContainer);
        let container = new TestContainersAsLayersContainer(100, 150);
        let {tiny1, tiny2, tiny3} = createTinyElements();
        table.addChild(container);
        container.addChild(tiny1).addChild(tiny2).addChild(tiny3);
        let copy = copyContainer(table, container);
        assert(copy).isDefined();
        assert(copy===container).isFalse();
        assert(copy.children.length).equalsTo(3);
        assert(copy._root.innerHTML).equalsTo(container._root.innerHTML);
    });

    it("Undoes/Redoes a container of containers", ()=>{
        let table = putTable();
        let TestContainersAsLayersContainer = defineContainersAsLayersContainerClass();
        let container = new TestContainersAsLayersContainer(100, 150);
        let {tiny1, tiny2, tiny3, tiny4} = createTinyElements();
        table.addChild(container);
        container.addChild(tiny1).addChild(tiny2);
        let beforeHtml = html(container);
        Context.memento.opened=true;
        Context.memento.open();
        container.addChild(tiny3).addChild(tiny4);
        let afterHtml = html(container);
        Context.memento.undo();
        assert(html(container)).equalsTo(beforeHtml);
        Context.memento.redo();
        assert(html(container)).equalsTo(afterHtml);
    });

    function defineZIndexContainerClass() {
        class TestZIndexContainer extends SigmaElement {
            constructor(width, height) {
                super(width, height);
                let background = new Rect(-width / 2, -height / 2, width, height)
                    .attrs({fill:"#0A0A0A"});
                this._initShape(background);
            }
        }
        makeShaped(TestZIndexContainer);
        makeContainer(TestZIndexContainer);
        makeContainerZindex(TestZIndexContainer);
        makeContainerASupport(TestZIndexContainer);
        return TestZIndexContainer;
    }

    function createTinyContainerElements() {
        let TestTiny = defineTinyClass();
        // Element must be containers...
        makeContainer(TestTiny);
        // ... and support (ZIndex ignore elements that are only part of other elements
        makeContainerASupport(TestTiny);
        return createTinyElements(TestTiny);
    }

    function getHtmlForZIndexContainer() {
        let containerStartHtml='<g transform="matrix(1 0 0 1 0 0)" stroke="#0F0F0F"><g><g><rect x="-75" y="-75" width="150" height="150" fill="#0A0A0A"></rect></g><g>';
        let startLayer='<g>';
        let endLayer='</g>';
        let startRootPedestal='<g>';
        let startPedestal='<g transform="matrix(1 0 0 1 0 0)">';
        let endPedestal='</g>';
        let containerEndHtml='</g></g></g>';
        return {containerStartHtml, startLayer, endLayer, startRootPedestal, startPedestal, endPedestal, containerEndHtml}
    }

    function createZIndexContainer() {
        let table = putTable();
        let TestZIndexContainer = defineZIndexContainerClass();
        let container = new TestZIndexContainer(150, 150);
        table.addChild(container);
        return {
            table, container, TestZIndexContainer
        };
    }

    it("Puts elements in a z-index container", ()=> {
        let {container} = createZIndexContainer();
        let {tiny1, tiny2, tiny3, tiny4, tiny1Html, tiny2Html, tiny3Html, tiny4Html} =
            createTinyContainerElements();
        let {containerStartHtml, startLayer, endLayer, startPedestal, startRootPedestal, endPedestal, containerEndHtml} =
            getHtmlForZIndexContainer();
        tiny1.addChild(tiny2.addChild(tiny3));
        container.addChild(tiny1);
        assert(html(container)).equalsTo(
            containerStartHtml+
            startLayer+startRootPedestal+tiny1Html+endPedestal+endLayer+
            startLayer+startPedestal+tiny2Html+endPedestal+endLayer+
            startLayer+startPedestal+tiny3Html+endPedestal+endLayer+
            startLayer+startPedestal+endPedestal+endLayer+
            containerEndHtml);
        assert(tiny1.__pass__).isDefined(); // All tinies are instrumented
        assert(tiny2.__pass__).isDefined();
        assert(tiny3.__pass__).isDefined();
        // Add an element at the top of the stack => a new layer is created on the ZIndex container.
        tiny3.addChild(tiny4);
        assert(html(container)).equalsTo(
            containerStartHtml+
            startLayer+startRootPedestal+tiny1Html+endPedestal+endLayer+
            startLayer+startPedestal+tiny2Html+endPedestal+endLayer+
            startLayer+startPedestal+tiny3Html+endPedestal+endLayer+
            startLayer+startPedestal+tiny4Html+endPedestal+endLayer+
            startLayer+startPedestal+endPedestal+endLayer+
            containerEndHtml);
        assert(tiny4.__pass__).isDefined();
    });

    it("Removes elements from a z-index container", ()=> {
        let {container} = createZIndexContainer();
        let {tiny1, tiny2, tiny3, tiny4, tiny5, tiny1Html, tiny2Html, tiny3Html, tiny4Html, tiny5Html} =
            createTinyContainerElements();
        let {containerStartHtml, startLayer, endLayer, startPedestal, startRootPedestal, endPedestal, containerEndHtml} =
            getHtmlForZIndexContainer();
        // Stacks are created outside container
        tiny1.addChild(tiny2);
        tiny3.addChild(tiny4.addChild(tiny5));
        let stack1Html = html(tiny1);
        let stack2Html = html(tiny3);
        // Container is initialized with one stack ony;
        let containerEmptyHtml = html(container);
        container.addChild(tiny1);
        let containerHtml = html(container);
        // Put 2nd stack on first stack => items are dispatched on z-index layers
        tiny2.addChild(tiny3);
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
        tiny2.removeChild(tiny3);
        assert(html(tiny3)).equalsTo(stack2Html);
        assert(tiny2.__pass__).isDefined(); // Tiny2 still instrumented
        assert(tiny3.__pass__).isNotDefined(); // Tiny3 is not instrumented anymore
        assert(html(container)).equalsTo(containerHtml);
        // Remove an item from the container => removed elements must be recombined too
        container.removeChild(tiny1);
        assert(html(tiny1)).equalsTo(stack1Html);
        assert(tiny1.__pass__).isNotDefined(); // Tiny1 is not instrumented anymore
        assert(html(container)).equalsTo(containerEmptyHtml);
    });

    it("Replaces an element in a z-index container", ()=> {
        let {containerStartHtml, startLayer, endLayer, startPedestal, startRootPedestal, endPedestal, containerEndHtml} =
            getHtmlForZIndexContainer();
        let {container} = createZIndexContainer();
        let {tiny1, tiny2, tiny3, tiny4, tiny1Html, tiny2Html, tiny3Html, tiny4Html} =
            createTinyContainerElements();
        // Stack is created outside container
        tiny1.addChild(tiny2);
        let stackHtml = html(tiny1);
        tiny3.addChild(tiny4);
        // Container is initialized with first stack
        container.addChild(tiny1);
        assert(html(container)).equalsTo(
            containerStartHtml+
            startLayer+startRootPedestal+tiny1Html+endPedestal+endLayer+
            startLayer+startPedestal+tiny2Html+endPedestal+endLayer+
            startLayer+startPedestal+endPedestal+endLayer+
            containerEndHtml);
        // Remove root item => removed elements are recombined.
        container.replaceChild(tiny1, tiny3);
        assert(html(container)).equalsTo(
            containerStartHtml+
            startLayer+startRootPedestal+tiny3Html+endPedestal+endLayer+
            startLayer+startPedestal+tiny4Html+endPedestal+endLayer+
            startLayer+startPedestal+endPedestal+endLayer+
            containerEndHtml);
        assert(html(tiny1)).equalsTo(stackHtml);
        // Remove an element on the stack => container takes control
        tiny3.replaceChild(tiny4, tiny1);
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
        let {container} = createZIndexContainer();
        let {tiny1, tiny2, tiny3, tiny4, tiny1Html, tiny2Html, tiny3Html, tiny4Html} =
            createTinyContainerElements();
        tiny2.addChild(tiny3);
        container.addChild(tiny1);
        container.insertChild(tiny1, tiny2);
        assert(html(container)).equalsTo(
            containerStartHtml+
            startLayer+startRootPedestal+tiny2Html+tiny1Html+endPedestal+endLayer+
            startLayer+startPedestal+endPedestal+startPedestal+tiny3Html+endPedestal+endLayer+
            startLayer+startPedestal+endPedestal+endLayer+
            containerEndHtml);
        tiny2.insertChild(tiny3, tiny4);
        assert(html(container)).equalsTo(
            containerStartHtml+
            startLayer+startRootPedestal+tiny2Html+tiny1Html+endPedestal+endLayer+
            startLayer+startPedestal+endPedestal+startPedestal+tiny4Html+tiny3Html+endPedestal+endLayer+
            startLayer+startPedestal+endPedestal+startPedestal+endPedestal+endLayer+
            containerEndHtml);
    });

    it("Clears a z-index container", ()=> {
        let {container} = createZIndexContainer();
        let {tiny1, tiny2, tiny3, tiny4, tiny1Html, tiny2Html, tiny3Html, tiny4Html} =
            createTinyContainerElements();
        let {containerStartHtml, startLayer, endLayer, startPedestal, startRootPedestal, endPedestal, containerEndHtml} =
            getHtmlForZIndexContainer();
        assert(html(container)).equalsTo(
            containerStartHtml+
            startLayer+startRootPedestal+endPedestal+endLayer+
            containerEndHtml);
        // Stacks are created outside container
        tiny1.addChild(tiny2);
        tiny3.addChild(tiny4);
        let tiny3StackHtml = html(tiny3);
        container.addChild(tiny1).addChild(tiny3);
        assert(html(container)).equalsTo(
            containerStartHtml+
            startLayer+startRootPedestal+tiny1Html+tiny3Html+endPedestal+endLayer+
            startLayer+startPedestal+tiny2Html+endPedestal+startPedestal+tiny4Html+endPedestal+endLayer+
            startLayer+startPedestal+endPedestal+startPedestal+endPedestal+endLayer+
            containerEndHtml);
        // Clear a tiny => ZIndex trump the call.
        tiny1.clearChildren();
        assert(html(container)).equalsTo(
            containerStartHtml+
            startLayer+startRootPedestal+tiny1Html+tiny3Html+endPedestal+endLayer+
            startLayer+startPedestal+endPedestal+startPedestal+tiny4Html+endPedestal+endLayer+
            startLayer+startPedestal+endPedestal+endLayer+
            containerEndHtml);
        assert(tiny2.__pass__).isNotDefined(); // Tiny2 is not instrumented anymore
        container.clearChildren();
        assert(html(container)).equalsTo(
            containerStartHtml+
            startLayer+startRootPedestal+endPedestal+endLayer+
            containerEndHtml);
        assert(html(tiny3)).equalsTo(tiny3StackHtml);
        assert(tiny1.__pass__).isNotDefined();
        assert(tiny3.__pass__).isNotDefined();
        assert(tiny4.__pass__).isNotDefined();
    });

    it("Puts several elements on same levels in a z-index container", ()=> {
        let {containerStartHtml, startLayer, endLayer, startPedestal, startRootPedestal, endPedestal, containerEndHtml} =
            getHtmlForZIndexContainer();
        let {container} = createZIndexContainer();
        let {tiny1, tiny2, tiny3, tiny4, tiny1Html, tiny2Html, tiny3Html, tiny4Html} =
            createTinyContainerElements();
        tiny1.addChild(tiny2);
        tiny3.addChild(tiny4);
        // Add two stacks
        container.addChild(tiny1);
        container.addChild(tiny3);
        // Stacks are splitted by levels
        assert(html(container)).equalsTo(
            containerStartHtml+
            startLayer+startRootPedestal+tiny1Html+tiny3Html+endPedestal+endLayer+
            startLayer+startPedestal+tiny2Html+endPedestal+startPedestal+tiny4Html+endPedestal+endLayer+
            startLayer+startPedestal+endPedestal+startPedestal+endPedestal+endLayer+
            containerEndHtml);
    });

    function getHtmlForMovedElementsInZIndexContainer() {
        let tiny1Html10_20 = '<g transform="matrix(1 0 0 1 10 20)" stroke="#0F0F0F"><g><g><rect x="-20" y="-2.5" width="40" height="5" fill="#FF0000"></rect></g><g></g></g></g>';
        let tiny2Html10_30 = '<g transform="matrix(1 0 0 1 10 30)" stroke="#0F0F0F"><g><g><rect x="-15" y="-5" width="30" height="10" fill="#00FF00"></rect></g><g></g></g></g>';
        let startPedestal10_20='<g transform="matrix(1 0 0 1 10 20)">';
        let startPedestal20_50='<g transform="matrix(1 0 0 1 20 50)">';
        return {tiny1Html10_20, tiny2Html10_30, startPedestal10_20, startPedestal20_50};
    }

    it("Add elements with random location in a z-index container", ()=> {
        let {containerStartHtml, startLayer, endLayer, startRootPedestal, endPedestal, containerEndHtml} =
            getHtmlForZIndexContainer();
        let {container} = createZIndexContainer();
        let {tiny1, tiny2} = createTinyContainerElements();
        tiny1.setLocation(new Point2D(10, 20));
        tiny2.setLocation(new Point2D(10, 30));
        tiny1.addChild(tiny2);
        container.addChild(tiny1);
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
        let {container} = createZIndexContainer();
        let {tiny1, tiny2, tiny1Html, tiny2Html} = createTinyContainerElements();
        tiny1.addChild(tiny2);
        container.addChild(tiny1);
        assert(html(container)).equalsTo(
            containerStartHtml+
            startLayer+startRootPedestal+tiny1Html+endPedestal+endLayer+
            startLayer+startPedestal+tiny2Html+endPedestal+endLayer+
            startLayer+startPedestal+endPedestal+endLayer+
            containerEndHtml);
        // Add an element at the top of the stack => a new layer is created on the ZIndex container.
        tiny1.setLocation(new Point2D(10, 20));
        tiny2.setLocation(new Point2D(10, 30));
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
        let {table, TestZIndexContainer, container} = createZIndexContainer();
        let {tiny1, tiny2} = createTinyContainerElements();
        makeSelectable(TestZIndexContainer);
        container.setLocation(new Point2D(100, 100));
        tiny1.setLocation(new Point2D(10, 20));
        tiny2.setLocation(new Point2D(10, 30));
        tiny1.addChild(tiny2);
        container.addChild(tiny1);
        let copy = copyContainer(table, container);
        assert(copy).isDefined();
        assert(copy===container).isFalse();
        assert(copy._root.innerHTML).equalsTo(container._root.innerHTML);
    });

    it("Undoes/Redoes a z-index container", ()=> {
        let {TestZIndexContainer, container} = createZIndexContainer();
        let {tiny1, tiny2, tiny3, tiny4} = createTinyContainerElements();
        makeSelectable(TestZIndexContainer);
        container.setLocation(new Point2D(100, 100));
        tiny1.setLocation(new Point2D(10, 20));
        tiny2.setLocation(new Point2D(10, 30));
        tiny1.addChild(tiny2);
        container.addChild(tiny1);
        let htmlBefore = html(container);
        Context.memento.opened = true;
        Context.memento.open();
        // Make some updates...
        tiny1.setLocation(new Point2D(20, 0));
        tiny1.addChild(tiny3);
        container.addChild(tiny4);
        let htmlAfter = html(container);
        // Ensure something has changed...
        assert(htmlBefore===htmlAfter).isFalse();
        assert(tiny4.__pass__).isDefined(); // Tiny4 is instrumented in order to belongs on ZIndex container
        Context.memento.undo();
        assert(html(container)).equalsTo(htmlBefore);
        assert(tiny4.__pass__).isNotDefined();
        Context.memento.redo();
        assert(html(container)).equalsTo(htmlAfter);
        assert(tiny4.__pass__).isDefined();
    });

    function createComposedContainerClass() {
        class Content extends SigmaElement {
            constructor(width, height) {
                super(width, height);
                let background = new Rect(-width / 2, -height / 2, width, height)
                    .attrs({fill:"#A0A0A0"});
                this._initShape(background);
            }
        }
        makeShaped(Content);
        makeContainer(Content);
        makeContainerASupport(Content);
        makePart(Content);
        class TestComposedContainer extends SigmaElement {
            constructor(width, height) {
                super(width, height);
                let background = new Rect(-width / 2, -height / 2, width, height)
                    .attrs({fill:"#0A0A0A"});
                this._initShape(background);
                this._contentPane = new Content(width-10, height-10);
                this._addChild(this._contentPane)
            }
        }
        makeShaped(TestComposedContainer);
        makeContainer(TestComposedContainer);
        TestComposedContainer.prototype.addChild = function(element) {
            this._contentPane.addChild(element);
            return this;
        };
        TestComposedContainer.prototype.removeChild = function(element) {
            this._contentPane.removeChild(element);
            return this;
        };
        return TestComposedContainer;
    }

    it("Puts a composed element in a zIndex container : parts are not handled by zIndex container", ()=> {
        let {containerStartHtml, startLayer, endLayer, startPedestal, startRootPedestal, endPedestal, containerEndHtml} =
            getHtmlForZIndexContainer();
        let {container} = createZIndexContainer();
        let TestComposedContainer = createComposedContainerClass();
        let composed = new TestComposedContainer(50, 50);
        let composedHtml = html(composed);
        let {tiny1, tiny2, tiny3, tiny4, tiny1Html, tiny2Html, tiny3Html, tiny4Html} = createTinyContainerElements();
        tiny1.addChild(tiny2);
        composed.addChild(tiny1);
        // Insert a container containing some elements
        container.addChild(composed);
        assert(html(container)).equalsTo(
            containerStartHtml+
            startLayer+startRootPedestal+composedHtml+endPedestal+endLayer+
            startLayer+startPedestal+tiny1Html+endPedestal+endLayer+
            startLayer+startPedestal+tiny2Html+endPedestal+endLayer+
            startLayer+startPedestal+endPedestal+endLayer+
            containerEndHtml);
        assert(composed.__pass__).isNotDefined();
        assert(composed._contentPane.__pass__).isDefined(); // Part is handled by zIndex container
        assert(tiny1.__pass__).isDefined(); // But its elements, are.
        assert(tiny2.__pass__).isDefined();
        tiny3.addChild(tiny4);
        // Add elements in a composed container already on the zIndex container
        composed.addChild(tiny3);
        assert(html(container)).equalsTo(
            containerStartHtml+
            startLayer+startRootPedestal+composedHtml+endPedestal+endLayer+
            startLayer+startPedestal+tiny1Html+tiny3Html+endPedestal+endLayer+
            startLayer+startPedestal+tiny2Html+endPedestal+startPedestal+tiny4Html+endPedestal+endLayer+
            startLayer+startPedestal+endPedestal+startPedestal+endPedestal+endLayer+
            containerEndHtml);
        assert(tiny3.__pass__).isDefined(); // But its elements, are.
        assert(tiny4.__pass__).isDefined();
        // Remove composed container
        container.removeChild(composed);
        assert(html(container)).equalsTo(
            containerStartHtml+
            startLayer+startRootPedestal+endPedestal+endLayer+
            containerEndHtml);
        assert(composed._contentPane.__pass__).isNotDefined();
        assert(tiny1.__pass__).isNotDefined();
        assert(tiny2.__pass__).isNotDefined();
        assert(tiny3.__pass__).isNotDefined();
        assert(tiny4.__pass__).isNotDefined();
    });

    it("Puts a sandbox in a zIndex container : nothing, inside sandbox is handled by zIndex container", ()=> {
        let {containerStartHtml, startLayer, endLayer, startPedestal, startRootPedestal, endPedestal, containerEndHtml} =
            getHtmlForZIndexContainer();
        let {container} = createZIndexContainer();
        let TestComposedContainer = createComposedContainerClass();
        makeContainerASandBox(TestComposedContainer);
        let composed = new TestComposedContainer(50, 50);
        let {tiny1, tiny2} = createTinyContainerElements();
        tiny1.addChild(tiny2);
        composed.addChild(tiny1);
        let composedHtml = html(composed);
        // Test begins here...
        container.addChild(composed);
        assert(html(container)).equalsTo(
            containerStartHtml+
            startLayer+startRootPedestal+composedHtml+endPedestal+endLayer+
            containerEndHtml);
        assert(composed.__pass__).isNotDefined();
        assert(composed._contentPane.__pass__).isNotDefined();
        assert(tiny1.__pass__).isNotDefined();
        assert(tiny2.__pass__).isNotDefined();
    });

    it("Check a simple board layer", ()=> {
        let startContainerHtml= '<g transform="matrix(1 0 0 1 0 0)"><g><g>';
        let endContainerHtml = '</g></g></g>';
        let container = new SigmaLayer();
        assert(html(container)).equalsTo(startContainerHtml+endContainerHtml);
        let TestTiny = defineTinyClass();
        let tiny1 = new TestTiny(10, 10);
        let tiny2 = new TestTiny(10, 10);
        container.addChild(tiny1).addChild(tiny2);
        assert(html(container)).equalsTo(startContainerHtml+html(tiny1)+html(tiny2)+endContainerHtml);
    });

});