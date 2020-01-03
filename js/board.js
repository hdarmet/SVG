'use strict';

import {
    Rect, Colors
} from "./graphics.js";
import {
    Context, Memento, Selection, Canvas, setLayeredGlassStrategy
} from "./toolkit.js";
import {
    DragSwitchOperation, DragMoveSelectionOperation, DragRotateSelectionOperation
} from "./drag-and-drop.js";
import {
    SigmaElement, SigmaTable,
} from "./base-element.js";
import {
    makeRotatable, makeShaped, makeDraggable, makeClickable, makeSelectable, makeDeletable
} from "./core-mixins.js";
import {
    makeContainerMultiLayered, makeLayered, makeZindexSupport
} from "./container-mixins.js";
import {
    ToolCommandPopup, ToolExpandablePopup, ToolExpandablePanel,
    ToolGridPanelContent, ToolCell,
    makeMenuOwner, TextMenuOption, TextToggleMenuOption, CheckMenuOption, ColorChooserMenuOption, SigmaItemBuilder,
} from "./tools.js";
import {
    zoomInCommand, zoomOutCommand, zoomExtentCommand, zoomSelectionCommand,
    copyCommand, pasteCommand, redoCommand, undoCommand, deleteCommand
} from "./standard-facilities.js";
import {
    SigmaBox, SigmaImageBox, SigmaCounter, SigmaDie, SigmaMap, SigmaHandle, SigmaTarget, makeConfigurableMap,
    SigmaContent
} from "./elements.js"
import {
    makeCarrier, makeCarriable, makeGravitationContainer
} from "./physics.js";


Context.rotateOrMoveDrag = new DragSwitchOperation()
    .add(()=>true, DragRotateSelectionOperation.instance)
    .add(()=>true, DragMoveSelectionOperation.instance);

class SigmaDummy extends SigmaElement {

    constructor(width, height, backgroundColor) {
        super(width, height);
        let background = new Rect(-width/2, -height/2, width, height);
        background.fill = backgroundColor;
        this._initShape(background);
        this._dragOperation(function() {return Context.rotateOrMoveDrag;});
        this._clickHandler(function() {()=>{console.log("clicked");}});
        this._doubleClickHandler(function() {()=> {console.log("2 clicked");}});
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
makeSelectable(SigmaDummy);
makeMoveable(SigmaDummy);
makeRotatable(SigmaDummy);
makeShaped(SigmaDummy);
makeDraggable(SigmaDummy);
makeClickable(SigmaDummy);
makeMenuOwner(SigmaDummy);
makeLayered(SigmaDummy, {layer:"_up"});

makeContainerMultiLayered(SigmaTable, {layers:["_down",  "_middle", "_up"]});
setLayeredGlassStrategy(SigmaTable, {layers:["_down",  "_middle", "_up"]});
makeContainerMultiLayered(SigmaBox, {layers:["_down",  "_middle", "_up"]});
setLayeredGlassStrategy(SigmaBox, {layers:["_up", "_middle", "_down"]});
makeLayered(SigmaBox, {layer:"_down"});
makeDeletable(SigmaCounter);
makeCarrier(SigmaCounter);
makeCarriable(SigmaCounter);

Canvas.instance = new Canvas("#Sigma", "width:100%;height:100%;margin:0;padding:0;overflow:hidden;");
Canvas.instance.manageMenus();
Selection.instance = new Selection();

let toggle = true;

function createCommandPopup() {
    let cmdPopup = new ToolCommandPopup(78, 32).display(39, 16);
    copyCommand(cmdPopup);
    pasteCommand(cmdPopup);
    cmdPopup.addMargin();
    zoomInCommand(cmdPopup);
    zoomOutCommand(cmdPopup);
    zoomExtentCommand(cmdPopup);
    zoomSelectionCommand(cmdPopup);
    cmdPopup.addMargin();
    undoCommand(cmdPopup);
    redoCommand(cmdPopup);
    cmdPopup.addMargin();
    deleteCommand(cmdPopup);
    /*
    cmdPopup.add(new ToolCommand("./images/icons/copy_on.svg", () => {
        console.log("commands")
    }, 66));
    */
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

    paletteContent.addCell(new SigmaItemBuilder([new SigmaDummy(30, 20, "#0000FF")]));
    paletteContent.addCell(new SigmaItemBuilder([new SigmaImageBox(150, 200, 10, Colors.BLACK, "./images/wood3.jpg", "./images/wood3.jpg", "./images/wood3.jpg")]));
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

let area = new SigmaTable(4000, 3000, "#A0A0A0");
Canvas.instance.putOnBase(area);

let dummy1 = new SigmaDummy(30, 20, "#FF0000");
let dummy2 = new SigmaDummy(30, 20, "#00FF00");
let box1 = new SigmaImageBox(150, 200, 10, Colors.BLACK, "./images/wood3.jpg", "./images/wood3.jpg", "./images/wood3.jpg");
box1.orientation=90;

class SigmaCollisionContent extends SigmaContent {
    constructor(...args) {
        super(...args);
    }

    _memento() {
        let memento = super._memento();
        if (memento.children && memento.children.size===4) error();
        return memento;
    }
    _revert(memento) {
        super._revert(memento);
    }
}
//makeCollisionContainer(SigmaCollisionContent, element=>element instanceof SigmaCounter, {all:true});
makeGravitationContainer(SigmaCollisionContent, {
    predicate: element => element instanceof SigmaCounter,
    bordersCollide: {all: true}
});


class SigmaCollisionBox extends SigmaBox {
    constructor(...args) {
        super(...args);
    }
    initBoxContent(width, height, margin, strokeColor, backgroundColor) {
        return new SigmaCollisionContent(this, width-margin/2, height-margin/2, strokeColor, backgroundColor);
    }
}
window.box2 = new SigmaCollisionBox(150, 200, 10, Colors.BLACK, Colors.LIGHT_GREY);

area.add(dummy1);
area.add(dummy2);
area.add(box1);
area.add(box2);

let counter1 = new SigmaCounter(40, 40, Colors.GREY, "./images/JemmapesRecto1_001.jpg", "./images/JemmapesVerso1_001.jpg");
area.add(counter1);
let counter2 = new SigmaCounter(50, 50, Colors.GREY, "./images/JemmapesRecto1_001.jpg", "./images/JemmapesVerso1_001.jpg");
area.add(counter2);

class SigmaHexMap extends SigmaMap {
    constructor(...args) {
        super(...args);
    }

    get handlePositions() {
        return this.layerChildren("configuration")
            .filter(element=>element instanceof SigmaTarget)
            .map(handle=>{return {x:handle.lx, y:handle.ly}});
    }

}
makeLayered(SigmaHexMap, {layer:"_down"});

makeZindexSupport(SigmaHexMap);

makeConfigurableMap(SigmaHexMap, element=>element instanceof SigmaCounter, function(element) {
   return this.parent.handlePositions;
});

let map1 = new SigmaHexMap(1256, 888, Colors.GREY, "./images/Jemmapes.jpg");
area.add(map1);
let d8 = new SigmaDie(50, 50, "none", "./images/game/d8.png",
    {x:16, y:16, width:90, height:104}, {x:130, y:16, width:90, height:104}, {x:244, y:16, width:90, height:104},
    {x:72, y:123, width:90, height:104}, {x:187, y:123, width:90, height:104},
    {x:16, y:230, width:90, height:104}, {x:130, y:230, width:90, height:104}, {x:244, y:230, width:90, height:104});
area.add(d8);

let handle = new SigmaHandle();
area.add(handle);

let target = new SigmaTarget(16, Colors.RED);
map1.add(target);

Memento.instance.opened = true;