$(document).ready(function() {

    var el = {
            runner: $('.block__runner'),
            control: $('.block__control'),
            prev: $('.block__prev'),
            next: $('.block__next'),

            out: $('#out')
        },
        dragging = false,
        start = {},
        delta = {},
        out = {};

    if (navigator.pointerEnabled && el.control[0].addEventListener) {

        el.control[0].addEventListener('pointerdown', touchstart, false);
        el.control[0].addEventListener('pointermove', touchmove, true);
        el.control[0].addEventListener('pointerup', touchend, false);
        el.control[0].addEventListener('pointerleave', touchend, false);
        el.control[0].addEventListener('pointercancel', touchend, false);

    } else {

        el.control
            .on('mousedown', touchstart)
            .on('mousemove', touchmove)
            .on('mouseup', touchend)
            .on('mouseleave', touchend);

    }

    function touchstart(e) {
        console.log(e.type);
        if (!dragging) {
            dragging = true;
        }
    }

    function touchmove(e) {
        if (dragging) {
            var x = e.pageX || e.originalEvent.touches[0].pageX,
                y = e.pageY || e.originalEvent.touches[0].pageY;

            if (!start.x && !start.y) {

                // Start drag
                start = {x: x, y: y};
                delta = {x: 0, y: 0};

            } else {

                // Dragging
                delta = {
                    x: start.x - x,
                    y: start.y - y
                };

            }
            console.log(e.type + ' ' + delta.x + ' ' + delta.y);

            e.preventDefault();
        }
    }

    function touchend(e) {
        console.log(e.type);

        // Stop drag
        dragging = false;
        start = {};
    }

    console.log = function(str) {
        var old = el.out.html();

        el.out.html(old + '<br>' + str);
    };

});