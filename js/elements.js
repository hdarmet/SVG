'use strict';

import {
    Group, Rect, Fill, Visibility, win, Colors, Circle, Line
} from "./svgbase.js";
import {
    Memento, Box, Context, Events, DragSwitchOperation, DragOperation
} from "./toolkit.js";
import {
    BoardElement, BoardSupport, BoardLayer, BoardZindexLayer,
    makeContainer, makeSupport, makeDraggable, makeSelectable, makeMoveable, makeRotatable, makeClickable,
    makePositionningContainer, makePart, makeFramed, makeSingleImaged, makeMultiImaged, makeClipImaged, makeShaped,
    makeLayersWithContainers, makeLayered
} from "./base-element.js";
import {
    TextMenuOption, TextToggleMenuOption, makeMenuOwner
} from "./tools.js";

Context.itemDrag = new DragSwitchOperation()
    .add(()=>true, Context.rotateSelectionDrag)
    .add(()=>true, Context.moveSelectionDrag);

export class AbstractBoardContent extends BoardSupport {

    constructor(owner, width, height, ...args) {
        super(width, height, ...args);
        this._initPart(owner);
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
        this._initPart(owner);
        this._hidden = false;
        this._root.add(this.initShape(width, height,...args)).add(this._initContent());
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
        this._root.add(this._initRotatable()
            .add(this.initShape(width, height,...args))
            .add(this._initContent()));
        this._dragOperation(Context.itemDrag);
        this._boxContent = this.initBoxContent(width, height,...args);
        this._boxCover = this.initBoxCover(width, height,...args);
        this._add(this._boxContent);
        this._add(this._boxCover);
        this.addMenuOption(new TextToggleMenuOption("Hide cover", "Show cover",
            function() {
                Context.memento.open();
                this._boxCover.hide();
            },
            function() {
                Context.memento.open();
                this._boxCover.show();
            },
            function() {return this._boxCover.hidden;},
            ()=>true));
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
makeMoveable(AbstractBoardBox);
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
        this._root.add(this._initRotatable()
            .add(this.initShape(width, height, ...args))
            .add(this._initContent())
        );
        this._dragOperation(Context.itemDrag);
        this._clickHandler(function () {
            this.imageIndex = this.imageIndex+1;
        });
    }

}
makeSelectable(AbstractBoardCounter);
makeMoveable(AbstractBoardCounter);
makeRotatable(AbstractBoardCounter);
makeDraggable(AbstractBoardCounter);
makeClickable(AbstractBoardCounter);
makeMenuOwner(AbstractBoardCounter);
makeSupport(AbstractBoardCounter);
makePositionningContainer(AbstractBoardCounter, function() {return [{x:0, y:0}]});

export class BoardCounter extends AbstractBoardCounter {

    constructor(width, height, strokeColor, ...backgroundURLs) {
        super(width, height, strokeColor, ...backgroundURLs)
    }

    initShape(width, height, strokeColor, ...backgroundURLs) {
        return this._initImages(width, height, strokeColor, ...backgroundURLs);
    }

}
makeMultiImaged(BoardCounter);
makeLayered(BoardCounter, "content");

export class AbstractBoardDie extends BoardElement {

    constructor(width, height, ...args) {
        super(width, height);
        this._root.add(this.initShape(width, height, ...args))
            .add(this._initContent());
        this._dragOperation(Context.moveSelectionDrag);
        this._clickHandler(function () {
            for (let t=0; t<10; t++) {
                win.setTimeout(() => {
                    let index = Math.floor(Math.random() * this.faceCount);
                    this.imageIndex = index;
                }, t * 100);
            }
        });
    }

    get faceCount() {
        return this._faceCount;
    }
}
makeSelectable(AbstractBoardDie);
makeMoveable(AbstractBoardDie);
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
        this._root.add(this._initRotatable()
            .add(this.initShape(width, height, ...args))
        );
        this._dragOperation(Context.itemDrag);
        this._build();
    }

    _build() {
    }

}
makeSelectable(AbstractBoardMap);
makeMoveable(AbstractBoardMap);
makeRotatable(AbstractBoardMap);
makeDraggable(AbstractBoardMap);
makeMenuOwner(AbstractBoardMap);
makeLayersWithContainers(AbstractBoardMap);

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
        return (!Context.readOnly && element.moveable && super.accept(element, x, y, event));
    }

    doDragStart(element, x, y, event) {
        Context.memento.open();
        Memento.register(element);
        let invertedMatrix = element.global.invert();
        this.dragX = invertedMatrix.x(x, y);
        this.dragY = invertedMatrix.y(x, y);
    }

    doDragMove(element, x, y, event) {
        let invertedMatrix = element.parent.global.invert();
        let dX = invertedMatrix.x(x, y) - this.dragX;
        let dY = invertedMatrix.y(x, y) - this.dragY;
        element._setPosition(dX, dY);
        element.parent._receiveMove && element.parent._receiveMove(element);
    }

    doDrop(element, x, y, event) {
        element.parent._receiveDrop && element.parent._receiveDrop(element);
        element._droppedIn(element.parent);
    }
}
DragHandleOperation.instance = new DragHandleOperation();

export class BoardHandle extends BoardElement {

    constructor() {
        let zoom = Context.canvas.zoom;
        super(0, 0);
        this._root.add(this.initShape(BoardHandle.SIZE/zoom, BoardHandle.SIZE/zoom, BoardHandle.COLOR, zoom));
        this._dragOperation(DragHandleOperation.instance);
        this._observe(Context.canvas);
    }

    _notified(source, event, data) {
        if (event === Events.ZOOM) {
            let zoom = Context.canvas.zoom;
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
}
makeMoveable(BoardHandle);
makeShaped(BoardHandle);
makeDraggable(BoardHandle);
BoardHandle.SIZE = 8;
BoardHandle.COLOR = Colors.RED;

export function makeResizeable(superClass) {

    superClass.prototype._initResize = function() {
        this._leftTopHandle = this._createHandle();
        this._topHandle = this._createHandle();
        this._rightTopHandle = this._createHandle();
        this._rightHandle = this._createHandle();
        this._rightBottomHandle = this._createHandle();
        this._bottomHandle = this._createHandle();
        this._leftBottomHandle = this._createHandle();
        this._leftHandle = this._createHandle();
        this._placeHandles();
    };

    superClass.prototype._placeHandles = function() {

        function setPosition(handle, x, y) {
            Memento.register(handle);
            handle._setPosition(x, y);
        }

        setPosition(this._leftTopHandle, -this.width/2, -this.height/2);
        setPosition(this._topHandle, 0, -this.height/2);
        setPosition(this._rightTopHandle, this.width/2, -this.height/2);
        setPosition(this._rightHandle, this.width/2, 0);
        setPosition(this._rightBottomHandle, this.width/2, this.height/2);
        setPosition(this._bottomHandle, 0, this.height/2);
        setPosition(this._leftBottomHandle, -this.width/2, this.height/2);
        setPosition(this._leftHandle, -this.width/2, 0);
    };

    superClass.prototype._createHandle = function() {
        let handle = new BoardHandle();
        this._root.add(handle._root);
        handle._parent = this;
        return handle;
    };

    if (!superClass.prototype.bounds) {
        superClass.prototype.bounds = function () {
            return {
                left: -this.parent.width / 2-this.lx, right: this.parent.width / 2-this.lx,
                top: -this.parent.height / 2-this.ly, bottom: this.parent.height / 2-this.ly
            }
        };
    }

    superClass.prototype._receiveMove = function(element) {

        function rebound(element, bounds) {
            let lx = element.lx;
            let ly = element.ly;
            if (lx<bounds.left) lx = bounds.left;
            if (lx>bounds.right) lx = bounds.right;
            if (ly<bounds.top) ly = bounds.top;
            if (ly>bounds.bottom) ly = bounds.bottom;
            if (lx!==element.lx || ly!==element.ly) {
                Memento.register(element);
                element._setPosition(lx, ly);
            }
        }

        if (element instanceof BoardHandle) {
            rebound(element, this.bounds());
            let width = this.width;
            let height = this.height;
            let lx = this.lx;
            let ly = this.ly;
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
            Memento.register(this);
            this._setPosition(lx, ly);
            this._setSize(width, height);
            this._placeHandles();
        }
    }
}

export class BoardFrame extends BoardElement {

    constructor(width, height) {
        super(width, height);
        this._root.add(this.initShape(width, height, BoardFrame.COLOR));
        this._initResize();
        this._observe(Context.canvas);
    }

    _notified(source, event, data) {
        if (event === Events.ZOOM) {
            let zoom = Context.canvas.zoom;
            this.shape.attrs({stroke_width:1/zoom});
        }
    }

    _setSize(width, height) {
        this._width = width;
        this._height = height;
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
}
makeShaped(BoardFrame);
makeResizeable(BoardFrame);
makeLayered(BoardFrame, "configuration");

export class BoardTarget extends BoardElement {

    constructor(size, color) {
        super(size, size);
        this._root.add(this.initShape(size, color));
        this._dragOperation(Context.moveSelectionDrag);
        this._observe(Context.canvas);
        this.addMenuOption(new TextMenuOption("Edit Target",
            function () {
                this.edit();
            },
            () => true));
    }

    edit() {
        console.log(this.lx+" "+this.ly)
        Context.canvas.openModal(
            editTarget,
            {
                x: this.lx,
                y: this.ly,
                color: null
            },
            data => {
                Context.memento.open();
                this.update(data);
            });
    }

    update(data) {
        Memento.register(this);
        this.move(data.x, data.y);
    }

    _notified(source, event, data) {
        if (event === Events.ZOOM) {
            let zoom = Context.canvas.zoom;
            this.shape.attrs({stroke_width:1/zoom});
        }
    }

    initShape(size, strokeColor) {
        let shape = new Group()
            .add(new Line(-size/2, 0, size/2, 0))
            .add(new Line(0, -size/2, 0, size/2))
            .add(new Circle(0, 0, size/4).attrs({fill_opacity:0.001}))
            .attrs({stroke: strokeColor, stroke_width: 1});
        return this._initShape(shape);
    }

}
makeShaped(BoardTarget);
makeSelectable(BoardTarget);
makeMoveable(BoardTarget);
makeDraggable(BoardTarget);
makeMenuOwner(BoardTarget);
makeLayered(BoardTarget, "configuration");

BoardFrame.COLOR = Colors.RED;

export function makeConfigurableMap(superClass, positionFct) {

    class ContentLayer extends BoardZindexLayer {
    }
    makePositionningContainer(ContentLayer, function(element) {
        return positionFct.call(this.parent, element);
    });

    let build = superClass.prototype._build;
    superClass.prototype._build = function () {
        build && build.call(this);
        this._hinge.add(this._initContent({
            configuration:new BoardLayer(),
            content:new ContentLayer()
        }));
        this.addMenuOption(new TextToggleMenuOption("Hide Configuration", "Show Configuration",
            function () {
                this.hideConfiguration();
            },
            function () {
                this.showConfiguration();
            },
            function() { return !this.configurationShown; },
            () => true));
        this.addMenuOption(new TextMenuOption("Generate Hex Targets",
            function () {
                this.callForHexTargetsGeneration();
            },
            () => true));
        this.addMenuOption(new TextMenuOption("Generate Square Targets",
            function () {
                this.callForSquareTargetsGeneration();
            },
            () => true));
        this.configFrame = new BoardFrame(100, 50);
        this.add(this.configFrame);
    };

    superClass.prototype.callForHexTargetsGeneration = function () {
        Context.canvas.openModal(
            generateHexTargets,
            {
                colCount: 10,
                rowCount: 10,
                type: 1
            },
            data => {
                Context.memento.open();
                this.generateHexTargets(this.configFrame.box, data.colCount, data.rowCount, data.type);
            });
    };

    superClass.prototype.callForSquareTargetsGeneration = function () {
        Context.canvas.openModal(
            generateSquareTargets,
            {
                colCount: 10,
                rowCount: 10
            },
            data => {
                Context.memento.open();
                this.generateSquareTargets(this.configFrame.box, data.colCount, data.rowCount);
            });
    };

    superClass.prototype.generateHexTargets = function(bounds, colCount, rowCount, type) {
        if (type===1 || type===2) {
            let colSliceWidth = bounds.width/(colCount*3+1);
            let rowHeight = bounds.height/rowCount;
            let margin = type===1 ? 0 : rowHeight/2;
            for (let x = colSliceWidth * 2; x < bounds.width; x += colSliceWidth*3) {
                for (let y = margin + rowHeight / 2; y < bounds.height; y += rowHeight) {
                    this.add(new BoardTarget(16, Colors.RED).move(x + bounds.x, y + bounds.y));
                }
                margin = margin ? 0 : rowHeight/2;
            }
        }
        else if (type===3 || type===4) {
            let rowSliceHeight = bounds.height/(rowCount*3+1);
            let colWidth = bounds.width/colCount;
            let margin = type===3 ? 0 : colWidth/2;
            for (let y = rowSliceHeight * 2; y < bounds.height; y += rowSliceHeight*3) {
                for (let x = margin + colWidth / 2; x < bounds.width; x += colWidth) {
                    this.add(new BoardTarget(16, Colors.RED).move(x + bounds.x, y + bounds.y));
                }
                margin = margin ? 0 : colWidth/2;
            }
        }
    };

    superClass.prototype.generateSquareTargets = function(bounds, colCount, rowCount) {
        let colWidth = bounds.width/colCount;
        let rowHeight = bounds.height/rowCount;
        for (let x = colWidth/2; x<bounds.width; x+=colWidth) {
            for (let y = rowHeight/2; y<bounds.height; y+=rowHeight) {
                this.add(new BoardTarget(16, Colors.RED).move(x+bounds.x, y+bounds.y));
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
}