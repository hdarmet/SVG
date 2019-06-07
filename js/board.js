'use strict';

import {Rect, Rotation, Colors} from "./svgbase.js";
import {Context, Memento, Selection, Canvas, BoardElement, BoardTable,
    makeMoveable, makeRotatable, makeShaped, makeDraggable, makeClickable, makeSelectable, DragSwitchOperation} from "./toolkit.js";
import {makeMenuOwner, TextMenuOption, TextToggleMenuOption, CheckMenuOption, ColorChooserMenuOption} from "./tools.js";
import {BoardBox, BoardImageBox} from "./elements.js";

Context.selection = new Selection();
Context.canvas = new Canvas("#board", 800, 400);
Context.canvas.manageMenus();

let area = new BoardTable(800, 400, "#A0A0A0");
Context.canvas.putOnBase(area);

Context.rotateOrMoveDrag = new DragSwitchOperation()
    .add(()=>true, Context.rotateDrag)
    .add(()=>true, Context.moveDrag);

class BoardDummy extends BoardElement {

    constructor(width, height, backgroundColor) {
        super();
        let background = new Rect(-width/2, -height/2, width, height);
        background.fill = backgroundColor;
        this._root.add(this._initRotatable().add(this._initShape(background)));
        this._dragOperation(Context.rotateOrMoveDrag);
        this._clickHandler(()=>{console.log("clicked");});
        this._doubleClickHandler(()=>{console.log("2 clicked");});
        this.addMenuOption(new TextMenuOption("click me", ()=>console.log("click me")));
        this.addMenuOption(new TextMenuOption("active me", ()=>console.log("active me")));
        this.addMenuOption(new TextToggleMenuOption("black", "white",
            function() {this.cl="black"},
            function() {this.cl="white"},
            function() {return this.cl==="black";}, ()=>true));
        this.addMenuOption(new CheckMenuOption("good", true, (flag)=>{console.log("Checked ? "+flag)}));
        this.addMenuOption(new ColorChooserMenuOption("color",
            ["#000000", "#FF0000", "#00FF00", "#0000FF",
             "#00FFFF", "#FF00FF", "#FFFF00", "#FFFFFF"], color=>{console.log("Color ? "+color)}));
    }

    get color() {
        return this.shape.fill;
    }

}
makeSelectable(BoardDummy);
makeMoveable(BoardDummy);
makeRotatable(BoardDummy);
makeShaped(BoardDummy);
makeDraggable(BoardDummy);
makeClickable(BoardDummy);
makeMenuOwner(BoardDummy);

let dummy1 = new BoardDummy(30, 20, "#FF0000");
let dummy2 = new BoardDummy(30, 20, "#00FF00");
let box1 = new BoardImageBox(150, 200, 10, Colors.BLACK, "./images/wood3.jpg", "./images/wood3.jpg");
let box2 = new BoardBox(150, 200, 10, Colors.BLACK, Colors.LIGHT_GREY);

area.add(dummy1);
area.add(dummy2);
area.add(box1);
area.add(box2);

Context.memento.opened = true;