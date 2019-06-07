import {List, Attrs, Animate, AnimateMotion, AnimateTransform, AnimationFill} from "./svgbase.js";

let animationCount = 0;

export class AbstractAnimation {
    constructor() {
    }

    on(event, callback) {
        if (!this.events) {
            this.events = new Map();
        }
        let callbacks = this.events.get(event);
        if (!callbacks) {
            callbacks = new List();
            this.events.set(event, callbacks);
        }
        callbacks.push(callback);
        return this;
    }

    off(event, callback) {
        if (this.events) {
            let callbacks = this.events.get(event);
            if (callbacks) {
                if (callbacks.remove(callback)) {
                    if (callbacks.empty()) {
                        this.events.delete(event);
                        if (!this.events.size) {
                            delete this.events;
                        }
                    }
                }
            }
        }
        return this;
    }

    _setEvent(event, animate) {
        if (this.events) {
            let callbacks = this.events.get(event);
            if (callbacks) {
                for (let callback of callbacks) {
                    animate.on(event, callback);
                }
            }
        }
    }

    apply() {
        let bounds = this._apply();
        this._setEvent("begin", bounds.start);
        this._setEvent("end", bounds.last);
        return bounds;
    }
}

export class Animation extends AbstractAnimation {
    constructor(element, delay, ...values) {
        super();
        this.element = element;
        this.delay = delay;
        this.values = [...values];
    }

    add(value) {
        this.values.add(value);
    }

    _apply() {
        let animates = [];
        let startAnimate = null;
        let animate = null;
        for (let value of this.values) {
            if (value.attr===Attrs.TRANSFORM) {
                animate = new AnimateTransform().attrs({
                    id: "a" + animationCount++,
                    attributeName: value.attr,
                    type: value.type,
                    to: value.to,
                    dur: this.delay,
                    fill: AnimationFill.FREEZE
                });
            }
            else if (value.attr===Attrs.MOTION) {
                animate = new AnimateMotion().attrs({
                    id: "a" + animationCount++,
                    path: value.path,
                    dur: this.delay,
                    fill: AnimationFill.FREEZE
                });
            }
            else {
                animate = new Animate().attrs({
                    id: "a" + animationCount++,
                    attributeName: value.attr,
                    to: value.to, dur: this.delay,
                    fill: AnimationFill.FREEZE
                });
            }
            if (value.from) {
                animate.from = value.from;
            }
            if (!startAnimate) {
                startAnimate = animate;
            }
            else {
                animate.begin = startAnimate.id+".begin";
            }
            animates.push({animate:animate, element:this.element});
            this.element.add(animate);
        }
        return {
            animates: animates,
            start: startAnimate,
            last: startAnimate,
            delay: startAnimate.dur
        };
    }

}

export class Parallel extends AbstractAnimation {

    constructor(...animations) {
        super();
        this.animations = animations;
    }

    add(animation) {
        this.animations.push(animation);
        return this;
    }

    _apply() {
        let animates = [];
        let startAnimate = null;
        let lastAnimate = null;
        let delay=-1;
        for (let animation of this.animations) {
            let bounds = animation.apply();
            if (!startAnimate) {
                startAnimate = bounds.start;
            }
            else {
                bounds.start.begin = startAnimate.id+".begin";
            }
            if (delay < bounds.delay) {
                delay = bounds.delay;
                lastAnimate = bounds.last;
            }
            animates.push(...bounds.animates);
        }
        return {
            animates : animates,
            start : startAnimate,
            last : lastAnimate,
            delay: lastAnimate.dur
        }
    }

}

export class Serial extends AbstractAnimation {
    constructor(...animations) {
        super();
        this.animations = animations;
    }

    add(animation) {
        this.animations.push(animation);
        return this;
    }

    _apply() {
        let animates = [];
        let startAnimate = null;
        let lastAnimate = null;
        let dur = 0;
        for (let animation of this.animations) {
            let bounds = animation.apply();
            if (!startAnimate) {
                startAnimate = bounds.start;
            }
            else {
                bounds.start.begin = lastAnimate.id+".end";
            }
            lastAnimate = bounds.last;
            dur += bounds.delay;
            animates.push(...bounds.animates);
        }
        return {
            animates : animates,
            start : startAnimate,
            last : lastAnimate,
            delay: dur
        }
    }
}

export class Animator {

    buildAnimations(animators) {
        let animations = new List();
        for (let animator of animators) {
            animations.add(animator.animation);
        }
        return animations;
    }

    then(...animators) {
        return new SerialAnimator(this, new ParallelAnimator(animators));
    }

    go() {
        let bounds = this.animation.apply();
        bounds.last.on("end", function() {
            for (let animate of bounds.animates) {
                animate.element.remove(animate.animate);
            }
        })
    }

    on(event, callback) {
        this.animation.on(event, callback);
        return this;
    }

    off(event, callback) {
        this.animation.off(event, callback);
        return this;
    }
}

export class ElementAnimator extends Animator {

    constructor(element, delay, ...values) {
        super();
        this.animation = new Animation(element, delay, ...values);
    }

}

export class ParallelAnimator extends Animator {

    constructor(animators) {
        super();
        this.animation = new Parallel(...this.buildAnimations(animators))
    }

}

export class SerialAnimator extends Animator {

    constructor(...animators) {
        super();
        this.animation = new Serial(...this.buildAnimations(animators));
    }

    then(...animators) {
        this.animation.add(
            new Parallel(...this.buildAnimations(animators))
        );
        return this;
    }

}

export function animate(element, delay, ...values) {
    return new ElementAnimator(element, delay, ...values);
}

export function play(...animators) {
    let animator = new ParallelAnimator(animators);
    return animator;
}