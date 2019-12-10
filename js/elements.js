'use strict';


import {
    List
} from "./collections.js";
import {
    Box
} from "./geometry.js";
import {
    Group, Rect, Fill, Stroke, Visibility, win, Colors, Circle, Line
} from "./graphics.js";
import {
    Memento, Context, Events, DragSwitchOperation, DragOperation, makeNotCloneable,
    DragMoveSelectionOperation, DragRotateSelectionOperation, Canvas, DragAreaOperation, makeSingleton,
    ifStandardDragMode, standardDrag, areaDrag, StandardDragMode, Selection
} from "./toolkit.js";
import {
    BoardElement, BoardSupport, BoardLayer, BoardZindexLayer
} from "./base-element.js";
import {
    makeContainer, makeSupport, makeDraggable, makeSelectable, makeMovable, makeRotatable, makeClickable,
    makePart, makeFramed, makeSingleImaged, makeMultiImaged, makeClipImaged, makeShaped,
    makeLayersWithContainers, makeLayered, makeContainerASandBox, makeContainerASupport, makeDeletable
} from "./core-mixins.js";
import {
    TextMenuOption, TextToggleMenuOption, makeMenuOwner, ToolToggleCommand
} from "./tools.js";
import {
    makePositioningContainer
} from "./physics.js";
import {
    makeStrokeUpdatable
} from "./standard-mixins.js";

Context.itemDrag = new DragSwitchOperation()
    .add(()=>true, DragRotateSelectionOperation.instance)
    .add(()=>true, DragMoveSelectionOperation.instance);

/**
 * Base class for elements that materialize the "content" of something. For example the content of a box. Essentially,
 * it is a "support" (other elements may dropped on) with a shape (a background visual) and is not independant (part of
 * another element, cannot be moved by itself).
 */
export class AbstractBoardContent extends BoardSupport {

    constructor(owner, width, height, ...args) {
        super(width, height, ...args);
        //this._initPart(owner);
    }

    _acceptDrop(element) {
        if (this._orientation !== undefined) {
            if (!element.rotate) return false;
            element.rotate(this._orientation);
        }
        let box = element.l2lbbox(this);
        return box.width<=this.width && box.height<=this.height;
    }

    _memento() {
        let memento = super._memento();
        memento._orientation = this._orientation;
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        this._orientation = memento._orientation;
        return this;
    }

    add(element) {
        super.add(element);
        this._observe(element);
    }

    remove(element) {
        this._forget(element);
        super.remove(element);
    }

    _notified(source, type, value) {
        if (type===Events.GEOMETRY || type===Events.ROTATED || type===Events.DROPPED) {
            this._adjustElement(source);
        }
    }

    get orientation() {
        return this._orientation;
    }

    set orientation(orientation) {
        Memento.register(this);
        this._setOrientation(orientation);
    }

    _setOrientation(orientation) {
        this._orientation = orientation;
        for (let element of this.children) {
            if (element.rotate) {
                element.rotate(this._orientation);
                this._adjustElement(element);
            }
        }
    }

    _adjustElement(element) {
        let box = element.l2lbbox(this);
        if (box.x<this.left) box.x=this.left;
        if (box.x+box.width>this.right) box.x=this.right-box.width;
        if (box.y<this.top) box.y=this.top;
        if (box.y+box.height>this.bottom) box.y=this.bottom-box.height;
        element.move(box.x+box.width/2, box.y+box.height/2);
    }
}
makePart(AbstractBoardContent);

export class AbstractBoardCover extends BoardElement {

    constructor(owner, width, height, ...args) {
        super(width, height);
        //this._initPart(owner);
        this._hidden = false;
        this.initShape(width, height,...args);
    }

    _memento() {
        let memento = super._memento();
        memento._hidden = this._hidden;
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        this._setHidden(memento._hidden);
        return this;
    }

    _acceptDrop(element) {
        return true;
    }

    _setHidden(hidden) {
        this._hidden = hidden;
        if (this._hidden) {
            this._root.visibility = Visibility.HIDDEN;
        }
        else {
            this._root.visibility = null;
        }
    }

    get hidden() {
        return this._hidden;
    }

    hide() {
        Memento.register(this);
        this._setHidden(true);
        return this;
    }

    show() {
        Memento.register(this);
        this._setHidden(false);
        return this;
    }
}
makeDraggable(AbstractBoardCover);
makePart(AbstractBoardCover);
makeContainer(AbstractBoardCover);

export class AbstractBoardBox extends BoardElement {

    constructor(width, height, ...args) {
        super(width, height);
        this.initShape(width, height,...args);
        this._dragOperation(function() {return Context.itemDrag;});
        this._boxContent = this.initBoxContent(width, height,...args);
        this._boxCover = this.initBoxCover(width, height,...args);
        this._addChild(this._boxContent);
        this._addChild(this._boxCover);
        this.addMenuOption(new TextToggleMenuOption("Hide cover", "Show cover",
            function() {
                Memento.instance.open();
                this._boxCover.hide();
            },
            function() {
                Memento.instance.open();
                this._boxCover.show();
            },
            function() {return this._boxCover.hidden;}));
    }

    get orientation() {
        return this._boxContent.orientation;
    }

    set orientation(orientation) {
        this._boxContent.orientation = orientation;
    }

    _acceptDrop() {
        return false;
    }

    _memento() {
        let memento = super._memento();
        memento._boxContent = this._boxContent;
        memento._boxCover = this._boxCover;
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        if (this._boxContent != memento._boxContent) {
            this._replace(this._boxContent, memento._boxContent);
        }
        if (this._boxCover != memento._boxCover) {
            this._replace(this._boxCover, memento._boxCover);
        }
    }

}
makeSelectable(AbstractBoardBox);
makeMovable(AbstractBoardBox);
makeRotatable(AbstractBoardBox);
makeContainer(AbstractBoardBox);
makeDraggable(AbstractBoardBox);
makeMenuOwner(AbstractBoardBox);

export class BoardContent extends AbstractBoardContent {

    constructor(owner, width, height, strokeColor, backgroundColor) {
        super(owner, width, height, strokeColor, backgroundColor);
    }

    initShape(width, height, strokeColor, backgroundColor) {
        return this._initFrame(width, height, strokeColor, backgroundColor);
    }
}
makeFramed(BoardContent);

export class BoardCover extends AbstractBoardCover {

    constructor(owner, width, height, strokeColor, backgroundColor) {
        super(owner, width, height, strokeColor, backgroundColor);
    }

    initShape(width, height, strokeColor, backgroundColor) {
        return this._initFrame(width, height, strokeColor, backgroundColor);
    }
}
makeFramed(BoardCover);

export class BoardBox extends AbstractBoardBox {

    constructor(width, height, margin, strokeColor, backgroundColor) {
        super(width, height, margin, strokeColor, backgroundColor);
    }

    initShape(width, height, margin, strokeColor, backgroundColor) {
        return this._initFrame(width, height, strokeColor, backgroundColor);
    }

    initBoxContent(width, height, margin, strokeColor, backgroundColor) {
        return new BoardContent(this, width-margin/2, height-margin/2, strokeColor, backgroundColor);
    }

    initBoxCover(width, height, margin, strokeColor, backgroundColor) {
        return new BoardCover(this, width, height, strokeColor, backgroundColor);
    }

}
makeFramed(BoardBox);

export class BoardImageContent extends AbstractBoardContent {

    constructor(owner, width, height, strokeColor, backgroundURL) {
        super(owner, width, height, strokeColor, backgroundURL);
    }

    initShape(width, height, strokeColor, backgroundURL) {
        return this._initImage(width, height, strokeColor, backgroundURL);
    }
}
makeSingleImaged(BoardImageContent);

export class BoardImageCover extends AbstractBoardCover {

    constructor(owner, width, height, strokeColor, backgroundURL) {
        super(owner, width, height, strokeColor, backgroundURL);
    }

    initShape(width, height, strokeColor, backgroundURL) {
        return this._initImage(width, height, strokeColor, backgroundURL);
    }
}
makeSingleImaged(BoardImageCover);

export class BoardImageBox extends AbstractBoardBox {

    constructor(width, height, margin, strokeColor, backgroundURL, sideURL, coverURL) {
        super(width, height, margin, strokeColor, backgroundURL, sideURL, coverURL);
    }

    initShape(width, height, margin, strokeColor, backgroundURL, sideURL, coverURL) {
        return this._initImage(width, height, strokeColor, backgroundURL, sideURL);
    }

    initBoxContent(width, height, margin, strokeColor, backgroundURL, sideURL, coverURL) {
        return new BoardImageContent(this, width-margin/2, height-margin/2, strokeColor, sideURL);
    }

    initBoxCover(width, height, margin, strokeColor, backgroundURL, sideURL, coverURL) {
        return new BoardImageCover(this, width, height, strokeColor, coverURL);
    }

}
makeSingleImaged(BoardImageBox);

export class AbstractBoardCounter extends BoardElement {

    constructor(width, height, ...args) {
        super(width, height);
        this.initShape(width, height, ...args);
        this._dragOperation(function() {return Context.itemDrag;});
        this._clickHandler(function () {
            return ()=>this.imageIndex = this.imageIndex+1;
        });
    }
}
makeSelectable(AbstractBoardCounter);
makeMovable(AbstractBoardCounter);
makeRotatable(AbstractBoardCounter);
makeDraggable(AbstractBoardCounter);
makeClickable(AbstractBoardCounter);
makeMenuOwner(AbstractBoardCounter);
makeSupport(AbstractBoardCounter);
makePositioningContainer( AbstractBoardCounter, {
    predicate: element => element instanceof BoardCounter,
    positionsBuilder: function () {
        return [{x: 0, y: 0}]
    }
});

export class BoardCounter extends AbstractBoardCounter {

    constructor(width, height, strokeColor, ...backgroundURLs) {
        super(width, height, strokeColor, ...backgroundURLs)
    }

    initShape(width, height, strokeColor, ...backgroundURLs) {
        return this._initImages(width, height, strokeColor, ...backgroundURLs);
    }

}
makeMultiImaged(BoardCounter);
makeLayered(BoardCounter, {layer: "content"});

export class AbstractBoardDie extends BoardElement {

    constructor(width, height, ...args) {
        super(width, height);
        this.initShape(width, height, ...args);
        this._dragOperation(function() {return DragMoveSelectionOperation.instance;});
        this._clickHandler(function () {
            return ()=> {
                for (let t = 0; t < 10; t++) {
                    win.setTimeout(() => {
                        let index = Math.floor(Math.random() * this.faceCount);
                        this.imageIndex = index;
                    }, t * 100);
                }
            }
        });
    }

    get faceCount() {
        return this._faceCount;
    }
}
makeSelectable(AbstractBoardDie);
makeMovable(AbstractBoardDie);
makeDraggable(AbstractBoardDie);
makeClickable(AbstractBoardDie);
makeMenuOwner(AbstractBoardDie);
makeSupport(AbstractBoardDie);

export class BoardDie extends AbstractBoardDie {

    constructor(width, height, strokeColor, imageURL, ...clipped) {
        super(width, height, strokeColor, imageURL, ...clipped);
        this._faceCount = clipped.length;
    }

    initShape(width, height, strokeColor, imageURL, ...clipped) {
        return this._initImages(width, height, strokeColor, imageURL, ...clipped);
    }

}
makeClipImaged(BoardDie);

export class AbstractBoardMap extends BoardElement {

    constructor(width, height, ...args) {
        super(width, height);
        this._root.add(this._initRotatable() // TODO problem
            .add(this.initShape(width, height, ...args))
        );
        this._dragOperation(function() {return Context.itemDrag;});
        this._build();
    }

    _build() {
    }

}
makeSelectable(AbstractBoardMap);
makeMovable(AbstractBoardMap);
makeRotatable(AbstractBoardMap);
makeDraggable(AbstractBoardMap);
makeMenuOwner(AbstractBoardMap);

export class BoardMap extends AbstractBoardMap {

    constructor(width, height, strokeColor, backgroundURL) {
        super(width, height, strokeColor, backgroundURL)
    }

    initShape(width, height, strokeColor, backgroundURL) {
        return this._initImage(width, height, strokeColor, backgroundURL);
    }

}
makeSingleImaged(BoardMap);

export class DragHandleOperation extends DragOperation {

    constructor() {
        super();
    }

    accept(element, x, y, event) {
        return (!Context.isReadOnly() && element.movable && super.accept(element, x, y, event));
    }

    doDragStart(element, x, y, event) {
        Memento.instance.open();
        Memento.register(element);
        let invertedMatrix = element.global.invert();
        this.dragX = invertedMatrix.x(x, y);
        this.dragY = invertedMatrix.y(x, y);
    }

    doDragMove(element, x, y, event) {
        let invertedMatrix = element.parent.global.invert();
        let dX = invertedMatrix.x(x, y) - this.dragX;
        let dY = invertedMatrix.y(x, y) - this.dragY;
        element._setLocation(dX, dY);
        element.parent._receiveMove && element.parent._receiveMove(element);
    }

    doDrop(element, x, y, event) {
        element.parent._receiveDrop && element.parent._receiveDrop(element);
        element._droppedIn(element.parent);
    }
}
makeNotCloneable(DragHandleOperation);
DragHandleOperation.instance = new DragHandleOperation();

export class BoardHandle extends BoardElement {

    constructor(color = BoardHandle.COLOR) {
        let zoom = Canvas.instance.zoom;
        super(0, 0);
        this.initShape(BoardHandle.SIZE/zoom, BoardHandle.SIZE/zoom, color, zoom);
        this._dragOperation(function() {return DragHandleOperation.instance;});
        this._observe(Canvas.instance);
    }

    _notified(source, event, data) {
        if (event === Events.ZOOM) {
            let zoom = Canvas.instance.zoom;
            this.shape.attrs({
                x:-BoardHandle.SIZE/zoom/2, y:-BoardHandle.SIZE/zoom/2,
                width:BoardHandle.SIZE/zoom, height:BoardHandle.SIZE/zoom, stroke_width:1/zoom
            });
        }
    }

    initShape(width, height, strokeColor, zoom) {
        let shape = new Rect(-width/2, -height/2, width, height)
            .attrs({stroke:strokeColor, fill_opacity:0.01, stroke_width:1/zoom});
        return this._initShape(shape);
    }

    _droppedIn() {}

    _cloned(copy, duplicata) {
        super._cloned();
        copy._observe(Canvas.instance);
    }
}
makeMovable(BoardHandle);
makeShaped(BoardHandle);
makeDraggable(BoardHandle);
BoardHandle.SIZE = 8;
BoardHandle.COLOR = Colors.RED;

export function makeResizeable(superClass) {

    superClass.prototype._initResize = function(color) {
        this._handles = new List();
        this._leftTopHandle = this._createHandle(color);
        this._topHandle = this._createHandle(color);
        this._rightTopHandle = this._createHandle(color);
        this._rightHandle = this._createHandle(color);
        this._rightBottomHandle = this._createHandle(color);
        this._bottomHandle = this._createHandle(color);
        this._leftBottomHandle = this._createHandle(color);
        this._leftHandle = this._createHandle(color);
    };

    superClass.prototype._putHandles = function() {
        for (let handle of this._handles) {
            this._root.add(handle._root);
            handle._parent = this;
        }
        this._placeHandles();
    };

    superClass.prototype.putHandles = function() {
        for (let handle of this._handles) {
            Memento.register(handle);
        }
        this._putHandles();
    };

    superClass.prototype._removeHandles = function() {
        for (let handle of this._handles) {
            this._root.remove(handle._root);
            handle._parent = null;
        }
    };

    superClass.prototype.removeHandles = function() {
        for (let handle of this._handles) {
            Memento.register(handle);
        }
        this._removeHandles();
    };

    superClass.prototype._placeHandles = function() {
        this._leftTopHandle._setLocation(-this.width/2, -this.height/2);
        this._topHandle._setLocation(0, -this.height/2);
        this._rightTopHandle._setLocation(this.width/2, -this.height/2);
        this._rightHandle._setLocation(this.width/2, 0);
        this._rightBottomHandle._setLocation(this.width/2, this.height/2);
        this._bottomHandle._setLocation(0, this.height/2);
        this._leftBottomHandle._setLocation(-this.width/2, this.height/2);
        this._leftHandle._setLocation(-this.width/2, 0);
    };

    superClass.prototype.placeHandles = function() {
        for (let handle of this._handles) {
            Memento.register(handle);
        }
        this._placeHandles();
    };

    superClass.prototype._createHandle = function(color) {
        let handle = new BoardHandle(color);
        this._handles.add(handle);
        handle._parent = this;
        return handle;
    };

    superClass.prototype.resize = function(width, height) {
        this._setSize(width, height);
        return this;
    };

    /**
     * Defines in the bounds, the resizeable item cannot exceed. The defaulting value is the geometry of the item
     * parent.
     */
    if (!superClass.prototype.bounds) {
        superClass.prototype.bounds = function () {
            return {
                left: -this.parent.width / 2-this.lx, right: this.parent.width / 2-this.lx,
                top: -this.parent.height / 2-this.ly, bottom: this.parent.height / 2-this.ly
            }
        };
    }

    /**
     * Process the "drop" of one of the resizeable item handles. This method has three missions:
     * <ul>
     *     <li> Ensure the item cannot go outside the allowed bounds.
     *     <li> Ensure that handles are not permuted ("left" handles go to right and vice versa, or "top" handles go to
     *     bottom and vice versa). If handles are permuted, this method reorganize the handles accordingly.
     *     <li> Update the geometry (size and position) of the resizeable item (and update handles positions).
     * </ul>
     * @param element resizeable item
     * @private
     */
    superClass.prototype._receiveMove = function(element) {

        /**
         * Ensure that the frame is indside the allowed bounds. If not, reduce the frame geometry accordingly.
         * @param element resizeable item to rebound
         * @param bounds the allowed bounds
         */
        function rebound(element, bounds) {
            let lx = element.lx;
            let ly = element.ly;
            if (lx<bounds.left) lx = bounds.left;
            if (lx>bounds.right) lx = bounds.right;
            if (ly<bounds.top) ly = bounds.top;
            if (ly>bounds.bottom) ly = bounds.bottom;
            if (lx!==element.lx || ly!==element.ly) {
                Memento.register(element);
                element._setLocation(lx, ly);
            }
        }

        if (element instanceof BoardHandle) {
            rebound(element, this.bounds());
            let width = this.width;
            let height = this.height;
            let lx = this.lx;
            let ly = this.ly;
            // Permutation management
            if (element===this._leftTopHandle || element===this._leftHandle || element===this._leftBottomHandle) {
                width = -element.lx+this.width/2;
                lx += (this.width-width)/2;
            }
            else if (element===this._rightTopHandle || element===this._rightHandle || element===this._rightBottomHandle) {
                width = element.lx+this.width/2;
                lx += (width-this.width)/2;
            }
            if (element===this._leftTopHandle || element===this._topHandle || element===this._rightTopHandle) {
                height = -element.ly+this.height/2;
                ly += (this.height-height)/2;
            }
            else if (element===this._leftBottomHandle || element===this._bottomHandle || element===this._rightBottomHandle) {
                height = element.ly+this.height/2;
                ly += (height-this.height)/2;
            }
            if (width<0) {
                width = -width;
                let hdl = this._leftTopHandle; this._leftTopHandle = this._rightTopHandle; this._rightTopHandle = hdl;
                hdl = this._leftHandle; this._leftHandle = this._rightHandle; this._rightHandle = hdl;
                hdl = this._leftBottomHandle; this._leftBottomHandle = this._rightBottomHandle; this._rightBottomHandle = hdl;
            }
            if (height<0) {
                height = -height;
                let hdl = this._leftTopHandle; this._leftTopHandle = this._leftBottomHandle; this._leftBottomHandle = hdl;
                hdl = this._topHandle; this._topHandle = this._bottomHandle; this._bottomHandle = hdl;
                hdl = this._rightTopHandle; this._rightTopHandle = this._rightBottomHandle; this._rightBottomHandle = hdl;
            }
            // Geometry update
            Memento.register(this);
            this.setLocation(lx, ly);
            this.resize(width, height);
            this.placeHandles();
        }
    }
}

export class BoardFrame extends BoardElement {

    constructor(width, height) {
        super(width, height);
        this.initShape(width, height, BoardFrame.COLOR);
        this._initResize();
        this._putHandles();
        this._observe(Canvas.instance);
    }

    _notified(source, event, data) {
        if (event === Events.ZOOM) {
            let zoom = Canvas.instance.zoom;
            this.shape.attrs({stroke_width:1/zoom});
        }
    }

    _setSize(width, height) {
        super._setSize(width, height);
        this.shape.attrs({x:-width/2, y:-height/2, width:width, height:height});
    }

    initShape(width, height, strokeColor) {
        let shape = new Rect(-width/2, -height/2, width, height)
            .attrs({stroke: strokeColor, fill:Fill.NONE, stroke_width: 1});
        return this._initShape(shape);
    }

    get box() {
        return new Box(this.lx-this.width/2, this.ly-this.height/2, this.width, this.height);
    }

    _cloned(copy, duplicata) {
        super._cloned();
        copy._observe(Canvas.instance);
    }
}
makeShaped(BoardFrame);
makeResizeable(BoardFrame);
makeLayered(BoardFrame, {layer: "configuration"});

export class BoardTarget extends BoardElement {

    constructor(size, strokeColor) {
        super(size, size);
        this.initShape(size, strokeColor);
        this._dragOperation(function() {return DragMoveSelectionOperation.instance;});
        this._observe(Canvas.instance);
        this.addMenuOption(new TextMenuOption("Edit Target",
            function () {
                this.edit();
            }));
    }

    edit() {
        Canvas.instance.openModal(
            editTarget,
            {
                x: this.lx,
                y: this.ly,
                strokeColor: this.strokeColor
            },
            data => {
                Memento.instance.open();
                this.update(data);
            });
    }

    update(data) {
        Memento.register(this);
        this.move(data.x, data.y);
        this._initStroke(data);
    }

    _notified(source, event, data) {
        if (event === Events.ZOOM) {
            let zoom = Canvas.instance.zoom;
            this.shape.attrs({stroke_width:this._strokeWidth/zoom});
        }
    }

    initShape(size, strokeColor) {
        let shape = new Group()
            .add(new Line(-size/2, 0, size/2, 0))
            .add(new Line(0, -size/2, 0, size/2))
            .add(new Circle(0, 0, size/4).attrs({fill_opacity:0.001}));
        this._initShape(shape);
        this._initStroke({strokeColor:strokeColor});
        return this._shape;
    }

    _cloned(copy, duplicata) {
        super._cloned();
        copy._observe(Canvas.instance);
    }

}

makeShaped(BoardTarget);
makeSelectable(BoardTarget);
makeMovable(BoardTarget);
makeDraggable(BoardTarget);
makeMenuOwner(BoardTarget);
makeLayered(BoardTarget, {layer:"configuration"});
makeStrokeUpdatable(BoardTarget);

BoardFrame.COLOR = Colors.RED;

export function makeConfigurableMap(superClass, predicate, positionsFct) {

    let ContentLayer = makePositioningContainer(class ContentLayer extends BoardZindexLayer {}, {
        predicate,
        positionsBuilder: function (element) {
            return positionsFct.call(this.host, element);
        }
    });

    makeLayersWithContainers(superClass, {
        layersBuilder:()=>{
            return {
                configuration:new BoardLayer(),
                content:new ContentLayer(),
                top:new BoardLayer()
            };
        }
    });
    makeContainerASupport(superClass);
    makeContainerASandBox(superClass);

    let build = superClass.prototype._build;
    superClass.prototype._build = function () {
        build && build.call(this);
        this._contextMenu();
        this.configFrame = new BoardFrame(100, 50);
        this.add(this.configFrame);
    };

    superClass.prototype._contextMenu = function() {
        this.addMenuOption(new TextToggleMenuOption("Hide Configuration", "Show Configuration",
            function () {
                this.hideConfiguration();
            },
            function () {
                this.showConfiguration();
            },
            function() { return !this.configurationShown; }));
        this.addMenuOption(new TextMenuOption("Generate Hex Targets",
            function () {
                this.callForHexTargetsGeneration();
            }));
        this.addMenuOption(new TextMenuOption("Generate Square Targets",
            function () {
                this.callForSquareTargetsGeneration();
            }));
    };

    superClass.prototype.callForHexTargetsGeneration = function () {
        Canvas.instance.openModal(
            generateHexTargets,
            {
                colCount: 10,
                rowCount: 10,
                type: 1
            },
            data => {
                Memento.instance.open();
                this.generateHexTargets(this.configFrame.box, data);
            });
    };

    superClass.prototype.callForSquareTargetsGeneration = function () {
        Canvas.instance.openModal(
            generateSquareTargets,
            {
                colCount: 10,
                rowCount: 10
            },
            data => {
                Memento.instance.open();
                this.generateSquareTargets(this.configFrame.box, data);
            });
    };

    superClass.prototype.generateHexTargets = function(bounds, data) {
        data.strokeColor=data.strokeColor||Colors.RED;
        if (data.type===1 || data.type===2) {
            let colSliceWidth = bounds.width/(data.colCount*3+1);
            let rowHeight = bounds.height/data.rowCount;
            let margin = data.type===1 ? 0 : rowHeight/2;
            for (let x = colSliceWidth * 2; x < bounds.width; x += colSliceWidth*3) {
                for (let y = margin + rowHeight / 2; y < bounds.height; y += rowHeight) {
                    this.add(new BoardTarget(16, data.strokeColor).move(x + bounds.x, y + bounds.y));
                }
                margin = margin ? 0 : rowHeight/2;
            }
        }
        else if (data.type===3 || data.type===4) {
            let rowSliceHeight = bounds.height/(data.rowCount*3+1);
            let colWidth = bounds.width/data.colCount;
            let margin = data.type===3 ? 0 : colWidth/2;
            for (let y = rowSliceHeight * 2; y < bounds.height; y += rowSliceHeight*3) {
                for (let x = margin + colWidth / 2; x < bounds.width; x += colWidth) {
                    this.add(new BoardTarget(16, data.strokeColor).move(x + bounds.x, y + bounds.y));
                }
                margin = margin ? 0 : colWidth/2;
            }
        }
    };

    superClass.prototype.generateSquareTargets = function(bounds, data) {
        data.strokeColor=data.strokeColor||Colors.RED;
        let colWidth = bounds.width/data.colCount;
        let rowHeight = bounds.height/data.rowCount;
        for (let x = colWidth/2; x<bounds.width; x+=colWidth) {
            for (let y = rowHeight/2; y<bounds.height; y+=rowHeight) {
                this.add(new BoardTarget(16, data.strokeColor).move(x+bounds.x, y+bounds.y));
            }
        }
    };

    superClass.prototype.showConfiguration = function() {
        this.showLayer("configuration");
    };

    superClass.prototype.hideConfiguration = function() {
        this.hideLayer("configuration");
    };

    if (!superClass.prototype.hasOwnProperty("configurationShown")) {
        Object.defineProperty(superClass.prototype, "configurationShown", {
            configurable:true,
            get() {
                return this.hidden("configuration");
            }
        });
    }

    let getLayer = superClass.prototype._getLayer;
    superClass.prototype._getLayer = function(element) {
        if (element.isSandBox) {
            return "top";
        }
        else return getLayer.call(this, element);
    }
}

export class DragPrintAreaOperation extends DragAreaOperation {

    constructor() {
        super();
    }

    setBackgroundParameters(area, zoom) {
        area.attrs({
            fill: Colors.GREEN,
            stroke: Stroke.NONE,
            fill_opacity: 0.1,
            stroke_width : 1/zoom
        });
    }

    setFrameParameters(area, zoom) {
        area.attrs({
            fill: Fill.NONE,
            stroke: Colors.GREEN,
            stroke_opacity: 0.5,
            stroke_width : 1/zoom
        });
    }

    _doSelection(event, area) {
        let width = area.width;
        let height = area.height;
        let x = area.x + area.width/2;
        let y = area.y + area.height/2;
        if (width > BoardPrintArea.MIN_SIZE &&
            height > BoardPrintArea.MIN_SIZE) {
            Canvas.instance._fire(BoardPrintArea.events.NEW_AREA, {x, y, width, height});
        }
    }

}
makeSingleton(DragPrintAreaOperation);

export class BoardPrintArea extends BoardElement {

    constructor(width, height) {
        super(width, height);
        this._initFrame(width, height, Colors.GREEN, Colors.GREEN, {
            fill_opacity: 0.1,
            stroke_opacity: 0.5,
        });
        this._initResize(Colors.GREEN);
        this._dragOperation(()=>DragMoveSelectionOperation.instance);
        this._createContextMenu();
    }

    select() {
        this.putHandles();
    }

    unselect() {
        this.removeHandles();
    }

    get selectionMark() {
        return null;
    }

    _createContextMenu() {}

}
makeContainer(BoardPrintArea);
makeFramed(BoardPrintArea);
makeMenuOwner(BoardPrintArea);
makeResizeable(BoardPrintArea);
makeSelectable(BoardPrintArea);
makeDraggable(BoardPrintArea);
makeMovable(BoardPrintArea);
makeDeletable(BoardPrintArea);
BoardPrintArea.MIN_SIZE = 10;
BoardPrintArea.events = {
    NEW_AREA : "new-area"
};

export function ifPrintRequested() {
    return ifStandardDragMode(StandardDragMode.PRINT);
}

Canvas.prototype.enablePrint = function() {
    StandardDragMode.PRINT = "print";
    standardDrag.addFirst(ifPrintRequested, DragPrintAreaOperation.instance);
    areaDrag.addFirst(ifPrintRequested, DragPrintAreaOperation.instance);
};

export function pdfModeCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/pdf_on.svg", "./images/icons/pdf_off.svg",
        () => {
            StandardDragMode.mode = StandardDragMode.PRINT;
            Canvas.instance._fire(StandardDragMode.events.SWITCH_MODE, StandardDragMode.PRINT);
        }, () => StandardDragMode.mode === StandardDragMode.PRINT)
    );
}