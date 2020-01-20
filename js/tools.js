'use strict';

import {
    List, ESet
} from "./collections.js";
import {
    Matrix2D
} from "./geometry.js";
import {
    Visibility, computePosition, RasterImage, SvgRasterImage, Group, ClipPath, Rect, Text, AlignmentBaseline,
    Colors, MouseEvents, TextAnchor, win, Cursor, ForeignObject, DOMElement, Translation, KeyboardEvents,
    M, Path, Z, Q, L, SVGElement, doc, AnyEvent
} from "./graphics.js";
import {
    Context, Events, l2pBoundingBox, Memento, Canvas, makeObservable, makeNotCloneable, ToolsLayer,
    Layers, makeSingleton, CopyPaste, Selection, getOwner
} from "./toolkit.js";
import {
    DragOperation, DragMoveSelectionOperation
} from "./drag-and-drop.js";
import {
    makeDraggable
} from "./core-mixins.js";
import {
    defineShadow, MultiLineText
} from "./svgtools.js";
import {
    assert, defineMethod, extendMethod
} from "./misc.js";

export class Menu {

    constructor(x, y, menuOptions, closeOnSelect = true) {
        this._root = new Group();
        this._x = x;
        this._y = y;
        this._menuOptions = menuOptions;
        this._buildContent();
        this.closeOnSelect = closeOnSelect;
    }

    _buildContent() {
        let rect = new Rect(0, 0, 10, 10).attrs({
            stroke: Colors.BLACK,
            fill: Colors.WHITE,
            filter: Canvas.instance.shadowFilter
        });
        this._root.add(rect);
        let menuGeometry = {
            width: 10,
            height: Menu.YMARGIN
        };
        for (let option of this._menuOptions) {
            if (!Context.isReadOnly()) {
                option.line.prepare(option.that, menuGeometry);
                this._root.add(option.line._root);
            }
        }
        rect.attrs({
            width: menuGeometry.width + Menu.XMARGIN * 2,
            height: menuGeometry.height
        });
        for (let option of this._menuOptions) {
            option.line.width = menuGeometry.width + Menu.XMARGIN * 2 - 2;
        }
        let x = this._x;
        let y = this._y;
        if (x + menuGeometry.width + Menu.XMARGIN > Canvas.instance.clientWidth/2) {
            x = Canvas.instance.clientWidth/2 - menuGeometry.width - Menu.XMARGIN;
        }
        if (y + menuGeometry.height + Menu.YMARGIN > Canvas.instance.clientHeight/2) {
            y = Canvas.instance.clientHeight/2 - menuGeometry.height - Menu.YMARGIN;
        }
        this._root.matrix = new Matrix2D().translate(x, y);
    }

    close() {
        this._root.detach();
    }

    insideMenu(x, y) {
        let gbox = this._root.gbox;
        return x >= gbox.x && x <= gbox.x + gbox.width && y >= gbox.y && y <= gbox.y + gbox.height;
    }

    refresh() {
        this._root.clear();
        this._buildContent();
    }
}
Menu.XMARGIN = 5;
Menu.YMARGIN = 5;

Canvas.prototype.manageMenus = function() {
    win.addEventListener(MouseEvents.MOUSE_DOWN, event => {
        if (!this._menu || !this._menu.insideMenu(
                Canvas.instance.canvasX(event.pageX),
                Canvas.instance.canvasY(event.pageY))
        ) {
            this._closeMenu();
        }
    });
    win.addEventListener(MouseEvents.MOUSE_UP, event => {
        if (this._menu && (this._menu.closeOnSelect || !this._menu.insideMenu(
                Canvas.instance.canvasX(event.pageX),
                Canvas.instance.canvasY(event.pageY)))
        ) {
            this._closeMenu();
        } else {
            this._refreshMenu();
        }
    });
    win.addEventListener(MouseEvents.WHEEL, event => {
        this._closeMenu();
    });

    Canvas.prototype.openMenu = function(x, y, menuOptions, closeOnSelect = true) {
        this._closeMenu();
        let {x:mx, y:my} = this._toolsLayer.global2local(x, y);
        this._menu = new Menu(mx, my, menuOptions, closeOnSelect);
        this.putArtifactOnToolsLayer(this._menu._root);
    };

    //FIXME May I use one day ?
    Canvas.prototype.askForClosingMenu = function() {
        let menu = this._menu;
        win.setTimeout(() => {
            if (menu) {
                menu.close();
                if (this._menu === menu) delete this._menu;
            }
        }, 200);
    };

    Canvas.prototype._refreshMenu = function(x, y) {
        if (this._menu) {
            return this._menu.refresh();
        }
        return false;
    };

    Canvas.prototype._closeMenu = function() {
        if (this._menu) {
            this._menu.close();
            delete this._menu;
        }
    }
};

export function makeMenuOwner(superClass) {

    superClass.prototype.addMenuOption = function(menuOption, readOnly = true) {
        Memento.register(this);
        this._addMenuOption(menuOption, readOnly);
    };

    superClass.prototype._triggerContextMenu = function() {
        this._root.on(MouseEvents.CONTEXT_MENU,
            event => {
                this.openMenu(
                    Canvas.instance.canvasX(event.pageX),
                    Canvas.instance.canvasY(event.pageY));
                event.preventDefault();
                event.stopPropagation();
                return false;
            },
            true
        );
    };

    superClass.prototype._addMenuOption = function(menuOption, readOnly = true) {
        menuOption.readOnly = readOnly;
        if (!this._menuOptions) {
            this._menuOptions = new List();
            this._triggerContextMenu();
        }
        this._menuOptions.add(menuOption);
    };

    superClass.prototype._getOwnMenuOptions = function() {
        return this._menuOptions.map(option=>{return {line:option, that:this}});
    };

    if (!superClass.prototype.hasOwnProperty("menuOptions")) {
        Object.defineProperty(superClass.prototype, "menuOptions", {
            get: function () {
                return this._getOwnMenuOptions();
            }
        });
    }

    superClass.prototype.openMenu = function(x, y) {
        let menuOptions = this.menuOptions;
        if (menuOptions && menuOptions.length > 0) {
            Canvas.instance.openMenu(x, y, menuOptions);
        }
    };

    let superMemento = superClass.prototype._memento;
    if (superMemento) {
        superClass.prototype._memento = function () {
            let memento = superMemento.call(this);
            if (this._menuOptions) {
                memento._menuOptions = new List(...this._menuOptions);
            }
            return memento;
        };

        let superRevert = superClass.prototype._revert;
        superClass.prototype._revert = function (memento) {
            superRevert.call(this, memento);
            if (memento._menuOptions) {
                this._menuOptions = new List(...memento._menuOptions);
            }
            else {
                delete this._menuOptions;
            }
            return this;
        };
    }

    let superCloned = superClass.prototype._cloned;
    superClass.prototype._cloned = function(copy, duplicata) {
        superCloned && superCloned.call(this, copy, duplicata);
        copy._triggerContextMenu();
    };

    Object.defineProperty(superClass.prototype, "isMenuOwner", {
        configurable: true,
        get() {
            return true;
        }
    });
}

export class MenuOption {
    constructor(label, action, active = () => true) {
        this._label = label;
        this._action = action;
        this._active = active;
    }

    get label() {
        return this._label;
    }

    get action() {
        return this._action;
    }

    get active() {
        return this._active.call(this._that);
    }

    get width() {
        return this._background.width;
    }

    set width(width) {
        this._background.width = width;
    }

    prepare(that, menuGeometry) {
        this._that = that;
        this._root = new Translation();
        this._background = new Rect(1, menuGeometry.height - Menu.YMARGIN / 2, 10, 10);
        this._root.add(this._background);
        this._root.class = MenuOption.CLASS;
        let text = new Text(Menu.XMARGIN - 1, menuGeometry.height - Menu.YMARGIN, this.label);
        if (this.active) {
            text.attrs({ fill: Colors.BLACK });
        } else {
            text.attrs({ fill: Colors.LIGHT_GREY });
        }
        text.class = MenuOption.TEXT_CLASS;
        this._root.add(text);
        let bbox = Canvas.instance.bbox(text);
        text.y += bbox.height;
        if (bbox.width > menuGeometry.width) {
            menuGeometry.width = bbox.width;
        }
        this._background.attrs({ height: bbox.height });
        menuGeometry.height += bbox.height;
        return this._root;
    }
}
makeNotCloneable(MenuOption);
MenuOption.CLASS = "menuOption";
MenuOption.TEXT_CLASS = "menuOptionText";

export class TextMenuOption extends MenuOption {
    constructor(label, action, active=function() {return true;}) {
        super(label, action, active);
    }

    _triggerMouseUp() {
        this._root.on(MouseEvents.MOUSE_UP, () => {
            if (this.active) {
                this.action.call(this._that);
            }
        });
    }

    prepare(that, menuGeometry) {
        super.prepare(that, menuGeometry);
        this._triggerMouseUp();
    }
}

export class TextToggleMenuOption extends TextMenuOption {
    constructor(label, altLabel, action, altAction, predicate, active=function() {return true;}) {
        super(label, action, active);
        this._predicate = predicate;
        this._altLabel = altLabel;
        this._altAction = altAction;
    }

    get label() {
        return this._predicate.call(this._that) ? this._altLabel : super.label;
    }

    get action() {
        return this._predicate.call(this._that) ? this._altAction : super.action;
    }
}

export class CheckMenuOption extends TextMenuOption {

    constructor(label, checked, action, active) {
        super(label, action, active);
        this.flag = checked;
    }

    get label() {
        return this.flag ? CheckMenuOption.CHECKED+super.label : CheckMenuOption.UNCHECKED+super.label;
    }

    _triggerMouseUp() {
        this._root.on(MouseEvents.MOUSE_UP, () => {
            if (this.active) {
                this.flag = ! this.flag;
                this.action.call(this._that, this.flag);
            }
        });
    }

}
CheckMenuOption.UNCHECKED = "\u2610 ";
CheckMenuOption.CHECKED = "\ud83d\uddf9 ";

export class ColorChooserMenuOption extends MenuOption {

    constructor(label, colors, action, active) {
        super(label, action, active);
        this._colors = colors;
    }

    prepare(that, menuGeometry) {
        super.prepare(that, menuGeometry);
        let colorRowCount = Math.ceil(
            this._colors.length / ColorChooserMenuOption.COLOR_ROW_LENGTH
        );
        let colorWidth =
            ColorChooserMenuOption.COLOR_ROW_LENGTH *
            (ColorChooserMenuOption.COLOR_WIDTH + ColorChooserMenuOption.COLOR_MARGIN) -
            ColorChooserMenuOption.COLOR_MARGIN;
        if (menuGeometry.width < colorWidth) {
            menuGeometry.width = colorWidth;
        }
        let x = ColorChooserMenuOption.COLOR_MARGIN;
        let y = menuGeometry.height;
        for (let index = 0; index < this._colors.length; index++) {
            let color = this._colors[index];
            let colorRect = new Rect(x, y, ColorChooserMenuOption.COLOR_WIDTH, ColorChooserMenuOption.COLOR_HEIGHT)
                .attrs({fill: color, stroke: Colors.BLACK});
            this._root.add(colorRect);
            x += ColorChooserMenuOption.COLOR_WIDTH + ColorChooserMenuOption.COLOR_MARGIN;
            if ((index + 1) % ColorChooserMenuOption.COLOR_ROW_LENGTH === 0) {
                x = ColorChooserMenuOption.COLOR_MARGIN;
                y += ColorChooserMenuOption.COLOR_HEIGHT + ColorChooserMenuOption.COLOR_MARGIN;
            }
            colorRect.on(MouseEvents.MOUSE_UP, () => {
                this._action.call(that, color);
            });
        }
        let height =
            (ColorChooserMenuOption.COLOR_HEIGHT + ColorChooserMenuOption.COLOR_MARGIN) * colorRowCount +
            ColorChooserMenuOption.COLOR_MARGIN;
        this._background.attrs({height: this._background.height+height});
        menuGeometry.height += height;
    }
}
ColorChooserMenuOption.COLOR_ROW_LENGTH = 4;
ColorChooserMenuOption.COLOR_WIDTH = 25;
ColorChooserMenuOption.COLOR_HEIGHT = 10;
ColorChooserMenuOption.COLOR_MARGIN = 5;

let tId = 0;
function toolId() {
    return "TID"+tId++;
}

export class ToolTitleCommand {

    constructor(popup, imageURL, location, action) {
        this._popup = popup;
        this._location = location;
        this._root = new Translation();
        this._root._owner = this;
        this._icon = new RasterImage(imageURL,
            -ToolTitleCommand.SIZE/2, -ToolTitleCommand.SIZE/2, ToolTitleCommand.SIZE, ToolTitleCommand.SIZE );
        this._root.add(this._icon);
        this._action = action;
        this._root.on(MouseEvents.CLICK, action);
    }

    get location() {
        return this._location;
    }

    adjust(direction) {
        if (direction) {
            this._root.set(this._popup.width/2 - this.location, 0);
        }
        else {
            //this._root.set(0, 0);
            this._root.set(0, -this._popup.height/2 + this.location);
        }
    }

}
ToolTitleCommand.SIZE = 12;

export class ToolToggleTitleCommand extends ToolTitleCommand {

    constructor(popup, imageURL, altImageURL, location, action, altAction = action) {
        super(popup, imageURL, location, action);
        this._altImageURL = altImageURL;
        this._altAction = altAction;
        this._altIcon = new RasterImage(altImageURL,
            -ToolTitleCommand.SIZE/2, -ToolTitleCommand.SIZE/2, ToolTitleCommand.SIZE, ToolTitleCommand.SIZE );
        this._altAction = altAction;
    }

    switchToNormal() {
        this._root.clear();
        this._root.add(this._icon);
        this._root.off(MouseEvents.CLICK, this._altAction);
        this._root.on(MouseEvents.CLICK, this._action);
    }

    switchToAlt() {
        this._root.clear();
        this._root.add(this._altIcon);
        this._root.off(MouseEvents.CLICK, this._action);
        this._root.on(MouseEvents.CLICK, this._altAction);
    }
}

let _refreshPoll = null;
let refreshTools = function(action) {
    let refreshPoll = _refreshPoll;
    if (refreshPoll) {
        _refreshPoll = function () {
            refreshPoll();
            action();
        }
    } else {
        _refreshPoll = action;
        win.setInterval(function(){_refreshPoll();}, 250);
    }
};

export class ToolTitlePopup {

    constructor(popup) {
        this._popup = popup;
        this._root = new Group();
        this._titleBackground = new Rect().attrs({fill: Colors.BLACK});
        this._root.add(this._titleBackground);
        this._titleCommands = new List();
        this._minimizeRestore = new ToolToggleTitleCommand(this._popup,
            ToolPopup.MINIMIZE_URL, ToolPopup.RESTORE_URL, ToolPopup.HEADER_MARGIN,
            () => popup.minimize(),
            () => popup.restore()
        );
        this.addTitleCommand(this._minimizeRestore);
        this._maxClip = new ClipPath(toolId());
        this._root.add(this._maxClip);
        this._minClip = new ClipPath(toolId());
        this._root.add(this._minClip);
        this._dragOperation(function() {return DragPopupOperation.instance;});
        this._minimizeRestore.adjust(this.direction);
        if (this.direction) {
            this._root.matrix = Matrix2D.translate(0, -popup.height / 2 + ToolPopup.HEADER_HEIGHT / 2);
        }
        else {
            this._root.matrix = Matrix2D.translate(-popup.width / 2 + ToolPopup.HEADER_HEIGHT / 2, 0);
        }
        this.adjustGeometry();
    }

    get direction() {
        return this._popup.direction;
    }

    _setClips() {
        let x, y, maxWidth, maxHeight, minWidth, minHeight;
        if (this.direction) {
            x = -this._popup.width / 2;
            y =  -ToolPopup.HEADER_HEIGHT / 2;
            minWidth = this._popup.width;
            minHeight = ToolPopup.HEADER_HEIGHT;
            maxWidth = this._popup.width;
            maxHeight = ToolPopup.HEADER_HEIGHT + ToolPopup.CORNER_SIZE;
        }
        else {
            x =  -ToolPopup.HEADER_HEIGHT / 2;
            y = -this._popup.height / 2;
            minWidth = ToolPopup.HEADER_HEIGHT;
            minHeight = this._popup.height;
            maxWidth = ToolPopup.HEADER_HEIGHT + ToolPopup.CORNER_SIZE;
            maxHeight = this._popup.height;
        }
        this._maxClip.clear().add(
            new Rect(x, y, maxWidth, maxHeight).attrs({rx: ToolPopup.CORNER_SIZE, ry: ToolPopup.CORNER_SIZE}));
        this._minClip.clear().add(
            new Rect(x, y, minWidth, minHeight).attrs({rx: ToolPopup.CORNER_SIZE, ry: ToolPopup.CORNER_SIZE}));
    }

    adjustGeometry() {
        if (this.direction) {
            this._titleBackground.x = -this._popup.width/2;
            this._titleBackground.y = -ToolPopup.HEADER_HEIGHT / 2;
            this._titleBackground.width = this._popup.width;
            this._titleBackground.height = ToolPopup.HEADER_HEIGHT;
        }
        else {
            this._titleBackground.x = -ToolPopup.HEADER_HEIGHT / 2;
            this._titleBackground.y = -this._popup.height/2;
            this._titleBackground.width = ToolPopup.HEADER_HEIGHT;
            this._titleBackground.height = this._popup.height;
        }
        for (let titleCommand of this._titleCommands) {
            titleCommand.adjust(this.direction);
        }
        this._setClips();
    }

    get popup() {
        return this._popup;
    }

    minimize() {
        this._minimizeRestore.switchToAlt();
        this._titleBackground.attrs({ clip_path: this._minClip });
        this._root.matrix = new Matrix2D();
        this._root.filter = Canvas.instance.shadowFilter;
    }

    restore(width, height) {
        this._minimizeRestore.switchToNormal();
        this._titleBackground.attrs({ clip_path: this._maxClip });
        if (this.direction) {
            this._root.matrix = Matrix2D.translate(0, -height / 2 + ToolPopup.HEADER_HEIGHT/2);
        }
        else {
            this._root.matrix = Matrix2D.translate(-width / 2 + ToolPopup.HEADER_HEIGHT/2, 0);
        }
        this._root.filter = null;
    }

    addTitleCommand(titleCommand) {
        this._titleCommands.add(titleCommand);
        this._root.add(titleCommand._root);
        titleCommand.adjust(this.direction);
        return this;
    }

    removeTitleCommand(titleCommand) {
        this._titleCommands.remove(titleCommand);
        this._root.remove(titleCommand._root);
    }

}
makeDraggable(ToolTitlePopup);

export class ToolPopupContent {

    constructor(popup, width, height) {
        this._popup = popup;
        this._width = width;
        this._height = height;
        this._root = new Translation();
    }

    add(something) {
        this._root.add(something._root);
        return this;
    }

    get width() {
        return this._width;
    }

    get height() {
        return this._height;
    }

    _resize(width, height) {
        this._width = width;
        this._height = height;
    }

    resize(width, height) {
        this._resize(width, height);
        this._popup._adjustFromContentResize(width, height);
    }

}

export class ToolPopup {

    constructor(width, height, ...args) {
        this._width = width;
        this._height = height;
        this._root = new Group();
        this._root._owner = this;
        this._init();
        this._contentSupport = new Group();
        this._root.add(this._contentSupport);
        let contentWidth = this.direction ? this.width-this.widthMargin*2: this.width-this.widthMargin-ToolPopup.HEADER_HEIGHT;
        let contentHeight = this.direction ? this.height-this.heightMargin-ToolPopup.HEADER_HEIGHT : this.height-this.heightMargin*2;
        this._content = this._createContent(contentWidth, contentHeight, ...args);
        this._adjustContentLocation();
        this._contentSupport.add(this._content._root);
        this._title = new ToolTitlePopup(this);
        this._root.add(this._title._root);
        this._title.restore(this.width, this.height);
        Canvas.instance.addObserver(this);
        Canvas.instance.putArtifactOnToolsLayer(this._root);
    }

    get direction() {
        return this.width<this.height;
    }

    _init() {
        this._background = new Rect(-this.width / 2, -this.height / 2, this.width, this.height)
            .attrs({
                stroke: Colors.BLACK,
                fill: Colors.LIGHT_GREY,
                rx: ToolPopup.CORNER_SIZE, ry: ToolPopup.CORNER_SIZE, filter: Canvas.instance.shadowFilter
            });
        this._root.add(this._background);
    }

    get minimized() {
        return this._minimized;
    }

    get width() {
        return this._width;
    }

    get height() {
        return this._height;
    }

    _resize(width, height) {
        this._width = width;
        this._height = height;
        this._background.width = width;
        this._background.x = -width/2;
        this._background.height = height;
        this._background.y = -height / 2;
        this._title.adjustGeometry();
        this._title.restore(this.width, this.height);
        this._adjustPosition();
    }

    _adjustContentLocation() {
        if (this.direction) {
            this._content._root.set(0, ToolPopup.HEADER_HEIGHT/2-this.widthMargin/2);
        }
        else {
            this._content._root.set(ToolPopup.HEADER_HEIGHT/2-this.heightMargin/2, 0);
        }
    }

    _adjustFromContentResize(width, height) {
        if (width<height) {
            this._resize(width + this.widthMargin*2, height + this.heightMargin + ToolPopup.HEADER_HEIGHT);
        }
        else {
            this._resize(width + this.widthMargin  + ToolPopup.HEADER_HEIGHT, height + this.heightMargin*2);
        }
        this._adjustContentLocation();
    }

    get widthMargin() {
        return 0;
    }

    get heightMargin() {
        return 0;
    }

    resize(width, height) {
        this._resize(width, height);
        if (this.direction) {
            this._content._resize(width-this.widthMargin*2, height-this.heightMargin - ToolPopup.HEADER_HEIGHT);
        }
        else {
            this._content._resize(width-this.widthMargin - ToolPopup.HEADER_HEIGHT, height-this.heightMargin*2);
        }
        this._adjustContentLocation();
        return this;
    }

    minimize() {
        this._minimized = true;
        this._background.visibility = Visibility.HIDDEN;
        this._content._root.detach();
        this._title.minimize();
        if (this.direction) {
            this._root.matrix = Matrix2D.translate(
                this._root.matrix.dx,
                this._root.matrix.dy - (this.height - ToolPopup.HEADER_HEIGHT) / 2);
        }
        else {
            this._root.matrix = Matrix2D.translate(
                this._root.matrix.dx - (this.width - ToolPopup.HEADER_HEIGHT) / 2,
                this._root.matrix.dy);
        }
    }

    restore() {
        this._minimized = false;
        this._background.visibility = null;
        this._contentSupport.add(this._content._root);
        this._title.restore(this.width, this.height);
        if (this.direction) {
            this._root.matrix = Matrix2D.translate(
                this._root.matrix.dx,
                this._root.matrix.dy + (this.height - ToolPopup.HEADER_HEIGHT) / 2);
        }
        else {
            this._root.matrix = Matrix2D.translate(
                this._root.matrix.dx + (this.width - ToolPopup.HEADER_HEIGHT) / 2,
                this._root.matrix.dy);
        }
        this._adjustPosition();
    }

    _adjustPosition() {
        let clientWidth = Canvas.instance.clientWidth;
        let clientHeight = Canvas.instance.clientHeight;
        let x = this._root.globalMatrix.dx-clientWidth/2;
        let y = this._root.globalMatrix.dy-clientHeight/2;
        if (x + this.width/2 > clientWidth/2 - ToolPopup.BORDER_MARGIN) {
            x = clientWidth/2 - ToolPopup.BORDER_MARGIN - this.width/2;
        }
        if (x - this.width/2 < -clientWidth/2 + ToolPopup.BORDER_MARGIN ) {
            x = this.width/2  -clientWidth/2  + ToolPopup.BORDER_MARGIN;
        }
        if (y + this.height/2 > clientHeight/2 - ToolPopup.BORDER_MARGIN) {
            y = clientHeight/2 - ToolPopup.BORDER_MARGIN - this.height / 2;
        }
        if (y - this.height/2 < -clientHeight/2 + ToolPopup.BORDER_MARGIN) {
            y = this.height/2 -clientHeight/2 + ToolPopup.BORDER_MARGIN;
        }
        let imatrix = this._root.parent.matrix.invert();
        let fx = imatrix.x(x, y);
        let fy = imatrix.y(x, y);
        this.move(fx, fy);
    }

    addTitleCommand(titleCommand) {
        this._title.addTitleCommand(titleCommand);
        return this;
    }

    add(something) {
        this._content.add(something);
        return this;
    }

    _notified(source, type, value) {
        if (source === Canvas.instance && type === Events.GEOMETRY) {
            this.display(this._xAnchorage, this._yAnchorage);
        }
    }

    move(x, y) {
        let clientWidth = Canvas.instance.clientWidth;
        let clientHeight = Canvas.instance.clientHeight;
        this._root.matrix = Matrix2D.translate(x, y);
        if (x<=0) {
            this._xAnchorage = clientWidth/2+x;
        }
        else {
            this._xAnchorage = -clientWidth/2+x;
        }
        if (y<=0) {
            this._yAnchorage = clientHeight/2+y;
        }
        else {
            this._yAnchorage = -clientHeight/2+y;
        }
        return this;
    }

    get x() {
        return this._root.matrix.x(0, 0);
    }

    get y() {
        return this._root.matrix.y(0, 0);
    }

    display(x, y) {
        let clientWidth = Canvas.instance.clientWidth;
        let clientHeight = Canvas.instance.clientHeight;
        let fx = x>=0 ? -clientWidth/2+x : clientWidth/2+x;
        let fy = y>=0 ? -clientHeight/2+y : clientHeight/2+y;
        this.move(fx, fy);
        return this;
    }
}
makeDraggable(ToolPopup);
// Distance between edge of viewport and popup's edge.
ToolPopup.BORDER_MARGIN = 5;
// Size of rounded corners
ToolPopup.CORNER_SIZE = 5;
// Height of the title bar
ToolPopup.HEADER_HEIGHT = 15;
// Margin on bottom to prevent popup to cover rounded corners
ToolPopup.FOOTER_MARGIN = 5;
// Distance between the right edge of the popup and the minimize/restore icon
ToolPopup.HEADER_MARGIN = 10;
ToolPopup.TITLE_COMMAND_MARGIN = 20;
ToolPopup.MINIMIZE_URL = "./images/icons/minimize.png";
ToolPopup.RESTORE_URL = "./images/icons/restore.png";

export function makePopupResizable(superClass) {

    extendMethod(superClass, $init=>
        function _init() {
            $init.call(this);
            this._dragOperation(()=>ResizePopupOperation.instance);
        }
    );

    defineMethod(superClass,
        function _adjustSize() {
            let clientWidth = Canvas.instance.clientWidth;
            let clientHeight = Canvas.instance.clientHeight;
            let x = this._root.globalMatrix.dx-clientWidth/2;
            let y = this._root.globalMatrix.dy-clientHeight/2;
            let width = this.width;
            let height = this.height;
            if (x + this.width/2 > clientWidth/2 - ToolPopup.BORDER_MARGIN) {
                width = this.width/2 - x + clientWidth/2 - ToolPopup.BORDER_MARGIN;
                x += (width - this.width)/2;
            }
            if (x - this.width/2 < -clientWidth/2 + ToolPopup.BORDER_MARGIN ) {
                width = this.width/2 + x + clientWidth/2 - ToolPopup.BORDER_MARGIN;
                x -= (width - this.width)/2;
            }
            if (y + this.height/2 > clientHeight/2 - ToolPopup.BORDER_MARGIN) {
                height = this.height/2 - y + clientHeight/2 - ToolPopup.BORDER_MARGIN;
                y += (height - this.height)/2;
            }
            if (y - this.height/2 < -clientHeight/2 + ToolPopup.BORDER_MARGIN) {
                height = this.height/2 + y + clientHeight/2 - ToolPopup.BORDER_MARGIN;
                y -= (height - this.height)/2;
            }
            let imatrix = this._root.parent.matrix.invert();
            let fx = imatrix.x(x, y);
            let fy = imatrix.y(x, y);
            this.resize(width, height);
            this.move(fx, fy);
        }
    );
}

export class DragPopupOperation extends DragOperation {

    constructor() {
        super();
    }

    doDragStart(title, x, y, event) {
        let popup = title.popup;
        let pedestal = new Group(popup._root.matrix);
        Canvas.instance.putArtifactOnToolsLayer(pedestal);
        let imatrix = pedestal.globalMatrix.invert();
        pedestal.dragX = imatrix.x(x, y);
        pedestal.dragY = imatrix.y(x, y);
        pedestal.add(popup._root);
    }

    doDragMove(title, x, y, event) {
        let popup = title.popup;
        let pedestal = popup._root.parent;
        let imatrix = pedestal.globalMatrix.invert();
        let pX = imatrix.x(x, y) - pedestal.dragX;
        let pY = imatrix.y(x, y) - pedestal.dragY;
        popup._root.matrix = Matrix2D.translate(pX, pY);
        popup._adjustPosition();
    }

    doDrop(title, x, y, event) {
        let popup = title.popup;
        let pedestal = popup._root.parent;
        let { x:fx, y:fy } = computePosition(popup._root, Canvas.instance._toolsLayer._root);
        popup.move(fx, fy);
        Canvas.instance.putArtifactOnToolsLayer(popup._root);
        pedestal.detach();
    }

}
makeSingleton(DragPopupOperation);

export class ResizePopupOperation extends DragOperation {

    constructor() {
        super();
    }

    doDragStart(popup, x, y, event) {
        let imatrix = popup._root.globalMatrix.invert();
        this._dragX = imatrix.x(x, y);
        this._dragY = imatrix.y(x, y);
    }

    doDragMove(popup, x, y, event) {
        let imatrix = popup._root.globalMatrix.invert();
        let pX = imatrix.x(x, y) - this._dragX;
        let pY = imatrix.y(x, y) - this._dragY;
        let width, height, nx, ny;
        if (this._dragX<0) {
            width = popup.width-pX;
            nx = popup.x+pX/2;
            this._dragX+=pX/2;
        }
        else {
            width = popup.width+pX;
            nx = popup.x+pX/2;
            this._dragX+=pX/2;
        }
        if (this._dragY<0) {
            height = popup.height-pY;
            ny = popup.y+pY/2;
            this._dragY+=pY/2;
        }
        else {
            height = popup.height+pY;
            ny = popup.y+pY/2;
            this._dragY+=pY/2;
        }
        popup.resize(width, height);
        let dWidth = this._dragX<0 ? width-popup.width : popup.width-width;
        let dHeight = this._dragY<0 ? height-popup.height : popup.height-height;
        popup.move(nx+dWidth/2, ny+dHeight/2);
        popup._adjustSize();
        dWidth = this._dragX<0 ? width-popup.width : popup.width-width;
        dHeight = this._dragY<0 ? height-popup.height : popup.height-height;
        this._dragX+=dWidth/2;
        this._dragY+=dHeight/2;
    }

    doDrop(popup, x, y, event) {
    }

}
makeSingleton(ResizePopupOperation);

export class ToolCommand {

    constructor(imageURL, action, size = 32) {
        this._root = new Group();
        this._root.on(MouseEvents.CLICK, ()=>{
            action.call(this)
        });
        this._root.on(MouseEvents.MOUSE_DOWN, ()=>{this._iconSupport.matrix=Matrix2D.scale(0.95, 0.95, 0, 0)});
        this._root.on(MouseEvents.MOUSE_UP, ()=>{this._iconSupport.matrix=Matrix2D.scale(1, 1, 0, 0)});
        this._iconSupport = new Group();
        this._icon = new SvgRasterImage(imageURL, -size/2, -size/2, size, size);
        this._root.add(this._iconSupport.add(this._icon));
        this._root._owner = this;
        this._size = size;
    }

    move(x, y) {
        this._root.matrix = Matrix2D.translate(x, y);
        return this;
    }

    get width() {
        return this._size;
    }

    get height() {
        return this._size;
    }
}

export class ToolToggleCommand extends ToolCommand {

    constructor(imageURL, altImageURL, action, predicate=null, size = 32) {
        super(imageURL, action, size);
        this._altIcon = new RasterImage(altImageURL, -size/2, -size/2, size, size);
        this._iconSupport.add(this._altIcon);
        this._active = false;
        this._refresh();
        if (predicate) {
            refreshTools(()=>{
                let active = predicate.call(this);
                if (active != this.active) {
                    this.active = active;
                }
            })
        }
    }

    _refresh() {
        this._altIcon.visibility = this.active ? Visibility.VISIBLE : Visibility.HIDDEN;
        this._icon.visibility = !this.active ? Visibility.VISIBLE : Visibility.HIDDEN;
    }

    get active() {
        return this._active;
    }

    set active(flag) {
        this._active = flag;
        this._refresh();
    }

}

export class ToolCommandPopupContent extends ToolPopupContent {

    constructor(popup, width, height, size) {
        super(popup, width, height);
        this._margin = (width/2 - size)/3;
        this._row = this._margin*2;
        this._size = size;
        this._left = true;
        this._commands = new Group();
        this._root.add(this._commands);
    }

    _newLine() {
        if (!this._left) {
            this._left = true;
            this._row += this._size + this._margin * 2;
        }
    }

    add(command) {
        this._commands.add(command._root);
        let height = this.height;
        if (command.width===this._size) {
            if (this._left) {
                command.move(-this._size / 2 - this._margin, this._row + this._size / 2);
                this._left = false;
                height = this._row + this._size + this._margin*2;
            } else {
                command.move(this._size / 2 + this._margin, this._row + this._size / 2);
                this._left = true;
                this._row += this._size + this._margin * 2;
            }
        }
        else {
            this._newLine();
            command.move(0, this._row + command.height/2);
            this._left = true;
            this._row += command.height + this._margin * 2;
            height = this._row;
        }
        this.resize(this.width, height);
        return this;
    }

    _resize(width, height) {
        super._resize(width, height);
        this._commands.matrix = Matrix2D.translate(0, -height/2);
    }

    addMargin() {
        this._newLine();
        this._row += this._margin * 2;
        return this;
    }

}

export class ToolCommandPopup extends ToolPopup {

    constructor(width, size) {
        super(width, ToolPopup.HEADER_HEIGHT, size);
    }

    _createContent(width, height, size) {
        return new ToolCommandPopupContent(this, width, height, size);
    }

    get direction() {
        return true;
    }

    add(command) {
        this._content.add(command);
        return this;
    }

    addMargin() {
        this._content.addMargin();
        return this;
    }
}

export class ToolMenuPopupContent extends ToolPopupContent {

    constructor(popup, width, height) {
        super(popup, width, height);
        this._options = new List();
        this._optionsSupport = new Translation();
        this._root.add(this._optionsSupport);
        doc.addEventListener(AnyEvent, event=> {
            this._askForRefresh();
        });
    }

    add(menuOption) {
        this._options.add(menuOption);
        this._askForRefresh();
        return this;
    }

    _askForRefresh() {
        if (!this._dirty) {
            this._dirty = true;
            win.setTimeout(()=>{
                this._dirty = false;
                this.refresh();
            }, 0);
        }
    }

    refresh() {
        this._optionsSupport.clear();
        let rect = new Rect(0, 0, 10, 10).attrs({
            fill: Colors.WHITE
        });
        this._optionsSupport.add(rect);
        let menuGeometry = {
            width: 0,
            height: ToolMenuPopupContent.YMARGIN
        };
        let lineOptions = new List();
        let lineWidth = 10;
        for (let option of this._options) {
            let optionGeometry = {
                width: 10,
                height: ToolMenuPopupContent.YMARGIN
            };
            if (!Context.isReadOnly()) {
                option.prepare(null, optionGeometry);
                this._optionsSupport.add(option._root);
            }
            if (menuGeometry.height+optionGeometry.height>this.height) {
                menuGeometry.height = ToolMenuPopupContent.YMARGIN;
                for (let option of lineOptions) {
                    option.width = lineWidth + ToolMenuPopupContent.XMARGIN * 2 - 2;
                }
                menuGeometry.width += lineWidth + ToolMenuPopupContent.XMARGIN * 2 - 2;
                lineOptions.clear();
                lineWidth = 10;
            }
            if (lineWidth<optionGeometry.width) lineWidth = optionGeometry.width;
            option._root.set(menuGeometry.width, menuGeometry.height);
            menuGeometry.height += optionGeometry.height;
            lineOptions.add(option);
        }
        for (let option of lineOptions) {
            option.width = lineWidth + ToolMenuPopupContent.XMARGIN * 2 - 2;
        }
        menuGeometry.width += lineWidth + ToolMenuPopupContent.XMARGIN * 2 - 2;
        rect.attrs({
            width: menuGeometry.width + ToolMenuPopupContent.XMARGIN * 2,
            height: this.height
        });
        this.resize(menuGeometry.width + ToolMenuPopupContent.XMARGIN * 2+ToolPopup.CORNER_SIZE, this.height);
    }

    _resize(width, height) {
        super._resize(width, height);
        this._optionsSupport.set(-this.width/2, -this.height/2);
    }

}
ToolMenuPopupContent.YMARGIN = 2;
ToolMenuPopupContent.XMARGIN = 10;

export class ToolMenuPopup extends ToolPopup {

    constructor(height) {
        super(ToolPopup.HEADER_HEIGHT, height);
    }

    _createContent(width, height) {
        return new ToolMenuPopupContent(this, width, height);
    }

    get direction() {
        return false;
    }

    add(option) {
        this._content.add(option);
        return this;
    }

}

export class ToolCard {

    constructor(width, height) {
        this._root = new Group();
        this._root._owner = this;
        this._resize(width, height);
    }

    get width() {
        return this._width;
    }

    get height() {
        return this._height;
    }

    _resize(width, height) {
        assert(!isNaN(width)&&!isNaN(height));
        this._width = width;
        this._height = height;
    }

    get resizable() {
        return ToolCard.Resizable.NO;
    }

    setLocation(x, y) {
        this._root.matrix = Matrix2D.translate(x, y);
    }

    get parent() {
        let parent = this._root.parent;
        return parent ? getOwner(parent) : null;
    }

    get popup() {
        let element = this.parent;
        while (element) {
            if (element instanceof ToolCardPopup) return element;
            element = element.parent;
        }
        return null;
    }

    requestRefresh() {
        let popup = this.popup;
        popup && popup.requestRefresh();
    }

    _refresh() {
    }
}
ToolCard.Resizable = {
    NO: 0,
    VERTICAL: 1,
    HORIZONTAL: 2
};

export class ToolCardStack extends ToolCard {

    constructor(width) {
        super(1, 1);
        this._cards = new List();
    }

    _refresh() {
        let height = 0;
        for (let card of this._cards) {
            card._refresh();
            height += card.height;
        }
        this._height = height;
        let y = -height/2;
        for (let card of this._cards) {
            card.setLocation(0, y+card.height/2);
            y += card.height;
        }
        return this;
    }

    addCard(card) {
        this._cards.add(card);
        this._root.add(card._root);
        this.popup.requestRefresh();
        return this;
    }

    get cards() {
        return this._cards;
    }

    accept(visitor) {
        for (let card of this._cards) {
            visitor.visit(card);
        }
        return this;
    }

    get resizable() {
        let resizable = ToolCard.Resizable.NO;
        for (let card of this._cards) {
            if (card.resizable===ToolCard.Resizable.VERTICAL) return ToolCard.Resizable.VERTICAL;
            if (card.resizable===ToolCard.Resizable.HORIZONTAL) resizable = ToolCard.Resizable.HORIZONTAL;
        }
        return resizable;
    }

    get minWidth() {
        let minWidth = 0;
        for (let card of this._cards) {
            let cardMinWidth = card.minWidth;
            if (cardMinWidth>minWidth) minWidth = cardMinWidth;
        }
        return minWidth;
    }

    get minHeight() {
        let minHeight = 0;
        let lines = this._getLines(this.width);
        for (let line of lines) {
            if (line.length===1 && line[0].resizable === ToolCard.Resizable.VERTICAL) {
                let card = line[0];
                minHeight += card.minHeight;
            }
            else {
                minHeight += this._lineHeight(line);
            }
        }
        return minHeight;
    }

    _getLines(width) {
        let lines = new List();
        let line = null;
        let pX = 0;
        for (let card of this._cards) {
            if (card.resizable===ToolCard.Resizable.NO || card.resizable===ToolCard.Resizable.HORIZONTAL) {
                if (line && pX + card.minWidth < width) {
                    line.add(card);
                    pX += card.minWidth;
                }
                else {
                    line = new List();
                    lines.add(line);
                    line.add(card);
                    pX = card.minWidth;
                }
            }
            else {  // card.resizable===ToolCard.Resizable.VERTICAL
                line = new List();
                lines.add(line);
                line.add(card);
                pX = 0;
            }
        }
        return lines;
    }

    _lineHeight(line) {
        let height = 0;
        for (let card of line) {
            let cardMinHeight = card.minHeight;
            if (cardMinHeight>height) height = cardMinHeight;
        }
        return height;
    }

    resize(width, height) {

        function placeLine(y, width, height, line) {
            let resizables = 0;
            let margin = width;
            for (let card of line) {
                if (card.resizable === ToolCard.Resizable.HORIZONTAL) resizables++;
                margin -= card.minWidth;
                let cardMinHeight = card.minHeight;
            }
            let incWidth = resizables ? margin/resizables : margin/line.length;
            let pX = -width/2;
            for (let card of line) {
                let cardWidth = card.minWidth;
                if (!resizables || card.resizable === ToolCard.Resizable.HORIZONTAL) {
                    cardWidth += incWidth;
                }
                card.resize(cardWidth, height);
                card.setLocation(pX+cardWidth/2, y+height/2);
                pX += cardWidth;
            }
        }

        let lines = this._getLines(width);
        let resizables = 0;
        let margin = height;
        for (let line of lines) {
            if (line.length===1 && line[0].resizable === ToolCard.Resizable.VERTICAL) {
                resizables++;
                let card = line[0];
                margin -= card.minHeight;
            }
            else {
                margin -= this._lineHeight(line);
            }
        }
        let pY = -height/2;
        let incHeight = this.resizable ? margin/resizables : margin/lines.length;
        for (let line of lines) {
            if (line.length===1 && line[0].resizable === ToolCard.Resizable.VERTICAL) {
                let card = line[0];
                card.resize(width, card.minHeight+incHeight);
                card.setLocation(0, pY + card.height/2);
                pY += card.height;
            }
            else {
                let lineHeight = this._lineHeight(line);
                if (!resizables) lineHeight += incHeight;
                placeLine.call(this, pY, width, lineHeight, line);
                pY += lineHeight;
            }
        }
        this._resize(width, height);
    }
}

export class ToolPanelContent {

    constructor(width, height) {
        this._root = new Group();
        this._root._owner = this;
        this._width = width;
        this._height = height;
    }

    _refresh() {
    }

    get width() {
        return this._width;
    }

    get height() {
        return this._height;
    }

    _resize(width, height) {
        this._width = width;
        this._height = height;
    }

}

export class ToolPanelCard extends ToolCard {

    constructor(width, height) {
        super(width, height);
        this._panels = new List();
    }

    _refresh() {
        this._root.clear();
        this._build();
        return this;
    }

    get currentPanel() {
        for (let panel of this._panels) {
            if (panel.opened) {
                return panel;
            }
        }
        return null;
    }

    add(panel) {
        this._panels.add(panel);
        panel.action(panel => {
            for (let aPanel of this._panels) {
                if (aPanel === panel) {
                    aPanel.open();
                } else {
                    aPanel.close();
                }
            }
            this._refresh();
        });
        panel._resize(this.width, this.height);
        if (this._panels.length === 1) {
            panel.open();
        }
        return this;
    }

    get resizable() {
        return ToolCard.Resizable.VERTICAL;
    }

    get minWidth() {
        let currentPanel = this.currentPanel;
        return currentPanel ? currentPanel.minWidth : 1;
    }

    get minHeight() {
        let currentPanel = this.currentPanel;
        return currentPanel ? currentPanel.minHeight : 1;
    }

    resize(width, height) {
        this._resize(width, height);
        this._refresh();
    }

    get panels() {
        return this._panels;
    }

    accept(visitor) {
        for (let panel of this.panels) {
            visitor.visit(panel);
        }
        return this;
    }

}

export class ToolPanelTitle {

    constructor(panel, titleText) {
        this._panel = panel;
        this._root = new Translation();
        this._root.cursor = Cursor.DEFAULT;
        this._background = new Rect(
            0, -ToolPanel.PANEL_TITLE_HEIGHT / 2,
            10, ToolPanel.PANEL_TITLE_HEIGHT);
        this._shape = new Group();
        this._root.add(this._background);
        this._root.add(this._shape);
        this.text = titleText;
    }

    set text(titleText) {
        this._label && this._label.detach();
        this._label = new Text(
            0, ToolPanel.PANEL_TITLE_TEXT_MARGIN / 2, titleText)
            .attrs({ fill: Colors.WHITE, font_size:ToolPanel.FONT_SIZE, text_anchor: TextAnchor.MIDDLE });
        this._root.add(this._label);
        return this;
    }

    get textWidth() {
        return this._label.bbox.width;
    }

    _reshape(width) {
        let w = this.width/2;
        let h = this.height/2;
        let mh = this.height/2 - ToolPanelTitle.SHAPE_HIGHT_MARGIN;
        let m = ToolPanelTitle.SHAPE_MARGIN;
        this._shape.clear();
        this._shape.add(new Path(M(-w, h),
            Q(-w+m, h, -w+m, 0),
            Q(-w+m, -mh, -w+2*m, -mh),
            L(w-2*m, -mh),
            Q(w-m, -mh, w-m, 0),
            Q(w-m, h, w, h),
            Z()).attrs({fill:Colors.WHITE}))
    }

    highlight() {
        this._highlighted = true;
        this._reshape(this.width);
        this._label.fill = Colors.BLACK;
    }

    unhighlight() {
        delete this._highlighted;
        this._shape.clear();
        this._label.fill = Colors.WHITE;
    }

    action(action) {
        this._root.on(MouseEvents.CLICK, () => {
            action(this._panel);
        });
    }

    setLocation(x, y) {
        this._root.set(x, y);
    }

    set width(width) {
        this._background.attrs({ width, x: -width / 2 });
        if (this._highlighted) {
            this._reshape(width);
        }
    }

    get width() {
        return this._background.width;
    }

    get height() {
        return ToolPanel.PANEL_TITLE_HEIGHT;
    }
}
ToolPanelTitle.SHAPE_MARGIN = 5;
ToolPanelTitle.SHAPE_HIGHT_MARGIN = 2;

export class ToolPanel {

    constructor(titleText, content) {
        this._content = content;
        this._root = new Group();
        this._root._owner = this;
        this._width = 1;
        this._background = new Rect(0, 0, 1, 1).attrs({fill:Colors.WHITE});
        this._root.add(this._background);
        this._title = new ToolPanelTitle(this, titleText);
        this._opened = false;
    }

    get title() {
        return this._title;
    }

    action(action) {
        this._title.action(action);
        return this;
    }

    open() {
        this._opened = true;
        this._root.add(this._content._root);
    }

    close() {
        if (this._opened) {
            this._opened = false;
        }
    }

    get opened() {
        return this._opened;
    }

    _refresh() {
        if (this._opened) {
            this._content._refresh();
            this._content._root.matrix = Matrix2D.translate(0, 0)
        }
    }

    get height() {
        return this._content.height;
    }

    get width() {
        return this._width;
    }

    get height() {
        return this.opened ? this._content.height : 0;
    }

    _resize(width, height) {
        this._width = width;
        this._background.attrs({x : -width/2, width});
        this._background.attrs({y : -height/2, height});
        this._content._resize(width, height);
    }

    accept(visitor) {
        visitor.visit(this._content);
        return this;
    }

    setLocation(x, y) {
        this._root.matrix = Matrix2D.translate(x, y);
        return this;
    }

    get minWidth() {
        return this._content.minWidth;
    }

    get minHeight() {
        return this._content.minHeight;
    }
}
ToolPanel.PANEL_TITLE_HEIGHT = 20;
ToolPanel.PANEL_MIN_HEIGHT = 16;
ToolPanel.PANEL_TITLE_MARGIN = ToolPanel.PANEL_MIN_HEIGHT-ToolPanel.PANEL_TITLE_HEIGHT;
ToolPanel.PANEL_TITLE_TEXT_MARGIN = 12;
ToolPanel.FONT_SIZE = 12;

export class ToolExpandablePanelCard extends ToolPanelCard {

    constructor(width, height) {
        super(width, height);
    }

    _build() {
        let contentHeight = this.height -
            this._panels.length * ToolPanel.PANEL_TITLE_HEIGHT;
        let currentPanel = this.currentPanel;
        if (currentPanel) {
            currentPanel.height = contentHeight;
            currentPanel.width = this.width;
        }
        let height = -this._height / 2;
        for (let panel of this._panels) {
            this._root.add(panel.title._root);
            panel.title.width = this.width;
            panel.title.setLocation(0, height+ToolPanel.PANEL_TITLE_HEIGHT/2);
            height += ToolPanel.PANEL_TITLE_HEIGHT;
            if (panel.opened) {
                this._root.add(panel._root);
                panel._refresh();
                panel.setLocation(0, height + contentHeight / 2);
                height += contentHeight;
            }
        }
    }

    get titleHeight() {
        return this._panels.length * ToolPanel.PANEL_TITLE_HEIGHT;
    }

    get minHeight() {
        return super.minHeight + this.titleHeight;
    }

}

export class ToolTabsetPanelCard extends ToolPanelCard {

    constructor(width, height) {
        super(width, height);
    }

    _getTitleLines(panels) {

        function makeATry() {
            let width = -this._width / 2;
            let lines = new List();
            let currentLine = {titles: new List(), width: 0};
            lines.add(currentLine);
            for (let panel of panels) {
                this._root.add(panel.title._root);
                let titleWidth = panel.title.textWidth + ToolTabsetPanelCard.TITLE_MARGIN * 2;
                if (width + titleWidth > this.width / 2) {
                    width = -this.width / 2;
                    currentLine = {titles: new List(), width: 0};
                    lines.add(currentLine);
                }
                width += titleWidth;
                currentLine.titles.add(panel.title);
                currentLine.width += titleWidth;
            }
            return lines;
        }

        let lines = makeATry.call(this, panels);
        let lastLineTitles = lines[lines.length-1].titles;
        if (lines.length>1 && !lastLineTitles.contains(this.currentPanel.title)) {
            panels.remove(this.currentPanel);
            panels.add(this.currentPanel);
            lines = makeATry.call(this, panels);
            lastLineTitles = lines[lines.length-1].titles;
            if (lastLineTitles.length>1) {
                lastLineTitles.remove(this.currentPanel.title);
                lastLineTitles.unshift(this.currentPanel.title);
            }
        }
        return lines;
    }

    _build() {
        let panels = new List(...this._panels);
        let lines = this._getTitleLines(panels);
        let height = -this._height / 2;
        let width = -this._width / 2;
        for (let line of lines) {
            for (let title of line.titles) {
                let margin = (this.width-line.width)/line.titles.length;
                let titleWidth = title.textWidth+ToolTabsetPanelCard.TITLE_MARGIN*2+margin;
                title.width = titleWidth;
                title.setLocation(width + titleWidth/2, height+ToolPanel.PANEL_TITLE_HEIGHT/2);
                width += titleWidth;
                if (this.currentPanel && title===this.currentPanel.title) {
                    title.highlight();
                }
                else {
                    title.unhighlight();
                }
            }
            width = -this.width / 2;
            height += ToolPanel.PANEL_TITLE_HEIGHT;
        }
        let contentHeight = this.height - ToolPanel.PANEL_TITLE_HEIGHT*lines.length;
        let currentPanel = this.currentPanel;
        if (currentPanel) {
            currentPanel._resize(this.width, contentHeight);
            this._root.add(currentPanel._root);
            currentPanel._refresh();
            currentPanel.setLocation(0, height + contentHeight / 2);
        }
    }

    get titleHeight() {
        return this._getTitleLines(new List(...this._panels)).length * ToolPanel.PANEL_TITLE_HEIGHT;
    }

    get minHeight() {
        return super.minHeight + this.titleHeight;
    }

}
ToolTabsetPanelCard.TITLE_MARGIN = 20;

export class ToolCardPopupContent extends ToolPopupContent {

    constructor(popup, width, height, card) {
        super(popup, width, height, card);
        this._rootCard = card;
        this._rootCard._resize(width, height);
        this.add(this._rootCard);
    }

    addCard(card) {
        this._rootCard.addCard(card);
        this._refresh();
        return this;
    }

    _refresh() {
        this._rootCard._refresh();
        this.resize(this.width, this._rootCard.height);
        this._rootCard.setLocation(0, 0);
        return this;
    }

    accept(visitor) {
        visitor.visit(this._rootCard);
        return this;
    }

    get minWidth() {
        return this._rootCard.minWidth;
    }

    get minHeight() {
        return this._rootCard.minHeight
    }

    _resize(width, height) {
        super._resize(width, height);
        this._rootCard.resize(width, height);
    }

}

export class ToolCardPopup extends ToolPopup {

    constructor(width, card) {
        super(width, ToolPopup.HEADER_HEIGHT, card);
    }

    _createContent(width, height, card) {
        return new ToolCardPopupContent(this, width, height, card);
    }

    requestRefresh() {
        if (!this._dirty) {
            this._dirty = true;
            win.setTimeout(()=>{
                this._content._refresh();
                delete this._dirty;
            }, 0);
        }
    }

    get widthMargin() {
        return ToolCardPopup.MARGIN;
    }

    get heightMargin() {
        return ToolCardPopup.MARGIN;
    }

    get minWidth() {
        return this.direction ?
            this._content.minWidth + this.widthMargin + ToolPopup.HEADER_HEIGHT :
            this._content.minWidth + this.widthMargin*2;
    }

    get minHeight() {
        return this.direction ?
            this._content.minHeight + this.heightMargin*2 :
            this._content.minHeight + this.heightMargin + ToolPopup.HEADER_HEIGHT;
    }

    resize(width, height) {
        let minWidth = this.minWidth;
        if (width<minWidth) width = minWidth;
        let minHeight = this.minHeight;
        if (height<minHeight) height = minHeight;
        super.resize(width, height);
    }
}
ToolCardPopup.MARGIN = 5;

export class ToolFilterCard extends ToolCard {

    constructor(width, height, action) {
        super(width, height);
        this._minWidth = width;
        this._minHeight = height;
        this._background = new Rect(-width/2, -height/2, width, height).attrs({fill:Colors.LIGHTEST_GREY});
        this._root.add(this._background);
        this._action = action;
        this._buildInput(width, height);
        this._buildMagnifier(width, height);
        this._buildCross(width, height);
    }

    _inputValue() {
        return this._input._node.value;
    }

    _setInputSizeAndPosition(width, height) {
        let inputHeight = Math.round(this._minHeight*0.50);
        let inputWidth = width - Math.round(ToolFilterCard.WIDTH_OFFSET*3.5);
        let inputMargin = Math.round(inputHeight/4);
        this._input.attrs({style: `width:${inputWidth}px;height:${inputHeight}px;`});
        this._inputSupport.attrs({x:-width / 2 + inputMargin, y:-inputHeight/2, width:inputWidth});
    }

    _buildInput(width, height) {
        this._input = new DOMElement("input");
        this._input.on(MouseEvents.MOUSE_DOWN, event => {
            event.stopPropagation();
        });
        this._input.on(MouseEvents.MOUSE_UP, event => {
            event.stopPropagation();
        });
        this._input.on(KeyboardEvents.INPUT, event => {
            this._action && this._action(this._inputValue());
        });
        this._inputSupport = new ForeignObject(-width / 2, -height / 2, width, height);
        this._inputSupport.add(this._input);
        this._root.add(this._inputSupport);
        this._setInputSizeAndPosition(width, height);
    }

    _setMagnifierSizeAndPosition(width, height) {
        let magnifierSize = ToolFilterCard.WIDTH_OFFSET;
        let magnifierMargin = Math.round(magnifierSize/4);
        this._magnifierSupport.set(width/2-magnifierMargin-magnifierSize/2, 0);
    }

    _buildMagnifier(width, height) {
        let magnifierSize = ToolFilterCard.WIDTH_OFFSET;
        this._magnifier = new SvgRasterImage(
            "./images/icons/magnifier.svg", -magnifierSize/2, -magnifierSize/2, magnifierSize, magnifierSize );
        this._magnifierSupport = new Translation();
        this._magnifierSupport.add(this._magnifier);
        this._root.add(this._magnifierSupport);
        this._magnifierSupport.on(MouseEvents.MOUSE_DOWN, event=>{
            this._magnifier.matrix = Matrix2D.scale(0.9, 0.9, 0, 0);
        });
        this._magnifierSupport.on(MouseEvents.CLICK, event=>{
            this._action && this._action(this._inputValue());
        });
        this._magnifierSupport.on(MouseEvents.MOUSE_UP, event=>{
            this._magnifier.matrix = null;
        });
        this._setMagnifierSizeAndPosition(width, height);
    }

    _setCrossSizeAndPosition(width, height) {
        let crossSize = ToolFilterCard.WIDTH_OFFSET;
        let crossMargin = Math.round(crossSize/4);
        this._crossSupport.set(width/2-crossMargin*2-crossSize*3/2, 0);
    }

    _buildCross(width, height) {
        let crossSize = ToolFilterCard.WIDTH_OFFSET;
        this._cross = new SvgRasterImage(
            "./images/icons/cross.svg", -crossSize/2, -crossSize/2, crossSize, crossSize );
        this._crossSupport = new Translation();
        this._setCrossSizeAndPosition(width, height);
        this._crossSupport.add(this._cross);
        this._root.add(this._crossSupport);
        this._crossSupport.on(MouseEvents.MOUSE_DOWN, event=>{
            this._cross.matrix = Matrix2D.scale(0.9, 0.9, 0, 0);
        });
        this._crossSupport.on(MouseEvents.CLICK, event=>{
            this._input._node.value = "";
            this._action && this._action(this._inputValue());
        });
        this._crossSupport.on(MouseEvents.MOUSE_UP, event=>{
            this._cross.matrix = null;
        });
    }

    get resizable() {
        return ToolCard.Resizable.NO;
    }

    resize(width, height) {
        this._resize(width, height);
        this._background.attrs({x:-width/2, y:-height/2, width, height});
        this._setInputSizeAndPosition(width, height);
        this._setCrossSizeAndPosition(width, height);
        this._setMagnifierSizeAndPosition(width, height);
    }

    get minWidth() {
        return this._minWidth;
    }

    get minHeight() {
        return this._minHeight;
    }
}
ToolFilterCard.WIDTH_OFFSET = 20;

export class ToolKeywordsCard extends ToolCard {

    constructor(width, action) {
        super(width, 1);
        this._minWidth = width;
        this._keywords = new List();
        this._content = new Translation();
        this._background = new Rect(-width/2, 0, width, 1).attrs({fill:Colors.LIGHTEST_GREY});
        this._content.add(this._background);
        this._pedestalsSupport = new Translation();
        this._content.add(this._pedestalsSupport);
        this._action = action;
        this._root.add(this._content);
    }

    addKeyword(keyword, label=keyword) {
        this._keywords.add({keyword, label});
        let popup = this.popup;
        popup && popup.requestRefresh();
        return this;
    }

    removeKeyword(keyword) {
        this._keywords = this._keywords.filter(it=>it.keyword!==keyword);
        let popup = this.popup;
        popup && popup.requestRefresh();
        return this;
    }

    _build() {
        this._pedestalsSupport.clear();
        this._pedestals = new List();
        let current = null;
        let height = ToolKeywordsCard.MARGIN;
        let x = -this._width / 2 + ToolKeywordsCard.MARGIN;
        let y = -ToolKeywordsCard.MARGIN;
        for (let keyword of this._keywords) {
            let pedestal = new Translation();
            this._pedestals.add(pedestal);
            let text = new Text(0, 0, keyword.label).attrs({
                text_anchor: TextAnchor.MIDDLE,
                alignement_baseline: AlignmentBaseline.MIDDLE,
                class: ToolKeywordsCard.KEYWORD_UNSELECTED_CLASS
            });
            pedestal.text = text;
            pedestal.keyword = keyword;
            pedestal.add(text);
            this._pedestalsSupport.add(pedestal);
            let bbox = pedestal.bbox;
            if (y <= 0 || x + bbox.width > this._width / 2 - ToolKeywordsCard.MARGIN) {
                x = -this._width / 2 + ToolKeywordsCard.MARGIN;
                y += bbox.height + ToolKeywordsCard.MARGIN;
                height += bbox.height + ToolKeywordsCard.MARGIN;
            }
            let background = new Rect( -bbox.width / 2,  -bbox.height / 2 - ToolKeywordsCard.MARGIN,
                bbox.width, bbox.height + ToolKeywordsCard.MARGIN )
                .attrs({ opacity: 0.0001 });
            pedestal.insert(text, background);
            pedestal.on(MouseEvents.CLICK, event => {
                if (current === pedestal) {
                    current = null;
                    text.attrs({ class: ToolKeywordsCard.KEYWORD_UNSELECTED_CLASS });
                } else {
                    if (current) {
                        current.text.attrs({ class: ToolKeywordsCard.KEYWORD_UNSELECTED_CLASS });
                    }
                    current = pedestal;
                    text.attrs({ class: ToolKeywordsCard.KEYWORD_SELECTED_CLASS });
                }
                this._action && this._action(current.keyword)
            });
            pedestal.set(x + bbox.width / 2, y);
            x += bbox.width + ToolKeywordsCard.MARGIN;
        }
        let dWidth = this.width - this._pedestalsSupport.bbox.width;
        this._pedestalsSupport.set(dWidth/2, 0);
        return height;
    }

    _refresh() {
        this._height  = this._build();
        this._content.set(0, -this._height/2);
        this._background.attrs({x: -this._width/2, y: 0, width:this._width, height:this._height});
    }

    get resizable() {
        return ToolCard.Resizable.HORIZONTAL;
    }

    resize(width, height) {
        this._resize(width, height);
        this._build();
        this._content.set(0, -this._height/2);
        this._background.attrs({x: -this._width/2, y: 0, width:this._width, height:this._height});
    }

    get minWidth() {
        return this._minWidth;
    }

    get minHeight() {
        let minHeight = ToolKeywordsCard.MARGIN;
        let x = -this._width / 2 + ToolKeywordsCard.MARGIN;
        let y = -ToolKeywordsCard.MARGIN;
        for (let pedestal of this._pedestals) {
            let bbox = pedestal.bbox;
            if (y <= 0 || x + bbox.width > this._width / 2 - ToolKeywordsCard.MARGIN) {
                x = -this._width / 2 + ToolKeywordsCard.MARGIN;
                y += bbox.height + ToolKeywordsCard.MARGIN;
                minHeight += bbox.height + ToolKeywordsCard.MARGIN;
            }
            x += bbox.width + ToolKeywordsCard.MARGIN;
        }
        return minHeight;
    }

}
ToolKeywordsCard.MARGIN = 5;
ToolKeywordsCard.KEYWORD_SELECTED_CLASS = "keyword-selected";
ToolKeywordsCard.KEYWORD_UNSELECTED_CLASS = "keyword-unselected";

export class ToolPanelPopup extends ToolCardPopup {

    constructor(width, panelWidth, panelHeight, cards) {
        let rootCard = new ToolCardStack();
        super(width, rootCard);
        if (cards) {
            for (let card of cards) {
                rootCard.addCard(card);
            }
        }
        this._panelSet = this._buildPanelCard(panelWidth, panelHeight);
        rootCard.addCard(this._panelSet);
        this.requestRefresh();
    }

    get currentPane() {
        return this._panelSet.currentPane();
    }

    addPanel(panel) {
        this._panelSet.add(panel);
        this.requestRefresh();
        return this;
    }

    accept(visitor) {
        visitor.visit(this._panelSet);
        return this;
    }

}

export class ToolExpandablePanelPopup extends ToolPanelPopup {

    constructor(width, panelWidth, panelHeight, cards) {
        super(width, panelWidth, panelHeight, cards);
    }

    _buildPanelCard(panelWidth, panelHeight) {
        return new ToolExpandablePanelCard(panelWidth, panelHeight);
    }

}

export class ToolTabsetPanelPopup extends ToolPanelPopup {

    constructor(width, panelWidth, panelHeight, cards) {
        super(width, panelWidth, panelHeight, cards);
    }

    _buildPanelCard(panelWidth, panelHeight) {
        return new ToolTabsetPanelCard(panelWidth, panelHeight);
    }

}

export class ToolCell {

    constructor() {
        this._root = new Group();
        this._id = ToolCell.count++;
        this._root._owner = this;
    }

    activate(owner, width, height) {
        this._owner = owner;
        this._width = width;
        this._height = height;
    }

    get owner() {
        return this._owner;
    }

    get width() {
        return this._width;
    }

    get height() {
        return this._height;
    }

    get visible() {
        return true;
    }

    accept(visitor) {
        return this;
    }

}
ToolCell.count = 0;

export function all() {
    return true;
}

export class ToolGridPanelContent extends ToolPanelContent {

    constructor(width, cellWidth, cellHeight) {
        super(width, cellHeight);
        this._dirty = false;
        this._predicate = all;
        this._maxHeight = cellHeight;
        this._cellWidth = cellWidth;
        this._cellHeight = cellHeight;
        this._clipRect = new Rect(-this.width / 2 + 5, -this.height / 2 + 5, this.width - 10, this.height - 10);
        this._clipPath = new ClipPath(toolId()).add(this._clipRect);
        this._root.add(this._clipPath);
        this._content = new Group();
        this._root.add(this._content);
        this._background = new Rect(-width / 2, -this.height / 2, width, this.height)
            .attrs({ stroke: Colors.NONE, fill: Colors.WHITE });
        this._content.add(this._background);
        this._content.clip_path = this._clipPath;
        this._cells = new List();
        this._shownCells = new ESet();
        this._content.on(MouseEvents.WHEEL, event => {
            if (event.deltaY > 0) {
                this.scroll(-ToolGridPanelContent.SCROLL_WHEEL_STEP);
            } else {
                this.scroll(ToolGridPanelContent.SCROLL_WHEEL_STEP);
            }
            event.preventDefault();
            event.stopPropagation();
        });
        Layers.instance.addObserver(this);
    }

    get cells() {
        return this._cells;
    }

    _notified(source, event) {
        if (source === Layers.instance && event === Layers.events.ACTIVATE) {
            this._requestRefresh();
        }
    }

    unselectAll() {
        for (let cell of this._cells) {
            cell.unselect && cell.unselect();
        }
        return this;
    }

    _getCellsToShow() {
        let shownCells = new ESet();
        for (let cell of this._cells) {
            if (this._accept(cell)) {
                shownCells.add(cell);
            }
        }
        return shownCells;
    }

    get predicate() {
        return this._predicate;
    }

    set predicate(predicate) {
        this._predicate = predicate;
        this._requestRefresh();
    }

    scroll(step) {
        let y = this._content.matrix.dy + step;
        if (y + this._maxHeight < this.height) {
            y = this.height - this._maxHeight;
            this._fire(Events.SCROLL_END);
        }
        if (y >= 0) y = 0;
        this.move(0, y);
    }

    _accept(cell) {
        return cell.visible && this._predicate(cell);
    }

    _refresh() {
        let shownCells = this._getCellsToShow();
        if (!this._shownCells || !shownCells.same(this._shownCells)) {
            this._shownCells = shownCells;
            this._buildContent();
        }
    }

    _resize(width, height) {
        this._shownCells = null;
        super._resize(width, height);
        this._requestRefresh();
    }

    _buildContent() {
        this._clipRect.attrs({x: -this.width / 2, y: -this.height / 2, width: this.width, height: this.height });
        this._background.attrs({x: -this.width/2, y:-this.height/2, width:this.width, height:this.height} );
        if (this._cellsLayer) {
            this._cellsLayer.detach();
        }
        this._cellsLayer = new Group();
        this._content.add(this._cellsLayer);

        let cellsByLine = Math.floor((this.width-ToolGridPanelContent.CELL_MARGIN*2)/this._cellWidth);
        let cellWidth = (this.width-ToolGridPanelContent.CELL_MARGIN*2)/cellsByLine;

        let startX = cellWidth / 2 + ToolGridPanelContent.CELL_MARGIN;
        let startY = this._cellHeight / 2 + ToolGridPanelContent.CELL_MARGIN;
        let index=0;
        for (let cell of this._shownCells) {
            if (this._accept(cell)) {
                if (index>=cellsByLine) {
                    index = 0;
                    startX = cellWidth / 2 + ToolGridPanelContent.CELL_MARGIN;
                    startY += this._cellHeight;
                }
                index++;
                cell._root.matrix = Matrix2D.translate(startX - this.width / 2, startY - this.height / 2);
                startX += cellWidth;
                this._cellsLayer.add(cell._root);
            }
        }
        this._maxHeight = startY + this._cellHeight / 2 + ToolGridPanelContent.CELL_MARGIN;
        this._background.attrs({ height: this._maxHeight });
        let step = this._content.matrix.dy;
        this.move(0, 0);
        this.scroll(step);
    }

    move(x, y) {
        this._content.matrix = Matrix2D.translate(x, y);
        this._clipRect.matrix = Matrix2D.translate(0, -y);
    }

    addCell(cell) {
        this._cells.add(cell);
        cell.activate(this,
            this._cellWidth * ToolGridPanelContent.REDUCTION_FACTOR,
            this._cellHeight * ToolGridPanelContent.REDUCTION_FACTOR);
        this._requestRefresh();
        return this;
    }

    removeCell(cell) {
        this._cells.remove(cell);
        this._requestRefresh();
        return this;
    }

    _requestRefresh() {
        if (!this._dirty) {
            win.setTimeout(
                () => {
                    this._dirty = false;
                    this._refresh()
                }, 0);
            this._dirty = true;
        }
    }

    accept(visitor) {
        for (let cell of this._cells) {
            visitor.visit(cell);
        }
        return this;
    }

    get minWidth() {
        return this._cellWidth + ToolGridPanelContent.CELL_MARGIN*2;
    }

    get minHeight() {
        return this._cellHeight + ToolGridPanelContent.CELL_MARGIN*2;
    }
}
makeObservable(ToolGridPanelContent);
ToolGridPanelContent.SCROLL_WHEEL_STEP = 50;
ToolGridPanelContent.CELL_MARGIN = 10;
ToolGridPanelContent.REDUCTION_FACTOR = 0.95;

export class ToolGridExpandablePanel extends ToolPanel {

    constructor(titleText, content, predicate = all) {
        super(titleText, content);
        this._predicate = predicate;
    }

    open() {
        super.open();
        this._content.predicate = this._predicate;
    }

}

export function getItemBuilder(artifact) {
    let svgElement = artifact._root;
    while (svgElement) {
        if (svgElement._owner instanceof SigmaItemBuilder) {
            return svgElement._owner;
        }
        svgElement = svgElement.parent;
    }
    return null;
}

export function getPanelContent(artifact) {
    let itemBuilder =  getItemBuilder(artifact);
    return itemBuilder ? itemBuilder.owner : null;
}

export function onToolPanelContent(panelContent) {
    return function(element) {
        return getPanelContent(element) === panelContent;
    }
}

export class SigmaItemBuilder extends ToolCell {

    constructor(proto, action, imageURL, label) {
        super();
        this._proto = proto;
        this._imageURL = imageURL;
        this._support = new Group();
        this._root.add(this._support);
        this._action = action;
        this._setLabel(label);
        Canvas.instance.addObserver(this);
    }

    _setLabel(label) {
        if (label!==undefined && label!==null) {
            if (typeof(label)==="string") {
                this._label = new MultiLineText(label);
            }
            else if (label instanceof SVGElement) {
                this._label = label;
            }
            else {
                assert(false);
            }
        }
    }

    get gx() {
        return this._root.globalMatrix.dx;
    }

    get gy() {
        return this._root.globalMatrix.dy;
    }

    get itemHeight() {
        return this.height * SigmaItemBuilder.ITEM_HEIGHT_FACTOR;
    }

    get textHeight() {
        return this.height - this.itemHeight;
    }

    _addMenuOption(menuOption) {
        if (!this._menuOptions) {
            this._menuOptions = new List();
        }
        this._menuOptions.add(menuOption);
        return this;
    }

    showImage() {
        if (this._image) {
            this._image.visibility = Visibility.VISIBLE;
            this._support.visibility = Visibility.HIDDEN;
        }
    }

    hideImage() {
        if (this._image) {
            this._image.visibility = Visibility.HIDDEN;
            this._support.visibility = Visibility.VISIBLE;
        }
    }

    activate(owner, width, height) {
        super.activate(owner, width, height);
        this._makeItems();
        this._adjustSize();
        if (this._imageURL) {
            this._image = new RasterImage(this._imageURL, -width/2, -height/2, width, this.itemHeight);
            this._root.add(this._image);
            this._image.visibility = Visibility.HIDDEN;
        }
        if (this._label) {
            this._root.add(this._label);
            let factor = Math.min(this.width/this._label.width, this.height/this._label.height);
            if (factor>SigmaItemBuilder.MIN_TEXT_REDUCTION_FACTOR) factor=SigmaItemBuilder.MIN_TEXT_REDUCTION_FACTOR;
            this._label.matrix = Matrix2D.translate(0, (this.height-this.textHeight)/2).mult(Matrix2D.scale(factor, factor));
        }
        this._glass = new Rect(
            -width/2-SigmaItemBuilder.MARGIN, -height/2-SigmaItemBuilder.MARGIN,
            width+SigmaItemBuilder.MARGIN*2, this.itemHeight+SigmaItemBuilder.MARGIN).attrs({
           fill:Colors.WHITE, stroke:Colors.NONE, opacity:0.01
        });
        this._root.add(this._glass);
        this._glass.on(MouseEvents.MOUSE_DOWN, event=>{
            event.stopPropagation();
            event.preventDefault();
            this.select();
            let anchor = this._currentItems.pick();
            let eventSpecs = {bubbles: true, clientX: event.clientX, clientY: event.clientY};
            let dragEvent = new MouseEvent(MouseEvents.MOUSE_DOWN, eventSpecs);
            anchor._root._node.dispatchEvent(dragEvent);
        });
        this._glass.on(MouseEvents.CONTEXT_MENU, event=>{
            event.preventDefault();
            if (this._menuOptions) {
                Canvas.instance.openMenu(this.gx, this.gy, this._menuOptions);
            }
        });
        this._glass.on(MouseEvents.CLICK, event=>{
            if (this._action) {
                this._action.call(this, this._currentItems);
            }
        });
        return this;
    }

    selected() {
        return  Selection.instance.selected(this._currentItems.pick());
    }

    select() {
        if (!this._selected) {
            this._owner.unselectAll();
            this._selected = true;
            for (let element of this._currentItems) {
                Selection.instance.select(element);
            }
            if (this._image) {
                this._image.filter = SigmaItemBuilder.getImageSelectionMark();
            }
        }
    }

    unselect() {
        if (this._selected) {
            for (let element of this._currentItems) {
                element.visit({}, function (context) {
                    Selection.instance.unselect(this);
                });
            }
            if (this._image) {
                this._image.filter = null;
            }
        }
        delete this._selected;
    }

    _notified(source, event) {
        if (source === Canvas.instance && event === DragMoveSelectionOperation.DRAG_MOVE_START) {
            if (this._support.children.length===0) {
                this._makeItems();
                this.select();
            }
        }
    }

    _makeItems() {
        this._currentItems = CopyPaste.instance.duplicateForPaste(this._proto);
        for (let item of this._currentItems) {
            Canvas.instance.toolsLayer.setZIndexes(item);
            item._setParent(this);
            this._support.add(item._root);
        }
        return this._currentItems;
    }

    add(element) {}

    detachChild(element) {
        this._support.remove(element._root);
        Canvas.instance.toolsLayer.unsetZIndexes(element);
        element._setParent(null);
    }

    _adjustSize() {
        let bbox = l2pBoundingBox(this._currentItems);
        let sizeWidthFactor = this.width / bbox.width;
        let sizeHeightFactor = this.itemHeight / bbox.height;
        this._zoom = Math.min(sizeWidthFactor, sizeHeightFactor, SigmaItemBuilder.MAX_ITEM_ENLARGMENT_FACTOR);
        this._support.matrix = Matrix2D.translate(-bbox.cx, -bbox.cy - (this.height-this.itemHeight)/2)
            .scale(this._zoom, this._zoom, 0, 0)
    }

    applyOr(predicate) {
        for (let element of this._proto) {
            if (predicate(element)) return true;
        }
        return false;
    }

    applyAnd(predicate) {
        for (let element of this._proto) {
            if (!predicate(element)) return false;
        }
        return true;
    }

    accept(visitor) {
        for (let item of this._proto) {
            visitor.visit(item);
        }
        for (let item of this._currentItems) {
            visitor.visit(item);
        }
        return this;
    }

    get visible() {
        for (let element of this._currentItems) {
            if (element.visible) {
                return true;
            }
        }
        return false;
    }

    _unexecuteDrop(element) {
        element._root.detach();
        element._setParent(null);
    }

    get contentSelectionMark() {
        if (!this._selectionMark) {
            this._selectionMark = defineShadow(`_s${this._id}_`, Colors.RED);
            this._selectionMark.feDropShadow.stdDeviation = [5/this._zoom, 5/this._zoom];
            Canvas.instance.addFilter(this._selectionMark);
        }
        return this._selectionMark;
    }

}
SigmaItemBuilder.ITEM_HEIGHT_FACTOR = 0.65;
SigmaItemBuilder.MIN_TEXT_REDUCTION_FACTOR = 0.6;
SigmaItemBuilder.MAX_ITEM_ENLARGMENT_FACTOR = 4;
SigmaItemBuilder.MARGIN = 4;
SigmaItemBuilder.getImageSelectionMark = function() {
    if (!Context._boardItemBuilderImageSelectionMark) {
        Context._boardItemBuilderImageSelectionMark = defineShadow(`_bIbImg_`, Colors.RED);
        Context._boardItemBuilderImageSelectionMark.feDropShadow.stdDeviation = [5, 5];
        Canvas.instance.addFilter(Context._boardItemBuilderImageSelectionMark);
    }
    return Context._boardItemBuilderImageSelectionMark;
};

export class FavoriteItemBuilder extends SigmaItemBuilder {

    constructor(proto) {
        super(proto);
        this._addMenuOption({that:this, line:new TextMenuOption("Remove", ()=>{this.owner.removeCell(this);})});
    }

}
