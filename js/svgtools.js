'use strict';

import {
    Group, Rect, Line, Path, Filter, FeDropShadow, PC, FilterUnits, FeIn, M, l, Colors, Fill
} from "./graphics.js";
import {
    Matrix, angle
} from "./geometry.js";

export function defineShadow(id, color) {
    let shadowFilter = new Filter();
    shadowFilter.attrs({
        id:id,
        filterUnits:FilterUnits.OBJECTBOUNDINGBOX, primitiveUnits:FilterUnits.USERSPACEONUSE,
        x:PC(-20),
        y:PC(-20),
        width:PC(140),
        height:PC(140)
    });
    shadowFilter.feDropShadow = new FeDropShadow().attrs({
        stdDeviation:[3, 3], in:FeIn.SOURCEGRAPHIC, dx:0, dy:0, flood_color:color, flood_opacity:1,
    });
    return shadowFilter.add(shadowFilter.feDropShadow);
}

export class Arrow extends Group {

    constructor(x1, y1, x2, y2, [lhwidth, lhheight], [rhwidth, rhheight]) {
        super();
        this.setPosition(x1, y1, x2, y2, false);
        this.setLeftHeadGeometry(lhwidth, lhheight, false);
        this.setRightHeadGeometry(rhwidth, rhheight, true);
    }

    _build() {
        this.clear();
        let dx=this._x2-this._x1;
        let dy=this._y2-this._y1;
        let distance = Math.sqrt(dx*dx+dy*dy);
        let matrix = Matrix.translate((this._x1+this._x2)/2, (this._y1+this._y2)/2);
        if (dx || dy) {
            matrix = matrix.rotate(angle(dy, dx), 0, 0);
        }
        let line = new Line(-distance/2, 0, distance/2, 0);
        this.add(line);
        let leftHead = new Path(M(-distance/2+this._lhwidth, -this._lhheight/2),
            l(-this._lhwidth, this._lhheight/2), l(this._lhwidth, this._lhheight/2))
            .attrs({"stroke-dasharray":"none", fill:Fill.NONE});
        this.add(leftHead);
        let rightHead = new Path(M(distance/2-this._rhwidth, -this._rhheight/2),
            l(this._rhwidth, this._rhheight/2), l(-this._rhwidth, this._rhheight/2))
            .attrs({"stroke-dasharray":"none", fill:Fill.NONE});
        this.add(rightHead);
        this.matrix = matrix;
    }

    setPosition(x1, y1, x2, y2, redraw=true) {
        this._x1 = x1;
        this._y1 = y1;
        this._x2 = x2;
        this._y2 = y2;
        redraw && this._build();
        return this;
    }

    setLeftHeadGeometry(hwidth, hheight, redraw=true) {
        this._lhwidth = hwidth;
        this._lhheight = hheight;
        redraw && this._build();
        return this;
    }

    setRightHeadGeometry(hwidth, hheight, redraw=true) {
        this._rhwidth = hwidth;
        this._rhheight = hheight;
        redraw && this._build();
        return this;
    }
}