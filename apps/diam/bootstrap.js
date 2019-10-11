'use strict';

import {
    Context, Canvas, Selection, DragOperation, makeNotCloneable
} from "../../js/toolkit.js";
import {
    BoardElement, BoardTable, BoardArea, makeDeletable, makeDraggable, makeFramed, makeSelectable, makeContainer,
    makeMoveable, makeSupport, makePart, makeClickable, makeShaped, makeContainerMultiLayered, makeLayered,
    makeGentleDropTarget
} from "../../js/base-element.js";
import {
    Colors, Group, Rect, Circle, Path, M, Q, L, C
} from "../../js/graphics.js";
import {
    Tools, BoardItemBuilder, copyCommand, deleteCommand, pasteCommand, redoCommand, ToolCommandPopup, undoCommand,
    zoomExtentCommand, zoomInCommand, zoomOutCommand, zoomSelectionCommand, ToolExpandablePanel, ToolExpandablePopup,
    ToolGridPanelContent, makeMenuOwner, TextMenuOption
} from "../../js/tools.js";
import {
    makeGravitationContainer, makeCarriable, makeCarrier, makePositioningContainer, addBordersToCollisionPhysic,
    addPhysicToContainer, createSlotsAndClipsPhysic, createGravitationPhysic, makeClipsOwner, makeSlotsOwner,
    createPositioningPhysic,
    Slot, Clip, PhysicSelector
} from "../../js/physics.js";
import {
    always, is
} from "../../js/misc.js";

class DIAMItem extends BoardElement {
    constructor({width, height}) {
        super(width, height);
        this._dragOperation(()=>Context.moveSelectionDrag);
        this._createContextMenu();
    }

    _createContextMenu() {}
}
makeSelectable(DIAMItem);
makeDraggable(DIAMItem);
makeMoveable(DIAMItem);
makeDeletable(DIAMItem);
makeClickable(DIAMItem);
makeMenuOwner(DIAMItem);

class DIAMSupport extends BoardElement {
    constructor({width, height, strokeColor, backgroundColor}) {
        super(width, height);
        this._initFrame(width, height, strokeColor, backgroundColor);
        this._createContextMenu();
    }

    _createContextMenu() {}

}
DIAMSupport.DOWN = "d";
DIAMSupport.MIDDLE = "m";
DIAMSupport.UP = "u";
makeFramed(DIAMSupport);
makeContainer(DIAMSupport);
makePart(DIAMSupport);
makeSupport(DIAMSupport);
makeMenuOwner(DIAMSupport);

export class KnobDragOperation extends DragOperation {
    constructor() {
        super();
    }

    accept(element, x, y, event) {
        if (!super.accept(element, x, y, event)) {
            return false;
        }
        let selectable = element.selectable;
        return selectable !== null && selectable.__dragOp
            ? selectable.__dragOp.accept(selectable, x, y, event)
            : false;
    }

    onDragStart(element, x, y, event) {
        let selectable = element.selectable;
        if (selectable.__dragOp) {
            selectable.__dragOp.onDragStart(selectable, x, y, event);
        }
    }

    onDragMove(element, x, y, event) {
        let selectable = element.selectable;
        if (selectable.__dragOp) {
            selectable.__dragOp.onDragMove(selectable, x, y, event);
        }
    }

    onDrop(element, x, y, event) {
        let selectable = element.selectable;
        if (selectable.__dragOp) {
            selectable.__dragOp.onDrop(selectable, x, y, event);
        }
    }
}
makeNotCloneable(KnobDragOperation);
KnobDragOperation.instance = new KnobDragOperation();

class DIAMKnob extends BoardElement {

    constructor({width, height, predicate}) {
        super(width, height);
        this._initShape(this._buildShape(width, height));
        this._predicate = predicate;
        this._dragOperation(function() {return KnobDragOperation.instance;});
    }

    _buildShape(width, height) {
        return new Path(
            M(-width/2, -height/2), L(-width/4, -height/2),
            C(width/2, -height/3, width/2, height/3, -width/4, height/2),
            L(-width/2, height/2), L(-width/2, -height/2))
            .attrs({
                fill: Colors.GREY,
                class: DIAMKnob.CLASS,
                stroke: Colors.NONE
            });
    }

    get target() {
        let parent = this.parent;
        while(parent) {
            if (this._predicate.call(this, parent)) {
                return parent;
            }
            parent = parent.parent;
        }
        return this.parent;
    }

    get selectable() {
        return this.target.selectable;
    }

}
DIAMKnob.CLASS = "handle";
makeShaped(DIAMKnob);
makePart(DIAMKnob);
makeDraggable(DIAMKnob);

class DIAMFasciaSupport extends BoardElement {
    constructor({width, height}) {
        super(width, height);
    }

    _acceptDrop(element, dragSet) {
        return element instanceof DIAMFascia &&
            element.width === this.width &&
            element.height === this.height;
    }

}
makeContainer(DIAMFasciaSupport);
makePart(DIAMFasciaSupport);
makeSupport(DIAMFasciaSupport);
makePositioningContainer(DIAMFasciaSupport, {
    predicate: function(element) {return this.host._acceptDrop(element);},
    positionsBuilder: element=>{return [{x:0, y:0}]}
});

class DIAMFascia extends DIAMItem {
    constructor({width, height, color}) {
        super({width, height});
        this._initFrame(width, height, Colors.BLACK, color);
    }
}
makeFramed(DIAMFascia);
makeContainer(DIAMFascia);
makeKnobOwner(DIAMFascia, {predicate:is(DIAMFasciaSupport)});

function makeHeaderOwner(superClass) {

    superClass.prototype._initHeader = function(headerHeight) {
        if (headerHeight) {
            this._header = this._createHeader(this.width, headerHeight);
            this._header.setLocation(0, -this.height/2+headerHeight/2);
            this._add(this._header);
        }
    };

    superClass.prototype._createHeader = function(width, height) {
        return new DIAMCover({width, height});
    }

}

function makeFooterOwner(superClass) {

    superClass.prototype._initFooter = function(footerHeight) {
        if (footerHeight) {
            this._footer = this._createFooter(this.width, footerHeight);
            this._footer.setLocation(0, this.height/2-footerHeight/2);
            this._add(this._footer);
        }
    };

    superClass.prototype._createFooter = function(width, height) {
        return new DIAMCover({width, height});
    }

}

function makeFasciaSupport(superClass) {

    superClass.prototype._initFasciaSupport = function(headerHeight=0, footerHeight=0) {
        let height = this.height-headerHeight-footerHeight;
        this._fasciaSupport = this._createFasciaSupport(this.width, height);
        this._fasciaSupport.setLocation(0, -this.height/2+headerHeight+height/2);
        this._add(this._fasciaSupport);
    };

    superClass.prototype._createFasciaSupport = function(width, height) {
        return new DIAMFasciaSupport({width, height});
    };

    let getTarget = superClass.prototype._dropTarget;
    superClass.prototype._dropTarget = function(element) {
        if (element instanceof DIAMFascia) {
            return this._fasciaSupport._dropTarget(element);
        }
        return getTarget ? getTarget.call(this, element) : this;
    };

}

function makeKnobOwner(superClass, {predicate}) {

    let superInit = superClass.prototype._init;
    superClass.prototype._init = function(...args) {
        superInit && superInit.call(this, ...args);
        let knob = this._createKnob(this.height);
        knob._setLocation(-this.width/2+this.height/2, 0);
        this._add(knob);
    };

    superClass.prototype._createKnob = function(size) {
        return new DIAMKnob({width:size, height:size, predicate});
    };
}

class DIAMCover extends DIAMSupport {
    constructor({width, height}) {
        super({width, height, strokeColor:Colors.BLACK, backgroundColor:Colors.LIGHTEST_GREY});
    }

    _acceptDrop(element, dragSet) {
        return element instanceof DIAMVisual &&
               element.width === this.width &&
               element.height === this.height;
    }
}
makePositioningContainer(DIAMCover, {
    predicate: function(element) {return this.host._acceptDrop(element);},
    positionsBuilder: element=>{return [{x:0, y:0}]}
});

class DIAMVisual extends DIAMItem {
    constructor({width, height, color}) {
        super({width, height});
        this._initFrame(width, height, Colors.BLACK, color);
        //this._add(new DIAMKnob({width:height, height, predicate:is(DIAMCover)}));
    }
}
makeFramed(DIAMVisual);
makeContainer(DIAMVisual);
makeKnobOwner(DIAMVisual, {predicate:is(DIAMCover)});

class DIAMBlister extends DIAMItem {

    constructor({width, height, clip, color}) {
        super({width, height, color});
        this._clip = new Clip(this, clip.x, clip.y);
        this._radius = clip.radius;
        this._addClips(this._clip);
        this._color = color;
        this._initShape(this.buildShape());
    }

    buildShape() {
        let base = new Group();
        let item = new Rect(-this.width / 2, -this.height / 2, this.width, this.height)
            .attrs({stroke: Colors.BLACK, fill:this._color});
        let hole = new Circle(this._clip.x, this._clip.y, this._radius)
            .attrs({ stroke: Colors.BLACK, fill: Colors.WHITE });
        base.add(item).add(hole);
        return base;
    }

}
makeShaped(DIAMBlister);
makeLayered(DIAMBlister, {
    layer:DIAMSupport.MIDDLE
});
makeClipsOwner(DIAMBlister);

/**
 * Class of bisters hook. Can set set on pane only.
 */
class DIAMHook extends DIAMItem {
    /**
     * Size of hooks is (for the moment) defaulted. To change it, change DIAMHook.HOOK_WIDTH and DIAMHook.HOOK_HEIGHT
     * constants instead.
     */
    constructor() {
        super({width:DIAMHook.HOOK_WIDTH, height:DIAMHook.HOOK_HEIGHT});
        this._initShape(this.buildShape());
        this._addSlots(new Slot(this, 0, 0));
    }

    buildShape() {
        function pathDirectives(w, b, h, r) {
            return [
                M(-w / 2, b), L(-w / 2, b - h + r),
                Q(-w / 2, b - h, 0, b - h), Q(w / 2, b - h, w / 2, b - h + r),
                L(w / 2, b), L(-w / 2, b)];
        }

        let base = new Group();
        let item = new Path(
            ...pathDirectives(
                DIAMHook.HOOK_WIDTH, DIAMHook.HOOK_HEIGHT / 2, DIAMHook.HOOK_HEIGHT, DIAMHook.HOOK_RADIUS
            ),
            ...pathDirectives(
                DIAMHook.HOOK_WIDTH - DIAMHook.HOOK_SIZE * 2, DIAMHook.HOOK_HEIGHT / 2,
                DIAMHook.HOOK_HEIGHT - DIAMHook.HOOK_SIZE, DIAMHook.HOOK_RADIUS - DIAMHook.HOOK_SIZE / 2
            )
        ).attrs({stroke: Colors.BLACK, fill: Colors.WHITE});
        base.add(item);
        return base;
    }
}
makeShaped(DIAMHook);
makeLayered(DIAMHook, {
    layer:DIAMSupport.UP
});
makeSlotsOwner(DIAMHook);
DIAMHook.HOOK_WIDTH = 10;
DIAMHook.HOOK_HEIGHT = 10;
DIAMHook.HOOK_RADIUS = 6;
DIAMHook.HOOK_SIZE = 2;

class DIAMBoxContent extends DIAMSupport {
    constructor({width, height, color=Colors.WHITE}) {
        super({width, height, strokeColor:Colors.GREY, backgroundColor:color});
    }
}
makePart(DIAMBoxContent);

class DIAMBox extends DIAMItem {

    constructor({width, height, clips, contentX, contentY, contentWidth, contentHeight, color, ...args}) {
        super({width, height, color});
        for (let clip of clips) {
            this._addClips(new Clip(this, clip.x, clip.y));
        }
        this._initShape(this.buildShape());
        this._boxContent = this._buildBoxContent(contentWidth, contentHeight, color, args);
        this._boxContent._setLocation(contentX, contentY);
        this._add(this._boxContent);
    }

    buildShape() {
        let base = new Group();
        let item = new Rect(-this.width / 2, -this.height / 2, this.width, this.height)
            .attrs({stroke: Colors.BLACK, fill:Colors.WHITE});
        base.add(item);
        return base;
    }

    _buildBoxContent(contentWidth, contentHeight, color) {
        return new DIAMBoxContent({width:contentWidth, height:contentHeight, color:color});
    }
}
makeShaped(DIAMBox);
makeLayered(DIAMBox, {
    layer:DIAMSupport.MIDDLE
});
makeClipsOwner(DIAMBox);
makeCarrier(DIAMBox);
makeContainer(DIAMBox);

class DIAMSlottedBoxContent extends DIAMBoxContent {

    constructor({width, height, color, slotWidth}) {
        super({width, height, color});
        this._slotWidth = slotWidth;
        this._cells = [];
        this._cells.length = Math.floor(width/slotWidth);
    }

    _buildPositions(element) {
        let positions = [];
        let ceilCount = Math.ceil(element.width/this._slotWidth);
        for (let index=0; index<this._cells.length-ceilCount+1; index++) {
            let cellOk = true;
            for (let inCell=0; inCell<ceilCount; inCell++) {
                if (this._cells[index+inCell] && this._cells[index+inCell]!==element) {
                    cellOk = false; break;
                }
            }
            if (cellOk) {
                positions.push({
                    x: -this.width/2+(index+ceilCount/2)*this._slotWidth,
                    y:this.height/2 - element.height/2
                });
            }
        }
        return positions;
    }

    _createPhysic() {
        let PositioningPhysic = createPositioningPhysic({
            positionsBuilder:function(element) {return this._host._buildPositions(element);}
        });
        return new PositioningPhysic(this,
            is(DIAMModule)
        );
    }

    _allocateCells(element) {
        let MARGIN = 0.0001;
        let ceilFirst = Math.floor((this.width/2+element.lx-element.width/2)/this._slotWidth+MARGIN);
        let ceilCount = Math.ceil(element.width/this._slotWidth);
        for (let index=0; index<ceilCount; index++) {
            this._cells[index+ceilFirst] = element;
        }
    }

    _freeCells(element) {
      for (let index = 0; index<this._cells.length; index++) {
          if (this._cells[index]===element) {
              delete this._cells[index];
          }
      }
    }

    _add(element) {
        let result = super._add(element);
        this._allocateCells(element);
        return result;
    }

    _remove(element) {
        let result = super._remove(element);
        this._freeCells(element);
        return result;
    }

    _insert(previous, element) {
        let result = super._insert(previous, element);
        this._allocateCells(element);
        return result;
    }

    _replace(previous, element) {
        let result = super._replace(previous, element);
        this._freeCells(previous);
        this._allocateCells(element);
        return result;
    }

    _memento() {
        let memento = super._memento();
        memento._cells = [...this._cells];
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        this._cells = [...memento._cells];
    }

}
addPhysicToContainer(DIAMSlottedBoxContent, {
    physicBuilder: function() {
        return this._createPhysic();
    }
});

class DIAMSlottedBox extends DIAMBox {

    constructor({width, height, clips, contentX, contentY, contentWidth, contentHeight, slotWidth, color}) {
        super({width, height, clips, contentX, contentY, contentWidth, contentHeight, color, slotWidth});
    }

    _buildBoxContent(contentWidth, contentHeight, color, {slotWidth}) {
        return new DIAMSlottedBoxContent({width:contentWidth, height:contentHeight, color, slotWidth});
    }

}

class DIAMSlottedRichBox extends DIAMSlottedBox {

    constructor({
        width, height, clips,
        contentX, contentY, contentWidth, contentHeight,
        slotWidth, color,
        headerHeight, footerHeight}) {
        super({width, height, clips, contentX, contentY, contentWidth, contentHeight, color, slotWidth});
        this._initHeader(headerHeight);
        this._initFooter(footerHeight);
        this._initFasciaSupport(headerHeight, footerHeight);
    }

}
makeHeaderOwner(DIAMSlottedRichBox);
makeFooterOwner(DIAMSlottedRichBox);
makeFasciaSupport(DIAMSlottedRichBox);

class DIAMFixing extends DIAMItem {

    constructor() {
        super({width:DIAMHook.HOOK_WIDTH, height:DIAMHook.HOOK_HEIGHT});
        this._initShape(this.buildShape());
        this._addSlots(new Slot(this, 0, 0));
    }

    buildShape() {
        let base = new Group();
        base.add(new Rect(-DIAMFixing.WIDTH / 2, -DIAMFixing.HEIGHT / 2, DIAMFixing.WIDTH, DIAMFixing.HEIGHT)
            .attrs({ stroke: Colors.BLACK, fill: Colors.WHITE }));
        base.add(new Circle(-DIAMFixing.WIDTH / 4, 0, DIAMFixing.DEVICE_RADIUS)
            .attrs({ stroke: Colors.BLACK, fill: Colors.WHITE }));
        base.add(new Circle(DIAMFixing.WIDTH / 4, 0, DIAMFixing.DEVICE_RADIUS)
            .attrs({ stroke: Colors.BLACK, fill: Colors.WHITE }));
        return base;
    }
}
makeShaped(DIAMFixing);
makeLayered(DIAMFixing, {
    layer:DIAMSupport.DOWN
});
makeSlotsOwner(DIAMFixing);
DIAMFixing.WIDTH = 16;
DIAMFixing.HEIGHT = 6;
DIAMFixing.DEVICE_RADIUS = 2;

class DIAMPaneContent extends DIAMSupport {

    constructor({width, height}) {
        super({width, height, strokeColor:Colors.NONE, backgroundColor:Colors.LIGHTEST_GREY});
    }

    _createContextMenu() {
        this.addMenuOption(new TextMenuOption("generate fixings",
            function () { this.callForGenerateFixings(); })
        );
        this.addMenuOption(new TextMenuOption("generate hooks",
            function () { this.callForGenerateHooks(); })
        );
    }

    callForGenerateFixings() {
        Context.canvas.openModal(
            generateFixings,
            {
                width: this.width,
                height: this.height
            },
            data => {
                this.generateFixings(data);
            });
    };

    generateFixings(data) {
        if (!Context.isReadOnly()) {
            Context.memento.open();
            for (let x = data.left; x <= data.right; x += data.boxWidth) {
                for (let y = data.top; y <= data.bottom ; y += data.boxHeight) {
                    let fixing = new DIAMFixing();
                    fixing.setLocation(x, y);
                    this.add(fixing);
                }
            }
        }
    }

    callForGenerateHooks() {
        Context.canvas.openModal(
            generateHooks,
            {
                width: this.width,
                height: this.height
            },
            data => {
                this.generateHooks(data);
            });
    };

    generateHooks(data) {
        if (!Context.isReadOnly()) {
            Context.memento.open();
            for (let x = data.left; x <= data.right; x += data.blisterWidth) {
                for (let y = data.top; y <= data.bottom ; y += data.blisterHeight) {
                    let fixing = new DIAMHook();
                    fixing.setLocation(x, y);
                    this.add(fixing);
                }
            }
        }
    }

    _createPhysic() {
        let ModulePhysic = createGravitationPhysic({
            predicate:is(DIAMModule, DIAMBox),
            gravitationPredicate:is(DIAMModule),
            carryingPredicate:always});
        addBordersToCollisionPhysic(ModulePhysic, {
            bordersCollide: {all: true}
        });
        let HookPhysic = createSlotsAndClipsPhysic({
            predicate: is(DIAMBlister),
            slotProviderPredicate: is(DIAMHook)
        });
        let FixingPhysic = createSlotsAndClipsPhysic({
            predicate: is(DIAMBox),
            slotProviderPredicate: is(DIAMFixing)
        });
        return new PhysicSelector(this,
            is(DIAMModule, DIAMBlister, DIAMHook, DIAMBox, DIAMFixing)
        )
        .register(new HookPhysic(this))
        .register(new FixingPhysic(this))
        .register(new ModulePhysic(this));
    }

}
makeContainerMultiLayered(DIAMPaneContent, {
    layers:[DIAMSupport.DOWN, DIAMSupport.MIDDLE, DIAMSupport.UP]
});
addPhysicToContainer(DIAMPaneContent, {
    physicBuilder: function () {
        return this._createPhysic();
    }
});

class DIAMPane extends DIAMItem {

    constructor({width, height, contentX, contentY, contentWidth, contentHeight}) {
        super({width, height});
        this._initFrame(width, height, Colors.BLACK, Colors.WHITE);
        this._paneContent = this._createPaneContent(contentX, contentY, contentWidth, contentHeight);
        this._add(this._paneContent);
    }

    _createPaneContent(contentX, contentY, contentWidth, contentHeight) {
        let content = new DIAMPaneContent({width:contentWidth, height:contentHeight});
        content._setLocation(contentX, contentY);
        return content;
    }

}
makeFramed(DIAMPane);
makeContainer(DIAMPane);
makeCarrier(DIAMPane);
makeCarriable(DIAMPane);

class DIAMRichPane extends DIAMPane {

    constructor({width, height, contentX, contentY, contentWidth, contentHeight, headerHeight, footerHeight}) {
        super({width, height, contentX, contentY, contentWidth, contentHeight});
        this._initHeader(headerHeight);
        this._initFooter(footerHeight);
    }

}
makeHeaderOwner(DIAMRichPane);
makeFooterOwner(DIAMRichPane);

class DIAMModule extends DIAMItem {
    constructor({width, height, color}) {
        super({width, height});
        this._initFrame(width, height, Colors.BLACK, color);
    }
}
makeFramed(DIAMModule);
makeCarrier(DIAMModule);
makeCarriable(DIAMModule);
makeGentleDropTarget(DIAMModule);

class BoardPaper extends BoardArea {
    constructor(width, height, backgroundColor) {
        super(width, height, backgroundColor);
    }
}

class DIAMPaperContent extends DIAMSupport {
    constructor({width, height}) {
        super({width, height, strokeColor:Colors.NONE, backgroundColor:Colors.WHITE});
    }
}
makeGravitationContainer(DIAMPaperContent, {
    predicate: is(DIAMPane, DIAMModule),
    carryingPredicate: always,
    bordersCollide:{all:true}
});

class DIAMPaper extends BoardPaper {
    constructor({width, height}) {
        super(width, height, Colors.WHITE);
        this._contentPane = new DIAMPaperContent({width:width-DIAMPaper.MARGIN*2, height:height-DIAMPaper.MARGIN*2});
        this.add(this._contentPane);
    }
}
DIAMPaper.MARGIN = 10;

function createTable() {
    Context.table = new BoardTable(4000, 3000, "#A0A0A0");
    Context.canvas.putOnBase(Context.table);
}

function createCanvas() {
    Context.selection = new Selection();
    Context.canvas = new Canvas("#app", 1200, 600);
    Context.canvas.manageMenus();
}

function createPaper() {
    Context.paper = new DIAMPaper({width:3000, height:1500});
    Context.table.add(Context.paper);
    Tools.zoomExtent();
}

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
    return cmdPopup;
}

function createPalettePopup() {
    let paletteContent = new ToolGridPanelContent(200, 80, 80);
    paletteContent.addCell(new BoardItemBuilder([new DIAMPane({
        width:800, height:500, contentX:0, contentY:0, contentWidth:760, contentHeight:460
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMRichPane({
        width:800, height:500, contentX:0, contentY:0, contentWidth:760, contentHeight:460, headerHeight:40, footerHeight:40
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMHook()]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMFixing()]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMSlottedBox({
        width:120, height:70, clips:[{x:0, y:15}], contentX:0, contentY:0, contentWidth:100, contentHeight:60, slotWidth:20
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMSlottedRichBox({
        width:120, height:70, clips:[{x:0, y:15}],
        contentX:0, contentY:0, contentWidth:100, contentHeight:60,
        slotWidth:20,
        headerHeight:10, footerHeight:10
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMBox({
        width:120, height:140, clips:[{x:0, y:-20}, {x:0, y:50}], contentX:0, contentY:0, contentWidth:100, contentHeight:130
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMModule({
        width:20, height:40, color:"#FF0000"
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMModule({
        width:40, height:40, color:"#00FF00"
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMModule({
        width:20, height:40, color:"#0000FF"
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMBlister({
        width:30, height:60, clip:{x:0, y:-15, radius:8}, color:"#FF0000"
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMBlister({
        width:35, height:75, clip:{x:0, y:-25, radius:8}, color:"#00FF00"
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMBlister({
        width:45, height:90, clip:{x:0, y:-30, radius:8}, color:"#0000FF"
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMVisual({
        width:120, height:10, color:"#FFFF00"
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMVisual({
        width:800, height:40, color:"#FF0000"
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMVisual({
        width:800, height:60, color:"#00FF00"
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMVisual({
        width:600, height:60, color:"#0000FF"
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMFascia({
        width:120, height:50, color:"#00FFFF"
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMFascia({
        width:120, height:60, color:"#FF00FF"
    })]));
    let palettePopup = new ToolExpandablePopup(200, 350).display(-100, 175);
    palettePopup.addPanel(new ToolExpandablePanel("All", paletteContent));
    palettePopup.addPanel(new ToolExpandablePanel("Furniture", paletteContent));
    palettePopup.addPanel(new ToolExpandablePanel("Modules", paletteContent));
    return palettePopup;
}

function main() {
    createCanvas();
    createTable();
    createPaper();
    createCommandPopup();
    createPalettePopup();
    Context.memento.opened = true;
}

main();