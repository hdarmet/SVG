'use strict';

import {
    Filter, FeDropShadow, PC, FilterUnits, FeIn
} from "./graphics.js";

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

