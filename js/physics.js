'use strict';

import {
    win, List
} from "./svgbase.js";

export class Physic {

    constructor(host, ...args) {
        this._host = host;
        this._init(...args);
        this._triggered = false;
    }

    _init(...args) {}

    _trigger() {
        if (!this._triggered) {
            this._triggered = true;
            win.setTimeout(()=>{
                this.refresh();
            }, 0);
        }
    }

    reset() {
        this._trigger();
        this._reset();
    }

    hover(elements) {
        this._hover(elements);
        this._refresh();
    }

    refresh() {
        try {
            this._refresh();
        }
        finally {
            this._triggered = false;
        }
    }

    add(element) {
        this._trigger();
        this._add(element);
    }

    remove(element) {
        this._trigger();
        this._remove(element);
    }

    _reset() {}
    _refresh() {}
    _hover(elements) {}
    _add() {}
    _remove() {}
}

export function makePositionningPhysic(superClass) {

    superClass.prototype._init = function(positionsFct, ...args) {
        this._positionsFct = positionsFct;
        this._elements = new Set();
    };

    superClass.prototype._refresh = function() {
        for (let element of this._elements) {
            this._refreshElement(element);
        }
        if (this._hoveredElements) {
            for (let element of this._hoveredElements) {
                this._refreshElement(element);
            }
            this._hoveredElements.clear();
        }
        this._elements.clear();
    };

    superClass.prototype._reset = function() {
        this._elements = new Set(this._host.children);
    };

    superClass.prototype._hover = function(elements) {
        this._hoveredElements = new List(...elements);
    };

    superClass.prototype._add = function(element) {
        this._elements.add(element);
    };

    superClass.prototype._refreshElement = function(element) {
        let lx = element.lx;
        let ly = element.ly;
        let distance = Infinity;
        let position = {x:lx, y:ly};
        let positions = this._positionsFct.call(this._host, element);
        for (let _position of positions) {
            let _distance = (_position.x-lx)*(_position.x-lx)+(_position.y-ly)*(_position.y-ly);
            if (_distance<distance) {
                distance = _distance;
                position = _position;
            }
        }
        element.move(position.x, position.y);
    };

    return superClass;
}

export class PositionningPhysic extends Physic {
    constructor(...args) {
        super(...args);
    }

    clone(duplicata) {
        let _copy = new PositionningPhysic(duplicata.get(this._host), this._positionsFct);
        _copy._trigger();
        return _copy;
    }
}
makePositionningPhysic(PositionningPhysic);

export function addPhysicToContainer(superClass, physicCreator) {

    let initContent = superClass.prototype._initContent;
    superClass.prototype._initContent = function() {
        let result = initContent.call(this);
        this._initPhysic();
        return result;
    };

    superClass.prototype._initPhysic = function() {
        this._physic = physicCreator.call(this);
        return this;
    };

    let add = superClass.prototype._add;
    superClass.prototype._add = function(element) {
        add.call(this, element);
        this._physic.add(element);
    };

    let insert = superClass.prototype._insert;
    superClass.prototype._insert = function(previous, element) {
        insert.call(this, previous, element);
        this._physic.add(element);
    };

    let replace = superClass.prototype._replace;
    superClass.prototype._replace = function(previous, element) {
        replace.call(this, previous, element);
        this._physic.add(element);
        this._physic.remove(element);
    };

    let remove = superClass.prototype._remove;
    superClass.prototype._remove = function(element) {
        remove.call(this, element);
        this._physic.remove(element);
    };

    let hover = superClass.prototype.hover;
    superClass.prototype.hover = function(elements) {
        hover && hover.call(this, elements);
        this._physic.hover(elements);
    };

    let superMemento = superClass.prototype._memento;
    if (superMemento) {
        let recover = superClass.prototype._recover;
        superClass.prototype._recover = function (memento) {
            if (recover) recover.call(this, memento);
            this._physic.reset();
        }
    }
}

export function makePositionningContainer(superClass, positionsFct) {

    addPhysicToContainer(superClass, function() {
        return new PositionningPhysic(this, positionsFct);
    });

    return superClass;
}