'use strict';

import {
    Group, Rect, Line, Path, Filter, FeDropShadow, PC, FilterUnits, FeIn, M, l, Colors, Fill, Text, Tspan, doc, SVG_NS,
    AlignmentBaseline, TextAnchor, Translation
} from "./graphics.js";
import {
    Matrix, angle
} from "./geometry.js";
import {
    List
} from "./collections.js";

let ghost = doc.createElementNS(SVG_NS, "svg");
ghost.setAttribute("visibility", "hidden");
ghost.setAttribute("id", "ghost");
ghost.setAttribute("width", "1");
ghost.setAttribute("height", "1");
ghost.setAttribute("style", "position:fixed;top:0;left:0;");
doc.body.appendChild(ghost);

let rect = new Rect(10, 10, 200, 200);
ghost.appendChild(rect._node);

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

export class MultiLineText extends Group {

    constructor(x, y, ...lines) {
        super();
        ghost.appendChild(this._node);
        this._textSupport = new Translation();
        this.add(this._textSupport);
        let allLines = new List();
        for (let line of lines) {
            allLines.push(...line.split("\n"));
        }
        let line = allLines.shift();
        this._text = new Text(0, 0, line).attrs({text_anchor:TextAnchor.MIDDLE});
        this._textSupport.add(this._text);
        let bbox = this._text.bbox;
        let textHeight = bbox.height;
        for (let line of allLines) {
            let tspan = new Tspan(0, 0, line).attrs({x:0, dy:bbox.height});
            this._text.add(tspan);
            bbox = tspan.bbox;
        }
        bbox = super.bbox;
        this._textSupport.set(0, -bbox.height/2+textHeight*.66);
        this._width = bbox.width;
        this._height = bbox.height;
//        this.add(new Rect(-this._width/2, -this._height/2, this._width, this._height).attrs({fill:Colors.BLUE, opacity:0.2}))
    }

    get bbox() {
        let bbox = super.bbox;
        if (!bbox.width) bbox.width = this._width;
        if (!bbox.height) bbox.height = this._height;
        return bbox;
    }

    get width() {
        return this._width;
    }

    get height() {
        return this._height;
    }
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