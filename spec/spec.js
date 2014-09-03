var expect = chai.expect,
    assert = chai.assert;


describe("Photor", function() {

    var photorContainer,
        photorImages,
        caseTitle;

    /* 1. Empty container */
    photorContainer = $('#photor-1'),
    photorImages = photorContainer.find('.photor__viewportLayer > img'),
    caseTitle = photorContainer.attr('title');

    describe(caseTitle, function() {
        var message;

        try {
            var photor = new Photor(photorContainer[0]);
        } catch(e) {
            message = e.message;
        }

        it("Photor sent a message", function() {
            expect(message).to.equal("Requires more slides");
        });
    });

    /* 2. One image */
    photorContainer = $('#photor-2'),
    photorImages = photorContainer.find('.photor__viewportLayer > img'),
    caseTitle = photorContainer.attr('title');

    describe(caseTitle, function() {
        var photor = new Photor(photorContainer[0]);

        testConstructor(photor);
        testDOM(photor, photorContainer, photorImages);
        testSlides(photor, photorContainer, photorImages);
        testThumbs(photor, photorContainer, photorImages);

        it("Photor setted a modifier '_single'", function() {
            assert.typeOf(photor._bViewportHeight, 'number');
        });
    });

    /* 3. Two images */
    photorContainer = $('#photor-3'),
    photorImages = photorContainer.find('.photor__viewportLayer > img'),
    caseTitle = photorContainer.attr('title');

    describe(caseTitle, function() {
        var photor = new Photor(photorContainer[0]);

        testConstructor(photor);
        testDOM(photor, photorContainer, photorImages);
        testSlides(photor, photorContainer, photorImages);
        testThumbs(photor, photorContainer, photorImages);
    });

    /* 4. Three images */
    photorContainer = $('#photor-4'),
    photorImages = photorContainer.find('.photor__viewportLayer > img'),
    caseTitle = photorContainer.attr('title');

    describe(caseTitle, function() {
        var photor = new Photor(photorContainer[0]);

        testConstructor(photor);
        testDOM(photor, photorContainer, photorImages);
        testSlides(photor, photorContainer, photorImages);
        testThumbs(photor, photorContainer, photorImages);
    });

    /* 5. Five images */
    photorContainer = $('#photor-5'),
    photorImages = photorContainer.find('.photor__viewportLayer > img'),
    caseTitle = photorContainer.attr('title');

    describe(caseTitle, function() {
        var photor = new Photor(photorContainer[0]);

        testConstructor(photor);
        testDOM(photor, photorContainer, photorImages);
        testSlides(photor, photorContainer, photorImages);
        testThumbs(photor, photorContainer, photorImages);
    });

    /* 5. Five images with control */
    photorContainer = $('#photor-6'),
    photorImages = photorContainer.find('.photor__viewportLayer > img'),
    caseTitle = photorContainer.attr('title');

    describe(caseTitle, function() {
        var photor = new Photor(photorContainer[0]);

        testConstructor(photor);
        testDOM(photor, photorContainer, photorImages);
        testSlides(photor, photorContainer, photorImages);
        testThumbs(photor, photorContainer, photorImages);
        testControl(photor, photorContainer);
    });

    /* 6. Rich images */
    photorContainer = $('#photor-7'),
    photorImages = photorContainer.find('.photor__viewportLayer > img'),
    caseTitle = photorContainer.attr('title');

    describe(caseTitle, function() {
        var photor = new Photor(photorContainer[0]);

        testConstructor(photor);
        testDOM(photor, photorContainer, photorImages);
        testSlides(photor, photorContainer, photorImages);
        testThumbs(photor, photorContainer, photorImages);
        testControl(photor, photorContainer);
        testImagesProperties(photor, photorContainer);
    });

});


function testConstructor(photor) {
    describe("Constructor", function() {

        it("Type of instance is object", function() {
            assert.typeOf(photor, 'object');
        });

        it("Instance has params", function() {
            assert.typeOf(photor._params, 'object');
        });

        it("Width of viewport is number", function() {
            assert.typeOf(photor._bViewportWidth, 'number');
        });

        it("Height of viewport is number", function() {
            assert.typeOf(photor._bViewportHeight, 'number');
        });

    });
}

function testDOM(photor, photorContainer, photorImages) {
    describe("DOM", function() {

        it("Root node has property '_photor'", function() {
            assert.property(photorContainer[0], '_photor');
            assert.typeOf(photorContainer[0]._photor, 'object');
        });

        it("Slides were created", function() {
            var slides = photorContainer.find('.' + photor._params.slide);

            assert.lengthOf(slides, photorImages.length)
        });

        if (photor._params.showThumbs == 'thumbs') {
            testDOMThumbs(photor, photorContainer, photorImages);
        }

    });
}

function testSlides(photor, photorContainer, photorImages) {
    describe("Slides", function() {
        var count = photorImages.length;

        it("Length of array with slides data is equal to count of slides", function() {
            assert.lengthOf(photor.slides, count);
        });

        it("Length of array with slides DOM-elements is equal to count of slides", function() {
            assert.lengthOf(photor.blSlides, count);
        });

        it("Current slide was chosen correctly", function() {
            var currentIndex = photor._params.current,
                currentClass = photor._params._current,
                slideElement = photorContainer.find('.' + photor._params.slide).eq(currentIndex);

            assert.equal(slideElement.hasClass(currentClass), true);
        });

    });
}

function testDOMThumbs(photor, photorContainer, photorImages) {
    it("Count of thumbnails is equal to count of slides", function() {
        var count = photorImages.length,
            thumbs = photorContainer.find('.' + photor._params.thumb);

        assert.lengthOf(thumbs, count);
    });

    it("Current thumb was chosen correctly", function() {
        var currentIndex = photor._params.current,
            currentClass = photor._params._current,
            thumbElement = photorContainer.find('.' + photor._params.thumb).eq(currentIndex);

        assert.equal(thumbElement.hasClass(currentClass), true);
    });

    it("Images of thumbnails exist", function() {
        var thumb = photorContainer.find('.' + photor._params.thumb);

        thumb.each(function() {
            var img = $(this).find('.' + photor._params.thumbImg);

            assert.lengthOf(img, 1);
            assert.ok(!!img[0].src);
        });
    });

    it("Frame exists", function() {
        var frame = photorContainer.find('.' + photor._params.thumbFrame);

        assert.lengthOf(frame, 1);
    });

    // it("Frame has correct size", function() {
    //     var currentIndex = photor._params.current,
    //         currentClass = photor._params._current,
    //         thumbElement = photorContainer.find('.' + photor._params.thumb).eq(currentIndex),
    //         thumbImage = thumbElement.find('.' + photor._params.thumbImg),
    //         frame = photorContainer.find('.' + photor._params.thumbFrame),
    //         img = new Image();

    //     img.onload = function() {
    //         assert.equal(frame.outerWidth(), thumbElement.outerWidth());
    //         assert.equal(frame.outerHeight(), thumbElement.outerHeight());
    //     }

    //     img.src = thumbImage[0].src;
    // });
}

function testThumbs(photor, photorContainer, photorImages) {
    describe("Thumbs", function() {
        var count = photorImages.length;

        it("Frame property exists", function() {
            assert.property(photor, 'bThumbFrame');
            assert.typeOf(photor.bThumbFrame, 'object');
        });

        it("Thumbs container exists", function() {
            assert.property(photor, 'bThumbs');
            assert.typeOf(photor.bThumbs, 'object');
        });

        it("Thumbs layer exists", function() {
            assert.property(photor, 'bThumbsLayer');
            assert.typeOf(photor.bThumbsLayer, 'object');
        });

        it("Length of array with thumbs DOM-elements is equal to count of slides", function() {
            assert.lengthOf(photor.blThumbs, count);
        });

        it("Photor knows size of container with thumbs", function() {
            assert.property(photor, '_bThumbsWidth');
            assert.property(photor, '_bThumbsHeight');
            assert.typeOf(photor._bThumbsWidth, 'number');
            assert.typeOf(photor._bThumbsHeight, 'number');
        });

        it("Photor knows size and offset of layer with thumbs", function() {
            // assert.property(photor, '_bThumbsLayerWidth');
            assert.property(photor, '_bThumbsLayerOffsetX');
            // assert.typeOf(photor._bThumbsLayerWidth, 'number');
            assert.typeOf(photor._bThumbsLayerOffsetX, 'number');
        });

    });
}

function testControl(photor, photorContainer) {
    describe("Control", function() {

        it("Control exists", function() {
            assert.property(photor, 'bControl');
            assert.typeOf(photor.bControl, 'object');
        });

        it("Buttons exists", function() {
            assert.property(photor, 'btnPrev');
            assert.property(photor, 'btnNext');
            assert.typeOf(photor.btnPrev, 'object');
            assert.typeOf(photor.btnNext, 'object');
        });

    });
}

function testImagesProperties(photor, photorContainer) {
    describe("Images properties", function() {

        it("Custom class in instance object", function() {
            assert.equal(photor.slides[0].classes, 'my-custom-class');
        });

        it("Custom class on slide element", function() {
            var firstSlide = photorContainer.find('.' + photor._params.slideImg).eq(0);

            assert.ok(firstSlide.hasClass('my-custom-class'));
        });

        it("Custom class on thumb element", function() {
            var firstThumb = photorContainer.find('.' + photor._params.thumb).eq(0);

            assert.ok(firstThumb.hasClass('my-custom-class'));
        });

        it("Caption exists in instance object", function() {
            assert.equal(photor.slides[0].caption, 'Custom description');
        });

        it("Caption exists in image attribute", function() {
            var firstSlide = photorContainer.find('.' + photor._params.slideImg).eq(0);

            assert.equal(firstSlide[0].alt, 'Custom description');
        });

    });
}