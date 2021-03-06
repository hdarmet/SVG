
import {
    makeContainerMultiLayered, makeLayered, makePart, makePartsOwner, makeSupport
} from "../../js/container-mixins.js";
import {
    addPhysicToContainer, ClipDecoration, ClipPositionDecoration, createRulersPhysic, createSlotsAndClipsPhysic,
    makeCenteredAnchorage, makeCenteredRuler, makeClipsOwner, makePositioningContainer, createGridPhysic,
    makeSlotsOwner, PhysicSelector, RulesDecoration, RulerDecoration, Slot, Clip
} from "../../js/physics.js";
import {
    Decoration, makeDecorationsOwner, makeFramed, makeShaped
} from "../../js/core-mixins.js";
import {
    DeltaItem, DeltaLayers, DeltaSupport, LAYERS_DEFINITION, makeLabelOwner, makePositionEditable, DeltaKnob
} from "./delta-core.js";
import {
    AlignmentBaseline, Colors, definePropertiesSet, filterProperties, Group, L, M, Path, Q,
    Rect, Attrs, Circle, Line, Text, win, Polygon
} from "../../js/graphics.js";
import {
    addBordersToCollisionPhysicForElements, createGravitationPhysicForElements, makeCarriable, makeCarrier,
    SAPRecord2D
} from "../../js/collision-physics.js";
import {
    TextDecoration
} from "../../js/standard-mixins.js";
import {
    Canvas, Context, Memento, Events, computeGridStep
} from "../../js/toolkit.js";
import {
    Visitor, SigmaElement
} from "../../js/base-element.js";
import {
    TextMenuOption
} from "../../js/tools.js";
import {
    always, is, defineMethod, extendMethod
} from "../../js/misc.js";
import {
    Box2D, Point3D, Point2D
} from "../../js/geometry.js";
import {
    DeltaAbstractModule, DeltaModuleEmbodiment
} from "./delta-products.js";
import {
    ESet, List, EMap
} from "../../js/collections.js";
import {
    makeResizeable, makeResizeableContent, SigmaHandle, SizerDecoration
} from "../../js/elements.js";

export class DeltaFasciaSupport extends SigmaElement {
    constructor({width, height}) {
        super(width, height);
    }

    _acceptElement(element) {
        return element instanceof DeltaFascia &&
            element.width === this.width &&
            element.height === this.height;
    }

    _acceptDrop(element, dragSet) {
        return this._acceptElement(element);
    }

    _dropTarget(element) {
        if (is(DeltaFrame)(element)) {
            return this.parent._dropTarget(element);
        }
        return this;
    };
}
makePart(DeltaFasciaSupport);
makeSupport(DeltaFasciaSupport);
makePositioningContainer(DeltaFasciaSupport, {
    predicate: function(element) {return this.host._acceptElement(element);},
    positionsBuilder: element=>{return [{x:0, y:0}]}
});

export class DeltaFascia extends DeltaItem {
    constructor(specs) {
        super(specs);
    }

    _improve({color}) {
        super._improve({});
        this._initFrame(this.width, this.height, Colors.INHERIT, color);
    }

    _dropTarget(element) {
        if (is(DeltaFrame)(element)) {
            return this.parent._dropTarget(element);
        }
        return this;
    };
}
makeFramed(DeltaFascia);
makeKnobOwner(DeltaFascia, {size:15, predicate:is(DeltaFasciaSupport)});

export class DeltaFrameSupport extends SigmaElement {
    constructor({width, height}) {
        super(width, height);
    }

    _acceptElement(element) {
        return element instanceof DeltaFrame &&
            element.width === this.width &&
            element.height === this.height;
    }

    _acceptDrop(element, dragSet) {
        return this._acceptElement(element);
    }

}
makePart(DeltaFrameSupport);
makeSupport(DeltaFrameSupport);
makePositioningContainer(DeltaFrameSupport, {
    predicate: function(element) {return this.host._acceptElement(element);},
    positionsBuilder: element=>{return [{x:0, y:0}]}
});

export class DeltaFrame extends DeltaItem {
    constructor(specs) {
        super(specs);
    }

    _improve({frameWidth, color}) {
        super._improve({});
        this._initShape(this._createFrameShape(this.width, this.height, frameWidth, color));
    }

    _createFrameShape(width, height, frameWidth, color) {
        return new Polygon(
            [-width/2, height/2], [-width/2, -height/2], [width/2, -height/2], [width/2, height/2],
            [width/2-frameWidth, height/2], [width/2-frameWidth, -height/2+frameWidth],
            [-width/2+frameWidth, -height/2+frameWidth], [-width/2+frameWidth, height/2]).attrs({fill:color});
    }
}
makeShaped(DeltaFrame);
makeKnobOwner(DeltaFrame, {size:15, predicate:is(DeltaFrameSupport)});

export function makeHeaderOwner(superClass) {

    makePartsOwner(superClass);

    defineMethod(superClass,
        function _initHeader(headerHeight) {
            if (headerHeight) {
                this._header = this._createHeader(this.width, headerHeight);
                this._header.setLocation(new Point2D(0, -this.height/2+headerHeight/2));
                this._addPart(this._header);
            }
        }
    );

    defineMethod(superClass,
        function _createHeader(width, height) {
            return new DeltaCover({width, height});
        }
    );

    extendMethod(superClass, $setSize=>
        function _setSize(width, height) {
            $setSize.call(this, width, height);
            this._header._setSize(width, this._header.height);
            this._header.setLocation(new Point2D(0, -height/2+this._header.height/2));
        }
    );
}

export function makeFooterOwner(superClass) {

    makePartsOwner(superClass);

    defineMethod(superClass,
        function _initFooter(footerHeight) {
            if (footerHeight) {
                this._footer = this._createFooter(this.width, footerHeight);
                this._footer.setLocation(new Point2D(0, this.height/2-footerHeight/2));
                this._addPart(this._footer);
            }
        }
    );

    defineMethod(superClass,
        function _createFooter(width, height) {
            return new DeltaCover({width, height});
        }
    );

    extendMethod(superClass, $setSize=>
        function _setSize(width, height) {
            $setSize.call(this, width, height);
            this._footer._setSize(width, this._footer.height);
            this._footer.setLocation(new Point2D(0, height/2-this._footer.height/2));
        }
    );

}

export function makeFasciaSupport(superClass) {

    makePartsOwner(superClass);

    defineMethod(superClass,
        function _initFasciaSupport(headerHeight=0, footerHeight=0) {
            let height = this.height-headerHeight-footerHeight;
            this._fasciaSupport = this._createFasciaSupport(this.width, height);
            this._fasciaSupport.setLocation(new Point2D(0, -this.height/2+headerHeight+height/2));
            this._addPart(this._fasciaSupport);
        }
    );

    defineMethod(superClass,
        function _createFasciaSupport(width, height) {
            return new DeltaFasciaSupport({width, height});
        }
    );

    extendMethod(superClass, $dropTarget=>
        function _dropTarget(element) {
            if (element instanceof DeltaFascia) {
                return this._fasciaSupport._dropTarget(element);
            }
            return $dropTarget ? $dropTarget.call(this, element) : this;
        }
    );

}
export function makeFrameSupport(superClass) {

    makePartsOwner(superClass);

    defineMethod(superClass,
        function _initFrameSupport() {
            this._frameSupport = this._createFrameSupport(this.width, this.height);
            this._frameSupport.setLocation(new Point2D(0, 0));
            this._addPart(this._frameSupport);
        }
    );

    defineMethod(superClass,
        function _createFrameSupport(width, height) {
            return new DeltaFrameSupport({width, height});
        }
    );

    extendMethod(superClass, $dropTarget=>
        function _dropTarget(element) {
            if (element instanceof DeltaFrame) {
                return this._frameSupport._dropTarget(element);
            }
            return $dropTarget ? $dropTarget.call(this, element) : this;
        }
    );

}

export function makeKnobOwner(superClass, {size, predicate}) {

    makePartsOwner(superClass);

    extendMethod(superClass, $init=>
        function _init({...args}) {
            $init && $init.call(this, {...args});
            let knob = this._createKnob(size, this.height);
            knob._setLocation(new Point2D(-this.width/2+size/2, 0));
            this._addPart(knob);
        }
    );

    defineMethod(superClass,
        function _createKnob(width, height) {
            return new DeltaKnob({width, height, predicate});
        }
    );
}

export class DeltaCover extends DeltaSupport {
    constructor({width, height}) {
        super({width, height, strokeColor:Colors.LIGHT_GREY, backgroundColor:Colors.LIGHTEST_GREY});
    }

    _acceptElement(element) {
        return element instanceof DeltaVisual &&
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
makeDecorationsOwner(DeltaCover);
makePositioningContainer(DeltaCover, {
    predicate: function(element) {return this.host._acceptElement(element);},
    positionsBuilder: element=>{return [{x:0, y:0}]}
});

export class DeltaVisual extends DeltaItem {

    _improve({color}) {
        super._improve({});
        this._initFrame(this.width, this.height, Colors.INHERIT, color);
    }
}
makeFramed(DeltaVisual);
makeKnobOwner(DeltaVisual, {size: 15, predicate:is(DeltaCover)});

export class DeltaBlister extends DeltaItem {

    _improve({clip, color}) {
        super._improve({});
        this._clip = new Clip(this, clip.x, clip.y);
        this._radius = clip.radius;
        this._addClips(this._clip);
        this._color = color;
        this._initShape(this._buildShape());
    }

    _buildShape() {
        let base = new Group();
        let item = new Rect(-this.width / 2, -this.height / 2, this.width, this.height)
            .attrs({stroke: Colors.INHERIT, fill:this._color});
        let hole = new Circle(this._clip.x, this._clip.y, this._radius)
            .attrs({ stroke: Colors.BLACK, fill: Colors.WHITE });
        base.add(item).add(hole);
        return base;
    }

}
makeShaped(DeltaBlister);
makeLayered(DeltaBlister, {
    layer:DeltaLayers.MIDDLE
});
makeClipsOwner(DeltaBlister);

/**
 * Class of bisters hook. Can set set on pane only.
 */
export class DeltaHook extends DeltaItem {
    /**
     * Size of hooks is (for the moment) defaulted. To change it, change DeltaHook.WIDTH and DeltaHook.HEIGHT
     * constants instead.
     */
    constructor() {
        super({width: DeltaHook.WIDTH, height: DeltaHook.HEIGHT});
    }

    _improve() {
        super._improve({});
        this._initShape(this._buildShape());
        this._addSlots(new Slot(this, 0, 0));
    }

    _buildShape() {
        function pathDirectives(w, b, h, r) {
            return [
                M(-w / 2, b), L(-w / 2, b - h + r),
                Q(-w / 2, b - h, 0, b - h), Q(w / 2, b - h, w / 2, b - h + r),
                L(w / 2, b), L(-w / 2, b)];
        }

        let base = new Group();
        let item = new Path(
            ...pathDirectives(
                DeltaHook.WIDTH, DeltaHook.HEIGHT / 2, DeltaHook.HEIGHT, DeltaHook.RADIUS
            ),
            ...pathDirectives(
                DeltaHook.WIDTH - DeltaHook.SIZE * 2, DeltaHook.HEIGHT / 2,
                DeltaHook.HEIGHT - DeltaHook.SIZE, DeltaHook.RADIUS - DeltaHook.SIZE / 2
            )
        ).attrs({stroke: Colors.INHERIT, fill: Colors.WHITE});
        base.add(item);
        return base;
    }
}
makeShaped(DeltaHook);
makeLayered(DeltaHook, {
    layer:DeltaLayers.UP
});
makeSlotsOwner(DeltaHook);
makeCenteredAnchorage(DeltaHook);
makeCenteredRuler(DeltaHook);
makePositionEditable(DeltaHook);

DeltaHook.WIDTH = 10;
DeltaHook.HEIGHT = 10;
DeltaHook.RADIUS = 6;
DeltaHook.SIZE = 2;

export class DeltaAbstractLadder extends DeltaItem {

    _improve({topSlot, bottomSlot, slotInterval}) {
        super._improve();
        this._topSlot = topSlot;
        this._bottomSlot = bottomSlot;
        this._slotInterval = slotInterval;
        this._generateSlots();
        this._initShape(this._buildShape());
    }

    _buildShape() {
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
makeShaped(DeltaAbstractLadder);
makeLayered(DeltaAbstractLadder, {
    layer:DeltaLayers.DOWN
});
makeSlotsOwner(DeltaAbstractLadder);
makeCenteredAnchorage(DeltaAbstractLadder);
makeCenteredRuler(DeltaAbstractLadder);
makePositionEditable(DeltaAbstractLadder);

export class DeltaLadder extends DeltaAbstractLadder {

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

export class DeltaDoubleLadder extends DeltaAbstractLadder {

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
        return new Box2D(
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
        return !DeltaShelf.spiked;
    }
}

export class SpikedSAPRecord extends SAPRecord2D {
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
        if (DeltaShelf.spiked) {
            this._root.add(new Line(
                -this._element.width / 2, -this._element.height / 2 - DeltaShelf.SPIKE_SIZE,
                -this._element.width / 2, this._element.height / 2 + DeltaShelf.SPIKE_SIZE));
            this._root.add(new Line(
                this._element.width / 2, -this._element.height / 2 - DeltaShelf.SPIKE_SIZE,
                this._element.width / 2, this._element.height / 2 + DeltaShelf.SPIKE_SIZE));
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

export class DeltaShelf extends DeltaItem {

    _improve({leftClip:leftClipSpec, rightClip:rightClipSpec, label, ...args}) {
        super._improve({color:Colors.GREY, label, ...args});
        this._leftClip = new Clip(this, leftClipSpec.x, leftClipSpec.y);
        this._addClips(this._leftClip);
        this._rightClip = new Clip(this, rightClipSpec.x, rightClipSpec.y);
        this._addClips(this._rightClip);
        this._initShape(this._buildShape());
        this._addDecorations(args);
        this._addObserver(this);
    }

    _notified(source, event, element) {
        if (source === this && event === Events.ADD_CARRIED && DeltaShelf.magnetized) {
            this.magnetise();
        }
    }

    get decorationTarget() {
        return this;
    }

    _addDecorations(args) {
        let labelProperties = filterProperties(args, Attrs.FONT_PROPERTIES);
        let positionProperties = filterProperties(args, DeltaShelf.POSITION_FONT_PROPERTIES);
        this.decorationTarget._addDecoration(new ClipDecoration(this, this._leftClip));
        this.decorationTarget._addDecoration(new ClipPositionDecoration(this._leftClip, {
            x:TextDecoration.LEFT, y:TextDecoration.TOP, ...positionProperties}, DeltaShelf.POSITION_FONT_PROPERTIES));
        this.decorationTarget._addDecoration(new ClipDecoration(this, this._rightClip));
        this.decorationTarget._addDecoration(new ClipPositionDecoration(this._rightClip, {
            x:TextDecoration.RIGHT, y:TextDecoration.TOP, ...positionProperties}, DeltaShelf.POSITION_FONT_PROPERTIES));
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

    _buildShape() {
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
            elements[0].move(new Point2D(
                this.lx-this.width/2 + elements[0].width / 2,
                elements[0].ly)
            );
            for (let index = 1; index < elements.length; index++) {
                let left = elements[index - 1].lx+elements[index - 1].width/2;
                let right = elements[index].lx-elements[index].width/2;
                let top = elements[index].ly-elements[index].height/2;
                let bottom = this.ly-this.height/2;
                elements[index].move(new Point2D(
                    elements[index - 1].lx + elements[index - 1].width/2 + elements[index].width / 2,
                    elements[index].ly)
                );
            }
        }
    }

    _createSAPRecord(sweepAndPrune) {
        return new SpikedSAPRecord(this, sweepAndPrune, DeltaShelf.SPIKE_SIZE);
    }

}
DeltaShelf.SPIKE_SIZE = 20;
Object.defineProperty(DeltaShelf, "magnetized", {
    get() {
        return Context.magnetized;
    },
    set(magnetized) {
        Context.magnetized = magnetized;
    }
});
Object.defineProperty(DeltaShelf, "spiked", {
    get() {
        return Context.spiked;
    },
    set(spiked) {
        Context.spiked = spiked;
        new Visitor([Context.table, Context.palettePopup], {}, function() {
            if (this instanceof DeltaShelf) {
                this._spikeDecoration.refresh();
            }
        })
    }
});
DeltaShelf.POSITION_FONT_PROPERTIES = definePropertiesSet("position", Attrs.FONT_PROPERTIES);
makeShaped(DeltaShelf);
makeDecorationsOwner(DeltaShelf);
makeLabelOwner(DeltaShelf);
makeLayered(DeltaShelf, {
    layer:DeltaLayers.MIDDLE
});
makeClipsOwner(DeltaShelf);
makeCarrier(DeltaShelf);

export class DeltaRichShelf extends DeltaShelf {

    _init({leftClip, rightClip, coverY, coverHeight, ...args}) {
        super._init({leftClip, rightClip, coverY, coverHeight, ...args});
        this._cover = this._buildCover(this.width, coverHeight, args);
    }

    _improve({leftClip, rightClip, coverY, coverHeight, ...args}) {
        super._improve({leftClip, rightClip, coverY, coverHeight, ...args});
        this._cover._setLocation(new Point2D(0, coverY));
        this._addPart(this._cover);
    }

    get decorationTarget() {
        return this._cover;
    }

    _buildCover(coverWidth, coverHeight) {
        return new DeltaCover({width:coverWidth, height:coverHeight});
    }
}
makeLayered(DeltaRichShelf, {
    layer:DeltaLayers.UP
});


export class DeltaFixing extends DeltaItem {

    constructor() {
        super({width: DeltaFixing.WIDTH, height: DeltaFixing.HEIGHT});
        this._root._node.style["z-index"] = 10;
    }

    _improve() {
        super._improve();
        this._initShape(this._buildShape());
        this._addSlots(new Slot(this, 0, 0));
    }

    _buildShape() {
        let base = new Group();
        base.add(new Rect(-DeltaFixing.WIDTH / 2, -DeltaFixing.HEIGHT / 2, DeltaFixing.WIDTH, DeltaFixing.HEIGHT)
            .attrs({ stroke: Colors.INHERIT, fill: Colors.WHITE }));
        base.add(new Circle(-DeltaFixing.WIDTH / 4, 0, DeltaFixing.DEVICE_RADIUS)
            .attrs({ stroke: Colors.BLACK, fill: Colors.WHITE }));
        base.add(new Circle(DeltaFixing.WIDTH / 4, 0, DeltaFixing.DEVICE_RADIUS)
            .attrs({ stroke: Colors.BLACK, fill: Colors.WHITE }));
        return base;
    }
}
makeShaped(DeltaFixing);
makeLayered(DeltaFixing, {
    layer:DeltaLayers.DOWN
});
makeSlotsOwner(DeltaFixing);
makeCenteredAnchorage(DeltaFixing);
makeCenteredRuler(DeltaFixing);
makePositionEditable(DeltaFixing);

DeltaFixing.WIDTH = 16;
DeltaFixing.HEIGHT = 6;
DeltaFixing.DEVICE_RADIUS = 2;

export class DeltaDivider extends DeltaItem {

    _improve() {
        super._improve();
        this._initFrame(this.width, this.height, Colors.INHERIT, Colors.WHITE);
    }

}
makeFramed(DeltaDivider);
makeLayered(DeltaDivider, {
    layer:DeltaLayers.MIDDLE
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
        let leftLadder = new DeltaLadder({
            width: data.ladderWidth,
            height: data.ladderHeight,
            topSlot: data.topSlot,
            bottomSlot: data.bottomSlot,
            slotInterval: data.slotInterval
        });
        leftLadder.setLocation( new Point2D(data.left + (data.ladderWidth) / 2, data.y));
        container.addChild(leftLadder);
        let rightLadder = new DeltaLadder({
            width: data.ladderWidth,
            height: data.ladderHeight,
            topSlot: data.topSlot,
            bottomSlot: data.bottomSlot,
            slotInterval: data.slotInterval
        });
        rightLadder.setLocation( new Point2D(data.right - (data.ladderWidth) / 2, data.y));
        container.addChild(rightLadder);
        let width = data.right - data.left;
        for (let index = 1; index <= data.intermediateLaddersCount; index++) {
            let x = (width * index) / (data.intermediateLaddersCount + 1) + data.left;
            let ladder = new DeltaDoubleLadder({
                width: data.ladderWidth * 2,
                height: data.ladderHeight,
                topSlot: data.topSlot,
                bottomSlot: data.bottomSlot,
                slotInterval: data.slotInterval
            });
            ladder.setLocation(new Point2D(x, data.y));
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
                let fixing = new DeltaFixing();
                fixing.setLocation(new Point2D(x, y));
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
                let fixing = new DeltaHook();
                fixing.setLocation(new Point2D(x, y));
                container.addChild(fixing);
            }
        }
    }
}

export class DeltaAnchorageDecoration extends Decoration {

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
                return is(DeltaShelf, DeltaFixing, DeltaHook)(element);
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
            this._askForRefresh();
        }
    }

    clone(duplicata) {
        return new DeltaAnchorageDecoration({
            lineMargin:this._lineMargin,
            labelMargin:this._labelMargin,
            indexMargin:this._indexMargin});
    }

}

export class DeltaPaneContent extends DeltaSupport {

    constructor({width, height, lineMargin, labelMargin, indexMargin}) {
        super({width, height, strokeColor:Colors.NONE, backgroundColor:Colors.LIGHTEST_GREY});
        this._anchorageDecoration = new DeltaAnchorageDecoration({lineMargin, labelMargin, indexMargin });
        this._addDecoration(this._anchorageDecoration);
        this._rulesDecoration = new RulesDecoration(this._attachmentPhysic);
        this._addDecoration(this._rulesDecoration);
        this._rulerDecoration = new RulerDecoration(this._gridPhysic);
        this._addDecoration(this._rulerDecoration);
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
        let ModulePhysic = createGravitationPhysicForElements({
            predicate:function(element) {
                return element.isClipsOnCapable
                    || is(DeltaAbstractModule, DeltaModuleEmbodiment, DeltaShelf, DeltaBlister)(element);
            },
            gravitationPredicate:is(DeltaAbstractModule, DeltaModuleEmbodiment),
            carryingPredicate:always});
        addBordersToCollisionPhysicForElements(ModulePhysic, {
            bordersCollide: {all: true}
        });
        let AttachmentPhysic = createRulersPhysic({
            predicate: is(DeltaAbstractLadder, DeltaFixing, DeltaHook)
        });
        this._attachmentPhysic = new AttachmentPhysic(this);
        let GridPhysic = createGridPhysic({
            predicate: is(DeltaAbstractLadder, DeltaFixing, DeltaHook)
        });
        this._gridPhysic = new GridPhysic(this);
        let LadderPhysic = createSlotsAndClipsPhysic({
            predicate: is(DeltaShelf),
            slotProviderPredicate: is(DeltaAbstractLadder)
        });
        let HookPhysic = createSlotsAndClipsPhysic({
            predicate: is(DeltaBlister),
            slotProviderPredicate: is(DeltaHook)
        });
        let FixingPhysic = createSlotsAndClipsPhysic({
            predicate: function(element) {
                return element.mayBeClipsedOnFixings;
            },
            slotProviderPredicate: is(DeltaFixing)
        });
        return new PhysicSelector(this,
            function(element) {
                return element.isClipsOnCapable ||
                    is(DeltaAbstractModule, DeltaModuleEmbodiment, DeltaShelf, DeltaAbstractLadder, DeltaBlister, DeltaHook, DeltaFixing, DeltaDivider)(element)
            }
        )
            .register(this._gridPhysic)
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
makeContainerMultiLayered(DeltaPaneContent, LAYERS_DEFINITION);
addPhysicToContainer(DeltaPaneContent, {
    physicBuilder: function () {
        return this._createPhysic();
    }
});
makeDecorationsOwner(DeltaPaneContent);
makeResizeableContent(DeltaPaneContent);

export class DeltaPane extends DeltaItem {

    _improve({label, contentX, contentY, contentWidth, contentHeight, lineMargin, labelMargin, indexMargin}) {
        super._improve({label});
        this._initFrame(this.width, this.height, Colors.INHERIT, Colors.WHITE);
        this._paneContent = this._createPaneContent(contentX, contentY, contentWidth, contentHeight, lineMargin, labelMargin, indexMargin);
        this._addPart(this._paneContent);
        this._initResize(Colors.RED);
        this._sizerDecoration = new SizerDecoration();
        this._addDecoration(this._sizerDecoration);
    }

    _createPaneContent(contentX, contentY, contentWidth, contentHeight, lineMargin, labelMargin, indexMargin) {
        let content = new DeltaPaneContent({width:contentWidth, height:contentHeight, lineMargin, labelMargin, indexMargin});
        content._setLocation(new Point2D(contentX, contentY));
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

    select() {
        this.putHandles();
    }

    unselect() {
        this.removeHandles();
    }

    get minWidth() {
        let dWidth = this.width - this._paneContent.width;
        return this._paneContent.minWidth + dWidth;
    }

    get minHeight() {
        let dHeight = this.height - this._paneContent.height;
        return this._paneContent.minHeight + dHeight;
    }

    resize(width, height, direction) {
        let dWidth = this.width - this._paneContent.width;
        let dHeight = this.height - this._paneContent.height;
        this._paneContent.resize(width - dWidth, height - dHeight, direction);
    }

    setSize(width, height) {
        let dWidth = this.width - this._paneContent.width;
        let dHeight = this.height - this._paneContent.height;
        super.setSize(width, height);
        this._paneContent.setSize(width - dWidth, height - dHeight);
    }

}
DeltaPane.ALL_HANDLES_BUT_BOTTOM_ONES = new ESet([
    SigmaHandle.TOP, SigmaHandle.RIGHT_TOP, SigmaHandle.RIGHT,
    SigmaHandle.LEFT, SigmaHandle.LEFT_TOP
]);
makeFramed(DeltaPane);
makeLabelOwner(DeltaPane);
makeCarrier(DeltaPane);
makeCarriable(DeltaPane);
makeDecorationsOwner(DeltaPane);
makeResizeable(DeltaPane, DeltaPane.ALL_HANDLES_BUT_BOTTOM_ONES, computeGridStep);

export class DeltaRichPane extends DeltaPane {

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
makeHeaderOwner(DeltaRichPane);
makeFooterOwner(DeltaRichPane);
