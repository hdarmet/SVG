'use strict';

import {Rect, Rotation, Translation, Scaling, Path, Ellipse, Line, Polygon, Polyline, M, L, RasterImage,
    SvgImage, SvgRasterImage, MouseEvents, ClipPath, Circle, Svg, Animate, Attrs, Stroke, AttributeType, AnimationFill} from "./svgbase.js";
import {Animation, Serial, Parallel, play, animate} from "./animator.js";

function testSvg4() {
    let rect = new Rect(-50, -50, 100, 100).attrs({id:"rect", stroke: Stroke.NONE, fill: "#0000ff"});
    let circle = new Circle(150, 100, 50).attrs({id:"circle", stroke: Stroke.NONE, fill: "#00ff00", opacity:0});
    /*
    new Serial(
        new Parallel(
            new Animation(rect, 2000, {attr:"x", to:100}, {attr:"y", to:50}, {attr:"opacity", to:0}),
            new Animation(circle, 2000, {attr:"cx", to:50}, {attr:"cy", to:50}, {attr:"opacity", to:1})
        ),
        new Parallel(
            new Animation(rect, 2000, {attr:"x", to:0}, {attr:"y", to:0}, {attr:"opacity", to:1}),
            new Animation(circle, 2000, {attr:"cx", to:150}, {attr:"cy", to:100}, {attr:"opacity", to:0})
        )
    ).apply();
    */
    play(
        play(
            animate(rect, 2000,
                {attr:"x", to:100}, {attr:"y", to:50}, {attr:"opacity", to:0},
                {attr:"transform", type:"rotate", to:[360, 0, 0]})
                .on("begin", ()=>{console.log("begin")})
                .on("end", ()=>{console.log("end")}),
            animate(circle, 2000,
                {attr:"cx", to:50}, {attr:"cy", to:50}, {attr:"opacity", to:1})
        ).then(
            animate(rect, 2000,
                {attr:"x", to:50}, {attr:"y", to:150}, {attr:"opacity", to:1}),
            animate(circle, 2000,
                {attr:"cx", to:50}, {attr:"cy", to:150}, {attr:"opacity", to:0})
        ).then(
            animate(rect, 2000,
                {attr:"x", to:150}, {attr:"y", to:50}, {attr:"opacity", to:0}),
            animate(circle, 2000,
                {attr:"cx", to:100}, {attr:"cy", to:150}, {attr:"opacity", to:1})
        )
    ).then(
        animate(rect, 2000, {attr:"x", to:0}, {attr:"y", to:0}, {attr:"opacity", to:1}),
        animate(circle, 2000, {attr:"cx", to:150}, {attr:"cy", to:100}, {attr:"opacity", to:0})
    )
    .on("end", ()=>{console.log("final end")})
    .go();

    let svg = new Svg(2000, 1000)
        .add(rect).add(circle)
        .attach(document.body);
}

function testSvg3() {
    let rect = new Rect(1, 1, 100, 100).attrs({id:"rect", stroke: Stroke.NONE, fill: "#0000ff"});
    let animation = new Animate().attrs({
        href:rect, attributeName: Attrs.WIDTH, attributeType: AttributeType.CSS,
        from:1, to:100, dur:2000/*, by:1000*/,
        repeatCount:Animate.INDEFINITE, fill:AnimationFill.FREEZE
    });
    let svg = new Svg(2000, 1000)
        .add(rect).add(animation)
        .attach(document.body);
}

function testSvg1() {
    let mask = new Mask("mask2", 0, 0, 100, 100)
        .add(new Circle(25, 25, 25).attrs({stroke: Stroke.NONE, fill: "#ffffff"}));
    let svg = new Svg(2000, 1000)
        .addDef(mask)
        .add(new Rect(1, 1, 100, 100).attrs({stroke: Stroke.NONE, fill: "#0000ff", mask: mask}))
        .add(new Rotation(45, 0, 0).add(
            new ForeignObject(100, 100, 200, 50).attrs({innerHTML: '<input xmlns="http://www.w3.org/1999/xhtml"></input>'}))
        )
        .attach(document.body);
}

function testSvg2() {
    let svg = new Svg(2000, 1000);
    let root = new Translation(50, 50);
    let rot = new Rotation(45, 0, 0);
    let scale = new Scaling(0.5, 0.5, 0, 0);
    let rect = new Rect(0, 0, 500, 250);
    let circle = new Circle(100, 100, 100);
    let ellipse = new Ellipse(200, 100, 100, 150);
    let line = new Line(100, 200, 200, 100);
    let polygon = new Polygon([150, 250], [250, 100], [0, 0]);
    let polyline = new Polyline([250, 350], [350, 200], [100, 100]);
    let path = new Path(M(350, 450), L(450, 300), L(200, 200), L(350, 450));
    let clipPath = new ClipPath("cp").add(new Rect(100, 100, 100, 100));
    let image = new RasterImage("images/home.png");
    let bigImage = new RasterImage("images/home.png", 50, 50, 300, 200);
    let svgImage = new SvgImage("images/comments_on.svg", 100, 100, 80, 80);
    let svgRasterImage = new SvgRasterImage("images/comments_on.svg", 100, 100, 80, 80);
    let svgRasterImage2 = new SvgRasterImage("images/comments_on.svg", 100, 100, 80, 80);

    root.attrs({fill: "green", stroke: "black"});
    root.stroke_width = 5;
    rect.on(MouseEvents.CLICK, event => console.log("clicked1:" + event));
    rect.on(MouseEvents.CLICK, event => console.log("clicked2:" + event));
    rect.rx = 3;
    rect.ry = 3;
    rect.onDrag(
        event => console.log("start1 : " + event.clientX + " " + event.clientY),
        event => {
            console.log("move1 : " + event.clientX + " " + event.clientY);
            if (event.clientX > 500) {
                rect.onDrag(
                    event => console.log("start2 : " + event.clientX + " " + event.clientY),
                    event => console.log("move2 : " + event.clientX + " " + event.clientY),
                    event => console.log("drop2 : " + event.clientX + " " + event.clientY)
                )
            }
        },
        event => console.log("drop1 : " + event.clientX + " " + event.clientY)
    );

    svg.add(root);
    svg.addDef(clipPath);
    root.add(rot);
    rot.add(scale);
    scale.add(rect);
    scale.add(circle);
    scale.add(ellipse);
    scale.add(line);
    scale.add(polygon);
    scale.add(polyline);
    scale.add(path);
    root.add(image);
    rot.add(bigImage);
    rot.add(svgImage);
    root.add(svgRasterImage);
    root.add(svgRasterImage2);
    scale.clip_path = clipPath;
    svg.attach(document.body);

    setTimeout(() => {
        image.x = 200;
        image.y = 100;
        image.width = 200;
        image.height = 200;

        svgImage.x = 0;
        svgImage.width = 160;

        svgRasterImage.x = 300;
        svgRasterImage.width = 100;
        svgRasterImage.height = 100;
    }, 1000);
}

//testSvg1();
//testSvg2();
//testSvg4();

function testSvg5() {
    let svg = new Svg(2000, 1000);
    let root = new Translation(50, 50);
    let rect = new Rect(0, 0, 500, 250);
    let clipPath = new ClipPath("cp").add(new Rect(100, 100, 100, 100));

    svg.add(root.add(rect));
    root.add(clipPath);
    rect.clip_path = clipPath;
    svg.attach(document.body);
}

testSvg5();
