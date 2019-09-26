'use strict';

import {
    describe, it, before, assert, cloneNode, findChild
} from "./test-toolkit.js";
import {
    setRef, html, Context, Selection, Canvas
} from "../js/toolkit.js";
import {
    BoardTable, BoardElement, makeFramed, makeFillUpdatable, makeStrokeUpdatable, makeSelectable, makeSingleImaged
} from "../js/base-element.js";
import {
    Colors
} from "../js/graphics.js";

describe("Basic elements", ()=> {

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

    function defineFramedElementClass() {
        class ElementClass extends BoardElement {
            constructor(width, height, strokeColor, fillColor) {
                super(width, height);
                this._initFrame(width, height, strokeColor, fillColor);
            }
        }
        makeFramed(ElementClass);
        return ElementClass;
    }

    it("Creates a simple framed element", ()=>{
        let table = putTable();
        let ElementClass = defineFramedElementClass();
        let element = new ElementClass(20, 30, Colors.BLACK, Colors.CRIMSON);
        table.add(element);
        assert(html(element)).equalsTo('<g transform="matrix(1 0 0 1 0 0)"><g><g><rect x="-10" y="-15" width="20" height="30" stroke="#0F0F0F" fill="#dc143c"></rect></g></g></g>');
    });

    function getFramesElementHtml() {
        let redElement = '<g transform="matrix(1 0 0 1 0 0)"><g><g><rect x="-10" y="-15" width="20" height="30" fill="#dc143c" stroke="#0F0F0F" stroke-width="3"></rect></g></g></g>';
        let blackElement = '<g transform="matrix(1 0 0 1 0 0)"><g><g><rect x="-10" y="-15" width="20" height="30" fill="#0F0F0F" stroke="#dc143c" stroke-width="4"></rect></g></g></g>';
        return {redElement, blackElement};
    }

    it("Creates a framed element with stroke and fill management", ()=>{
        let table = putTable();
        class ElementClass extends defineFramedElementClass() {
            constructor(width, height, strokeWidth, strokeColor, fillColor) {
                super(width, height, Colors.NONE, Colors.NONE)
                this._initFill({fillColor});
                this._initStroke({strokeWidth, strokeColor});
            }
        }
        makeStrokeUpdatable(ElementClass);
        makeFillUpdatable(ElementClass);
        let {redElement, blackElement} = getFramesElementHtml();
        let element = new ElementClass(20, 30, 3, Colors.BLACK, Colors.CRIMSON);
        table.add(element);
        assert(html(element)).equalsTo(redElement);
        assert(element.fillColor).equalsTo(Colors.CRIMSON);
        assert(element.strokeColor).equalsTo(Colors.BLACK);
        assert(element.strokeWidth).equalsTo(3);
        element.fillColor = Colors.BLACK;
        element.strokeColor = Colors.CRIMSON;
        element.strokeWidth = 4;
        assert(html(element)).equalsTo(blackElement);
    });

    it("Undo/Redo a framed element with stroke and fill management", ()=>{
        let table = putTable();
        class ElementClass extends defineFramedElementClass() {
            constructor(width, height, strokeWidth, strokeColor, fillColor) {
                super(width, height, Colors.NONE, Colors.NONE)
                this._initFill({fillColor});
                this._initStroke({strokeWidth, strokeColor});
            }
        }
        makeStrokeUpdatable(ElementClass);
        makeFillUpdatable(ElementClass);
        let {redElement, blackElement} = getFramesElementHtml();
        let element = new ElementClass(20, 30, 3, Colors.BLACK, Colors.CRIMSON);
        table.add(element);
        Context.memento.opened = true;
        Context.memento.open();
        element.fillColor = Colors.BLACK;
        element.strokeColor = Colors.CRIMSON;
        element.strokeWidth = 4;
        Context.memento.undo();
        assert(html(element)).equalsTo(redElement);
        assert(element.fillColor).equalsTo(Colors.CRIMSON);
        assert(element.strokeColor).equalsTo(Colors.BLACK);
        assert(element.strokeWidth).equalsTo(3);
        Context.memento.redo();
        assert(html(element)).equalsTo(blackElement);
    });

    function copyElement(table, element) {
        Context.selection.selectOnly(element);
        Context.copyPaste.copyModel(Context.selection.selection());
        Context.copyPaste.pasteModel();
        Context.selection.unselectAll();
        return findChild(table, 0, 0);
    }

    it("Copies a framed element with stroke and fill management", ()=>{
        let table = putTable();
        class ElementClass extends defineFramedElementClass() {
            constructor(width, height, strokeWidth, strokeColor, fillColor) {
                super(width, height, Colors.NONE, Colors.NONE)
                this._initFill({fillColor});
                this._initStroke({strokeWidth, strokeColor});
            }
        }
        makeStrokeUpdatable(ElementClass);
        makeFillUpdatable(ElementClass);
        makeSelectable(ElementClass);
        let element = new ElementClass(20, 30, 3, Colors.BLACK, Colors.CRIMSON);
        element.setLocation(100, 100);
        table.add(element);
        let elementNode = cloneNode(element);
        let copy = copyElement(table, element);
        copy.setLocation(100, 100);
        assert(copy).hasNodeEqualsTo(elementNode);
        assert(copy.fillColor).equalsTo(Colors.CRIMSON);
        assert(copy.strokeColor).equalsTo(Colors.BLACK);
        assert(copy.strokeWidth).equalsTo(3);
    });

    function defineSingleImagedElementClass() {
        class ElementClass extends BoardElement {
            constructor(width, height, imageURL) {
                super(width, height);
                this._initImage(width, height, Colors.BLACK, imageURL);
            }
        }
        makeSingleImaged(ElementClass);
        return ElementClass;
    }

    function getImagesElementHtml() {
        let verticalElementHtml =
            '<g transform="matrix(1 0 0 1 0 0)"><g><g><g><image width="20" height="30" href="./home.png" x="-10" y="-15" preserveAspectRatio="none"></image><rect x="-10" y="-15" width="20" height="30" fill="none" stroke="#0F0F0F"></rect></g></g></g></g>'
        let horizontalElementHtml =
            '<g transform="matrix(1 0 0 1 0 0)"><g><g><g><image width="30" height="20" href="./home.png" x="-15" y="-10" preserveAspectRatio="none"></image><rect x="-15" y="-10" width="30" height="20" fill="none" stroke="#0F0F0F"></rect></g></g></g></g>'
        let backgroundHtml =
            '<image width="20" height="30" href="./home.png" x="-10" y="-15" preserveAspectRatio="none"></image>';
        let frameHtml =
            '<rect x="-10" y="-15" width="20" height="30" fill="none" stroke="#0F0F0F"></rect>';
        return {verticalElementHtml, horizontalElementHtml, backgroundHtml, frameHtml};
    }

    it("Creates a simple imaged element", ()=>{
        let {verticalElementHtml, horizontalElementHtml, backgroundHtml, frameHtml} = getImagesElementHtml();
        let table = putTable();
        let ElementClass = defineSingleImagedElementClass();
        let element = new ElementClass(20, 30, './home.png');
        table.add(element);
        assert(html(element)).equalsTo(verticalElementHtml);
        assert(element.background.outerHTML).equalsTo(backgroundHtml);
        assert(element.frame.outerHTML).equalsTo(frameHtml);
        assert(element.url, "./home.png");
        assert(element.width).equalsTo(20);
        assert(element.height).equalsTo(30);
        element.width = 30;
        element.height = 20;
        assert(html(element)).equalsTo(horizontalElementHtml);
    });

    it("Copy/paste a simple imaged element", ()=>{
        let table = putTable();
        let ElementClass = defineSingleImagedElementClass();
        makeSelectable(ElementClass);
        let element = new ElementClass(20, 30, './home.png');
        element.setLocation(100, 100);
        table.add(element);
        let elementNode = cloneNode(element);
        let copy = copyElement(table, element);
        copy.setLocation(100, 100);
        assert(copy).hasNodeEqualsTo(elementNode);
        assert(copy.url, "./home.png");
        assert(copy.width).equalsTo(20);
        assert(copy.height).equalsTo(30);
    });

    it("Undo/redo on a simple imaged element update", ()=>{
        let {verticalElementHtml, horizontalElementHtml, backgroundHtml, frameHtml} = getImagesElementHtml();
        let table = putTable();
        let ElementClass = defineSingleImagedElementClass();
        let element = new ElementClass(20, 30, './home.png');
        table.add(element);
        Context.memento.opened = true;
        Context.memento.open();
        element.width = 30;
        element.height = 20;
        Context.memento.undo();
        assert(html(element)).equalsTo(verticalElementHtml);
        Context.memento.redo();
        assert(html(element)).equalsTo(horizontalElementHtml);
    });

});