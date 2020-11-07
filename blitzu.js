/**
 * Created by David on 11/10/2016.
 * Blitzu Cyclops 120H Simulator by David H. Brown is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * Update 2016-12-04 to trigger long press via window.setTimeout instead of on release to better match actual device.
 */

 // the (function() {...})(); idiom hides all these names in a namespace to avoid conflicts with other code.
(function () {
    'use strict';
    /**
     * Manage the state of the lamp
     * @type {{_j: null, _e: null, selector: string, _allClasses: string, _setTo: function, setHigh: lamp.setHigh, setMid: lamp.setMid, setLow: lamp.setLow, setOff: lamp.setOff, setFlashHigh: lamp.setFlashHigh, setStrobeHigh: lamp.setStrobeHigh, setFlashLow: lamp.setFlashLow, init: lamp.init}}
     */
    var lamp = {
        _j: null, //initialized to jQuery object
        _e: null, //initialized to DOM element
        selector: "#lamp",
        _allClasses: "lamp-low lamp-mid lamp-high lamp-off lamp-flash-low lamp-flash-high lamp-strobe-high lamp-fade ",
        /**
         * We're implementing the lamp states as CSS classes. While the lamp can be in only one state at a time,
         * a DOM Element can have multiple classes. So, after we add the desired class for the lamp state, we
         * must remove all the other classes.
         * @param whichClass
         * @private
         */
        _setTo: function (whichClass) {
     lamp._j.addClass(whichClass).removeClass(lamp._allClasses.replace(whichClass, ""));
 },
 setHigh: function () {          lamp._setTo("lamp-high");
        },
        setMid: function () {
            lamp._setTo("lamp-mid");
        },
        setLow: function () {
            lamp._setTo("lamp-low");
        },
        setOff: function () {
            lamp._setTo("lamp-fade");
        },
        setFlashHigh: function () {
            lamp._setTo("lamp-flash-high")
        },
        setStrobeHigh: function () {
            lamp._setTo("lamp-strobe-high")
        },
        setFlashLow: function () {
            lamp._setTo("lamp-flash-low")
        },
        init: function () {
            // cache the jQuery object of the lamp
            lamp._j = $(lamp.selector);
            // cache the DOM Element of the lamp
            lamp._e = lamp._j[0];
            // After fading, the lamp's class should be off. Conveniently,
            // we can use the animation end event because the fade is the
            // only lamp animation that ends (flash and strobe are infinite).
            lamp._j.on('animationend webkitAnimationEnd', function () {
                lamp._setTo('lamp-off');
            });
        }
    };

    /**
     * The button measures the interval between press and release, and on release sends either the doLong or doShort
     * message to the controller.
     * Updated 2018-09 to add/remove "pressed" class to show button presses more clearly.
     * @type {{selector: string, _threshold: number, _pressedAt: Date, doPress: button.doPress, doRelease: button.doRelease, init: button.init}}
     */
    var button = {
        selector: "#button",
        _j: null, //initialized to jQuery object
        _timeout: 0, // value returned by setTimeout
        _threshold: 1500, // ms to trigger a long press instead of short
        // _pressedAt: null,
        doPress: function (e) {
            e.preventDefault();
            button._j.addClass("pressed");
            // button._pressedAt = new Date();
            // console.log("Received a button press by " + e.type);
            button._timeout = window.setTimeout(button.timeout, button._threshold);
        },
        doRelease: function (e) {
            e.preventDefault();
            button._j.removeClass("pressed");
            // console.log("Button released by " + e.type);
/*
            var elapsed = new Date() - button._pressedAt;
            window.clearTimeout(button._timeout);
            console.log("Received a button release from " + e.type + " after " + elapsed + "ms");
            if (elapsed > button._threshold) {
                controller.doLong();
            } else {
                controller.doShort();
            }
*/
            /* 0 if timeout was reached */
            if(button._timeout) {
                window.clearTimeout(button._timeout);
                // console.log("Released before timeout threshold; doing short press.");
                controller.doShort();
            }
            else {
             // console.log("Release ignored; already processed by timeout.");
            }
        },

        timeout: function() {
            //console.log("Timeout reached; doing long press.");
            button._timeout = 0;
            controller.doLong();
        },
        init: function () {
            // considered also responding to touchstart/touchend and pointerdown/pointerup, but that caused duplicate responses as
            // browsers that support those events also emit mouse events for backwards compatibility.
            // trying again with touch to see if preventDefault fixes the duplicates
            button._j = $(button.selector);
            button._j.on('mousedown touchstart', button.doPress).on('mouseup touchend', button.doRelease);
        }
    };

    /**
     * The controller responds to doShort and doLong messages by performing
     * @type {{doShort: controller.doShort, doLong: controller.doLong, _currentState: ControllerState, init: controller.init}}
     */
    var controller = {
        doShort: function () {
            var next = controller._currentState.shortSuccessor;
            // console.log("Short press is transitioning to " + next);
            controller._currentState.onExit();
            controller._currentState = ControllerState.states[next];
            controller._currentState.onEnter();
        },
        doLong: function () {
            var next = controller._currentState.longSuccessor;
            // console.log("Long press is transitioning to " + next);
            controller._currentState.onExit();
            controller._currentState = ControllerState.states[next];
            controller._currentState.onEnter();
        },
        _currentState: null,
        init: function () {
            controller._currentState = ControllerState.states.off;
        }

    };

// In classic JavaScript (pre ES6 which adds a class keyword), you start a class by writing its constructor function
    /**
     * Pass an object containing any properties for which you wish to override the prototype
     * @param props
     * @constructor
     */
    var ControllerState = function (props) {
        // I'm going
        if (props && props['onEnter']) {
            this.onEnter = props['onEnter'];
        }
        if (props && props['onExit']) {
            this.onExit = props['onExit'];
        }
        if (props && props['shortSuccessor']) {
            this.shortSuccessor = props['shortSuccessor'];
        }
        if (props && props['longSuccessor']) {
            this.longSuccessor = props['longSuccessor'];
        }
    };

// After writing the constructor function, you assign to it a new property, "prototype"
// This is perfectly normal in JavaScript; almost everything is an object and objects are just
// mutable hashes of name:value pairs.
    /**
     * Default values for the ControllerState. The shortSuccessor and longSuccessor properties are
     * the names of the ControllerState.states, not references to the objects themselves. This avoids
     * chicken-vs-egg problems during initialization. The onEnter function will be overridden with
     * one of the lamp.set* functions, but in this simple state machine, onExit is not really needed and remains
     * the do-nothing default function. (The "do" functionality is handled by the browser using CSS animations.)
     * The default longSuccessor is "off" so need not be overridden except for the off state.
     * @type {{constructor: ControllerState, onEnter: function, onExit: function, shortSuccessor: string, longSuccessor: string}}
     */
    ControllerState.prototype = {
        constructor: ControllerState, // back-reference to allow new `ControllerState(...);` to work properly
        // default properties:
        onEnter: function () {
        },
        onExit: function () {
        },
        shortSuccessor: "high",
        longSuccessor: "off"
    };

// Other properties added to the constructor function are a bit like static properties/methods in Java.
// They won't be inherited because they're not part of the .prototype.
// It made sense to store the finite set of state instances in the ControllerState.
    /**
     * A namespace to hold the ControllerState instances.
     * @type {{off: ControllerState, low: ControllerState, mid: ControllerState, high: ControllerState, flash_high: ControllerState, strobe: ControllerState, flash_low: ControllerState}}
     */
    ControllerState.states = {
        off: new ControllerState({
            onEnter: lamp.setOff,
            shortSuccessor: "low",
            longSuccessor: "flash_high"
        }),
        low: new ControllerState({onEnter: lamp.setLow, shortSuccessor: "mid"}),
        mid: new ControllerState({onEnter: lamp.setMid, shortSuccessor: "high"}),
        high: new ControllerState({onEnter: lamp.setHigh, shortSuccessor: "low"}),
        flash_high: new ControllerState({
            onEnter: lamp.setFlashHigh,
            shortSuccessor: "strobe"
        }),
        strobe: new ControllerState({
            onEnter: lamp.setStrobeHigh,
            shortSuccessor: "flash_low"
        }),
        flash_low: new ControllerState({
            onEnter: lamp.setFlashLow,
            shortSuccessor: "flash_high"
        })
    };
// The "new" keyword, by the way, is syntactic sugar for creating a new object
// that first inherits (references) the properties in the constructor's prototype and then
// invokes the constructor function on that object.

    var warning = {
        init: function () {
            $(button.selector).prop("disabled", true);
            $("#warning button").click(warning.accept);
        },
        accept: function () {
            $("#warning").fadeOut();
            $(button.selector).prop("disabled", false);
            lamp.init();
            controller.init();
            button.init();
        }
    }

// Use jQuery to defer initialization routines that depend on the DOM
    $(warning.init);
})();