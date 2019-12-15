'use strict';

import {
    List, ESet
} from "./collections.js";
import {
    Matrix
} from "./geometry.js";
import {
    Visibility, computePosition, RasterImage, SvgRasterImage, Group, ClipPath, Rect, Text, AlignmentBaseline,
    Colors, MouseEvents, TextAnchor, win, Cursor, ForeignObject, DOMElement, Translation, KeyboardEvents,
    M, Path, Z, Q, L
} from "./graphics.js";
import {
    Context, Events, l2pBoundingBox, Memento, Canvas, makeObservable, makeNotCloneable,
    Layers, makeSingleton, CopyPaste, Selection, getOwner
} from "./toolkit.js";
import {
    DragOperation, DragMoveSelectionOperation
} from "./drag-and-drop.js";
import {
    makeDraggable
} from "./core-mixins.js";
import {
    defineShadow
} from "./svgtools.js";

export class Menu {

    constructor(x, y, menuOptions, closeOnSelect = true) {
        this._root = new Group();
        this._x = x;
        this._y = y;
        this._menuOptions = menuOptions;
        this._buildContent();
        this.closeOnSelect = closeOnSelect;
        Canvas.instance.putArtifactOnToolsLayer(this._root);
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
        if (x + menuGeometry.width + Menu.XMARGIN > Canvas.instance.clientWidth) {
            x = Canvas.instance.clientWidth - menuGeometry.width - Menu.XMARGIN;
        }
        if (y + menuGeometry.height + Menu.YMARGIN > Canvas.instance.clientHeight) {
            y = Canvas.instance.clientHeight - menuGeometry.height - Menu.YMARGIN;
        }
        this._root.matrix = new Matrix().translate(x, y);
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
        setTimeout(() => {
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
        this._root = new Group();
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

    constructor(imageURL, x, action) {
        this._root = new RasterImage(imageURL,
            -ToolTitleCommand.SIZE/2, -ToolTitleCommand.SIZE/2, ToolTitleCommand.SIZE, ToolTitleCommand.SIZE );
        this._root._owner = this;
        this.move(x);
        this._root.on(MouseEvents.CLICK, action);
    }

    move(x) {
        this._root.matrix = Matrix.translate(x, 0);
    }

}
ToolTitleCommand.SIZE = 12;

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
        this._root = new Group(Matrix.translate(0, -popup.height / 2 + ToolPopup.HEADER_HEIGHT / 2));
        this._titleBackground = new Rect(-popup.width / 2, -ToolPopup.HEADER_HEIGHT / 2, popup.width, ToolPopup.HEADER_HEIGHT)
            .attrs({fill: Colors.BLACK});
        this._root.add(this._titleBackground);
        this._minimize = new ToolTitleCommand(ToolPopup.MINIMIZE_URL, popup.width/2-ToolPopup.HEADER_MARGIN,
            () => popup.minimize()
        );
        this._root.add(this._minimize._root);
        this._restore = new ToolTitleCommand(ToolPopup.RESTORE_URL, popup.width/2-ToolPopup.HEADER_MARGIN,
            () => popup.restore()
        );
        this._dragOperation(function() {return DragPopupOperation.instance;});
    }

    set width(width) {
        this._titleBackground.x = -width/2;
        this._titleBackground.width = width;
        this._minimize.move(this._popup.width/2-ToolPopup.HEADER_MARGIN);
        this._restore.move(this._popup.width/2-ToolPopup.HEADER_MARGIN);
    }

    get popup() {
        return this._popup;
    }

    minimize(clip, y) {
        this._root.add(this._restore._root);
        this._minimize._root.detach();
        this._titleBackground.attrs({ clip_path: clip });
        this._root.matrix = Matrix.translate(0, y);
    }

    restore(clip, y) {
        this._root.add(this._minimize._root);
        this._restore._root.detach();
        this._titleBackground.attrs({ clip_path: clip });
        this._root.matrix = Matrix.translate(0, y);
    }

}
makeDraggable(ToolTitlePopup);

export class ToolPopup {

    constructor(width, height) {
        this._height = height;
        this._root = new Group();
        this._background = new Rect(-width / 2, -height / 2, width, height)
            .attrs({
                stroke: Colors.BLACK,
                fill: Colors.LIGHT_GREY,
                rx: ToolPopup.CORNER_SIZE, ry: ToolPopup.CORNER_SIZE, filter: Canvas.instance.shadowFilter
            });
        this._root.add(this._background);
        this._root._owner = this;
        this._contentSupport = new Group();
        this._root.add(this._contentSupport);
        this._content = new Group();
        this._contentSupport.add(this._content);
        this._maxClip = new ClipPath(toolId()).add(
            new Rect(-width / 2, -ToolPopup.HEADER_HEIGHT / 2, width, ToolPopup.HEADER_HEIGHT+5)
            .attrs({ rx: ToolPopup.CORNER_SIZE, ry: ToolPopup.CORNER_SIZE }));
        this._minClip = new ClipPath(toolId()).add(
            new Rect(-width / 2, -ToolPopup.HEADER_HEIGHT / 2, width, ToolPopup.HEADER_HEIGHT)
            .attrs({ rx: ToolPopup.CORNER_SIZE, ry: ToolPopup.CORNER_SIZE }));
        this._title = new ToolTitlePopup(this);
        this._root.add(this._title._root);
        let y =-height / 2 + ToolPopup.HEADER_HEIGHT / 2
        this._title.restore(this._maxClip, y);
        Canvas.instance.addObserver(this);
        Canvas.instance.putArtifactOnToolsLayer(this._root);
        this._dragOperation(()=>ResizePopupOperation.instance);
    }

    get minimized() {
        return this._minimized;
    }

    get width() {
        return this._background.width;
    }

    set width(width) {
        this._background.width = width;
        this._background.x = -width/2;
    }

    get height() {
        return this.minimized ? ToolPopup.HEADER_HEIGHT : this._height;
    }

    _setHeight(height) {
        // TODO : setHeight may be invoked while minimized !!
        this._height = height;
        this._background.height = height;
        this._background.y = -height/2;
        let y =  -height/2+ToolPopup.HEADER_HEIGHT/2;
        this._title.restore(this._maxClip, y);
    }

    set height(height) {
        this._setHeight(height);
        this._adjustPosition();
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        this._title.width = this.width;
    }

    minimize() {
        this._minimized = true;
        this._background.attrs({
            x: -this.width / 2, y: -ToolPopup.HEADER_HEIGHT / 2,
            width: this.width, height: ToolPopup.HEADER_HEIGHT});
        this._content.detach();
        let dY = this._height / 2 - ToolPopup.HEADER_HEIGHT / 2;
        this._title.minimize(this._minClip, 0);
        this._root.matrix = Matrix.translate(this._root.matrix.dx, this._root.matrix.dy - dY);
    }

    restore() {
        this._minimized = false;
        this._background.attrs({
            x: -this.width / 2, y: -this.height / 2,
            width: this.width, height: this.height});
        this._contentSupport.add(this._content);
        let dY = this._background.height / 2 - ToolPopup.HEADER_HEIGHT / 2;
        this._title.restore(this._maxClip, -dY);
        this._root.matrix = Matrix.translate(this._root.matrix.dx, this._root.matrix.dy + dY);
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

    add(something) {
        this._content.add(something._root);
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
        this._root.matrix = Matrix.translate(x, y);
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
ToolPopup.TITLE_MARGIN = 1;
ToolPopup.FOOTER_MARGIN = 10;
// Distance between the right edge of the popup and the minimize/restore icon
ToolPopup.HEADER_MARGIN = 10;
ToolPopup.MINIMIZE_URL = "./images/icons/minimize.png";
ToolPopup.RESTORE_URL = "./images/icons/restore.png";

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
        popup._root.matrix = Matrix.translate(pX, pY);
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
        popup.move(nx, ny);
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
        this._root.on(MouseEvents.MOUSE_DOWN, ()=>{this._iconSupport.matrix=Matrix.scale(0.95, 0.95, 0, 0)});
        this._root.on(MouseEvents.MOUSE_UP, ()=>{this._iconSupport.matrix=Matrix.scale(1, 1, 0, 0)});
        this._iconSupport = new Group();
        this._icon = new SvgRasterImage(imageURL, -size/2, -size/2, size, size);
        this._root.add(this._iconSupport.add(this._icon));
        this._root._owner = this;
        this._size = size;
    }

    move(x, y) {
        this._root.matrix = Matrix.translate(x, y);
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

export class ToolCommandPopup extends ToolPopup {

    constructor(width, size) {
        super(width, ToolPopup.HEADER_HEIGHT);
        this._size = size;
        this._margin = (width/2 - size)/3;
        this._row = ToolPopup.HEADER_HEIGHT + this._margin*2;
        this._left = true;
        this._commands = new Group();
        this._content.add(this._commands);
    }

    _newLine() {
        if (!this._left) {
            this._left = true;
            this._row += this._size + this._margin * 2;
        }
    }

    add(command) {
        this._commands.add(command._root);
        if (command.width===this._size) {
            if (this._left) {
                command.move(-this._size / 2 - this._margin, this._row + this._size / 2);
                this._left = false;
                this.height = this._row + this._size + this._margin*2;
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
            this.height = this._row;
        }
        return this;
    }

    _setHeight(height) {
        super._setHeight(height);
        this._commands.matrix = Matrix.translate(0, -height/2);
    }

    addMargin() {
        this._newLine();
        this._row += this._margin * 2;
        return this;
    }
}

export class ToolCard {

    constructor(width, height) {
        this._root = new Group();
        this._root._owner = this;
        this._setSize(width, height);
    }

    _setSize(width, height) {
        this._width = width;
        this._height = height;
    }

    get width() {
        return this._width;
    }

    get height() {
        return this._height;
    }

    set width(width) {
        this._setSize(width, this._height);
    }

    set height(height) {
        this._setSize(this._width, height);
    }

    get resizable() {
        return false;
    }

    setLocation(x, y) {
        this._root.matrix = Matrix.translate(x, y);
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
        for (let card of this._cards) {
            if (card.resizable) return true;
        }
        return false;
    }

    resize(width, height) {
        let resizables = 0;
        for (let card of this._cards) {
            if (card.resizable) resizables++;
        }
        let pY = -height/2;
        let pHeight = this.height;
        let incHeight = (height-pHeight)/resizables;
        for (let card of this._cards) {
            if (card.resizable) {
                card.resize(width, card.height+incHeight);
            }
            card.setLocation(0, pY + card.height/2);
            pY += card.height;
        }
        this._setSize(width, height);
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

    _setWidth(width) {
        this._width = width;
    }

    set width(width) {
        this._setWidth(width);
    }

    get height() {
        return this._height;
    }

    _setHeight(height) {
        this._height = height;
    }

    set height(height) {
        this._setHeight(height);
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
        panel.width = this.width;
        if (this._panels.length === 1) {
            panel.open();
        }
        return this;
    }

    get resizable() {
        return true;
    }

    resize(width, height) {
        this._setSize(width, height);
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
            this._content._root.matrix = Matrix.translate(0, 0)
        }
    }

    get height() {
        return this._content.height;
    }

    set height(height) {
        this._content.height = height;
        this._background.attrs({y : -height/2, height});
    }

    get width() {
        return this._width;
    }

    set width(width) {
        this._width = width;
        this._background.attrs({x : -width/2, width});
        this._content.width = width;
    }

    get height() {
        return this.opened ? this._content.height : 0;
    }

    accept(visitor) {
        visitor.visit(this._content);
        return this;
    }

    setLocation(x, y) {
        this._root.matrix = Matrix.translate(x, y);
        return this;
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
        if (this.currentPanel) {
            this.currentPanel.height = contentHeight;
            this.currentPanel.width = this.width;
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
        if (this.currentPanel) {
            this.currentPanel.width = this.width;
            this.currentPanel.height = contentHeight;
            this._root.add(this.currentPanel._root);
            this.currentPanel._refresh();
            this.currentPanel.setLocation(0, height + contentHeight / 2);
        }
    }

}
ToolTabsetPanelCard.TITLE_MARGIN = 20;

export class ToolCardPopup extends ToolPopup {

    constructor(width, card) {
        super(width, 1);
        this._rootCard = card;
        this._rootCard.width = width-this._widthMargin;
        this.add(this._rootCard);
    }

    get contentHeight() {
        return this.height -ToolPopup.HEADER_HEIGHT -ToolPopup.TITLE_MARGIN -ToolPopup.FOOTER_MARGIN;
    }

    get contentCenter() {
        return (ToolPopup.HEADER_HEIGHT +ToolPopup.TITLE_MARGIN -ToolPopup.FOOTER_MARGIN)/2;
    }

    addCard(card) {
        this._rootCard.addCard(card);
        this._refresh();
        return this;
    }

    requestRefresh() {
        if (!this._dirty) {
            this._dirty = true;
            win.setTimeout(()=>{
                this._refresh();
                delete this._dirty;
            }, 0);
        }
    }

    get _widthMargin() {
        return ToolCardPopup.MARGIN*2;
    }

    get _heightMargin() {
        return ToolPopup.HEADER_HEIGHT + ToolPopup.TITLE_MARGIN + ToolPopup.FOOTER_MARGIN;
    }

    _refresh() {
        this._rootCard._refresh();
        this._setHeight(this._rootCard.height + this._heightMargin);
        this._rootCard.setLocation(0, this.contentCenter);
        return this;
    }

    accept(visitor) {
        visitor.visit(this._rootCard);
        return this;
    }

    resize(width, height) {
        super.resize(width, height);
        this._rootCard.resize(width-this._widthMargin, height -this._heightMargin);
    }
}
ToolCardPopup.MARGIN = 5;

export class ToolFilterCard extends ToolCard {

    constructor(width, height, action) {
        super(width, height);
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

    _buildInput(width, height) {
        let inputHeight = Math.round(height*0.66);
        let inputWidth = width - Math.round(ToolFilterCard.WIDTH_OFFSET*3.5);
        let margin = Math.round(inputHeight/4);
        this._input = new DOMElement("input").attrs({style: `width:${inputWidth}px;height:${inputHeight}px;`});
        this._input.on(MouseEvents.MOUSE_DOWN, event => {
            event.stopPropagation();
        });
        this._input.on(MouseEvents.MOUSE_UP, event => {
            event.stopPropagation();
        });
        this._input.on(KeyboardEvents.INPUT, event => {
            this._action && this._action(this._inputValue());
        });
        this._inputSupport = new ForeignObject(-width / 2 + margin, -height / 2 + margin, inputWidth, inputHeight);
        this._inputSupport.add(this._input);
        this._root.add(this._inputSupport);
    }

    _buildMagnifier(width, height) {
        let magnifierSize = ToolFilterCard.WIDTH_OFFSET;
        let margin = Math.round(magnifierSize/4);
        this._magnifier = new SvgRasterImage(
            "./images/icons/magnifier.svg", -magnifierSize/2, -magnifierSize/2, magnifierSize, magnifierSize );
        this._magnifierSupport = new Translation(width/2-margin-magnifierSize/2);
        this._magnifierSupport.add(this._magnifier);
        this._root.add(this._magnifierSupport);
        this._magnifierSupport.on(MouseEvents.MOUSE_DOWN, event=>{
            this._magnifier.matrix = Matrix.scale(0.9, 0.9, 0, 0);
        });
        this._magnifierSupport.on(MouseEvents.CLICK, event=>{
            this._action && this._action(this._inputValue());
        });
        this._magnifierSupport.on(MouseEvents.MOUSE_UP, event=>{
            this._magnifier.matrix = null;
        });
    }

    _buildCross(width, height) {
        let crossSize = ToolFilterCard.WIDTH_OFFSET;
        let margin = Math.round(crossSize/4);
        this._cross = new SvgRasterImage(
            "./images/icons/cross.svg", -crossSize/2, -crossSize/2, crossSize, crossSize );
        this._crossSupport = new Translation(width/2-margin*2-crossSize*3/2);
        this._crossSupport.add(this._cross);
        this._root.add(this._crossSupport);
        this._crossSupport.on(MouseEvents.MOUSE_DOWN, event=>{
            this._cross.matrix = Matrix.scale(0.9, 0.9, 0, 0);
        });
        this._crossSupport.on(MouseEvents.CLICK, event=>{
            this._input._node.value = "";
            this._action && this._action(this._inputValue());
        });
        this._crossSupport.on(MouseEvents.MOUSE_UP, event=>{
            this._cross.matrix = null;
        });
    }
}
ToolFilterCard.WIDTH_OFFSET = 20;

export class ToolKeywordsCard extends ToolCard {

    constructor(width, action) {
        super(width, 1);
        this._keywords = new List();
        this._content = new Translation();
        this._background = new Rect(-width/2, 0, width, 1).attrs({fill:Colors.LIGHTEST_GREY});
        this._content.add(this._background);
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

    _refresh() {
        this._content.clear();
        this._content.add(this._background);
        let current = null;
        this._height = ToolKeywordsCard.MARGIN;
        let x = -this._width / 2 + ToolKeywordsCard.MARGIN;
        let y = -ToolKeywordsCard.MARGIN;
        for (let keyword of this._keywords) {
            let pedestal = new Translation();
            let text = new Text(0, 0, keyword.label).attrs({
                text_anchor: TextAnchor.MIDDLE,
                alignement_baseline: AlignmentBaseline.MIDDLE,
                class: ToolKeywordsCard.KEYWORD_UNSELECTED_CLASS
            });
            pedestal.text = text;
            pedestal.keyword = keyword;
            pedestal.add(text);
            this._content.add(pedestal);
            let bbox = pedestal.bbox;
            if (y <= 0 || x + bbox.width > this._width / 2 - ToolKeywordsCard.MARGIN) {
                x = -this._width / 2 + ToolKeywordsCard.MARGIN;
                y += bbox.height + ToolKeywordsCard.MARGIN;
                this._height += bbox.height + ToolKeywordsCard.MARGIN;
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
        this._content.set(0, -this._height/2);
        this._background.y = 0;
        this._background.height = this._height;
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

    _notified(source, event) {
        if (source === Layers.instance && event === Layers.events.ACTIVATE) {
            this._requestRefresh();
        }
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

    _setWidth(width) {
        this._shownCells = null;
        super._setWidth(width);
        this._requestRefresh();
    }

    _setHeight(height) {
        this._shownCells = null;
        super._setHeight(height);
        this._requestRefresh();
    }

    _buildContent() {
        this._clipRect.attrs({x: -this.width / 2 + 5, y: -this.height / 2 + 5, width: this.width - 10, height: this.height - 10 });
        this._background.attrs({x: -this.width/2, y:-this.height/2, width:this.width, height:this.height} );
        if (this._cellsLayer) {
            this._cellsLayer.detach();
        }
        this._cellsLayer = new Group();
        this._content.add(this._cellsLayer);

        let cellsByLine = Math.floor(this.width/this._cellWidth);
        let cellWidth = this.width/cellsByLine;

        let startX = cellWidth / 2;
        let startY = this._cellHeight / 2;
        let index=0;
        for (let cell of this._shownCells) {
            if (this._accept(cell)) {
                if (index>=cellsByLine) {
                    index = 0;
                    startX = cellWidth / 2;
                    startY += this._cellHeight;
                }
                index++;
                cell._root.matrix = Matrix.translate(startX - this.width / 2, startY - this.height / 2);
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
        this._content.matrix = Matrix.translate(x, y);
        this._clipRect.matrix = Matrix.translate(0, -y);
    }

    addCell(cell) {
        this._cells.add(cell);
        cell.activate(this, this._cellWidth * 0.9, this._cellHeight * 0.8);
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

}
makeObservable(ToolGridPanelContent);
ToolGridPanelContent.SCROLL_WHEEL_STEP = 50;
ToolGridPanelContent.CELL_MARGIN = 20;

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
        if (svgElement._owner instanceof BoardItemBuilder) {
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

export class BoardItemBuilder extends ToolCell {

    constructor(proto, action) {
        super();
        this._proto = proto;
        this._support = new Group();
        this._root.add(this._support);
        this._action = action;
        Canvas.instance.addObserver(this);
    }

    get gx() {
        return this._root.globalMatrix.dx;
    }

    get gy() {
        return this._root.globalMatrix.dy;
    }

    _addMenuOption(menuOption) {
        if (!this._menuOptions) {
            this._menuOptions = new List();
        }
        this._menuOptions.add(menuOption);
        return this;
    }

    activate(owner, width, height) {
        super.activate(owner, width, height);
        this._makeItems();
        this._adjustSize();
        this._glass = new Rect(
            -width/2-BoardItemBuilder.MARGIN, -height/2-BoardItemBuilder.MARGIN,
            width+BoardItemBuilder.MARGIN*2, height+BoardItemBuilder.MARGIN*2).attrs({
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
        Selection.instance.unselectAll(onToolPanelContent(getPanelContent(this)));
        for (let element of this._currentItems) {
            Selection.instance.select(element);
        }
    }

    unselect() {
        for (let element of this._currentItems) {
            Selection.instance.unselect(element);
        }
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
            item._parent = this;
            this._support.add(item._root);
        }
        return this._currentItems;
    }

    add(element) {}

    detachChild(element) {
        this._support.remove(element._root);
        element._parent = null;
    }

    _adjustSize() {
        let bbox = l2pBoundingBox(this._currentItems);
        let sizeWidthFactor = this.width / bbox.width;
        let sizeHeightFactor = this.height / bbox.height;
        this._zoom = Math.min(sizeWidthFactor, sizeHeightFactor, 10);
        this._support.matrix = Matrix.scale(this._zoom, this._zoom, 0, 0).translate(-bbox.cx, -bbox.cy)
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
        element._parent = null;
    }

    get selectionMark() {
        if (!this._selectionMark) {
            this._selectionMark = defineShadow(`_s${this._id}_`, Colors.RED);
            this._selectionMark.feDropShadow.stdDeviation = [5/this._zoom, 5/this._zoom];
            Canvas.instance.addFilter(this._selectionMark);
        }
        return this._selectionMark;
        //return Selection.instance.selectFilter;
    }

}
BoardItemBuilder.MARGIN = 4;

export class FavoriteItemBuilder extends BoardItemBuilder {

    constructor(proto) {
        super(proto);
        this._addMenuOption({that:this, line:new TextMenuOption("Remove", ()=>{this.owner.removeCell(this);})});
    }

}
