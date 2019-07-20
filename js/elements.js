'use strict';

import {
    List, Group, Rect, RasterImage, ClippedRasterImage, Fill, Visibility, win
} from "./svgbase.js";
import {
    Memento, Context, Events, DragSwitchOperation
} from "./toolkit.js";
import {
    BoardElement, BoardSupport,
    makeContainer, makeSupport, makeDraggable, makeSelectable, makeMoveable, makeRotatable, makeClickable,
    makePositionningContainer, makePart, makeFramed, makeSingleImaged, makeMultiImaged, makeClipImaged
} from "./base-element.js";

import {TextToggleMenuOption, makeMenuOwner} from "./tools.js";

Context.itemDrag = new DragSwitchOperation()
    .add(()=>true, Context.rotateDrag)
    .add(()=>true, Context.moveDrag);

export class AbstractBoardContent extends BoardSupport {

    constructor(owner, ...args) {
        super(...args);
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
        element.addObserver(this);
    }

    remove(element) {
        element.removeObserver(this);
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

    constructor(owner, ...args) {
        super();
        this._initPart(owner);
        this._hidden = false;
        this._root.add(this.initShape(...args)).add(this._initContent());
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

    constructor(...args) {
        super();
        this._root.add(this._initRotatable()
            .add(this.initShape(...args))
            .add(this._initContent()));
        this._dragOperation(Context.itemDrag);
        this._boxContent = this.initBoxContent(...args);
        this._boxCover = this.initBoxCover(...args);
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
        super();
        this._root.add(this._initRotatable()
            .add(this.initShape(width, height, ...args))
            .add(this._initContent())
        );
        this._dragOperation(Context.itemDrag);
        this._clickHandler(function () {
            console.log("click")
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

export class AbstractBoardDie extends BoardElement {

    constructor(width, height, ...args) {
        super();
        this._root.add(this.initShape(width, height, ...args))
            .add(this._initContent());
        this._dragOperation(Context.moveDrag);
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
        super();
        this._root.add(this._initRotatable()
            .add(this.initShape(width, height, ...args))
            .add(this._initContent())
        );
        this._dragOperation(Context.itemDrag);
    }

}
makeSelectable(AbstractBoardMap);
makeMoveable(AbstractBoardMap);
makeRotatable(AbstractBoardMap);
makeDraggable(AbstractBoardMap);
makeMenuOwner(AbstractBoardMap);
makeSupport(AbstractBoardMap);

export class BoardMap extends AbstractBoardMap {

    constructor(width, height, strokeColor, backgroundURL) {
        super(width, height, strokeColor, backgroundURL)
    }

    initShape(width, height, strokeColor, backgroundURL) {
        return this._initImage(width, height, strokeColor, backgroundURL);
    }

}
makeSingleImaged(BoardMap);