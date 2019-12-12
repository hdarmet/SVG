
import {
    makeContainerMultiLayered, makeLayered, makePart, makePartsOwner, makeSupport
} from "../../js/container-mixins.js";
import {
    addPhysicToContainer, ClipDecoration, ClipPositionDecoration, createRulersPhysic, createSlotsAndClipsPhysic,
    makeCenteredAnchorage, makeCenteredRuler, makeClipsOwner, makePositioningContainer,
    makeSlotsOwner, PhysicSelector, RulesDecoration, Slot, Clip, createPositioningPhysic
} from "../../js/physics.js";
import {
    Decoration, makeDecorationsOwner, makeFramed, makeShaped
} from "../../js/core-mixins.js";
import {
    DIAMItem, DIAMLayers, DIAMSupport, LAYERS_DEFINITION, makeLabelOwner, makePositionEditable, DIAMKnob
} from "./delta-core.js";
import {
    AlignmentBaseline, Colors, definePropertiesSet, filterProperties, Group, L, M, Path, Q,
    Rect, Attrs, Circle, Line, Text
} from "../../js/graphics.js";
import {
    addBordersToCollisionPhysic, createGravitationPhysic, makeCarriable, makeCarrier,
    SAPRecord
} from "../../js/collision-physics.js";
import {
    TextDecoration
} from "../../js/standard-mixins.js";
import {
    Canvas, Context, Memento, Events
} from "../../js/toolkit.js";
import {
    Visitor, BoardElement
} from "../../js/base-element.js";
import {
    TextMenuOption
} from "../../js/tools.js";
import {
    always, is
} from "../../js/misc.js";
import {
    Box
} from "../../js/geometry.js";
import {
    DIAMAbstractModule
} from "./delta-products.js";
import {
    ESet, List
} from "../../js/collections.js";

export class DIAMFasciaSupport extends BoardElement {
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

export class DIAMFascia extends DIAMItem {
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

export function makeHeaderOwner(superClass) {

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

export function makeFooterOwner(superClass) {

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

export function makeFasciaSupport(superClass) {

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

export function makeKnobOwner(superClass, {size, predicate}) {

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

export class DIAMCover extends DIAMSupport {
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

export class DIAMVisual extends DIAMItem {

    _improve({color}) {
        super._improve({});
        this._initFrame(this.width, this.height, Colors.INHERIT, color);
    }
}
makeFramed(DIAMVisual);
makeKnobOwner(DIAMVisual, {size: 15, predicate:is(DIAMCover)});

export class DIAMBlister extends DIAMItem {

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
export class DIAMHook extends DIAMItem {
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

export class DIAMBoxContent extends DIAMSupport {
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

export class DIAMBox extends DIAMItem {

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

export class DIAMSlottedBoxContent extends DIAMBoxContent {

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

export class DIAMSlottedBox extends DIAMBox {

    _buildBoxContent(contentWidth, contentHeight, {slotWidth}) {
        return new DIAMSlottedBoxContent({width:contentWidth, height:contentHeight, slotWidth});
    }

}

export class DIAMSlottedRichBox extends DIAMSlottedBox {

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

export class DIAMFixing extends DIAMItem {

    constructor() {
        super({width: DIAMFixing.WIDTH, height: DIAMFixing.HEIGHT});
        this._root._node.style["z-index"] = 10;
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

export class DIAMAbstractLadder extends DIAMItem {

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

export class DIAMLadder extends DIAMAbstractLadder {

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

export class DIAMDoubleLadder extends DIAMAbstractLadder {

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

export class Spike {

    constructor(element, spikeSize, deltaX) {
        this._element = element;
        this._size = spikeSize;
        this._deltaX = deltaX;
    }

    get localGeometry() {
        return new Box(
            this._element.lx+this._deltaX,
            this._element.ly-this._element.height/2-this._size,
            0, this._size*2+this._element.height);
    }

    get x() {
        return this._element.lx+this._deltaX;
    }

    get y() {
        return this._element.ly;
    }

    get mayNotCollide() {
        return !DIAMShelf.spiked;
    }
}

export class SpikedSAPRecord extends SAPRecord {
    constructor(element, sweepAndPrune, spikeSize) {
        super(element, sweepAndPrune, spikeSize);
        this._spikeSize = spikeSize;
    }

    createBounds() {
        this._leftSpike = new Spike(this._element, this._spikeSize, -this._element.width / 2);
        this._rightSpike = new Spike(this._element, this._spikeSize, this._element.width / 2);
        this._leftSpikeBound = this._createBound(this._leftSpike);
        super.createBounds();
        this._rightSpikeBound = this._createBound(this._rightSpike);
    }

    get bounds() {
        return [this._leftSpikeBound, this._bound, this._rightSpikeBound];
    }

    update() {
        super.update();
        this._updateBound(this._leftSpikeBound, this._leftSpike.localGeometry);
        this._updateBound(this._rightSpikeBound, this._rightSpike.localGeometry);
    }

    left(element) {
        if (element === this._element) return super.left(element);
        else if (element === this._leftSpike) return this._leftSpikeBound.left.value;
        else return this._rightSpikeBound.left.value;
    }

    right(element) {
        if (element === this._element) return super.right(element);
        else if (element === this._leftSpike) return this._leftSpikeBound.right.value;
        else return this._rightSpikeBound.right.value;
    }

    top(element) {
        if (element === this._element) return super.top(element);
        else if (element === this._leftSpike) return this._leftSpikeBound.top.value;
        else return this._rightSpikeBound.top.value;
    }

    bottom(element) {
        if (element === this._element) return super.bottom(element);
        else if (element === this._leftSpike) return this._leftSpikeBound.bottom.value;
        else return this._rightSpikeBound.bottom.value;
    }

    x(element) {
        if (element === this._element) return super.x(element);
        else if (element === this._leftSpike) return this._leftSpike.x;
        else return this._rightSpike.x;
    }

    y(element) {
        if (element === this._element) return super.y(element);
        else if (element === this._leftSpike) return this._leftSpike.y;
        else return this._rightSpike.y;
    }

    remove() {
        this._removeBound(this._leftSpikeBound);
        this._removeBound(this._rightSpikeBound);
        super.remove();
    }
}

export class SpikeDecoration extends Decoration {

    constructor() {
        super();
    }

    _init() {
        if (DIAMShelf.spiked) {
            this._root.add(new Line(
                -this._element.width / 2, -this._element.height / 2 - DIAMShelf.SPIKE_SIZE,
                -this._element.width / 2, this._element.height / 2 + DIAMShelf.SPIKE_SIZE));
            this._root.add(new Line(
                this._element.width / 2, -this._element.height / 2 - DIAMShelf.SPIKE_SIZE,
                this._element.width / 2, this._element.height / 2 + DIAMShelf.SPIKE_SIZE));
            this._root.stroke = Colors.GREY;
            this._root.stroke_width = SpikeDecoration.STROKE_WIDTH;
        }
    }

    clone(duplicata) {
        return new SpikeDecoration();
    }

    refresh() {
        this._root.clear();
        this._init();
    }
}
SpikeDecoration.STROKE_WIDTH = 0.25;

export class DIAMShelf extends DIAMItem {

    _improve({leftClip:leftClipSpec, rightClip:rightClipSpec, label, ...args}) {
        super._improve({color:Colors.GREY, label, ...args});
        this._leftClip = new Clip(this, leftClipSpec.x, leftClipSpec.y);
        this._addClips(this._leftClip);
        this._rightClip = new Clip(this, rightClipSpec.x, rightClipSpec.y);
        this._addClips(this._rightClip);
        this._initShape(this.buildShape());
        this._addDecorations(args);
        this._addObserver(this);
    }

    _notified(source, event, element) {
        if (source === this && event === Events.ADD_CARRIED && DIAMShelf.magnetized) {
            this.magnetise();
        }
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
        this._spikeDecoration = new SpikeDecoration();
        this._addDecoration(this._spikeDecoration);
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

    magnetise() {
        if (!Context.isReadOnly()) {
            let elements = new List(...this.carried);
            elements.sort((e1, e2) => e1.lx - e2.lx);
            elements[0].move(
                this.lx-this.width/2 + elements[0].width / 2,
                elements[0].ly
            );
            for (let index = 1; index < elements.length; index++) {
                let left = elements[index - 1].lx+elements[index - 1].width/2;
                let right = elements[index].lx-elements[index].width/2;
                let top = elements[index].ly-elements[index].height/2;
                let bottom = this.ly-this.height/2;
                elements[index].move(
                    elements[index - 1].lx + elements[index - 1].width/2 + elements[index].width / 2,
                    elements[index].ly
                );
            }
        }
    }

    _createSAPRecord(sweepAndPrune) {
        return new SpikedSAPRecord(this, sweepAndPrune, DIAMShelf.SPIKE_SIZE);
    }

}
DIAMShelf.SPIKE_SIZE = 20;
Object.defineProperty(DIAMShelf, "magnetized", {
    get() {
        return Context.magnetized;
    },
    set(magnetized) {
        Context.magnetized = magnetized;
    }
});
Object.defineProperty(DIAMShelf, "spiked", {
    get() {
        return Context.spiked;
    },
    set(spiked) {
        Context.spiked = spiked;
        new Visitor([Context.table, Context.palettePopup], {}, function() {
            if (this instanceof DIAMShelf) {
                this._spikeDecoration.refresh();
            }
        })
    }
});
DIAMShelf.POSITION_FONT_PROPERTIES = definePropertiesSet("position", Attrs.FONT_PROPERTIES);
makeShaped(DIAMShelf);
makeDecorationsOwner(DIAMShelf);
makeLabelOwner(DIAMShelf);
makeLayered(DIAMShelf, {
    layer:DIAMLayers.MIDDLE
});
makeClipsOwner(DIAMShelf);
makeCarrier(DIAMShelf);

export class DIAMRichShelf extends DIAMShelf {

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

export class DIAMCaddyContent extends DIAMBoxContent {

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

export class DIAMCaddy extends DIAMBox {

    _buildBoxContent(contentWidth, contentHeight, color) {
        return new DIAMCaddyContent({width:contentWidth, height:contentHeight, color:Colors.LIGHTEST_GREY});
    }

}

export class DIAMRichCaddy extends DIAMCaddy {

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

export class DIAMDivider extends DIAMItem {

    _improve() {
        super._improve();
        this._initFrame(this.width, this.height, Colors.INHERIT, Colors.WHITE);
    }

}
makeFramed(DIAMDivider);
makeLayered(DIAMDivider, {
    layer:DIAMLayers.MIDDLE
});

export function callForGenerateLadders(container) {
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

export function applyGenerateLadders(container, data) {
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
        container.addChild(leftLadder);
        let rightLadder = new DIAMLadder({
            width: data.ladderWidth,
            height: data.ladderHeight,
            topSlot: data.topSlot,
            bottomSlot: data.bottomSlot,
            slotInterval: data.slotInterval
        });
        rightLadder.setLocation( data.right - (data.ladderWidth) / 2, data.y);
        container.addChild(rightLadder);
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
            container.addChild(ladder);
        }
    }
}

export function callForGenerateFixings(container) {
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

export function applyGenerateFixings(container, data) {
    if (!Context.isReadOnly()) {
        Memento.instance.open();
        for (let x = data.left; x <= data.right; x += data.boxWidth) {
            for (let y = data.top; y <= data.bottom ; y += data.boxHeight) {
                let fixing = new DIAMFixing();
                fixing.setLocation(x, y);
                container.addChild(fixing);
            }
        }
    }
}

export function callForGenerateHooks(container) {
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

export function applyGenerateHooks(container, data) {
    if (!Context.isReadOnly()) {
        Memento.instance.open();
        for (let x = data.left; x <= data.right; x += data.blisterWidth) {
            for (let y = data.top; y <= data.bottom ; y += data.blisterHeight) {
                let fixing = new DIAMHook();
                fixing.setLocation(x, y);
                container.addChild(fixing);
            }
        }
    }
}

export class DIAMAnchorageDecoration extends Decoration {

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
        element._addObserver(this);
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

export class DIAMPaneContent extends DIAMSupport {

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

export class DIAMPane extends DIAMItem {

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

export class DIAMRichPane extends DIAMPane {

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

