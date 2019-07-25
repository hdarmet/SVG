'use strict';

import {
    Rect, Rotation, Colors
} from "./svgbase.js";
import {
    Context, Memento, Selection, Canvas, DragSwitchOperation,
    makeMultiLayeredGlass
} from "./toolkit.js";
import {
    BoardElement, BoardTable,
    makeMoveable, makeRotatable, makeShaped, makeDraggable, makeClickable, makeSelectable,
    makeContainerMultiLayered, makeLayered, makeContainerZindex,
} from "./base-element.js";
import {
    ToolCommandPopup, ToolCommand, ToolToggleCommand, ToolExpandablePopup, ToolExpandablePanel,
    ToolGridPanelContent, ToolCell,
    makeMenuOwner, TextMenuOption, TextToggleMenuOption, CheckMenuOption, ColorChooserMenuOption, BoardItemBuilder,
    zoomInCommand, zoomOutCommand, zoomExtentCommand, zoomSelectionCommand
} from "./tools.js";
import {
    BoardBox, BoardImageBox, BoardCounter, BoardDie, BoardMap, BoardHandle, BoardFrame, BoardTarget
} from "./elements.js";

Context.rotateOrMoveDrag = new DragSwitchOperation()
    .add(()=>true, Context.rotateSelectionDrag)
    .add(()=>true, Context.moveSelectionDrag);

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
makeLayered(BoardDummy, "_up");

makeMultiLayeredGlass("_down",  "_middle", "_up");
makeContainerMultiLayered(BoardTable, "_down",  "_middle", "_up");
makeContainerMultiLayered(BoardBox, "_down",  "_middle", "_up");
makeLayered(BoardBox, "_down");
makeLayered(BoardMap, "_down");
makeContainerZindex(BoardMap);

Context.selection = new Selection();
Context.canvas = new Canvas("#board", 1200, 600);
Context.canvas.manageMenus();

let toggle = true;

function createCommandPopup() {
    let cmdPopup = new ToolCommandPopup(78, 32).display(39, 16);
    zoomInCommand(cmdPopup);
    zoomOutCommand(cmdPopup);
    zoomExtentCommand(cmdPopup);
    zoomSelectionCommand(cmdPopup);
    cmdPopup.add(new ToolCommand("./images/icons/comments_on.svg", () => {
        console.log("commands")
    }));
    cmdPopup.add(new ToolCommand("./images/icons/copy_on.svg", () => {
        console.log("commands")
    }));
    cmdPopup.addMargin();
    cmdPopup.add(new ToolCommand("./images/icons/comments_on.svg", () => {
        console.log("commands")
    }));
    cmdPopup.add(new ToolToggleCommand("./images/icons/copy_on.svg", "./images/icons/copy_off.svg",
        () => {
            toggle = !toggle
        }, () => toggle));
    cmdPopup.add(new ToolCommand("./images/icons/copy_on.svg", () => {
        console.log("commands")
    }, 66));
    return cmdPopup;
}

function createPalettePopup() {
    class DummyCell extends ToolCell {
        constructor() {
            super();
            this._root.add(new Rect(-20, -20, 40, 40).attrs({fill: Colors.GREY}));
        }
    }

    let paletteContent = new ToolGridPanelContent(200, 80, 80);

    paletteContent.addCell(new BoardItemBuilder([new BoardDummy(30, 20, "#0000FF")]));
    paletteContent.addCell(new BoardItemBuilder([new BoardImageBox(150, 200, 10, Colors.BLACK, "./images/wood3.jpg", "./images/wood3.jpg", "./images/wood3.jpg")]));
    for (let index = 0; index < 10; index++) {
        paletteContent.addCell(new DummyCell());
    }
    let palettePopup = new ToolExpandablePopup(200, 350).display(-100, 175);
    palettePopup.addPanel(new ToolExpandablePanel("One", paletteContent));
    palettePopup.addPanel(new ToolExpandablePanel("Two", paletteContent));
    palettePopup.addPanel(new ToolExpandablePanel("Three", paletteContent));
    return palettePopup;
}

createCommandPopup();
createPalettePopup();

let area = new BoardTable(4000, 3000, "#A0A0A0");
Context.canvas.putOnBase(area);

let dummy1 = new BoardDummy(30, 20, "#FF0000");
let dummy2 = new BoardDummy(30, 20, "#00FF00");
let box1 = new BoardImageBox(150, 200, 10, Colors.BLACK, "./images/wood3.jpg", "./images/wood3.jpg", "./images/wood3.jpg");
box1.orientation=90;
let box2 = new BoardBox(150, 200, 10, Colors.BLACK, Colors.LIGHT_GREY);

area.add(dummy1);
area.add(dummy2);
area.add(box1);
area.add(box2);

let counter1 = new BoardCounter(40, 40, Colors.GREY, "./images/JemmapesRecto1_001.jpg", "./images/JemmapesVerso1_001.jpg");
area.add(counter1);
let counter2 = new BoardCounter(40, 40, Colors.GREY, "./images/JemmapesRecto1_001.jpg", "./images/JemmapesVerso1_001.jpg");
area.add(counter2);
let map1 = new BoardMap(1256, 888, Colors.GREY, "./images/Jemmapes.jpg");
area.add(map1);
let d8 = new BoardDie(50, 50, "none", "./images/game/d8.png",
    {x:16, y:16, width:90, height:104}, {x:130, y:16, width:90, height:104}, {x:244, y:16, width:90, height:104},
    {x:72, y:123, width:90, height:104}, {x:187, y:123, width:90, height:104},
    {x:16, y:230, width:90, height:104}, {x:130, y:230, width:90, height:104}, {x:244, y:230, width:90, height:104});
area.add(d8);

let handle = new BoardHandle();
area.add(handle);
let frame = new BoardFrame(100, 50);
map1.add(frame);
let target = new BoardTarget(16, Colors.RED);
map1.add(target);


Context.memento.opened = true;