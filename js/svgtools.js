'use strict';

import {Filter, FeDropShadow, P100, FilterUnits, FeIn} from "./svgbase.js"

export function defineShadow(id, color) {
    let shadowFilter = new Filter();
    shadowFilter.attrs({
        id:id,
        x: P100(-40), y:P100(-40), width:P100(180), height:P100(180),
        filterUnits:FilterUnits.OBJECTBOUNDINGBOX, primitiveUnits:FilterUnits.USERSPACEONUSE
    });
    let feDropShadow = new FeDropShadow().attrs({
        stdDeviation:[3, 3], in:FeIn.SOURCEGRAPHIC, dx:0, dy:0, flood_color:color, flood_opacity:1,
        x:P100(-50), y:P100(-50), width:P100(100), height:P100(100)
    });
    return shadowFilter.add(feDropShadow);
}

