'use strict';
import {
    Memento,
    BoardElement, Context,
    makeShaped, makeContainer, makeDraggable, makeSelectable, makeMoveable, makeRotatable
} from "./toolkit.js";
import {
    Group, Rect, RasterImage
} from "./svgbase.js";

export function local2local(source, target, ...points) {
    let matrix = source.global.multLeft(target.global.invert());
}

export function makeFramed(superClass) {

    makeShaped(superClass);

    superClass.prototype._initFrame = function(width, height, strokeColor, backgroundColor) {
        let background = new Rect(-width/2, -height/2, width, height);
        background.stroke = strokeColor;
        background.fill = backgroundColor;
        return this._initShape(background);
    };

    Object.defineProperty(superClass.prototype, "fill", {
        configurable:true,
        get: function () {
            return this.shape.fill;
        }
    });
}

export function makeImaged(superClass) {

    makeShaped(superClass);

    superClass.prototype._initImage = function(width, height, strokeColor, backgroundURL) {
        let background = new Group();
        background.add(new RasterImage(backgroundURL, -width/2, -height/2, width, height));
        if (strokeColor) {
            background.add(new Rect(-width/2, -height/2, width, height).attrs({fill:"none", stroke:strokeColor}));
        }
        return this._initShape(background);
    };

    Object.defineProperty(superClass.prototype, "background", {
        configurable:true,
        get: function () {
            return this.shape._children[0];
        }
    });

    Object.defineProperty(superClass.prototype, "frame", {
        configurable:true,
        get: function () {
            return this.shape._children[1];
        }
    });

    Object.defineProperty(superClass.prototype, "url", {
        configurable:true,
        get: function () {
            return this.background.href;
        }
    });

    Object.defineProperty(superClass.prototype, "width", {
        configurable:true,
        get: function () {
            return this.background.width;
        },
        set: function(width) {
            Memento.register(this);
            this.background.attrs({width:width, x:-width/2});
            this.frame.attrs({width:width, x:-width/2});
        }
    });

    Object.defineProperty(superClass.prototype, "height", {
        configurable:true,
        get: function () {
            return this.background.height;
        },
        set: function(height) {
            Memento.register(this);
            this.background.attrs({height:height, y:-height/2});
            this.frame.attrs({height:height, y:-height/2});
        }
    });
}

export class AbstractBoardContent extends BoardElement {

    constructor(...args) {
        super();
        this._root.add(this.initShape(...args)).add(this._initContent());
    }

    selectable() {
        return this.parent.selectable;
    }

    _acceptDrop(element) {
        console.log(element);
        return true;
    }
}
makeContainer(AbstractBoardContent);
makeDraggable(AbstractBoardContent);

export class AbstractBoardBox extends BoardElement {

    constructor(...args) {
        super();
        this._root.add(this._initRotatable()
            .add(this.initShape(...args))
            .add(this._initContent()));
        this._dragOperation(Context.rotateOrMoveDrag);
        this._boxContent = this.initBoxContent(...args);
        this._add(this._boxContent);
    }

    _acceptDrop() {
        return false;
    }

    _memento() {
        let memento = super._memento();
        memento._boxContent = this._boxContent;
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        if (this._boxContent != memento._boxContent) {
            this._replace(this._boxContent, memento._boxContent);
        }
    }

}
makeSelectable(AbstractBoardBox);
makeMoveable(AbstractBoardBox);
makeRotatable(AbstractBoardBox);
makeContainer(AbstractBoardBox);
makeDraggable(AbstractBoardBox);


export class BoardContent extends AbstractBoardContent {

    constructor(width, height, strokeColor, backgroundColor) {
        super(width, height, strokeColor, backgroundColor);
    }

    initShape(width, height, strokeColor, backgroundColor) {
        return this._initFrame(width, height, strokeColor, backgroundColor);
    }
}
makeFramed(BoardContent);

export class BoardBox extends AbstractBoardBox {

    constructor(width, height, margin, strokeColor, backgroundColor) {
        super(width, height, margin, strokeColor, backgroundColor);
    }

    initShape(width, height, margin, strokeColor, backgroundColor) {
        return this._initFrame(width, height, strokeColor, backgroundColor);
    }

    initBoxContent(width, height, margin, strokeColor, backgroundColor) {
        return new BoardContent(width-margin/2, height-margin/2, strokeColor, backgroundColor);
    }
}
makeFramed(BoardBox);

export class BoardImageContent extends AbstractBoardContent {

    constructor(width, height, strokeColor, backgroundURL) {
        super(width, height, strokeColor, backgroundURL);
    }

    initShape(width, height, strokeColor, backgroundURL) {
        return this._initImage(width, height, strokeColor, backgroundURL);
    }
}
makeImaged(BoardImageContent);

export class BoardImageBox extends AbstractBoardBox {

    constructor(width, height, margin, strokeColor, backgroundURL, sideURL) {
        super(width, height, margin, strokeColor, backgroundURL, sideURL);
    }

    initShape(width, height, margin, strokeColor, backgroundURL, sideURL) {
        return this._initImage(width, height, strokeColor, backgroundURL, sideURL);
    }

    initBoxContent(width, height, margin, strokeColor, backgroundURL, sideURL) {
        return new BoardImageContent(width-margin/2, height-margin/2, strokeColor, sideURL);
    }

}
makeImaged(BoardImageBox);