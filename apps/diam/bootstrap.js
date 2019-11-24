'use strict';

import {
    always, is
} from "../../js/misc.js";
import {
    ESet, List
} from "../../js/collections.js";
import {
    Context, Events, Canvas, Groups, DragOperation, Memento, makeNotCloneable, setLayeredGlassStrategy, standardDrag,
    Layer, Layers, Selection
} from "../../js/toolkit.js";
import {
    BoardElement, BoardTable, BoardArea, Visitor
} from "../../js/base-element.js";
import {
    Decoration,
    makeDeletable, makeDraggable, makeFramed, makeSelectable, makeContainer,
    makeMovable, makeSupport, makePart, makeClickable, makeShaped, makeContainerMultiLayered, makeLayered,
    makeGentleDropTarget, makePartsOwner, makeDecorationsOwner, makeMultiImaged
} from "../../js/core-mixins.js";
import {
    makeLockable, makeHighlightable, makeGroupable, TextDecoration, Mark, MarksDecoration
} from "../../js/standard-mixins.js";
import {
    Colors, Group, Line, Rect, Circle, Path, Text, RasterImage, M, Q, L, C, Attrs, AlignmentBaseline, FontWeight, TextAnchor,
    definePropertiesSet, filterProperties
} from "../../js/graphics.js";
import {
    Tools, BoardItemBuilder, copyCommand, deleteCommand, pasteCommand, redoCommand, ToolCommandPopup, undoCommand,
    zoomExtentCommand, zoomInCommand, zoomOutCommand, zoomSelectionCommand, ToolGridExpandablePanel, ToolExpandablePopup,
    regroupCommand, ungroupCommand, lockCommand, unlockCommand, favoritesCommand, layersCommand,
    ToolGridPanelContent, makeMenuOwner, TextMenuOption, FavoriteItemBuilder
} from "../../js/tools.js";
import {
    makeGravitationContainer, makeCarriable, makeCarrier, makePositioningContainer, addBordersToCollisionPhysic,
    addPhysicToContainer, createSlotsAndClipsPhysic, createGravitationPhysic, makeClipsOwner, makeSlotsOwner,
    createPositioningPhysic, createRulersPhysic, makeCenteredAnchorage, makeCenteredRuler,
    Slot, Clip, PhysicSelector, ClipDecoration, ClipPositionDecoration, RulesDecoration
} from "../../js/physics.js";

const DIAMLayers = {
    DOWN: "d",
    MIDDLE : "m",
    UP : "u"
};
const LAYERS_DEFINITION = {layers:[DIAMLayers.DOWN,  DIAMLayers.MIDDLE, DIAMLayers.UP]};

function makePositionEditable(superClass) {

    function callForEditPosition(element) {
        Canvas.instance.openModal(
            editPosition,
            {
                x: element.lx,
                y: element.ly
            },
            data => {
                element.move(data.x, data.y);
            });
    }

    let createContextMenu = superClass.prototype._createContextMenu;
    superClass.prototype._createContextMenu = function() {
        this._addMenuOption(new TextMenuOption("edit position",
            function() { callForEditPosition(this); })
        );
        createContextMenu && createContextMenu.call(this);
    };

}

function makeLabelOwner(superClass) {

    function callForRename(element) {
        Canvas.instance.openModal(
            rename,
            {
                label: element.label
            },
            data => {
                Memento.instance.open();
                element.label = data.label;
            });
    }

    let init = superClass.prototype._init;
    superClass.prototype._init = function(...args) {
        init.call(this, ...args);
        this._label = args.label || "";
    };

    Object.defineProperty(superClass.prototype, "label", {
        configurable:true,
        get() {
            return this._label;
        },
        set(label) {
            Memento.register(this);
            this._setLabel(label);
            return this;
        }
    });

    let createContextMenu = superClass.prototype._createContextMenu;
    superClass.prototype._createContextMenu = function() {
        this._addMenuOption(new TextMenuOption("rename",
            function() { callForRename(this); })
        );
        createContextMenu && createContextMenu.call(this);
    };

    let setLabel = superClass.prototype._setLabel;
    superClass.prototype._setLabel = function(label) {
        this._label = label;
        setLabel && setLabel.call(this, label);
        return this;
    };

    let superMemento = superClass.prototype._memento;
    superClass.prototype._memento = function() {
        let memento = superMemento.call(this);
        memento._label = this._label;
        return memento;
    };

    let superRevert = superClass.prototype._revert;
    superClass.prototype._revert = function(memento) {
        superRevert.call(this, memento);
        this._setLabel(memento._label);
        return this;
    };

    return superClass;
}

function makeCommentOwner(superClass) {

    function callForComment(element) {
        Canvas.instance.openModal(
            comment,
            {
                comment: element.comment
            },
            data => {
                Memento.instance.open();
                element.comment = data.comment;
            });
    }

    let init = superClass.prototype._init;
    superClass.prototype._init = function(...args) {
        init.call(this, ...args);
        this._setComment(args.comment || "");
    };

    Object.defineProperty(superClass.prototype, "comment", {
        configurable:true,
        get() {
            return this._comment;
        },
        set(comment) {
            Memento.register(this);
            this._setComment(comment);
            return this;
        }
    });

    let createContextMenu = superClass.prototype._createContextMenu;
    superClass.prototype._createContextMenu = function() {
        this._addMenuOption(new TextMenuOption("Add comment",
            function() { callForComment(this); })
        );
        createContextMenu && createContextMenu.call(this);
    };

    let setComment = superClass.prototype._setComment;
    superClass.prototype._setComment = function(comment) {
        this._comment = comment;
        setComment && setComment.call(this, comment);
        return this;
    };

    let superMemento = superClass.prototype._memento;
    superClass.prototype._memento = function() {
        let memento = superMemento.call(this);
        memento._comment = this._comment;
        return memento;
    };

    let superRevert = superClass.prototype._revert;
    superClass.prototype._revert = function(memento) {
        superRevert.call(this, memento);
        this._setComment(memento._comment);
        return this;
    };

    return superClass;
}

let commentMark = new Mark(new RasterImage("./images/icons/comments.png", -5, -3.75, 10, 7.5), 0);

class DIAMMarksSupport extends BoardElement {

    constructor({width, height}) {
        super(width, height);
    }

}
makeDecorationsOwner(DIAMMarksSupport);
DIAMMarksSupport.SIZE = 10;

class DIAMItem extends BoardElement {
    constructor({width, height, ...args}) {
        super(width, height, args);
    }

    _init({...args}) {
        super._init({...args});
        this._dragOperation(()=>standardDrag);
        this._createContextMenu();
        this._createMarksSupport();
        if (args.status) {
            this._setStatus(args.status.code, args.status.color);
        }
    }

    _finish(args) {
        super._finish(args);
        this._addPart(this._marksSupport);
    }

    _createContextMenu() {}

    _createMarksSupport() {
        this._marksDecoration = new MarksDecoration({
            x:MarksDecoration.RIGHT, y:MarksDecoration.TOP,
            markWidth:DIAMMarksSupport.SIZE, markHeight:DIAMMarksSupport.SIZE
        });
        this._marksSupport = new DIAMMarksSupport({width:this.width, height:this.height});
        this._marksSupport.addDecoration(this._marksDecoration);
    }

    _setComment(comment) {
        if (comment) {
            this._marksDecoration.add(commentMark);
        }
        else {
            this._marksDecoration.remove(commentMark);
        }
    }

    _setStatus(code, color) {
        let statusMark = new Mark(new Text(0, 0, code)
            .attrs({
                stroke:Colors.NONE, fill:color,
                font_family:"arial", font_size:8, font_weight:FontWeight.BOLD,
                alignment_baseline : AlignmentBaseline.MIDDLE, text_anchor:TextAnchor.MIDDLE
            }), 1);
        this._marksDecoration.add(statusMark);
        return this;
    }
}
makePartsOwner(DIAMItem);
makeSelectable(DIAMItem);
makeDraggable(DIAMItem);
makeMovable(DIAMItem);
makeDeletable(DIAMItem);
makeLockable(DIAMItem);
makeClickable(DIAMItem);
makeMenuOwner(DIAMItem);
makeGroupable(DIAMItem);
makeCommentOwner(DIAMItem);
makeHighlightable(DIAMItem);

class DIAMSupport extends BoardElement {
    constructor({width, height, strokeColor, backgroundColor}) {
        super(width, height);
        this._initFrame(width, height, strokeColor, backgroundColor);
        this._createContextMenu();
    }

    _createContextMenu() {}

}
makeFramed(DIAMSupport);
makeHighlightable(DIAMSupport);
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

    _acceptElement(element) {
        return element instanceof DIAMFascia &&
            element.width === this.width &&
            element.height === this.height;
    }

    _acceptDrop(element, dragSet) {
        return this._acceptElement(element);
    }

}
makePart(DIAMFasciaSupport);
makeSupport(DIAMFasciaSupport);
makePositioningContainer(DIAMFasciaSupport, {
    predicate: function(element) {return this.host._acceptElement(element);},
    positionsBuilder: element=>{return [{x:0, y:0}]}
});

class DIAMFascia extends DIAMItem {
    constructor(specs) {
        super(specs);
    }

    _improve({color}) {
        super._improve({});
        this._initFrame(this.width, this.height, Colors.INHERIT, color);
    }
}
makeFramed(DIAMFascia);
makeKnobOwner(DIAMFascia, {size:15, predicate:is(DIAMFasciaSupport)});

function makeHeaderOwner(superClass) {

    makePartsOwner(superClass);

    superClass.prototype._initHeader = function(headerHeight) {
        if (headerHeight) {
            this._header = this._createHeader(this.width, headerHeight);
            this._header.setLocation(0, -this.height/2+headerHeight/2);
            this._addPart(this._header);
        }
    };

    superClass.prototype._createHeader = function(width, height) {
        return new DIAMCover({width, height});
    }

}

function makeFooterOwner(superClass) {

    makePartsOwner(superClass);

    superClass.prototype._initFooter = function(footerHeight) {
        if (footerHeight) {
            this._footer = this._createFooter(this.width, footerHeight);
            this._footer.setLocation(0, this.height/2-footerHeight/2);
            this._addPart(this._footer);
        }
    };

    superClass.prototype._createFooter = function(width, height) {
        return new DIAMCover({width, height});
    }

}

function makeFasciaSupport(superClass) {

    makePartsOwner(superClass);

    superClass.prototype._initFasciaSupport = function(headerHeight=0, footerHeight=0) {
        let height = this.height-headerHeight-footerHeight;
        this._fasciaSupport = this._createFasciaSupport(this.width, height);
        this._fasciaSupport.setLocation(0, -this.height/2+headerHeight+height/2);
        this._addPart(this._fasciaSupport);
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

function makeKnobOwner(superClass, {size, predicate}) {

    makePartsOwner(superClass);

    let superInit = superClass.prototype._init;
    superClass.prototype._init = function({...args}) {
        superInit && superInit.call(this, {...args});
        let knob = this._createKnob(size, this.height);
        knob._setLocation(-this.width/2+size/2, 0);
        this._addPart(knob);
    };

    superClass.prototype._createKnob = function(width, height) {
        return new DIAMKnob({width, height, predicate});
    };
}

class DIAMCover extends DIAMSupport {
    constructor({width, height}) {
        super({width, height, strokeColor:Colors.LIGHT_GREY, backgroundColor:Colors.LIGHTEST_GREY});
    }

    _acceptElement(element) {
        return element instanceof DIAMVisual &&
               element.width === this.width &&
               element.height === this.height;
    }

    _acceptDrop(element, dragSet) {
        return this._acceptElement(element);
    }

    showRealistic() {
        this.shape.fill = Colors.DARK_GREY;
    }

    showSchematic() {
        this.shape.fill = Colors.LIGHTEST_GREY;
    }
}
makeDecorationsOwner(DIAMCover);
makePositioningContainer(DIAMCover, {
    predicate: function(element) {return this.host._acceptElement(element);},
    positionsBuilder: element=>{return [{x:0, y:0}]}
});

class DIAMVisual extends DIAMItem {

    _improve({color}) {
        super._improve({});
        this._initFrame(this.width, this.height, Colors.INHERIT, color);
    }
}
makeFramed(DIAMVisual);
makeKnobOwner(DIAMVisual, {size: 15, predicate:is(DIAMCover)});

class DIAMBlister extends DIAMItem {

    _improve({clip, color}) {
        super._improve({});
        this._clip = new Clip(this, clip.x, clip.y);
        this._radius = clip.radius;
        this._addClips(this._clip);
        this._color = color;
        this._initShape(this.buildShape());
    }

    buildShape() {
        let base = new Group();
        let item = new Rect(-this.width / 2, -this.height / 2, this.width, this.height)
            .attrs({stroke: Colors.INHERIT, fill:this._color});
        let hole = new Circle(this._clip.x, this._clip.y, this._radius)
            .attrs({ stroke: Colors.BLACK, fill: Colors.WHITE });
        base.add(item).add(hole);
        return base;
    }

}
makeShaped(DIAMBlister);
makeLayered(DIAMBlister, {
    layer:DIAMLayers.MIDDLE
});
makeClipsOwner(DIAMBlister);

/**
 * Class of bisters hook. Can set set on pane only.
 */
class DIAMHook extends DIAMItem {
    /**
     * Size of hooks is (for the moment) defaulted. To change it, change DIAMHook.WIDTH and DIAMHook.HEIGHT
     * constants instead.
     */
    constructor() {
        super({width: DIAMHook.WIDTH, height: DIAMHook.HEIGHT});
    }

    _improve() {
        super._improve({});
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
                DIAMHook.WIDTH, DIAMHook.HEIGHT / 2, DIAMHook.HEIGHT, DIAMHook.RADIUS
            ),
            ...pathDirectives(
                DIAMHook.WIDTH - DIAMHook.SIZE * 2, DIAMHook.HEIGHT / 2,
                DIAMHook.HEIGHT - DIAMHook.SIZE, DIAMHook.RADIUS - DIAMHook.SIZE / 2
            )
        ).attrs({stroke: Colors.INHERIT, fill: Colors.WHITE});
        base.add(item);
        return base;
    }
}
makeShaped(DIAMHook);
makeLayered(DIAMHook, {
    layer:DIAMLayers.UP
});
makeSlotsOwner(DIAMHook);
makeCenteredAnchorage(DIAMHook);
makeCenteredRuler(DIAMHook);
makePositionEditable(DIAMHook);

DIAMHook.WIDTH = 10;
DIAMHook.HEIGHT = 10;
DIAMHook.RADIUS = 6;
DIAMHook.SIZE = 2;

class DIAMBoxContent extends DIAMSupport {
    constructor({width, height}) {
        super({width, height, strokeColor:Colors.GREY, backgroundColor:Colors.LIGHTEST_GREY});
    }

    _dropTarget(element) {
        if (element instanceof DIAMFascia) {
            return this.parent._dropTarget(element);
        }
        return this;
    };

    showRealistic() {
        this.shape.fill = Colors.DARKEST_GREY;
    }

    showSchematic() {
        this.shape.fill = Colors.LIGHTEST_GREY;
    }
}
makePart(DIAMBoxContent);
makeDecorationsOwner(DIAMBoxContent);

class DIAMBox extends DIAMItem {

    _improve({clips, contentX, contentY, contentWidth, contentHeight, ...args}) {
        super._improve({color:Colors.WHITE});
        this._initShape(this.buildShape());
        this._boxContent = this._buildBoxContent(contentWidth, contentHeight, args);
        this._boxContent._setLocation(contentX, contentY);
        this._addPart(this._boxContent);
        for (let clipSpec of clips) {
            let clip = new Clip(this, clipSpec.x, clipSpec.y);
            this._addClips(clip);
            this._boxContent._addDecoration(new ClipDecoration(this, clip));
        }
    }

    buildShape() {
        let base = new Group();
        base.fill = Colors.WHITE;
        let item = new Rect(-this.width / 2, -this.height / 2, this.width, this.height)
            .attrs({stroke: Colors.INHERIT, fill:Colors.INHERIT});
        base.add(item);
        return base;
    }

    _buildBoxContent(contentWidth, contentHeight) {
        return new DIAMBoxContent({width:contentWidth, height:contentHeight});
    }

    showRealistic() {
        this.shape.fill = Colors.BLACK;
    }

    showSchematic() {
        this.shape.fill = Colors.WHITE;
    }
}
makeShaped(DIAMBox);
makeLayered(DIAMBox, {
    layer:DIAMLayers.MIDDLE
});
makeClipsOwner(DIAMBox);
makeCarrier(DIAMBox);

class DIAMSlottedBoxContent extends DIAMBoxContent {

    constructor({width, height, slotWidth}) {
        super({width, height});
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
            predicate:is(DIAMAbstractModule),
            positionsBuilder:function(element) {return this._host._buildPositions(element);}
        });
        return new PositioningPhysic(this);
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

    _buildBoxContent(contentWidth, contentHeight, {slotWidth}) {
        return new DIAMSlottedBoxContent({width:contentWidth, height:contentHeight, slotWidth});
    }

}

class DIAMSlottedRichBox extends DIAMSlottedBox {

    _improve({
        clips,
        contentX, contentY, contentWidth, contentHeight,
        slotWidth,
        headerHeight, footerHeight}
    ) {
        super._improve({clips, contentX, contentY, contentWidth, contentHeight, slotWidth});
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
        super({width: DIAMFixing.WIDTH, height: DIAMFixing.HEIGHT});
    }

    _improve() {
        super._improve();
        this._initShape(this.buildShape());
        this._addSlots(new Slot(this, 0, 0));
    }

    buildShape() {
        let base = new Group();
        base.add(new Rect(-DIAMFixing.WIDTH / 2, -DIAMFixing.HEIGHT / 2, DIAMFixing.WIDTH, DIAMFixing.HEIGHT)
            .attrs({ stroke: Colors.INHERIT, fill: Colors.WHITE }));
        base.add(new Circle(-DIAMFixing.WIDTH / 4, 0, DIAMFixing.DEVICE_RADIUS)
            .attrs({ stroke: Colors.BLACK, fill: Colors.WHITE }));
        base.add(new Circle(DIAMFixing.WIDTH / 4, 0, DIAMFixing.DEVICE_RADIUS)
            .attrs({ stroke: Colors.BLACK, fill: Colors.WHITE }));
        return base;
    }
}
makeShaped(DIAMFixing);
makeLayered(DIAMFixing, {
    layer:DIAMLayers.DOWN
});
makeSlotsOwner(DIAMFixing);
makeCenteredAnchorage(DIAMFixing);
makeCenteredRuler(DIAMFixing);
makePositionEditable(DIAMFixing);

DIAMFixing.WIDTH = 16;
DIAMFixing.HEIGHT = 6;
DIAMFixing.DEVICE_RADIUS = 2;

class DIAMAbstractLadder extends DIAMItem {

    _improve({topSlot, bottomSlot, slotInterval}) {
        super._improve();
        this._topSlot = topSlot;
        this._bottomSlot = bottomSlot;
        this._slotInterval = slotInterval;
        this._generateSlots();
        this._initShape(this.buildShape());
    }

    buildShape() {
        let base = new Group();
        base.fill = Colors.LIGHT_GREY;
        base.add(new Rect(-this.width / 2, -this.height / 2, this.width, this.height)
            .attrs({stroke:Colors.INHERIT, fill:Colors.INHERIT}));
        let slotSize = Math.min(2, this._slotInterval / 6);
        for (let slot of this.slots) {
            base.add(new Circle(slot.x, slot.y, slotSize).attrs({ stroke:Colors.NONE, fill: Colors.BLACK }));
        }
        return base;
    }

    get slotCount() {
        return  Math.ceil((this._bottomSlot-this._topSlot)/this._slotInterval);
    }

    slotLabel(slotIndex) {
        return (slotIndex+1)+"/"+(this.slotCount-slotIndex+1);
    }

    _memento() {
        let memento = super._memento();
        memento._topSlot = this._topSlot;
        memento._bottomSlot = this._bottomSlot;
        memento._slotInterval = this._slotInterval;
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        this._topSlot = memento._topslot;
        this._bottomSlot = memento._bottomSlot;
        this._slotInterval = memento._slotInterval;
        return this;
    }

    showRealistic() {
        this.shape.fill = Colors.DARK_GREY;
    }

    showSchematic() {
        this.shape.fill = Colors.LIGHT_GREY;
    }

}
makeShaped(DIAMAbstractLadder);
makeLayered(DIAMAbstractLadder, {
    layer:DIAMLayers.DOWN
});
makeSlotsOwner(DIAMAbstractLadder);
makeCenteredAnchorage(DIAMAbstractLadder);
makeCenteredRuler(DIAMAbstractLadder);
makePositionEditable(DIAMAbstractLadder);

class DIAMLadder extends DIAMAbstractLadder {

    _generateSlots() {
        let slotIndex = 0;
        for (let y = this._topSlot; y <= this._bottomSlot; y += this._slotInterval) {
            let slot = new Slot(this, 0, y);
            slot.index = this.slotLabel(slotIndex);
            slotIndex++;
            this._addSlots(slot);
        }
    }

}

class DIAMDoubleLadder extends DIAMAbstractLadder {

    constructor({width, height, topSlot, bottomSlot, slotInterval}) {
        super({width, height, topSlot, bottomSlot, slotInterval});
    }

    _generateSlots() {
        let slotIndex = 0;
        for (let y = this._topSlot; y <= this._bottomSlot; y += this._slotInterval) {
            let leftSlot = new Slot(this, -this.width / 4, y);
            leftSlot.index = this.slotLabel(slotIndex);
            let rightSlot = new Slot(this, this.width / 4, y);
            rightSlot.index = this.slotLabel(slotIndex);
            this._addSlots(leftSlot, rightSlot);
            slotIndex++;
        }
    }

}

class DIAMShelf extends DIAMItem {

    _improve({leftClip:leftClipSpec, rightClip:rightClipSpec, label, ...args}) {
        super._improve({color:Colors.GREY, label, ...args});
        this._leftClip = new Clip(this, leftClipSpec.x, leftClipSpec.y);
        this._addClips(this._leftClip);
        this._rightClip = new Clip(this, rightClipSpec.x, rightClipSpec.y);
        this._addClips(this._rightClip);
        this._initShape(this.buildShape());
        this._addDecorations(args);
    }

    get decorationTarget() {
        return this;
    }

    _addDecorations(args) {
        let labelProperties = filterProperties(args, Attrs.FONT_PROPERTIES);
        let positionProperties = filterProperties(args, DIAMShelf.POSITION_FONT_PROPERTIES);
        this.decorationTarget._addDecoration(new ClipDecoration(this, this._leftClip));
        this.decorationTarget._addDecoration(new ClipPositionDecoration(this._leftClip, {
            x:TextDecoration.LEFT, y:TextDecoration.TOP, ...positionProperties}, DIAMShelf.POSITION_FONT_PROPERTIES));
        this.decorationTarget._addDecoration(new ClipDecoration(this, this._rightClip));
        this.decorationTarget._addDecoration(new ClipPositionDecoration(this._rightClip, {
            x:TextDecoration.RIGHT, y:TextDecoration.TOP, ...positionProperties}, DIAMShelf.POSITION_FONT_PROPERTIES));
        this._labelDecoration = new TextDecoration(this,
            function() {return this.label;},
            {x:TextDecoration.MIDDLE, y:TextDecoration.MIDDLE, ...labelProperties}
        );
        this.decorationTarget._addDecoration(this._labelDecoration);
    }

    _setLabel(label) {
        this._labelDecoration.refresh();
    }

    buildShape() {
        let base = new Group();
        let item = new Rect(-this.width / 2, -this.height / 2, this.width, this.height)
            .attrs({stroke: Colors.INHERIT, fill:Colors.WHITE});
        base.add(item);
        return base;
    }
}
DIAMShelf.POSITION_FONT_PROPERTIES = definePropertiesSet("position", Attrs.FONT_PROPERTIES);
makeShaped(DIAMShelf);
makeDecorationsOwner(DIAMShelf);
makeLabelOwner(DIAMShelf);
makeLayered(DIAMShelf, {
    layer:DIAMLayers.MIDDLE
});
makeClipsOwner(DIAMShelf);
makeCarrier(DIAMShelf);

class DIAMRichShelf extends DIAMShelf {

    _init({leftClip, rightClip, coverY, coverHeight, ...args}) {
        super._init({leftClip, rightClip, coverY, coverHeight, ...args});
        this._cover = this._buildCover(this.width, coverHeight, args);
    }

    _improve({leftClip, rightClip, coverY, coverHeight, ...args}) {
        super._improve({leftClip, rightClip, coverY, coverHeight, ...args});
        this._cover._setLocation(0, coverY);
        this._addPart(this._cover);
    }

    get decorationTarget() {
        return this._cover;
    }

    _buildCover(coverWidth, coverHeight) {
        return new DIAMCover({width:coverWidth, height:coverHeight});
    }
}
makeLayered(DIAMRichShelf, {
    layer:DIAMLayers.UP
});

class DIAMCaddyContent extends DIAMBoxContent {

    _createContextMenu() {
        this.addMenuOption(new TextMenuOption("generate ladders",
            function () { callForGenerateLadders(this); })
        );
    }

    _createPhysic() {
        let ModulePhysic = createGravitationPhysic({
            predicate:is(DIAMAbstractModule, DIAMShelf),
            gravitationPredicate:is(DIAMAbstractModule),
            carryingPredicate:always});
        addBordersToCollisionPhysic(ModulePhysic, {
            bordersCollide: {all: true}
        });
        let LadderPhysic = createSlotsAndClipsPhysic({
            predicate: is(DIAMShelf),
            slotProviderPredicate: is(DIAMAbstractLadder)
        });
        return new PhysicSelector(this,
            is(DIAMAbstractModule, DIAMShelf, DIAMAbstractLadder)
        )
        .register(new LadderPhysic(this))
        .register(new ModulePhysic(this));
    }

}
addPhysicToContainer(DIAMCaddyContent, {
    physicBuilder: function() {
        return this._createPhysic();
    }
});

class DIAMCaddy extends DIAMBox {

    _buildBoxContent(contentWidth, contentHeight, color) {
        return new DIAMCaddyContent({width:contentWidth, height:contentHeight, color:Colors.LIGHTEST_GREY});
    }

}

class DIAMRichCaddy extends DIAMCaddy {

    _improve({
        clips,
        contentX, contentY, contentWidth, contentHeight,
        color,
        headerHeight, footerHeight}
    ) {
        super._improve({clips, contentX, contentY, contentWidth, contentHeight, color});
        this._initHeader(headerHeight);
        this._initFooter(footerHeight);
        this._initFasciaSupport(headerHeight, footerHeight);
    }

}
makeHeaderOwner(DIAMRichCaddy);
makeFooterOwner(DIAMRichCaddy);
makeFasciaSupport(DIAMRichCaddy);

class DIAMDivider extends DIAMItem {

    _improve() {
        super._improve();
        this._initFrame(this.width, this.height, Colors.INHERIT, Colors.WHITE);
    }

}
makeFramed(DIAMDivider);
makeLayered(DIAMDivider, {
    layer:DIAMLayers.MIDDLE
});

function callForGenerateLadders(container) {
    Canvas.instance.openModal(
        generateLadders,
        {
            width: container.width,
            height: container.height
        },
        data => {
            applyGenerateLadders(container, data);
        });
}

function applyGenerateLadders(container, data) {
    if (!Context.isReadOnly()) {
        Memento.instance.open();
        let leftLadder = new DIAMLadder({
            width: data.ladderWidth,
            height: data.ladderHeight,
            topSlot: data.topSlot,
            bottomSlot: data.bottomSlot,
            slotInterval: data.slotInterval
        });
        leftLadder.setLocation( data.left + (data.ladderWidth) / 2, data.y);
        container.add(leftLadder);
        let rightLadder = new DIAMLadder({
            width: data.ladderWidth,
            height: data.ladderHeight,
            topSlot: data.topSlot,
            bottomSlot: data.bottomSlot,
            slotInterval: data.slotInterval
        });
        rightLadder.setLocation( data.right - (data.ladderWidth) / 2, data.y);
        container.add(rightLadder);
        let width = data.right - data.left;
        for (let index = 1; index <= data.intermediateLaddersCount; index++) {
            let x = (width * index) / (data.intermediateLaddersCount + 1) + data.left;
            let ladder = new DIAMDoubleLadder({
                width: data.ladderWidth * 2,
                height: data.ladderHeight,
                topSlot: data.topSlot,
                bottomSlot: data.bottomSlot,
                slotInterval: data.slotInterval
            });
            ladder.setLocation(x, data.y);
            container.add(ladder);
        }
    }
}

function callForGenerateFixings(container) {
    Canvas.instance.openModal(
        generateFixings,
        {
            width: container.width,
            height: container.height
        },
        data => {
            applyGenerateFixings(container, data);
        });
}

function applyGenerateFixings(container, data) {
    if (!Context.isReadOnly()) {
        Memento.instance.open();
        for (let x = data.left; x <= data.right; x += data.boxWidth) {
            for (let y = data.top; y <= data.bottom ; y += data.boxHeight) {
                let fixing = new DIAMFixing();
                fixing.setLocation(x, y);
                container.add(fixing);
            }
        }
    }
}

function callForGenerateHooks(container) {
    Canvas.instance.openModal(
        generateHooks,
        {
            width: container.width,
            height: container.height
        },
        data => {
            applyGenerateHooks(container, data);
        });
}

function applyGenerateHooks(container, data) {
    if (!Context.isReadOnly()) {
        Memento.instance.open();
        for (let x = data.left; x <= data.right; x += data.blisterWidth) {
            for (let y = data.top; y <= data.bottom ; y += data.blisterHeight) {
                let fixing = new DIAMHook();
                fixing.setLocation(x, y);
                container.add(fixing);
            }
        }
    }
}

class DIAMAnchorageDecoration extends Decoration {

    constructor({lineMargin, labelMargin, indexMargin}) {
        super();
        this._lineMargin = lineMargin;
        this._labelMargin = labelMargin;
        this._indexMargin = indexMargin;
        this._root.attrs({stroke:Colors.NONE});
    }

    _init() {
        this.refresh();
    }

    refresh() {
        function collect(element, xs, ys) {

            function isAnchorageElement(element) {
                return is(DIAMShelf, DIAMFixing, DIAMHook)(element);
            }

            if (isAnchorageElement(element)) {
                xs.add(element.lx);
                ys.add(element.ly);
            }
        }

        function getLabel(index) {
            let ALPHABET_LENGTH = 26;
            let CODE_A = 65;
            let result = "";
            do {
                let code = index % ALPHABET_LENGTH;
                result += String.fromCharCode(CODE_A + index);
                index = (index - code) / ALPHABET_LENGTH;
            } while (index !== 0);
            return result;
        }

        let MARGIN = 5;
        let LINE_MARGIN = this._lineMargin || 10;
        let LABEL_MARGIN = this._labelMargin || 40;
        let INDEX_MARGIN = this._indexMargin || 20;
        let width = this._element.width;
        let height = this._element.height;
        let xs = new ESet();
        let ys = new ESet();
        for (let element of this._element.children) {
            collect(element, xs, ys);
        }
        this._root.clear();
        let xIndex = 0;
        let xt = [...xs].sort((a, b) => a - b);
        for (let x of xt) {
            let line = x === xt[0] ?
                      new Line(x, -height / 2 - LABEL_MARGIN, x, height / 2)
                    : new Line(x, -height / 2 - INDEX_MARGIN, x, height / 2);
            line.attrs({ stroke_width:0.5, stroke: Colors.MIDDLE_GREY });
            this._root.add(line);
            if (x === xt[0]) {
                let panelLabel = new Text(x + MARGIN, -height / 2 - LABEL_MARGIN, this._element.label)
                    .attrs({ fill: Colors.MIDDLE_GREY, alignment_baseline: AlignmentBaseline.HANGING});
                this._root.add(panelLabel);
            }
            let indexLabel = new Text(x + MARGIN, -height / 2 - INDEX_MARGIN, getLabel(xIndex++))
                .attrs({ fill: Colors.MIDDLE_GREY, alignment_baseline : AlignmentBaseline.HANGING});
            this._root.add(indexLabel);
        }
        let yIndex = 1;
        let yt = [...ys].sort((a, b) => a - b);
        for (let y of yt) {
            let line = new Line(-width / 2 - LINE_MARGIN, y, width / 2, y)
                .attrs({ stroke_width:0.5, stroke: Colors.MIDDLE_GREY });
            this._root.add(line);
            let indexLabel = new Text(-width / 2 - LINE_MARGIN, y, "" + yIndex++)
                .attrs({ fill: Colors.MIDDLE_GREY, alignment_baseline : AlignmentBaseline.TEXT_AFTER_EDGE});
            this._root.add(indexLabel);
        }
    }

    _setElement(element) {
        super._setElement(element);
        element.addObserver(this);
    }

    _notified(source, event) {
        if (source===this._element && (event===Events.ADD || event===Events.REMOVE || event===Events.MOVE)) {
            this.refresh();
        }
    }

    clone(duplicata) {
        return new DIAMAnchorageDecoration({
            lineMargin:this._lineMargin,
            labelMargin:this._labelMargin,
            indexMargin:this._indexMargin});
    }

}

class DIAMPaneContent extends DIAMSupport {

    constructor({width, height, lineMargin, labelMargin, indexMargin}) {
        super({width, height, strokeColor:Colors.NONE, backgroundColor:Colors.LIGHTEST_GREY});
        this._anchorageDecoration = new DIAMAnchorageDecoration({lineMargin, labelMargin, indexMargin });
        this._addDecoration(this._anchorageDecoration);
        this._rulesDecoration = new RulesDecoration(this._attachmentPhysic);
        this._addDecoration(this._rulesDecoration);
    }

    _createContextMenu() {
        this.addMenuOption(new TextMenuOption("generate ladders",
            function () { callForGenerateLadders(this); })
        );
        this.addMenuOption(new TextMenuOption("generate fixings",
            function () { callForGenerateFixings(this); })
        );
        this.addMenuOption(new TextMenuOption("generate hooks",
            function () { callForGenerateHooks(this); })
        );
    }

    _createPhysic() {
        let ModulePhysic = createGravitationPhysic({
            predicate:is(DIAMAbstractModule, DIAMShelf, DIAMBox, DIAMBlister),
            gravitationPredicate:is(DIAMAbstractModule),
            carryingPredicate:always});
        addBordersToCollisionPhysic(ModulePhysic, {
            bordersCollide: {all: true}
        });
        let AttachmentPhysic = createRulersPhysic({
            predicate: is(DIAMAbstractLadder, DIAMFixing, DIAMHook)
        });
        this._attachmentPhysic = new AttachmentPhysic(this);
        let LadderPhysic = createSlotsAndClipsPhysic({
            predicate: is(DIAMShelf),
            slotProviderPredicate: is(DIAMAbstractLadder)
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
            is(DIAMAbstractModule, DIAMShelf, DIAMAbstractLadder, DIAMBlister, DIAMHook, DIAMBox, DIAMFixing, DIAMDivider)
        )
        .register(this._attachmentPhysic)
        .register(new LadderPhysic(this))
        .register(new HookPhysic(this))
        .register(new FixingPhysic(this))
        .register(new ModulePhysic(this));
    }

    get label() {
        return this.parent.label;
    }

    set label(label) {
        this.parent.label = label;
    }

    _recover(memento) {
        super._recover(memento);
        this._anchorageDecoration.refresh();
        return this;
    }

    showRealistic() {
        this.shape.fill = Colors.DARKEST_GREY;
    }

    showSchematic() {
        this.shape.fill = Colors.LIGHTEST_GREY;
    }
}
makeContainerMultiLayered(DIAMPaneContent, LAYERS_DEFINITION);
addPhysicToContainer(DIAMPaneContent, {
    physicBuilder: function () {
        return this._createPhysic();
    }
});
makeDecorationsOwner(DIAMPaneContent);

class DIAMPane extends DIAMItem {

    _improve({label, contentX, contentY, contentWidth, contentHeight, lineMargin, labelMargin, indexMargin}) {
        super._improve({label});
        this._initFrame(this.width, this.height, Colors.INHERIT, Colors.WHITE);
        this._paneContent = this._createPaneContent(contentX, contentY, contentWidth, contentHeight, lineMargin, labelMargin, indexMargin);
        this._addPart(this._paneContent);
    }

    _createPaneContent(contentX, contentY, contentWidth, contentHeight, lineMargin, labelMargin, indexMargin) {
        let content = new DIAMPaneContent({width:contentWidth, height:contentHeight, lineMargin, labelMargin, indexMargin});
        content._setLocation(contentX, contentY);
        return content;
    }

    _setLabel(label) {
        this._paneContent._anchorageDecoration.refresh();
    }

    showRealistic() {
        this.shape.fill = Colors.BLACK;
    }

    showSchematic() {
        this.shape.fill = Colors.WHITE;
    }
}
makeFramed(DIAMPane);
makeLabelOwner(DIAMPane);
makeCarrier(DIAMPane);
makeCarriable(DIAMPane);

class DIAMRichPane extends DIAMPane {

    constructor(specs) {
        super(specs);
    }

    _improve({
         contentX, contentY, contentWidth, contentHeight, label,
         lineMargin, labelMargin, indexMargin, headerHeight, footerHeight
    }) {
        super._improve({
            contentX, contentY, contentWidth, contentHeight, label,
            lineMargin, labelMargin, indexMargin
        });
        this._initHeader(headerHeight);
        this._initFooter(footerHeight);
    }
}
makeHeaderOwner(DIAMRichPane);
makeFooterOwner(DIAMRichPane);

class DIAMAbstractModule extends DIAMItem {}
makeCarrier(DIAMAbstractModule);
makeCarriable(DIAMAbstractModule);
makeGentleDropTarget(DIAMAbstractModule);

class DIAMBasicModule extends DIAMAbstractModule {
    constructor(specs) {
        super(specs);
    }

    _improve({color, ...args}) {
        super._improve({color, ...args});
        this._initFrame(this.width, this.height, Colors.INHERIT, color);
    }
}
makeFramed(DIAMBasicModule);

class DIAMImageModule extends DIAMAbstractModule {
    constructor(specs) {
        super(specs);
    }

    _improve({ url, realisticUrl, ...args}) {
        super._improve(args);
        this._initImages(this.width, this.height, Colors.INHERIT, url, realisticUrl);
    }

    showRealistic() {
        this._setImageIndex(1);
    }

    showSchematic() {
        this._setImageIndex(0);
    }

    clone(duplicata) {
        return super.clone(duplicata)
    }
}
makeMultiImaged(DIAMImageModule);

class DIAMCell extends BoardElement {
    constructor({width, height, x, y, shape, compatibilities}) {
        super(width, height);
        this._initShape(shape.clone());
        this._setLocation(x, y);
        this._compatibilities = new ESet(compatibilities);
    }

    get compatibilities() {
        return this._compatibilities;
    }

    _acceptElement(element) {
        if (!is(DIAMOption)(element) || !element.compatibilities) return false;
        return element.isCompatible(this.compatibilities);
    }

    _acceptDrop(element, dragSet) {
        return this._acceptElement(element);
    }

    allCompatibilities() {
        let result = new ESet(this.compatibilities);
        for (let option of this.children) {
            for (let compatibility of option.cellCompatibilities()) {
                result.add(compatibility);
            }
        }
        return result;
    }

}
makeShaped(DIAMCell);
makeSupport(DIAMCell);
makePositioningContainer(DIAMCell, {
        predicate: function(element) {
            //console.log("accept:", this.host._acceptElement(element));
            return this.host._acceptElement(element);
        },
        positionsBuilder: element=>{return [{x:0, y:0}]}
    });
makePart(DIAMCell);

class DIAMOption extends DIAMItem {
    _improve({shape, compatibilities}) {
        super._improve();
        console.assert(compatibilities);
        this._initShape(shape.clone());
        this._compatibilities = new ESet(compatibilities);
        this._addObserver(this);
    }

    get compatibilities() {
        return this._compatibilities;
    }

    isCompatible(compatibilities) {
        for (let compatibility of compatibilities) {
            if (this.compatibilities.has(compatibility)) return true;
        }
        return false;
    }

    _notified(source, event, value) {
        if (source === this && event===Events.ATTACH) {
            if (this.parent && this.parent instanceof DIAMCell) {
                Selection.instance.unselect(this);
                Selection.instance.select(this.parent);
            }
        }
    }

    cellCompatibilities() {
        return new ESet();
    }

}
makeShaped(DIAMOption);
makeContainer(DIAMOption);
makeDraggable(DIAMOption);

class DIAMColorOption extends DIAMOption {
}

class DIAMConfigurableOption extends DIAMOption {
    constructor({width, height, shape, compatibilities, cells}) {
        super({width, height, compatibilities, shape});
        this._cells = new List(...cells);
        for (let cell of cells) {
            this._addPart(cell);
        }
    }

    get cells() {
        return this._cells;
    }

    cellCompatibilities() {
        let result = new ESet();
        for (let cell of this.cells) {
            for (let compatibility of cell.allCompatibilities()) {
                result.add(compatibility);
            }
        }
        return result;
    }

}

function makeModuleConfigurable(superClass) {

    let init = superClass.prototype._init;
    superClass.prototype._init = function({cells, ...args}) {
        init && init.call(this, {cells, ...args});
        this._cells = new List(...cells);
        for (let cell of cells) {
            this._addPart(cell);
        }
    };

    Object.defineProperty(superClass.prototype, "cells", {
        configurable: true,
        get() {
            return this._cells;
        }
    });

    superClass.prototype.cellCompatibilities = function() {
        let result = new ESet();
        for (let cell of this.cells) {
            for (let compatibility of cell.allCompatibilities()) {
                result.add(compatibility);
            }
        }
        return result;
    };

}

class DIAMConfigurableModule extends DIAMBasicModule {
    constructor({width, height, cells}) {
        super({width, height, color:Colors.WHITE, cells});
    }
}
makeModuleConfigurable(DIAMConfigurableModule);

class BoardPaper extends BoardArea {
    constructor(width, height, backgroundColor) {
        super(width, height, backgroundColor);
    }
}
makePart(BoardPaper);

class DIAMPaperContent extends DIAMSupport {
    constructor({width, height}) {
        super({width, height, strokeColor:Colors.NONE, backgroundColor:Colors.WHITE});
    }
}
makeGravitationContainer(DIAMPaperContent, {
    predicate: is(DIAMPane, DIAMAbstractModule, DIAMBox),
    carryingPredicate: always,
    bordersCollide:{all:true}
});
makeContainerMultiLayered(DIAMPaperContent, LAYERS_DEFINITION);

class DIAMPaper extends BoardPaper {
    constructor({width, height}) {
        super(width, height, Colors.WHITE);
        this._contentPane = new DIAMPaperContent({width:width-DIAMPaper.MARGIN*2, height:height-DIAMPaper.MARGIN*2});
        this.add(this._contentPane);
    }
}
DIAMPaper.MARGIN = 10;

class DIAMTable extends BoardTable {

    constructor({width, height, backgroundColor}) {
        super(width, height, backgroundColor);
    }
}
makeContainerMultiLayered(DIAMTable, LAYERS_DEFINITION);

function createTable() {
    setLayeredGlassStrategy(BoardTable, LAYERS_DEFINITION);
    Context.table = new DIAMTable({width:4000, height:3000, backgroundColor:"#A0A0A0"});
    Canvas.instance.putOnBase(Context.table);
}

function createCanvas() {
    Canvas.instance = new Canvas("#app", "width:100%;height:100%;margin:0;padding:0;overflow:hidden;");
    Canvas.instance.manageMenus();
    Selection.instance = new Groups();
}

function createPaper() {
    Context.paper = new DIAMPaper({width:3000, height:1500});
    Context.table._addPart(Context.paper);
    Tools.zoomExtent();
}

function defineLayers() {

    function showColorOptions(checked, elements) {
        new Visitor(elements, {checked}, function({checked}) {
            if (this instanceof DIAMColorOption) {
                checked ? this.show() : this.hide();
            }
        })
    }

    function showVisuals(checked, elements) {
        new Visitor(elements, {checked}, function({checked}) {
            if (this instanceof DIAMVisual) {
                checked ? this.show() : this.hide();
            }
        })
    }

    function showArtworks(checked, elements) {
        new Visitor(elements, {checked}, function({checked}) {
            if (this instanceof DIAMCover || this instanceof DIAMFasciaSupport) {
                checked ? this.show() : this.hide();
            }
        })
    }

    function showModules(checked, elements) {
        new Visitor(elements, {checked}, function({checked}) {
            if (this instanceof DIAMAbstractModule) {
                checked ? this.show() : this.hide();
            }
        })
    }

    function showHighlights(checked, elements) {
        new Visitor(elements, {checked}, function({checked}) {
            if (this.highlightable) {
                checked ? this.showHighlight() : this.hideHighlight();
            }
        })
    }

    function showDecorations(checked, elements) {
        new Visitor(elements, {checked}, function({checked}) {
            if (this.hasDecorations) {
                checked ? this.showDecorations() : this.hideDecorations();
            }
        })
    }

    function showRealistic(checked, elements) {
        new Visitor(elements, {checked}, function({checked}) {
            if (this.showRealistic) {
                checked ? this.showRealistic() : this.showSchematic();
            }
        })
    }

    function showReferences(checked, elements) {
        // TODO
    }

    //Layers.instance = new Layers();
    Layers.instance
        .addLayer(new Layer("Legends", true, showDecorations))
        .addLayer(new Layer("Artwork", true, showArtworks))
        .addLayer(new Layer("Realistic", false, showRealistic))
        .addLayer(new Layer("Highlight", true, showHighlights))
        .addLayer(new Layer("Tickets", true, showVisuals))
        .addLayer(new Layer("Icon colors", true, showColorOptions))
        .addLayer(new Layer("References", true, showReferences))
        .addLayer(new Layer("Modules", true, showModules))
        .update([Context.table, Context.palettePopup]);
}

function createCommandPopup(palettePopup) {
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
    regroupCommand(cmdPopup);
    ungroupCommand(cmdPopup);
    lockCommand(cmdPopup);
    unlockCommand(cmdPopup);
    favoritesCommand(cmdPopup, palettePopup._paletteContent);
    layersCommand(cmdPopup);
    cmdPopup.addMargin();
    deleteCommand(cmdPopup);
    return cmdPopup;
}

function setShortcuts() {
    Tools.allowElementDeletion();
}

class OptionsExpandablePanel extends ToolGridExpandablePanel {

    constructor(title, content) {
        super(title, content, cell=>cell.applyOr(this._compatibleOptions.bind(this)));
    }

    open() {
        Selection.instance.addObserver(this);
        this._compatibilitySet = null;
        super.open();
    }

    close() {
        super.close();
        Selection.instance.removeObserver(this);
    }

    _notified(source, event, value) {
        if (source === Selection.instance) {
            if (Selection.instance.selection().size) {
                this._compatibilitySet = null;
                this._refresh();
            }
        }
    }

    _getCompatibilitySet(selection) {
        if (!this._compatibilitySet) {
            this._compatibilitySet = new ESet();
            for (let selectedElement of selection) {
                if (selectedElement.cellCompatibilities) {
                    for (let compatibility of selectedElement.cellCompatibilities()) {
                        this._compatibilitySet.add(compatibility);
                    }
                }
            }
        }
        return this._compatibilitySet;
    }

    _compatibleOptions(element) {
        if (!is(DIAMOption)(element)) return false;
        let compatibilities = this._getCompatibilitySet(Selection.instance.selection());
        return element.isCompatible(compatibilities);
    }


}

function createPalettePopup() {
    let paletteContent = new ToolGridPanelContent(200, 80, 80);
    paletteContent.addCell(new BoardItemBuilder([new DIAMPane({
        width:840, height:500, contentX:0, contentY:0, contentWidth:810, contentHeight:460,
        label:"pane"
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMRichPane({
        width:840, height:500, contentX:0, contentY:0, contentWidth:810, contentHeight:460, headerHeight:40, footerHeight:40,
        label:"rich pane", lineMargin:30, labelMargin:60, indexMargin:40
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMHook()]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMFixing()]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMLadder({width:10, height:100, topSlot:-45, bottomSlot:45, slotInterval:5})]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMLadder({width:10, height:10, topSlot:0, bottomSlot:0, slotInterval:5})]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMDoubleLadder({width:20, height:100, topSlot:-45, bottomSlot:45, slotInterval:5})]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMShelf({
        width:100, height:10, leftClip:{x:-45, y:0}, rightClip:{x:45, y:0}, label:'shelf',
        font_family:"arial", font_size:6, fill:Colors.GREY,
        position_font_family:"arial", position_font_size:4, position_fill:Colors.GREY
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMRichShelf({
        width:100, height:10, leftClip:{x:-45, y:0}, rightClip:{x:45, y:0}, label:'shelf', coverY:0, coverHeight:20,
        font_family:"arial", font_size:8, fill:Colors.GREY,
        position_font_family:"arial", position_font_size:4, position_fill:Colors.GREY
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMSlottedBox({
        width:120, height:70, clips:[{x:0, y:15}], contentX:0, contentY:0, contentWidth:100, contentHeight:60, slotWidth:20,
        status:{code:"N", color:Colors.RED}
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMSlottedRichBox({
        width:120, height:70, clips:[{x:0, y:15}],
        contentX:0, contentY:0, contentWidth:100, contentHeight:60,
        slotWidth:20,
        headerHeight:10, footerHeight:10,
        status:{code:"V", color:Colors.GREEN}
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMRichCaddy({
        width:120, height:70, clips:[{x:0, y:15}],
        contentX:0, contentY:0, contentWidth:100, contentHeight:60,
        slotWidth:20,
        headerHeight:5, footerHeight:15
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMDivider({
        width:10, height:460, contentX:0
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMBox({
        width:120, height:140, clips:[{x:0, y:-20}, {x:0, y:50}], contentX:0, contentY:0, contentWidth:100, contentHeight:130
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMConfigurableModule({
        width:20, height:40, cells:[
            new DIAMCell({width:4, height:4, x:-5, y:-15,
                shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["C"]
            }),
            new DIAMCell({width:4, height:4, x:0, y:-15,
                shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["C"]
            }),
            new DIAMCell({width:4, height:4, x:5, y:-15,
                shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["C"]
            }),
            new DIAMCell({width:4, height:4, x:-5, y:-10,
                shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["C"]
            }),
            new DIAMCell({width:4, height:4, x:0, y:-10,
                shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["C"]
            }),
            new DIAMCell({width:4, height:4, x:5, y:-10,
                shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["C"]
            }),
            new DIAMCell({width:4, height:4, x:-5, y:-5,
                shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["C"]
            }),
            new DIAMCell({width:4, height:4, x:0, y:-5,
                shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["C"]
            }),
            new DIAMCell({width:4, height:4, x:5, y:-5,
                shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["C"]
            })
        ]
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMConfigurableModule({
        width:20, height:40, cells:[
            new DIAMCell({width:4, height:10, x:-5, y:5,
                shape:new Rect(-2, -10, 4, 20).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["O"]
            }),
            new DIAMCell({width:4, height:10, x:0, y:5,
                shape:new Rect(-2, -10, 4, 20).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["O"]
            }),
            new DIAMCell({width:4, height:10, x:5, y:5,
                shape:new Rect(-2, -10, 4, 20).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["O"]
            })
        ]
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMConfigurableModule({
        width:20, height:40, cells:[
            new DIAMCell({width:4, height:4, x:-5, y:-15,
                shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["C"]
            }),
            new DIAMCell({width:4, height:4, x:0, y:-15,
                shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["C"]
            }),
            new DIAMCell({width:4, height:4, x:5, y:-15,
                shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["C"]
            }),
            new DIAMCell({width:4, height:4, x:-5, y:-10,
                shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["C"]
            }),
            new DIAMCell({width:4, height:4, x:0, y:-10,
                shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["C"]
            }),
            new DIAMCell({width:4, height:4, x:5, y:-10,
                shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["C"]
            }),
            new DIAMCell({width:4, height:10, x:-5, y:5,
                shape:new Rect(-2, -10, 4, 20).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["O"]
            }),
            new DIAMCell({width:4, height:10, x:0, y:5,
                shape:new Rect(-2, -10, 4, 20).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["O"]
            }),
            new DIAMCell({width:4, height:10, x:5, y:5,
                shape:new Rect(-2, -10, 4, 20).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["O"]
            })
        ]
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMImageModule({
        width:20, height:40, realisticUrl:"./apps/diam/modules/eye liner c.png", url:{svg:"./apps/diam/modules/eye liner b.svg", rasterized:true}
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMBasicModule({
        width:20, height:40, color:"#FF0000"
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMBasicModule({
        width:40, height:40, color:"#00FF00"
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMBasicModule({
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
        width:840, height:40, color:"#FF0000"
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
    paletteContent.addCell(new BoardItemBuilder([new DIAMColorOption({width:4, height:4,
        shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:"#FF0000"}),
        compatibilities:["C"]
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMColorOption({width:4, height:4,
        shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:"#F00000"}),
        compatibilities:["C"]
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMColorOption({width:4, height:4,
        shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:"#FF0F0F"}),
        compatibilities:["C"]
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMColorOption({width:4, height:4,
        shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:"#F00F0F"}),
        compatibilities:["C"]
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMColorOption({width:4, height:4,
        shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:"#AA0000"}),
        compatibilities:["C"]
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMConfigurableOption({width:4, height:20,
        shape:new Rect(-2, -10, 4, 20).attrs({stroke_width:0.25, stroke:Colors.GREY, fill:Colors.WHITE}),
        compatibilities:["O"],
        cells:[
            new DIAMCell({width:4, height:4, x:0, y:-7,
                shape:new Rect(-2, -3, 4, 6).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["R"]
            })
        ]
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMConfigurableOption({width:4, height:20,
        shape:new Rect(-2, -6, 4, 16).attrs({stroke_width:0.25, stroke:Colors.GREY, fill:Colors.WHITE}),
        compatibilities:["O"],
        cells:[
            new DIAMCell({width:4, height:4, x:0, y:-3,
                shape:new Rect(-2, -3, 4, 6).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["R"]
            })
        ]
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMConfigurableOption({width:4, height:20,
        shape:new Rect(-2, -2, 4, 12).attrs({stroke_width:0.25, stroke:Colors.GREY, fill:Colors.WHITE}),
        compatibilities:["O"],
        cells:[
            new DIAMCell({width:4, height:4, x:0, y:1,
                shape:new Rect(-2, -3, 4, 6).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["R"]
            })
        ]
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMColorOption({width:4, height:6,
        shape:new Rect(-2, -3, 4, 6).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:"#FF0000"}),
        compatibilities:["R"]
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMColorOption({width:4, height:6,
        shape:new Rect(-2, -3, 4, 6).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:"#F00000"}),
        compatibilities:["R"]
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMColorOption({width:4, height:6,
        shape:new Rect(-2, -3, 4, 6).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:"#FF0F0F"}),
        compatibilities:["R"]
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMColorOption({width:4, height:6,
        shape:new Rect(-2, -3, 4, 6).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:"#F00F0F"}),
        compatibilities:["R"]
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMColorOption({width:4, height:6,
        shape:new Rect(-2, -3, 4, 6).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:"#AA0000"}),
        compatibilities:["R"]
    })]));
    let palettePopup = new ToolExpandablePopup(200, 350).display(-100, 175);
    palettePopup.addPanel(new ToolGridExpandablePanel("All", paletteContent));
    palettePopup.addPanel(new ToolGridExpandablePanel("Furniture", paletteContent,
        cell=>cell.applyAnd(is(DIAMPane, DIAMAbstractLadder, DIAMShelf, DIAMBox, DIAMFixing, DIAMHook))));
    palettePopup.addPanel(new ToolGridExpandablePanel("Modules", paletteContent,
        cell=>cell.applyAnd(is(DIAMAbstractModule))));
    palettePopup.addPanel(new OptionsExpandablePanel("Colors And Options", paletteContent));
    palettePopup.addPanel(new ToolGridExpandablePanel("Favorites", paletteContent,
        cell=>cell instanceof FavoriteItemBuilder));
    palettePopup._paletteContent = paletteContent;
    return palettePopup;
}

function main() {
    createCanvas();
    createTable();
    createPaper();
    Context.palettePopup = createPalettePopup();
    Context.commandPopup = createCommandPopup(Context.palettePopup);
    setShortcuts();
    defineLayers();
    Context.memento.opened = true;
}

main();