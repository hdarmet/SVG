'use strict';

import {
    assert, defineGetProperty, defineMethod, proposeMethod
} from "./misc.js";
import {
    List, BoxLocator
} from "./collections.js";
import {
    Matrix2D, Point2D
} from "./geometry.js";

console.log("Svgbase loaded");

export let SVG_NS = "http://www.w3.org/2000/svg";
export let XLINK_NS = "http://www.w3.org/1999/xlink";

export let dom = {
    clientWidth(node) {
        return node.clientWidth;
    },
    clientHeight(node) {
        return node.clientHeight;
    },
    appendChild(node, child) {
        node.appendChild(child);
    },
    insertBefore(node, child, previous) {
        node.insertBefore(child, previous);
    },
    replaceChild(node, child, previous) {
        node.replaceChild(child, previous);
    },
    removeChild(node, child) {
        node.removeChild(child);
    },
    getBoundingClientRect(node) {
        return node.getBoundingClientRect();
    },
    getCTM(node) {
        return node.getCTM();
    },
    addEventListener(node, event, callback) {
        if (!callback.envelope) {
            callback.envelope = function (event) {
                if (event.type !== AnyEvent) {
                    let anyEvent = new Event(AnyEvent);
                    anyEvent.event = event;
                    doc.dispatchEvent(anyEvent);
                }
                callback.call(this, event);
            };
        }
        return node.addEventListener(event, callback.envelope);
    },
    removeEventListener(node, event, callback) {
        return node.removeEventListener(event, callback.envelope);
    }
};

export let doc = {
    createElement(type) {
        return document.createElement(type);
    },
    createElementNS(ns, type) {
        return document.createElementNS(ns, type);
    },
    createTextNode(data) {
        return document.createTextNode(data);
    },
    createDocumentFragment() {
        return document.createDocumentFragment();
    },
    addEventListener(event, callback) {
        if (!callback.envelope) {
            callback.envelope = function (event) {
                if (event.type !== AnyEvent) {
                    let anyEvent = new Event(AnyEvent);
                    anyEvent.event = event;
                    doc.dispatchEvent(anyEvent);
                }
                callback.call(this, event);
            };
        }
        return dom.addEventListener(document, event, callback.envelope);
    },
    removeEventListener(event, callback) {
        return dom.removeEventListener(document, event, callback.envelope);
    },
    querySelector(selectors) {
        return document.querySelector(selectors);
    },
    get documentElement() {
        return document.documentElement;
    },
    get body() {
        return document.body;
    },
    elementFromPoint(x, y) {
        return document.elementFromPoint(x, y);
    },
    elementsFromPoint(x, y) {
        return document.elementsFromPoint(x, y);
    },
    dispatchEvent(event) {
        document.dispatchEvent(event);
    }
};

export let win = {
    get pageXOffset() {
        return window.pageXOffset;
    },
    get pageYOffset() {
        return window.pageYOffset;
    },
    setInterval(callback, delay, ...args) {
        return window.setInterval(callback, delay, ...args);
    },
    setTimeout(callback, delay, ...args) {
        return window.setTimeout(callback, delay, ...args);
    },
    addEventListener(event, callback) {
        return dom.addEventListener(window, event, callback);
    },
    removeEventListener(event, callback) {
        return dom.removeEventListener(window, event, callback);
    }
};

let deferred = new List();
export function defer(action) {
    if (!deferred.length) {
        win.setTimeout(function() {
            do {
                let actions = new List(...deferred);
                deferred.clear();
                for (let action of actions) {
                    action();
                }
            } while (deferred.length);
        }, 0);
    }
    deferred.add(action);
}

export function localOffset(svgNode) {
    let box = dom.getBoundingClientRect(svgNode._node);
    let body = doc.body;
    let html = doc.documentElement;
    let left = box.left + (win.pageXOffset || html.scrollLeft || body.scrollLeft);
    let top = box.top + (win.pageYOffset || html.scrollTop || body.scrollTop);
    return {
        x: -left,
        y: -top
    };
}

export function globalOffset(svgNode) {
    let box = dom.getBoundingClientRect(svgNode._node);
    return {
        x: box.left,
        y: box.top
    };
}

export function computeMatrix(from, to) {
    if (!from) console.log("from null !");
    if (!to) console.log("to null !");
    let matrix = to.matrix;
    let parent = to.parent;
    while (parent && parent!==from) {
        let pmatrix = parent._attrs.matrix;
        if (pmatrix) {
            matrix._multLeft(pmatrix);
        }
        parent = parent.parent;
    }
    if (!parent) console.log("from not included in to !");
    return parent ? matrix : null;
}

export function computePosition(source, target, x = 0, y = 0) {
    let sourceMatrix = source ? source.globalMatrix : null;
    let targetMatrix = target.globalMatrix;
    let finalMatrix = sourceMatrix
        ? sourceMatrix.multLeft(targetMatrix.invert())
        : targetMatrix.invert();
    let fx = finalMatrix.x(x, y);
    let fy = finalMatrix.y(x, y);
    return { x: fx, y: fy };
}

export function computeAngle(source, target) {
    let sourceMatrix = source ? source.globalMatrix : null;
    let targetMatrix = target.globalMatrix;
    let finalMatrix = sourceMatrix
        ? sourceMatrix.multLeft(targetMatrix.invert())
        : targetMatrix.invert();
    return finalMatrix.angle;
}
export let AnyEvent = "event";

/**
 * Returns the "position string" of an element. A position string is a string of numbers, each one gives the index of
 * the element or one of its ancestors in its parent children list. Example: [3, 4, 2] means that the element is the 3rd
 * child of its parent p1 which is the fourth child of its own paren p2 and p2 is the second child of the root svg.
 * @param element which string is computed
 * @returns {Array}
 * @private
 */
function _getOrderString(element) {
    let orderString = [];
    let parent = element.parent;
    while (parent) {
        orderString.push(parent._children.indexOf(element));
        element = parent;
        parent = parent.parent;
    }
    return orderString;
}

/**
 * Compare two "position strings" (see above). A string position is "bigger" than another, if, STARTING from the root
 * (ie. the END of the string), a position number is bigger than its counterpart. Exemple: [1, 2, 3] is bigger than
 * [3, 1, 3], because 3 = 3 (root position), and 2 > 1 (intermediate position).
 * @param string1
 * @param string2
 * @returns {number} -1 if string1 < string 2, 1 if string2 > string 1, 0 otherwise.
 * @private
 */
function _compareOrderStrings(string1, string2) {
    let indexS1 = string1.length-1;
    let indexS2 = string2.length-1;
    while(indexS1>=0 && indexS2>=0) {
        let result = string1[indexS1]-string2[indexS2];
        if (result) return result;
        indexS1--; indexS2--;
    }
    return indexS1===-1 ? indexS2===-1 ? 0 : -1 : 1;
}

/**
 * Orders a list of elements according to their "position orders" (see above). The last element in the resultiong list
 * is the "highest", which means it is drawn above the others.
 * @param elements
 * @returns {Array}
 */
export function getDOMOrder(...elements) {

    let strings = [];
    for (let element of elements) {
        let string = _getOrderString(element);
        string._element = element;
        strings.push(string);
    }
    strings.sort(_compareOrderStrings);
    let result = [];
    for (let string of strings) {
        result.push(string._element);
    }
    return result;
}

export function getDOMPosition(element, elements) {
    let start = 0;
    let end = elements.length - 1;
    let string = _getOrderString(element);

    while (start <= end) {
        let half = Math.floor((start + end) / 2);
        let cmp = _compareOrderStrings(string, _getOrderString(elements[half]));
        if (cmp === 0) return half;
        else if (cmp > 0) start = half + 1;
        else end = half - 1;
    }
    return start;
}

export const MouseEvents = {
    CLICK : "click",
    CONTEXT_MENU : "contextmenu",
    DOUBLE_CLICK : "dblclick",
    MOUSE_DOWN : "mousedown",
    MOUSE_ENTER : "mouseenter",
    MOUSE_LEAVE : "mouseleave",
    MOUSE_MOVE : "mousemove",
    MOUSE_OUT : "mouseout",
    MOUSE_OVER : "mouseover",
    MOUSE_UP : "mouseup",
    WHEEL : "wheel"
};

export const KeyboardEvents = {
    KEY_DOWN : "keydown",
    KEY_UP : "keyup",
    INPUT : "input"
};

export const Buttons = {
    LEFT_BUTTON : 0,
    WHEEL_BUTTON : 1,
    RIGHT_BUTTON : 2,
    FOURTH_BUTTON : 3,
    FIFTH_BUTTON : 4
};

export let SVGEvents = {
    SVG_IN : "svg-in",
    SVG_OUT : "svg-out",
    SVGIn : new Event("svg-in"),
    SVGOut : new Event("svg-out")
};

export const Attrs = {
    CLASS : "class",
    STYLE : "style",
    X : "x",
    Y : "y",
    Z : "z",
    X1 : "x1",
    Y1 : "y1",
    X2 : "x2",
    Y2 : "y2",
    RX : "rx",
    RY : "ry",
    CX : "cx",
    CY : "cy",
    FX : "fx",
    FY : "fy",
    DX : "dx",
    DY : "dy",
    R : "r",
    D : "d",
    WIDTH : "width",
    HEIGHT : "height",
    HREF : "href",
    FILTER : "filter",
    ID : "id",
    TRANSFORM : "transform",
    OPACITY : "opacity",
    VISIBILITY : "visibility",
    STROKE : "stroke",
    STROKE_DASHARRAY : "stroke-dasharray",
    STROKE_DASHOFFSET : "stroke-dashoffset",
    STROKE_LINECAP : "stroke-linecap",
    STROKE_LINEJOIN : "stroke-linejoin",
    STROKE_MITERLIMIT : "stroke-miterlimit",
    STROKE_OPACITY : "stroke-opacity",
    STROKE_WIDTH : "stroke-width",
    TEXT_ANCHOR : "text-anchor",
    ALIGNMENT_BASELINE : "alignment-baseline",
    TEXT : "text",
    FONT_FAMILY : "font-family",
    FONT_SIZE : "font-size",
    FONT_STYLE : "font-style",
    FONT_VARIANT : "font-variant",
    FONT_WEIGHT : "font-weight",
    FONT_SIZE_ADJUST : "font-size-adjust",
    FONT_STRETCH : "font-stretch",
    FILL : "fill",
    FILL_OPACITY : "fill-opacity",
    CLIP_PATH : "clip-path",
    MASK : "mask",
    FILTERRES : "filterRes",
    FILTERUNITS : "filterUnits",
    PRIMITIVEUNITS : "primitiveUnits",
    COLOR_INTERPOLATION_FILTER: "color-interpolation-filters",
    STDDEVIATION : "stdDeviation",
    IN : "in",
    EDGEMODE : "edgeMode",
    FLOOD_COLOR : "flood-color",
    FLOOD_OPACITY : "flood-opacity",
    RESULT : "result",
    RADIUS : "radius",
    IN2 : "in2",
    SCALE : "scale",
    MODE : "mode",
    TYPE : "type",
    VALUES : "values",
    XCHANNELSELECTOR : "xChannelSelector",
    YCHANNELSELECTOR : "YChannelSelector",
    ORDER : "order",
    KERNELMATRIX : "kernelMatrix",
    DIVISOR : "divisor",
    BIAS : "bias",
    TARGETX : "targetX",
    TARGETY : "targetY",
    PRESERVEALPHA : "preserveAlpha",
    ATTRIBUTENAME : "attributeName",
    ATTRIBUTETYPE : "attributeType",
    FROM : "from",
    TO : "to",
    DUR : "dur",
    REPEATCOUNT : "repeatCount",
    BEGIN : "begin",
    END : "end",
    MIN : "min",
    MAX : "max",
    BY : "by",
    RESTART : "restart",
    REPEATDUR : "repeatDur",
    KEYTIMES : "keyTimes",
    KEYSPLINES : "keySplines",
    KEYFRAMES : "keyFrames",
    CALCMODE : "calcMode",
    ADDITIVE : "additive",
    ACCUMULATE : "accumulate",
    MOTION : "motion",
    PATH : "path",
    MPATH : "mpath",
    ROTATE : "rotate",
    TABLEVALUES : "tableValues",
    SLOPE : "slope",
    INTERCEPT : "intercept",
    AMPLITUDE : "amplitude",
    EXPONENT : "exponent",
    OFFSET : "offset",
    GRADIENTUNIT : "gradientUnit",
    SPREADMETHOD : "spreadMethod",
    GRADIENTTRANSFORM : "gradientTransform",
    STOP_COLOR : "stop-color",
    STOP_OPACITY : "stop-opacity",
    SURFACESCALE : "surfaceScale",
    LIGHTING_COLOR : "lighting-color",
    SPECULARCONSTANT : "specularConstant",
    SPECULAREXPONENT : "specularExponent",
    DIFFUSECONSTANT : "diffuseConstant",
    AZIMUTH : "azimuth",
    ELEVATION : "elevation",
    POINTSATX : "pointsAtX",
    POINTSATY : "pointsAtY",
    POINTSATZ : "pointsAtZ",
    LIMITINGCONEANGLE : "limitingOneAngle",
    BASEFREQUENCY : "baseFrequency",
    NUMOCTAVES : "numOctaves",
    SEED : "seed",
    STITCHTILES : "stitchTiles",
    PRESERVEASPECTRATIO : "preserveAspectRatio",
    CROSSORIGIN : "crossOrigin",
    OPERATOR : "operator"
};
Attrs.STROKE_PROPERTIES = {
    stroke:Attrs.STROKE,
    stroke_dasharray:Attrs.STROKE_DASHARRAY,
    stroke_dashoffset:Attrs.STROKE_DASHOFFSET,
    stroke_linecap:Attrs.STROKE_LINECAP,
    stroke_miterlimit:Attrs.STROKE_MITERLIMIT,
    stroke_width:Attrs.STROKE_MITERLIMIT
};
Attrs.FONT_PROPERTIES = {
    fill:Attrs.FILL,
    font_family:Attrs.FONT_FAMILY,
    font_size:Attrs.FONT_SIZE,
    font_style:Attrs.FONT_STYLE,
    font_variant:Attrs.FONT_VARIANT,
    font_weight:Attrs.FONT_WEIGHT,
    font_size_adjust:Attrs.FONT_SIZE_ADJUST,
    font_stretch:Attrs.FONT_STRETCH
};

export const Fill = {
    NONE : "none"
};

let Cache = {
    rasterImages : new Map(),
    rasterImageLoaders : new Map(),
    svgImages : new Map(),
    svgImageLoaders : new Map()
};

export function loadRasterImage(url, callback) {
    if (Cache.rasterImages.get(url)) {
        // forced timeout so that `callback` is always called asynchronously
        // even if the image is already in cache
        setTimeout(() => callback(Cache.rasterImages.get(url)), 0);
    } else {
        if (!Cache.rasterImageLoaders.get(url)) {
            Cache.rasterImageLoaders.set(url, new List());
            let img = new Image();
            img.onload = function() {
                Cache.rasterImages.set(url, img);
                for (let callback of Cache.rasterImageLoaders.get(url)) {
                    callback(img);
                }
            };
            img.src = url;
        }
        Cache.rasterImageLoaders.get(url).add(callback);
    }
}

win.httpRequest = function(url, postData, callback) {
    let req = new XMLHttpRequest();
    if (req) {
        if (typeof(postData)==="object") {
            let pd = [];
            for (let key in postData) {
                if (postData.hasOwnProperty(key)) {
                    pd.push(encodeURIComponent(key)+"="+encodeURIComponent(postData[key]));
                }
            }
            postData = pd.join("&");
        }
        req.open(postData ? "POST" : "GET", url, true);
        if (postData) {
            req.setRequestHeader("X-Requested-With", "XMLHttpRequest");
            req.setRequestHeader(
                "Content-type",
                "application/x-www-form-urlencoded"
            );
        }
        req.onreadystatechange = function() {
            if (req.readyState !== 4) return;
            callback(req);
        };
        if (req.readyState === 4) {
            return req;
        }
        req.send(postData);
        return req;
    }
};

export function svgParse(text) {
    let full = true;
    let div = doc.createElement("div");
    if (!text.match(/^\s*<\s*svg(?:\s|>)/)) {
        text = "<svg>" + text + "</svg>";
        full = false;
    }
    div.innerHTML = text;
    let svg = div.getElementsByTagName("svg")[0];
    if (svg) {
        if (full) {
            return svg;
        } else {
            let fragment = doc.createDocumentFragment();
            while (svg.firstChild) {
                matrixOp++;
                dom.appendChild(fragment, svg.firstChild);
            }
            return fragment;
        }
    }
    return doc.createDocumentFragment();
}

export function loadSvgImage(url, callback) {
    function load(url, callback) {
        win.httpRequest(url, null, function(req) {
            if (req.status === 200) {
                var fragment = svgParse(req.responseText);
                callback(fragment);
            }
        });
    }

    if (Cache.svgImages.get(url)) {
        // forced timeout so that `callback` is always called asynchronously
        // even if the image is already in cache
        setTimeout(() => callback(Cache.svgImages.get(url)), 0);
    } else {
        if (!Cache.svgImageLoaders.get(url)) {
            Cache.svgImageLoaders.set(url, new List());
            load(url, function(fragment) {
                Cache.svgImages.set(url, fragment);
                for (let callback of Cache.svgImageLoaders.get(url)) {
                    callback(fragment);
                }
            });
        }
        Cache.svgImageLoaders.get(url).add(callback);
    }
}

export function rasterizeSvg(img, callback) {

    function getSize(node) {
        let width = node.getAttribute(Attrs.WIDTH);
        if (width) {
            width = parseInt(width);
            let height = node.getAttribute(Attrs.HEIGHT);
            if (height) return {width, height:parseInt(height)};
        }
        let viewBox = node.getAttribute("viewBox");
        if (viewBox) {
            viewBox = viewBox.split(' ');
            return {width:parseInt(viewBox[2]), height:parseInt(viewBox[3])};
        }
        console.assert(false);
    }

    let node =
        img instanceof DocumentFragment
            ? img.querySelector("svg")
            : img;
    let svgText = node.outerHTML;
    if (!svgText.match(/xmlns=\"/mi)){
        svgText = svgText.replace ('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ') ;
    }
    let svg = new Blob([svgText], {type: "image/svg+xml;charset=utf-8"});
    let url = URL.createObjectURL(svg);
    // create a canvas element to pass through
    let canvas = doc.createElement("canvas");
    let {width, height} = getSize(node);
    canvas.width = width;
    canvas.height = height;
    let ctx = canvas.getContext("2d");
    // create a new image to hold it the converted type
    let rasterImage = new Image();
    // load the image
    rasterImage.src = url;
    // draw it to the canvas
    rasterImage.onload = function() {
        ctx.drawImage(this, 0, 0);
        let raster = doc.createElementNS(SVG_NS,'image');
        raster.setAttribute("height",""+width);
        raster.setAttribute("width", ""+height);
        raster.setAttributeNS(XLINK_NS, "href", canvas.toDataURL());
        raster.setAttribute("x","0");
        raster.setAttribute("y","0");
        callback(raster);
    }
}

export function loadRasterSvgImage(url, callback) {
    if (Cache.rasterImages.get(url)) {
        // forced timeout so that `loaded` is always called asynchronously
        // even if the image is in cache
        setTimeout(() => callback(Cache.rasterImages.get(url)), 0);
    } else {
        if (!Cache.rasterImageLoaders.get(url)) {
            Cache.rasterImageLoaders.set(url, new List());
            loadSvgImage(url, function(img) {
                rasterizeSvg(img, raster=> {
                    Cache.rasterImages.set(url, raster);
                    for (let callback of Cache.rasterImageLoaders.get(url)) {
                        callback(raster);
                    }
                });
            });
        }
        Cache.rasterImageLoaders.get(url).add(callback);
    }
}

export class Dimension {
    constructor(value, unit) {
        this.value = value;
        this.unit = unit;
    }

    toString() {
        return ""+this.value+this.unit;
    }
}

export function EM(value) {
    return new Dimension(value, "em");
}
export function PX(value) {
    return new Dimension(value, "px");
}
export function P100(value) {
    return new Dimension(value, "%");
}
export function EX(value) {
    return new Dimension(value, "ex");
}
export function CM(value) {
    return new Dimension(value, "cm");
}
export function MM(value) {
    return new Dimension(value, "mm");
}
export function PT(value) {
    return new Dimension(value, "pt");
}
export function IN(value) {
    return new Dimension(value, "in");
}
export function PC(value) {
    return new Dimension(value, "pc");
}

function defineProperty(clazz, name, get, set) {
    let attrName = name.replace("-", "_");
    clazz[attrName.toUpperCase()] = name;
    Object.defineProperty(clazz.prototype, attrName, {
        get, set
    });
}

function defineAnyProperty(clazz, name) {
    defineProperty(clazz, name,
        function () {
            return this.attr(name);
        },
        function (value) {
            if (value === undefined) {
                throw TypeError("Attribute value must be defined");
            }
            value!==null ? this.attr(name, ""+value): this.attr(name, null);
        }
    );
}

function defineGeometryProperty(clazz, name) {
    defineProperty(clazz, name,
        function () {
            let value = this.attr(name);
            return value===undefined ? 0 : value;
        },
        function (value) {
            if (value === undefined) {
                throw TypeError("Attribute value must be defined");
            }
            value!==null ? this.attr(name, ""+value, value): this.attr(name, null);
            this.geometryChanged();
        }
    );
}

function defineDimensionProperty(clazz, name) {
    defineProperty(clazz, name,
        function () {
            let value = this.attr(name);
            return value===undefined ? 0 : value;
        },
        function (value) {
            if (value === undefined) {
                throw TypeError("Attribute value must be defined");
            }
            value!==null ? this.attr(name, ""+value, value): this.attr(name, null);
        }
    );
}

function defineStringProperty(clazz, name) {
    defineProperty(clazz, name,
        function () {
            let value = this.attr(name);
            return value === undefined ? "" : value;
        },
        function (value) {
            if (value === undefined) {
                throw TypeError("Attribute value must be defined");
            }
            value!==null ? this.attr(name, value): this.attr(name, null);
        }
    );
}

function defineAttributeProperty(clazz, name) {
    defineProperty(clazz, name,
        function () {
            let value = this.attr(name);
            return value===undefined ? "" : value;
        },
        function (value) {
            if (value === undefined) {
                throw TypeError("Attribute value must be defined");
            }
            value!==null ? this.attr(name, value.replace("_", "-")): this.attr(name, null);
        }
    );
}

function defineFloatProperty(clazz, name) {
    defineProperty(clazz, name,
        function () {
            let value = this.attr(name);
            return value===undefined ? 0 : parseFloat(value);
        },
        function (value) {
            if (value === undefined) {
                throw TypeError("Attribute value must be defined");
            }
            value!==null ? this.attr(name, ""+value, value): this.attr(name, null);
        }
    );
}

function defineIntegerProperty(clazz, name) {
    defineProperty(clazz, name,
        function () {
            let value = this.attr(name);
            return value===undefined ? 0 : parseInt(value);
        },
        function (value) {
            if (value === undefined) {
                throw TypeError("Attribute value must be defined");
            }
            value!==null ? this.attr(name, ""+value): this.attr(name, null);
        }
    );
}

function defineBooleanProperty(clazz, name) {
    defineProperty(clazz, name,
        function () {
            let value = this.attr(name);
            return value===undefined ? false : value==="true";
        },
        function (value) {
            if (value === undefined) {
                throw TypeError("Attribute value must be defined");
            }
            value!==null ? this.attr(name, ""+value, value): this.attr(name, null);
        }
    );
}

function defineElementProperty(clazz, name, pattern="#ELEMENT") {
    defineProperty(clazz, name,
        function () {
            let value = this.attr(name);
            return value===undefined ? null : value;
        },
        function (element) {
            if (element === undefined) {
                throw TypeError("Attribute value must be defined");
            }
            element!==null ? this.attr(name, pattern.replace("ELEMENT", element.id), element) : this.attr(name, null);
        }
    );
}

function defineFloatListProperty(clazz, name, separator=" ") {
    defineProperty(clazz, name,
        function () {
            let value = this.attr(name);
            return value===undefined ? null : value;
        },
        function (numbers) {
            if (numbers === undefined) {
                throw TypeError("Attribute value must be defined");
            }
            if (numbers!==null) {
                let list = numbers.join(separator);
                this.attr(name, list, numbers);
            }
            else this.attr(name, null);
        }
    );
}

function defineDimensionListProperty(clazz, name, separator) {
    defineProperty(clazz, name,
        function () {
            let value = this.attr(name);
            return value===undefined ? 0 : value;
        },
        function (value) {
            if (value === undefined) {
                throw TypeError("Attribute value must be defined");
            }
            if (value!==null) {
                let list = value.join(separator);
                this.attr(name, list, value);
            }
            else this.attr(name, null);
        }
    );
}

function defineStringListProperty(clazz, name, separator=" ") {
    defineProperty(clazz, name,
        function () {
            let value = this.attr(name);
            return value===undefined ? null : value;
        },
        function (numbers) {
            if (numbers === undefined) {
                throw TypeError("Attribute value must be defined");
            }
            if (numbers!==null) {
                let list = numbers.join(separator);
                this.attr(name, list, numbers);
            }
            else this.attr(name, null);
        }
    );
}

function defineListOfFloatListProperty(clazz, name, separator="; ", separator2=" ") {
    defineProperty(clazz, name,
        function () {
            let value = this.attr(name);
            return value===undefined ? null : value;
        },
        function (numbersArray) {
            if (numbersArray === undefined) {
                throw TypeError("Attribute value must be defined");
            }
            if (numbersArray!==null) {
                let list = numbersArray.map(numbers => numbers.join(separator2)).join(separator);
                this.attr(name, list, numbersArray);
            }
            else this.attr(name, null);
        }
    );
}

function defineClockProperty(clazz, name) {
    defineProperty(clazz, name,
        function () {
            return this.attr(name);
        },
        function (value) {
            if (value === undefined) {
                throw TypeError("Attribute value must be defined");
            }
            if (value!==null) {
                if (typeof(value) === "number") {
                    this.attr(name, "" + value + "ms", value);
                }
                else {
                    this.attr(name, value);
                }
            }
            else this.attr(name, null);
        }
    );
}

function defineStandardGeometryProperties(clazz) {
    defineGeometryProperty(clazz, Attrs.WIDTH);
    defineGeometryProperty(clazz, Attrs.HEIGHT);
    defineGeometryProperty(clazz, Attrs.X);
    defineGeometryProperty(clazz, Attrs.Y);
}

function defineXYWidthHeightProperties(clazz) {
    defineDimensionProperty(clazz, Attrs.WIDTH);
    defineDimensionProperty(clazz, Attrs.HEIGHT);
    defineDimensionProperty(clazz, Attrs.X);
    defineDimensionProperty(clazz, Attrs.Y);
}

export function definePropertiesSet(prefix, properties) {
    let result = {};
    for (let property in properties) {
        result[prefix+"_"+property] = properties[property];
    }
    return result;
}

export function collectProperties(specs, properties) {
    let attrs = {};
    for (let property in properties) {
        let value = specs[property];
        if (value !== undefined) {
            attrs[properties[property]] = value;
        }
    }
    return attrs;
}

export function filterProperties(specs, properties) {
    let attrs = {};
    for (let property in properties) {
        let value = specs[property];
        if (value !== undefined) {
            attrs[property] = value;
        }
    }
    return attrs;
}

export const Visibility = {
    VISIBLE : "visible",
    HIDDEN : "hidden",
    COLLAPSE : "collapse"
};

let ref = 0;

export class DOMElement {

    constructor(type) {
        this.node(type);
        this._ref = ref++;
        this._attrs = {};
    }

    get ref() {
        return this._parent ? ""+this._ref+"-"+this._parent.ref : ""+this._ref;
    }

    clone(duplicata = new Map()) {
        let copy = duplicata.get(this);
        if (copy) return copy;
        copy = this._clone();
        duplicata.set(this, copy);
        // IMPORTANT: cloning == false (default) means deep cloning !
        if (!this.cloning) {
            this._cloneContent(copy, duplicata);
        }
        if (this.cloning!==undefined) {
            copy.cloning = this.cloning;
        }
        if (this.eventCloning) {
            copy.eventCloning = true;
            this._cloneEvents(copy, duplicata);
        }
        return copy;
    }

    _clone() {
        let copy = {};
        copy.__proto__ = this.__proto__;
        copy.node(this._node.nodeName);
        copy._attrs = {};
        this._cloneAttrs(copy);
        return copy;
    }

    _cloneAttrs(copy) {
        copy.attrs(this._attrs);
        return this;
    }

    _cloneContent(copy, duplicata) {
        if (this._children) {
            for (let child of this._children) {
                copy.add(child.clone(duplicata));
            }
        }
    }

    _cloneEvents(copy, duplicata) {
        if (this._dnd) {
            copy.onDrag(this._dnd.dragStart, this._dnd.dragMove, this._dnd.dragDrop);
        }
        if (this._events) {
            for (let event of this._events.keys()) {
                for (let action of this._events.get(event)) {
                    copy.on(event, action);
                }
            }
        }
        return copy;
    }

    attr(name, nodeValue, value=nodeValue) {
        if (value && value.isNaN) {
            throw new TypeError("Attribute value cannot be NaN.");
        }
        if (value!==undefined) {
            if (value===null) {
                delete this._attrs[name];
                this._node.removeAttribute(name);
            }
            else {
                this._attrs[name] = value;
                this._node.setAttribute(name, nodeValue);
            }
            return this;
        }
        else {
            let attr = this._attrs[name];
            if (attr===undefined) {
                attr = this._node.getAttribute(name);
                if (attr !== "null") {
                    this._attrs[name] = attr;
                }
                else return; // undefined !
            }
            return attr;
        }
    }

    attrs(values) {
        function getPropertyDescriptor(proto, name) {
            let desc = Object.getOwnPropertyDescriptor(proto, name);
            return desc ? desc : proto.__proto__ ? getPropertyDescriptor(proto.__proto__, name) : null;
        }

        for (let name in values) {
            let desc = getPropertyDescriptor(this.__proto__, name);
            if (desc && desc.set) {
                this[name] = values[name];
            }
            else {
                let _name = name.replace("_", "-");
                this.attr(_name, values[_name]);
            }
        }
        return this;
    }

    get inDOM() {
        return this._parent && this._parent.inDOM;
    }

    get clientWidth() {
        return dom.clientWidth(this._node);
    }

    get clientHeight() {
        return dom.clientHeight(this._node);
    }

    _add(element) {
        dom.appendChild(this._node, element._node);
    }

    _reset(element) {
        dom.replaceChild(this._node, element._node, element._old);
    }

    _replace(oldElement, element) {
        dom.replaceChild(this._node, element._node, oldElement._node);
    }

    _insert(beforeElement, element) {
        dom.insertBefore(this._node, element._node, beforeElement._node);
    }

    _remove(element) {
        dom.removeChild(this._node, element._node);
    }

    _clear() {
        this._node.innerHTML = '';
    }

    _register() {}

    _unregister() {}

    anchor(node) {
        matrixOp++;
        dom.appendChild(node, this._node);
        return this;
    }

    add(element) {
        element.detach();
        if (!this._children) {
            this._children = new List();
        }
        this._children.add(element);
        matrixOp++;
        element._parent = this;
        this._add(element);
        element._register();
        return this;
    }

    reset(element) {
        if (element._parent!==this) {
            throw "Not a child."
        }
        matrixOp++;
        this._reset(element);
        return this;
    }

    replace(oldElement, element) {
        if (oldElement._parent!==this) {
            throw "Not a child."
        }
        if (this._children) {
            element.detach();
            this._children.replace(oldElement, element);
            matrixOp++;
            element._parent = this;
            this._replace(oldElement, element);
            element._register();
            oldElement._unregister();
            oldElement._parent = null;
        }
        return this;
    }

    insert(beforeElement, element) {
        if (beforeElement.parent!==this) {
            throw "Not a child."
        }
        if (this._children) {
            element.detach();
            this._children.insert(beforeElement, element);
            matrixOp++;
            element._parent = this;
            this._insert(beforeElement, element);
            element._register(this);
        }
        return this;
    }

    remove(element) {
        if (this._children) {
            this._children.remove(element);
            matrixOp++;
            this._remove(element);
            element._unregister();
            element._parent = null;
        }
        return this;
    }

    get(index) {
        if (this._children) return this._children[index];
    }

    contains(element) {
        return this._children && this._children.contains(element);
    }

    clear() {
        if (this._children) {
            for (let child of this._children) {
                child._unregister();
                child._parent = null;
            }
            this._children.clear();
            matrixOp++;
            this._clear();
        }
        return this;
    }

    node(type) {
        if (type) {
            this._node = doc.createElement(type);
            this._node._owner = this;
        }
        return this._node;
    }

    get innerHTML() {
        return this._node.innerHTML;
    }

    set innerHTML(innerHTML) {
        this._node.innerHTML = innerHTML;
        delete this._children;
    }

    get outerHTML() {
        return this._node.outerHTML;
    }

    emit(event) {
        if (this._events && this._events.get(event.type)) {
            this._node.dispatchEvent(event);
        }
        return this;
    }

    on(event, action) {
        if (!this._events) {
            this._events = new Map();
        }
        let actions = this._events.get(event);
        if (!actions) {
            actions = new List();
            this._events.set(event, actions);
        }
        actions.add(action);
        dom.addEventListener(this._node, event, action);
        return this;
    }

    off(event, action) {
        let actions = this._events ? this._events.get(event) : null;
        if (actions) {
            if (actions.remove(action)!==undefined) {
                if (actions.length===0) {
                    this._events.delete(event);
                    if (this._events.size === 0) {
                        delete this._events;
                    }
                }
                dom.removeEventListener(this._node, event, action);
            }
        }
        return this;
    }

    get parent() {return this._parent;}

    get children() {return this._children ? new List(...this._children) : new List();}

    get empty() {return !this._children || !this._children.length;}

    get child() {return this._children && this._children.length>0 ? this._children[0] : null }

    set child(element) {
        if (this._children && this._children.length>0) {
            this.replace(this._children[0], element);
        }
        else {
            this.add(element);
        }
    }

    attach(parent) {
        return parent.add(this);
    }

    detach() {
        if (this._parent) {
            this._unregister();
            return this._parent.remove(this);
        }
        return null;
    }

    memento() {
        let memento = {_attrs:{}};
        memento._target = this;
        for (let property in this._attrs) {
            if (this._attrs.hasOwnProperty(property)) {
                memento._attrs[property] = this._attrs[property];
            }
        }
        if (this._children) {
            memento._children = new List();
            for (let child of this._children) {
                memento._children.push(child.memento());
            }
        }
        memento._dnd = this._dnd;
        if (this._events) {
            memento._events = new Map();
            for (let event of this._events.keys()) {
                memento._events.set(event, [...this._events.get(event)]);
            }
        }
        return memento;
    }

    revert(memento) {
        this.attrs(memento._attrs);
        if (this._children) {
            for (let child of [...this._children]) {
                this.remove(child);
            }
        }
        if (memento._children) {
            for (let record of memento._children) {
                this.add(record._target);
                record._target.revert(record);
            }
        }
        this._dnd = memento._dnd;
        if (this._events) {
            for (let event of [...this._events.keys()]) {
                for (let action of [...this._events.get(event)]) {
                    this.off(event, action);
                }
            }
        }
        if (memento._events) {
            for (let event of memento._events.keys()) {
                for (let action of memento._events.get(event)) {
                    this.on(event, action);
                }
            }
        }
    }

    get owner() {
        let elem = this;
        while (elem) {
            if (elem._owner) return elem._owner;
            elem = elem.parent;
        }
        return null;
    };

}
defineStringProperty(DOMElement, Attrs.ID);
defineStringProperty(DOMElement, Attrs.CLASS);
defineStringProperty(DOMElement, Attrs.STYLE);

export class Div extends DOMElement {

    constructor() {
        super("div");
    }

    get width() {
        let width = this._attrs.width;
        if (width===undefined) {
            width = dom.clientWidth(this._node);
            this._attrs.width = width;
        }
        return width;
    }

    get height() {
        let height = this._attrs.height;
        if (height===undefined) {
            height = dom.clientHeight(this._node);
            this._attrs.height = height;
        }
        return height;
    }

    set width(width) {
        this._attrs.width = width;
        this._node.style.width = width+"px";
    }

    set height(height) {
        this._attrs.height = height;
        this._node.style.height = height+"px";
    }
}

export class SVGElement extends DOMElement {

    constructor(type) {
        super(type);
    }

    node(type) {
        if (type) {
            this._node = doc.createElementNS(SVG_NS, type);
            this._node._owner = this;
        }
        return this._node;
    }

    onDrag(dragStart, dragMove, dragDrop) {
        if (this._dnd) this.offDrag();
        let dndMove;
        let dndDrop;
        this._dnd = {
            dragStart : dragStart,
            dragMove : dragMove,
            dragDrop : dragDrop,
            event: null,
            start : event=> {
                if (!event._drag) {
                    this._dnd.event = event;
                    dndMove = this._dnd.move;
                    dndDrop = this._dnd.drop;
                    if (this._node.setCapture) {
                        this._node.setCapture(true);
                    }
                    else {
                        doc.addEventListener(MouseEvents.MOUSE_MOVE, dndMove);
                        doc.addEventListener(MouseEvents.MOUSE_UP, dndDrop);
                    }
                    this.off(MouseEvents.MOUSE_DOWN, this._dnd.start);
                    this.on(MouseEvents.MOUSE_MOVE, dndMove);
                    this.on(MouseEvents.MOUSE_UP, dndDrop);
                    dragStart.call(this, event);
                    event.preventDefault();
                    event._drag = true;
                }
            },
            move : event=> {
                if (event.pageX!==this._dnd.event.pageX||event.pageY!==this._dnd.event.pageY) {
                    this._dnd.event = event;
                    dragMove.call(this, event);
                    event.preventDefault();
                }
            },
            drop : event=> {
                dragDrop.call(this, event);
                this._dnd && this.on(MouseEvents.MOUSE_DOWN, this._dnd.start);
                this.off(MouseEvents.MOUSE_MOVE, dndMove);
                this.off(MouseEvents.MOUSE_UP, dndDrop);
                doc.removeEventListener(MouseEvents.MOUSE_MOVE, dndMove);
                doc.removeEventListener(MouseEvents.MOUSE_UP, dndDrop);
                event.preventDefault();
            }
        };
        this.on(MouseEvents.MOUSE_DOWN, this._dnd.start);
    }

    offDrag() {
        if (this._dnd) {
            this.off(MouseEvents.MOUSE_DOWN, this._dnd.start);
            delete this._dnd;
        }
    }

    getElementFromPoint(x, y) {
        let offset = globalOffset(this);
        return SVGElement.getElementFromPoint(x+offset.x, y+offset.y);
    }

    _register() {
        return false;
    }

    _unregister() {
        return false;
    }

}
defineFloatProperty(SVGElement, Attrs.OPACITY);
defineStringProperty(SVGElement, Attrs.VISIBILITY);
defineStringProperty(SVGElement, Attrs.STROKE);
defineFloatListProperty(SVGElement, Attrs.STROKE_DASHARRAY);
defineFloatProperty(SVGElement, Attrs.STROKE_DASHOFFSET);
defineStringProperty(SVGElement, Attrs.STROKE_LINECAP);
defineStringProperty(SVGElement, Attrs.STROKE_LINEJOIN);
defineIntegerProperty(SVGElement, Attrs.STROKE_MITERLIMIT);
defineFloatProperty(SVGElement, Attrs.STROKE_OPACITY);
defineFloatProperty(SVGElement, Attrs.STROKE_WIDTH);
defineStringProperty(SVGElement, Attrs.FILL);
defineFloatProperty(SVGElement, Attrs.FILL_OPACITY);
defineElementProperty(SVGElement, Attrs.CLIP_PATH, "url(#ELEMENT)");
defineElementProperty(SVGElement, Attrs.MASK, "url(#ELEMENT)");

SVGElement.elementOn = function(node) {
    while (node) {
        if (node._owner) return node._owner;
        node = node.parentNode;
    }
    return null;
};

SVGElement.getElementFromPoint = function(x, y) {
    let node = doc.elementFromPoint(x, y);
    return SVGElement.elementOn(node);
};

export const Stroke = {
  NONE : "none",
  lineCap : {
      BUTT: "butt",
      ROUND: "round",
      SQUARE: "square"
  },
  lineJoin : {
      ARCS: "arcs",
      BEVELS: "bevel",
      MITER: "miter",
      MITER_CLIP: "miter-clip",
      ROUND: "round"
  }
};

let idGenerator = 1;

export class Defs extends SVGElement {
    constructor() {
        super("defs");
    }

    add(element) {
        let id = element.id;
        if (!id) {
            element.id = "ID"+idGenerator++;
        }
        super.add(element);
    }
}

class ZLayer {

    constructor(index, svg, beforeLayer) {
        this._index = index;
        this._node = doc.createElementNS(SVG_NS, "g");
        this._node._owner = svg;
        if (beforeLayer) {
            dom.insertBefore(svg._node, this._node, beforeLayer._node);
        }
        else {
            dom.appendChild(svg._node, this._node);
        }
        this._children = new List();
    }

    destroy() {
        dom.removeChild(this._node._owner._node, this._node);
    }

    _getInheritedAttribute(element, attrName) {
        while (element) {
            let attr = element._attrs[attrName];
            if (attr) {
                return attr;
            }
            element = element._parent;
        }
        return null;
    }

    update() {
        if (this._index) {
            for (let element of this._children) {
                if (element._parent) {
                    element._zMatrix = element._parent.globalMatrix;
                    //let style = window.getComputedStyle(element._parent._node);
                    if (element._attrs.visibility===null || element._attrs.visibility===undefined) {
                        let visibility = this._getInheritedAttribute(element._parent, Attrs.VISIBILITY);
                        if (visibility!==undefined && visibility!==null) {
                            element._node.setAttribute(Attrs.VISIBILITY, visibility);
                        }
                        else {
                            element._node.removeAttribute(Attrs.VISIBILITY);
                        }
                    }
                }
            }
        }
    }

    add(element) {
        dom.appendChild(this._node, element._node);
        this._children.add(element);
    }

    reset(element) {
        dom.replaceChild(this._node, element._node, element._old);
    }

    replace(oldElement, element) {
        dom.replaceChild(this._node, element._node, oldElement._node);
        this._children.replace(oldElement, element);
    }

    insert(beforeElement, element) {
        dom.insertBefore(this._node, element._node, beforeElement._node);
        this._children.insert(beforeElement, element);
    }

    remove(element) {
        dom.removeChild(this._node, element._node);
        this._children.remove(element);
    }

    get empty() {
        return !this._children.length;
    }

}

function geometryGetter(element) {
    let geometry = element.rbox;
    return {left:geometry.x, top:geometry.y, right:geometry.x + geometry.width, bottom:geometry.y + geometry.height};
}

function makeSection(superClass) {

    defineGetProperty(superClass,
        function childrenSection() {
            return this;
        }
    );

    defineMethod(superClass,
        function registerForLayout(element) {
            element._addToLayout(this._layout);
        }
    );

    defineMethod(superClass,
        function unregisterForLayout(element) {
            element._removeFromLayout(this._layout);
        }
    );

    defineGetProperty(superClass,
        function childrenRelativeMatrix() {
            return new Matrix2D();
        }
    );

    defineMethod(superClass,
        function getElementsOn(x, y) {
            let elements = this._layout.find(x, y);
            let result = new List();
            for (let element of elements) {
                if (element.getElementsOn) {
                    let point = element._relativeMatrix.invert().point(new Point2D(x, y));
                    result.add(...element.getElementsOn(point.x, point.y));
                }
                else result.add(element);
            }
            return result;
        }
    );

    proposeMethod(superClass,
        function registerForZIndex(element) {
            this.section && this.section.registerForZIndex(element);
        }
    );

    defineMethod(superClass,
        function register(element) {
            this.registerForZIndex(element);
            this.registerForLayout(element);
        }
    );

    proposeMethod(superClass,
        function unregisterForZIndex(element) {
            this.section && this.section.unregisterForZIndex(element);
        }
    );

    defineMethod(superClass,
        function unregister(element) {
            this.unregisterForZIndex(element);
            this.unregisterForLayout(element);
        }
    );

    proposeMethod(superClass,
        function entered(element) {
            this.section && this.section.entered(element);
        }
    );

    proposeMethod(superClass,
        function exited(element) {
            this.section && this.section.exited(element);
        }
    );

}

export class Svg extends SVGElement {

    constructor(width, height) {
        assert(!isNaN(width+height));
        super("svg");
        this.attr("xmlns", SVG_NS);
        this.attr("xmlns:xlink", XLINK_NS);
        this.width = width;
        this.height = height;
        this.defs = new Defs();
        this.defs._parent = this;
        this._initContent();
        this._layout = new BoxLocator(10, 50, geometryGetter);
        this._mutationObserver = new MutationObserver(()=>this._updateLayers());
        this._mutationConfig = { childList: true, attributes: true, subtree:true };
        this._mutationObserver.observe(this._node, this._mutationConfig);
    }

    _initContent() {
        dom.appendChild(this._node, this.defs._node);
        this._layers = new List();
        this._createZLayer(0);
    }

    _updateLayers() {
        this._mutationObserver.disconnect();
        for (let index of this._layers.indexes()) {
            this._layers[parseInt(index)].update();
        }
        this._mutationObserver.observe(this._node, this._mutationConfig);
    }

    _createZLayer(index) {
        let beforeLayer;
        if (index<this._layers.length) {
            for (let next of this._layers.indexes()) {
                let nextIndex = parseInt(next);
                if (nextIndex > index) {
                    beforeLayer = this._layers[nextIndex];
                    break;
                }
            }
        }
        let layer = new ZLayer(index, this, beforeLayer);
        layer._parent = this;
        this._layers[index] = layer;
    }

    get _zOrder() {
        return 0;
    }

    _putOnLayer(element, index) {
        assert(element._zLayer===undefined);
        if (!this._layers[index]) {
            this._createZLayer(index);
        }
        if (!element._parent) {
            this._layers[index].add(element);
        }
        else {
            let position = getDOMPosition(element, this._layers[index]._children);
            if (position === this._layers[index]._children.length) {
                this._layers[index].add(element);
            }
            else {
                this._layers[index].insert(this._layers[index]._children[position], element);
            }
        }
        element._zLayer = index;
        let matrix = element._parent ? element._parent.globalMatrix : null;
        element._zMatrix = (matrix && !matrix.isIdentity) ? matrix : null;
    }

    _removeFromLayer(element) {
        assert(element._zLayer!==undefined);
        this._layers[element._zLayer].remove(element);
        if (this._layers[element._zLayer].empty) {
            this._layers[element._zLayer].destroy();
            delete this._layers[element._zLayer];
        }
        delete element._zLayer;
        element._zMatrix = null;
    }

    registerForZIndex(element) {
        if (element.z_index!==undefined && element.z_index !== element._parent._zOrder) {
            element._parent._remove(element);
            this._putOnLayer(element, element.z_index);
        }
    }

    unregisterForZIndex(element) {
        /**
         * Re-insert an element removed from z-layer, in the (detached) DOM subtree it should belongs to.
         * @param element
         */
        function reinsertInRightLocation(element) {
            let index = element._parent._children.indexOf(element);
            // if index=-1 : the element is removed from its own parent (even if element._parent is not already reset)
            if (index>=0) {
                let position = 0;
                let eIndex=0;
                while (eIndex<index) {
                    if (element._parent._children[position].parentNode === element._parent._node) position++;
                    eIndex++;
                }
                position++;
                if (position === element._parent._children.length) {
                    element._parent._add(element);
                }
                else {
                    let before = element._parent._children[position];
                    element._parent._insert(before, element);
                }
            }
        }

        if (element._zLayer!==undefined) {
            this._removeFromLayer(element);
            if (element._parent) {
                reinsertInRightLocation(element);
            }
        }
    }

    entered(element) {
        element.emit(SVGEvents.SVGIn);
    }

    exited(element) {
        element.emit(SVGEvents.SVGOut);
    }

    get inDOM() {
        return true;
    }

    addDef(element) {
        this.defs.add(element);
        return this;
    }

    removeDef(element) {
        this.defs.remove(element);
        return this;
    }

    _add(element) {
        this._putOnLayer(element, 0);
    }

    _reset(element) {
        this._layers[element._zLayer].reset(element, element);
    }

    _replace(oldElement, element) {
        this._removeFromLayer(oldElement);
        this._putOnLayer(element, 0);
    }

    _insert(beforeElement, element) {
        this._putOnLayer(element, 0);
    }

    _remove(element) {
        this._removeFromLayer(element);
    }

    _clear() {
        super._clear();
        this._initContent();
    }

    get globalMatrix() {
        if (!this._globalMatrix) {
            let globalMatrix = dom.getCTM(this._node);
            this._globalMatrix = new Matrix2D(
                globalMatrix.a, globalMatrix.b,
                globalMatrix.c, globalMatrix.d,
                globalMatrix.e, globalMatrix.f);
            this._globalMatrix.op = matrixOp;
        }
        return this._globalMatrix;
    }

}
makeSection(Svg);
defineDimensionProperty(Svg, Attrs.WIDTH);
defineDimensionProperty(Svg, Attrs.HEIGHT);


let matrixOp = 0;

export const Cursor = {
    ALIAS: "alias",
    ALL_SCROLL: "all-scroll",
    AUTO: "auto",
    CELL: "cell",
    CONTEXT_MENU: "context-menu",
    COL_RESIZE: "col-resize",
    COPY: "copy",
    CROSSHAIR: "crosshair",
    DEFAULT: "default",
    E_RESIZE: "e-resize",
    EW_RESIZE: "ew-resize",
    GRAB: "grab",
    GRABBING: "grabbing",
    HELP: "help",
    MOVE: "move",
    N_RESIZE: "n-resize",
    NE_RESIZE: "ne-resize",
    NESW_RESIZE: "nesw-resize",
    NS_RESIZE: "ns-resize",
    NW_RESIZE: "nw-resize",
    NWSE_RESIZE: "nwse-resize",
    NO_DROP: "no-drop",
    NONE: "none",
    NOT_ALLOWED: "not-allowed",
    POINTER: "pointer",
    PROGRESS: "progress",
    ROW_RESIZE: "row-resize",
    S_RESIZE: "s-resize",
    SE_RESIZE: "se-resize",
    SW_RESIZE: "sw-resize",
    TEXT: "text",
    URL: "URL",
    VERTICAL_TEXT: "vertical-text",
    W_RESIZE: "w-resize",
    WAIT: "wait",
    ZOOM_IN: "zoom-in",
    ZOOM_OUT: "zoom-out",
    INITIAL: "initial",
    INHERIT: "inherit"
};

export class SVGCoreElement extends SVGElement {

    constructor(type) {
        super(type);
    }

    get section() {
        return this._section;
    }

    get childrenSection() {
        return this._section;
    }

    set section(section) {
        if (section) {
            this._section = section;
        }
        else {
            delete this._section;
        }
    }

    geometryChanged() {
        if (this.section) {
            this.section.unregisterForLayout(this);
            this.section.registerForLayout(this);
        }
    }

    get _matrix() {
        return this._attrs.matrix;
    }

    get matrix() {
        let matrix = this._matrix;
        if (matrix===undefined) {
            matrix = new Matrix2D();
        }
        return matrix;
    }

    set _zMatrix(zMatrix) {
        matrixOp++;
        if (zMatrix) {
            this.__zMatrix = zMatrix;
        }
        else {
            delete this.__zMatrix;
        }
        let matrix = this._matrix;
        if (matrix) {
            let fMatrix = this.__zMatrix ? this.__zMatrix.mult(matrix) : matrix;
            this.attr(Attrs.TRANSFORM, fMatrix.toString());
        }
        else {
            this.attr(Attrs.TRANSFORM, this.__zMatrix);
        }
    }

    set _matrix(matrix) {
        matrixOp++;
        if (matrix) {
            this._attrs.matrix = matrix;
            let fMatrix = this.__zMatrix ? this.__zMatrix.mult(matrix) : matrix;
            this.attr(Attrs.TRANSFORM, fMatrix.toString());
        }
        else {
            delete this._attrs.matrix;
            this.attr(Attrs.TRANSFORM, this.__zMatrix?this.__zMatrix:null);
        }
    }

    set matrix(matrix) {
        this._matrix = matrix;
        if (this._parent && this._parent.childrenRelativeMatrix) {
            this.relativeMatrix = this._parent.childrenRelativeMatrix.mult(matrix);
        }
    }

    get relativeMatrix() {
        return this._relativeMatrix;
    }

    get childrenRelativeMatrix() {
        return this.relativeMatrix;
    }

    set relativeMatrix(matrix) {
        this._relativeMatrix = matrix;
    }

    get globalMatrix() {
        if (this.section) {
            return this.section.globalMatrix.mult(this.relativeMatrix);
        }
        else if (this._parent) {
            return this._parent.globalMatrix.mult(this.matrix);
        }
        else {
            return this.matrix;
        }
    }

    _addToLayout(layout) {
        layout.add(this);
    }

    _removeFromLayout(layout) {
        layout.remove(this);
    }

    get z_index() {
        return this._attrs.z_index;
    }

    set z_index(zIndex) {
        assert(zIndex===undefined || zIndex>=0);
        let zOrder = this._zOrder ? this._zOrder : undefined;
        if (zOrder !== zIndex) {
            this._unregister();
        }
        if (zIndex!==undefined) {
            this._attrs.z_index = zIndex;
        }
        else {
            delete this._attrs.z_index;
        }
        if (zOrder !== zIndex) {
            this._register();
        }
    }

    /**
     * Updates internal properties in order to manage z-ordering and registration in spacial layout. This method is
     * invoked each time this element OR ONE OF ITS ANCESTOR is inserted in a DOM tree (even if the DOM tree is not
     * inserted in the document tree).
     * @returns {boolean}
     * @private
     */
    _register() {
        if (this._parent && this.section !== this._parent.childrenSection) {
            this._relativeMatrix = this._parent.childrenRelativeMatrix.mult(this.matrix);
            let z_index = this.z_index;
            if (this.section) this.section.exited(this);
            this.section = this._parent.childrenSection;
            if (this.section) this.section.entered(this);
            if (this._children) {
                for (let child of this._children) {
                    child._register();
                }
            }
            if (this.section) {
                this.section.register(this);
            }
            // Updates z-order AFTER parent registration
            this._zOrder = z_index !== undefined ? z_index : this._parent._zOrder;
            return true;
        }
        return false;
    }

    _unregister() {
        if (this.section) {
            if (this.section) {
                this.section.unregister(this);
            }
            this.section.exited(this);
            this.section = null;
            if (this._children) {
                for (let child of this._children) {
                    child._unregister();
                }
            }
            delete this._zOrder;
            return true;
        }
        return false;
    }

    _transformBox(box, matrix) {
        let p1 = matrix.point(new Point2D(box.x, box.y));
        let p2 = matrix.point(new Point2D(box.x+box.width, box.y));
        let p3 = matrix.point(new Point2D(box.x+box.width, box.y+box.height));
        let p4 = matrix.point(new Point2D(box.x, box.y+box.height));
        let minX = Math.min(p1.x, p2.x, p3.x, p4.x);
        let maxX = Math.max(p1.x, p2.x, p3.x, p4.x);
        let minY = Math.min(p1.y, p2.y, p3.y, p4.y);
        let maxY = Math.max(p1.y, p2.y, p3.y, p4.y);
        return {
            x: minX,
            y: minY,
            width: maxX-minX,
            height: maxY-minY
        }
    }

    get bbox() {
        return this._node.getBBox();
    }

    get gbox() {
        return this._transformBox(this.bbox, this.globalMatrix);
    }

    get rbox() {
        return this._transformBox(this.bbox, this.relativeMatrix);
    }

    global2local(x, y) {
        let imatrix = this.globalMatrix.invert();
        return imatrix.point(new Point2D(x, y));
    }

    local2global(x, y) {
        let gmatrix = this.globalMatrix;
        return gmatrix.point(new Point2D(x, y));
    }

    get cursor() {
        return this._node.style.cursor;
    }

    set cursor(cursor) {
        this._node.style.cursor = cursor;
    }

}

export class Group extends SVGCoreElement {
    constructor(matrix=null) {
        super("g");
        matrix && (this.matrix = matrix);
    }

    _addToLayout(layout) {
        if (this._children) {
            for (let child of this._children) {
                if (child instanceof SVGCoreElement) {
                    child._addToLayout(layout);
                    child.relativeMatrix = this._relativeMatrix.mult(child.matrix);
                }
            }
        }
    }

    _removeFromLayout(layout) {
        if (this._children) {
            for (let child of this._children) {
                if (child instanceof SVGCoreElement) {
                    child._removeFromLayout(layout);
                }
            }
        }
    }

    get relativeMatrix() {
        return this._relativeMatrix;
    }

    set relativeMatrix(matrix) {
        this._relativeMatrix = matrix;
        if (this._children) {
            for (let child of this._children) {
                if (child instanceof SVGCoreElement) {
                    child.relativeMatrix = this._relativeMatrix.mult(child.matrix);
                }
            }
        }
    }

}
defineElementProperty(Group, Attrs.FILTER, "url(#ELEMENT)");

export class Pack extends Group {

    constructor(matrix=null) {
        super(matrix);
        this._layout = new BoxLocator(10, 50, geometryGetter);
    }

    get bbox() {
        return {
            x:this._layout.left, y:this._layout.top,
            width:this._layout.right-this._layout.left, height:this._layout.bottom-this._layout.top
        };
    }

    _addToLayout(layout) {
        layout.add(this);
    }

    _removeFromLayout(layout) {
        layout.remove(this);
    }

    get relativeMatrix() {
        return this._relativeMatrix;
    }

    set relativeMatrix(matrix) {
        this._relativeMatrix = matrix;
    }

}
makeSection(Pack);

export class Translation extends Group {
    constructor(dx=0, dy=0) {
        super();
        this.set(dx, dy);
    }

    set(dx, dy) {
        this._attrs.dx = dx;
        this._attrs.dy = dy;
        this.matrix = Matrix2D.translate(dx, dy);
        return this;
    }

    move(dx, dy) {
        this._attrs.dx += dx;
        this._attrs.dy += dy;
        this.matrix = Matrix2D.translate(this._attrs.dx, this._attrs.dy);
        return this;
    }

    _cloneAttrs(copy) {
        let attrs = Object.assign({}, this._attrs);
        delete attrs.dx;
        delete attrs.dy;
        copy.attrs(attrs);
        return this;
    }

    get dx() {
        return this._attrs.dx;
    }

    get dy() {
        return this._attrs.dy;
    }

}

export class Rotation extends Group {
    constructor(a, cx=0, cy=0) {
        super();
        this._attrs.cx = cx;
        this._attrs.cy = cy;
        this.angle = a;
    }

    center(cx, cy) {
        this._attrs.cx = cx;
        this._attrs.cy = cy;
        this.matrix = Matrix2D.rotate(this._attrs.angle, cx, cy);
        return this;
    }

    get angle() {
        return this._attrs.angle;
    }

    set angle(angle) {
        this._attrs.angle = angle;
        this.matrix = Matrix2D.rotate(angle, this._attrs.cx, this._attrs.cy);
        return this;
    }

    get cx() {
        return this._attrs.cx;
    }

    get cy() {
        return this._attrs.cy;
    }
}

export class Scaling extends Group {

    constructor(sx, sy, cx=0, cy=0) {
        super();
        this._attrs.cx = cx;
        this._attrs.cy = cy;
        this.scale(sx, sy);
    }

    center(cx, cy) {
        this._attrs.cx = cx;
        this._attrs.cy = cy;
        this.matrix = Matrix2D.scale(this._attrs.sx, this._attrs.sy, cx, cy);
        return this;
    }

    scale(sx, sy) {
        this._attrs.sx = sx;
        this._attrs.sy = sy;
        this.matrix = Matrix2D.scale(sx, sy, this._attrs.cx, this._attrs.cy);
    }

    get cx() {
        return this._attrs.cx;
    }

    get cy() {
        return this._attrs.cy;
    }

    get scalex() {
        return this._attrs.sx;
    }

    get scaley() {
        return this._attrs.sy;
    }
}
export class ClipPath extends SVGElement {

    constructor(id) {
        super("clipPath");
        this.id = id;
    }

}

export class Mask extends SVGElement {

    constructor(id, x, y, width, height) {
        super("mask");
        this.id = id;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

}
defineXYWidthHeightProperties(Mask);

export class Shape extends SVGCoreElement {

    constructor(type) {
        super(type);
    }
}
defineElementProperty(Shape, Attrs.FILTER, "url(#ELEMENT)");

export class Rect extends Shape {

    constructor(x=0, y=0, width=0, height=0) {
        super("rect");
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    get bbox() {
        return {x:this.x, y:this.y, width:this.width, height:this.height};
    }
}
defineStandardGeometryProperties(Rect);
defineDimensionProperty(Rect, Attrs.RX);
defineDimensionProperty(Rect, Attrs.RY);

export class Circle extends Shape {
    constructor(cx=0, cy=0, r) {
        super("circle");
        this.cx = cx;
        this.cy = cy;
        this.r = r;
    }

    get bbox() {
        return {x:this.cx-this.r, y:this.cy-this.r, width:this.r*2, height:this.r*2};
    }

}
defineDimensionProperty(Circle, Attrs.CX);
defineDimensionProperty(Circle, Attrs.CY);
defineDimensionProperty(Circle, Attrs.R);

export class Ellipse extends Shape {
    constructor(cx=0, cy=0, rx, ry) {
        super("ellipse");
        this.cx = cx;
        this.cy = cy;
        this.rx = rx;
        this.ry = ry;
    }

    get bbox() {
        return {x:this.cx-this.rx, y:this.cy-this.ry, width:this.rx*2, height:this.ry*2};
    }
}
defineDimensionProperty(Ellipse, Attrs.CX);
defineDimensionProperty(Ellipse, Attrs.CY);
defineDimensionProperty(Ellipse, Attrs.RX);
defineDimensionProperty(Ellipse, Attrs.RY);

export class Line extends Shape {
    constructor(x1, y1, x2, y2) {
        super("line");
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
    }

    get bbox() {
        return {x:Math.min(this.x1, this.x2), y:Math.min(this.y1, this.y2), width:Math.abs(this.x2-this.x1), height:Math.abs(this.y2-this.y1)};
    }

}
defineDimensionProperty(Line, Attrs.X1);
defineDimensionProperty(Line, Attrs.Y1);
defineDimensionProperty(Line, Attrs.X2);
defineDimensionProperty(Line, Attrs.Y2);

export class Polyshape extends Shape {
    constructor(type, points) {
        super(type);
        this.points = points;
    }

    get points() {
        let points = this._attrs.points;
        return points ? points : new List();
    }

    set points(points) {
        this._attrs.points = points;
        if (this._left) {
            delete this._left;
            delete this._right;
            delete this._top;
            delete this._bottom;
        }
        let def = "";
        for (let point of points) {
            if (this._left===undefined || this._left>point[0]) this._left = point[0];
            if (this._right===undefined || this._right<point[0]) this._right = point[0];
            if (this._top===undefined || this._top>point[1]) this._top = point[1];
            if (this._bottom===undefined || this._bottom<point[1]) this._bottom = point[1];
            if (def.length) def+=" ";
            def+=point[0]+","+point[1];
        }
        this._node.setAttribute("points", def);
        return this;
    }

    get bbox() {
        return {x:this._left, y:this._top, width:this._right-this._left, height:this._bottom-this._top};
    }

}

export class Polygon extends Polyshape {
    constructor(...points) {
        super("polygon", points);
    }
}

export class Polyline extends Polyshape {
    constructor(...points) {
        super("polyline", points);
    }
}

export class MovetoDirective {
    constructor(x, y) {
        assert(!isNaN(x)&&!isNaN(y));
        this.x = x;
        this.y = y;
    }

    toString() {
        return "M "+this.x+" "+this.y;
    }

    points(position) {
        return [[this.x, this.y]];
    }
}
export function M(x, y) {
    return new MovetoDirective(x, y);
}

export class RelativeMovetoDirective {
    constructor(x, y) {
        assert(!isNaN(x)&&!isNaN(y));
        this.x = x;
        this.y = y;
    }

    toString() {
        return "m "+this.x+" "+this.y;
    }

    points(position) {
        return [[position[0]+this.x, position[1]+this.y]];
    }
}
export function m(x, y) {
    return new RelativeMovetoDirective(x, y);
}

export class LinetoDirective {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    toString() {
        return "L "+this.x+" "+this.y;
    }

    points(position) {
        return [[this.x, this.y]];
    }
}
export function L(x, y) {
    return new LinetoDirective(x, y);
}

export class RelativeLinetoDirective {
    constructor(x, y) {
        assert(!isNaN(x)&&!isNaN(y));
        this.x = x;
        this.y = y;
    }

    toString() {
        return "l "+this.x+" "+this.y;
    }

    points(position) {
        return [[position[0]+this.x, position[1]+this.y]];
    }
}
export function l(x, y) {
    return new RelativeLinetoDirective(x, y);
}

export class HorizontalDirective {
    constructor(x) {
        assert(!isNaN(x));
        this.x = x;
    }

    toString() {
        return "H "+this.x;
    }

    points(position) {
        return [[this.x, position[1]]];
    }
}
export function H(x) {
    return new HorizontalDirective(x);
}

export class RelativeHorizontalDirective {
    constructor(x) {
        assert(!isNaN(x));
        this.x = x;
    }

    toString() {
        return "h "+this.x;
    }

    points(position) {
        return [[position[0]+this.x, position[1]]];
    }

}
export function h(x) {
    return new RelativeHorizontalDirective(x);
}

export class VerticalDirective {
    constructor(y) {
        assert(!isNaN(y));
        this.y = y;
    }

    toString() {
        return "V "+this.y;
    }

    points(position) {
        return [[position[0], this.y]];
    }

}
export function V(y) {
    return new VerticalDirective(y);
}

export class RelativeVerticalDirective {
    constructor(y) {
        assert(!isNaN(y));
        this.y = y;
    }

    toString() {
        return "v "+this.y;
    }

    points(position) {
        return [[position[0], position[1]+this.y]];
    }

}
export function v(y) {
    return new RelativeVerticalDirective(y);
}

export class CloseDirective {
    constructor() {
    }

    toString() {
        return "Z";
    }

    points(position) {
        return null;
    }
}
export function Z() {
    return new CloseDirective();
}

export class CurveToDirective {
    constructor(x1, y1, x2, y2, x, y) {
        assert(!isNaN(x1)&&!isNaN(y1)&&!isNaN(x2)&&!isNaN(y2)&&!isNaN(x)&&!isNaN(y));
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.x = x;
        this.y = y;
    }

    toString() {
        return "C "+this.x1+" "+this.y1+" "+this.x2+" "+this.y2+" "+this.x+" "+this.y;
    }

    points(position) {
        return [[this.x1, this.y1], [this.x2, this.y2], [this.x, this.y]];
    }

}
export function C(x1, y1, x2, y2, x, y) {
    return new CurveToDirective(x1, y1, x2, y2, x, y);
}

export class RelativeCurveToDirective {
    constructor(x1, y1, x2, y2, x, y) {
        assert(!isNaN(x1)&&!isNaN(y1)&&!isNaN(x2)&&!isNaN(y2)&&!isNaN(x)&&!isNaN(y));
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.x = x;
        this.y = y;
    }

    toString() {
        return "c "+this.x1+" "+this.y1+" "+this.x2+" "+this.y2+" "+this.x+" "+this.y;
    }

    points(position) {
        return [[position[0]+this.x1, position[1]+this.y1], [position[0]+this.x2, position[1]+this.y2], [position[0]+this.x, position[1]+this.y]];
    }

}
export function c(x1, y1, x2, y2, x, y) {
    return new RelativeCurveToDirective(x1, y1, x2, y2, x, y);
}

export class ShorthandCurveToDirective {
    constructor(x2, y2, x, y) {
        assert(!isNaN(x2)&&!isNaN(y2)&&!isNaN(x)&&!isNaN(y));
        this.x2 = x2;
        this.y2 = y2;
        this.x = x;
        this.y = y;
    }

    toString() {
        return "S "+this.x2+" "+this.y2+" "+this.x+" "+this.y;
    }

    points(position) {
        return [[this.x2, this.y2], [this.x, this.y]];
    }

}
export function S(x2, y2, x, y) {
    return new ShorthandCurveToDirective(x2, y2, x, y);
}

export class RelativeShorthandCurveToDirective {
    constructor(x2, y2, x, y) {
        assert(!isNaN(x2)&&!isNaN(y2)&&!isNaN(x)&&!isNaN(y));
        this.x2 = x2;
        this.y2 = y2;
        this.x = x;
        this.y = y;
    }

    toString() {
        return "s "+this.x2+" "+this.y2+" "+this.x+" "+this.y;
    }

    points(position) {
        return [[position[0]+this.x2, position[1]+this.y2], [position[0]+this.x, position[1]+this.y]];
    }

}
export function s(x2, y2, x, y) {
    return new RelativeShorthandCurveToDirective(x2, y2, x, y);
}

export class QuadraticBezierDirective {
    constructor(x1, y1, x, y) {
        assert(!isNaN(x1)&&!isNaN(y1)&&!isNaN(x)&&!isNaN(y));
        this.x1 = x1;
        this.y1 = y1;
        this.x = x;
        this.y = y;
    }

    toString() {
        return "Q "+this.x1+" "+this.y1+" "+this.x+" "+this.y;
    }

    points(position) {
        return [[this.x1, this.y1], [this.x, this.y]];
    }
}
export function Q(x1, y1, x, y) {
    return new QuadraticBezierDirective(x1, y1, x, y);
}

export class RelativeQuadraticBezierDirective {
    constructor(x1, y1, x, y) {
        assert(!isNaN(x1)&&!isNaN(y1)&&!isNaN(x)&&!isNaN(y));
        this.x1 = x1;
        this.y1 = y1;
        this.x = x;
        this.y = y;
    }

    toString() {
        return "q "+this.x1+" "+this.y1+" "+this.x+" "+this.y;
    }

    points(position) {
        return [[position[0]+this.x1, position[1]+this.y1], [position[0]+this.x, position[1]+this.y]];
    }

}
export function q(x1, y1, x, y) {
    return new RelativeQuadraticBezierDirective(x1, y1, x, y);
}

export class EllipticArcDirective {
    constructor(rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y) {
        this.rx = rx;
        this.ry = ry;
        this.xAxisRotation = xAxisRotation;
        this.largeArcFlag = largeArcFlag;
        this.sweepFlag = sweepFlag;
        this.x = x;
        this.y = y;
    }

    toString() {
        return "A "+this.rx+" "+this.ry+" "+this.xAxisRotation+" "+this.largeArcFlag+" "+this.sweepFlag+" "+this.x+" "+this.y;
    }

    // FIXME: arc is ignored...
    points(position) {
        return [[this.x, this.y]];
    }

}
export function A(rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y) {
    return new EllipticArcDirective(rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y);
}

export class RelativeEllipticArcDirective {
    constructor(rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y) {
        this.rx = rx;
        this.ry = ry;
        this.xAxisRotation = xAxisRotation;
        this.largeArcFlag = largeArcFlag;
        this.sweepFlag = sweepFlag;
        this.x = x;
        this.y = y;
    }

    toString() {
        return "a "+this.rx+" "+this.ry+" "+this.xAxisRotation+" "+this.largeArcFlag+" "+this.sweepFlag+" "+this.x+" "+this.y;
    }

    // FIXME: arc is ignored...
    points(position) {
        return [[position[0]+this.x, position[1]+this.y]];
    }
}
export function a(rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y) {
    return new RelativeEllipticArcDirective(rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y);
}

export function defineDirectiveProperty(clazz, name) {
    defineProperty(clazz, name,
        function() {
            let d = this._attrs.d;
            return d ? d : new List();
        },
        function(directives) {
            let position = [0, 0];
            if (this._left) {
                delete this._left;
                delete this._right;
                delete this._top;
                delete this._bottom;
            }
            this._attrs.d = directives;
            let def = "";
            for (let directive of directives) {
                if (def.length) def+=", ";
                def+=directive;
                let points = directive.points(position);
                if (points && points.length) {
                    for (let point of points) {
                        if (!this._left || this._left > point[0]) this._left = point[0];
                        if (!this._right || this._right < point[0]) this._right = point[0];
                        if (!this._top || this._top > point[1]) this._top = point[1];
                        if (!this._bottom || this._bottom < point[1]) this._bottom = point[1];
                    }
                    position = points[points.length-1];
                }
            }
            this._node.setAttribute(Attrs.D, def);
            return this;
        }

    );
}
export class Path extends Shape {
    constructor(...directives) {
        super("path", directives);
        this.d = directives;
    }

    get bbox() {
        return {x:this._left, y:this._top, width:this._right-this._left, height:this._bottom-this._top};
    }

}
defineDirectiveProperty(Path, "d");

export const TextAnchor = {
    START : "start",
    MIDDLE : "middle",
    END : "end",
    INHERIT : "inherit"
};

export const AlignmentBaseline = {
    NONE : "none",
    AUTO : "auto",
    BASELINE : "baseline",
    BEFORE_EDGE : "before-edge",
    TEXT_BEFORE_EDGE : "text-before-edge",
    MIDDLE : "middle",
    CENTRAL : "central",
    AFTER_EDGE : "after-edge",
    TEXT_AFTER_EDGE : "text-after-edge",
    IDEOGRAPHIC : "ideographic",
    ALPHABETIC : "alphabetic",
    HANGING : "hanging",
    MATHEMATICAL : "mathematical",
    TOP : "top",
    CENTER : "center",
    BOTTOM : "bottom"
};

export const FontStyle = {
    NORMAL : "normal",
    ITALIC : "italic",
    OBLIQUE : "oblique",
    INHERIT : "inherit"
};

export const FontStretch = {
    NORMAL : "normal",
    WIDER : "wider",
    NARROWER : "narrower",
    ULTRA_CONDENSED : "ultra-condensed",
    EXTRA_CONDENSED : "extra-condensed",
    CONDENSED : "condensed",
    SEMI_CONDENSED : "semi-condensed",
    SEMI_EXPANDED : "semi-expanded",
    EXPANDED : "expanded",
    EXTRA_EXPANDED : "extra-expanded",
    ULTRA_EXPANDED : "ultra-expanded",
    INHERIT : "inherit"
};

export const FontSize = {
    INHERIT : "inherit"
};

export const FontSizeAdjust = {
    NONE: "none",
    INHERIT : "inherit"
};

export const FontVariant = {
    NORMAL : "normal",
    SMALL_CAPS : "small-caps",
    INHERIT : "inherit"
};

export const FontWeight = {
    NORMAL : "normal",
    BOLD : "bold",
    BOLDER : "bolder",
    LIGHTER : "lighter",
    W100 : 100,
    W200 : 200,
    W300 : 300,
    W400 : 400,
    W500 : 500,
    W600 : 600,
    W700 : 700,
    W800 : 800,
    W900 : 900,
    INHERIT : "inherit"
};

export class TextItem extends Shape {
    constructor(type, x, y, text) {
        super(type);
        this.x = x;
        this.y = y;
        this.text = text;
    }

    get text() {
        let text = this._attrs.text;
        if (text===undefined) {
           let textNode = Array.from(this._node.childNodes)
               .find(node=>node.nodeType===Node.TEXT_NODE);
           if (textNode) {
               text = textNode.nodeValue;
               this._attrs.text = text;
           }
        }
        return text;
    }

    set text(text) {
        this._attrs.text = text;
        let textNode = Array.from(this._node.childNodes)
            .find(node=>node.nodeType===Node.TEXT_NODE);
        if (!textNode) {
            textNode = doc.createTextNode(text);
            matrixOp++;
            dom.appendChild(this._node, textNode);
        }
        else {
            textNode.nodeValue = text;
        }
    }

    _clone() {
        let copy = super._clone();
        copy.text = this.text;
        return copy;
    }

}
defineStringProperty(TextItem, Attrs.TEXT_ANCHOR);
defineStringProperty(TextItem, Attrs.ALIGNMENT_BASELINE);
defineDimensionProperty(TextItem, Attrs.X);
defineDimensionProperty(TextItem, Attrs.Y);
defineFloatProperty(TextItem, Attrs.ROTATE);
defineStringProperty(TextItem, Attrs.FONT_FAMILY);
defineAnyProperty(TextItem, Attrs.FONT_SIZE);
defineStringProperty(TextItem, Attrs.FONT_STYLE);
defineStringProperty(TextItem, Attrs.FONT_VARIANT);
defineAnyProperty(TextItem, Attrs.FONT_WEIGHT);
defineAnyProperty(TextItem, Attrs.FONT_SIZE_ADJUST);
defineStringProperty(TextItem, Attrs.FONT_STRETCH);

export class Tspan extends TextItem {
    constructor(x, y, text) {
        super("tspan", x, y, text);
    }
}
defineDimensionProperty(Tspan, Attrs.DX);
defineDimensionProperty(Tspan, Attrs.DY);

export class Text extends TextItem {
    constructor(x, y, text) {
        super("text", x, y, text);
    }
}

export const AspectRatio = {
    NONE: "none"
};

export class RasterImage extends Shape {

    constructor(url, x=0, y=0, width=0, height=0) {
        super();
        this._attrs.width = width;
        this._attrs.height = height;
        this._attrs.href=url;
        this._attrs.x = x;
        this._attrs.y = y;
        this._attrs.preserveAspectRatio = AspectRatio.NONE;
        if (!width || !height) {
            this.node("g");
            loadRasterImage(url, raster=>{
               this._setImage(raster, width, height)
            });
        }
        else {
            this._build();
        }
    }

    _build() {
        this.node("image");
        this.attrs(this._attrs);
    }

    _setImage(raster, width, height) {
        if (width || height) {
            if (!height) {
                height = raster.height * width / raster.width;
            } else if (!width) {
                width = raster.width * height / raster.height;
            } else {
                let factor = Math.min(width / raster.width, height / raster.height);
                width = raster.width * factor;
                height = raster.height * factor;
            }
        }
        else {
            width = raster.width;
            height = raster.height;
        }
        this._old = this._node;
        this._attrs.width = width;
        this._attrs.height = height;
        this._build();
        if (this.parent) {
            this.parent.reset(this);
        }
    }

    _clone() {
        let copy = super._clone();
        loadRasterImage(this.href, raster=> {
            copy._setImage(raster, this.width, this.height);
        });
        return copy;
    }

    get href() {
        return this._attrs.href;
    }
}
defineXYWidthHeightProperties(RasterImage);

export class ClippedRasterImage extends Shape {

    constructor(url, cx, cy, cw, ch, x=0, y=0, width=0, height=0) {
        super();
        this._attrs.width = width;
        this._attrs.height = height;
        this._attrs.href=url;
        this._attrs.x = x;
        this._attrs.y = y;
        this._attrs.cx = cx;
        this._attrs.cy = cy;
        this._attrs.cw = cw;
        this._attrs.ch = ch;
        this._attrs.preserveAspectRatio = AspectRatio.NONE;
        this.node("g");
        this.setImage();
    }

    _build(rasterImage, cx, cy, cw, ch) {
        let canvas = doc.createElement("canvas");
        canvas.width = cw;
        canvas.height = ch;
        let ctx = canvas.getContext("2d");
        ctx.drawImage(rasterImage, cx, cy, cw, ch, 0, 0, cw, ch);
        this.node('image');
        this._node.setAttributeNS(XLINK_NS, "href", canvas.toDataURL());
        this.attrs({
            x: this._attrs.x,
            y: this._attrs.y,
            width: this._attrs.width,
            height: this._attrs.height
        });
    }

    setImage() {
        loadRasterImage(this._attrs.href, raster=>{
            this._setImage(raster,
                this._attrs.cx, this._attrs.cy,
                this._attrs.cw, this._attrs.ch,
                this._attrs.width, this._attrs.height)
        });
    }

    _setImage(raster, cx, cy, cw, ch, width, height) {
        if (!width || !height) {
            if (width) {
                height = ch * width / cw;
            } else if (height) {
                width = cw * height / ch;
            } else {
                width = cw;
                height = ch;
            }
        }
        this._old = this._node;
        this._attrs.width = width;
        this._attrs.height = height;
        this._build(raster, cx, cy, cw, ch);
        if (this.parent) {
            this.parent.reset(this);
        }
    }

    _clone() {
        let copy = super._clone();
        loadRasterImage(this.href, raster=> {
            copy._setImage(raster,
                this._attrs.cx, this._attrs.cy,
                this._attrs.cw, this._attrs.ch,
                this._attrs.width, this._attrs.height);
        });
        return copy;
    }

    get href() {
        return this._attrs.href;
    }

    set href(href) {
        this._attrs.href = href;
        this.setImage();
    }

    clip(cx, cy, cw, ch) {
        this._attrs.cx = cx;
        this._attrs.cy = cy;
        this._attrs.cw = cw;
        this._attrs.ch = ch;
        this.setImage();
    }

}
// Partiel
defineXYWidthHeightProperties(ClippedRasterImage);

export class SvgImage extends Shape {

    constructor(url, x = 0, y = 0, width = 0, height = 0) {
        super();
        this.node("g");
        this._sizer = doc.createElementNS(SVG_NS, "g");
        matrixOp++;
        dom.appendChild(this._node, this._sizer);
        this._attrs.x = x;
        this._attrs.y = y;
        this._attrs.width = width;
        this._attrs.height = height;
        this._attrs.href = url;
        loadSvgImage(url, img=>this._setImage(img));
    }

    _setImage(img) {
        function createImage(image) {
            let node =
                image instanceof DocumentFragment
                    ? image.querySelector("svg")
                    : image;
            let svg = node.cloneNode(true);
            let viewBox = svg.getAttribute("viewBox");
            let width = svg.getAttribute("width");
            let height = svg.getAttribute("height");
            if (viewBox) {
                let viewBoxValues = viewBox.split(" ");
                (!width && viewBox) && (width = parseFloat(viewBoxValues[2]));
                (!height && viewBox) && (height = parseFloat(viewBoxValues[3]));
                viewBox && svg.removeAttribute("viewBox");
            }
            width && svg.setAttribute("width", width);
            height && svg.setAttribute("height", height);
            return svg;
        }

        this._svgImage = createImage(img);
        this._sizeImage(this.width, this.height);
        this._posImage(this.x, this.y);
        matrixOp++;
        dom.appendChild(this._sizer, this._svgImage);
    }

    _clone() {
        let copy = super._clone();
        copy._sizer = doc.createElementNS(SVG_NS, "g");
        matrixOp++;
        dom.appendChild(copy._node, this._sizer);
        this._cloneAttrs(copy);
        return copy;
    }

    _cloneAttrs(copy) {
        copy._attrs.x = this._attrs.x;
        copy._attrs.y = this._attrs.y;
        copy._attrs.width = this._attrs.width;
        copy._attrs.height = this._attrs.height;
        copy._attrs.href = this._attrs.href;
        return copy;
    }

    _cloneContent(copy) {
        super._cloneContent(copy);
        loadSvgImage(this.href, img=>copy._setImage(img));
        return copy;
    }

    _posImage(x, y) {
        this._attrs.x = x;
        this._attrs.y = y;
        this._node.setAttribute(Attrs.TRANSFORM, Matrix2D.translate(x, y));
    }

    _sizeImage(width, height) {
        let imgWidth = this._svgImage.getAttribute("width");
        let imgHeight = this._svgImage.getAttribute("height");
        this._attrs.width = width ? width : imgWidth;
        this._attrs.height = height ? height : imgHeight;
        let sx = this._attrs.width/imgWidth;
        let sy = this._attrs.height/imgHeight;
        this._sizer.setAttribute(Attrs.TRANSFORM, Matrix2D.scale(sx, sy, 0, 0).toString());
    }

    get x() {
        return this._attrs.x;
    }

    set x(x) {
        this._posImage(x, this.y);
    }

    get y() {
        return this._attrs.y;
    }

    set y(y) {
        this._posImage(this.x, y);
    }

    get width() {
        return this._attrs.width;
    }

    set width(width) {
        this._sizeImage(width, this.height);
    }

    get height() {
        return this._attrs.height;
    }

    set height(height) {
        this._sizeImage(this.width, height);
    }

    get href() {
        return this._attrs.href;
    }

}

export class SvgRasterImage extends Shape {

    constructor(url, x=0, y=0, width=0, height=0) {
        super("g");
        this._attrs.x = x;
        this._attrs.y = y;
        this._attrs.width = width;
        this._attrs.height = height;
        this._url = url;
        loadRasterSvgImage(url, raster=> {
            this._setImage(raster);
        })
    }

    _setImage(raster) {
        this._old = this._node;
        this._node = raster.cloneNode(true);
        this.attrs(this._attrs);
        if (this.parent) {
            this.parent.reset(this);
        }
    }

    _cloneContent(copy) {
        super._cloneContent(copy);
        copy._url = this._url;
        loadRasterSvgImage(this._url, raster=> {
            copy._setImage(raster);
        });
        return this;
    }
}
defineXYWidthHeightProperties(SvgRasterImage);

export class FilterElement extends SVGElement {
    constructor(type) {
        super(type);
    }
}
defineStringProperty(FilterElement, Attrs.RESULT);
defineXYWidthHeightProperties(FilterElement);
defineStringProperty(FilterElement, Attrs.IN);

export const FeIn = {
  SOURCEGRAPHIC : "SourceGraphic",
  SOURCEALPHA : "SourceAlpha",
  BACKGROUNDIMAGE : "BackgroundImage",
  BACKGROUNDALPHA : "BackgroundAlpha",
  FILLPAINE : "FillPaint",
  STROKEPAINT : "StrokePaint"
};
export const FeEdgeMode = {
  NONE : "none",
  DUPLICATE : "duplicate",
  WRAP : "wrap"
};

export class FeGaussianBlur extends FilterElement {
    constructor() {
        super("feGaussianBlur")
    }
}
defineFloatListProperty(FeGaussianBlur, Attrs.STDDEVIATION);
defineStringProperty(FeGaussianBlur, Attrs.EDGEMODE);

export class FeDropShadow extends FilterElement {
    constructor() {
        super("feDropShadow")
    }
}
defineFloatListProperty(FeDropShadow, Attrs.STDDEVIATION);
defineFloatProperty(FeDropShadow, Attrs.DX);
defineFloatProperty(FeDropShadow, Attrs.DY);
defineStringProperty(FeDropShadow, Attrs.FLOOD_COLOR);
defineFloatProperty(FeDropShadow, Attrs.FLOOD_OPACITY);

export const FeOperator = {
    ERODE : "erode",
    DILATE: "dilate"
};
export class FeMorphology extends FilterElement {
    constructor() {
        super("feMorphology")
    }
}
defineFloatListProperty(FeMorphology, Attrs.RADIUS);

export const FeScaleSelector = {
    R : "R",
    G : "G",
    B : "B",
    A : "A"
};
export class FeDisplacementMap extends FilterElement {
    constructor() {
        super("feDisplacementMap")
    }
}
defineStringProperty(FeDisplacementMap, Attrs.IN2);
defineFloatProperty(FeDisplacementMap, Attrs.SCALE);
defineStringProperty(FeDisplacementMap, Attrs.XCHANNELSELECTOR);
defineStringProperty(FeDisplacementMap, Attrs.YCHANNELSELECTOR);

export const FeBlendMode = {
    NORMAL: "normal",
    MULTIPLY: "multiply",
    SCREEN: "screen",
    OVERLAY: "overlay",
    DARKEN: "darken",
    LIGHTEN: "lighten",
    COLOR_DODGE: "color-dodge",
    COLOR_BURN: "color-burn",
    HARD_LIGHT: "hard-light",
    SOFT_LIGHT: "soft-light",
    DIFFERENCE: "difference",
    EXCLUSION: "exclusion",
    HUE: "hue",
    SATURATION: "saturation",
    COLOR: "color",
    LUMINOSITY: "luminosity"
};
export class FeBlend extends FilterElement {
    constructor() {
        super("feBlend")
    }
}
defineStringProperty(FeBlend, Attrs.IN2);
defineStringProperty(FeBlend, Attrs.MODE);

export const FeColorMatrixType = {
    MATRIX : "matrix",
    SATURATE : "saturate",
    HUEROTATE : "hueRotate",
    LUMINANCETOALPHA :"luminanceToAlpha"
};
export class FeColorMatrix extends FilterElement {
    constructor() {
        super("feColorMatrix")
    }
}
defineStringProperty(FeColorMatrix, Attrs.IN2);
defineStringProperty(FeColorMatrix, Attrs.TYPE);
defineIntegerProperty(FeColorMatrix, Attrs.VALUES);

export class FeConvolveMatrix extends FilterElement {
    constructor() {
        super("feConvolveMatrix")
    }
}
defineFloatListProperty(FeConvolveMatrix, Attrs.ORDER);
defineFloatListProperty(FeConvolveMatrix, Attrs.KERNELMATRIX);
defineFloatProperty(FeConvolveMatrix, Attrs.DIVISOR);
defineFloatProperty(FeConvolveMatrix, Attrs.BIAS);
defineFloatProperty(FeConvolveMatrix, Attrs.TARGETX);
defineFloatProperty(FeConvolveMatrix, Attrs.TARGETY);
defineStringProperty(FeConvolveMatrix, Attrs.EDGEMODE);
defineBooleanProperty(FeConvolveMatrix, Attrs.PRESERVEALPHA);

export const FuncColorType = {
    IDENTITY : "identity",
    TABLE : "table",
    DISCRETE : "discrete",
    LINEAR : "linear",
    GAMMA : "gamma"
};
export class FeFuncColor extends SVGElement {
    constructor(type) {
        super(type);
    }
}
defineStringProperty(FeFuncColor, Attrs.TYPE);
defineFloatListProperty(FeFuncColor, Attrs.TABLEVALUES);
defineFloatProperty(FeFuncColor, Attrs.SLOPE);
defineFloatProperty(FeFuncColor, Attrs.INTERCEPT);
defineFloatProperty(FeFuncColor, Attrs.AMPLITUDE);
defineFloatProperty(FeFuncColor, Attrs.EXPONENT);
defineFloatProperty(FeFuncColor, Attrs.OFFSET);

export class FeFuncR extends FeFuncColor {
    constructor() {
        super("feFuncR");
    }
}
export class FeFuncG extends FeFuncColor {
    constructor() {
        super("feFuncG");
    }
}
export class FeFuncB extends FeFuncColor {
    constructor() {
        super("feFuncB");
    }
}
export class FeFuncA extends FeFuncColor {
    constructor() {
        super("feFuncA");
    }
}

export class FeComponentTransfer extends FilterElement {
    constructor() {
        super("feComponentTransfer")
    }

    add(element) {
        if (!element instanceof FeFuncColor) {
            throw "Not a funcColor element";
        }
        return super.add(element);
    }
}

export class FeLight extends SVGElement {
    constructor(type) {
        super(type)
    }
}

export class FeDistantLight extends FeLight {
    constructor() {
        super("feDistantLight")
    }
}
defineFloatProperty(FeDistantLight, Attrs.AZIMUTH);
defineFloatProperty(FeDistantLight, Attrs.ELEVATION);

export class FePointLight extends FeLight {
    constructor() {
        super("fePointLight")
    }
}
defineFloatProperty(FePointLight, Attrs.X);
defineFloatProperty(FePointLight, Attrs.Y);
defineFloatProperty(FePointLight, Attrs.Z);

export class FeSpotLight extends FeLight {
    constructor() {
        super("feSpotLight")
    }
}
defineFloatProperty(FeSpotLight, Attrs.X);
defineFloatProperty(FeSpotLight, Attrs.Y);
defineFloatProperty(FeSpotLight, Attrs.Z);
defineFloatProperty(FeSpotLight, Attrs.POINTSATX);
defineFloatProperty(FeSpotLight, Attrs.POINTSATY);
defineFloatProperty(FeSpotLight, Attrs.POINTSATZ);
defineFloatProperty(FeSpotLight, Attrs.SPECULAREXPONENT);
defineFloatProperty(FeSpotLight, Attrs.LIMITINGCONEANGLE);

export class FeLighting extends FilterElement {
    constructor(type) {
        super(type)
    }

    add(element) {
        if (!element instanceof FeLight) {
            throw "Not a light element";
        }
        return super.add(element);
    }
}
defineFloatProperty(FeLighting, Attrs.SURFACESCALE);
defineStringProperty(FeLighting, Attrs.LIGHTING_COLOR);

export class FeFlood extends FilterElement {
    constructor() {
        super("feFlood")
    }
}
defineStringProperty(FeFlood, Attrs.FLOOD_COLOR);
defineFloatProperty(FeFlood, Attrs.FLOOD_OPACITY);

export class FeSpecularLighting extends FeLighting {
    constructor() {
        super("feSpecularLighting")
    }
}
defineFloatProperty(FeSpecularLighting, Attrs.SPECULARCONSTANT);
defineFloatProperty(FeSpecularLighting, Attrs.SPECULAREXPONENT);

export class FeDiffuseLighting extends FeLighting {
    constructor() {
        super("feDiffuseLighting")
    }
}
defineFloatProperty(FeDiffuseLighting, Attrs.DIFFUSECONSTANT);

export const TurbulenceType = {
    FRACTALNOISE : "fractalNoise",
    TURBULENCE : "turbulence"
};
export const StitchTiles = {
    STITCH : "stitch",
    NOSTITCH : "noStitch"
};
export class FeTurbulence extends FilterElement {
    constructor() {
        super("feTurbulence")
    }
}
defineStringProperty(FeTurbulence, Attrs.TYPE);
defineFloatListProperty(FeTurbulence, Attrs.BASEFREQUENCY, " ");
defineFloatProperty(FeTurbulence, Attrs.NUMOCTAVES);
defineFloatProperty(FeTurbulence, Attrs.SEED);
defineFloatProperty(FeTurbulence, Attrs.STITCHTILES);

export const AspectRatios = {
    XMINYMIN : "xMinYMin",
    XMINYMID : "xMinYMid",
    XMINYMAX : "xMinYMax",
    XMIDYMIN : "xMidYMin",
    XMIDYMID : "xMidYMid",
    XMIDYMAX : "xMindYMax",
    XMAXYMIN : "xMaxYMin",
    XMAXYMID : "xMaxYMid",
    XMAXYMAX : "xMaxYMax"
};
export const MeetOrSliceRatios = {
    MEET : "meet",
    SLICE : "slice"
};
export const CrossOrigins = {
    ANONYMOUS : "anonymous",
    USE_CREDENTIALS : "use-credentials"
};
export class FeImage extends FilterElement {
    constructor() {
        super("feImage")
    }
}
defineStringListProperty(FeImage, Attrs.PRESERVEASPECTRATIO);
defineStringProperty(FeImage, Attrs.CROSSORIGIN);
defineStringProperty(FeImage, Attrs.HREF);

export class FeTile extends FilterElement {
    constructor() {
        super("feTile")
    }
}

export class FeOffset extends FilterElement {
    constructor() {
        super("feOffset")
    }
}
defineDimensionProperty(FeOffset, Attrs.DX);
defineDimensionProperty(FeOffset, Attrs.DY);

export const Operators = {
  OVER : "over",
  IN : "in",
  OUT : "out",
  ATOP : "atop",
  XOR : "xor",
  LIGHTER : "lighter",
  ARITHMETIC : "arithmetic"
};
export class FeComposite extends FilterElement {
    constructor() {
        super("feComposite")
    }
}
defineStringProperty(FeComposite, Attrs.OPERATOR);
defineStringProperty(FeComposite, Attrs.IN2);

export class FeMergeMode extends SVGElement {
    constructor() {
        super("feMergeMode")
    }
}
defineStringProperty(FeMergeMode, Attrs.IN);

export class FeMerge extends FilterElement {
    constructor() {
        super("feMerge")
    }

    add(element) {
        if (!(element instanceof FeMergeMode)) {
            throw "Child is not a mege mode."
        }
        super.add(element);
    }
}

export let FilterUnits = {
    USERSPACEONUSE : "userSpaceOnUse",
    OBJECTBOUNDINGBOX: "objectBoundingBox"
};
export let ColorInterpolationFilters = {
    AUTO:"auto",
    SRGB:"sRGB",
    LINEARRGB:"linearRGB"
};

export class Filter extends SVGElement {
    constructor() {
        super("filter");
    }

    add(element) {
        if (!element instanceof FilterElement) {
            throw "Not a filter element";
        }
        return super.add(element);
    }
}
defineXYWidthHeightProperties(Filter);
defineElementProperty(Filter, Attrs.HREF);
defineFloatListProperty(Filter, Attrs.FILTERRES);
defineStringProperty(Filter, Attrs.FILTERUNITS);
defineStringProperty(Filter, Attrs.PRIMITIVEUNITS);
// Ne fonctionne pas sur chrome ?
defineStringProperty(Filter, Attrs.COLOR_INTERPOLATION_FILTER);

export class ForeignObject extends SVGElement {
    constructor(x, y, width, height) {
        super("foreignObject");
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    get innnerHTML() {
        return this._node.innerHTML;
    }

    set innerHTML(innerHTML) {
        this._node.innerHTML = innerHTML;
    }

    addNode(node) {
        matrixOp++;
        dom.appendChild(this._node, node);
        return this;
    }
}
defineXYWidthHeightProperties(ForeignObject);

export const AttributeType = {
    XML : "XML",
    CSS : "CSS",
    AUTO : "auto"
};
export const AnimationFill = {
    FREEZE : "freeze",
    REMOVE : "remove"
};
export const AnimationRestart = {
    ALWAYS : "always",
    WHENNOTACTIVE : "whenNotActive",
    NEVER : "never"
};
export const CalcMode = {
    LINEAR : "linear",
    PACED : "paced",
    DISCRETE : "discrete",
    SPLINE : "spline"
};
export const Additive = {
    SUM : "sum",
    REPLACE : "replace"
};
export const Accumulate = {
    SUM : "sum",
    NONE : "none"
};
export class AbstractAnimate extends SVGElement {
    constructor(type) {
        super(type);
        this.events = new Map();
    }

    on(event, callback) {
        let callbacks = this.events.get(event);
        if (!callbacks) {
            callbacks = new List();
            this.events.set(event, callbacks);
            callbacks.add(callback);
            this._node["on"+event]= event => {
                for (let callback of callbacks) {
                    callback.call(this, event);
                }
            }
        }
    }

    off(event, callback) {
        let callbacks = this.events.get(event);
        if (callbacks) {
            callbacks.remove(callback);
        }
    }

    get keyFrames() {
        let values = this.attrs[Attrs.VALUES];
        let times = this.attrs[Attrs.KEYTIMES];
        let splines = this.attrs[Attrs.KEYSPLINES];
        let length = values ? values.length : times ? times.length : 0;
        let frames = [];
        for (let index=0; index<length; index++) {
            let frame = {};
            values && (frame.value = values[index]);
            times && (frame.time = times[index]);
            splines && (frame.spline = splines[index]);
        }
        return frames;
    }

    set keyFrames(frames) {
        let values=[];
        let times=[];
        let splines=[];
        for (let frame of frames) {
            frame.value!==undefined && values.push(frame.value);
            frame.time!==undefined && times.push(frame.time);
            frame.spline!==undefined && splines.push(frame.spline);
        }
        if (values.length) this.attrs[Attrs.VALUES] = values; else delete this.attrs[Attrs.VALUES];
        if (times.length) this.attrs[Attrs.KEYTIMES] = values; else delete this.attrs[Attrs.KEYTIMES];
        if (splines.length) this.attrs[Attrs.KEYSPLINES] = values; else delete this.attrs[Attrs.KEYSPLINES];
    }
}
defineElementProperty(AbstractAnimate, Attrs.HREF);
defineAttributeProperty(AbstractAnimate, Attrs.ATTRIBUTENAME);
defineStringProperty(AbstractAnimate, Attrs.ATTRIBUTETYPE);
defineClockProperty(AbstractAnimate, Attrs.DUR);
defineClockProperty(AbstractAnimate, Attrs.MIN);
defineClockProperty(AbstractAnimate, Attrs.MAX);
defineAnyProperty(AbstractAnimate, Attrs.REPEATCOUNT);
defineStringProperty(AbstractAnimate, Attrs.FILL);
defineStringProperty(AbstractAnimate, Attrs.BEGIN);
defineStringProperty(AbstractAnimate, Attrs.END);
defineStringProperty(AbstractAnimate, Attrs.RESTART);
defineClockProperty(AbstractAnimate, Attrs.REPEATDUR);
defineFloatListProperty(AbstractAnimate, Attrs.VALUES, "; ");
defineFloatListProperty(AbstractAnimate, Attrs.KEYTIMES, "; ");
defineListOfFloatListProperty(AbstractAnimate, Attrs.KEYSPLINES, "; ", " ");
defineStringProperty(AbstractAnimate, Attrs.CALCMODE);
defineStringProperty(AbstractAnimate, Attrs.ADDITIVE);
defineStringProperty(AbstractAnimate, Attrs.ACCUMULATE);

export class Animate extends AbstractAnimate {
    constructor() {
        super("animate");
    }
}
Animate.INDEFINITE = "indefinite";
defineDimensionProperty(Animate, Attrs.FROM);
defineDimensionProperty(Animate, Attrs.TO);
defineDimensionProperty(Animate, Attrs.BY);

export const MotionRotate = {
    AUTO : "auto",
    AUTO_REVERSE : "auto-reverse"
};
export class AnimateMotion extends AbstractAnimate {
    constructor() {
        super("animateMotion");
    }
}
defineDirectiveProperty(AnimateMotion, Attrs.PATH);
defineElementProperty(AnimateMotion, Attrs.MPATH);
defineAnyProperty(AnimateMotion, Attrs.ROTATE);

export const TransformType = {
    TRANSLATE : "translate",
    SCALE : "scale",
    ROTATE : "rotate",
    SKEWX : "skewX",
    SKEWY : "skewY"
};
export class AnimateTransform extends AbstractAnimate {
    constructor() {
        super("animateTransform");
    }
}
defineStringProperty(AnimateTransform, Attrs.TYPE);
defineFloatListProperty(AnimateTransform, Attrs.FROM, " ");
defineFloatListProperty(AnimateTransform, Attrs.TO, " ");
defineFloatListProperty(AnimateTransform, Attrs.BY, " ");

export const GradientUnit = {
    USERSPACEONUSE : "userSpaceOnUse",
    OBJECTBOUNDINGBOX : "objectBoundingBox"
};
export const SpreadMethod = {
    PAD : "pad",
    REPEAT : "repeat",
    REFLECT : "reflect"
};
export class GradientStop extends SVGElement {
    constructor() {
        super("stop");
    }
}
defineDimensionProperty(GradientStop, Attrs.OFFSET);
defineStringProperty(GradientStop, Attrs.STOP_COLOR);
defineStringProperty(GradientStop, Attrs.STOP_OPACITY);

export class Gradient extends SVGElement {
    constructor(type) {
        super(type);
    }

    add(element) {
        if (!element instanceof GradientStop) {
            throw "Not a gradient stop element";
        }
        return super.add(element);
    }
}
defineStringProperty(Gradient, Attrs.GRADIENTUNIT);
defineStringProperty(Gradient, Attrs.SPREADMETHOD);
defineStringProperty(Gradient, Attrs.GRADIENTTRANSFORM);
defineElementProperty(Gradient, Attrs.HREF);

export class LinearGradient extends Gradient {
    constructor() {
        super("linearGradient");
    }
}
defineDimensionProperty(LinearGradient, Attrs.X1);
defineDimensionProperty(LinearGradient, Attrs.Y1);
defineDimensionProperty(LinearGradient, Attrs.X2);
defineDimensionProperty(LinearGradient, Attrs.Y2);

export class RadialGradient extends Gradient {
    constructor() {
        super("radialGradient");
    }
}
defineDimensionProperty(RadialGradient, Attrs.CX);
defineDimensionProperty(RadialGradient, Attrs.CY);
defineDimensionProperty(RadialGradient, Attrs.R);
defineDimensionProperty(RadialGradient, Attrs.FX);
defineDimensionProperty(RadialGradient, Attrs.FY);

export const Colors = {
    NONE: "none",
    INHERIT : "inherit",
    CRIMSON: "#dc143c",
    DARKEST_GREY: "#303030",
    DARK_GREY: "#505050",
    GREY: "#808080",
    LIGHT_GREY: "#C0C0C0",
    MIDDLE_GREY: "#A0A0A0",
    LIGHTEST_GREY: "#ECECEC",
    BLACK: "#0F0F0F",
    RED: "#F00F0F",
    BLUE: "#0F0FF0",
    GREEN: "#0FF00F",
    WHITE: "#FFFFFF",
    PINK: "#FFD8CC"
};

export function l2m(matrix, ...points) {
    let result = [];
    for (let index=0; index<points.length; index+=2) {
        let x = points[index];
        let y = points[index+1];
        result.push(matrix.x(x, y), matrix.y(x, y));
    }
    return result;
}

export function l2l(sourceMatrix, targetMatrix, ...points) {
    let matrix = sourceMatrix.multLeft(targetMatrix.invert());
    return l2m(matrix, ...points);
}

export const Mutation = {
    CHILDLIST : "childlist",
    ATTRIBUTES : "attributes"
};
